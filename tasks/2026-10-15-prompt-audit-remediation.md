---
schema: task/1
tier: heavy
status: accepted
verified_at: "6494ce3"
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
- decided: skill layout → moving skills to a root `skills/` directory distributed by plugin is a separate heavy task with an ADR amending ADR 0005, after this one; this task edits the current paths by owner (2026-10-15, "Q8l. Sim")
- approved: spec v1 by owner (2026-10-15, "sim")
- accepted: by owner (2026-10-16, "accepted formal prompt audit remediation epic")

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
  - the plugin copy drifting from the project skills: `2026-10-14-harness-hardening-06`;
  - moving skills to a root `skills/` directory distributed by plugin, as `harness/harness-skills` does: a separate heavy task with an ADR amending ADR 0005.

## Acceptance criteria

SC1–SC9 from `specs/2026-10-15-prompt-audit-remediation.md`.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | `mise run validate` before change | pass | 48e1949 | Overall: pass; rerun on integration tree `6494ce3`: pass |
| B2 | `mise run test` before change | pass | 48e1949 | 257 tests, 0 fail; rerun on integration tree `6494ce3`: 274 pass, 0 fail |
| SC1 | No `map.md` or non-`task/1` states in `orchestrate`/`drive`; selection/start/seal name `task/1` states | pass | 6494ce3 | Child 02 AC1 ran at `34bc0d7`; re-checked end to end on integrated head `6494ce3`: grep zero matches across both host copies |
| SC2 | `ooda-cycle.md` names the same five gate layers, same order, as `gate.md` | pass | 6494ce3 | Child 02 AC2 ran at `34bc0d7`; re-checked side-by-side on integrated head `6494ce3` |
| SC3 | Contract status line states validator coverage; generated copy matches (`contract-copy`) | pass | 6494ce3 | Child 01 AC1 ran at `2b9c835`; `contract-copy` passes on integrated head `6494ce3` |
| SC4 | `procedure.md` (both copies) no per-tier ceiling/ratio/SLA; names enforcing tooling; ADR 0006 kept | pass | 6494ce3 | Child 01 AC2 ran at `2b9c835`; grep for old terms: no matches on integrated head `6494ce3` |
| SC5 | `orchestrate` no numeric context ceiling; `gate.md` Layer 4 no unmeasurable row | pass | 6494ce3 | Child 02 AC3 ran at `34bc0d7`; ceiling removed on integrated head `6494ce3` |
| SC6 | `subagent-prompt.md` (both copies) all-English, no all-caps warning line; sections/report fields unchanged | pass | 6494ce3 | Child 02 AC4 ran at `34bc0d7`; grep zero matches on integrated head `6494ce3` |
| SC7 | No whole-tree revert in `orchestrate`; circuit breaker scoped to in-scope files or isolated worktree | pass | 6494ce3 | Child 02 AC5 ran at `34bc0d7`; grep zero matches on integrated head `6494ce3` |
| SC8 | `CLAUDE.md` rule 2: repository canonical, auto-memory a hint checked against it | pass | 6494ce3 | Child 01 AC3 ran at `2b9c835`; rule 2 present on integrated head `6494ce3` |
| SC9 | No `run_in_background` in `orchestrate`; manifest regenerated; validate and test pass | pass | 6494ce3 | Child 01 AC4 at `2b9c835` and child 02 AC6 at `34bc0d7`; `manifest.mjs --check` pass; validate pass; test 0 fail on `6494ce3` |
| V1 | Self-read of the integrated diff (`2b9c835` → `34bc0d7` → `6494ce3`) against SC1–SC9 | pass | 6494ce3 | Both host copies read side by side; no gate rule or circuit breaker weakened |

## Plan

1. `2026-10-15-prompt-audit-remediation-01-procedure-contract-memory`: F2, F5, F12 (no `drive` or `orchestrate` files).
2. `2026-10-15-prompt-audit-remediation-02-orchestrate`: F1, F4, F6, F8, F10, F13, after `2026-10-14-harness-hardening-04` and `-05`.

## Review

None yet: the fresh-context review runs after integration (`work/review.md`).

## Outcome

All spec criteria SC1–SC9 delivered through the two verified children: procedure/contract/memory (child 01 at `2b9c835`) and orchestrate/drive alignment (child 02 at `34bc0d7`), integrated on `6494ce3`. Formally accepted by repository owner on 2026-10-16 ("accepted formal prompt audit remediation epic"). `mise run validate` Overall: pass; `mise run test` 274 pass, 0 fail. Not delivered: nothing in scope of this spec. Follow-up outside scope: the pre-existing uncommitted `mise.toml` (`locked = false`) environment tweak.

## Checkpoint

- as of: 2026-10-16, branch `main`, HEAD `622554e`, worktree clean
- done: all children 01–02 verified; SC1–SC9 and V1 verified at `6494ce3`; formally accepted by owner
- active: none
- blocked: none
- next: none (epic completed and accepted)
- revalidate: none
