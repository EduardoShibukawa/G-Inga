---
schema: spec/1
status: approved
version: 1
approved_version: 1
approved_hash: sha256:de43a9a242f476af22092bebf5189ff8cb56d2d9629ec99f0d685283231e5195
---

# Accept Squash-Merged Spec Creation in the History Walk

## Problem

The §7.1 history walk allows a spec's first state only as `draft`. A pull request that creates and approves a spec on its branch, then lands through a squash merge, shows up on `main` as a spec created already `approved`.

This happened at `621cd44` (PR #49). Since then, `mise run validate` and `mise run test` fail on `main` and on every pull request based on it, although the owner's approval is recorded in the parent task in the same commit.

The table already accepts a reopen and reapproval squashed into one commit. It has no equivalent for creation and approval squashed into one commit.

Who is affected: this repository and every target repository whose pull requests land through squash merges.

Heavy triggers:

- H3: the contract table is delivered in the bundle copy.
- H4: the change is a validator rule, which is harness policy.

## Expected behavior

- A spec whose first state is `approved` passes the walk when its approval is recorded in that same commit:
  - `version: 1` and `approved_version: 1`;
  - `approved_hash` equal to the body hash;
  - its heavy parent has an `approved: spec v1` entry it didn't have in the previous commit.
- A spec created as `approved` without that entry, with a mismatched hash, or with a version other than 1 still fails.
- Creation as `draft` behaves as before.
- `main` passes `mise run validate` and `mise run test` with `621cd44` in its history.

## Scope

- In scope:
  - the §7.1 spec transition table in the artifact contract, and its bundle copy;
  - the history check, with tests for the accepted and rejected creation cases;
  - the rebuilt standalone validator and the bundle manifest.
- Out of scope:
  - rewriting `main` history;
  - a merge-mode rule for pull requests;
  - task-record transitions.
- Non-goals: any other spec transition rule.

## Acceptance criteria

- SC1 **Contract.** The §7.1 table has a `none → approved` row. It requires `version: 1`, `approved_version: 1`, `approved_hash = h(cur)`, and a parent `approved: spec v1` entry absent at the previous commit, and it describes the row as a creation and approval squashed into one commit. The bundle contract copy matches.
- SC2 **Check.** The history walk accepts exactly that case. Any other first state that isn't `draft`, version 1 and free of `approved_*` keys fails, with a message naming both allowed forms.
- SC3 **Tests.** Tests in `mise run test` cover four cases in a throwaway repository:
  - a squashed creation with the parent entry passes;
  - a creation without the parent entry fails;
  - a creation with a hash mismatch fails;
  - a creation at version 2 fails.
- SC4 **This repository.** At the integrated head, `mise run validate` and `mise run test` pass, and the walk over `621cd44` reports no finding.
- SC5 **Bundle.** `validate.js` is rebuilt, and `manifest.json` is regenerated with the two-commit protocol. `manifest.mjs --check` passes.

## Interfaces and dependencies

- Changed contracts: artifact contract §7.1, delivered as the bundle copy and enforced by `validate.js`.
- Consumers: this repository's CI and pull requests; target repositories that update the bundle.
- External: none. Git history only.

## Decisions

- A general squash-creation row instead of an owner-approved exception for one commit (owner, 2026-10-14). The row covers future squash merges with the same guard the table already uses for approvals. An exception would add a new artifact kind and cover only `621cd44`.
- History is never rewritten (owner, 2026-10-14).

## Risks and constraints

- **Weaker guard.** The row lets a spec skip a visible `draft` state. The guard is the same evidence a `draft → approved` step needs: a new parent `approved:` entry. Approvals stay a trust boundary (§7).
- **Parallel work.** PR #51 and other open branches carry the same red check until this lands; they need a merge from `main` afterward.

## Verification

- Integrated regression: `mise run validate` and `mise run test` at the integrated head.
- End-to-end: SC4 on this repository's real history, SC3 in throwaway repositories, SC1 by reading the contract and the contract-copy check, SC5 by `manifest.mjs --check`.
- Review focus: whether any first state other than the two allowed forms can pass, and whether the parent-entry check counts entries in the same commit only.

## Rollback

skip: a two-way door; revert the commits and regenerate the manifest.

## Open questions

## Revisions

- v1 (2026-10-14): draft from the owner's decision of 2026-10-14 (general squash-creation row).
