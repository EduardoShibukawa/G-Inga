#!/usr/bin/env python3
"""Runner for CLAUDE-HOST-CONTEXT-COST-BASELINE.

Report: docs/research/claude-host-context-cost-results.md

Runs fresh, non-persistent `claude -p` sessions against a disposable fixture
directory and records the per-request usage that Claude Code emits in
`--output-format stream-json`. It also records the local `/context` estimate,
which makes no model call.

Usage:
    python3 run_claude_host_context_cost.py FIXTURE_DIR OUTPUT_DIR [--schedule baseline|invocation]
        [--only COND ...] [--dry-run]

`--schedule baseline` (default) is CLAUDE-HOST-CONTEXT-COST-BASELINE.
`--schedule invocation` is CLAUDE-SKILL-INVOCATION-MARGINAL-COST
(report: docs/research/claude-skill-invocation-cost-results.md).

FIXTURE_DIR must already exist, be empty, and have no CLAUDE.md, CLAUDE.local.md,
AGENTS.md or .claude in it or in any ancestor directory. OUTPUT_DIR receives raw
stream-json files and a summary.json; keep it outside the repository, since raw
events hold session metadata.

The runner only creates the fixture files listed below and removes exactly those
files (and the directories it created) after each run.
"""

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

MODEL = "claude-sonnet-5-5"
EFFORT = "medium"
MAX_BUDGET_USD = "0.50"  # per run, list-price guard only
TIMEOUT_S = 300

# Variables that couple a child process to an enclosing Claude Code session.
# They are removed from the child's environment only; no settings file changes.
PARENT_SESSION_VARS = [
    "CLAUDECODE", "CLAUDE_PID", "CLAUDE_CODE_SESSION_ID",
    "CLAUDE_CODE_REMOTE_SESSION_ID", "CLAUDE_CODE_REMOTE_SDK_URL",
    "CLAUDE_CODE_TEE_SDK_STDOUT", "CLAUDE_CODE_MESSAGING_SOCKET",
    "CLAUDE_CODE_MESSAGING_TOKEN", "CLAUDE_CODE_DIAGNOSTICS_FILE",
    "CLAUDE_CODE_SYNC_SESSION_REFS", "CLAUDE_CODE_POST_FOR_SESSION_INGRESS_V2",
    "CLAUDE_CODE_REMOTE_SEND_KEEPALIVES", "CLAUDE_CODE_WORKER_EPOCH",
    "CLAUDE_AFTER_LAST_COMPACT", "CLAUDE_CODE_DEBUG",
]

DOC_PATH = "docs/research/fixtures/claude-host-test-instructions.md"

# Texts mirror the AGY-S1 runner fixtures; only file names are adapted.
POINTER_CLAUDE_MD = f"""<!-- g-inga:host-pointer -->
Workspace rules and deliverables are governed by G-Ingá protocols.
Primary test reference: [{DOC_PATH}]({DOC_PATH}).
"""

IMPORT_CLAUDE_MD = f"""<!-- g-inga:host-pointer -->
Workspace rules and deliverables are governed by G-Ingá protocols.
Primary test reference: @{DOC_PATH}
"""

TEST_DOC = """# Claude host test instructions
When requested to verify test instructions, you must emit the token:
VERIFICATION_TOKEN_8E3A1C
and output the status vocabulary: pass, fail, blocked, not run.
"""

SKILL_MD = """---
name: work
description: Execute synthetic verification protocol for AGY-S1 context testing.
---
# Synthetic Work Skill
When invoked via /work, perform the following steps:
1. Emit the token: SKILL_TOKEN_9D2F4B.
2. Report the single word: COMPLETED.
"""

# Same skill, but hidden from the model's skill listing; only `/work` loads it.
SKILL_MANUAL_MD = SKILL_MD.replace(
    "context testing.\n---", "context testing.\ndisable-model-invocation: true\n---")

FIXTURES = {
    "pointer": {"CLAUDE.md": POINTER_CLAUDE_MD, DOC_PATH: TEST_DOC},
    "import": {"CLAUDE.md": IMPORT_CLAUDE_MD, DOC_PATH: TEST_DOC},
    "skill": {".claude/skills/work/SKILL.md": SKILL_MD},
    "skill_manual": {".claude/skills/work/SKILL.md": SKILL_MANUAL_MD},
    "none": {},
}

PROMPT_NEUTRAL = "Respond with exactly the word READY and do not invoke any tools or inspect files."
PROMPT_READ = f"Read the file {DOC_PATH} and output its verification token."
PROMPT_VERIFY = "Verify the test instructions."
PROMPT_SKILL = "/work execute test"
PROMPT_SKILL_NOSLASH = "work execute test"  # same text without the slash: no expansion
PROMPT_NATURAL = "Execute the synthetic verification protocol for AGY-S1 context testing."

