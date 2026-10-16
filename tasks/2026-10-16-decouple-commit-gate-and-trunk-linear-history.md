---
schema: task/1
tier: heavy
status: verified
verified_at: "259af09"
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
| SC1 | mise.toml defines validate:authoring | pass | 259af09 | Defined in mise.toml line 34 |
| SC2 | mise.toml pre-commit depends on validate:authoring | pass | 259af09 | Configured in mise.toml line 39 |
| SC3 | CI workflow runs mise run validate | pass | 259af09 | .github/workflows/validate.yml pre-commit job runs mise run validate |
| SC4 | history.ts invokes rev-list with --first-parent | pass | 259af09 | checkHistory uses --first-parent in rev-list |
| SC5 | artifacts.test.ts verifies --first-parent behavior | pass | 259af09 | Unit and regression tests passing |
| SC6 | bun run validate && bun test pass | pass | 259af09 | validate passes, bun test passes (400 tests) |
| V1 | Full diff review against SC1–SC6 and out-of-scope list | pass | 259af09 | All criteria verified across children 01, 02, and 03 |

## Review

- reviewer: independent verification gate and multi-agent peer review
- verdict: pass
- findings: none (all criteria SC1–SC6 satisfied, 400 tests passing)

## Outcome

Decoupling of commit gate and trunk-linear history walk delivered:

1. Pre-commit hook now runs `validate:authoring`, reducing commit latency and eliminating history walk during local development.
2. Full repository audit remains strictly enforced on pull requests and pushes to `main` via GitHub Actions CI workflow.
3. §7.1 history walk refactored to `--first-parent`, linearizing merge commits on trunk and eliminating DAG interleaving false positives.
4. Contract documentation, contract copy, validator bundle, and manifest fully synchronized and passing 400 tests.

## Checkpoint

- as of: 2026-10-16, branch `work/2026-10-16-decouple-commit-gate-and-trunk-linear-history`, head 259af09, task verified
- done: children 01, 02, and 03 verified; parent heavy task verified at 259af09
- active: none
- blocked: none
- next: commit task records, push branch and open pull request
- revalidate: none
