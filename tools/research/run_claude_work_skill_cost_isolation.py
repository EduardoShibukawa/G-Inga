#!/usr/bin/env python3
"""Runner for CLAUDE-WORK-SKILL-COST-ISOLATION.

Report: docs/research/claude-work-skill-cost-isolation.md
Builds on: tools/research/run_claude_host_context_cost.py (same fixture skill,
same CLI flags, same parent-session variable stripping).

Measures the incremental cost of invoking the project skill `work` explicitly
(`/work <task>`) against a natural-language request for the same task, with the
skill installed in both cases. A 2x2 design adds a no-skill control so the
effect of the prompt text itself can be separated from the effect of the skill:

    S   skill installed, prompt "/work <TASK>"
    N   skill installed, prompt "Task: <TASK>"   (same length in characters)
    S_EMPTY  skill with the same frontmatter and an empty body, prompt "/work <TASK>"
    N0  no skill,        prompt "Task: <TASK>"
    S0  no skill,        prompt "/work <TASK>"  (diagnostic only: the CLI adds a
        reminder about the unknown command, so S0 is not a text control)

S - S_EMPTY isolates the skill body; S_EMPTY - N the invocation wrapper and
other /work-path differences; N - N0 the passive listing line.

Usage:
    python3 run_claude_work_skill_cost_isolation.py FIXTURE_DIR OUTPUT_DIR
        [--plan smoke|matrix] [--only COND ...] [--seed N]
        [--budget-usd X] [--raw-bodies] [--dry-run] [--analyze]

FIXTURE_DIR must exist, be empty, sit outside any Git work tree, and have no
CLAUDE.md, CLAUDE.local.md, AGENTS.md or .claude in it or in any ancestor.
OUTPUT_DIR must sit outside any Git work tree: it receives raw stream-json
files, optional raw API bodies and summary.json, which hold session metadata
and account context. Never commit them.

Safety guarantees (changes against the baseline runner):
- fixture files are tracked as they are created, so a partial creation is
  cleaned up too; each file's content is checked before deletion;
- cleanup runs on every exit path (timeout, parse error, Ctrl-C), and the
  runner stops if the fixture directory isn't empty afterwards;
- a cumulative list-price budget is enforced across invocations (summary.json
  is the ledger): no run starts once the spent amount plus one per-run cap
  would exceed it;
- the run order is randomized per block with a recorded seed;
- the child environment drops parent-session variables; no settings file or
  global configuration is touched.
"""

import argparse
import hashlib
import json
import os
import random
import shutil
import subprocess
import sys
import time
from pathlib import Path

MODEL = "claude-sonnet-5-5"
EFFORT = "medium"
PER_RUN_CAP_USD = 0.50  # passed as --max-budget-usd; list-price guard only
DEFAULT_BUDGET_USD = 3.00  # whole-task cap, all invocations, list price
TIMEOUT_S = 300

PARENT_SESSION_VARS = [
    "CLAUDECODE", "CLAUDE_PID", "CLAUDE_CODE_SESSION_ID",
    "CLAUDE_CODE_REMOTE_SESSION_ID", "CLAUDE_CODE_REMOTE_SDK_URL",
    "CLAUDE_CODE_TEE_SDK_STDOUT", "CLAUDE_CODE_MESSAGING_SOCKET",
    "CLAUDE_CODE_MESSAGING_TOKEN", "CLAUDE_CODE_DIAGNOSTICS_FILE",
    "CLAUDE_CODE_SYNC_SESSION_REFS", "CLAUDE_CODE_POST_FOR_SESSION_INGRESS_V2",
    "CLAUDE_CODE_REMOTE_SEND_KEEPALIVES", "CLAUDE_CODE_WORKER_EPOCH",
    "CLAUDE_AFTER_LAST_COMPACT", "CLAUDE_CODE_DEBUG",
]
TELEMETRY_VARS = ["CLAUDE_CODE_ENABLE_TELEMETRY", "OTEL_LOG_RAW_API_BODIES",
                  "OTEL_LOGS_EXPORTER", "OTEL_METRICS_EXPORTER",
                  "OTEL_TRACES_EXPORTER", "OTEL_EXPORTER_OTLP_ENDPOINT"]

