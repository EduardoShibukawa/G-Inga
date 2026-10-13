---
schema: task/1
tier: standard
status: verified
parent: 2026-10-13-skill-health-evaluation
spec: 2026-10-13-skill-health-evaluation@1
verified_at: "f21e3d9"
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
| AC1 | case inventory in `evals/triggers/` against SC1 trigger part | pass | f21e3d9 | 10 cases; per skill (work, drive, orchestrate) ≥1 should-fire, ≥1 should-not-fire, ≥1 near-miss; each `case.yaml` states category, `expected_outcome` and grader type (deterministic `tool_used`/`regex`, model-graded `llm`); summary table in `evals/triggers/README.md` |
| AC2 | `claude plugin eval . --tag trigger --ablation none --no-scaffold --max-cost-usd 0 --no-publish` (zero ceiling: loads and validates every case, skips every run) | pass | f21e3d9 | Claude Code 2.1.296: 0 load errors, 0 agent runs, $0.00, exit 2 (ceiling hit, expected); a deliberately invalid probe case in a scratch copy was reported as `invalid case.yaml`, so loading does validate |
| AC3 | `work-registration-precedence` design review | pass | f21e3d9 | scaffold stages project `work` beside plugin `g-inga:work`; with-only `tool_used` indicators `invoked-plugin-registration` / `invoked-project-registration` record the invoked registration per run; needs `--scaffold` at run time, live result belongs to child 05 |
| R1 | `mise run validate` and `mise run test` | pass | f21e3d9 | both exit 0 |
| V1 | diff read against AC1–AC3, grader honesty (no llm grader labelled deterministic, must-not-fire graders scored with `arm: both`) | pass | f21e3d9 | |
| R2 | orchestrator gate: scope, `mise run validate`, `mise run test` on sealed commit | pass | f21e3d9 | out-of-scope files 0; Overall: pass; 227 pass, 0 fail |

## Outcome

Delivered 10 synthetic trigger cases under `evals/triggers/` (3 per skill plus the SC2 registration case) and a README with the case table, grader types, run command and the free zero-ceiling structural check. No live run was made: the trigger accuracy and the registration result (SC2) come from the baseline run in child 05, which must pass `--scaffold` for the registration case.

Follow-ups for child 05:

- The `input_match` regexes assume the `Skill` tool input is serialized as JSON (`"skill":"g-inga:work"`). The first run should confirm this from the trace.
- The scaffold assumes that skills under the sandbox cwd `.claude/skills/` load as project skills in eval runs. If the with-plugin arm never shows `invoked-project-registration`, check this before reading it as precedence.
