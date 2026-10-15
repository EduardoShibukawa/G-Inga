---
schema: task/1
tier: standard
status: todo
parent: 2026-10-15-prompt-audit-remediation
spec: 2026-10-15-prompt-audit-remediation@1
depends_on:
  - 2026-10-15-prompt-audit-remediation-01-procedure-contract-memory
  - 2026-10-14-harness-hardening-04-checkpoint-resume
  - 2026-10-14-harness-hardening-05-session-close-merge
---

# Orchestrate and Drive Alignment

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-15-prompt-audit-remediation after spec v1 approval)

## Objective

Align `orchestrate` and `drive` with the `task/1` contract and the five-layer gate, drop the unmeasurable context ceiling, scope the circuit-breaker revert, and put the dispatch template in English.

- In scope: `orchestrate` (`SKILL.md`, `gate.md`, `subagent-prompt.md`, `references/ooda-cycle.md`) and `drive/SKILL.md`, both host copies; the bundle manifest.
- Out of scope: worker-reported token usage and the `drive` budget (harness-hardening, cost per child).

## Acceptance criteria

- AC1 = SC1.
- AC2 = SC2.
- AC3 = SC5.
- AC4 = SC6.
- AC5 = SC7.
- AC6 = SC9.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | 48e1949 | parent B1/B2; rerun at start, since children 04 and 05 of harness-hardening land first |

## Plan

1. Replace ticket states and `map.md` with `task/1` states and `tasks/` (SC1).
2. Align `ooda-cycle.md` to the five gate layers (SC2).
3. Remove the context ceiling and its gate row (SC5); scope the revert (SC7); drop `run_in_background` (SC9).
4. Translate the dispatch template (SC6).
5. Regenerate the manifest; run validate and test.
