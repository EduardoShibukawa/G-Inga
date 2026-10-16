---
schema: task/1
tier: heavy
status: active
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

| Check | Ref | Status | Note |
|---|---|---|---|
| B1 `bun run validate` | 3bd870f | pass | Pre-change validation baseline |
| B2 `bun test` | 3bd870f | pass | Pre-change test baseline (332 passed) |

## Review

skip: active parent awaiting children completion

## Checkpoint

- as of: 2026-10-16, branch `work/canonical-skills-03-integration`, head bbc898b, worktree clean
- done: intent approved; ADR 0014 authored and accepted; spec approved v1; children 01 (verified at fdbc022) and 02 (verified at bbc898b) completed; child 03 completed
- active: 2026-10-16-canonical-skills-root-layout-03-integration-and-verification
- blocked: none
- next: verify parent epic upon integration completion
- revalidate: B1 and B2 pass on 3bd870f
