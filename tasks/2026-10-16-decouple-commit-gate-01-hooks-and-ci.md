---
schema: task/1
tier: standard
status: verified
verified_at: "85f7237"
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
| AC1 | mise.toml has validate:authoring task | pass | 85f7237 | Defined in mise.toml line 34 |
| AC2 | mise.toml pre-commit depends on validate:authoring | pass | 85f7237 | Configured in mise.toml line 39 |
| AC3 | CI workflows require mise run validate | pass | 85f7237 | .github/workflows/validate.yml pre-commit job runs mise run validate |
| V1 | Diff inspection against plan and out-of-scope | pass | 85f7237 | Clean diff touching only mise.toml and validate.yml |

## Review

- reviewer: skip: child task of heavy parent
- verdict: pass
- findings: none

## Outcome

`mise.toml` now defines `validate:authoring` and points `pre-commit` to it, speeding up local commits and eliminating DAG history checks from local authoring. The CI workflow `.github/workflows/validate.yml` retains full `mise run validate` enforcement under the `pre-commit` job name required by GitHub branch protection.

## Checkpoint

- as of: 2026-10-16, branch `work/2026-10-16-decouple-commit-gate-and-trunk-linear-history`, head 85f7237, task verified
- done: AC1, AC2, AC3, V1 verified at 85f7237
- active: none
- blocked: none
- next: execute child 02
- revalidate: none
