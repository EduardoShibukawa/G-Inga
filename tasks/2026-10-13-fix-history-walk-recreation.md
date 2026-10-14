---
schema: task/1
tier: standard
status: active
---

# Keep a Record's Last State When It Is Absent on a Sibling Branch

## Routing and approvals

- tier: standard (S1, S2, S3, S4, S6, S7 hold: a one-branch fix inside `tools/validate/artifacts/` that completes the DAG-aware deletion rule of `tasks/2026-10-13-fix-history-walk-parallel-branch-deletion.md` without changing the contract; `light` is excluded because the validator bundle and manifest must be rebuilt and a committed regression test is required)
- approved: owner request (2026-10-13, `/drive --limit 4` backlog item b "fix-history-walk-recreation")

## Objective

In `checkHistory`, a record absent at a sibling-branch commit that is not a real deletion keeps its last state, so after the merge it is compared with that state instead of being treated as newly created.

- In scope:
  - `tools/validate/artifacts/history.ts`
  - `tools/validate/artifacts/artifacts.test.ts`
  - `tools/validate/artifacts/fixtures.ts` (export the spec steps the test reuses)
  - `tools/validate/validate.js` (bundle rebuild)
  - `manifest.json` (bundle provenance)
  - `tasks/2026-10-13-fix-history-walk-recreation.md`
- Out of scope:
  - `docs/artifact-contracts.md` (§4.3 and §6.1 are unchanged).
  - Replacing the linear walk with a parent-aware walk.

## Acceptance criteria

- AC1: A spec approved on a feature branch, absent at a later base-branch commit and merged back is not reported as "must be created as draft"; a real committed deletion still fails (`H-del`).
- AC2: A committed regression test with a two-branch fixture repo fails before the fix and passes after it.
- AC3: `mise run validate` passes.
- AC4: `mise run test` passes (0 fail).
- AC5: `manifest.mjs --check` passes for the rebuilt bundle.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validate | pass | 43ca06a | Overall pass; `artifact-records` pass |
| B2 | baseline test | pass | 43ca06a | 240 pass, 0 fail |

## Plan

skip: single-step fix; the acceptance criteria are the plan.
