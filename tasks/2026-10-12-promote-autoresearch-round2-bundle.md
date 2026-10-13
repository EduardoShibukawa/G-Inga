---
schema: task/1
tier: standard
status: active
---

# Promote Autoresearch Round 2 Findings (EXP-05, EXP-06) to V1 Bundle

## Routing and approvals

- tier: standard (S1 holds: testable criteria for promotion of accepted autoresearch policies to bundle assets; S2 holds: follows established bundle asset promotion protocol; S3 holds: strictly bounded to bundle skill files, ledger, research doc, manifest, and task record; S4 holds: two-way door)
- approved: standard procedure by owner (2026-10-12, "TASK DISPATCH: Promoção dos Resultados de Autoresearch EXP-05 e EXP-06 ao Bundle V1")

## Objective

Promote accepted Round 2 autoresearch findings (EXP-05 Dynamic Worktree Isolation and EXP-06 Token Budget Guardrail) into the V1 product bundle:

1. Update `records/autoresearch-ledger.tsv` setting `owner_decision: accepted` for EXP-05 and EXP-06.
2. Update the results section of `docs/research/autoresearch-program.md` reflecting empirical outcomes and owner acceptance.
3. Incorporate worktree isolation guidelines (EXP-05) and token budget ceilings / telemetry loop interception rules (EXP-06) into canonical bundle skills (`.claude/skills/work/SKILL.md` and `.agents/skills/work/SKILL.md`), strictly citing delivered contract copies.
4. Update `manifest.json` with new bundle asset hashes and follow the bundle provenance protocol.
5. Validate that repository validation suite and test suites pass cleanly.

- In scope:
  - `records/autoresearch-ledger.tsv`
  - `docs/research/autoresearch-program.md`
  - `.claude/skills/work/SKILL.md`
  - `.agents/skills/work/SKILL.md`
  - `manifest.json`
  - `tasks/2026-10-12-promote-autoresearch-round2-bundle.md`
- Out of scope:
  - Modifying the approved V1 specification body or specification hash.
  - Modifying files outside the declared scope.
  - Committing directly to git (atomic seal handled by parent orchestrator).

## Acceptance criteria

- AC1: `records/autoresearch-ledger.tsv` records `owner_decision: accepted` for EXP-05 and EXP-06 while preserving TSV formatting.
- AC2: `docs/research/autoresearch-program.md` documents final empirical outcomes and owner acceptance for EXP-05 and EXP-06.
- AC3: `.claude/skills/work/SKILL.md` and `.agents/skills/work/SKILL.md` formally incorporate EXP-05 worktree isolation and EXP-06 token budget / telemetry loop interception guidelines, strictly citing delivered contract copies (`.claude/skills/work/references/artifact-contracts.md` and `.agents/skills/work/references/artifact-contracts.md`).
- AC4: `manifest.json` asset hashes updated for in-scope bundle skills.
- AC5: Repository validation suite (`bun run validate`) passes with exit code 0 (`pass`).

## Plan

1. Record baseline verification check suite on current HEAD `e3f383b` (B1).
2. Update `records/autoresearch-ledger.tsv` marking EXP-05 and EXP-06 owner decisions as accepted.
3. Update `docs/research/autoresearch-program.md` results section with EXP-05 and EXP-06 outcomes.
4. Update `.claude/skills/work/SKILL.md` and `.agents/skills/work/SKILL.md` with EXP-05 and EXP-06 policies.
5. Update `manifest.json` asset hashes for modified bundle assets.
6. Run `bun run validate` and test suites.
7. Deliver `ready_for_gate` report to parent orchestrator for verification gate and atomic commit seal.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation and test suite | pass | e3f383b | `bun run validate` pass, `bun test` (220 pass), `manifest.mjs --check` pass on HEAD |
| AC1 | autoresearch ledger accepted decisions | pass | e3f383b | records/autoresearch-ledger.tsv updated for EXP-05 and EXP-06 |
| AC2 | autoresearch program results section | pass | e3f383b | docs/research/autoresearch-program.md updated with Round 2 results |
| AC3 | bundle skills incorporate EXP-05 and EXP-06 | pass | e3f383b | applied to .claude/skills/work/SKILL.md and .agents/skills/work/SKILL.md |
| AC4 | bundle manifest asset hashes updated | pass | e3f383b | manifest.json hashes updated; bundle asset tests pass |
| AC5 | repository validation suite | pass | e3f383b | bun run validate passes with exit code 0 (75 files, 0 issues) |
| V1 | diff review against scope | pass | e3f383b | diff strictly bounded to in-scope files; spec hash untouched |

## Outcome

Round 2 autoresearch findings (EXP-05 Dynamic Worktree Isolation and EXP-06 Token Budget Guardrail) have been promoted to the V1 product bundle:

- `records/autoresearch-ledger.tsv` updated marking EXP-05 and EXP-06 owner decisions as accepted.
- `docs/research/autoresearch-program.md` updated with Round 2 empirical results table and descriptive outcomes.
- `.claude/skills/work/SKILL.md` and `.agents/skills/work/SKILL.md` updated with worktree isolation guidelines (<500ms SLA, index lock elimination) and ceremony token budget ceilings (<5k light, <25k standard, <60k heavy, 80% warning alerts, and runaway loop interception), citing delivered contract copies.
- `manifest.json` updated with new asset hashes.
- Validated with 100% pass on repository validation suite (`bun run validate`).

## Checkpoint

- as of: 2026-10-12, branch main, head e3f383b, task active
- done: ledger updated, research doc updated, bundle skills updated, manifest updated, validation suite clean
- next: deliver ready_for_gate report to parent orchestrator for verification gate and atomic commit seal
