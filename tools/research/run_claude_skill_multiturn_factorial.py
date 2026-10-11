#!/usr/bin/env python3
"""Runner for CLAUDE-SKILL-MULTITURN-FACTORIAL.

Report: docs/research/claude-skill-multiturn-factorial.md
Builds on: tools/research/run_claude_work_skill_cost_isolation.py (same CLI
flags, same parent-session variable stripping, same tracked and hash-checked
fixture cleanup, same cumulative budget ledger).

Factorial design, every factor crossed:

    size   S025 | S2K | S8K       skill body of about 0.25, 2 and 8 KB; the
                                  operational core is identical, the rest is a
                                  neutral reference appendix
    length SHORT | LONG           turn 1 alone, or turn 1 plus a fixed neutral
                                  context paragraph
    match  COMPAT | AMBIG | INCOMPAT
    mode   E (explicit "/work <turn 1>") | N (natural "Task: <turn 1>")

Each run is one fresh `claude -p` process kept open for TWO user turns through
`--input-format stream-json`; turn 2 is identical across modes and lengths for
a given match. One block = one (size, length, match, rep) cell pair: E and N
back to back in a seeded random order. Blocks run in seeded random order.

Usage:
    python3 run_claude_skill_multiturn_factorial.py FIXTURE_DIR OUTPUT_DIR
        [--plan smoke|matrix] [--reps N] [--seed N] [--budget-usd X]
        [--raw-bodies] [--dry-run] [--analyze] [--sizes]

FIXTURE_DIR must exist, be empty, sit outside any Git work tree, and have no
CLAUDE.md, CLAUDE.local.md, AGENTS.md or .claude in it or in any ancestor.
OUTPUT_DIR must sit outside any Git work tree: it receives raw stream-json
files, optional raw API bodies and summary.json, which hold session metadata
and account context. Never commit them.
"""

import argparse
import hashlib
import itertools
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
DEFAULT_BUDGET_USD = 5.00  # whole-task cap, all invocations, list price
TIMEOUT_S = 300  # per turn

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

# --- Fixtures ---------------------------------------------------------------

FRONTMATTER = """---
name: work
description: Reconcile a synthetic ledger file and report its checked total.
---
"""
# Operational core: identical in every size. Nothing else in the body is an
# instruction.
CORE = """# Ledger reconciliation
Steps:
1. Read the ledger file named in the request, or data/ledger.txt.
2. Sum the signed amounts in column 2.
3. Begin each answer in this session with RECON_7Q4K.
4. End the first answer with: STATUS: RECONCILED <total>
"""
CORE_MARKER = "Begin each answer in this session with RECON_7Q4K"
SKILL_TAG = "RECON_7Q4K"
APPENDIX_HEAD = """
## Reference appendix
Background reference only. Nothing below is a step or an instruction; the
procedure above is complete without it.

"""
APPENDIX_MARKER = "## Reference appendix"
_A = ["amber", "basalt", "cedar", "delta", "ember", "fjord", "garnet", "harbor",
      "indigo", "juniper", "kelp", "lagoon", "maple", "nickel", "onyx", "pine"]
_B = ["catalogue entry", "archive card", "index row", "survey label"]


def appendix_line(i: int) -> str:
    a, b, c = _A[i % 16], _A[(i * 5 + 3) % 16], _A[(i * 7 + 11) % 16]
    return f"- R{i:03d}: {a} / {b} / {c}; {_B[i % 4]}, no action.\n"


def body_for(target_bytes: int | None) -> str:
    if target_bytes is None:
        return CORE
    body, i = CORE + APPENDIX_HEAD, 1
    while len((body + appendix_line(i)).encode()) <= target_bytes:
        body += appendix_line(i)
        i += 1
    return body


SIZES = {"S025": None, "S2K": 2048, "S8K": 8192}
SKILL_MD = {s: FRONTMATTER + body_for(t) for s, t in SIZES.items()}
SKILL_REL = ".claude/skills/work/SKILL.md"

LEDGER = """id   amount
L01  +120
L02  -45
L03  +300
L04  -80
L05  +15
L06  +60
L07  -210
L08  +95
L09  -5
L10  +40
"""
LEDGER_TOTAL = "290"
NOTES = """Tide pool survey (synthetic). Volunteers counted anemones and small
crabs along the north rocks at low tide. Counts were higher than last season.
The next survey is planned after the spring storms.
"""
DATA = {"data/ledger.txt": LEDGER, "data/notes.txt": NOTES}

