---
schema: task/1
tier: standard
status: todo
parent: 2026-10-16-usage-telemetry-pipeline
spec: 2026-10-16-usage-telemetry-pipeline@1
depends_on:
  - 2026-10-16-usage-telemetry-pipeline-02-multi-host-ingestion
---

# Aggregator and ledger persistence

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-16-usage-telemetry-pipeline)

## Objective

Implement child 03 of the continuous usage telemetry pipeline:

1. Build `tools/eval/aggregate_usage.ts` consolidating telemetry metrics by run, task, and epic into Markdown summary tables and structured JSON (SC3).
2. Establish `records/usage-ledger.tsv` format and update mechanism tracking usage runs alongside ADR 0006 fields.
3. Configure `.gitignore` to keep raw JSONL trace logs uncommitted while tracking summary and ledger artifacts (SC6).

In scope:

- Aggregator script `tools/eval/aggregate_usage.ts`.
- Markdown template and JSON summary output (`records/usage-summary.md`).
- Ledger schema and record tracking in `records/usage-ledger.tsv`.
- `.gitignore` update for `records/usage/`.
- Unit tests in `tools/eval/aggregate_usage.test.ts`.

Out of scope:

- Multi-host ingestion CLI (child 02).
- A/B benchmark runner (child 04).

## Acceptance criteria

1. AC1: `tools/eval/aggregate_usage.ts` aggregates JSONL runs by run, task, and epic, computing total tokens, cache hit ratio, cost estimate, and duration.
2. AC2: Aggregator outputs formatted Markdown comparison tables to `records/usage-summary.md` and writes/prints structured JSON.
3. AC3: `records/usage-ledger.tsv` tracks runs with columns matching ADR 0006 + `condition` and `quality_score`.
4. AC4: `.gitignore` ignores raw run logs under `records/usage/` while keeping fixtures and committed ledger/summaries.
5. AC5: Unit tests in `tools/eval/aggregate_usage.test.ts` pass, and `bun run validate` passes.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | evaluation test suite before change | pass | e1b407a | `bun test tools/eval` |
| AC1 | aggregate_usage calculates sums and cache ratios | not run | - | verify math and groupings |
| AC2 | records/usage-summary.md produced with clean tables | not run | - | verify markdown generation |
| AC3 | records/usage-ledger.tsv structured correctly | not run | - | verify TSV columns |
| AC4 | git status confirms raw traces ignored | not run | - | verify gitignore behavior |
| AC5 | eval tests and repository validation green | not run | - | bun test tools/eval && bun run validate |
| R1 | regression check on verified_at | not run | - | on verified_at |
| V1 | diff read against AC1–AC5 | not run | - | on verified_at |

## Plan

1. Implement `tools/eval/aggregate_usage.ts` with grouping and table formatting logic.
2. Define `records/usage-ledger.tsv` schema and persistence function.
3. Update `.gitignore` for `records/usage/*.jsonl`.
4. Write test suite `tools/eval/aggregate_usage.test.ts`.
5. Validate and verify.

## Outcome

Pending execution.

## Checkpoint

- as of: 2026-10-16, branch `work/usage-telemetry-pipeline`, worktree clean
- done: child 03 planned
- active: awaiting execution
- blocked: depends on child 02
- next: execute child 03
- revalidate: none