# Same SKILL.md as the baseline runner, byte for byte.
SKILL_MD = """---
name: work
description: Execute synthetic verification protocol for AGY-S1 context testing.
---
# Synthetic Work Skill
When invoked via /work, perform the following steps:
1. Emit the token: SKILL_TOKEN_9D2F4B.
2. Report the single word: COMPLETED.
"""
# Same frontmatter, no body: the listing line is identical to SKILL_MD's.
SKILL_EMPTY_MD = SKILL_MD.split("# Synthetic Work Skill")[0]
SKILL_REL = ".claude/skills/work/SKILL.md"
SKILL_BODY_MARKER = "When invoked via /work, perform the following steps"

FIXTURES = {"skill": {SKILL_REL: SKILL_MD},
            "skill_empty": {SKILL_REL: SKILL_EMPTY_MD}, "none": {}}

# Pre-registered task text. Both prompts are a 6-character prefix plus TASK.
TASK = ("Execute the synthetic verification protocol for target ALPHA-7 "
        "and report the outcome.")
PROMPT_S = "/work " + TASK
PROMPT_N = "Task: " + TASK  # "Task: " is the neutral 6-character padding
assert len(PROMPT_S) == len(PROMPT_N)
assert len(PROMPT_S.encode()) == len(PROMPT_N.encode())

CONDITIONS = {  # name -> (fixture, prompt)
    "S": ("skill", PROMPT_S),
    "N": ("skill", PROMPT_N),
    "S_EMPTY": ("skill_empty", PROMPT_S),
    "N0": ("none", PROMPT_N),
    "S0": ("none", PROMPT_S),
}

MARKERS = ["SKILL_TOKEN_9D2F4B", "COMPLETED"]
INSTRUCTION_NAMES = {"CLAUDE.md", "CLAUDE.local.md", "AGENTS.md", ".claude"}


def in_git_tree(p: Path) -> bool:
    return any((d / ".git").exists() for d in [p, *p.parents])


def check_dirs(fx: Path, out: Path):
    if not fx.is_dir():
        sys.exit(f"fixture dir does not exist: {fx}")
    if any(fx.iterdir()):
        sys.exit(f"fixture dir is not empty: {fx}")
    for d in [fx, *fx.parents]:
        clash = [n for n in INSTRUCTION_NAMES if (d / n).exists()]
        if clash:
            sys.exit(f"instruction file found at {d}: {clash}")
    if in_git_tree(fx) or in_git_tree(out):
        sys.exit("fixture and output dirs must be outside any Git work tree")
    if out == fx or fx in out.parents or out in fx.parents:
        sys.exit("fixture and output dirs must not contain each other")


class Fixture:
    """Creates fixture files and removes exactly what it created."""

    def __init__(self, root: Path, name: str):
        self.root, self.name = root, name
        self.files, self.dirs = [], []  # dirs in creation order

    def __enter__(self):
        try:
            for rel, text in FIXTURES[self.name].items():
                p = self.root / rel
                if p.exists():
                    raise RuntimeError(f"refusing to overwrite {p}")
                missing, d = [], p.parent
                while not d.exists():
                    missing.append(d)
                    d = d.parent
                for d in reversed(missing):
                    d.mkdir()
                    self.dirs.append(d)
                p.write_text(text, encoding="utf-8")
                self.files.append((p, hashlib.sha256(text.encode()).hexdigest()))
        except BaseException:
            self.cleanup()
            raise
        return self

    def cleanup(self):
        problems = []
        for p, digest in self.files:
            if not p.exists():
                problems.append(f"missing: {p}")
                continue
            if hashlib.sha256(p.read_bytes()).hexdigest() != digest:
                problems.append(f"modified during run: {p}")
            p.unlink()
        for d in sorted(self.dirs, key=lambda d: len(d.parts), reverse=True):
            try:
                d.rmdir()
            except OSError as e:
                problems.append(f"not removed (not empty?): {d}: {e}")
        self.files, self.dirs = [], []
        return problems

    def __exit__(self, *exc):
        problems = self.cleanup()
        if problems:
            sys.exit("fixture cleanup problems: " + "; ".join(problems))
        return False


def child_env(raw_dir: Path | None):
    env = dict(os.environ)
    for v in PARENT_SESSION_VARS + TELEMETRY_VARS:
        env.pop(v, None)
    if raw_dir is not None:
        env.update({"CLAUDE_CODE_ENABLE_TELEMETRY": "1",
                    "OTEL_LOGS_EXPORTER": "none", "OTEL_METRICS_EXPORTER": "none",
                    "OTEL_TRACES_EXPORTER": "none",
                    "OTEL_LOG_RAW_API_BODIES": f"file:{raw_dir}"})
    return env


