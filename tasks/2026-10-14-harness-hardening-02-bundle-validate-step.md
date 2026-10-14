---
schema: task/1
tier: standard
status: todo
parent: 2026-10-14-harness-hardening
spec: 2026-10-14-harness-hardening@1
depends_on:
  - 2026-10-14-harness-hardening-01-commit-gate
---

# Bundle Validator Step

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-14-harness-hardening after spec v1 approval)

## Objective

Ship the G-Ingá validator as the `g-inga:validate` mise file task inside the pinned bundle and its integrity manifest, and prove a target repository can compose it into its `pre-commit` task.

- In scope: bundle layout, manifest generation, a fixture target repository in tests, adoption docs.
- Out of scope: changing validator rules; publishing a release tag.

## Acceptance criteria

- AC1 = SC2.
- AC2: the adoption doc names the one change a target repository makes, and the fallback from ADR 0009 §2 if child 01's spike chose it.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | 2edf21e | parent B1/B2: `mise run validate` exit 0, `mise run test` 242 pass |

## Plan

1. Add the file task to the bundle; regenerate the manifest.
2. Fixture target repository test: invalid record rejected, valid accepted.
3. Document adoption.
