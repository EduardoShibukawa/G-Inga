---
schema: spec/1
status: approved
version: 1
approved_version: 1
approved_hash: sha256:ec87caa9123f809a347694d97a59ecaa6f5752d0241d320feebb90e13624be93
---
# Canonical skills root layout migration

## Problem

Harness skills are currently duplicated across `.claude/skills/` (for Claude Code) and `.agents/skills/` (for Google Antigravity), while `.opencode/skills/` and `packages/opencode-plugin/` rely on separate symlinks or paths. Changes made to one skill tree (such as model policies, session checkpointing, and verification procedures) require manual mirroring across hosts, leading to parity drift, maintenance overhead, and inconsistencies across execution environments.

ADR 0005 FU2 established project-local copies committed under dedicated bundle directories (`.claude/skills/work/`, etc.), while ADR 0005 FU7 established a personal plugin channel reading `.claude/skills/`.

## Expected behavior

- A single canonical `skills/` directory at the repository root houses all harness skills (`drive`, `orchestrate`, `sharpen`, `validator-flow`, `work`).
- Host environments (Claude Code, Google Antigravity, OpenCode) consume skills seamlessly via symlinks (`.claude/skills`, `.agents/skills`, `.opencode/skills`) pointing to the root `skills/` directory without code duplication.
- `.claude-plugin/plugin.json` specifies `"skills": ["./skills/"]`, enabling the personal plugin channel to discover canonical root skills directly.
- `packages/opencode-plugin/index.ts` prioritizes root `skills/` in `SKILL_ROOTS`.
- `tools/validate/contract-copy.mjs` generates the contract copy directly into `skills/work/references/artifact-contracts.md` with link prefix `../../../docs/`.
- `tools/validate/bundle.json` and `manifest.json` specify assets under `skills/`.
- `tools/eval/ab_runner.ts` asserts absence of `skills/` alongside `.claude/skills` and `.agents/skills` during benchmark baseline runs.
- `tools/validate/lib/markdown.ts` does not traverse symlink directories to prevent duplicate linting and false link errors.
- Deterministic checks (`bun run validate` and `bun test`) pass completely.

## Scope

In scope:

- Canonical root `skills/` directory housing all harness skills.
- Host directory symlinks for `.claude/skills`, `.agents/skills`, and `.opencode/skills`.
- Configuration and plugin manifest updates (`.claude-plugin/plugin.json`, `packages/opencode-plugin/index.ts`).
- Packaging and validation updates (`tools/validate/contract-copy.mjs`, `tools/validate/bundle.json`, `manifest.json`, `tools/validate/bundle.test.ts`).
- Contamination assertion updates in `tools/eval/ab_runner.ts` and `tools/eval/ab_runner.test.ts`.
- Validator markdown traversal update in `tools/validate/lib/markdown.ts` to skip symlinked skill directories.
- Full verification and Gira-G synchronization.

Out of scope:

- Renaming skill names or altering skill interface command signatures.
- Modifying core task or spec schemas.
- External package registries or npm publishing.

## Acceptance criteria

- SC1: Canonical root `skills/` exists and contains all 5 harness skills: `drive`, `orchestrate`, `sharpen`, `validator-flow`, `work`.
- SC2: Host directories `.claude/skills`, `.agents/skills`, and `.opencode/skills` point to root `skills` via symlinks without duplicating file content in Git.
- SC3: `.claude-plugin/plugin.json` specifies `"skills": ["./skills/"]`.
- SC4: `packages/opencode-plugin/index.ts` includes `join(REPO_ROOT, "skills")` as primary entry in `SKILL_ROOTS`.
- SC5: `tools/validate/contract-copy.mjs` manages `skills/work/references/artifact-contracts.md` with link prefix `../../../docs/`, passing `--check`.
- SC6: `tools/validate/bundle.json` and `manifest.json` reflect the canonical `skills/` layout.
- SC7: `tools/eval/ab_runner.ts` and `ab_runner.test.ts` verify absence of `skills/` alongside `.claude/skills` and `.agents/skills` in baseline contamination assertions.
- SC8: `bun run validate` and `bun test` pass with 0 failures, and `gira index` indexes the new layout with 0 lag.

## Interfaces and dependencies

- Origin intent artifact `intents/2026-10-16-canonical-skills-root-layout.md`.
- Architectural decision record `docs/decisions/0014-canonical-skills-root-layout.md` amending ADR 0005.
- Repository validation harness in `tools/validate/` and Bun test runner.

## Decisions

- **Single root `skills/` directory:** Canonical authoring source of truth for all skills is located at repo root `skills/`. (ADR 0014 §1)
- **Symlink distribution:** Host-specific directories (`.claude/skills`, `.agents/skills`, `.opencode/skills`) are relative symlinks (`../skills`) to avoid redundant files in Git. (ADR 0014 §2)
- **Link prefix adjustment:** Relative links from `skills/work/references/` to `docs/` use `../../../docs/` reflecting depth 3.
- **Symlink traversal guard in validator:** Validator `listMarkdown` skips symlink directories to avoid duplicate linting and preserve deterministic link checks.

## Risks and constraints

- **Symlink compatibility across platforms:** Relative symlinks are standard in Git and POSIX filesystems.
- **Path divergence in procedures:** All references inside skills are reviewed to ensure relative references resolve correctly.
- **Contamination leaks:** Explicitly stripped by `ab_runner.ts` during baseline evaluations.

## Verification

- `bun tools/validate/contract-copy.mjs --check` passes.
- `bun test tools/validate/bundle.test.ts` passes.
- `bun test tools/eval/ab_runner.test.ts` passes.
- `bun run validate` passes with 0 issues.
- `bun test` passes with 0 failures.
- `gira index` succeeds with 0 commits of lag.

## Rollback

skip: Clean Git revert of migration commits restores previous `.claude/skills/` and `.agents/skills/` directories without data loss.

## Open questions

None (settled by owner in intent `intents/2026-10-16-canonical-skills-root-layout.md`).

## Revisions

- v1: Initial approved specification formulated from approved intent `intents/2026-10-16-canonical-skills-root-layout.md` and ADR 0014.
