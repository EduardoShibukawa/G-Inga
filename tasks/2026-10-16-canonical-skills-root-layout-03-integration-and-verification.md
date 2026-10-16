---
schema: task/1
tier: standard
status: todo
parent: 2026-10-16-canonical-skills-root-layout
spec: 2026-10-16-canonical-skills-root-layout@1
---

# Canonical skills root layout: integration, macro-map, and verification

## Routing and approvals

- tier: standard (S1, S2)
- parent: 2026-10-16-canonical-skills-root-layout

## Objective

Run end-to-end repository validation and test suites, update Gira-G architectural index (`docs/architecture/macro-map.json`), and verify parent epic completion.

In scope:

- Run `bun run validate` and verify 0 issues across all layers.
- Run `bun test` and verify 100% pass across all test suites.
- Run `gira index` to update `docs/architecture/macro-map.json` and sync `gira.yaml` with 0 lag.
- Complete child and parent task records with verified transitions.

Out of scope:

- Structural changes to skills or tools (completed in children 01 and 02).

## Acceptance criteria

- AC1: `bun run validate` passes with 0 issues.
- AC2: `bun test` passes with 0 failures.
- AC3: `docs/architecture/macro-map.json` is synchronized with 0 commits of lag.
- AC4: Parent task `tasks/2026-10-16-canonical-skills-root-layout.md` verified.

## Verification

| Check | Ref | Status | Note |
|---|---|---|---|
| B1 `bun run validate` | 3bd870f | pass | Pre-change validation baseline |
| B2 `bun test` | 3bd870f | pass | Pre-change test baseline |

## Checkpoint

- as of: 2026-10-16, branch `work/canonical-skills-root-layout`, head 3bd870f, worktree clean
- done: task authored
- active: none
- blocked: none
- next: dispatch execution after children 01 and 02
- revalidate: B1 and B2 pass on 3bd870f
