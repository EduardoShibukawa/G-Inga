---
schema: spec/1
status: draft
version: 1
---

# Accept Squash-Merged Spec Creation in the History Walk

## Problem

The §7.1 history walk allows a spec's first state only as `draft`. A pull request that creates and approves a spec on its branch, then lands through a squash merge, shows up on `main` as a spec created already `approved`.

This happened at `621cd44` (PR #49). Since then, `mise run validate` and `mise run test` fail on `main` and on every pull request based on it, although the owner's approval is recorded in the parent task.

Heavy triggers:

- H3: the contract table is delivered in the bundle copy.
- H4: the change is a validator rule.

## Expected behavior

Draft pending question rounds. A squash-merged creation whose approval is recorded passes. A spec created already `approved` with no recorded approval still fails.

## Scope

- In scope: contract §7.1, its bundle copy, the history check with fixtures, the rebuilt validator and the manifest.
- Out of scope: rewriting `main` history.
- Non-goals: changing any other transition rule.

## Acceptance criteria

- SC1 Pending question rounds.

## Interfaces and dependencies

- Changed contracts: §7.1 of the artifact contract and its bundle copy.
- Consumers: every repository that runs the bundle validator.

## Decisions

Pending: general squash row versus an explicit owner-approved exception (task Objective).

## Risks and constraints

- A general rule must not let a spec be created already approved without a recorded approval.

## Verification

- The validator passes on `main` history that includes `621cd44`.
- A fixture of a spec created already `approved` with no `approved:` entry still fails.

## Rollback

skip: a two-way door; revert the commits.

## Open questions

- Resolution 1 (general squash row) or resolution 2 (explicit exception); to be settled before approval.

## Revisions

- v1 (2026-10-14): skeleton recorded with the task; content follows question rounds.