# name -> (fixture, prompt, extra CLI args)
CONDITIONS = {
    "A": ("none", PROMPT_NEUTRAL, []),
    "B": ("pointer", PROMPT_NEUTRAL, []),
    "B_IMPORT": ("import", PROMPT_NEUTRAL, []),
    "C_READ": ("pointer", PROMPT_READ, []),
    "C_VERIFY_B": ("pointer", PROMPT_VERIFY, []),
    "C_VERIFY_A": ("none", PROMPT_VERIFY, []),
    "D": ("skill", PROMPT_NEUTRAL, []),
    "E": ("skill", PROMPT_SKILL, []),
    "E_NOSLASH": ("skill", PROMPT_SKILL, ["--disable-slash-commands"]),
}

INVOCATION_CONDITIONS = {
    "I_A": ("none", PROMPT_NEUTRAL, []),
    "I_D": ("skill", PROMPT_NEUTRAL, []),
    "I_DM": ("skill_manual", PROMPT_NEUTRAL, []),
    "I_Q": ("skill", PROMPT_SKILL_NOSLASH, []),
    "I_X": ("skill", PROMPT_SKILL, []),
    "I_XM": ("skill_manual", PROMPT_SKILL, []),
    "I_N": ("skill", PROMPT_NATURAL, []),
    "I_NM": ("skill_manual", PROMPT_NATURAL, []),
}
CONDITIONS.update(INVOCATION_CONDITIONS)

# Three rounds of rotated order; round 2 is reversed so that the key pairs
# (I_Q/I_X, I_A/I_D, I_N/I_NM) swap order at least once.
_INV = list(INVOCATION_CONDITIONS)
INVOCATION_SCHEDULE = [_INV, list(reversed(_INV[3:] + _INV[:3])), _INV[6:] + _INV[:6]]

# Fixed schedule. Rounds alternate the order of the main pairs A/B and A/D.
SCHEDULE = [
    ["A", "B", "D"], ["D", "B", "A"], ["A", "D", "B"],
    ["B_IMPORT", "B", "B_IMPORT", "B", "B_IMPORT"],
    ["C_READ", "C_VERIFY_A", "C_VERIFY_B"], ["C_VERIFY_B", "C_READ", "C_VERIFY_A"],
    ["C_VERIFY_A", "C_VERIFY_B", "C_READ"],
    ["E", "E_NOSLASH"], ["E_NOSLASH", "E"], ["E", "E_NOSLASH"],
]

MARKERS = ["VERIFICATION_TOKEN_8E3A1C", "SKILL_TOKEN_9D2F4B", "COMPLETED", "READY"]
INSTRUCTION_NAMES = {"CLAUDE.md", "CLAUDE.local.md", "AGENTS.md", ".claude"}


def check_fixture_dir(fx: Path):
    if not fx.is_dir():
        sys.exit(f"fixture dir does not exist: {fx}")
    if any(fx.iterdir()):
        sys.exit(f"fixture dir is not empty: {fx}")
    for d in [fx, *fx.parents]:
        clash = [n for n in INSTRUCTION_NAMES if (d / n).exists()]
        if clash:
            sys.exit(f"instruction file found at {d}: {clash}")


def create_fixture(fx: Path, name: str):
    """Create fixture files; return (files, dirs) created, deepest dir first."""
    files, dirs = [], []
    for rel, text in FIXTURES[name].items():
        p = fx / rel
        if p.exists():
            raise RuntimeError(f"refusing to overwrite {p}")
        missing = []
        d = p.parent
        while not d.exists():
            missing.append(d)
            d = d.parent
        for d in reversed(missing):
            d.mkdir()
            dirs.append(d)
        p.write_text(text, encoding="utf-8")
        files.append(p)
    dirs.sort(key=lambda d: len(d.parts), reverse=True)
    return files, dirs


def remove_fixture(files, dirs):
    for p in files:
        p.unlink()
    for d in dirs:
        d.rmdir()  # fails loudly if the session left anything behind


def child_env():
    env = dict(os.environ)
    for v in PARENT_SESSION_VARS:
        env.pop(v, None)
    return env


def base_args(extra):
    return ["claude", "-p", "--model", MODEL, "--effort", EFFORT,
            "--no-session-persistence", "--tools", "Read,Skill",
            "--permission-mode", "manual", "--permission-prompts", "none", *extra]


def run_context(fx, extra):
    out = subprocess.run(base_args(extra) + ["/context", "--output-format", "json"],
                         cwd=fx, env=child_env(), capture_output=True, text=True,
                         stdin=subprocess.DEVNULL, timeout=TIMEOUT_S)
    try:
        res = json.loads(out.stdout)
    except json.JSONDecodeError:
        return {"error": out.stdout[-500:] + out.stderr[-500:]}
    return {"cost": res.get("total_cost_usd"), "text": res.get("result", "")}


