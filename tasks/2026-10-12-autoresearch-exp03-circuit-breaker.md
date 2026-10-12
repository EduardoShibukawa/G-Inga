---
schema: task/1
tier: standard
status: verified
verified_at: "f66db94"
---

# Autoresearch Experiment 03: Circuit-Breaker Recovery Policy Evaluation

## Routing and approvals

- tier: standard (S1 holds: testable recovery policy and circuit-breaker criteria; S2 holds: follows autoresearch loop and ADR 0002 §7; S3 holds: bounded target artifacts tools/eval, docs/research/scenarios, records/ and tasks/; S4 holds: two-way door)
- approved: standard procedure by owner (2026-10-12, "Ticket #TASK-A — Autoresearch EXP-03 (Circuit-Breaker Recovery Policy)")

## Objective

Execute Autoresearch Experiment EXP-03 (Candidate 3 of `docs/research/autoresearch-program.md` §8):
Compare current recovery instruction against a deterministic "two failures without new information -> re-plan" rule.

- Hypothesis: Halting repeated attempts after two failures without new diagnostic information eliminates 100% of repeated unproductive retries while preserving 100% verified success and maintaining 0 premature stops when useful progress is demonstrated.
- In scope:
  - `docs/research/scenarios/circuit-breaker-v1.json`
  - `tools/eval/evaluate_circuit_breaker.ts`
  - `tools/eval/evaluate_circuit_breaker.test.ts`
  - `records/autoresearch-ledger.tsv`
  - `tasks/2026-10-12-autoresearch-exp03-circuit-breaker.md`
- Out of scope:
  - Modifying approved specs, spec hashes, or ADRs.
  - Modifying router prompts or files outside the declared scope.

## Acceptance criteria

- AC1: Dataset `docs/research/scenarios/circuit-breaker-v1.json` defines 12 scenarios covering transient failures (resolved on 2nd attempt), stagnant failures (interrupted on 2nd error for re-plan), and progressive failures (useful progress demonstrated).
- AC2: Tool `tools/eval/evaluate_circuit_breaker.ts` implements deterministic simulation and evaluation of candidate circuit breaker policy vs baseline naive recovery, reporting compliance rate, verified successes, circuit breaker trips, unproductive retries, premature stops, and critical misses.
- AC3: Unit test suite `tools/eval/evaluate_circuit_breaker.test.ts` verifies transient resolution, circuit breaker trip on 2nd uninformative failure, progressive proceeding, critical miss detection on premature stop, baseline retry accumulation, and dataset evaluation with 100% pass rate.
- AC4: Candidate result is logged in `records/autoresearch-ledger.tsv` with complete status, 0 critical misses, 100% unproductive retries eliminated, and proposed owner decision.
- AC5: Repository validation (`mise run validate`) and full test suite (`mise run test`) pass with zero regressions.

## Plan

1. Record baseline verification B1 on ancestor commit `4a13a82`.
2. Construct frozen scenario dataset `docs/research/scenarios/circuit-breaker-v1.json` covering transient, stagnant, and progressive recovery.
3. Implement deterministic circuit breaker evaluation script in `tools/eval/evaluate_circuit_breaker.ts`.
4. Implement unit tests in `tools/eval/evaluate_circuit_breaker.test.ts` covering guardrails and policy mechanics.
5. Record experiment EXP-03 in `records/autoresearch-ledger.tsv`.
6. Run `mise exec -- bun test tools/eval/evaluate_circuit_breaker.test.ts` and repository validation.
7. Record checkpoint and outcome.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation and test suite | pass | 4a13a82 | `mise run validate` (exit 0) & `mise run test` (144 pass) |
| AC1 | circuit breaker scenario dataset | pass | f66db94 | 12 scenarios covering transient, stagnant, and progressive recovery |
| AC2 | deterministic evaluation implementation | pass | f66db94 | evaluate_circuit_breaker.ts implements candidate vs baseline evaluation |
| AC3 | circuit breaker unit test suite | pass | f66db94 | bun test evaluate_circuit_breaker.test.ts passes (11 tests pass, 0 fail) |
| AC4 | autoresearch ledger entry | pass | f66db94 | EXP-03 logged in records/autoresearch-ledger.tsv with complete status |
| AC5 | repository validation and test suites | pass | f66db94 | mise run validate passes and full test suite passes with 0 failures |
| V1 | diff review against V1 governance | pass | f66db94 | strictly bounded to in-scope files; approved spec hash untouched |

## Outcome

Autoresearch Experiment EXP-03 completed and verified. Evaluated the "two failures without new information -> re-plan" circuit-breaker recovery policy across 12 SDLC recovery scenarios. The candidate policy eliminated 100% of repeated unproductive retries (5 -> 0) while strictly observing the safety guardrail (0 premature stops when useful progress is demonstrated, 0 critical misses) and preserving 100% verified success on transient and progressive recoveries.

## Checkpoint

- as of: 2026-10-12, branch feat/ooda-pipeline-advancement, head 9204e37, task verified
- done: scenario dataset, evaluator, test suite, ledger entry, and canonical task record completed and verified
- next: report ready_for_gate to parent orchestrator
