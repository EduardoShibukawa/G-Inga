---
schema: task/1
tier: standard
status: active
---

# Keep a Record's Last State When It Is Unchanged on a Sibling Branch

## Routing and approvals

- tier: standard (S1, S2, S3, S4, S7 hold: a bounded fix inside `tools/validate/artifacts/` that completes the DAG-aware sibling-branch handling of `checkHistory` without changing the contract; `light` is excluded because S6 fails at baseline on the false positive and the validator bundle and manifest must be rebuilt with a regression test)
- approved: owner request (2026-10-14, "Corrigir via task standard (Recommended)")

## Objective

In `checkHistory`, a record that already existed before two branches diverged, advanced on one branch, and stayed unchanged from its parent commit on the sibling branch must keep its last state instead of being compared against the sibling branch's pre-divergence state as a backward transition.

- In scope:
  - `tools/validate/artifacts/history.ts`
  - `tools/validate/artifacts/artifacts.test.ts`
  - `tools/validate/validate.js` (bundle rebuild)
  - `manifest.json` (bundle provenance)
  - `tasks/2026-10-14-fix-history-walk-sibling-unchanged.md`
- Out of scope:
  - `docs/artifact-contracts.md` (§3.3 and §7.1 are unchanged).
  - `.claude/skills/**` and any policy, routing or tier change.

## Acceptance criteria

- AC1: A task record that exists at the fork point as `todo`, advances to `verified` on one branch, and is untouched on a later sibling-branch commit before the two branches merge is not reported as `verified → todo`; a real committed backward transition still fails.
- AC2: A committed regression test with a two-branch fixture repository fails before the fix and passes after it.
- AC3: `mise run validate` passes (`artifact-records` pass).
- AC4: `mise run test` passes (0 fail).
- AC5: `manifest.mjs --check` passes for the rebuilt bundle.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validate | fail | ce2d723 | `artifact-records` fail: §3.3 false positive at `adb6dcc` (`verified → todo` on `2026-10-14-harness-hardening-02-bundle-validate-step` and `-03-model-policy`) |
| B2 | baseline test | fail | ce2d723 | 255 pass, 1 fail (self-validation test fails on the `artifact-records` false positive) |
| AC1 | sibling-branch unchanged record keeps last state | not run | | |
| AC2 | regression test red before, green after | not run | | |
| AC3 | validate | not run | | |
| AC4 | test | not run | | |
| AC5 | manifest provenance | not run | | |
| V1 | diff read against AC1–AC5 and the out-of-scope list | not run | | |

## Plan

skip: single-step fix; the acceptance criteria are the plan.
