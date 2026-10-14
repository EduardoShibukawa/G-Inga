---
schema: task/1
tier: standard
status: verified
verified_at: "f889d39"
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
| AC1 | contract §7.1 row and bundle copies | pass | f889d39 | `none → approved` row added; `contract-copy` check pass for `.claude/` and `.agents/` copies |
| AC2 | history check accepts only the two creation forms | pass | f889d39 | `checkSpecTransition` `!prev` branch; a new spec's approval entry is compared with the commit's Git parent (fix 98ba2bd from review F1) |
| AC3 | history fixtures | pass | f889d39 | `bun test tools/validate/artifacts -t squash`: 5 pass (`H-squash-create` pass; `H-squash-no-entry`, `H-squash-bad-hash`, `H-squash-v2`, `H-squash-old-entry` fail with §7.1) |
| AC4 | this repository's history, including `621cd44` | pass | f889d39 | `mise run validate` exit 0 (Overall: pass), no §7.1 finding |
| AC5 | rebuilt validator and two-commit manifest | pass | f889d39 | assets 98ba2bd, manifest f889d39; `manifest.mjs --check` pass |
| V1 | self-review: `git diff 6f2690c..f889d39` read against AC1–AC5 | pass | f889d39 | no out-of-scope file |
| R1 | `mise run validate` and `mise run test` | pass | f889d39 | validate exit 0; test exit 0: 247 pass, 0 fail |

## Outcome

The §7.1 walk accepts a spec created already approved when the parent gains its `approved: spec v1` entry in the same commit. This repository's history, including `621cd44`, passes.

## Checkpoint

- Date: 2026-10-14
- Branch: `task/2026-10-14-spec-history-squash-creation`
- Done: AC1–AC5 implemented and checked at f889d39.
- Next action: parent integrated verification.
