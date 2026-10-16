---
schema: task/1
tier: heavy
status: active
spec: 2026-10-16-decouple-commit-gate-and-trunk-linear-history@1
---

# Decouple commit-gate scope to authoring validation in pre-commit and trunk-linear history walk in CI

## Routing and approvals

- tier: heavy (H1, H3, H4: modifies Git hooks, CI workflow, validator core history algorithm, amends ADR 0009 and ADR 0012)
- confirmed: heavy by owner (2026-10-16, "sim vamos use subagents")
- approved: spec v1 by owner (2026-10-16, "sim")

## Objective

Decouple the commit-gate execution scope so that the Git pre-commit hook runs fast authoring validation while CI enforces the full repository audit gate, and refactor the §7.1 history walk to follow `--first-parent` along trunk, eliminating DAG-interleaving false positives.

In scope:

- Updating `mise.toml` to add `tasks."validate:authoring"` and repoint `[tasks.pre-commit]` to depend on `["validate:authoring"]`.
- Verifying `hk.pkl` runs `mise run pre-commit`.
- Ensuring CI (`.github/workflows/validate.yml` and `tools/validate/ci-template.yml`) runs full `mise run validate`.
- Refactoring `checkHistory()` in `tools/validate/artifacts/history.ts` to use `git rev-list --first-parent --reverse HEAD -- tasks specs intents`.
- Adding unit and regression tests in `tools/validate/artifacts/artifacts.test.ts`.
- Updating documentation in `docs/artifact-contracts.md` and syncing contract copies and bundle.
- Full verification through `bun test` and `bun run validate`.

Out of scope:

- Removing commit-order verification (`B` rows as ancestors of `verified_at`) in full gate mode.
- Changing task or spec frontmatter schemas.
- Removing or altering universal markdownlint rules.

## Acceptance criteria

SC1–SC6 from spec `2026-10-16-decouple-commit-gate-and-trunk-linear-history@1`. Parent also tracks child verification.

## Plan

1. 2026-10-16-decouple-commit-gate-01-hooks-and-ci: Repoint pre-commit to authoring validation and keep full validation in CI
2. 2026-10-16-decouple-commit-gate-02-first-parent-history-walk: Refactor §7.1 history walk to use `--first-parent` with regression tests
3. 2026-10-16-decouple-commit-gate-03-bundle-and-docs: Update contract documentation, sync contract copies, and rebuild bundle

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | bun run validate baseline on main | pass | 75d2f05 | Pre-change validation baseline on main |
| B2 | bun test baseline on main | pass | 75d2f05 | Pre-change test baseline (399 tests pass) |
| SC1 | mise.toml defines validate:authoring | not run | - | |
| SC2 | mise.toml pre-commit depends on validate:authoring | not run | - | |
| SC3 | CI workflow runs mise run validate | not run | - | |
| SC4 | history.ts invokes rev-list with --first-parent | not run | - | |
| SC5 | artifacts.test.ts verifies --first-parent behavior | not run | - | |
| SC6 | bun run validate && bun test pass | not run | - | |
| V1 | Full diff review against SC1–SC6 and out-of-scope list | not run | - | |

## Review

- reviewer: skip: initial authoring of heavy task and spec
- verdict: -
- findings: none

## Outcome

In progress.

## Checkpoint

- as of: 2026-10-16, branch `work/2026-10-16-decouple-commit-gate-and-trunk-linear-history`, head 75d2f05, worktree clean
- done: ADR 0015 accepted; spec v1 drafted and approved with SHA-256 hash; parent task authored with baseline B1–B2 established
- active: 2026-10-16-decouple-commit-gate-01-hooks-and-ci
- blocked: none
- next: decompose child tasks 01, 02, and 03
- revalidate: none
