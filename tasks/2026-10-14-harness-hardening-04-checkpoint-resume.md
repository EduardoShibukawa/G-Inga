---
schema: task/1
tier: standard
status: todo
parent: 2026-10-14-harness-hardening
spec: 2026-10-14-harness-hardening@1
depends_on:
  - 2026-10-14-harness-hardening-03-model-policy
---

# Checkpoint and Resume in Drive and Orchestrate

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-14-harness-hardening after spec v1 approval)

## Objective

After each verified child, `drive` and `orchestrate` update the parent checkpoint with a resume prompt; on start they reconcile the checkpoint with Git and stop on a mismatch.

- In scope: `drive` and `orchestrate` procedures, `work`'s resume reference where shared, a table-top walk.
- Out of scope: an unattended headless driver.

## Acceptance criteria

- AC1 = SC6.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | 2edf21e | parent B1/B2: `mise run validate` exit 0, `mise run test` 242 pass |

## Plan

1. Write the per-child checkpoint step and the resume prompt template.
2. Write the start-time reconciliation and its stop condition.
3. Table-top walk: cut-off after child N resumes at N+1; mismatch stops dispatch.
