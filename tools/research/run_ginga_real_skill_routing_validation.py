#!/usr/bin/env python3
"""Runner for GINGA-REAL-SKILL-ROUTING-VALIDATION.

Report: docs/research/ginga-real-skill-routing-validation.md

Question: does the routing effect seen with synthetic skills (explicit `/work`
injects the body with no `Skill` call; natural language loads it through a
`Skill` call in an extra request) also appear with G-Ingá's real operational
`work` skill, on real tasks in the real repository?

Skill under test: `.claude/skills/work/` exactly as committed at
`feat/v1-work-self-hosting` 5d38ae3 (hashes in SKILL_FILES). Nothing in it is
changed. Two task classes exercise two paths of that skill:

    L  light path   typo fix in a real doc (SKILL.md only)
    R  resume path  `resume <task-id>` of an active standard task (SKILL.md,
                    resume.md, standard.md, a task record and the validator)

Routes, one fresh `claude -p` process and one user turn per session:

    E  explicit    "/work <request>"
    N  natural     "<request>"  (the skill is listed; the model may pick it)

One pair = the same instance (same data) under E and N, back to back in a
counterbalanced order. Every session runs in its own fresh full-history clone
of the pinned commit, plus one fixture-data commit for its instance, so the
skill's own validator can walk Git history. The clone has no remote.

Usage:
    python3 run_ginga_real_skill_routing_validation.py REPO WORK_DIR
        [--plan smoke|matrix] [--budget-usd X] [--dry-run] [--analyze]
        [--selftest] [--pairs L1,R2,...]

REPO is a clone that has `origin/feat/v1-work-self-hosting` at PINNED_COMMIT.
WORK_DIR must sit outside any Git work tree. It receives the bundle, per-session
clones (removed after each session), raw stream-json, raw API bodies and
summary.json. Those hold account context: never commit them.
"""

import argparse
import hashlib
import json
import math
import os
import random
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

MODEL = "claude-sonnet-5-5"
EFFORT = "medium"
PER_RUN_CAP_USD = 0.50  # passed as --max-budget-usd; list-price guard
DEFAULT_BUDGET_USD = 3.00  # whole task, smoke included, list price
TIMEOUT_S = 600
SEED = 20261011

PINNED_REF = "origin/feat/v1-work-self-hosting"
PINNED_COMMIT = "5d38ae353bbe12444188110b18e78aa78d3f62fe"
FIXTURE_BRANCH = "feat/v1-work-self-hosting"
SKILL_FILES = {
    ".claude/skills/work/SKILL.md": "ec32f68ab6f85ce631aac0fa662f42a8dcf8a56fee2f6dce089d93823ed4de78",
    ".claude/skills/work/standard.md": "f559bde918124d9c5890ec1e564a9d2d75a2aecba364fcdc49dcc7f14d1b8786",
    ".claude/skills/work/heavy.md": "229528b8f93e7aee06edd0ac733e82be779931205d0d304d961b9d314470a8db",
    ".claude/skills/work/resume.md": "f31768350cd09b4dcb944dd6bc87c7c44bd51d51d7c71091c071cb490b892817",
    ".claude/skills/work/review.md": "8b5abd9e9b757f930c4e56e786fc64f83d8c5942ac2ca1cc9771d07e21cb3214",
}
SKILL_MARKER = "# /work — G-Ingá SDLC Harness"  # SKILL.md H1
RESUME_MARKER = "# Resume Procedure"
STANDARD_MARKER = "# Standard Ceremony Procedure"

TOOLS = "Read,Edit,Write,Bash,Glob,Grep,Skill"
ALLOWED_BASH = [
    "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)",
    "Bash(git show:*)", "Bash(git branch:*)", "Bash(git rev-parse:*)",
    "Bash(git add:*)", "Bash(git commit:*)", "Bash(git merge-base:*)",
    "Bash(node tools/validate/validate.js:*)",
    "Bash(bun tools/validate/validate.ts:*)",
    "Bash(ls:*)", "Bash(cat:*)", "Bash(head:*)", "Bash(tail:*)",
    "Bash(wc:*)", "Bash(grep:*)", "Bash(date:*)", "Bash(pwd)",
]

