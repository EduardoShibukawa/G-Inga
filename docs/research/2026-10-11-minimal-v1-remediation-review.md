# Minimal V1 Remediation Adversarial Review

**Date:** 2026-10-11
**Reviewer:** Independent Review (Antigravity Environment)
**Scope:** Git diff `5d38ae3..59602e8` against `specs/2026-10-11-minimal-v1-specification.md@1`
**Baseline:** `5d38ae353bbe12444188110b18e78aa78d3f62fe`
**Head:** `59602e8b204a3b3ce2a2580f7323ac3036c76f27`

---

## 1. Executive Summary

This independent review evaluates the remediation commits applied to PR #12 (`feat/v1-work-self-hosting`) after the failure of GitHub Actions CI run `38142286827` at commit `5d38ae3`.

The remediation addressed critical defects in the standalone validator, the update utility atomicity and concurrency control, manifest provenance tracking, and missing automated test coverage. The test suite expanded from 77 tests to 114 tests (all passing under Node.js v26.11.1 / Node 22+ and Bun v1.4.2).

However, host-specific runtime validations (SC2 for light tier and SC8 for Matt Pocock plugin coexistence) cannot be fabricated in Antigravity and remain `not_run`. Furthermore, the delivery of `docs/artifact-contracts.md` (Finding A7 / SC1) remains an open owner decision between bundle distribution and self-contained procedural text.

---

## 2. Review Contract Compliance (.claude/skills/work/review.md)

1. **Approved specification body hash:** Verified immutable via `awk 'n >= 2 { print } /^---$/ { n++ }' specs/2026-10-11-minimal-v1-specification.md | sha256sum`.
   - Result: `sha256:09ff9d3d15f71c9ee832e401edea5c833064c64a317457121b8f6f4f64bc5bab` (exact match).
2. **Deterministic exit codes (SC4):** Verified in `tools/validate/bundle.test.ts` across Node.js and Bun for exit code 0 (clean/valid), 1 (drift/contract violation), and 2 (blocked/shallow clone/missing manifest).
3. **Manifest integrity & provenance (SC5):** Verified via `tools/validate/manifest.mjs --check` and test fixtures.
4. **Failure-atomic update (SC6):** Verified via rollback staging and concurrent PID locking in `tools/validate/update.mjs`.

---

## 3. Findings Matrix

| Finding ID | Severity | Criterion | Status | Resolution / Rationale |
|---|---|---|---|---|
| A1 | critical | SC4 | Fixed | `tools/validate/standalone.ts` failed `tsc --noEmit` on `5d38ae3`. Fixed in `586a056` with strict TypeScript annotations and Bun CLI entry `validate.ts`. Verified in CI run 38143974269. |
| A2 | major | SC6 | Fixed | `update.mjs` previously performed non-atomic in-place copy. Fixed in `d12adc3` with journaled staging, backup directory, and automated rollback upon step error. |
| A3 | major | SC5 | Fixed | Manifest commit metadata previously referenced pre-build commits. Fixed in `4c9ac0d` (at `ba5ebe5`) and updated in `0d4f497` (at `57ac605`). Proven via `tools/validate/manifest.mjs --check`. |
| A4 | major | SC4 | Fixed | Missing `manifest.json` previously exited 0 (`not run`). Fixed in `586a056` to exit 2 (`blocked`) as missing prerequisite. |
| A5 | major | SC4–SC6 | Fixed | No automated test coverage existed for standalone validator or update script. Fixed in `ba5ebe5` by adding 32 end-to-end tests in `tools/validate/bundle.test.ts`. |
| A6 | major | Process | Fixed | Stale task checkpoints in child tasks 02 and 03. Fixed in `52c549e` with actual rerun refs and verification data at `9b7ebb5`. |
| A7 | major | SC1 | Open | `.claude/skills/work/` procedures reference `docs/artifact-contracts.md`, but target repositories do not receive that file. Proposed fix delivered in `57ac605`/`0d4f497` via `.claude/skills/work/references/artifact-contracts.md`, but formal owner decision between distribution copy vs self-contained procedures is still required. |
| A8 | minor | SC7 | Open | `tools/validate/ci-template.yml` exists and is covered by unit tests, but has not been tested in a genuine target consumer repository's GitHub Actions environment. |
| A9 | minor | SC2, SC8 | Open | No durable repository artifact records the execution of live `/work` runs for light tier or Matt Pocock plugin coexistence. Requires genuine Claude Code host session. |
| A10 | minor | SC2, SC8 | Open | Child task 01 AC4 and AC5 rely on the same unrecorded Claude Code host runs. Requires genuine Claude Code host session. |
| G1 | major | Process | Open | Historical child tasks 01, 02, and 03 were committed already marked `verified`, without a preceding `active` state in git history. Preserved as historical deviation; child task 04 followed the correct task-first sequence (`7ddbe07` active -> `57ac605` impl -> `0d4f497` manifest -> `59602e8` verified). |
| G2 | minor | SC5 | Fixed | Manifest omitted Bun entry and CI template. Fixed in `586a056`. |
| G3 | minor | SC5 | Fixed | Manifest `commit` pointed to `d19205f`. Fixed in `4c9ac0d` and updated in `0d4f497`. |
| M1 | major | SC6 | Fixed | Update script had no rollback or atomicity. Fixed in `d12adc3` and `944c77b`. |
| M2 | minor | SC7 | Fixed | CI template adoption was undocumented. Documented in `docs/bundle.md` and added in `ba5ebe5`. |
| M4 | minor | SC4 | Fixed | `bun tools/validate/validate.ts` missing. Added in `586a056`. |
| AGY-1 | minor | SC5 | Open | Manifest provenance checks `git merge-base --is-ancestor <commit> HEAD`. A squash-merge into `main` drops the asset commit SHA, causing `manifest.mjs --check` to fail. Requires merge commit integration or post-merge regeneration. |
| AGY-2 | major | Governance | Open | Child task 04 recorded owner approval for A7 in git history (`7ddbe07`), while project instructions clarify this decision remains pending owner selection between Alternative 1 (copy) and Alternative 2 (self-containment). |
| AGY-3 | minor | SC1 | Fixed | Relative links in the contract copy point to `docs/` in G-Ingá. Documented as known limitation in `docs/bundle.md` and child task 04. |

---

## 4. Acceptance Criteria Status Matrix

- **SC1 (Bundle Self-Containment):** `BLOCKED` (Pending owner decision on A7).
- **SC2 (Zero Ceremony for Light Tier):** `NOT_RUN` (Host-specific Claude Code runtime requirement).
- **SC3 (Contract Conformance):** `PASSED` (114 passing tests, `mise run validate` clean).
- **SC4 (Deterministic Validation Exit Codes):** `PASSED` (Exit codes 0, 1, 2 verified under Node 22+ and Bun).
- **SC5 (Manifest Integrity Checking):** `PASSED` (SHA-256 integrity, scope enforcement, and commit provenance verified).
- **SC6 (Non-Destructive Update):** `PASSED` (Rollback, concurrent PID locking, user files preserved).
- **SC7 (Honest CI Enforcement Gate):** `PASSED` (Template syntax and contract validated; live external run is pending A8).
- **SC8 (Transitional Coexistence):** `NOT_RUN` (Host-specific Claude Code runtime requirement with Matt Pocock plugin).
