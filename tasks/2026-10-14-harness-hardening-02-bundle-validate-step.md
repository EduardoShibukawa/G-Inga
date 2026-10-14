---
schema: task/1
tier: standard
status: verified
verified_at: "4fab75c"
parent: 2026-10-14-harness-hardening
spec: 2026-10-14-harness-hardening@1
depends_on:
  - 2026-10-14-harness-hardening-01-commit-gate
---

# Bundle Validator Step

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-14-harness-hardening after spec v1 approval)

## Objective

Ship the G-Ingá validator as the `g-inga:validate` mise file task inside the pinned bundle and its integrity manifest, and prove a target repository can compose it into its `pre-commit` task.

- In scope: bundle layout, manifest generation, a fixture target repository in tests, adoption docs.
- Out of scope: changing validator rules; publishing a release tag.

## Acceptance criteria

- AC1 = SC2.
- AC2: the adoption doc names the one change a target repository makes, and the fallback from ADR 0009 §2 if child 01's spike chose it.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | 2edf21e | parent B1/B2: `mise run validate` exit 0, `mise run test` 242 pass |
| B2 | repository validation suite before change | pass | a496716 | `mise run validate` exit 0 (Overall: pass) |
| B3 | repository test suite before change | fail | a496716 | `mise run test` exit 1: 28 failures, all from the stale manifest (03's edits drifted `heavy.md`, `procedure.md`, `review.md` and added `model-policy.md`); this task regenerates the manifest |
| AC1 | SC2: a fixture target repo composes `pre-commit` → `g-inga:validate`, rejecting invalid and accepting valid | pass | 4fab75c | `tools/validate/bundle-validate-step.test.ts` 3 pass; `bun tools/validate/manifest.mjs --check` passes and covers the file task |
| AC2 | adoption doc names the one change and the fallback note | pass | 4fab75c | `docs/bundle.md` names `depends = ["g-inga:validate"]` in `pre-commit` as the one target change; child 01's spike proved a TOML `depends` can name a namespaced file task, so ADR 0009 §2's fallback was never chosen and none is documented |
| R1 | integrated validation, test and standalone validator run | pass | 4fab75c | `mise run validate` exit 0; `mise run test` exit 0 (256 pass); `bun tools/validate/validate.ts` exit 0 (manifest-integrity pass) |
| V1 | self-review of a496716..4fab75c against AC1–AC2 | pass | 4fab75c | diff read: file task, `bundle.json` scope+assets, manifest two-commit protocol, fixture test, adoption note; `.claude/skills/**` untouched (03 owns) |

## Plan

1. Add the file task to the bundle; regenerate the manifest.
2. Fixture target repository test: invalid record rejected, valid accepted.
3. Document adoption.

## Outcome

The pinned bundle now ships the `g-inga:validate` mise file task (`.mise/tasks/g-inga/validate`, a thin wrapper over `node tools/validate/validate.js`), listed in `bundle.json` scope and assets alongside 03's new `model-policy.md`. The manifest was regenerated under the two-commit protocol (commit C for the assets, then `manifest.json` alone as M), and `bun tools/validate/manifest.mjs --check` passes. A fixture target-repository test proves SC2: a target composes `depends = ["g-inga:validate"]` into its `pre-commit` task and the step rejects an invalid record and accepts a valid one. Adoption is documented in `docs/bundle.md`. No fallback line is documented because child 01's spike already proved a TOML `depends` can name a namespaced mise file task, so ADR 0009 §2 stays unrevised.
