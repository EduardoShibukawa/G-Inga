---
schema: task/1
tier: standard
status: todo
parent: 2026-10-14-harness-hardening
spec: 2026-10-14-harness-hardening@1
depends_on:
  - 2026-10-14-harness-hardening-04-checkpoint-resume
---

# Session Close Report and Merge Rule

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-14-harness-hardening after spec v1 approval)

## Objective

Every delivering session ends with a remote-state report, and the agent merges only after required checks pass, then verifies `origin/main` contains the merge.

- In scope: handoff and merge steps in `work`, `drive` and `orchestrate`.
- Out of scope: enabling branch protection (owner action).

## Acceptance criteria

- AC1 = SC7.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | 2edf21e | parent B1/B2: `mise run validate` exit 0, `mise run test` 242 pass |

## Plan

1. Add the handoff report steps (fetch, `origin/main`, local-only, worktrees).
2. Add the merge rule: required checks green, no `--admin`, post-merge verification.
