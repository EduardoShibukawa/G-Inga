---
schema: task/1
tier: standard
status: completed
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
| AC1 | AC1: contract status line states validator coverage, checked against `tools/validate/` (secrets scan §7 absent in code); `contract-copy` check | pass | fc4cc16 | `mise run validate` Overall pass |
| AC2 | AC2: no ceiling/ratio/SLA in either procedure.md; `token_budget_guard.ts` and ADR 0006 present | pass | fc4cc16 | `grep -nE` for the old terms: no matches |
| AC3 | AC3: `CLAUDE.md` rule 2 says auto-memory is a hint | pass | fc4cc16 | `grep -n 'Auto-memory is a hint' CLAUDE.md` matches line 10 |
| AC4 | AC4: manifest regenerated; `mise run validate` and `mise run test` | pass | fc4cc16 | `bun run manifest`, `mise run validate`, `mise run test` |

## Plan

1. Check the validator's coverage of the contract's deterministic checks; rewrite the status line; regenerate the copy.
2. Replace the EXP-05/EXP-06 sections of `procedure.md` in both copies with a pointer to the enforcing tooling.
3. Rewrite `CLAUDE.md` rule 2.
4. Regenerate the manifest; run validate and test.
