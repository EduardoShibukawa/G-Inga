---
schema: task/1
tier: standard
status: verified
verified_at: "2b9c835"
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
| AC1 | AC1: contract status line states validator coverage, checked against `tools/validate/` (secrets scan §7 absent in code); `contract-copy` check | pass | 2b9c835 | `mise run validate` Overall pass |
| AC2 | AC2: no ceiling/ratio/SLA in either procedure.md; `token_budget_guard.ts` and ADR 0006 present | pass | 2b9c835 | `grep -nE` for the old terms: no matches |
| AC3 | AC3: `CLAUDE.md` rule 2 says auto-memory is a hint | pass | 2b9c835 | `grep -n 'Auto-memory is a hint' CLAUDE.md` matches line 10 |
| AC4 | AC4: manifest regenerated; `mise run validate` and `mise run test` | pass | 2b9c835 | `bun run manifest` (assets at fc4cc16), `mise run validate` Overall pass, `mise run test` 274 pass, 0 fail on the clean tree at 2b9c835 (driver gate) |
| V1 | self-review of 1fc4ad7..2b9c835 against AC1–AC3 | pass | 2b9c835 | driver read the diff: status line and §7/§7.2 wording match `tools/validate/` (no secrets scan), EXP-05/EXP-06 ceilings replaced by a pointer to `worktree-runner.ts` and `token_budget_guard.ts` with the ADR 0006 rule kept, rule 2 rewritten; gate L1 scope (8 in-scope files), L3 ancestry of 1fc4ad7 pass |

## Plan

1. Check the validator's coverage of the contract's deterministic checks; rewrite the status line; regenerate the copy.
2. Replace the EXP-05/EXP-06 sections of `procedure.md` in both copies with a pointer to the enforcing tooling.
3. Rewrite `CLAUDE.md` rule 2.
4. Regenerate the manifest; run validate and test.

## Notes

Dispatch cost: drive run 1 Sonnet worker made the first edits (not committed, about 64k tokens, worker-reported). Run 2: implementation worker on model `sonnet`, one attempt, reused the four files from the run 1 stash; `total_tokens` 50062 as reported by the host for the subagent run, over the 25k ticket ceiling; `tokens_input`, `tokens_output`, `cache_read_tokens`, `cache_write_tokens` and `cache_read_ratio` not run (the host reports only the total). No prompt content recorded.

## Outcome

Delivered: the contract status line, §7 and §7.2 state what `tools/validate/` implements (the secrets scan is not implemented), with both generated copies regenerated; both `procedure.md` copies drop the EXP-05/EXP-06 session ceilings and point at `tools/gate/worktree-runner.ts` and `tools/eval/token_budget_guard.ts`, keeping the ADR 0006 rule; `CLAUDE.md` rule 2 makes auto-memory a hint checked against the repository; `manifest.json` regenerated. Not delivered: nothing in scope. Follow-up outside scope: `mise run validate` lints files under `.claude/worktrees/` (parent checkpoint finding).