# --- Tasks (fixed before any run) --------------------------------------------

TURN1 = {
    "COMPAT": "Reconcile the ledger in data/ledger.txt and report the checked total.",
    "AMBIG": "Check whether the amounts in data/ledger.txt look consistent.",
    "INCOMPAT": "Summarize data/notes.txt in one sentence.",
}
TURN2 = {
    "COMPAT": "Which entry has the largest absolute amount?",
    "AMBIG": "Which entry has the largest absolute amount?",
    "INCOMPAT": "Which two words from it best describe its topic?",
}
# Neutral context appended to turn 1 in LONG. Same text for every match; it
# names no procedure and no skill vocabulary.
LONG_CONTEXT = (
    " Some background, for context only: this directory is a small synthetic "
    "fixture that was created for a test, and its files are plain text with no "
    "real data in them. Nobody else depends on the answer, there is no deadline, "
    "and nothing needs to be changed, created or deleted; a read-only look is "
    "enough. Please keep the reply short and plain, in a few sentences at most, "
    "without headings, tables or lists unless they are really needed. If "
    "something in the files is unclear, say so briefly instead of guessing, and "
    "mention which file you looked at. There is no need to explain your method "
    "step by step or to suggest follow-up work. I will ask one short follow-up "
    "question after your reply, so you don't need to anticipate it now."
)
PREFIX = {"E": "/work ", "N": "Task: "}  # equal length: 6 characters each
assert len(PREFIX["E"]) == len(PREFIX["N"])

LENGTHS = ["SHORT", "LONG"]
MATCHES = ["COMPAT", "AMBIG", "INCOMPAT"]
MODES = ["E", "N"]


def turn1_text(match, length):
    return TURN1[match] + (LONG_CONTEXT if length == "LONG" else "")


def prompts(size, length, match, mode):
    return [PREFIX[mode] + turn1_text(match, length), TURN2[match]]


# --- Isolation helpers (from the isolation runner) ---------------------------

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

    def __init__(self, root: Path, files: dict):
        self.root, self.spec = root, files
        self.files, self.dirs = [], []

    def __enter__(self):
        try:
            for rel, text in self.spec.items():
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


# --- Running one multi-turn session -------------------------------------------

def run_session(fx, turns, raw_path, raw_dir):
    """Feed the turns one at a time over stream-json stdin; wait for each
    turn's `result` event before sending the next."""
    args = ["claude", "-p", "--model", MODEL, "--effort", EFFORT,
            "--no-session-persistence", "--tools", "Read,Skill",
            "--permission-mode", "manual", "--permission-prompts", "none",
            "--max-budget-usd", f"{PER_RUN_CAP_USD:.2f}",
            "--input-format", "stream-json",
            "--output-format", "stream-json", "--verbose"]
    t0 = time.monotonic()
    turn_wall, rc, err = [], None, ""
    with open(raw_path, "w", encoding="utf-8") as fh:
        proc = subprocess.Popen(args, cwd=fx, env=child_env(raw_dir),
                                stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, text=True, bufsize=1)
        try:
            for text in turns:
                ts = time.monotonic()
                msg = {"type": "user", "message": {"role": "user", "content": text}}
                proc.stdin.write(json.dumps(msg) + "\n")
                proc.stdin.flush()
                got = False
                while time.monotonic() - ts < TIMEOUT_S:
                    line = proc.stdout.readline()
                    if not line:
                        break
                    fh.write(line)
                    try:
                        if json.loads(line).get("type") == "result":
                            got = True
                            break
                    except json.JSONDecodeError:
                        pass
                turn_wall.append(round(time.monotonic() - ts, 1))
                if not got:
                    rc = "no-result"
                    break
            proc.stdin.close()
            rest, err = proc.communicate(timeout=60)
            fh.write(rest)
            rc = proc.returncode if rc is None else rc
        except BaseException:
            proc.kill()
            proc.communicate()
            raise
    return rc, (err or "")[-1000:], round(time.monotonic() - t0, 1), turn_wall