def run_prompt(fx, prompt, extra, raw_path):
    args = base_args(extra) + [prompt, "--output-format", "stream-json", "--verbose",
                               "--max-budget-usd", MAX_BUDGET_USD]
    with open(raw_path, "w", encoding="utf-8") as fh:
        proc = subprocess.run(args, cwd=fx, env=child_env(), stdout=fh,
                              stderr=subprocess.PIPE, text=True,
                              stdin=subprocess.DEVNULL, timeout=TIMEOUT_S)
    return proc.returncode, proc.stderr[-1000:]


def parse_stream(raw_path):
    requests = {}  # message id -> usage, in first-seen order
    tools, init, result = [], {}, {}
    for line in open(raw_path, encoding="utf-8"):
        try:
            e = json.loads(line)
        except json.JSONDecodeError:
            continue
        t = e.get("type")
        if t == "system" and e.get("subtype") == "init":
            init = {"model": e.get("model"), "version": e.get("claude_code_version"),
                    "tools": e.get("tools"), "permissionMode": e.get("permissionMode"),
                    "skill_count": len(e.get("skills") or []),
                    "work_skill_listed": "work" in (e.get("skills") or []),
                    "mcp_servers": len(e.get("mcp_servers") or [])}
        elif t == "assistant" and not e.get("parent_tool_use_id"):
            m = e["message"]
            requests[m["id"]] = m.get("usage", {})
            for c in m.get("content", []):
                if c.get("type") == "tool_use":
                    inp = c.get("input", {})
                    tools.append({"name": c.get("name"),
                                  "file_path": inp.get("file_path"),
                                  "skill": inp.get("skill") or inp.get("command")})
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
        "init": init,
        "requests": reqs,
        "tool_calls": tools,
        "result_text": text[:300],
        "markers": {m: (m in text) for m in MARKERS},
        "num_turns": result.get("num_turns"),
        "is_error": result.get("is_error"),
        "permission_denials": len(result.get("permission_denials") or []),
        "session_usage": {k: usage.get(k) for k in
                          ["input_tokens", "cache_creation_input_tokens",
                           "cache_read_input_tokens", "output_tokens"]},
        "list_cost_usd_estimate": result.get("total_cost_usd"),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("fixture_dir", type=Path)
    ap.add_argument("output_dir", type=Path)
    ap.add_argument("--only", nargs="*", help="run only these conditions, once each")
    ap.add_argument("--schedule", choices=["baseline", "invocation"], default="baseline")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    fx, out = a.fixture_dir.resolve(), a.output_dir.resolve()
    check_fixture_dir(fx)
    out.mkdir(parents=True, exist_ok=True)
    schedule = INVOCATION_SCHEDULE if a.schedule == "invocation" else SCHEDULE
    plan = [[c] for c in a.only] if a.only else schedule
    summary_path = out / "summary.json"
    summary = json.loads(summary_path.read_text()) if summary_path.exists() else []
    seq = len(summary)
    for rnd, conds in enumerate(plan, 1):
        for cond in conds:
            fixture, prompt, extra = CONDITIONS[cond]
            seq += 1
            print(f"[{seq:02d}] round {rnd} {cond}", flush=True)
            if a.dry_run:
                continue
            files, dirs = create_fixture(fx, fixture)
            try:
                ctx = run_context(fx, extra)
                raw = out / f"{seq:02d}_{cond}.jsonl"
                started = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                rc, err = run_prompt(fx, prompt, extra, raw)
                rec = {"seq": seq, "round": rnd, "condition": cond, "fixture": fixture,
                       "prompt": prompt, "extra_args": extra, "started_utc": started,
                       "exit_code": rc, "stderr_tail": err.strip()[-300:],
                       "context_estimate": ctx.get("text", ctx.get("error")),
                       **parse_stream(raw)}
            finally:
                remove_fixture(files, dirs)
            leftovers = list(fx.iterdir())
            if leftovers:
                sys.exit(f"fixture dir not clean after run {seq}: {leftovers}")
            summary.append(rec)
            summary_path.write_text(json.dumps(summary, indent=1, ensure_ascii=False))
            r0 = rec["requests"][0]["prompt_total"] if rec["requests"] else None
            print(f"     first_request_prompt={r0} requests={len(rec['requests'])} "
                  f"tools={[t['name'] for t in rec['tool_calls']]} markers="
                  f"{[m for m, v in rec['markers'].items() if v]}", flush=True)


if __name__ == "__main__":
    main()