PARENT_SESSION_VARS = [
    "CLAUDECODE", "CLAUDE_PID", "CLAUDE_CODE_SESSION_ID",
    "CLAUDE_CODE_REMOTE_SESSION_ID", "CLAUDE_CODE_REMOTE_SDK_URL",
    "CLAUDE_CODE_TEE_SDK_STDOUT", "CLAUDE_CODE_MESSAGING_SOCKET",
    "CLAUDE_CODE_MESSAGING_TOKEN", "CLAUDE_CODE_DIAGNOSTICS_FILE",
    "CLAUDE_CODE_SYNC_SESSION_REFS", "CLAUDE_CODE_POST_FOR_SESSION_INGRESS_V2",
    "CLAUDE_CODE_REMOTE_SEND_KEEPALIVES", "CLAUDE_CODE_WORKER_EPOCH",
    "CLAUDE_AFTER_LAST_COMPACT", "CLAUDE_CODE_DEBUG",
    # Not in the earlier runners: keep the parent's extra directories (and
    # their CLAUDE.md) out of the child, which now has write tools.
    "CLAUDE_ADDITIONAL_DIRECTORIES", "CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD",
]
TELEMETRY_VARS = ["CLAUDE_CODE_ENABLE_TELEMETRY", "OTEL_LOG_RAW_API_BODIES",
                  "OTEL_LOGS_EXPORTER", "OTEL_METRICS_EXPORTER",
                  "OTEL_TRACES_EXPORTER", "OTEL_EXPORTER_OTLP_ENDPOINT"]
GIT_ID = {"GIT_AUTHOR_NAME": "fixture", "GIT_AUTHOR_EMAIL": "fixture@example.invalid",
          "GIT_COMMITTER_NAME": "fixture", "GIT_COMMITTER_EMAIL": "fixture@example.invalid",
          "GIT_AUTHOR_DATE": "2026-10-11T12:00:00Z", "GIT_COMMITTER_DATE": "2026-10-11T12:00:00Z"}

# --- Instances (fixed before any run) ---------------------------------------
# L: (file, correct word, injected misspelling). The correct word occurs
# exactly once (case-sensitive, whole word) at the pinned commit.
L_INSTANCES = {
    "SMK-L": ("docs/decision-map.md", "coexistence", "coexistance"),
    "L1": ("docs/principles.md", "consensus", "concensus"),
    "L2": ("docs/decision-map.md", "dependency", "dependancy"),
    "L3": ("docs/brand-and-roadmap.md", "Independent", "Independant"),
    "L4": ("README.md", "existing", "exsisting"),
    "L5": ("docs/development.md", "deterministic", "determinstic"),
}
# R: (task slug, target file, line to append, short title).
R_INSTANCES = {
    "SMK-R": ("record-validator-exit-codes", "docs/friction-log.md",
              "- 2026-10-11: validator exit codes are 0 pass, 1 fail, 2 blocked (ref SMK-R-4QZ).",
              "Record validator exit codes in the friction log"),
    "R1": ("note-light-zero-persistence", "docs/friction-log.md",
           "- 2026-10-11: light tasks persist no files under tasks/ or specs/ (ref R1-K7Q).",
           "Note light-tier zero persistence in the friction log"),
    "R2": ("principles-check-vocabulary", "docs/principles.md",
           "Check results use exactly four values: pass, fail, blocked, not run (ref R2-M3D).",
           "State the check vocabulary in the principles"),
    "R3": ("development-validator-entry", "docs/development.md",
           "The standalone validator runs with `node tools/validate/validate.js` (ref R3-P8W).",
           "Name the standalone validator entry in development notes"),
    "R4": ("decision-map-resume-note", "docs/decision-map.md",
           "Paused tasks resume from their latest checkpoint (ref R4-T2V).",
           "Add a resume note to the decision map"),
    "R5": ("readme-pointer-note", "README.md",
           "Target repositories point to `/work` through a delimited block in CLAUDE.md (ref R5-H6N).",
           "Mention the CLAUDE.md pointer block in the README"),
}
TASK_DATE = "2026-10-11"

L_REQUEST = 'Fix the typo "{bad}" in {file}.'
R_REQUEST = "resume {task_id}"
R_REQUEST_N = "Resume task {task_id}."


def task_id(slug):
    return f"{TASK_DATE}-{slug}"


