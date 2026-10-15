---
schema: task/1
tier: standard
status: todo
parent: 2026-10-15-prompt-audit-remediation
spec: 2026-10-15-prompt-audit-remediation@1
depends_on: []
---

# Procedure Budgets, Contract Status and Memory Rule

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-15-prompt-audit-remediation after spec v1 approval)

## Objective

Remove the session-level token ceilings from `/work`'s procedure, correct the artifact contract's status line, and align `CLAUDE.md` with auto-memory.

- In scope: `work/references/procedure.md` (both host copies), `docs/artifact-contracts.md` and its generated copy, `CLAUDE.md`, the bundle manifest.
- Out of scope: `drive` and `orchestrate` files (child 02).

## Acceptance criteria

- AC1 = SC3.
- AC2 = SC4.
- AC3 = SC8.
- AC4: the manifest is regenerated, and `mise run validate` and `mise run test` pass.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | 48e1949 | parent B1/B2: `mise run validate` Overall pass, `mise run test` 257 pass |

## Plan

1. Check the validator's coverage of the contract's deterministic checks; rewrite the status line; regenerate the copy.
2. Replace the EXP-05/EXP-06 sections of `procedure.md` in both copies with a pointer to the enforcing tooling.
3. Rewrite `CLAUDE.md` rule 2.
4. Regenerate the manifest; run validate and test.
