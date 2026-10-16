---
schema: task/1
tier: heavy
status: verified
verified_at: "070dbaa"
spec: 2026-10-16-canonical-skills-root-layout@1
---

# Canonical skills root layout migration

## Routing and approvals

- tier: heavy (H1, H3, H4)
- confirmed: heavy by owner (2026-10-16, "Executar pipeline contínuo de governança, sincronização arquitetural e entrega")
- approved: spec v1 by owner (2026-10-16, "Aprovar intents/2026-10-16-canonical-skills-root-layout.md gerando spec aprovada com ACs")

## Objective

Unify harness skills into a single canonical `skills/` directory at the repository root, serving Claude Code, Google Antigravity, and OpenCode via symlinks without code duplication, while updating packaging, contract copy, and validation checks.

In scope:

- Canonical root `skills/` directory housing all harness skills (`drive`, `orchestrate`, `sharpen`, `validator-flow`, `work`).
- Symlinks for `.claude/skills`, `.agents/skills`, and `.opencode/skills`.
- Updates to `.claude-plugin/plugin.json` and `packages/opencode-plugin/index.ts`.
- Contract copy, bundle, and manifest synchronization (`tools/validate/contract-copy.mjs`, `tools/validate/bundle.json`, `manifest.json`).
- Contamination assertion updates in `tools/eval/ab_runner.ts` and `tools/eval/ab_runner.test.ts`.
- Validator updates in `tools/validate/lib/markdown.ts` to skip duplicate symlinks.
- End-to-end verification and Gira-G synchronization.

Out of scope:

- Modifying core task or spec schemas.
- External package registries or npm publishing.

## Acceptance criteria

SC1–SC8 from spec `2026-10-16-canonical-skills-root-layout@1`. Parent also tracks child verification.

## Plan

1. 2026-10-16-canonical-skills-root-layout-01-canonical-directory: Migrate skills to root `skills/` and create host symlinks
2. 2026-10-16-canonical-skills-root-layout-02-tooling-and-bundle: Update contract copy, bundle, manifest, ab_runner, and validator
3. 2026-10-16-canonical-skills-root-layout-03-integration-and-verification: End-to-end verification, macro-map synchronization, and integration

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | bun run validate baseline | pass | 3bd870f | Pre-change validation baseline |
| B2 | bun test baseline | pass | 3bd870f | Pre-change test baseline (332 passed) |
| SC1 | ls skills/ contains 5 skills | pass | 070dbaa | Root skills/ directory contains all 5 skills |
| SC2 | readlink host directories | pass | 070dbaa | Host directories (.claude/skills, .agents/skills, .opencode/skills) symlinked |
| SC3 | cat .claude-plugin/plugin.json | pass | 070dbaa | .claude-plugin/plugin.json specifies ./skills/ |
| SC4 | packages/opencode-plugin/index.ts | pass | 070dbaa | packages/opencode-plugin/index.ts searches skills/ |
| SC5 | contract-copy.mjs --check | pass | 070dbaa | contract-copy.mjs verifies skills/work/references/artifact-contracts.md |
| SC6 | manifest.mjs --check | pass | 070dbaa | bundle.json and manifest.json updated for skills/ |
| SC7 | bun test tools/eval/ab_runner.test.ts | pass | 070dbaa | ab_runner.ts detects and strips root skills/ |
| SC8 | bun run validate && bun test | pass | 070dbaa | bun run validate and bun test pass (362 tests), gira index at 0 lag |
| V1 | full verification pass | pass | 070dbaa | Full verification passed |

## Review

- reviewer: independent verification gate and multi-agent peer review
- verdict: pass
- findings: none (all criteria SC1–SC8 satisfied)

## Outcome

Canonical skills root layout migration delivered. All harness skills unified under root `skills/`, distributed via relative symlinks to Claude Code, Antigravity, and OpenCode without code duplication. Packaging, bundle, and verification tools updated. 362 tests passing, 0 lint or contract errors, 0 lag in architectural index.

## Checkpoint

- as of: 2026-10-16, branch `work/canonical-skills-03-integration`, head 070dbaa, worktree clean
- done: intent approved; ADR 0014 authored and accepted; spec approved v1; children 01, 02, and 03 all verified; parent verified at 070dbaa
- active: none
- blocked: none
- next: open PR and merge to main
- revalidate: none