def request_for(cls, inst, route):
    if cls == "L":
        f, _good, bad = L_INSTANCES[inst]
        text = L_REQUEST.format(bad=bad, file=f)
        return f"/work {text}" if route == "E" else text
    slug = R_INSTANCES[inst][0]
    if route == "E":
        return "/work " + R_REQUEST.format(task_id=task_id(slug))
    return R_REQUEST_N.format(task_id=task_id(slug))


def task_record(slug, target, line, title):
    return f"""---
schema: task/1
tier: standard
status: active
---

# {title}

## Routing and approvals

- tier: standard (documentation addition tracked across sessions)

## Objective

Append one line to `{target}`.

- In scope: `{target}` and this task record.
- Out of scope: any other file.

## Acceptance criteria

- AC1: the last line of `{target}` is `{line}`.
- AC2: the standalone validator (`node tools/validate/validate.js`) exits 0.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | standalone validator before edits | pass | {PINNED_COMMIT[:7]} | `node tools/validate/validate.js` (exit 0) |

## Plan

1. Append the line to `{target}`.
2. Run the validator and record AC1 and AC2.

## Checkpoint

- as of: {TASK_DATE}, branch {FIXTURE_BRANCH}, head {PINNED_COMMIT[:7]}, worktree clean
- done: baseline recorded (B1); task record opened
- next: append `{line}` as the last line of `{target}`, then verify AC1 and AC2
"""


# --- Fixture --------------------------------------------------------------------

def git(cwd, *args, check=True, env_extra=None):
    env = dict(os.environ)
    env.update(GIT_ID)
    if env_extra:
        env.update(env_extra)
    r = subprocess.run(["git", *args], cwd=cwd, env=env, text=True,
                       capture_output=True)
    if check and r.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)}: {r.stderr.strip()}")
    return r.stdout


def in_git_tree(p: Path) -> bool:
    return any((d / ".git").exists() for d in [p, *p.parents])


def prepare_bundle(repo: Path, work: Path) -> Path:
    sha = git(repo, "rev-parse", PINNED_REF).strip()
    if sha != PINNED_COMMIT:
        sys.exit(f"{PINNED_REF} is {sha}, expected {PINNED_COMMIT}")
    bundle = work / "pinned.bundle"
    if not bundle.exists():
        git(repo, "bundle", "create", str(bundle), f"refs/remotes/{PINNED_REF}")
    return bundle


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def make_fixture(bundle: Path, root: Path, cls: str, inst: str):
    """Fresh clone + one data commit. Returns (path, data-commit sha, meta)."""
    if root.exists():
        raise RuntimeError(f"fixture already exists: {root}")
    root.mkdir()
    git(root, "init", "-q")
    git(root, "fetch", "-q", str(bundle), f"refs/remotes/{PINNED_REF}:refs/heads/{FIXTURE_BRANCH}")
    git(root, "checkout", "-q", FIXTURE_BRANCH)
    if git(root, "rev-parse", "HEAD").strip() != PINNED_COMMIT or git(root, "remote").strip():
        raise RuntimeError("fixture clone is not at the pinned commit, or has a remote")
    for rel, digest in SKILL_FILES.items():
        if sha256(root / rel) != digest:
            raise RuntimeError(f"skill file hash mismatch: {rel}")
    meta = {}
    if cls == "L":
        f, good, bad = L_INSTANCES[inst]
        p = root / f
        text = p.read_text(encoding="utf-8")
        if len(re.findall(rf"\b{re.escape(good)}\b", text)) != 1 or bad in text:
            raise RuntimeError(f"{inst}: '{good}' is not unique in {f}, or '{bad}' exists")
        meta["pristine_sha256"] = hashlib.sha256(text.encode()).hexdigest()
        p.write_text(re.sub(rf"\b{re.escape(good)}\b", bad, text), encoding="utf-8")
        msg = f"docs: fixture data for {inst}"
    else:
        slug, target, line, title = R_INSTANCES[inst]
        rec = root / "tasks" / f"{task_id(slug)}.md"
        rec.write_text(task_record(slug, target, line, title), encoding="utf-8")
        if line in (root / target).read_text(encoding="utf-8"):
            raise RuntimeError(f"{inst}: line already present")
        meta["record_sha256"] = sha256(rec)
        msg = f"docs(tasks): open {task_id(slug)}"
    git(root, "add", "-A")
    git(root, "commit", "-q", "-m", msg)
    base = git(root, "rev-parse", "HEAD").strip()
    if cls == "R":
        r = subprocess.run(["node", "tools/validate/validate.js"], cwd=root,
                           capture_output=True, text=True)
        if r.returncode != 0:
            raise RuntimeError(f"{inst}: validator fails on fixture: {r.stdout[-400:]}")
    return base, meta


