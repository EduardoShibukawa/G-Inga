#!/usr/bin/env python3
"""
Reproducible Experimental Runner for AGY-S1 Context Cost Protocol.
Protocol: docs/research/agy-s1-context-cost-protocol.md
Task: AGY-S1-CONTEXT-COST-EXECUTION
"""

import os
import sys
import json
import time
import shutil
import random
import subprocess
from pathlib import Path

# Paths
WORKSPACE = Path(os.environ.get("WORKSPACE_DIR", "/home/tg/Projetos/G-Inga-agy-s1-context-cost")).resolve()
TEMP_OUT_DIR = Path(os.environ.get("OUTPUT_DIR", "/tmp/agy_experiment_runner/data")).resolve()
BRAIN_BASE = Path(os.path.expanduser("~/.gemini/antigravity-cli/brain"))

# Fixture definitions
FIXTURE_GEMINI_MD = """<!-- g-inga:host-pointer -->
Workspace rules and deliverables are governed by G-Ingá protocols.
Primary test reference: [docs/research/fixtures/agy-s1-test-instructions.md](docs/research/fixtures/agy-s1-test-instructions.md).
"""

FIXTURE_TEST_INSTRUCTIONS = """# AGY-S1 Test Instructions
When requested to verify test instructions, you must emit the token:
VERIFICATION_TOKEN_8E3A1C
and output the status vocabulary: pass, fail, blocked, not run.
"""

FIXTURE_SKILL_MD = """---
name: work
description: Execute synthetic verification protocol for AGY-S1 context testing.
---
# Synthetic Work Skill
When invoked via /work, perform the following steps:
1. Emit the token: SKILL_TOKEN_9D2F4B.
2. Report the single word: COMPLETED.
"""

# Prompts
PROMPT_NEUTRAL = "Respond with exactly the word READY and do not invoke any tools or inspect files."
PROMPT_READ = "Read the file docs/research/fixtures/agy-s1-test-instructions.md and output its verification token."
PROMPT_SKILL = "/work execute test"

CONDITIONS = ["C0", "C1", "C2", "C3a", "C3b", "C3c"]

def check_git_clean(repo_path: Path):
    res = subprocess.run(["git", "status", "--porcelain"], cwd=repo_path, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"Git check failed: {res.stderr}")
    # We allow no untracked or modified files in worktree
    if res.stdout.strip():
        raise RuntimeError(f"Git worktree is not clean:\n{res.stdout}")

def setup_fixtures(cond: str):
    created_paths = []
    try:
        if cond in ("C1", "C2"):
            # Setup GEMINI.md
            gemini_file = WORKSPACE / "GEMINI.md"
            gemini_file.write_text(FIXTURE_GEMINI_MD, encoding="utf-8")
            created_paths.append(gemini_file)

            # Setup docs/research/fixtures/agy-s1-test-instructions.md
            fixtures_dir = WORKSPACE / "docs" / "research" / "fixtures"
            fixtures_dir.mkdir(parents=True, exist_ok=True)
            test_file = fixtures_dir / "agy-s1-test-instructions.md"
            test_file.write_text(FIXTURE_TEST_INSTRUCTIONS, encoding="utf-8")
            created_paths.append(test_file)

        elif cond in ("C3a", "C3b", "C3c"):
            # Setup .agents/skills/work/SKILL.md
            skill_dir = WORKSPACE / ".agents" / "skills" / "work"
            skill_dir.mkdir(parents=True, exist_ok=True)
            skill_file = skill_dir / "SKILL.md"
            skill_file.write_text(FIXTURE_SKILL_MD, encoding="utf-8")
            created_paths.append(skill_file)

        return created_paths
    except Exception as e:
        cleanup_fixtures(created_paths)
        raise e

def cleanup_fixtures(paths):
    for p in paths:
        try:
            if p.is_file():
                p.unlink()
        except Exception as e:
            print(f"Warning cleaning {p}: {e}", file=sys.stderr)

    # Clean empty directories created
    for sub in [
        WORKSPACE / ".agents" / "skills" / "work",
        WORKSPACE / ".agents" / "skills",
        WORKSPACE / ".agents",
        WORKSPACE / "docs" / "research" / "fixtures"
    ]:
        try:
            if sub.exists() and sub.is_dir() and not any(sub.iterdir()):
                sub.rmdir()
        except Exception:
            pass

