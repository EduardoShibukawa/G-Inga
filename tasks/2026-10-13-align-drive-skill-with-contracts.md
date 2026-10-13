---
schema: task/1
tier: standard
status: active
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

## Plan

skip: three independent wording edits applied identically to both mirrors.

## Checkpoint

- as of: 2026-10-13, branch worktree-agent-adb465176b576a39c, head b1aa551, task active
- done: record opened with baseline B1
- next: edit both `/drive` mirrors, verify AC1-AC5