def changed_paths(root: Path, base: str):
    tracked = git(root, "diff", "--name-only", base).split()
    untracked = git(root, "ls-files", "--others", "--exclude-standard").split()
    return sorted(set(tracked) | set(untracked))


def check_outcome(root: Path, base: str, cls: str, inst: str, meta: dict, answer: str):
    paths = changed_paths(root, base)
    commits = int(git(root, "rev-list", "--count", f"{base}..HEAD").strip() or 0)
    out = {"changed_paths": paths, "commits_after_base": commits,
           "tasks_or_specs_changed": [p for p in paths if p.startswith(("tasks/", "specs/"))]}
    if cls == "L":
        f = L_INSTANCES[inst][0]
        fixed = (root / f).exists() and sha256(root / f) == meta["pristine_sha256"]
        extra = [p for p in paths if p != f]
        out.update({"c1_target_restored": fixed, "c2_only_target_changed": not extra,
                    "c3_no_tasks_specs": not out["tasks_or_specs_changed"],
                    "extra_paths": extra,
                    "routing_line": bool(re.search(r"tier:\s*`?light", answer))})
        out["correct"] = fixed and not extra
    else:
        slug, target, line, _ = R_INSTANCES[inst]
        rec_rel = f"tasks/{task_id(slug)}.md"
        text = (root / target).read_text(encoding="utf-8")
        last = text.rstrip("\n").split("\n")[-1] if text.strip() else ""
        c1 = last == line and text.count(line) == 1
        r = subprocess.run(["node", "tools/validate/validate.js"], cwd=root,
                           capture_output=True, text=True)
        rec = root / rec_rel
        c4 = rec.exists() and sha256(rec) != meta["record_sha256"]
        extra = [p for p in paths if p not in (target, rec_rel)]
        status = None
        if rec.exists():
            m = re.search(r"^status:\s*(\S+)", rec.read_text(encoding="utf-8"), re.M)
            status = m.group(1) if m else None
        out.update({"c1_line_appended": c1, "c2_validator_exit": r.returncode,
                    "c3_only_allowed_changed": not extra, "c4_record_updated": c4,
                    "extra_paths": extra, "record_status": status})
        out["correct"] = c1 and r.returncode == 0 and not extra and c4
    return out


# --- Running one session ----------------------------------------------------------

def child_env(raw_dir: Path):
    env = dict(os.environ)
    for v in PARENT_SESSION_VARS + TELEMETRY_VARS:
        env.pop(v, None)
    env.update({"CLAUDE_CODE_ENABLE_TELEMETRY": "1",
                "OTEL_LOGS_EXPORTER": "none", "OTEL_METRICS_EXPORTER": "none",
                "OTEL_TRACES_EXPORTER": "none",
                "OTEL_LOG_RAW_API_BODIES": f"file:{raw_dir}"})
    return env


def cli_args():
    return ["claude", "-p", "--model", MODEL, "--effort", EFFORT,
            "--no-session-persistence", "--tools", TOOLS,
            "--permission-mode", "acceptEdits", "--permission-prompts", "none",
            "--allowedTools", *ALLOWED_BASH,
            "--max-budget-usd", f"{PER_RUN_CAP_USD:.2f}",
            "--input-format", "stream-json",
            "--output-format", "stream-json", "--verbose"]


def run_session(fx: Path, text: str, raw_path: Path, raw_dir: Path):
    t0 = time.monotonic()
    rc, got = None, False
    with open(raw_path, "w", encoding="utf-8") as fh:
        proc = subprocess.Popen(cli_args(), cwd=fx, env=child_env(raw_dir),
                                stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, text=True, bufsize=1)
        try:
            msg = {"type": "user", "message": {"role": "user", "content": text}}
            proc.stdin.write(json.dumps(msg) + "\n")
            proc.stdin.flush()
            while time.monotonic() - t0 < TIMEOUT_S:
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
            proc.stdin.close()
            rest, err = proc.communicate(timeout=60)
            fh.write(rest)
            rc = proc.returncode if got else "no-result"
        except BaseException:
            proc.kill()
            proc.communicate()
            raise
    return rc, (err or "")[-600:], round(time.monotonic() - t0, 1)


