---
schema: task/1
tier: standard
status: active
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
| AC1 | compact prompt authoring | not run | - | pending authoring |
| AC2 | candidate routing evaluation | not run | - | pending eval |
| AC3 | ledger candidate row | not run | - | pending log |
| AC4 | validation & test suites | not run | - | pending run |
| V1 | diff review against V1 governance | not run | - | pending review |

## Outcome

## Checkpoint

- as of: 2026-10-11, branch exp/autoresearch-r01-r17-candidate-01, head 299a6e8, task active
- done: branch created; baseline verified (B1 pass); task record authored
- next: edit .claude/skills/work/SKILL.md with compact formulation and evaluate
