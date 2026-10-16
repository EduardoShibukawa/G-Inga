---
schema: task/1
tier: standard
status: todo
spec: 2026-10-16-decouple-commit-gate-and-trunk-linear-history@1
---

# Refactor §7.1 history walk to use --first-parent with regression tests

## Routing and approvals

- tier: standard (S1–S8 pass: refactoring history walk algorithm within approved spec)
- parent: tasks/2026-10-16-decouple-commit-gate-and-trunk-linear-history.md

## Objective

Refactor `checkHistory()` in `tools/validate/artifacts/history.ts` to traverse commits using `git rev-list --first-parent --reverse HEAD -- tasks specs intents`. Add tests in `tools/validate/artifacts/artifacts.test.ts` verifying that `--first-parent` is used and that merging a branch with older task records does not trigger spurious `verified → todo` errors.

In scope:

- Updating `tools/validate/artifacts/history.ts` to invoke `git rev-list` with `--first-parent`.
- Adding unit and regression tests in `tools/validate/artifacts/artifacts.test.ts`.
- Verifying all 399+ tests pass cleanly.

Out of scope:

- Removing commit-order ancestry verification (`B` rows as ancestors of `verified_at`).

## Acceptance criteria

SC4 and SC5 from spec `2026-10-16-decouple-commit-gate-and-trunk-linear-history@1`.

## Plan

1. Update `tools/validate/artifacts/history.ts` to pass `--first-parent` to `rev-list`.
2. Add regression tests in `tools/validate/artifacts/artifacts.test.ts`.
3. Run `bun test` and ensure all tests pass.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | bun test artifacts.test.ts before change | pass | 75d2f05 | Current tests pass |
| AC1 | history.ts passes --first-parent to rev-list | not run | - | |
| AC2 | artifacts.test.ts verifies --first-parent behavior | not run | - | |
| AC3 | bun test passes | not run | - | |
| V1 | Diff review against plan and out-of-scope | not run | - | |

## Review

- reviewer: skip: child task of heavy parent
- verdict: -
- findings: none

## Outcome

Pending execution of child 01.

## Checkpoint

- as of: 2026-10-16, branch `work/2026-10-16-decouple-commit-gate-and-trunk-linear-history`, head 75d2f05, worktree clean
- done: child 02 authored with baseline B1 established
- active: none
- blocked: waiting for child 01
- next: execute child 01
- revalidate: none
