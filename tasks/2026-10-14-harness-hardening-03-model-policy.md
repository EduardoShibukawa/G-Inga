---
schema: task/1
tier: standard
status: todo
parent: 2026-10-14-harness-hardening
spec: 2026-10-14-harness-hardening@1
---

# Subagent Model Policy

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-14-harness-hardening after spec v1 approval)

## Objective

Make every subagent dispatch in `work`, `drive` and `orchestrate` name a model by role, with one escalation to Opus, and record model and token totals per child.

- In scope: the three skills' Claude Code copies and their supporting files, host-parity notes for the other copies.
- Out of scope: custom agent definitions; changing the main session model.

## Acceptance criteria

- AC1 = SC4.
- AC2 = SC5.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | 2edf21e | parent B1/B2: `mise run validate` exit 0, `mise run test` 242 pass |

## Plan

1. Add one role-to-model table where the three skills share it.
2. Set `model` on every dispatch, including `Explore` spikes.
3. Add the escalation step and the per-child cost note format (ADR 0006 vocabulary).
4. Update the parity inventory for the other host copies.
