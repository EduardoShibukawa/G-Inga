---
schema: task/1
tier: standard
status: verified
verified_at: "d6dfb9e"
---

# Promote Autoresearch Findings (EXP-02, EXP-03, EXP-04) to V1 Bundle

## Routing and approvals

- tier: standard (S1 holds: testable promotions of accepted autoresearch policies to bundle assets; S2 holds: follows established bundle asset promotion protocol; S3 holds: strictly bounded to bundle skill files, ledger, manifest, and task record; S4 holds: two-way door)
- approved: standard procedure by owner (2026-10-12, "TASK DISPATCH: Ticket #TASK-F1 — Promoção de Descobertas de Autoresearch ao V1 Bundle")

## Objective

Promote accepted autoresearch findings (EXP-02, EXP-03, EXP-04) into the V1 product bundle:

1. Update `records/autoresearch-ledger.tsv` setting `owner_decision: accepted` for EXP-02, EXP-03, and EXP-04.
2. Incorporate the circuit breaker recovery rule from EXP-03 ("two failures without new information -> re-plan": halts repeated unproductive retries while preserving useful progress) and the deterministic verification audit guideline from EXP-04 (risk-calibrated independent review; never assume model or agent consensus equals correctness: deterministic verification audit strictly overrides model agreement) into `.claude/skills/work/SKILL.md` and `.agents/skills/work/SKILL.md`.
3. Follow the two-commit bundle provenance protocol to regenerate `manifest.json`.
4. Validate that repository validation and bundle test suites pass cleanly.

- In scope:
  - `records/autoresearch-ledger.tsv`
  - `.claude/skills/work/SKILL.md`
  - `.agents/skills/work/SKILL.md`
  - `manifest.json`
  - `tasks/2026-10-12-promote-autoresearch-findings-bundle.md`
- Out of scope:
  - Modifying the approved V1 specification body or specification hash.
  - Modifying files outside the declared scope.

## Acceptance criteria

- AC1: `records/autoresearch-ledger.tsv` records `owner_decision: accepted` for EXP-02, EXP-03, and EXP-04 while preserving TSV formatting.
- AC2: `.claude/skills/work/SKILL.md` and `.agents/skills/work/SKILL.md` formally incorporate EXP-03 circuit breaker recovery and EXP-04 deterministic verification audit guidelines, strictly citing their delivered contract copies (`.claude/skills/work/references/artifact-contracts.md` and `.agents/skills/work/references/artifact-contracts.md`).
- AC3: Bundle asset commit C is created, and `manifest.json` is regenerated via `bun tools/validate/manifest.mjs` and verified with `bun tools/validate/manifest.mjs --check`.
- AC4: Test suite `bun test tools/validate/bundle.test.ts` passes with exit code 0 (`pass`).
- AC5: Repository validation suite (`bun run validate`) passes with exit code 0 (`pass`).

## Plan

1. Record baseline verification check suite on current HEAD `9ead293` (B1).
2. Update `records/autoresearch-ledger.tsv` marking EXP-02, EXP-03, and EXP-04 as accepted.
3. Update `.claude/skills/work/SKILL.md` and `.agents/skills/work/SKILL.md` with EXP-03 and EXP-04 policies.
4. Stage bundle assets and task record, creating atomic commit C (`8e8f2fe`).
5. Regenerate `manifest.json` using `bun tools/validate/manifest.mjs`.
6. Commit `manifest.json` as commit M (`d6dfb9e`).
7. Run `bun tools/validate/manifest.mjs --check`, `bun test tools/validate/bundle.test.ts`, and repository checks.
8. Update task record to `status: verified` with `verified_at: "d6dfb9e"` and commit.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation and bundle tests | pass | 9ead293 | manifest.mjs --check pass, bundle.test.ts pass (33 pass), bun run validate pass |
| AC1 | autoresearch ledger accepted decisions | pass | d6dfb9e | records/autoresearch-ledger.tsv updated for EXP-02, EXP-03, EXP-04 |
| AC2 | bundle skills incorporate EXP-03 and EXP-04 | pass | d6dfb9e | applied to .claude/skills/work/SKILL.md and .agents/skills/work/SKILL.md |
| AC3 | manifest regenerated and verified | pass | d6dfb9e | bun tools/validate/manifest.mjs --check exit 0 |
| AC4 | bundle test suite | pass | d6dfb9e | bun test tools/validate/bundle.test.ts passes (33 pass) |
| AC5 | repository validation suite | pass | d6dfb9e | bun tools/validate/main.ts passes for all in-scope artifacts |
| V1 | diff review against V1 governance | pass | d6dfb9e | only in-scope files touched; spec hash untouched |

## Outcome

Autoresearch findings EXP-02, EXP-03, and EXP-04 have been promoted to the V1 product bundle:

- `records/autoresearch-ledger.tsv` updated marking EXP-02, EXP-03, and EXP-04 owner decisions as accepted.
- `.claude/skills/work/SKILL.md` and `.agents/skills/work/SKILL.md` updated with the circuit-breaker recovery policy and risk-calibrated deterministic verification audit rules, citing delivered contract copies.
- Manifest `manifest.json` regenerated following the two-commit bundle provenance protocol and proven via `manifest.mjs --check` and `bundle.test.ts`.

## Checkpoint

- as of: 2026-10-12, branch main, head d6dfb9e, task verified
- done: bundle skills, ledger, manifest regenerated and tested; task verified
- next: commit task verification update and report ready_for_gate to orchestrator
