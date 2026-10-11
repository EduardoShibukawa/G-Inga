---
schema: task/1
tier: standard
status: active
---

# Promote Autoresearch EXP-01 Candidate 01 to V1 Bundle

## Routing and approvals

- tier: standard (S1 holds: clear outcome to promote verified candidate prompt to bundle and regenerate manifest; S2 holds: follows established bundle asset update protocol; S3 holds: bounded to bundle skill files and manifest; S4 holds: two-way door)
- approved: standard procedure by owner (2026-10-11, "1")

## Objective

Promote the verified compact routing prompt formulation from Autoresearch EXP-01 Candidate 01 to the V1 product bundle (`.claude/skills/work/SKILL.md` and `.agents/skills/work/SKILL.md`), update `records/autoresearch-ledger.tsv` setting owner decision to `accepted`, regenerate `manifest.json` following the two-commit bundle provenance protocol, and verify repository validation and test suites.

- In scope:
  - Update `.claude/skills/work/SKILL.md` with the verified compact routing formulation.
  - Update `.agents/skills/work/SKILL.md` with the verified compact routing formulation (adapted for Google Antigravity).
  - Update `records/autoresearch-ledger.tsv` marking `owner_decision` as `accepted`.
  - Execute bundle asset commit and generate updated `manifest.json`.
  - Validate with `bun tools/validate/manifest.mjs --check`, `mise run validate`, and `mise run test`.
- Out of scope:
  - Modifying the approved V1 specification body or specification hash.
  - Changing routing rules or ceremony criteria defined in ADR 0002.

## Acceptance criteria

- AC1: `.claude/skills/work/SKILL.md` and `.agents/skills/work/SKILL.md` contain the verified compact prompt formulation preserving all ADR 0002 invariants.
- AC2: `records/autoresearch-ledger.tsv` records `owner_decision: accepted` for `EXP-01-C01`.
- AC3: `manifest.json` is updated and validated via `bun tools/validate/manifest.mjs --check` and `tools/validate/bundle.test.ts`.
- AC4: Canonical validation suite (`mise run validate`) and test suite (`mise run test`) pass cleanly.

## Plan

1. Record baseline check suite on branch `feat/promote-autoresearch-exp01-candidate-01` (B1).
2. Author compact formulation in `.claude/skills/work/SKILL.md` and `.agents/skills/work/SKILL.md`.
3. Update `records/autoresearch-ledger.tsv`.
4. Commit bundle assets (commit C).
5. Generate `manifest.json` with `bun tools/validate/manifest.mjs`.
6. Run canonical validation suite and test suite.
7. Record checkpoint and update task record.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation suite | pass | df53501 | `mise run validate` (exit 0) & `mise run test` (115 pass) on main |
| AC1 | compact prompt in bundle skills | not run | - | pending edit |
| AC2 | ledger decision updated | not run | - | pending edit |
| AC3 | manifest regenerated & proven | not run | - | pending generation |
| AC4 | validation & test suites | not run | - | pending test |
| V1 | diff review against V1 governance | not run | - | pending review |

## Outcome

## Checkpoint

- as of: 2026-10-11, branch feat/promote-autoresearch-exp01-candidate-01, head df53501, task active
- done: branch created; baseline verified (B1 pass); task record authored
- next: apply compact formulation to .claude and .agents bundle skills
