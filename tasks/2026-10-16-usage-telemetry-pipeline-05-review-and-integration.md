---
schema: task/1
tier: standard
status: completed
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
| B1 | evaluation test suite before change | pass | 2a71a04 | `bun test tools/eval` (104/104 pass) |
| AC1 | eval:usage executes and updates summary | pass | - | real session trace ingested and summarized in `records/usage-summary.md` |
| AC2 | eval:ab records real run into usage-ledger.tsv | pass | - | benchmark runs committed in `records/usage-ledger.tsv` without contamination |
| AC3 | repository validation and test suites pass | pass | - | `bun test tools/eval` (104/104), `bun run test` (332/332), `bun run validate` clean |
| AC4 | spec SC1–SC10 compliance reviewed | pass | - | fresh-context review against SC1–SC10 confirms all criteria met |
| R1 | integrated regression check on verified_at | pass | - | full evaluation and repo test suite passes cleanly |
| V1 | diff read against AC1–AC4 | pass | - | verified end-to-end telemetry pipeline |

## Plan

1. Run `mise run eval:usage` on sample input and inspect summary.
2. Run `mise run eval:ab` on reference scenario and record evidence in `records/usage-ledger.tsv`.
3. Execute full repository validation and test suite.
4. Perform spec compliance review and record resolution.

## Outcome

Successfully executed and completed child 05 of the continuous usage telemetry pipeline:

- Ingested live session transcript via `bun tools/eval/run_usage.ts` into git-ignored `records/usage/session-trace.jsonl` (120,658 tokens, 87.2% cache hit ratio, duration 214s).
- Ran `bun tools/eval/ab_runner.ts --iterations 1` executing live A/B benchmarking under isolated ephemeral worktree with automated contamination guardrail.
- Added idempotence/deduplication by `run_id` to `appendLedger` in `tools/eval/aggregate_usage.ts` so repeated aggregation runs do not duplicate ledger rows.
- Committed operational evidence in `records/usage-ledger.tsv` adhering strictly to the 18-column ADR 0006 schema.
- Generated consolidated Markdown comparison report in `records/usage-summary.md`.
- Completed fresh-context review against spec `specs/2026-10-16-usage-telemetry-pipeline.md@1` verifying all 10 success criteria (SC1–SC10) are fulfilled without regressions.
- Validation: `bun test tools/eval` (104/104 pass), `bun run test` (332/332 pass), and repository validation (`bun run validate`) pass with zero errors.

## Checkpoint

- as of: 2026-10-16, branch `work/usage-telemetry-pipeline`
- done: child 05 executed, live run evidence committed in ledger and summary, spec review completed
- active: completed, awaiting gate verification
- blocked: none
- next: orchestrator /drive gate verification and final epic closure
- revalidate: none
