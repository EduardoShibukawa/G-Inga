---
schema: task/1
tier: standard
status: todo
parent: 2026-10-14-spec-history-squash-creation
spec: 2026-10-14-spec-history-squash-creation@1
---

# Squash-Creation Row in the Spec History Walk

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-14-spec-history-squash-creation after spec v1 approval)

## Objective

Accept a spec created already `approved` when its approval is recorded in the same commit, in the contract and in the history check.

- In scope: `docs/artifact-contracts.md` §7.1, the bundle contract copy, `tools/validate/artifacts/history.ts` and its tests, `tools/validate/validate.js`, `manifest.json`.
- Out of scope: other transition rules, history rewrites.

## Acceptance criteria

- AC1 = SC1.
- AC2 = SC2.
- AC3 = SC3.
- AC4 = SC4.
- AC5 = SC5.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation suite before change | fail | 6f2690c | parent B1: `artifact-records` §7.1 at `621cd44` |

## Checkpoint

- Date: 2026-10-14
- Branch: `task/2026-10-14-spec-history-squash-creation`
- Done: decomposed at `@1`.
- Next action: implement AC1–AC5.
