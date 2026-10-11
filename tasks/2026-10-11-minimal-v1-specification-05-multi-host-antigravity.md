---
schema: task/1
tier: standard
status: active
parent: 2026-10-11-minimal-v1-specification
spec: 2026-10-11-minimal-v1-specification@1
depends_on:
  - 2026-10-11-minimal-v1-specification-01-work-skill
  - 2026-10-11-minimal-v1-specification-02-validator-and-manifest
  - 2026-10-11-minimal-v1-specification-03-ci-and-update
  - 2026-10-11-minimal-v1-specification-04-contract-distribution
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
2. Update `standalone.ts`, `update.mjs`, create `.agents/skills/work/`, update `bundle.json`, rebuild `validate.js`, add tests in `bundle.test.ts` (Commit C).
3. Regenerate `manifest.json` at C and commit `manifest.json` alone (Commit M).
4. Run full test suite and validation suite.
5. Update this record with verification evidence and mark `verified`.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline suites before the change | pass | a987ff1 | `G_INGA_REQUIRE_RUNTIMES=1 mise run test`: 114 pass, 0 fail; `mise run validate`: pass |
| AC1 | .agents/skills/work/ assets delivered | not run | a987ff1 | pending implementation |
| AC2 | BUNDLE_SCOPE updated in validator and updater | not run | a987ff1 | pending implementation |
| AC3 | bundle.json and manifest.json cover .agents/ assets | not run | a987ff1 | pending implementation |
| AC4 | update.mjs multi-host target behavior | not run | a987ff1 | pending implementation |
| AC5 | bundle tests cover Antigravity assets | not run | a987ff1 | pending implementation |
| AC6 | repository test and validation suites pass | not run | a987ff1 | pending implementation |
| R1 | repository test suite | not run | a987ff1 | pending implementation |
| R2 | repository validation suite | not run | a987ff1 | pending implementation |
| V1 | diff review against AC1–AC6 | not run | a987ff1 | pending implementation |

## Checkpoint

- as of: 2026-10-11, branch feat/v1-work-self-hosting, head a987ff1, worktree dirty (this record only)
- done: opened task record as active before implementation
- open: AC1–AC6 implementation
- next: implement .agents/skills/work/ and multi-host validator/updater support