def text_of(block):
    if isinstance(block, str):
        return block
    if not isinstance(block, dict):
        return ""
    if block.get("type") == "text":
        return block.get("text", "")
    if block.get("type") == "tool_result":
        c = block.get("content")
        return c if isinstance(c, str) else "".join(text_of(x) for x in c or [])
    if block.get("type") == "tool_use":
        return json.dumps(block.get("input"))
    return ""


def classify_skill_path(route, tool_calls):
    """Pre-registered path categories (report §2)."""
    skill_calls = [t for t in tool_calls if t["name"] == "Skill"]
    work_calls = [t for t in skill_calls if (t.get("skill") or "").lstrip("/").startswith("work")]
    read_skill = [t for t in tool_calls if t["name"] == "Read"
                  and (t.get("file_path") or "").endswith(".claude/skills/work/SKILL.md")]
    if route == "E":
        return "EXPLICIT_PLUS_SKILL" if work_calls else "EXPLICIT"
    if work_calls:
        return "SKILL_TOOL"
    if read_skill:
        return "READ_SKILL_FILE"
    return "NO_SKILL"


def parse_stream(raw_path: Path):
    requests, order, tools, init, result = {}, [], [], {}, {}
    hooks, sub_requests, user_marker = 0, set(), {"skill": False, "resume": False, "standard": False}
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
                    "work_listed": "work" in skills, "permission_mode": e.get("permissionMode")}
        elif t == "system" and "hook" in (e.get("subtype") or ""):
            hooks += 1
        elif t == "assistant":
            m = e["message"]
            if e.get("parent_tool_use_id"):
                sub_requests.add(m["id"])
                continue
            if m["id"] not in requests:
                order.append(m["id"])
                requests[m["id"]] = {"usage": m.get("usage", {}), "idx": len(order)}
            requests[m["id"]]["usage"] = m.get("usage", {})
            for c in m.get("content", []):
                if c.get("type") == "tool_use":
                    inp = c.get("input", {}) or {}
                    tools.append({"name": c.get("name"), "req": requests[m["id"]]["idx"],
                                  "skill": inp.get("skill") or inp.get("command"),
                                  "file_path": inp.get("file_path") or inp.get("path"),
                                  "bash": (inp.get("command") or "")[:120] if c.get("name") == "Bash" else None})
        elif t == "user":
            for b in (e.get("message") or {}).get("content") or []:
                s = text_of(b)
                user_marker["skill"] |= SKILL_MARKER in s
                user_marker["resume"] |= RESUME_MARKER in s
                user_marker["standard"] |= STANDARD_MARKER in s
        elif t == "result":
            u = e.get("usage") or {}
            result = {"is_error": e.get("is_error"), "subtype": e.get("subtype"),
                      "num_turns": e.get("num_turns"), "duration_ms": e.get("duration_ms"),
                      "total_cost_usd": e.get("total_cost_usd"),
                      "output_tokens": u.get("output_tokens"),
                      "permission_denials": [
                          {"tool": d.get("tool_name"),
                           "cmd": ((d.get("tool_input") or {}).get("command") or "")[:120]}
                          for d in (e.get("permission_denials") or [])],
                      "answer": e.get("result") or ""}
    reqs = []
    for mid in order:
        u = requests[mid]["usage"]
        i, cc, cr = (u.get("input_tokens", 0), u.get("cache_creation_input_tokens", 0),
                     u.get("cache_read_input_tokens", 0))
        reqs.append({"input": i, "cache_creation": cc, "cache_read": cr,
                     "prompt_total": i + cc + cr, "output": u.get("output_tokens", 0)})
    return {"init": init, "requests": reqs, "tool_calls": tools, "result": result,
            "hook_events": hooks, "subagent_requests": len(sub_requests),
            "stream_markers": user_marker}


