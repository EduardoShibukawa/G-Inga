---
schema: task/1
tier: standard
status: verified
verified_at: "24dc79b"
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
| AC1 | docs/artifact-contracts.md updated | pass | 24dc79b | Updated in commit c7e901d |
| AC2 | contract-copy.mjs --check passes | pass | 24dc79b | contract copy matches canonical contract |
| AC3 | validate.js and manifest.json updated | pass | 24dc79b | validate.js rebuilt in c7e901d, manifest regenerated in 24dc79b |
| AC4 | bun run validate && bun test pass | pass | 24dc79b | bun run validate passes, bun test passes (400 tests) |
| V1 | Diff review against plan and out-of-scope | pass | 24dc79b | Clean sync of bundle and contract copy |

## Review

- reviewer: skip: child task of heavy parent
- verdict: pass
- findings: none

## Outcome

`docs/artifact-contracts.md` updated with ADR 0015 definitions, contract copy regenerated in `skills/work/references/artifact-contracts.md`, validator bundle rebuilt as `tools/validate/validate.js`, and `manifest.json` regenerated and verified.

## Checkpoint

- as of: 2026-10-16, branch `work/2026-10-16-decouple-commit-gate-and-trunk-linear-history`, head 24dc79b, task verified
- done: AC1, AC2, AC3, AC4, V1 verified at 24dc79b
- active: none
- blocked: none
- next: finalize parent task verification
- revalidate: none