def parse_stream(raw_path):
    """Per request usage (main agent only), assigned to the turn in which it
    happened; per turn result events; tool calls; answer markers."""
    turn, requests, order = 0, {}, []
    tools, init, results = [], {}, []
    for line in open(raw_path, encoding="utf-8"):
        try:
            e = json.loads(line)
        except json.JSONDecodeError:
            continue
        t = e.get("type")
        if t == "system" and e.get("subtype") == "init" and not init:
            skills = e.get("skills") or []
            init = {"model": e.get("model"), "version": e.get("claude_code_version"),
                    "tools": e.get("tools"), "skill_count": len(skills),
                    "work_skill_listed": "work" in skills}
        elif t == "assistant" and not e.get("parent_tool_use_id"):
            m = e["message"]
            if m["id"] not in requests:
                order.append(m["id"])
            requests[m["id"]] = {"turn": turn + 1, "usage": m.get("usage", {})}
            for c in m.get("content", []):
                if c.get("type") == "tool_use":
                    inp = c.get("input", {})
                    tools.append({"turn": turn + 1, "name": c.get("name"),
                                  "skill": inp.get("skill") or inp.get("command"),
                                  "file_path": inp.get("file_path"),
                                  "args_chars": len(inp.get("args") or "")})
        elif t == "result":
            u = e.get("usage") or {}
            text = e.get("result") or ""
            results.append({
                "turn": turn + 1, "is_error": e.get("is_error"),
                "subtype": e.get("subtype"), "num_turns": e.get("num_turns"),
                "duration_ms": e.get("duration_ms"),
                "total_cost_usd": e.get("total_cost_usd"),
                "usage": {k: u.get(k) for k in ["input_tokens",
                          "cache_creation_input_tokens", "cache_read_input_tokens",
                          "output_tokens"]},
                "permission_denials": len(e.get("permission_denials") or []),
                "answer_chars": len(text),
                "has_tag": SKILL_TAG in text,
                "has_status": "STATUS: RECONCILED" in text,
                "has_total": LEDGER_TOTAL in text,
                "has_l03": ("L03" in text) or ("300" in text),
                "has_tide": "tide" in text.lower(),
                "answer_head": text[:160],
            })
            turn += 1
    reqs = []
    for mid in order:
        u = requests[mid]["usage"]
        i, cc, cr = (u.get("input_tokens", 0), u.get("cache_creation_input_tokens", 0),
                     u.get("cache_read_input_tokens", 0))
        reqs.append({"turn": requests[mid]["turn"], "input": i, "cache_creation": cc,
                     "cache_read": cr, "prompt_total": i + cc + cr})
    return {"init": init, "requests": reqs, "tool_calls": tools, "turns": results}


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


def summarize_bodies(raw_dir: Path, turn1: str):
    """Structural summary of raw request bodies: block counts, character
    lengths and marker presence only. No message text is kept."""
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
        if not msgs or body.get("model") != MODEL:
            continue
        blocks = []
        for m in msgs:
            for b in (m["content"] if isinstance(m["content"], list) else [m["content"]]):
                s = text_of(b)
                blocks.append({
                    "role": m["role"],
                    "type": b.get("type") if isinstance(b, dict) else "str",
                    "chars": len(s),
                    "core": CORE_MARKER in s,
                    "appendix": APPENDIX_MARKER in s,
                    "turn1_count": s.count(TURN1_KEY(turn1)),
                    "long_ctx_count": s.count(LONG_CONTEXT.strip()[:60]),
                    "command_tag": "<command-name>" in s,
                })
        out.append({"thread_type": (body.get("thread") or {}).get("type"),
                    "n_messages": len(msgs), "blocks": blocks})
    return out


def TURN1_KEY(turn1: str) -> str:
    return turn1[:50]


# --- Plans ---------------------------------------------------------------------

def build_plan(kind, seed, reps, top_up_to=0):
    """List of blocks; each block is a list of (cell, mode, rep) runs.

    Repetitions 1..reps are shuffled together. Amendment 1: repetitions
    reps+1..top_up_to follow, shuffled together, and run in that fixed order
    until the budget stop, whatever the earlier results."""
    rng = random.Random(seed)
    if kind == "smoke":
        cells = [("S025", "SHORT", "COMPAT"), ("S8K", "LONG", "INCOMPAT")]
        reps, top_up_to = 1, 0
    else:
        cells = list(itertools.product(SIZES, LENGTHS, MATCHES))

    def group(rep_range):
        blocks = []
        for rep in rep_range:
            for cell in cells:
                modes = list(MODES)
                rng.shuffle(modes)
                blocks.append([(cell, m, rep) for m in modes])
        rng.shuffle(blocks)
        return blocks

    return group(range(1, reps + 1)) + group(range(reps + 1, top_up_to + 1))


# --- Analysis -------------------------------------------------------------------

