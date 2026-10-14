---
schema: task/1
tier: standard
status: todo
parent: 2026-10-14-harness-hardening
spec: 2026-10-14-harness-hardening@1
depends_on:
  - 2026-10-14-harness-hardening-01-commit-gate
---

# Startup Warnings and Single Listing

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-14-harness-hardening after spec v1 approval)

## Objective

Ship a plugin `SessionStart` hook that warns when the plugin is stale or the Git hook is missing, and list each harness skill once in this repository.

- In scope: plugin `hooks/hooks.json`, the warning script and its tests, checked-in project settings disabling the plugin here, development docs.
- Out of scope: auto-updating the plugin; changing marketplace settings.

## Acceptance criteria

- AC1 = SC8.
- AC2 = SC9.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | 2edf21e | parent B1/B2: `mise run validate` exit 0, `mise run test` 242 pass |

## Plan

1. Pick the installed-commit source; write the script with a 24 h cache and a 3 s cap; fail open.
2. Tests: stale, current, missing hook, network down.
3. Disable `g-inga@g-inga` in this repository's checked-in settings; document why.