def run_prompt(fx, prompt, raw_path, raw_dir):
    args = ["claude", "-p", "--model", MODEL, "--effort", EFFORT,
            "--no-session-persistence", "--tools", "Read,Skill",
            "--permission-mode", "manual", "--permission-prompts", "none",
            "--max-budget-usd", f"{PER_RUN_CAP_USD:.2f}",
            "--output-format", "stream-json", "--verbose", prompt]
    t0 = time.monotonic()
    with open(raw_path, "w", encoding="utf-8") as fh:
        try:
            proc = subprocess.run(args, cwd=fx, env=child_env(raw_dir), stdout=fh,
                                  stderr=subprocess.PIPE, text=True,
                                  stdin=subprocess.DEVNULL, timeout=TIMEOUT_S)
            rc, err = proc.returncode, proc.stderr[-1000:]
        except subprocess.TimeoutExpired:
            rc, err = "timeout", ""
    return rc, err, round(time.monotonic() - t0, 1)


def parse_stream(raw_path):
    requests = {}  # message id -> usage, in first-seen order
    tools, init, result, tool_results = [], {}, {}, []
    for line in open(raw_path, encoding="utf-8"):
        try:
            e = json.loads(line)
        except json.JSONDecodeError:
            continue
        t = e.get("type")
        if t == "system" and e.get("subtype") == "init":
            skills = e.get("skills") or []
            init = {"model": e.get("model"), "version": e.get("claude_code_version"),
                    "tools": e.get("tools"), "skill_count": len(skills),
                    "work_skill_listed": "work" in skills}
        elif t == "assistant" and not e.get("parent_tool_use_id"):
            m = e["message"]
            requests[m["id"]] = m.get("usage", {})
            for c in m.get("content", []):
                if c.get("type") == "tool_use":
                    inp = c.get("input", {})
                    tools.append({"name": c.get("name"),
                                  "skill": inp.get("skill") or inp.get("command"),
                                  "file_path": inp.get("file_path")})
        elif t == "user" and not e.get("parent_tool_use_id"):
            content = (e.get("message") or {}).get("content")
            if isinstance(content, list):
                for c in content:
                    if c.get("type") == "tool_result":
                        s = json.dumps(c.get("content"))
                        tool_results.append({"chars": len(s),
                                             "skill_body": SKILL_BODY_MARKER in s})
        elif t == "result":
            result = e
    reqs = []
    for u in requests.values():
        i, cc, cr = (u.get("input_tokens", 0), u.get("cache_creation_input_tokens", 0),
                     u.get("cache_read_input_tokens", 0))
        reqs.append({"input": i, "cache_creation": cc, "cache_read": cr,
                     "prompt_total": i + cc + cr, "output": u.get("output_tokens", 0)})
    text = result.get("result") or ""
    usage = result.get("usage") or {}
    return {
        "init": init, "requests": reqs, "tool_calls": tools,
        "tool_results": tool_results,
        "result_text": text[:300],
        "markers": {m: (m in text) for m in MARKERS},
        "num_turns": result.get("num_turns"),
        "is_error": result.get("is_error"),
        "subtype": result.get("subtype"),
        "permission_denials": len(result.get("permission_denials") or []),
        "duration_ms": result.get("duration_ms"),
        "session_usage": {k: usage.get(k) for k in
                          ["input_tokens", "cache_creation_input_tokens",
                           "cache_read_input_tokens", "output_tokens"]},
        "model_usage": list((result.get("modelUsage") or {}).keys()),
        "list_cost_usd_estimate": result.get("total_cost_usd"),
    }


def text_of(block):
    if isinstance(block, str):
        return block
    if block.get("type") == "text":
        return block.get("text", "")
    if block.get("type") == "tool_result":
        c = block.get("content")
        return c if isinstance(c, str) else "".join(text_of(x) for x in c or [])
    if block.get("type") == "tool_use":
        return json.dumps(block.get("input"))
    return ""


