---
schema: task/1
tier: standard
status: todo
parent: 2026-10-16-usage-telemetry-pipeline
spec: 2026-10-16-usage-telemetry-pipeline@1
depends_on:
  - 2026-10-16-usage-telemetry-pipeline-03-aggregator-and-ledger
---

# A/B benchmark runner and contamination guard

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-16-usage-telemetry-pipeline)

## Objective

Implement child 04 of the continuous usage telemetry pipeline:

1. Build `tools/eval/ab_runner.ts` executing N=3 comparisons between `with` vs `without` G-Ingá on designated tasks (SC4).
2. Guard against scaffold contamination: isolate the `without` arm in an ephemeral worktree without harness skills, pass host disable flags, and assert zero skill presence before invocation (SC4).
3. Compute a deterministic `quality_score` and record runs into the usage ledger (SC5).
4. Configure mise tasks `eval:usage` and `eval:ab` bounded by `SHE_BUDGET_USD=5.00` (SC9).

In scope:

- A/B benchmark runner `tools/eval/ab_runner.ts`.
- Worktree isolation helper and pre-dispatch contamination assertion.
- Deterministic quality score evaluation.
- `mise.toml` task definitions for `eval:usage` and `eval:ab`.
- Unit tests in `tools/eval/ab_runner.test.ts`.

Out of scope:

- Multi-host ingestion CLI (child 02).
- Aggregator and ledger baseline (child 03).
- Final end-to-end integration and review (child 05).

## Acceptance criteria

1. AC1: `tools/eval/ab_runner.ts` executes N iterations (default N=3) across `with` and `without` conditions for a specified `--task-id` or `--task-file` (defaulting to a reference scenario).
2. AC2: The `without` arm executes in an isolated temporary worktree/directory without `.claude/skills/` and `.agents/skills/`, with an automated pre-flight assertion verifying skill absence.
3. AC3: Runner derives a deterministic `quality_score` (1.0 for all tests/ACs passing, proportional for partial, 0.0 for failure) and appends runs to `records/usage-ledger.tsv`.
4. AC4: Mise tasks `eval:usage` and `eval:ab` are registered in `mise.toml` respecting `SHE_BUDGET_USD` default ceiling.
5. AC5: Unit tests in `tools/eval/ab_runner.test.ts` pass, and `bun run validate` passes.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | evaluation test suite before change | pass | e1b407a | `bun test tools/eval` |
| AC1 | ab_runner executes iterations with config | not run | - | verify runner flags and execution |
| AC2 | contamination guard asserts skill absence | not run | - | verify isolated worktree behavior |
| AC3 | quality_score computed deterministically | not run | - | verify repo test/AC validation logic |
| AC4 | mise eval:usage and eval:ab tasks operational | not run | - | verify mise task execution |
| AC5 | eval tests and repository validation green | not run | - | bun test tools/eval && bun run validate |
| R1 | regression check on verified_at | not run | - | on verified_at |
| V1 | diff read against AC1–AC5 | not run | - | on verified_at |

## Plan

1. Implement `tools/eval/ab_runner.ts` with iteration harness and worktree isolation.
2. Add contamination check asserting `.claude/skills/` and `.agents/skills/` absence.
3. Add deterministic test/AC execution to compute `quality_score`.
4. Add mise tasks in `mise.toml`.
5. Write unit test suite `tools/eval/ab_runner.test.ts`.
6. Validate and verify.

## Outcome

Pending execution.

## Checkpoint

- as of: 2026-10-16, branch `work/usage-telemetry-pipeline`, worktree clean
- done: child 04 planned
- active: awaiting execution
- blocked: depends on child 03
- next: execute child 04
- revalidate: none
