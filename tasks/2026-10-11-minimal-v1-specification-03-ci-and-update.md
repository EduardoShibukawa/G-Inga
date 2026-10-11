---
schema: task/1
tier: standard
status: verified
parent: 2026-10-11-minimal-v1-specification
spec: 2026-10-11-minimal-v1-specification@1
depends_on:
  - 2026-10-11-minimal-v1-specification-02-validator-and-manifest
verified_at: "7cf22c1"
---

# CI Gate Template, Bundle Update Procedure, and Target Repo Installation Verification

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-11-minimal-v1-specification)

## Objective

Deliver the CI workflow definition template for target repositories (`tools/validate/ci-template.yml`), the atomic idempotent update script (`tools/validate/update.mjs`), and execute isolated installation tests on a throwaway Git repository, strictly satisfying SC1, SC6, and SC7.

- In scope: target CI merge gate template (`tools/validate/ci-template.yml`), idempotent bundle update script (`tools/validate/update.mjs`), isolated throwaway repo installation verification, non-destructive user file preservation proof.
- Out of scope: git commit hooks, plugin packaging.

## Acceptance criteria

- AC1: Target repository CI workflow runs offline from checkout with Node 22 (SC1, SC7).
- AC2: CI gate honestly disclaims automated merge enforcement unless required status checks are configured (SC7).
- AC3: Bundle update procedure (`update.mjs`) updates bundle assets idempotently without overwriting user files in `tasks/` or `specs/` (SC6).
- AC4: Isolated target repository test passes completely in throwaway git environment.

## Plan

1. Author `tools/validate/ci-template.yml` with honest merge gate disclaimer.
2. Implement `tools/validate/update.mjs` ensuring atomic non-destructive copy.
3. Test installation in throwaway Git repository verifying zero user-file tampering.
4. Record evidence and transition to verified.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation suite | pass | 5faf6af | `mise run validate` (exit 0) |
| AC1 | target CI workflow definition check | pass | 7cf22c1 | `tools/validate/ci-template.yml` specifies checkout with full depth and Node 22 |
| AC2 | honest CI enforcement disclaimer | pass | 7cf22c1 | comments in CI template state branch protection requirement |
| AC3 | idempotent non-destructive bundle update | pass | 7cf22c1 | verified in throwaway repo; tasks/user-task.md preserved intact |
| AC4 | isolated target repository installation test | pass | 7cf22c1 | clean install and execution of `node tools/validate/validate.js` |
| R1 | repository validation suite | pass | 7cf22c1 | `mise run validate` (exit 0) |
| V1 | diff review against SC1, SC6, SC7 | pass | 7cf22c1 | fully conforms to specification criteria |

## Checkpoint

- as of: 2026-10-11, branch feat/v1-work-self-hosting, head 7cf22c1, worktree dirty
- done: CI template, update procedure, and target installation verified on commit 7cf22c1
- next: commit child task 03, integrate evidence into parent heavy task, and run fresh-context review

## Outcome

Delivered `tools/validate/ci-template.yml` and `tools/validate/update.mjs`. Verified isolated target repository installation and non-destructive user file preservation. All criteria pass.
