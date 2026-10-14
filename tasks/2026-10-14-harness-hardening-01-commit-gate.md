---
schema: task/1
tier: standard
status: todo
parent: 2026-10-14-harness-hardening
spec: 2026-10-14-harness-hardening@1
---

# Commit Gate with mise and hk

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-14-harness-hardening after spec v1 approval)

## Objective

Install the ADR 0009 commit gate in this repository: hk pinned through mise, a `postinstall` hook running `hk install`, a `pre-commit` mise task that hk runs, a deny rule for `--no-verify`, and a CI job running `mise run pre-commit`.

- In scope: `mise.toml`, `mise.lock`, `hk.pkl`, mise task files, checked-in `.claude/settings.json` permissions, `.github/workflows/`, tests and docs for the gate.
- Out of scope: the bundle step (child 02); branch protection (owner action on the parent).

## Acceptance criteria

- AC1: spike recorded: whether a TOML `depends` can name a namespaced mise file task, with the mise version; the result picks ADR 0009 §2 path or its fallback.
- AC2 = SC1.
- AC3 = SC3, except the branch-protection readback, which the parent records.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | 2edf21e | parent B1/B2: `mise run validate` exit 0, `mise run test` 242 pass |

## Plan

1. Spike file-task `depends` in a scratch repository and record the result.
2. Pin hk through mise; add the `postinstall` hook and `hk.pkl` whose pre-commit step runs `mise run pre-commit`.
3. Add the `pre-commit` mise task depending on `validate`.
4. Add the `--no-verify` / `-n` deny rule to checked-in project settings.
5. Add the CI job; tests that create a throwaway repository and prove SC1.
