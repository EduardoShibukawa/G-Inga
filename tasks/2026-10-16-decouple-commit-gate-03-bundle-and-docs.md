---
schema: task/1
tier: standard
status: todo
spec: 2026-10-16-decouple-commit-gate-and-trunk-linear-history@1
---

# Update contract documentation, sync contract copies, and rebuild bundle

## Routing and approvals

- tier: standard (S1–S8 pass: documentation and bundle sync within approved spec)
- parent: tasks/2026-10-16-decouple-commit-gate-and-trunk-linear-history.md

## Objective

Document the decoupled pre-commit authoring scope and `--first-parent` history walk in `docs/artifact-contracts.md`, sync `skills/work/references/artifact-contracts.md` via `contract-copy.mjs`, rebuild the validator bundle (`validate.js`), update `manifest.json`, and run end-to-end verification.

In scope:

- Updating `docs/artifact-contracts.md` (§7.1 and related text).
- Running `bun tools/validate/contract-copy.mjs`.
- Rebuilding `tools/validate/validate.js` and updating `manifest.json`.
- End-to-end verification: `bun run validate` and `bun test`.

Out of scope:

- Changing task or spec frontmatter schemas.

## Acceptance criteria

SC6 from spec `2026-10-16-decouple-commit-gate-and-trunk-linear-history@1`.

## Plan

1. Update `docs/artifact-contracts.md`.
2. Run `bun tools/validate/contract-copy.mjs`.
3. Rebuild `validate.js` and regenerate `manifest.json`.
4. Run full `bun run validate` and `bun test`.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | contract-copy.mjs --check before change | pass | 75d2f05 | Current copy in sync |
| AC1 | docs/artifact-contracts.md updated | not run | - | |
| AC2 | contract-copy.mjs --check passes | not run | - | |
| AC3 | validate.js and manifest.json updated | not run | - | |
| AC4 | bun run validate && bun test pass | not run | - | |
| V1 | Diff review against plan and out-of-scope | not run | - | |

## Review

- reviewer: skip: child task of heavy parent
- verdict: -
- findings: none

## Outcome

Pending execution of children 01 and 02.

## Checkpoint

- as of: 2026-10-16, branch `work/2026-10-16-decouple-commit-gate-and-trunk-linear-history`, head 75d2f05, worktree clean
- done: child 03 authored with baseline B1 established
- active: none
- blocked: waiting for children 01 and 02
- next: execute child 01
- revalidate: none
