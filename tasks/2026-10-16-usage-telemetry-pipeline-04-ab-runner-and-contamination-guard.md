---
schema: task/1
tier: standard
status: verified
parent: 2026-10-16-usage-telemetry-pipeline
spec: 2026-10-16-usage-telemetry-pipeline@1
depends_on:
  - 2026-10-16-usage-telemetry-pipeline-03-aggregator-and-ledger
verified_at: "a16a52e"
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
| B1 | evaluation test suite before change | pass | a9acefe | `bun test tools/eval` (85/85 pass) |
| AC1 | ab_runner executes iterations with config | pass | a16a52e | `ab_runner.ts` supports `--task-id`, `--task-file`, `--iterations`, `--host`, `--dry-run`, `--max-cost-usd` |
| AC2 | contamination guard asserts skill absence | pass | a16a52e | `assertNoContamination` & `stripSkills` guard `.claude/skills` and `.agents/skills` |
| AC3 | quality_score computed deterministically | pass | a16a52e | `calculateQualityScore` derives [0.0, 1.0] and appends to TSV ledger |
| AC4 | mise eval:usage and eval:ab tasks operational | pass | a16a52e | `mise run eval:usage` and `mise run eval:ab` registered and operational |
| AC5 | eval tests and repository validation green | pass | a16a52e | 104/104 eval tests pass; `bun run validate` and `bun run test` pass |
| R1 | regression check on verified_at | pass | a16a52e | full repository validation and test suite green |
| V1 | diff read against AC1–AC5 | pass | a16a52e | diff reviewed against spec SC4, SC5, SC9 |

## Plan

1. Implement `tools/eval/ab_runner.ts` with iteration harness and worktree isolation.
2. Add contamination check asserting `.claude/skills/` and `.agents/skills/` absence.
3. Add deterministic test/AC execution to compute `quality_score`.
4. Add mise tasks in `mise.toml`.
5. Write unit test suite `tools/eval/ab_runner.test.ts`.
6. Validate and verify.

## Outcome

Implemented child 04 of continuous usage telemetry pipeline:

- `tools/eval/ab_runner.ts`: A/B benchmark iteration harness executing across `with` and `without` conditions, with host disable flags (`--disable-slash-commands`, `--disable-custom-skills`, `--no-skills`) and cost ceiling enforcement (`--max-cost-usd`).
- Contamination guard: exported `assertNoContamination`, `checkScaffoldContamination`, `stripSkills`, and `prepareIsolatedWorktree` guaranteeing zero harness skill leakage in the baseline arm.
- Deterministic quality score: `calculateQualityScore` evaluates test and build outcomes into proportional score [0.0, 1.0].
- Formats Markdown summary (`records/usage-summary.md`) and appends normalized rows adhering strictly to the 18-column TSV schema (`records/usage-ledger.tsv`).
- `mise.toml`: added `eval:usage` and `eval:ab` tasks respecting `SHE_BUDGET_USD` default ceiling ($5.00).
- `tools/eval/ab_runner.test.ts`: 19/19 tests pass; 104/104 eval suite tests pass; repository validation passes.

## Checkpoint

- as of: 2026-10-16, branch `work/usage-telemetry-pipeline`, HEAD a16a52e
- done: child 04 verified at a16a52e
- active: child 05 unblocked
- blocked: none
- next: execute child 05 (review and integration)
- revalidate: none