def summarize_bodies(raw_dir: Path):
    """Per main-model request body: skill-marker presence and size only."""
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
        s = "".join(text_of(b) for m in msgs
                    for b in (m["content"] if isinstance(m["content"], list) else [m["content"]]))
        out.append({"n_messages": len(msgs), "chars": len(s),
                    "skill_body": SKILL_MARKER in s, "resume_body": RESUME_MARKER in s,
                    "standard_body": STANDARD_MARKER in s,
                    "command_tag": "<command-name>" in s})
    return out


def derive(parsed):
    reqs = parsed["requests"]
    r = parsed["result"]
    return {
        "M1": reqs[0]["prompt_total"] if reqs else None,
        "M1_split": {k: reqs[0][k] for k in ("input", "cache_creation", "cache_read")} if reqs else None,
        "REQ": len(reqs),
        "CUM": sum(x["prompt_total"] for x in reqs),
        "CUM_input": sum(x["input"] for x in reqs),
        "CUM_cache_creation": sum(x["cache_creation"] for x in reqs),
        "CUM_cache_read": sum(x["cache_read"] for x in reqs),
        "OUT": r.get("output_tokens"),
        "USD": r.get("total_cost_usd"),
        "TOOLS": len(parsed["tool_calls"]),
        "BASH": sum(1 for t in parsed["tool_calls"] if t["name"] == "Bash"),
        "DENIED": len(r.get("permission_denials") or []),
    }


# --- Plans --------------------------------------------------------------------------

def build_plan(kind, only=None):
    if kind == "smoke":
        return [("SMK-L", "L", "E", 1), ("SMK-R", "R", "N", 1)]
    rng = random.Random(SEED)
    plan = []
    for cls, insts in (("L", ["L1", "L2", "L3", "L4", "L5"]), ("R", ["R1", "R2", "R3", "R4", "R5"])):
        firsts = ["E", "E", "N", "N", "E" if rng.random() < 0.5 else "N"]
        rng.shuffle(firsts)
        for inst, first in zip(insts, firsts):
            second = "N" if first == "E" else "E"
            plan += [(inst, cls, first, 1), (inst, cls, second, 2)]
    if only:
        plan = [p for p in plan if p[0] in only]
    return plan


# --- Statistics -----------------------------------------------------------------------

def sign_flip_p(diffs):
    n = len(diffs)
    if n == 0:
        return None
    obs = abs(sum(diffs))
    hits = 0
    for mask in range(2 ** n):
        s = sum(d if (mask >> i) & 1 else -d for i, d in enumerate(diffs))
        if abs(s) >= obs - 1e-12:
            hits += 1
    return hits / 2 ** n


def clopper_pearson(k, n, alpha=0.05):
    from math import comb

    def cdf(x, p):
        return sum(comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(x + 1))

    def solve(f, lo=0.0, hi=1.0):
        for _ in range(100):
            mid = (lo + hi) / 2
            if f(mid):
                hi = mid
            else:
                lo = mid
        return (lo + hi) / 2
    lower = 0.0 if k == 0 else solve(lambda p: 1 - cdf(k - 1, p) >= alpha / 2)
    upper = 1.0 if k == n else solve(lambda p: cdf(k, p) <= alpha / 2)
    return round(lower, 3), round(upper, 3)