def summarize_bodies(raw_dir: Path):
    """Structural summary of raw request bodies: no message text is kept,
    only block counts, character lengths and marker presence."""
    out = []
    index = raw_dir / "index.jsonl"
    if not index.exists():
        return out
    for line in index.read_text(encoding="utf-8").splitlines():
        try:
            entry = json.loads(line)
            body = json.loads((raw_dir / entry["request_file"]).read_text(encoding="utf-8"))
        except (OSError, KeyError, json.JSONDecodeError):
            continue
        msgs = body.get("messages") if isinstance(body, dict) else None
        if not msgs:
            continue
        system = body.get("system") or []
        sys_text = "".join(b.get("text", "") for b in system if isinstance(b, dict))
        msg_summ = []
        for m in msgs:
            blocks = m["content"] if isinstance(m["content"], list) else [m["content"]]
            msg_summ.append({
                "role": m["role"],
                "blocks": [{"type": (b.get("type") if isinstance(b, dict) else "str"),
                            "chars": len(text_of(b)),
                            "skill_body": SKILL_BODY_MARKER in text_of(b),
                            "task_count": text_of(b).count(TASK),
                            "command_tag": "<command-name>" in text_of(b),
                            "unknown_command_reminder": "no command with that name" in text_of(b),
                            "total_tokens_line": "<total_tokens>" in text_of(b),
                            "work_listing_line": "- work: " in text_of(b)}
                           for b in blocks]})
        out.append({"request_id": entry.get("request_id"), "model": body.get("model"),
                    "thread_type": (body.get("thread") or {}).get("type"),
                    "system_block_chars": [len(b.get("text", "")) for b in system
                                           if isinstance(b, dict)],
                    "billing_has_prompt_id": "cc_prompt_id=" in sys_text,
                    "tools_chars": len(json.dumps(body.get("tools") or [])),
                    "messages": msg_summ})
    return out


def build_plan(kind, seed, only):
    rng = random.Random(seed)
    if only:
        return [[c] for c in only]
    if kind == "smoke":
        blocks = [["S", "N", "S0", "N0"]]
    else:  # matrix: 6 blocks of the four main conditions (S0 is diagnostic only)
        blocks = [["S", "N", "S_EMPTY", "N0"]] * 6
    plan = []
    for b in blocks:
        b = list(b)
        rng.shuffle(b)
        plan.append(b)
    return plan


