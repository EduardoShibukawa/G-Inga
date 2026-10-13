---
schema: task/1
tier: standard
status: verified
verified_at: "cfd6c95"
---

# Align the `/drive` Skill with the Artifact Contract

## Routing and approvals

- tier: standard (S1 holds: each fix is checkable by `grep` and `diff`; S2 holds: wording edits in an existing skill bundle; S3 holds: bounded to the two `/drive` mirrors and this record; S4 holds: two-way door)
- approved: owner request (2026-10-13, orchestrated ticket W2 "align /drive with contracts")

## Objective

Make `/drive` use only task states from the artifact contract (§3.3) and run in sessions without the owner-local `gira` CLI, keeping the Claude Code and Antigravity mirrors consistent.

1. Eligibility (Step 1) names contract task states instead of the spec state `draft`.
2. Worker reporting (Step 4) uses contract states instead of `ready_for_gate`.
3. Gira-G context extraction (Step 2) has a deterministic fallback when `gira` is unavailable.

- In scope:
  - `.claude/skills/drive/SKILL.md`
  - `.agents/skills/drive/SKILL.md`
  - `tasks/2026-10-13-align-drive-skill-with-contracts.md`
- Out of scope:
  - `manifest.json` (does not cover the drive skill) and the pinned `/work` bundle; approved specs, spec hashes, and ADRs.
  - `/orchestrate`, `tools/gate/`, `tools/eval/`, and any new tool.

## Acceptance criteria

- AC1: Step 1 eligibility in both mirrors names only contract task states (§3.3): `todo` or `active`, or `blocked` with its blocker resolved.
- AC2: Step 4 in both mirrors has workers leave the record at `completed` (or `verified` when §3.4 holds) and report for the gate; no `ready_for_gate`.
- AC3: Step 2 in both mirrors checks for `gira` and, when absent, records the step as `not run` with its reason and derives the slice from the record's `In scope:` files, without naming a new tool.
- AC4: `grep -n "ready_for_gate\|\`draft\`"` over both mirrors returns nothing, and `diff` of the mirrors shows only the pre-existing host-specific reference lines.
- AC5: `bun run validate` exits 0; `bun run typecheck` and `bun run test` pass.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validate and test | pass | b1aa551720fdaf14b71d266c0be0c19a947f4d6c | full history (not shallow); `bun install --frozen-lockfile`; `bun run validate` Overall pass; `bun run typecheck` pass; `bun run test` 220 pass, 0 fail (mise not installed; Bun used directly). HEAD differs from 6e7af64 only in `.markdownlint.jsonc` |
| AC1 | eligibility uses contract states | pass | cfd6c95 | Step 1 in both mirrors: `todo` or `active`, or `blocked` with `## Blockers` resolved (§3.3 `blocked --> active`) |
| AC2 | worker report uses contract states | pass | cfd6c95 | Step 4 in both mirrors: record left at `completed` (or `verified` when §3.4 holds), reported to the orchestrator for the gate |
| AC3 | gira fallback | pass | cfd6c95 | Step 2 checks `command -v gira`; fallback records `not run` (context enrichment, no gate depends on it) and derives the slice from `In scope:` files; no new tool named. `gira` absent in this session |
| AC4 | grep and mirror diff | pass | cfd6c95 | grep for `ready_for_gate` or backticked `draft` returns no match (exit 1); `diff` shows only the two pre-existing host-specific reference lines |
| AC5 | validate and test | pass | cfd6c95 | `bun run validate` Overall pass, exit 0; `bun run typecheck` pass; `bun run test` 220 pass, 0 fail (mise not installed; Bun used directly) |
| V1 | diff bounded to declared scope | pass | cfd6c95 | `git diff --name-only 82fa311 cfd6c95` lists only the three in-scope files; `manifest.json` untouched and has no drive entry |

## Plan

skip: three independent wording edits applied identically to both mirrors.

## Outcome

Both `/drive` mirrors now use only `task/1` states for eligibility and worker reporting, and Step 2 has a deterministic fallback for sessions without the `gira` CLI. The mirrors still differ only in their host-specific `/orchestrate` reference lines. `manifest.json` does not cover the drive skill, so no pin changed.

## Checkpoint

- as of: 2026-10-13, branch worktree-agent-adb465176b576a39c, head cfd6c95, task verified
- done: aligned eligibility, worker reporting and the gira fallback in both mirrors; verified AC1-AC5
- next: owner review and PR
