---
schema: task/1
tier: standard
status: verified
parent: 2026-10-11-minimal-v1-specification
spec: 2026-10-11-minimal-v1-specification@1
depends_on:
  - 2026-10-11-minimal-v1-specification-02-validator-and-manifest
verified_at: "9b7ebb5"
---

# CI Gate Template, Bundle Update Procedure, and Target Repo Installation Verification

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-11-minimal-v1-specification)

## Objective

Deliver the CI workflow definition template for target repositories (`tools/validate/ci-template.yml`), the failure-atomic, idempotent update script (`tools/validate/update.mjs`), and execute isolated installation tests on a throwaway Git repository, strictly satisfying SC1, SC6, and SC7.

- In scope: target CI merge gate template (`tools/validate/ci-template.yml`), idempotent bundle update script (`tools/validate/update.mjs`), isolated throwaway repo installation verification, non-destructive user file preservation proof.
- Out of scope: git commit hooks, plugin packaging.

## Acceptance criteria

- AC1: Target repository CI workflow runs offline from checkout with Node 22 (SC1, SC7).
- AC2: CI gate honestly disclaims automated merge enforcement unless required status checks are configured (SC7).
- AC3: Bundle update procedure (`update.mjs`) updates bundle assets idempotently without overwriting user files in `tasks/` or `specs/` (SC6).
- AC4: Isolated target repository test passes completely in throwaway git environment.
- AC5: A failure at any point of an update leaves the target unchanged or fully restored, exits non-zero, and an interrupted run is detectable and recovered (SC6).
- AC6: Every source asset is validated against the source manifest before the target changes; a mismatch exits non-zero with the target unchanged (SC6).
- AC7: The delivered/source-only split of the CI template and the updater is documented with the target adoption procedure (SC1, SC7).

## Plan

1. Author `tools/validate/ci-template.yml` with honest merge gate disclaimer.
2. Implement `tools/validate/update.mjs` ensuring atomic non-destructive copy.
3. Test installation in throwaway Git repository verifying zero user-file tampering.
4. Record evidence and transition to verified.

## Verification

Rows below reran at 9b7ebb5. The rows recorded at 7cf22c1 (all `pass`) are in Git history; that update copied files in place with no staging or rollback, and no committed test backed AC3 or AC4.

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation suite | pass | 5faf6af | `mise run validate` (exit 0) |
| B2 | remediation baseline: `mise run test` | fail | 5d38ae3 | type-check failure, see child 02 B2 |
| AC1 | target CI workflow runs offline from checkout with Node 22 | pass | 9b7ebb5 | inspection: `tools/validate/ci-template.yml` checks out full history, sets up Node 22, runs `node tools/validate/validate.js`; the validator itself is offline (child 02 AC1). Not executed in a real target repository's GitHub Actions |
| AC2 | honest CI enforcement disclaimer | pass | 9b7ebb5 | inspection: template header and docs/bundle.md state the job blocks merges only as a required status check |
| AC3 | idempotent, non-destructive update | pass | 9b7ebb5 | bundle.test.ts: repeated update replaces nothing and leaves an identical tree; upgrade keeps `tasks/`, `specs/`, `CLAUDE.md` and unlisted `tools/validate/` files byte-identical; a manifest listing `tasks/` is refused |
| AC4 | isolated target installation | pass | 9b7ebb5 | bundle.test.ts installs into clean `git init` repos and runs the validator under Node and Bun |
| AC5 | failure-atomic update | pass | 9b7ebb5 | bundle.test.ts: failure induced after each of the replacement steps restores the full tree snapshot (exit code 1); a failed first install removes created files and dirs; a run killed at step 3 leaves the old manifest so the validator fails, then the next run rolls back and completes; a live concurrent run is refused |
| AC6 | source validated before the target changes | pass | 9b7ebb5 | bundle.test.ts: asset altered after its manifest, CLI exits 1, target snapshot unchanged |
| AC7 | delivery scope and adoption documented | pass | 9b7ebb5 | docs/bundle.md: template delivered and hashed; update.mjs and manifest.mjs source-only (`proposed` classification); adoption steps |
| R1 | repository test suite | pass | 9b7ebb5 | `G_INGA_REQUIRE_RUNTIMES=1 mise run test`: 107 pass, 0 fail |
| R2 | repository validation suite | pass | 9b7ebb5 | `mise run validate` exit 0 |
| V1 | diff read against SC1, SC6, SC7 and AC1–AC7 | pass | 9b7ebb5 | self-review by the implementing session, not a fresh-context review |

## Checkpoint

- as of: 2026-10-11, branch feat/v1-work-self-hosting, head aa9e38c, worktree clean
- done: rows rerun at 9b7ebb5; status verified
- next: none for this child; remote CI on the pushed head is tracked in the parent

## Outcome

Delivered `tools/validate/ci-template.yml` (bundle asset) and `tools/validate/update.mjs` (source-only utility): validate the source, stage under `.g-inga-update/`, replace per file with backup and a journal, `manifest.json` last, verify, roll back on any error, recover a killed run. The guarantee and its limits are in [bundle](../docs/bundle.md#update-procedure-sc6). Remediation commits: d12adc3, 944c77b, ba5ebe5 (tests). The first verification at 7cf22c1 claimed atomicity the code didn't provide and is superseded by the rows above.
