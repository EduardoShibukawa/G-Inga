---
schema: task/1
tier: standard
status: completed
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
| AC1 | aggregate_usage calculates sums and cache ratios | pass | tools/eval/aggregate_usage.ts | verify math and groupings |
| AC2 | records/usage-summary.md produced with clean tables | pass | tools/eval/aggregate_usage.ts | verify markdown generation |
| AC3 | records/usage-ledger.tsv structured correctly | pass | records/usage-ledger.tsv | verify TSV columns |
| AC4 | git status confirms raw traces ignored | pass | .gitignore | verify gitignore behavior |
| AC5 | eval tests and repository validation green | pass | tools/eval/aggregate_usage.test.ts | bun test tools/eval (85 pass) && bun run validate pass |
| R1 | regression check on verified_at | not run | - | on verified_at |
| V1 | diff read against AC1–AC5 | pass | - | changes verified against AC1–AC5 |

## Plan

1. Implement `tools/eval/aggregate_usage.ts` with grouping and table formatting logic.
2. Define `records/usage-ledger.tsv` schema and persistence function.
3. Update `.gitignore` for `records/usage/*.jsonl`.
4. Write test suite `tools/eval/aggregate_usage.test.ts`.
5. Validate and verify.

## Outcome

Delivered child 03 aggregator and ledger persistence:

- Implemented `tools/eval/aggregate_usage.ts`:
  - Multi-host aggregation engine grouping observations by `epic_id`, `task_id`, `run_id`, `host`, and `condition` (`with` vs `without`).
  - Computes total tokens, cache hit ratio (`cache_read / (input + cache_read)`), cost estimates, and wall duration.
  - Generates comprehensive Markdown summary tables (`records/usage-summary.md` or `--out`) comparing conditions, task breakdowns, host distributions, and individual run details.
  - Emits structured JSON summary metrics when `--json [path]` is specified.
  - Appends normalized run records to TSV ledger when `--ledger [path]` is specified.
- Initialized `records/usage-ledger.tsv`:
  - Created tab-separated ledger tracking 18 columns matching ADR 0006 honest reporting taxonomy (`observed`, `estimated`, `derived`, `absent`, `unsupported`) plus `condition` and `quality_score`.
- Updated `.gitignore`:
  - Added ignore rules for `records/usage/*.jsonl` and `records/usage/**/*.jsonl` while ensuring `records/usage-summary.md` and `records/usage-ledger.tsv` are tracked.
- Authored test suite `tools/eval/aggregate_usage.test.ts`:
  - 12 comprehensive unit tests covering cache hit ratio math, multi-turn accumulation, A/B delta savings, markdown formatting, JSON structure, 18-column TSV ledger alignment, and git-ignore behavior.
- Verified test suite (`bun test tools/eval` 85 pass) and repository validation (`bun run validate` pass).

## Checkpoint

- as of: 2026-10-16, branch `work/usage-telemetry-pipeline`, HEAD fd5e345
- done: child 03 implemented, tested, and verified locally (AC1–AC5 pass)
- active: completed, awaiting parent commit and verified_at transition
- blocked: none
- next: commit child 03 changes, transition to verified_at, and proceed to child 04 (A/B benchmark runner)
- revalidate: none