def extract_transcript_data(conv_id: str):
    transcript_file = BRAIN_BASE / conv_id / ".system_generated" / "logs" / "transcript_full.jsonl"
    if not transcript_file.exists():
        return None

    data = {
        "turn_0_prompt_tokens": None,
        "steps": [],
        "tool_calls_turn_0": [],
        "tool_calls_all": []
    }

    try:
        with open(transcript_file, "r", encoding="utf-8") as f:
            for line in f:
                rec = json.loads(line)
                step_idx = rec.get("step_index")
                stype = rec.get("type")
                tool_calls = rec.get("tool_calls") or []

                data["steps"].append({
                    "step_index": step_idx,
                    "type": stype,
                    "tool_calls": tool_calls
                })

                if tool_calls:
                    data["tool_calls_all"].extend(tool_calls)
                    if step_idx == 1:
                        data["tool_calls_turn_0"].extend(tool_calls)

                if stype == "PLANNER_RESPONSE" and step_idx == 1:
                    inp = rec.get("input_tokens", 0)
                    cache = rec.get("cache_read_tokens", 0)
                    data["turn_0_prompt_tokens"] = inp + cache
                    data["turn_0_input_tokens"] = inp
                    data["turn_0_cache_read_tokens"] = cache
                    data["turn_0_output_tokens"] = rec.get("output_tokens", 0)

        return data
    except Exception as e:
        print(f"Error parsing transcript for {conv_id}: {e}", file=sys.stderr)
        return None

def run_single_condition(cond: str, cycle: int, run_idx: int):
    check_git_clean(WORKSPACE)
    created = setup_fixtures(cond)

    cmd = ["agy", "-p"]
    if cond in ("C0", "C1", "C3a"):
        cmd.append(PROMPT_NEUTRAL)
    elif cond == "C2":
        cmd.append(PROMPT_READ)
    elif cond in ("C3b", "C3c"):
        cmd.append(PROMPT_SKILL)

    if cond == "C3c":
        cmd.append("--disable-slash-commands")

    cmd.extend(["--output-format", "json"])

    start_wall = time.time()
    try:
        proc = subprocess.run(
            cmd,
            cwd=WORKSPACE,
            capture_output=True,
            text=True,
            timeout=90
        )
        elapsed_wall = time.time() - start_wall
    except subprocess.TimeoutExpired:
        elapsed_wall = time.time() - start_wall
        return {
            "condition": cond,
            "cycle": cycle,
            "run_index": run_idx,
            "status": "TIMEOUT",
            "elapsed_wall_seconds": elapsed_wall,
            "error": "Timeout expired (90s)"
        }
    finally:
        cleanup_fixtures(created)
        check_git_clean(WORKSPACE)

    # Parse stdout JSON
    raw_stdout = proc.stdout.strip()
    raw_stderr = proc.stderr.strip()

    parsed_json = None
    if raw_stdout:
        # If there are prefixes like jetski warning, extract JSON
        idx = raw_stdout.find('{"conversation_id":')
        if idx != -1:
            json_substr = raw_stdout[idx:]
            try:
                parsed_json = json.loads(json_substr)
            except Exception as e:
                pass
        else:
            try:
                parsed_json = json.loads(raw_stdout)
            except Exception:
                pass

    record = {
        "condition": cond,
        "cycle": cycle,
        "run_index": run_idx,
        "returncode": proc.returncode,
        "elapsed_wall_seconds": elapsed_wall,
        "raw_stdout_sample": raw_stdout[:200],
        "raw_stderr_sample": raw_stderr[:200],
        "parsed_json": parsed_json,
        "transcript_data": None
    }

    if parsed_json and "conversation_id" in parsed_json:
        cid = parsed_json["conversation_id"]
        t_data = extract_transcript_data(cid)
        record["transcript_data"] = t_data

    return record

def main():
    TEMP_OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_file = TEMP_OUT_DIR / "runs_data.json"

    # Plan: 5 cycles, each containing all 6 conditions in randomized order (30 total)
    random.seed(42)  # reproducible permutation
    runs_plan = []
    run_counter = 0
    for cycle in range(1, 6):
        shuffled = list(CONDITIONS)
        random.shuffle(shuffled)
        for cond in shuffled:
            run_counter += 1
            runs_plan.append((cycle, run_counter, cond))

    print(f"Starting experimental run of {len(runs_plan)} tests across 5 randomized blocks...")
    print(f"Output directory: {TEMP_OUT_DIR}")

    results = []
    for cycle, run_idx, cond in runs_plan:
        print(f"[{run_idx:02d}/30] Cycle {cycle}: Running {cond}...", end="", flush=True)
        res = run_single_condition(cond, cycle, run_idx)
        results.append(res)

        status = res.get("parsed_json", {}).get("status") if res.get("parsed_json") else res.get("status", "FAIL")
        t0 = res.get("transcript_data", {}).get("turn_0_prompt_tokens") if res.get("transcript_data") else None
        turns = res.get("parsed_json", {}).get("num_turns") if res.get("parsed_json") else None
        print(f" -> Status: {status}, Turns: {turns}, Turn0 tokens: {t0}, Wall: {res['elapsed_wall_seconds']:.2f}s")

        # Save progress incrementally
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)

    print("Experiment completed successfully.")

if __name__ == "__main__":
    main()