def median(v):
    v = sorted(v)
    n = len(v)
    if n == 0:
        return None
    return v[n // 2] if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2


def analyze(summary):
    rows = [s for s in summary["sessions"] if s["plan"] == "matrix" and s.get("ok")]
    report = {}
    for cls in ("L", "R"):
        by = {}
        for s in rows:
            if s["class"] == cls:
                by.setdefault(s["instance"], {})[s["route"]] = s
        pairs = [(i, p["E"], p["N"]) for i, p in sorted(by.items()) if "E" in p and "N" in p]
        res = {"pairs": len(pairs)}
        for k in ("M1", "REQ", "CUM", "CUM_cache_read", "CUM_cache_creation", "CUM_input",
                  "OUT", "USD", "TOOLS", "BASH"):
            d = [n["derived"][k] - e["derived"][k] for _, e, n in pairs
                 if n["derived"][k] is not None and e["derived"][k] is not None]
            res[f"d_{k}"] = {"per_pair": [round(x, 5) for x in d], "median": median(d),
                             "positive": sum(1 for x in d if x > 0),
                             "p_signflip": sign_flip_p(d)}
        n_rows = [n for _, _, n in pairs]
        k = sum(1 for n in n_rows if n["path"] == "SKILL_TOOL")
        res["N_paths"] = {p: sum(1 for n in n_rows if n["path"] == p)
                          for p in ("SKILL_TOOL", "READ_SKILL_FILE", "NO_SKILL")}
        res["N_skill_tool_rate"] = {"k": k, "n": len(n_rows),
                                    "ci95": clopper_pearson(k, len(n_rows)) if n_rows else None}
        res["E_paths"] = {p: sum(1 for _, e, _ in pairs if e["path"] == p)
                          for p in ("EXPLICIT", "EXPLICIT_PLUS_SKILL")}
        res["correct"] = {r: sum(1 for x in [e if r == "E" else n for _, e, n in pairs]
                                 if x["outcome"]["correct"]) for r in ("E", "N")}
        dc, du = res["d_CUM"], res["d_USD"]
        if pairs:
            rep = dc["median"] > 0 and dc["positive"] >= 4 and du["median"] > 0
            notrep = dc["median"] <= 0 or dc["positive"] <= 2
            res["H2_verdict"] = "replicated" if rep else ("not replicated" if notrep else "inconclusive")
            res["materiality"] = ("material" if abs(dc["median"]) >= 5000 and abs(du["median"]) >= 0.0015
                                  else "not material")
        report[cls] = res
    return report


# --- Self-test --------------------------------------------------------------------------

def selftest(repo: Path, work: Path):
    assert sign_flip_p([1, 1, 1, 1, 1]) == 2 / 32
    assert clopper_pearson(5, 5)[1] == 1.0 and clopper_pearson(0, 5)[0] == 0.0
    assert classify_skill_path("E", []) == "EXPLICIT"
    assert classify_skill_path("E", [{"name": "Skill", "skill": "work"}]) == "EXPLICIT_PLUS_SKILL"
    assert classify_skill_path("N", [{"name": "Skill", "skill": "work"}]) == "SKILL_TOOL"
    assert classify_skill_path("N", [{"name": "Read", "file_path": "/x/.claude/skills/work/SKILL.md"}]) == "READ_SKILL_FILE"
    assert classify_skill_path("N", [{"name": "Skill", "skill": "other"}]) == "NO_SKILL"
    assert request_for("L", "L1", "E") == '/work Fix the typo "concensus" in docs/principles.md.'
    assert request_for("R", "R1", "N") == "Resume task 2026-10-11-note-light-zero-persistence."
    plan = build_plan("matrix")
    assert len(plan) == 20 and len({(p[0], p[2]) for p in plan}) == 20
    for cls in "LR":
        firsts = [p[2] for p in plan if p[1] == cls and p[3] == 1]
        assert firsts.count("E") in (2, 3)
    # Fixture round trip on every instance, with simulated correct outcomes.
    bundle = prepare_bundle(repo, work)
    for inst in list(L_INSTANCES) + list(R_INSTANCES):
        cls = "L" if inst in L_INSTANCES else "R"
        fx = work / "fx" / f"selftest-{inst}"
        fx.parent.mkdir(exist_ok=True)
        try:
            base, meta = make_fixture(bundle, fx, cls, inst)
            bad = check_outcome(fx, base, cls, inst, meta, "")
            assert not bad["correct"], inst
            if cls == "L":
                f, good, badw = L_INSTANCES[inst]
                p = fx / f
                p.write_text(p.read_text(encoding="utf-8").replace(badw, good), encoding="utf-8")
                ok = check_outcome(fx, base, cls, inst, meta, "tier: light (x)")
                assert ok["correct"] and ok["routing_line"], (inst, ok)
            else:
                slug, target, line, _ = R_INSTANCES[inst]
                p = fx / target
                p.write_text(p.read_text(encoding="utf-8").rstrip("\n") + "\n" + line + "\n", encoding="utf-8")
                rec = fx / "tasks" / f"{task_id(slug)}.md"
                rec.write_text(rec.read_text(encoding="utf-8").replace(
                    "- done: baseline recorded (B1); task record opened",
                    "- done: line appended"), encoding="utf-8")
                ok = check_outcome(fx, base, cls, inst, meta, "")
                assert ok["correct"], (inst, ok)
                (fx / "stray.md").write_text("x", encoding="utf-8")
                assert not check_outcome(fx, base, cls, inst, meta, "")["correct"]
        finally:
            shutil.rmtree(fx, ignore_errors=True)
    print("selftest: pass")


# --- Main -----------------------------------------------------------------------------------

def load_summary(path):
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {"sessions": [], "spent_usd": 0.0}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("repo", type=Path)
    ap.add_argument("work", type=Path)
    ap.add_argument("--plan", choices=["smoke", "matrix"], default="matrix")
    ap.add_argument("--budget-usd", type=float, default=DEFAULT_BUDGET_USD)
    ap.add_argument("--pairs", default="")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--analyze", action="store_true")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    work = a.work.resolve()
    work.mkdir(parents=True, exist_ok=True)
    if in_git_tree(work):
        sys.exit("WORK_DIR must be outside any Git work tree")
    for d in work.parents:
        if any((d / n).exists() for n in ("CLAUDE.md", "AGENTS.md", ".claude", "CLAUDE.local.md")) and d != Path.home():
            sys.exit(f"instruction file in an ancestor of WORK_DIR: {d}")
    if a.selftest:
        return selftest(a.repo, work)
    summary_path = work / "summary.json"
    summary = load_summary(summary_path)
    if a.analyze:
        print(json.dumps(analyze(summary), indent=1))
        return
    only = set(a.pairs.split(",")) if a.pairs else None
    plan = build_plan(a.plan, only)
    done = {(s["plan"], s["instance"], s["route"]) for s in summary["sessions"]}
    plan = [p for p in plan if (a.plan, p[0], p[2]) not in done]
    if a.dry_run:
        for p in plan:
            print(p, "|", request_for(p[1], p[0], p[2]))
        print("cli:", " ".join(cli_args()))
        return
    bundle = prepare_bundle(a.repo, work)
    fails = 0
    for inst, cls, route, pos in plan:
        if summary["spent_usd"] + PER_RUN_CAP_USD > a.budget_usd + 1e-9:
            print(f"budget stop before {inst}/{route}: spent {summary['spent_usd']:.4f}")
            break
        sid = f"{a.plan}-{inst}-{route}"
        fx = work / "fx" / sid
        fx.parent.mkdir(exist_ok=True)
        raw_dir = work / "bodies" / sid
        raw_dir.mkdir(parents=True, exist_ok=False)
        base, meta = make_fixture(bundle, fx, cls, inst)
        text = request_for(cls, inst, route)
        ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        rc, err, wall = run_session(fx, text, work / f"{sid}.jsonl", raw_dir)
        parsed = parse_stream(work / f"{sid}.jsonl")
        answer = parsed["result"].pop("answer", "")
        outcome = check_outcome(fx, base, cls, inst, meta, answer)
        shutil.rmtree(fx)
        rec = {"plan": a.plan, "instance": inst, "class": cls, "route": route, "position": pos,
               "started_at": ts, "request_chars": len(text), "rc": rc, "stderr_tail": err,
               "wall_s": wall, "ok": rc == 0 and bool(parsed["result"]),
               "init": parsed["init"], "hook_events": parsed["hook_events"],
               "subagent_requests": parsed["subagent_requests"],
               "stream_markers": parsed["stream_markers"],
               "requests": parsed["requests"], "tool_calls": parsed["tool_calls"],
               "result": parsed["result"], "answer_head": answer[:300],
               "answer_chars": len(answer),
               "path": classify_skill_path(route, parsed["tool_calls"]),
               "derived": derive(parsed), "bodies": summarize_bodies(raw_dir),
               "outcome": outcome}
        summary["sessions"].append(rec)
        summary["spent_usd"] = round(summary["spent_usd"] + (parsed["result"].get("total_cost_usd") or 0), 6)
        summary_path.write_text(json.dumps(summary, indent=1), encoding="utf-8")
        d = rec["derived"]
        print(f"{sid}: rc={rc} path={rec['path']} REQ={d['REQ']} CUM={d['CUM']} "
              f"USD={d['USD']} correct={outcome['correct']} spent={summary['spent_usd']:.4f}")
        fails = fails + 1 if not rec["ok"] else 0
        if fails >= 2:
            print("stop rule: 2 consecutive failed sessions")
            break


if __name__ == "__main__":
    main()