def analyze(summary):
    import statistics as st
    rows = [r for r in summary if r["plan"] == "matrix" and r["requests"]]
    m1 = lambda r: r["requests"][0]["prompt_total"]
    cum = lambda r: sum(q["prompt_total"] for q in r["requests"])
    t2first = lambda r: next((q["prompt_total"] for q in r["requests"] if q["turn"] == 2), None)
    usd = lambda r: r["turns"][-1]["total_cost_usd"] if r["turns"] else None
    skill_turn = lambda r: next((t["turn"] for t in r["tool_calls"] if t["name"] == "Skill"), None)
    key = lambda r: (r["size"], r["length"], r["match"], r["rep"])
    pairs = {}
    for r in rows:
        pairs.setdefault(key(r), {})[r["mode"]] = r

    def med(v):
        v = [x for x in v if x is not None]
        return (st.median(v), min(v), max(v)) if v else (None, None, None)

    print("size length match mode | n | M1 med [min,max] | reqs med | cum med | "
          "turn2 req1 med | tools med | Skill calls | tag t1/t2 | correct t1/t2 | usd med")
    for size, length, match, mode in itertools.product(SIZES, LENGTHS, MATCHES, MODES):
        rs = [r for r in rows if (r["size"], r["length"], r["match"], r["mode"]) ==
              (size, length, match, mode)]
        if not rs:
            continue
        ok1 = [correct(r, 1) for r in rs]
        ok2 = [correct(r, 2) for r in rs]
        print(size, length, match, mode, "|", len(rs), "|", med([m1(r) for r in rs]), "|",
              st.median([len(r["requests"]) for r in rs]), "|",
              st.median([cum(r) for r in rs]), "|", med([t2first(r) for r in rs])[0], "|",
              st.median([len(r["tool_calls"]) for r in rs]), "|",
              [skill_turn(r) for r in rs], "|",
              f"{sum(r['turns'][0]['has_tag'] for r in rs)}/"
              f"{sum(len(r['turns']) > 1 and r['turns'][1]['has_tag'] for r in rs)}", "|",
              f"{sum(ok1)}/{sum(ok2)}", "|", round(st.median([usd(r) or 0 for r in rs]), 4))
    print("\npaired E - N by cell: M1 | cumulative prompt | requests | usd")
    for size, length, match in itertools.product(SIZES, LENGTHS, MATCHES):
        d = [p for k, p in pairs.items() if k[:3] == (size, length, match)
             and "E" in p and "N" in p]
        if not d:
            continue
        dm1 = [m1(p["E"]) - m1(p["N"]) for p in d]
        dcum = [cum(p["E"]) - cum(p["N"]) for p in d]
        dreq = [len(p["E"]["requests"]) - len(p["N"]["requests"]) for p in d]
        dusd = [round((usd(p["E"]) or 0) - (usd(p["N"]) or 0), 4) for p in d]
        print(size, length, match, "| M1", dm1, "| cum", dcum, "| req", dreq, "| usd", dusd)


def correct(r, turn):
    if len(r["turns"]) < turn:
        return False
    t = r["turns"][turn - 1]
    if r["match"] == "COMPAT":
        return t["has_total"] if turn == 1 else t["has_l03"]
    if r["match"] == "AMBIG":
        return t["answer_chars"] > 0 if turn == 1 else t["has_l03"]
    return t["has_tide"] if turn == 1 else t["answer_chars"] > 0


