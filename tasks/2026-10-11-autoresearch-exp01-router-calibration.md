---
schema: task/1
tier: standard
status: active
---

# Autoresearch Experiment 01: Tabletop and Behavioral Router Calibration on R01–R17

## Routing and approvals

- tier: standard (S1 holds: clear hypothesis and evaluation rubric for router calibration; S2 holds: follows autoresearch loop and ADR 0002 §7; S3 holds: bounded evaluation artifact under docs/research/ and records/; S4 holds: two-way door)
- approved: standard procedure by owner (2026-10-11, "sim")

## Objective

Execute the first formal autoresearch candidate experiment as defined in `docs/research/autoresearch-program.md` §8 (Candidate 1): establish the frozen scenario set for R01–R17 (ADR 0002 §7), run baseline evaluation against the current router contract in `.claude/skills/work/SKILL.md`, initialize the experiment ledger, and test routing agreement and safety guardrails (zero under-routing on H2/H4).

- Hypothesis: The formal categorical routing rules in ADR 0002 (§3, S1–S8, H1–H6) yield 100% agreement on expected tiers for R01–R17, with 0 critical misses / under-routing on sensitive (H4) or irreversible (H2) scenarios.
- In scope:
  - Create frozen scenario specification: `docs/research/scenarios/r01-r17-v1.json` (or `.md`).
  - Initialize the autoresearch experiment ledger: `records/autoresearch-ledger.tsv`.
  - Author evaluator script `tools/eval/evaluate_routing.ts` to grade routing predictions against expected labels.
  - Record baseline run for EXP-01 against commit `948e669`.
  - Verify safety gates (zero under-routing on H2/H4).
- Out of scope:
  - Modifying the V1 spec body or spec hash.
  - Modifying product runtime distribution bundle.
  - Changing ADR 0002 accepted criteria during the evaluation.

## Acceptance criteria

- AC1: Frozen scenario set `scenarios/r01-r17-v1.json` is committed with all 17 scenarios, expected tiers, deciding signals, and sensitivity tags (H2/H4 guardrails).
- AC2: Evaluator utility `tools/eval/evaluate_routing.ts` evaluates routing classifications, logs agreement rates, and flags any critical under-routing.
- AC3: Autoresearch ledger `records/autoresearch-ledger.tsv` initialized with the required schema and EXP-01 baseline row.
- AC4: Baseline run outcome recorded with 0 critical regressions on H2/H4 scenarios.
- AC5: Repository validation suite (`mise run validate`) and test suite (`mise run test`) pass cleanly.

## Plan

1. Record baseline check suite on branch `exp/autoresearch-r01-r17-calibration` (B1).
2. Author `docs/research/scenarios/r01-r17-v1.json` freezing R01–R17.
3. Author `tools/eval/evaluate_routing.ts` and test suite `tools/eval/evaluate_routing.test.ts`.
4. Initialize `records/autoresearch-ledger.tsv`.
5. Run baseline evaluation and log results in the ledger and experiment report.
6. Run canonical validation suite and test suite.
7. Record checkpoint and present results to owner.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation suite | pass | 948e669 | `mise run validate` (exit 0) & `mise run test` (115 pass) on main |
| AC1 | frozen scenarios artifact | not run | - | pending creation |
| AC2 | evaluator utility | not run | - | pending creation |
| AC3 | autoresearch ledger initialized | not run | - | pending creation |
| AC4 | baseline evaluation run | not run | - | pending run |
| AC5 | validation & test suites | not run | - | pending run |
| V1 | diff review against V1 governance | not run | - | pending review |

## Outcome

## Checkpoint

- as of: 2026-10-11, branch exp/autoresearch-r01-r17-calibration, head 948e669, task active
- done: experiment branch created; task record authored; baseline B1 verified on main (948e669)
- next: create frozen scenario set docs/research/scenarios/r01-r17-v1.json and evaluator script
