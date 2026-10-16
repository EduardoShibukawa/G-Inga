---
schema: task/1
tier: standard
status: todo
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

| Check | Ref | Status | Note |
|---|---|---|---|
| B1 `bun test tools/validate/bundle.test.ts` | 3bd870f | pass | Pre-change bundle tests pass |
| B2 `bun test tools/eval/ab_runner.test.ts` | 3bd870f | pass | Pre-change ab_runner tests pass |

## Checkpoint

- as of: 2026-10-16, branch `work/canonical-skills-root-layout`, head 3bd870f, worktree clean
- done: task authored
- active: none
- blocked: none
- next: dispatch execution
- revalidate: B1 and B2 pass on 3bd870f