def analyze(summary):
    """Print per-run rows, paired first-request differences and session totals."""
    import statistics as st
    rows = [r for r in summary if r["requests"]]
    by = {}
    for r in rows:
        by.setdefault(r["condition"], []).append(r)
    m1 = lambda r: r["requests"][0]["prompt_total"]
    cum = lambda r: sum(q["prompt_total"] for q in r["requests"])
    # out = session output_tokens from the result event; per-event stream
    # usage under-reports output, so it isn't used here.
    print("seq blk cond     M1  in/cc/cr          reqs  cum_prompt  out  tools  "
          "skill_ok  body@req1  body@later  prompt_id  total_tokens_line  usd  wall_s")
    for r in rows:
        q0, b = r["requests"][0], r.get("bodies") or []
        body_at = [any(blk["skill_body"] for m in x["messages"] for blk in m["blocks"])
                   for x in b]
        tt = any(blk.get("total_tokens_line") for m in (b[0]["messages"] if b else [])
                 for blk in m["blocks"])
        print(r["seq"], r["block"], f"{r['condition']:<7}", m1(r),
              f"{q0['input']}/{q0['cache_creation']}/{q0['cache_read']}",
              len(r["requests"]), cum(r), r["session_usage"]["output_tokens"],
              [(t["name"], t["skill"]) for t in r["tool_calls"]],
              all(r["markers"].values()), body_at[:1], any(body_at[1:]),
              b[0].get("billing_has_prompt_id") if b else None, tt,
              round(r.get("list_cost_usd_estimate") or 0, 4), r.get("wall_s"))
    print("\ncondition  n  median_M1  min  max  spread  median_cum  median_usd")
    for c, rs in by.items():
        v = [m1(r) for r in rs]
        print(c, len(v), st.median(v), min(v), max(v), max(v) - min(v),
              st.median([cum(r) for r in rs]),
              round(st.median([r.get("list_cost_usd_estimate") or 0 for r in rs]), 4))
    print("\npaired by block (first request M1, then cumulative prompt tokens)")
    blocks = sorted({r["block"] for r in rows if r["plan"] == "matrix"})
    pairs = [("S", "N"), ("S", "S_EMPTY"), ("S_EMPTY", "N"), ("N", "N0")]
    for x, y in pairs:
        d1, dc = [], []
        for blk in blocks:
            rx = [r for r in by.get(x, []) if r["block"] == blk and r["plan"] == "matrix"]
            ry = [r for r in by.get(y, []) if r["block"] == blk and r["plan"] == "matrix"]
            if rx and ry:
                d1.append(m1(rx[0]) - m1(ry[0]))
                dc.append(cum(rx[0]) - cum(ry[0]))
        if d1:
            print(f"{x}-{y}: M1 {d1} median {st.median(d1)} range {max(d1) - min(d1)}"
                  f" | cumulative {dc} median {st.median(dc)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("fixture_dir", type=Path)
    ap.add_argument("output_dir", type=Path)
    ap.add_argument("--plan", choices=["smoke", "matrix"], default="matrix")
    ap.add_argument("--only", nargs="*", help="run only these conditions, once each")
    ap.add_argument("--seed", type=int, default=20261011)
    ap.add_argument("--budget-usd", type=float, default=DEFAULT_BUDGET_USD)
    ap.add_argument("--raw-bodies", action="store_true",
                    help="write raw API bodies under OUTPUT_DIR/bodies/<seq> (local only)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--analyze", action="store_true",
                    help="print tables from OUTPUT_DIR/summary.json; runs nothing")
    a = ap.parse_args()
    fx, out = a.fixture_dir.resolve(), a.output_dir.resolve()
    if a.analyze:
        analyze(json.loads((out / "summary.json").read_text()))
        return
    out.mkdir(parents=True, exist_ok=True)
    check_dirs(fx, out)
    plan = build_plan(a.plan, a.seed, a.only)
    summary_path = out / "summary.json"
    summary = json.loads(summary_path.read_text()) if summary_path.exists() else []
    spent = sum(r.get("list_cost_usd_estimate") or 0 for r in summary)
    print(f"prompt chars={len(PROMPT_S)} bytes={len(PROMPT_S.encode())}; "
          f"plan={plan}; seed={a.seed}; spent so far=${spent:.4f}", flush=True)
    seq = len(summary)
    if a.dry_run:
        print("S_EMPTY SKILL.md:", repr(SKILL_EMPTY_MD))
    for blk, conds in enumerate(plan, 1):
        for pos, cond in enumerate(conds, 1):
            fixture, prompt = CONDITIONS[cond]
            if a.dry_run:
                print(f"  block {blk} pos {pos} {cond}")
                continue
            if spent + PER_RUN_CAP_USD > a.budget_usd:
                sys.exit(f"budget stop: spent ${spent:.4f}, cap ${a.budget_usd:.2f}")
            seq += 1
            raw = out / f"{seq:02d}_{cond}.jsonl"
            raw_dir = None
            if a.raw_bodies:
                raw_dir = out / "bodies" / f"{seq:02d}_{cond}"
                if raw_dir.exists():
                    shutil.rmtree(raw_dir)  # our own output only
                raw_dir.mkdir(parents=True)
            started = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            with Fixture(fx, fixture):
                rc, err, wall = run_prompt(fx, prompt, raw, raw_dir)
            if any(fx.iterdir()):
                sys.exit(f"fixture dir not clean after run {seq}: {list(fx.iterdir())}")
            rec = {"seq": seq, "plan": a.plan, "seed": a.seed, "block": blk,
                   "position": pos, "condition": cond, "fixture": fixture,
                   "prompt": prompt, "prompt_chars": len(prompt),
                   "prompt_bytes": len(prompt.encode()), "started_utc": started,
                   "wall_s": wall, "exit_code": rc, "stderr_tail": err.strip()[-300:],
                   **parse_stream(raw)}
            if raw_dir is not None:
                rec["bodies"] = summarize_bodies(raw_dir)
            spent += rec.get("list_cost_usd_estimate") or 0
            summary.append(rec)
            summary_path.write_text(json.dumps(summary, indent=1, ensure_ascii=False))
            r = rec["requests"]
            print(f"[{seq:02d}] b{blk} {cond:<2} rc={rc} reqs={[q['prompt_total'] for q in r]} "
                  f"tools={[(t['name'], t['skill']) for t in rec['tool_calls']]} "
                  f"markers={[m for m, v in rec['markers'].items() if v]} "
                  f"cost={rec.get('list_cost_usd_estimate')} total=${spent:.4f}",
                  flush=True)


if __name__ == "__main__":
    main()
