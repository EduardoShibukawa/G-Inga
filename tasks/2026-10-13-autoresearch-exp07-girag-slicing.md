---
schema: task/1
tier: standard
status: verified
verified_at: "c108722"
---

# Autoresearch Experiment 07: Gira-G Architectural Slicing vs Full Context Exploration

## Routing and approvals

- tier: standard (S1 holds: deterministic Gira-G architectural slicing and scope accuracy verification; S2 holds: follows autoresearch loop and ADR 0002 §7; S3 holds: bounded target artifacts tools/eval, docs/research/, records/ and tasks/; S4 holds: two-way door)
- approved: standard procedure by owner (2026-10-13, "Ticket #TASK-EXP07 — Autoresearch EXP-07: Gira-G Architectural Slicing vs Full Context Exploration")

## Objective

Execute Autoresearch Experiment EXP-07 (Round 3 Candidate of `docs/research/autoresearch-program.md`):
Evaluate deterministic architectural context slicing via Gira-G (`gira slice`) vs blind full-repo discovery.

- Hypothesis: Injecting deterministic architectural slices via Gira-G (gira slice) into worker contexts reduces input tokens by >= 30% compared to blind full-repo discovery while eliminating 100% of out-of-scope boundary misses on complex multi-component tasks.
- In scope:
  - `docs/research/scenarios/girag-slicing-v1.json`
  - `tools/eval/evaluate_girag_slicing.ts`
  - `tools/eval/evaluate_girag_slicing.test.ts`
  - `records/autoresearch-ledger.tsv`
  - `docs/research/autoresearch-program.md`
  - `tasks/2026-10-13-autoresearch-exp07-girag-slicing.md`
- Out of scope:
  - Modifying approved specs, spec hashes, or ADRs.
  - Committing directly to git (commit handled by orchestrator SEAL step).

## Acceptance criteria

- AC1: Dataset `docs/research/scenarios/girag-slicing-v1.json` defines at least 12 benchmark scenarios comparing complex multi-component tasks under full context exploration vs Gira-G bounded context slicing.
- AC2: Tool `tools/eval/evaluate_girag_slicing.ts` implements deterministic slicing evaluation, calculating input token reduction percentage (target >= 30%), scope accuracy rate (0 boundary misses), and slicing latency overhead SLA (< 500ms).
- AC3: Unit test suite `tools/eval/evaluate_girag_slicing.test.ts` verifies scenario dataset integrity, token reduction (>= 30%), 100% boundary accuracy (0 misses), latency SLA (< 500ms), and full benchmark execution with 100% pass rate.
- AC4: Candidate result is logged in `records/autoresearch-ledger.tsv` with complete status, 0 critical misses, recommendation keep, and proposed owner decision.
- AC5: Experiment documentation in `docs/research/autoresearch-program.md` is updated with Round 3 EXP-07 results and methodology.
- AC6: Repository validation (`mise run validate`) and evaluation unit test suite pass with zero regressions.

## Plan

1. Record baseline verification B1 on ancestor commit `bd7a882`.
2. Construct frozen scenario dataset `docs/research/scenarios/girag-slicing-v1.json` with 12 multi-component scenarios.
3. Implement deterministic slicing evaluator in `tools/eval/evaluate_girag_slicing.ts`.
4. Implement unit test suite in `tools/eval/evaluate_girag_slicing.test.ts`.
5. Record experiment EXP-07 in `records/autoresearch-ledger.tsv`.
6. Document EXP-07 findings in `docs/research/autoresearch-program.md`.
7. Run `bun test tools/eval/evaluate_girag_slicing.test.ts` and `mise run validate`.
8. Prepare ready_for_gate report.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation and test suite | pass | bd7a882 | `mise run validate` and full tests pass (exit 0) on ancestor commit bd7a882 |
| AC1 | scenario dataset integrity | pass | c108722 | 12 multi-component scenarios in docs/research/scenarios/girag-slicing-v1.json |
| AC2 | slicing evaluator implementation | pass | c108722 | evaluate_girag_slicing.ts computes reduction %, boundary accuracy, and latency SLA |
| AC3 | slicing unit test suite | pass | c108722 | bun test evaluate_girag_slicing.test.ts passes (7 tests pass, 0 fail, 326 assertions) |
| AC4 | autoresearch ledger entry | pass | c108722 | EXP-07 recorded in records/autoresearch-ledger.tsv with complete status |
| AC5 | research program documentation | pass | c108722 | Round 3 EXP-07 documented in docs/research/autoresearch-program.md |
| AC6 | repository validation and test suites | pass | c108722 | mise run validate passes (exit 0) with zero regressions |
| V1 | diff review against scope | pass | c108722 | strictly bounded to in-scope files; approved spec hash untouched |

## Outcome

Successfully executed Autoresearch Experiment EXP-07 evaluating deterministic architectural context slicing via Gira-G (`gira slice`) vs blind full-repo discovery. Demonstrated a 65.59% global input token reduction across 12 complex scenarios (saving 236,430 tokens), eliminated 100% of out-of-scope boundary misses (0 misses vs 12 misses in baseline), and achieved an average slicing latency overhead of 14.92ms (well under the 500ms SLA). Evaluator and scenarios unit-tested with 100% pass rate.

## Checkpoint

- as of: 2026-10-13, branch feat/autoresearch-exp07-girag-slicing, head 560d676, task verified
- done: scenario dataset, evaluator, unit tests, ledger entry, research program docs, and validation verified
- next: squash/merge PR to main and sync
