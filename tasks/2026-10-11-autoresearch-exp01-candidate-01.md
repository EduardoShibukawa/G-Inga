---
schema: task/1
tier: standard
status: verified
verified_at: "d94f2c1"
---

# Autoresearch Experiment 01 Candidate 01: Compact Routing Prompt

## Routing and approvals

- tier: standard (S1 holds: testable candidate prompt reduction; S2 holds: follows autoresearch loop and ADR 0002 §7; S3 holds: bounded target artifact .claude/skills/work/SKILL.md; S4 holds: two-way door)
- approved: standard procedure by owner (2026-10-11, "pode rodar o candidato")

## Objective

Run Candidate 01 of EXP-01: evaluate a condensed, token-frugal formulation of `.claude/skills/work/SKILL.md` against frozen scenarios `docs/research/scenarios/r01-r17-v1.json`. Compare agreement accuracy, zero under-routing on H2/H4, and complexity/token delta against the baseline commit `299a6e8`.

- Hypothesis: Condensing routing rules and signals in `.claude/skills/work/SKILL.md` by ~25% character count preserves 100% agreement on R01–R17 and 0 critical misses on H2/H4.
- In scope:
  - Controlled edit to `.claude/skills/work/SKILL.md`.
  - Evaluate predictions on frozen scenarios R01–R17 v1.
  - Record candidate run in `records/autoresearch-ledger.tsv`.
  - Check canonical validation suite (`mise run validate`) and test suite (`mise run test`).
- Out of scope:
  - Modifying artifact schemas, spec bodies, or spec hashes.
  - Modifying scenario expectations or evaluator grading rubric.

## Acceptance criteria

- AC1: Condensed `.claude/skills/work/SKILL.md` reduces token/word overhead while preserving exact ADR 0002 categorical semantics.
- AC2: Evaluator `tools/eval/evaluate_routing.ts` scores candidate predictions with 100% agreement (17/17) and 0 critical misses.
- AC3: Candidate run is logged in `records/autoresearch-ledger.tsv` with deltas and status `complete`.
- AC4: Repository validation suite (`mise run validate`) and test suite (`mise run test`) pass cleanly.

## Plan

1. Record baseline check suite on branch `exp/autoresearch-r01-r17-candidate-01` (B1).
2. Author compact candidate in `.claude/skills/work/SKILL.md` and measure size reduction.
3. Run routing evaluation on frozen scenarios.
4. Log candidate run in `records/autoresearch-ledger.tsv`.
5. Run canonical validation suite and test suite.
6. Record checkpoint and report results.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation suite | pass | 299a6e8 | `mise run validate` (exit 0) & `mise run test` (115 pass) on main |
| AC1 | compact prompt authoring | pass | d94f2c1 | 18.5% char reduction (4453 -> 3630), 20.1% word reduction (591 -> 472) |
| AC2 | candidate routing evaluation | pass | d94f2c1 | 17/17 (100%) agreement on R01-R17, 0 critical misses on H2/H4 |
| AC3 | ledger candidate row | pass | d94f2c1 | EXP-01-C01 recorded in records/autoresearch-ledger.tsv |
| AC4 | validation & test suites | pass | d94f2c1 | `mise run validate` (exit 0) & `mise run test` (115 pass) |
| V1 | diff review against V1 governance | pass | d94f2c1 | research artifacts, ledger, and candidate spec; no spec hash modified |

## Outcome

Candidate 01 of EXP-01 completed and verified. The compact formulation achieved an 18.5% character reduction and 20.1% word reduction (~210 tokens saved per invocation) while maintaining 100% agreement (17/17) with zero under-routing on sensitive (H4) or irreversible (H2) scenarios. Candidate evaluation report is preserved in `docs/research/scenarios/candidate-01-evaluation.md` and logged in `records/autoresearch-ledger.tsv`.

## Checkpoint

- as of: 2026-10-11, branch exp/autoresearch-r01-r17-candidate-01, head d94f2c1, task verified
- done: candidate evaluated; 100% agreement and 0 critical misses verified; ~210 tokens saved; ledger updated; task verified
- next: push branch and submit PR for owner review and decision
