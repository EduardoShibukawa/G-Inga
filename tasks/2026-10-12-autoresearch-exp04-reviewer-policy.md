---
schema: task/1
tier: standard
status: verified
verified_at: "2f62098"
---

# Autoresearch Experiment 04: Independent Reviewer Trigger Policy Evaluation

## Routing and approvals

- tier: standard (S1 holds: testable review policy and trigger criteria; S2 holds: follows autoresearch loop and ADR 0002 §7; S3 holds: bounded target artifacts tools/eval, docs/research/scenarios, records/ and tasks/; S4 holds: two-way door)
- approved: standard procedure by owner (2026-10-12, "Ticket #TASK-B — Autoresearch EXP-04 (Independent Reviewer Policy)")

## Objective

Execute Autoresearch Experiment EXP-04 (Candidate 4 of `docs/research/autoresearch-program.md` §8):
Compare a subagent reviewer trigger policy against self-review only on cases where independent review is allowed.

- Hypothesis: A calibrated subagent reviewer trigger policy combined with a deterministic verification audit gate catches 100% of high-risk defects and eliminates false agreement while avoiding 100% of unnecessary review overhead on simple tasks, reducing rework to zero.
- In scope:
  - `docs/research/scenarios/reviewer-trigger-v1.json`
  - `tools/eval/evaluate_reviewer_trigger.ts`
  - `tools/eval/evaluate_reviewer_trigger.test.ts`
  - `records/autoresearch-ledger.tsv`
  - `tasks/2026-10-12-autoresearch-exp04-reviewer-policy.md`
- Out of scope:
  - Modifying approved specs, spec hashes, or ADRs.
  - Modifying router prompts or files outside the declared scope.

## Acceptance criteria

- AC1: Dataset `docs/research/scenarios/reviewer-trigger-v1.json` defines 14 scenarios covering eligible independent review (multi-module, contract boundary, sensitive behavior, high complexity diffs), simple self-review (low complexity, localized, single-module), and false agreement audits (deterministic verification detects defect despite agent consensus).
- AC2: Tool `tools/eval/evaluate_reviewer_trigger.ts` implements deterministic simulation and evaluation of candidate calibrated reviewer trigger policy vs baseline self-review only, reporting trigger decisions, defects caught, rework events, review token costs, and critical misses.
- AC3: Unit test suite `tools/eval/evaluate_reviewer_trigger.test.ts` verifies trigger conditions, deterministic audit override on agent agreement, cost avoidance on simple tasks, baseline defects escape, and full dataset evaluation with 100% pass rate.
- AC4: Candidate result is logged in `records/autoresearch-ledger.tsv` with complete status, 0 critical misses, 100% high-risk defects caught, and proposed owner decision.
- AC5: Repository validation (`mise run validate`) and full test suite (`mise run test`) pass with zero regressions.

## Plan

1. Record baseline verification B1 on ancestor commit `f66db94`.
2. Construct frozen scenario dataset `docs/research/scenarios/reviewer-trigger-v1.json` covering eligible, simple, and false agreement review scenarios.
3. Implement deterministic reviewer trigger evaluation script in `tools/eval/evaluate_reviewer_trigger.ts`.
4. Implement unit tests in `tools/eval/evaluate_reviewer_trigger.test.ts` covering guardrails, trigger conditions, and audit gates.
5. Record experiment EXP-04 in `records/autoresearch-ledger.tsv`.
6. Run `mise exec -- bun test tools/eval/evaluate_reviewer_trigger.test.ts` and repository validation.
7. Record checkpoint and outcome.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation and test suite | pass | f66db94 | `mise run validate` (exit 0) & `mise run test` (155 pass) |
| AC1 | reviewer trigger scenario dataset | pass | 2f62098 | 14 scenarios covering eligible review, simple self-review, and false agreement |
| AC2 | deterministic evaluation implementation | pass | 2f62098 | evaluate_reviewer_trigger.ts implements candidate vs baseline evaluation |
| AC3 | reviewer trigger unit test suite | pass | 2f62098 | bun test evaluate_reviewer_trigger.test.ts passes (14 tests pass, 0 fail) |
| AC4 | autoresearch ledger entry | pass | 2f62098 | EXP-04 logged in records/autoresearch-ledger.tsv with complete status |
| AC5 | repository validation and test suites | pass | 2f62098 | mise run validate passes and full test suite passes with 0 failures |
| V1 | diff review against V1 governance | pass | 2f62098 | strictly bounded to in-scope files; approved spec hash untouched |

## Outcome

Autoresearch Experiment EXP-04 completed and verified. Evaluated the calibrated independent reviewer trigger policy against naive self-review across 14 SDLC review scenarios. The candidate policy caught 100% of high-risk defects (9/9 vs 0/9 in baseline, eliminating 9 rework events) while avoiding 100% of unnecessary review triggers on simple tasks (saving 14,000 tokens across 4 scenarios). In false agreement scenarios where both agents hallucinated consensus, deterministic verification audit strictly caught defects, satisfying the mandate that agent agreement is never assumed to be correctness (0 critical misses).

## Checkpoint

- as of: 2026-10-12, branch feat/ooda-pipeline-advancement, head a5a4acf, task verified
- done: scenario dataset, evaluator, test suite, ledger entry, and canonical task record completed and verified
- next: report ready_for_gate to parent orchestrator
