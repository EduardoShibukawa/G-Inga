---
schema: task/1
tier: standard
status: todo
parent: 2026-10-13-skill-health-evaluation
spec: 2026-10-13-skill-health-evaluation@1
---

# Skill Trigger Evaluation Cases

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-13-skill-health-evaluation after spec v1 approval)

## Objective

Author trigger evaluation cases for `work`, `drive` and `orchestrate` on Claude Code, including the duplicate-registration measurement (spec SC1 trigger part, SC2 case design).

- In scope: trigger cases under `evals/triggers/`, this record.
- Out of scope: editing any skill instruction file (spec SC6); changes to the approved spec or accepted ADRs.

## Acceptance criteria

- AC1 = SC1 (trigger part): each skill has at least one should-fire, one should-not-fire and one near-miss case, each stating expected outcome and grader type.
- AC2: cases are structurally accepted by `claude plugin eval` without a paid run (or the record states why that can't be checked for free).
- AC3: at least one case records which registration (project skill or plugin skill) is invoked when both exist (SC2).

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | c039980 | parent B1/B2: `mise run validate` exit 0, `mise run test` 227 pass |
