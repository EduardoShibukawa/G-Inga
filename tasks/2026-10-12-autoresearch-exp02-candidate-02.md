---
schema: task/1
tier: standard
status: verified
verified_at: "b4d3197"
---

# Autoresearch Experiment 02 Candidate 02: Layout Optimization of CLAUDE.md and GEMINI.md

## Routing and approvals

- tier: standard (S1 holds: testable candidate prompt layout reduction; S2 holds: follows autoresearch loop and ADR 0002 §7; S3 holds: bounded target artifacts CLAUDE.md and GEMINI.md; S4 holds: two-way door)
- approved: standard procedure by owner (2026-10-12, "executar o Experimento EXP-02 (Candidato 2 — Otimização de layout do CLAUDE.md / GEMINI.md) sob o harness OODA (/orchestrate)")

## Objective

Run Candidate 02 of EXP-02 under the OODA orchestration harness: evaluate a condensed layout for `CLAUDE.md` and `GEMINI.md` to reduce the per-turn fixed context overhead by >= 20% (~140 tokens per turn) while strictly preserving 100% of the 7 canonical operational mandates and the integrity of the `<!-- g-inga:pointer -->` block.

- Hypothesis: Condensing prose in `CLAUDE.md` and `GEMINI.md` while keeping the exact 7-point working protocol and `<!-- g-inga:pointer -->` block reduces fixed token overhead by >= 20% with zero loss of semantic governance.
- In scope:
  - Controlled layout optimization of `CLAUDE.md` and `GEMINI.md`.
  - Record candidate in `records/autoresearch-ledger.tsv`.
  - Verify through 4-layer autonomous verification gate (`tools/gate/verify-gate.ts`).
  - Run canonical validation suite (`mise run validate`) and test suite (`mise run test`, 127 tests).
- Out of scope:
  - Modifying artifact schemas, spec bodies, or spec hashes.
  - Modifying the delimited content or tags of `<!-- g-inga:pointer -->`.
  - Modifying the 7 canonical working protocol semantics.

## Acceptance criteria

- AC1: `CLAUDE.md` and `GEMINI.md` layout optimized to achieve >= 20% character and token reduction (~140+ tokens saved per turn).
- AC2: 100% of the 7 canonical operational mandates preserved and the `<!-- g-inga:pointer -->` block is byte/format preserved.
- AC3: Candidate run is logged in `records/autoresearch-ledger.tsv` with deltas and status `complete`.
- AC4: 4-layer autonomous verification gate (`tools/gate/verify-gate.ts`), repository validation (`mise run validate`), and full test suite (`mise run test`) pass cleanly (127 tests pass, 0 fail).

## Plan

1. Record baseline check suite on branch `exp/autoresearch-candidate-02-layout` (B1).
2. Author compact layout candidates in `CLAUDE.md` and `GEMINI.md`, measuring exact character, word, and token reductions.
3. Verify zero lint errors and exact pointer block preservation.
4. Record experiment in `records/autoresearch-ledger.tsv`.
5. Run the 4 autonomous verification gate layers and full canonical check suites.
6. Record checkpoint and outcome.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation suite | pass | 71b1890 | `mise run validate` (exit 0) & `mise run test` (127 pass) on main |
| AC1 | layout token reduction | pass | b4d3197 | 31.2% char reduction (2741 -> 1886) in CLAUDE.md, 30.9% in GEMINI.md (~214 tokens saved) |
| AC2 | 7 mandates and pointer block | pass | b4d3197 | all 7 mandates preserved, pointer block identical and markdownlint passes |
| AC3 | ledger candidate row | pass | b4d3197 | EXP-02 recorded in records/autoresearch-ledger.tsv with complete status |
| AC4 | 4-layer gate and test suite | pass | b4d3197 | verify-gate pass (attempt 1), validate pass, test pass (127 pass, 0 fail) |
| V1 | diff review against V1 governance | pass | b4d3197 | layout briefs, ledger and task record only; approved spec hash untouched |

## Outcome

Candidate 02 of EXP-02 verified successfully under OODA harness. Achieved 31.2% character reduction in `CLAUDE.md` and 30.9% in `GEMINI.md` (saving ~214 tokens per turn, comfortably exceeding the >= 20% / ~140 token target) while preserving 100% of the 7 working protocol mandates and pointer block integrity. Verified via 4-layer gate and 127 automated tests.

## Checkpoint

- as of: 2026-10-12, branch exp/autoresearch-candidate-02-layout, head b4d3197, task verified
- done: Candidate 02 implemented, verified across all gates and 127 tests, ledger updated
- next: push branch to origin and submit PR for owner review
