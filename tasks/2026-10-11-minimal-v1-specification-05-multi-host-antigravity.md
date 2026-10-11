---
schema: task/1
tier: standard
status: verified
parent: 2026-10-11-minimal-v1-specification
spec: 2026-10-11-minimal-v1-specification@1
depends_on:
  - 2026-10-11-minimal-v1-specification-01-work-skill
  - 2026-10-11-minimal-v1-specification-02-validator-and-manifest
  - 2026-10-11-minimal-v1-specification-03-ci-and-update
  - 2026-10-11-minimal-v1-specification-04-contract-distribution
verified_at: "83d1ebb"
---

# Multi-Host Bundle Support for Google Antigravity

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-11-minimal-v1-specification; approved by owner on 2026-10-11 to extend bundle delivery to Google Antigravity)
- approved: multi-host Antigravity delivery by owner (2026-10-11, "Opção A: Bundle Multi-Host (entregar .claude/skills/work/ e .agents/skills/work/)")

## Objective

Extend the G-Ingá SDLC distribution bundle so the `/work` skill and harness can be executed natively in both Anthropic Claude Code (`.claude/skills/work/`) and Google Antigravity (`.agents/skills/work/`), sharing identical artifact contracts and validation gates.

- In scope:
  - Deliver `.agents/skills/work/` containing `SKILL.md`, `standard.md`, `heavy.md`, `resume.md`, `review.md`, and `references/artifact-contracts.md`.
  - Update `tools/validate/bundle.json` and `manifest.json` to include `.agents/skills/work/` assets.
  - Expand `BUNDLE_SCOPE` in `tools/validate/standalone.ts` and `tools/validate/update.mjs` to include `.agents/skills/work/`.
  - Provide delimited pointer documentation in `GEMINI.md` / `AGENTS.md` for target repositories.
  - Add committed tests in `tools/validate/bundle.test.ts` covering Antigravity assets.
  - Update `docs/bundle.md` with multi-host instructions.
- Out of scope:
  - Removing Claude Code assets (both hosts must coexist in the bundle).
  - Modifying the canonical contract in `docs/artifact-contracts.md`.

## Acceptance criteria

- AC1: `.agents/skills/work/` contains all `/work` procedures and references, matching `.claude/skills/work/` invariants and citing its delivered references.
- AC2: `BUNDLE_SCOPE` in `standalone.ts` and `update.mjs` allows `.agents/skills/work/`.
- AC3: `tools/validate/bundle.json` and `manifest.json` cover `.agents/skills/work/` assets, and `bun tools/validate/manifest.mjs --check` passes.
- AC4: `update.mjs` correctly installs and updates both `.claude/` and `.agents/` skill directories in target repositories without altering user content.
- AC5: `tools/validate/bundle.test.ts` validates exit codes, asset integrity, and update behavior for `.agents/skills/work/`.
- AC6: `mise run test` (100% pass) and `mise run validate` (100% pass) pass cleanly.

## Plan

1. Commit this record (`active`) before making implementation changes.
2. Update `standalone.ts`, `update.mjs`, create `.agents/skills/work/`, update `bundle.json`, rebuild `validate.js`, add tests in `bundle.test.ts` (Commit C = 753ebb5).
3. Regenerate `manifest.json` at C and commit `manifest.json` alone (Commit M = 83d1ebb).
4. Run full test suite and validation suite.
5. Update this record with verification evidence and mark `verified`.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline suites before the change | pass | a987ff1 | `G_INGA_REQUIRE_RUNTIMES=1 mise run test`: 114 pass, 0 fail; `mise run validate`: pass |
| AC1 | .agents/skills/work/ assets delivered | pass | 83d1ebb | 6 assets in `.agents/skills/work/` matching `/work` invariants and citing their delivered references |
| AC2 | BUNDLE_SCOPE updated in validator and updater | pass | 83d1ebb | `BUNDLE_SCOPE` in `bundle.json` includes `.agents/skills/work/`; standalone validator rebuilt |
| AC3 | bundle.json and manifest.json cover .agents/ assets | pass | 83d1ebb | `bundle.json` lists 15 assets; `manifest.json` hashes them at commit `753ebb5`; `manifest.mjs --check`: pass |
| AC4 | update.mjs multi-host target behavior | pass | 83d1ebb | `updateBundle` installs and idempotently updates both hosts without touching user files |
| AC5 | bundle tests cover Antigravity assets | pass | 83d1ebb | `bundle.test.ts` passes 33 tests under Node 22+ and Bun |
| AC6 | repository test and validation suites pass | pass | 83d1ebb | `mise run test`: 115 pass, 0 fail; `mise run validate`: exit 0 |
| R1 | repository test suite | pass | 83d1ebb | `G_INGA_REQUIRE_RUNTIMES=1 mise run test`: type-check clean, 115 pass, 0 fail |
| R2 | repository validation suite | pass | 83d1ebb | `mise run validate` exit 0 (0 markdown lint issues, 699 links valid, 24 mermaid diagrams) |
| V1 | diff review against AC1–AC6 | pass | 83d1ebb | diff review confirms clean multi-host coexistence for Claude Code and Antigravity |

## Checkpoint

- as of: 2026-10-11, branch feat/v1-work-self-hosting, head 83d1ebb, worktree dirty (this record only)
- done: rows run at 83d1ebb; status verified
- next: update parent task record and push multi-host bundle to PR #12

## Outcome

Delivered multi-host support for Google Antigravity in the G-Ingá product bundle. Target repositories can now commit `.agents/skills/work/` alongside `.claude/skills/work/`, adopting `/work` seamlessly across both Google Antigravity and Anthropic Claude Code while sharing the exact same artifact contracts, offline zero-dependency validator (`validate.js`), and deterministic quality gates. Commits: `c7056d6` (task active), `753ebb5` (assets, Commit C), `83d1ebb` (manifest, Commit M).
