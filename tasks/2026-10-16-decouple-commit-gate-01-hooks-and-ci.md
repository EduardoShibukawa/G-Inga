---
schema: task/1
tier: standard
status: active
spec: 2026-10-16-decouple-commit-gate-and-trunk-linear-history@1
---

# Repoint pre-commit to authoring validation and keep full validation in CI

## Routing and approvals

- tier: standard (S1–S8 pass: configuration change to mise tasks and CI templates within approved spec)
- parent: tasks/2026-10-16-decouple-commit-gate-and-trunk-linear-history.md

## Objective

Configure `mise.toml` so that `[tasks.pre-commit]` runs `validate:authoring`, speeding up the local commit hook (`hk.pkl`), and verify that CI workflows (`.github/workflows/validate.yml` and `tools/validate/ci-template.yml`) retain full `mise run validate` enforcement before merge.

In scope:

- Adding `[tasks."validate:authoring"]` to `mise.toml` running `bun run validate:authoring`.
- Updating `[tasks.pre-commit]` in `mise.toml` to depend on `["validate:authoring"]`.
- Verifying `hk.pkl` runs `mise run pre-commit`.
- Verifying `.github/workflows/validate.yml` and `tools/validate/ci-template.yml` execute `mise run validate`.

Out of scope:

- Changing validator JavaScript / TypeScript code.

## Acceptance criteria

SC1, SC2, SC3 from spec `2026-10-16-decouple-commit-gate-and-trunk-linear-history@1`.

## Plan

1. Edit `mise.toml` to add `tasks."validate:authoring"` and point `[tasks.pre-commit]` to it.
2. Inspect `hk.pkl` and `.github/workflows/validate.yml` to verify alignment.
3. Run `mise run pre-commit` and verify fast completion and proper exit code.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | mise run pre-commit before change | pass | 75d2f05 | Runs full validate taking ~50s |
| AC1 | mise.toml has validate:authoring task | not run | - | |
| AC2 | mise.toml pre-commit depends on validate:authoring | not run | - | |
| AC3 | CI workflows require mise run validate | not run | - | |
| V1 | Diff inspection against plan and out-of-scope | not run | - | |

## Review

- reviewer: skip: child task of heavy parent
- verdict: -
- findings: none

## Outcome

In progress.

## Checkpoint

- as of: 2026-10-16, branch `work/2026-10-16-decouple-commit-gate-and-trunk-linear-history`, head 75d2f05, worktree clean
- done: child 01 authored with baseline B1 established
- active: plan step 1
- blocked: none
- next: update mise.toml
- revalidate: none