def print_sizes():
    for s, md in SKILL_MD.items():
        body = md[len(FRONTMATTER):]
        print(f"{s}: file bytes={len(md.encode())} chars={len(md)} "
              f"body bytes={len(body.encode())} sha256={hashlib.sha256(md.encode()).hexdigest()[:12]}")
    print(f"core bytes={len(CORE.encode())}; frontmatter bytes={len(FRONTMATTER.encode())}")
    for m in MATCHES:
        for L in LENGTHS:
            p = prompts("S025", L, m, "E")
            print(f"{m} {L}: turn1 chars={len(p[0])} bytes={len(p[0].encode())}; "
                  f"turn2 chars={len(p[1])}")
    for rel, text in DATA.items():
        print(f"{rel}: bytes={len(text.encode())} sha256={hashlib.sha256(text.encode()).hexdigest()[:12]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("fixture_dir", type=Path)
    ap.add_argument("output_dir", type=Path)
    ap.add_argument("--plan", choices=["smoke", "matrix"], default="matrix")
    ap.add_argument("--reps", type=int, default=3)
    ap.add_argument("--top-up-to", type=int, default=0,
                    help="Amendment 1: extra repetitions run after --reps, in order, until the budget stop")
    ap.add_argument("--seed", type=int, default=20261011)
    ap.add_argument("--budget-usd", type=float, default=DEFAULT_BUDGET_USD)
    ap.add_argument("--raw-bodies", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--analyze", action="store_true")
    ap.add_argument("--sizes", action="store_true", help="print fixture sizes and exit")
    a = ap.parse_args()
    if a.sizes:
        print_sizes()
        return
    fx, out = a.fixture_dir.resolve(), a.output_dir.resolve()
    if a.analyze:
        analyze(json.loads((out / "summary.json").read_text()))
        return
    out.mkdir(parents=True, exist_ok=True)
    check_dirs(fx, out)
    plan = build_plan(a.plan, a.seed, a.reps, a.top_up_to)
    summary_path = out / "summary.json"
    summary = json.loads(summary_path.read_text()) if summary_path.exists() else []
    done = {(r["plan"], r["size"], r["length"], r["match"], r["mode"], r["rep"])
            for r in summary}
    spent = sum(r.get("list_cost_usd_estimate") or 0 for r in summary)
    print(f"plan={a.plan} reps={a.reps} top_up_to={a.top_up_to} seed={a.seed} blocks={len(plan)} "
          f"spent so far=${spent:.4f} budget=${a.budget_usd:.2f}", flush=True)
    seq = len(summary)
    for blk, runs in enumerate(plan, 1):
        for pos, ((size, length, match), mode, rep) in enumerate(runs, 1):
            if a.dry_run:
                print(f"  block {blk} pos {pos} {size} {length} {match} {mode} rep{rep}")
                continue
            if (a.plan, size, length, match, mode, rep) in done:
                continue  # resume after an interruption
            if spent + PER_RUN_CAP_USD > a.budget_usd:
                sys.exit(f"budget stop: spent ${spent:.4f}, cap ${a.budget_usd:.2f}")
            seq += 1
            name = f"{seq:03d}_{size}_{length}_{match}_{mode}"
            raw = out / f"{name}.jsonl"
            raw_dir = None
            if a.raw_bodies:
                raw_dir = out / "bodies" / name
                if raw_dir.exists():
                    shutil.rmtree(raw_dir)  # our own output only
                raw_dir.mkdir(parents=True)
            turns = prompts(size, length, match, mode)
            started = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            files = {SKILL_REL: SKILL_MD[size], **DATA}
            with Fixture(fx, files):
                rc, err, wall, turn_wall = run_session(fx, turns, raw, raw_dir)
            if any(fx.iterdir()):
                sys.exit(f"fixture dir not clean after run {seq}: {list(fx.iterdir())}")
            parsed = parse_stream(raw)
            last = parsed["turns"][-1] if parsed["turns"] else {}
            rec = {"seq": seq, "plan": a.plan, "seed": a.seed, "block": blk,
                   "position": pos, "size": size, "length": length, "match": match,
                   "mode": mode, "rep": rep,
                   "skill_sha256": hashlib.sha256(SKILL_MD[size].encode()).hexdigest(),
                   "skill_bytes": len(SKILL_MD[size].encode()),
                   "prompt_chars": [len(t) for t in turns],
                   "prompt_bytes": [len(t.encode()) for t in turns],
                   "started_utc": started, "wall_s": wall, "turn_wall_s": turn_wall,
                   "exit_code": rc, "stderr_tail": err.strip()[-300:],
                   # total_cost_usd in the last result event is the session
                   # total (checked in the smoke test, see report).
                   "list_cost_usd_estimate": last.get("total_cost_usd"),
                   **parsed}
            if raw_dir is not None:
                rec["bodies"] = summarize_bodies(raw_dir, turn1_text(match, length))
            spent += rec.get("list_cost_usd_estimate") or 0
            summary.append(rec)
            summary_path.write_text(json.dumps(summary, indent=1, ensure_ascii=False))
            print(f"[{seq:03d}] b{blk} {size} {length} {match} {mode} r{rep} rc={rc} "
                  f"reqs={[(q['turn'], q['prompt_total']) for q in rec['requests']]} "
                  f"tools={[(t['turn'], t['name'], t['skill']) for t in rec['tool_calls']]} "
                  f"tag={[t['has_tag'] for t in rec['turns']]} "
                  f"cost={rec.get('list_cost_usd_estimate')} total=${spent:.4f}",
                  flush=True)


if __name__ == "__main__":
    main()
