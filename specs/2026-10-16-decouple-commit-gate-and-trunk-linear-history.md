---
schema: spec/1
status: approved
version: 1
approved_version: 1
approved_hash: sha256:b2a80769fdb9ad777b8b21d9a9f3c4fc616cbadb2ffb77e980faf2e39c5d0802
---
# Decouple commit-gate scope to authoring validation in pre-commit and trunk-linear history walk in CI

## Problem

Under ADR 0009 §2 and ADR 0012, every local `git commit` paid the cost of the full repository validation gate, including Puppeteer-based Mermaid SVG rendering and a Git history walk across 230+ commits. This imposed a 50–70s latency penalty per commit, degrading developer and agent flow and inflating token costs per verified task. Furthermore, the §7.1 history walk used `git rev-list --reverse HEAD`, which flattened the Git commit DAG chronologically, causing spurious failures (such as phantom `verified → todo` regressions) whenever sibling branches were merged into `main`.

## Expected behavior

- The Git pre-commit hook (`hk.pkl` -> `mise run pre-commit`) runs authoring validation (`mise run validate:authoring`), executing in seconds by checking only staged/working tree syntax, frontmatter, schemas, and links without traversing Git history.
- The continuous integration gate (`.github/workflows/validate.yml` and `tools/validate/ci-template.yml`) runs full validation (`mise run validate`), ensuring all historical invariants, commit-order ancestry, Mermaid diagrams, and universal checks pass before pull requests can merge.
- The Git history walk in `tools/validate/artifacts/history.ts` traverses commits using `--first-parent`, linearizing the commit history along trunk or the current branch and eliminating spurious status-transition bugs caused by sibling branch interleaving.
- All existing and new tests in `tools/validate/artifacts/artifacts.test.ts` pass, and `bun run validate` passes cleanly.

## Scope

In scope:

- Updating `mise.toml` to add `tasks."validate:authoring"` and configuring `[tasks.pre-commit]` to depend on `validate:authoring`.
- Updating CI templates (`tools/validate/ci-template.yml`) and `.github/workflows/validate.yml` to ensure full `mise run validate` runs on PR and push.
- Refactoring `checkHistory()` in `tools/validate/artifacts/history.ts` to use `git rev-list --first-parent --reverse HEAD -- tasks specs intents`.
- Adding unit and regression tests in `tools/validate/artifacts/artifacts.test.ts`.
- Updating documentation in `docs/artifact-contracts.md` and synchronizing contract copy.

Out of scope:

- Removing commit-order verification (`B` rows as ancestors of `verified_at`) in full gate mode.
- Changing task or spec frontmatter schemas.
- Removing or altering universal markdownlint rules.

## Acceptance criteria

- SC1: `mise.toml` defines `[tasks."validate:authoring"]` running `bun run validate:authoring`.
- SC2: `mise.toml` defines `[tasks.pre-commit]` with `depends = ["validate:authoring"]`.
- SC3: CI workflow (`.github/workflows/validate.yml`) and `tools/validate/ci-template.yml` run `mise run validate` as the required merge audit check.
- SC4: `tools/validate/artifacts/history.ts` invokes `rev-list` with `--first-parent` for the history walk.
- SC5: `tools/validate/artifacts/artifacts.test.ts` includes regression tests verifying `--first-parent` history walk behavior.
- SC6: `bun run validate` and `bun test` pass cleanly.

## Interfaces and dependencies

- Pre-commit runner: `hk` and `mise`.
- CI runner: GitHub Actions workflow `validate`.
- Governance validator: `tools/validate/` and `tools/validate/artifacts/history.ts`.
- Architectural decisions: ADR 0009, ADR 0012, and ADR 0015.

## Decisions

- **Pre-commit boundary:** Local pre-commit runs `validate:authoring` only. (ADR 0015 §1)
- **CI audit boundary:** CI on pull requests and `main` runs full `validate`. (ADR 0015 §2)
- **Trunk-linear traversal:** The history walk uses `--first-parent` to evaluate canonical integration order. (ADR 0015 §3)

## Risks and constraints

- **Bypass risk:** A developer bypassing local authoring checks cannot merge red code because CI continues to enforce full validation prior to merge.
- **Branch traversal:** `--first-parent` follows the current branch lineage directly to merge base without descending into side branch internals.

## Verification

- `bun run validate:authoring` passes in local worktree.
- `bun test tools/validate/artifacts/artifacts.test.ts` passes with new `--first-parent` tests.
- `bun run validate` passes full repository audit.
- `bun test` passes all test suites.

## Rollback

skip: Changes can be reverted cleanly via Git without data loss.

## Open questions

None (settled by owner approval of ADR 0015).

## Revisions

- v1: Initial approved specification formulated from approved ADR 0015.
