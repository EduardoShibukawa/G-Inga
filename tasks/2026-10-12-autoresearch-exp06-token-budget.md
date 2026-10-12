---
schema: task/1
tier: standard
status: verified
verified_at: "58401b4"
---

# Autoresearch Experiment 06: Telemetry Token Accounting & Cost Drift Calibration

## Routing and approvals

- tier: standard (S1 holds: deterministic telemetry normalization and token budget guardrail verification; S2 holds: follows autoresearch loop and ADR 0002 §7; S3 holds: bounded target artifacts tools/eval, docs/research/scenarios, records/ and tasks/; S4 holds: two-way door)
- approved: standard procedure by owner (2026-10-12, "Ticket #TASK-EXP06 — Autoresearch EXP-06: Telemetry Token Accounting & Cost Drift Calibration")

## Objective

Execute Autoresearch Experiment EXP-06 (Round 2 Candidate of `docs/research/autoresearch-program.md` §10):
Evaluate real-time multi-host token usage measurement, ceremony budget ceilings, and loop guardrails.

- Hypothesis: Continuous token telemetry accounting and deterministic ceremony budget guardrails prevent asymptotic context bloat, intercepting 100% of unproductive loops before ceiling overrun (e.g., 25k tokens for standard tier) with zero premature stops on legitimate complex tasks within budget.
- In scope:
  - `docs/research/scenarios/token-budget-v1.json`
  - `tools/eval/token_budget_guard.ts`
  - `tools/eval/token_budget_guard.test.ts`
  - `records/autoresearch-ledger.tsv`
  - `tasks/2026-10-12-autoresearch-exp06-token-budget.md`
- Out of scope:
  - Modifying approved specs, spec hashes, or ADRs.
  - Committing directly to git (commit handled by orchestrator SEAL step).

## Acceptance criteria

- AC1: Dataset `docs/research/scenarios/token-budget-v1.json` defines at least 12 execution scenarios covering light (<5k), standard (<25k), heavy (<60k) ceremony tiers, context bloat loops, subagent delegation waves, and multi-host formats (Antigravity and Claude Code OTel).
- AC2: Tool `tools/eval/token_budget_guard.ts` implements multi-host telemetry parsing, metric calculations (`tokens_input`, `tokens_output`, `cache_read_tokens`, `cache_read_ratio`, `tokens_per_verified_task`), budget ceiling enforcement, loop detection, and ADR 0006 privacy sanitization.
- AC3: Unit test suite `tools/eval/token_budget_guard.test.ts` verifies telemetry normalization, metric accuracy, 100% runaway loop detection, ceremony ceiling checks, zero premature stops on complex tasks, and dataset evaluation with 100% pass rate.
- AC4: Candidate result is logged in `records/autoresearch-ledger.tsv` with complete status, 0 critical misses, and proposed owner decision.
- AC5: Repository validation (`bun run validate`) and token budget guardrail test suite pass with zero regressions.

## Plan

1. Record baseline verification B1 on ancestor commit `cacaa07`.
2. Construct frozen scenario dataset `docs/research/scenarios/token-budget-v1.json` with 12 scenarios.
3. Implement telemetry token budget guardrail in `tools/eval/token_budget_guard.ts`.
4. Implement hermetic unit test suite in `tools/eval/token_budget_guard.test.ts`.
5. Record experiment EXP-06 in `records/autoresearch-ledger.tsv`.
6. Run `bun test tools/eval/token_budget_guard.test.ts` and `bun run validate`.
7. Prepare ready_for_gate report.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation and test suite | pass | cacaa07 | `bun run validate` passes (exit 0) on ancestor commit cacaa07 |
| AC1 | token budget scenario dataset | pass | 58401b4 | 12 scenarios covering light, standard, heavy, loops, subagents, and Claude Code in token-budget-v1.json |
| AC2 | token budget guardrail implementation | pass | 58401b4 | token_budget_guard.ts normalizes multi-host telemetry, evaluates ceilings and loops, sanitizes output |
| AC3 | token budget guardrail unit test suite | pass | 58401b4 | bun test token_budget_guard.test.ts passes (9 tests pass, 0 fail, 109 assertions) |
| AC4 | autoresearch ledger entry | pass | 58401b4 | EXP-06 logged in records/autoresearch-ledger.tsv with complete status and proposed decision |
| AC5 | repository validation and test suites | pass | 58401b4 | bun run validate passes (exit 0) and bun test token_budget_guard.test.ts passes (9 tests pass) |
| V1 | diff review against scope | pass | 58401b4 | strictly bounded to in-scope files; approved spec hash untouched |

## Outcome

Autoresearch Experiment EXP-06 executed and verified. Built multi-host token accounting and context drift guardrail in `tools/eval/token_budget_guard.ts`. Evaluated across 12 scenarios in `docs/research/scenarios/token-budget-v1.json`. Achieved 100% detection of runaway repetitive loops, 0 premature stops on legitimate complex tasks, and calibrated warning triggers at 80% budget consumption.

## Checkpoint

- as of: 2026-10-12, branch main, head 58401b4, task verified
- done: scenario dataset, guardrail implementation, unit tests, ledger entry, and task record created and verified
- next: parent orchestrator executes atomic seal and push
