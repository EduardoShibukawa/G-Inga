---
schema: task/1
tier: standard
status: active
---

# Prepare the Skill Health Trigger Cases for Phase 2

## Routing and approvals

- tier: standard (S1, S3, S4 hold: edits confined to three trigger cases under `evals/triggers/`; `light` is excluded because S7 is weak: only a paid run exercises the changed budgets and rubrics, and this task allows zero-cost structural validation only)
- approved: owner request (2026-10-13, `/drive --limit 4` backlog item d "skill-health-phase2-prep"; no paid runs)

## Objective

Unpaid prep for phase 2 of the skill health epic (`tasks/2026-10-13-skill-health-evaluation.md` next steps): keep the project `work` skill out of the no-plugin arm of `work-registration-precedence`, and revisit `max_turns` and the rubric of `drive-near-miss-single-task` and `drive-should-fire-backlog-drain`, which hit the turn limit in the phase 1 baseline.

- In scope:
  - `evals/triggers/work-registration-precedence/case.yaml`, `evals/triggers/work-registration-precedence/scaffold.sh`
  - `evals/triggers/drive-near-miss-single-task/case.yaml`
  - `evals/triggers/drive-should-fire-backlog-drain/case.yaml`
  - `tasks/2026-10-13-skill-health-phase2-prep.md`
- Out of scope:
  - Any paid `claude plugin eval` or `mise run eval:skills` run.
  - `mise.toml` and the `eval:skills` wiring (suite split, budget).
  - Allowing `git` inside the eval sandbox.

## Acceptance criteria

- AC1: Under `--ablation with-without`, the no-plugin arm of `work-registration-precedence` doesn't contain the project `work` skill.
- AC2: The two drive cases get turn budgets that fit a Skill call plus the scan and report seen in phase 1, and rubrics that grade scope rather than results the sandbox can't produce.
- AC3: `claude plugin eval . --max-cost-usd 0` loads every case with no load errors at $0.00.
- AC4: `mise run validate` passes.
- AC5: `mise run test` passes (0 fail).

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validate | pass | 43ca06a | Overall pass |
| B2 | baseline test | pass | 43ca06a | 240 pass, 0 fail |

## Plan

skip: three case edits; the acceptance criteria are the plan.
