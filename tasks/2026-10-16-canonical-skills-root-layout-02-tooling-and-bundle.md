---
schema: task/1
tier: standard
status: completed
parent: 2026-10-16-canonical-skills-root-layout
spec: 2026-10-16-canonical-skills-root-layout@1
---

# Canonical skills root layout: tooling, bundle, and validator updates

## Routing and approvals

- tier: standard (S1, S2)
- parent: 2026-10-16-canonical-skills-root-layout

## Objective

Update contract copy utility, bundle definition, manifest, contamination assertions, and validator markdown discovery to support the root `skills/` layout.

In scope:

- Update `tools/validate/contract-copy.mjs` (`CONTRACT_COPY = "skills/work/references/artifact-contracts.md"` and link prefix `../../../docs/`).
- Update `tools/validate/bundle.json` and regenerate `manifest.json`.
- Update `tools/eval/ab_runner.ts` and `tools/eval/ab_runner.test.ts` to assert absence of `skills/`.
- Update `tools/validate/bundle.test.ts` to assert `skills/work/` assets.
- Update `tools/validate/lib/markdown.ts` so `listMarkdown` skips symlink directories.

Out of scope:

- End-to-end integration and final macro-map synchronization (handled in child 03).

## Acceptance criteria

- AC1: `tools/validate/contract-copy.mjs` checks and generates `skills/work/references/artifact-contracts.md`.
- AC2: `tools/validate/bundle.json` and `manifest.json` reflect `skills/` assets.
- AC3: `tools/eval/ab_runner.ts` detects `skills/` during contamination checks.
- AC4: `tools/validate/lib/markdown.ts` avoids duplicate file listing on symlinks.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | check | pass | 3bd870f | Pre-change bundle tests pass |
| B2 | check | pass | 3bd870f | Pre-change ab_runner tests pass |
| AC1 | bun tools/validate/contract-copy.mjs --check | pass | 16f364a | Contract copy matches transform |
| AC2 | bun test tools/validate/bundle.test.ts | pass | 16f364a | Bundle tests pass |
| AC3 | bun test tools/eval/ab_runner.test.ts | pass | 16f364a | Contamination guard tests pass |
| AC4 | bun test tools/validate/artifacts/artifacts.test.ts | pass | 16f364a | Artifact contract tests pass |

## Checkpoint

- as of: 2026-10-16, branch `work/canonical-skills-02-tooling`, head 16f364a, worktree clean
- done: updated contract-copy, bundle.json, manifest.json, ab_runner contamination guards, and validator markdown discovery
- active: none
- blocked: none
- next: ready for integration and verification in child 03
- revalidate: none
