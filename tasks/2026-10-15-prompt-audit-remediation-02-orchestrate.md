---
schema: task/1
tier: standard
status: verified
verified_at: "34bc0d7"
parent: 2026-10-15-prompt-audit-remediation
spec: 2026-10-15-prompt-audit-remediation@1
depends_on:
  - 2026-10-15-prompt-audit-remediation-01-procedure-contract-memory
  - 2026-10-14-harness-hardening-04-checkpoint-resume
  - 2026-10-14-harness-hardening-05-session-close-merge
---

# Orchestrate and Drive Alignment

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-15-prompt-audit-remediation after spec v1 approval)

## Objective

Align `orchestrate` and `drive` with the `task/1` contract and the five-layer gate, drop the unmeasurable context ceiling, scope the circuit-breaker revert, and put the dispatch template in English.

- In scope: `orchestrate` (`SKILL.md`, `gate.md`, `subagent-prompt.md`, `references/ooda-cycle.md`) and `drive/SKILL.md`, both host copies; the bundle manifest.
- Out of scope: worker-reported token usage and the `drive` budget (harness-hardening, cost per child).

## Acceptance criteria

- AC1 = SC1.
- AC2 = SC2.
- AC3 = SC5.
- AC4 = SC6.
- AC5 = SC7.
- AC6 = SC9.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | ba7b490 | rerun on fresh branch from ba7b490: mise run validate Overall pass, mise run test 274 pass, 0 fail |
| AC1 | SC1: no map.md and no ticket state outside the task/1 set (todo, active, blocked, verified, accepted, completed, partial, cancelled); selection, start and seal name tasks/ | pass | 34bc0d7 | grep for map.md and for the removed states: zero matches across both host copies of orchestrate and drive |
| AC2 | SC2: ooda-cycle.md names the same 5 gate layers, same order, as gate.md (Scope Diff, Deterministic Command, Task Ancestry Lineage, Quantitative Threshold, Circuit Breaker); no 4-layer reference | pass | 34bc0d7 | side-by-side read of Phase 5 vs gate.md sections 2-6 |
| AC3 | SC5: orchestrate has no numeric ceiling on its own context; gate.md Layer 4 has no unmeasurable row (Main context under 25k tokens removed) | pass | 34bc0d7 | grep for 25k and 25,000 finds only the tooling-enforced EXP-06 worker budget, out of scope for this child |
| AC4 | SC6: subagent-prompt.md (both copies) entirely in English; no all-caps warning line; sections and report fields unchanged | pass | 34bc0d7 | grep for Portuguese and for all-caps warning lines: zero matches |
| AC5 | SC7: no orchestrate file instructs whole-tree revert; circuit breaker reverts ticket in-scope files or discards isolated worktree | pass | 34bc0d7 | grep for git checkout HEAD dot and git clean fd without path: zero matches |
| AC6 | SC9: no orchestrate file names run_in_background; manifest regenerated; mise run validate and mise run test pass | pass | 34bc0d7 | grep run_in_background: zero; manifest.mjs --check: pass; mise run validate: pass; mise run test: 274 pass, 0 fail |
| V1 | self-review of the diff against AC1-AC6 | pass | 34bc0d7 | read both host copies side by side; no gate rule or circuit breaker weakened |

## Plan

1. Replace ticket states and map.md with task/1 states and tasks/ (SC1). — done
2. Align ooda-cycle.md to the five gate layers (SC2). — done
3. Remove the context ceiling and its gate row (SC5); scope the revert (SC7); drop run_in_background (SC9). — done
4. Translate the dispatch template (SC6). — done
5. Regenerate the manifest; run validate and test. — done

## Outcome

Delivered: orchestrate and drive aligned to the task/1 contract and five-layer gate in both host copies; map.md and non-task/1 states removed; ooda-cycle.md matches gate.md's five layers; the numeric context ceiling and unmeasurable Layer 4 row removed; subagent-prompt.md translated to English; circuit-breaker revert scoped to in-scope files or isolated worktree; run_in_background removed; manifest regenerated; validate and test pass with 0 fail. Follow-up outside scope: none in this child.

## Checkpoint

- as of: 2026-10-15, branch work/prompt-audit-remediation-02-orchestrate, head 34bc0d7, worktree clean (only the pre-existing uncommitted mise.toml environment tweak remains); branch not pushed (no upstream).
- done: 2026-10-15-prompt-audit-remediation-02-orchestrate verified at 34bc0d7.
- active: none.
- blocked: none.
- next: merge work/prompt-audit-remediation-02-orchestrate into work/prompt-audit-remediation, then open the PR; no further children.
- revalidate: parent B1/B2 (Ref 48e1949), rerun before integration.
- resume prompt:

  ~~~text
  Resume 2026-10-15-prompt-audit-remediation-02-orchestrate on branch work/prompt-audit-remediation-02-orchestrate. Expected head 34bc0d7.
  Read the child's Checkpoint, reconcile with git status and git log -n 1; if the head or status disagrees, report the difference and dispatch nothing until reconciled. Otherwise proceed to integration into work/prompt-audit-remediation and the PR. Done: child 02 verified at 34bc0d7. Blocked: none.
  ~~~
