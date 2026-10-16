---
schema: task/1
tier: standard
status: todo
parent: 2026-10-16-usage-telemetry-pipeline
spec: 2026-10-16-usage-telemetry-pipeline@1
depends_on:
  - 2026-10-16-usage-telemetry-pipeline-04-ab-runner-and-contamination-guard
---

# End-to-end integration, live run evidence, and review

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-16-usage-telemetry-pipeline)

## Objective

Implement child 05 of the continuous usage telemetry pipeline:

1. Execute live runs of `mise run eval:usage` and `mise run eval:ab` to commit real operational evidence into `records/usage-ledger.tsv` and `records/usage-summary.md` (SC10).
2. Ensure repository validation and full test suites pass cleanly (`bun test tools/eval`, `mise run test`, `mise run validate`).
3. Conduct fresh-context review against spec SC1–SC10 and resolve any findings.

In scope:

- End-to-end execution of `eval:usage` and `eval:ab`.
- Verification of committed evidence in ledger.
- Full gate validation and regression suite.
- Spec compliance review.

Out of scope:

- Refactoring unrelated harnesses.

## Acceptance criteria

1. AC1: `mise run eval:usage` generates a normalized `.jsonl` record and updates `records/usage-summary.md`.
2. AC2: `mise run eval:ab` executes without contamination, recording at least 1 real run in `records/usage-ledger.tsv`.
3. AC3: All unit tests in `tools/eval/` pass, and repository validation (`mise run validate`, `mise run test`) passes cleanly.
4. AC4: Fresh-context review against spec SC1–SC10 confirms all criteria delivered with zero regressions.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | evaluation test suite before change | pass | e1b407a | `bun test tools/eval` |
| AC1 | eval:usage executes and updates summary | not run | - | verify output files |
| AC2 | eval:ab records real run into usage-ledger.tsv | not run | - | verify committed evidence row |
| AC3 | repository validation and test suites pass | not run | - | mise run validate && mise run test |
| AC4 | spec SC1–SC10 compliance reviewed | not run | - | review against spec criteria |
| R1 | integrated regression check on verified_at | not run | - | on verified_at |
| V1 | diff read against AC1–AC4 | not run | - | on verified_at |

## Plan

1. Run `mise run eval:usage` on sample input and inspect summary.
2. Run `mise run eval:ab` on reference scenario and record evidence in `records/usage-ledger.tsv`.
3. Execute full repository validation and test suite.
4. Perform spec compliance review and record resolution.

## Outcome

Pending execution.

## Checkpoint

- as of: 2026-10-16, branch `work/usage-telemetry-pipeline`, worktree clean
- done: child 05 planned
- active: awaiting execution
- blocked: depends on child 04
- next: execute child 05
- revalidate: none
