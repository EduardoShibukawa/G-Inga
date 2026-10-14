---
schema: task/1
tier: heavy
status: completed
spec: 2026-10-14-spec-history-squash-creation@1
---

# Accept Squash-Merged Spec Creation in the History Walk

## Routing and approvals

- tier: heavy (H4: changes a validator rule, which is harness policy; H3: the contract §7.1 table is a consumed contract, delivered in the bundle copy and `validate.js`)
- decided: open a task for an owner-approved way past the `621cd44` history failure, never rewriting `main` by owner (2026-10-14, "Sim")
- confirmed: heavy by owner (2026-10-14, "Ok")
- decided: resolution → a general `none → approved` row in §7.1, guarded by version 1, a matching `approved_hash` and a new parent `approved: spec v1` entry in the same commit; no exception artifact by owner (2026-10-14, "Ok")
- approved: spec v1 by owner (2026-10-14, "Sim")

## Objective

`main` fails `mise run validate` and `mise run test` since `621cd44` (PR #49, squash-merged). In that commit, `specs/2026-10-14-question-rounds-skill.md` first appears already `approved`. The §7.1 walk allows only `none → draft`, so it reports "must be created as draft, version 1, without approved_* keys". Every open pull request inherits the red `validate` check, for example #51. The approval itself is recorded: the parent task has `approved: spec v1 by owner`.

Candidate resolutions, settled in question rounds:

1. **General squash row.** Add `none → approved` to the §7.1 table. It is allowed only when `version: 1`, `approved_version: 1`, `approved_hash = h(cur)`, and the parent record at `cur`'s commit has an `approved: spec v1` entry. This mirrors the existing row for a reopen and reapproval squashed into one commit.
2. **Explicit exception.** A recorded, owner-approved exception naming the spec and commit `621cd44`, which the validator reads. It is narrow, but it adds a new artifact kind.

- In scope: `docs/artifact-contracts.md` §7.1 and its bundle copy, `tools/validate/artifacts/history.ts` with fixtures and tests, the rebuilt `validate.js`, and the manifest (two-commit protocol).
- Out of scope: rewriting `main` history; the merge-mode policy (squash versus merge commit) for future pull requests.

## Acceptance criteria

SC1–SC5 from `specs/2026-10-14-spec-history-squash-creation.md`.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation suite before change | fail | 6f2690c | `artifact-records` §7.1 at `621cd44`: `2026-10-14-question-rounds-skill` must be created as draft |
| SC1 | contract row and bundle copies | pass | f889d39 | child AC1 |
| SC2 | check accepts exactly the two creation forms | pass | f889d39 | child AC2 |
| SC3 | history fixtures | pass | f889d39 | child AC3: the four spec cases plus the review's earlier-entry case |
| SC4 | this repository passes with `621cd44` in history | pass | f889d39 | child AC4 |
| SC5 | validator rebuilt, manifest two-commit | pass | f889d39 | child AC5 |
| V1 | self-review of the integrated diff against SC1–SC5 | pass | f889d39 | consistent with the review below |
| R1 | integrated regression | pass | f889d39 | `mise run validate` exit 0; `mise run test` 247 pass, 0 fail |

## Plan

1. Owner confirms heavy (done).
2. Question rounds: resolution 1 chosen (done). Merge-mode policy stays out of scope.
3. Spec v1 drafted and approved by the owner (done); decomposed into one child, `-01-squash-creation-row` (SC1–SC5).
4. Integrated verification on `main` history and adversarial review (done); owner acceptance.

## Review

Fresh-context adversarial review of `6f2690c..f0eed84` against spec v1 (2026-10-14):

- [F1] major: for a new spec, the approval-entry check compared against an empty snapshot, so an `approved: spec v1` entry committed earlier counted as new (SC2) -> fixed in 98ba2bd (compare with the commit's Git parent; fixture `H-squash-old-entry`)

## Outcome

The §7.1 walk accepts a spec created already approved in one squashed commit when its parent gains `approved: spec v1` in that commit. `main`'s history, including `621cd44`, passes `mise run validate` and `mise run test` again. Pending: owner acceptance. After merge, open branches such as PR #51 merge `main` to clear the inherited red check.

## Checkpoint

- Date: 2026-10-14
- Branch: `task/2026-10-14-spec-history-squash-creation`; verified at f889d39
- Done: spec v1 approved; child 01 verified; SC1–SC5, V1 and R1 pass; review F1 fixed.
- Next action: owner reviews PR #53 (merge commit, never squash, to keep manifest commits) and records `accepted:`; then merge `main` into PR #51.
