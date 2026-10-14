---
schema: task/1
tier: standard
status: completed
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
| AC1 | no project `work` in the no-plugin arm | blocked | 6fb9cd0 | not achievable in the scaffold: CLI 2.1.296 runs `scaffold_script` once per run, before either arm, with a fixed env (PATH, HOME, TMP*, TERM, GIT_CONFIG_NOSYSTEM, USER_TYPE, NODE_ENV) and no arm signal. The limitation is now documented in `case.yaml` and `scaffold.sh`; the fix needs an owner decision (see Blockers) |
| AC2 | drive case budgets and rubrics | pass | 6fb9cd0 | `drive-near-miss-single-task` max_turns 3 → 6, timeout 180 → 240 s, rubric accepts locating/reporting a missing README or edit tool; `drive-should-fire-backlog-drain` max_turns 4 → 8, timeout 240 → 300 s, rubric accepts a dry-run plan over an empty backlog. Not exercised by a paid run |
| AC3 | zero-cost structural check | pass | 6fb9cd0 | `claude plugin eval . --ablation none --no-scaffold --max-cost-usd 0 --no-publish` (and `--tag trigger`): no `✗` load errors, "0 case(s) · $0.00", exit 2 from the ceiling as documented |
| AC4 | validate | pass | 6fb9cd0 | Overall pass |
| AC5 | test | pass | 6fb9cd0 | 240 pass, 0 fail |
| V1 | diff read against AC1-AC5 and the out-of-scope list | pass | 6fb9cd0 | 5 files; no change to `mise.toml`; no paid run |

## Plan

skip: three case edits; the acceptance criteria are the plan.

## Blockers

- AC1 needs an owner decision, because the scaffold can't see the arm. Options: (a) retag `work-registration-precedence` out of `trigger` and run it in its own `--ablation none --scaffold` invocation, wiring a third suite and its budget share into `mise run eval:skills`; (b) drop its routing-line grader from the ablation score (with-only) and accept that the no-plugin arm still has project `work`; (c) keep it as it is, documented.

## Outcome

The two drive trigger cases now have the turn budget and rubric phase 1 showed they need. The registration case documents that its no-plugin arm also holds the project `work` skill and must not be read as an ablation delta. Structural load at $0 is clean. AC1 is blocked on the owner decision above, so the task stays `completed`.

## Checkpoint

- as of: 2026-10-13, branch work/skill-health-phase2-prep, head 6fb9cd0 plus the commit recording this status, worktree clean after it, task completed (AC1 blocked); next: owner picks an AC1 option, then a fresh `/work` resume
