---
schema: task/1
tier: standard
status: verified
parent: 2026-10-13-skill-health-evaluation
spec: 2026-10-13-skill-health-evaluation@1
verified_at: "f21e3d9"
---

# Skill Conformance Evaluation Cases

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-13-skill-health-evaluation after spec v1 approval)

## Objective

Author behavioral conformance cases for the three skills with deterministic graders wherever possible (spec SC1 behavioral part, SC3 case design).

- In scope: conformance cases under `evals/conformance/`, this record.
- Out of scope: editing any skill instruction file (spec SC6); changes to the approved spec or accepted ADRs.

## Acceptance criteria

- AC1 = SC1 (behavioral part): each skill has at least two behavioral cases, each stating expected outcome and grader type.
- AC2 = SC3 (design): cases cover light persists zero files under `tasks/` and `specs/`; standard yields a record the validator accepts; heavy stops for owner confirmation before creating children.
- AC3: model-graded checks are used only where no deterministic check exists and are labeled model-graded.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | c039980 | parent B1/B2: `mise run validate` exit 0, `mise run test` 227 pass |
| AC1 | each skill has at least two behavioral cases stating expected outcome and grader type | pass | f21e3d9 | 7 cases under `evals/conformance/` (work 3, drive 2, orchestrate 2); each `case.yaml` has `expected_outcome` and a description naming its grader types; `node evals/conformance/lib/selftest.mjs` exit 0 (shape and per-skill count checks); `claude plugin eval . --tag conformance --max-cost-usd 0 --ablation none` loaded and planned all 7 cases with no load error, exit 2 by design (no run started, $0.00) |
| AC2 | cases cover light zero persistence, standard record the validator accepts, heavy stop for owner confirmation | pass | f21e3d9 | `work-light-zero-persistence`, `work-standard-valid-record` (scaffold wraps the real standalone validator and logs its exit code; `lib/check-workspace.sh` re-runs it on a kept workspace), `work-heavy-stops-for-confirmation`; selftest builds every scaffold (validator exit 0 on each fixture) and replays the deterministic graders on synthetic pass and fail runs: 166 checks pass, 0 fail; live model run not run here (child 05) |
| AC3 | model-graded checks only where no deterministic check exists, and labeled | pass | f21e3d9 | 3 `llm` graders, all named `model-graded-*` (drive dependency verdict, drive empty-frontier report, orchestrate wave verdict); every other grader is `det-*`; selftest asserts the naming; labeling explained in `evals/conformance/README.md` |
| R1 | repository validation and test suites after change | pass | f21e3d9 | `mise run validate` exit 0 (Overall: pass); `mise run test` 227 pass, 0 fail |
| R2 | orchestrator gate: scope, `mise run validate`, `mise run test` on sealed commit | pass | f21e3d9 | out-of-scope files 0; Overall: pass; 227 pass, 0 fail |
| V1 | orchestrator gate review: diff confined to declared scope, AC evidence cross-checked against worker report and rerun checks | pass | f21e3d9 | full content review deferred to the parent fresh-context review |

## Outcome

Delivered seven behavioral conformance cases under `evals/conformance/` for `claude plugin eval`, with per-case scaffolds that build an isolated fixture repository at run time, a validator logging shim, a post-run validator check (`lib/check-workspace.sh`) and a model-free self-test (`lib/selftest.mjs`).

- `claude plugin eval` has no custom-code graders, so the standard case reads the real validator's exit code through the shim, and the authoritative post-run verdict uses `--keep-temp` plus `lib/check-workspace.sh`.
- No paid evaluation ran. Live results for SC3 belong to child 05.
- For child 05: a run needs `--scaffold`, `--allow-tools Write Edit Bash` and `--ablation none`. Granting Bash needs `bubblewrap` and `socat` on Linux, and `socat` is missing on this machine. `evals/results/` must stay out of Git; `.gitignore` wasn't in this ticket's scope.
