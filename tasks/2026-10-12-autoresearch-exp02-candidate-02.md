---
schema: task/1
tier: standard
status: active
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
| AC1 | layout token reduction | not run | - | pending authoring |
| AC2 | 7 mandates and pointer block | not run | - | pending authoring |
| AC3 | ledger candidate row | not run | - | pending run |
| AC4 | 4-layer gate and test suite | not run | - | pending eval |
| V1 | diff review against V1 governance | not run | - | pending review |

## Outcome

(Pending candidate execution)

## Checkpoint

- as of: 2026-10-12, branch exp/autoresearch-candidate-02-layout, head 71b1890, task active
- done: branch created, baseline verified on 71b1890
- next: execute candidate edits in CLAUDE.md and GEMINI.md, update ledger, evaluate gates
