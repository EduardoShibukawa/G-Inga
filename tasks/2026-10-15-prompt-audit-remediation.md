---
schema: task/1
tier: heavy
status: active
spec: 2026-10-15-prompt-audit-remediation@1
---

# Prompt-Audit Remediation for G-Ingá Instruction Files

## Routing and approvals

- tier: heavy (H4: S5 holds, the findings change harness policy text in `work`, `drive` and `orchestrate`; H3: the change crosses several skills and the accepted artifact contract)
- confirmed: heavy by owner (2026-10-15, "Q1. Sim")
- decided: structure → a new heavy task for F1, F2, F4, F5, F6, F8, F10, F12 and F13; F3 and F11 go to `2026-10-14-question-rounds-skill`, F7 and F9 to `2026-10-14-harness-hardening`; work on `drive` and `orchestrate` waits for that spec's children 04 and 05 by owner (2026-10-15, "Q1. Sim")
- decided: contract status line → rewrite the "no validator exists" sentence in `docs/artifact-contracts.md` to what the validator implements, after checking its coverage, and regenerate the copy by owner (2026-10-15, "Q2. Sim")
- decided: gate layers → five, with Git lineage as Layer 3, as `gate.md` defines; `ooda-cycle.md` follows it by owner (2026-10-15, "Q3. Sim")
- decided: skill language → skills, references and dispatch templates are English; the owner talks Portuguese, the files don't need to by owner (2026-10-15, "Podemos deixar tudo em ingles nao vejo problemas")
- decided: circuit-breaker revert → limited to the ticket's in-scope files, or discard its isolated worktree; never the whole tree by owner (2026-10-15, "Q5. OK")
- decided: memory rule → the repository is canonical; auto-memory is a hint checked against the repository before acting by owner (2026-10-15, "Q6. ok")

## Objective

Resolve the 2026-10-15 prompt audit of the instruction files that load in G-Ingá sessions: rules the repository contradicts, prose budgets the session can't measure, an internal gate-layer conflict, a destructive revert, and language drift.

- In scope:
  - F1: `orchestrate` ticket states (`open`, `claimed`, `resolved`) and `map.md` replaced by `task/1` states and `tasks/`; the stale `map.md` mention in `drive`;
  - F2: the stale "no validator exists" status line of the artifact contract and its generated copy;
  - F4: `ooda-cycle.md` aligned to the five gate layers;
  - F5: `procedure.md` EXP-05/EXP-06 prose ceilings replaced by a pointer to the tooling that enforces them;
  - F6: the orchestrator's numeric main-context ceiling and its Layer 4 row;
  - F8: the dispatch template in English;
  - F10: the circuit-breaker revert scoped to the ticket;
  - F12: `CLAUDE.md` working-protocol rule 2 and auto-memory;
  - F13: the `run_in_background` parameter named in `orchestrate`;
  - the `.agents/skills/` mirrors and the bundle manifest.
- Out of scope:
  - F3 and F11 (`question-rounds.md`): owned by `2026-10-14-question-rounds-skill`;
  - F7 and F9 (worker-reported token usage, `drive` budget): owned by `2026-10-14-harness-hardening` (cost per child);
  - the plugin copy drifting from the project skills: `2026-10-14-harness-hardening-06`.

## Open decisions (owner)

1. Skill layout (owner, 2026-10-15): move skills out of `.claude/skills/` into a root `skills/` directory distributed only by plugin, as `harness/harness-skills` does. This changes ADR 0005's distribution (committed `.claude/skills/` plus pinned bundle). Recommended: a separate heavy task with its own ADR; this task edits the current paths.

## Acceptance criteria

SC1–SC9 from `specs/2026-10-15-prompt-audit-remediation.md`.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | `mise run validate` before change | pass | 48e1949 | Overall: pass |
| B2 | `mise run test` before change | pass | 48e1949 | 257 tests, 0 fail |

## Plan

1. `2026-10-15-prompt-audit-remediation-01-procedure-contract-memory`: F2, F5, F12 (no `drive` or `orchestrate` files).
2. `2026-10-15-prompt-audit-remediation-02-orchestrate`: F1, F4, F6, F8, F10, F13, after `2026-10-14-harness-hardening-04` and `-05`.

## Review

None yet: the fresh-context review runs after integration (`work/review.md`).
