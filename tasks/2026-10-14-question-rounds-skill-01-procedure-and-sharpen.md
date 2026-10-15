---
schema: task/1
tier: standard
status: verified
verified_at: "48e1949"
parent: 2026-10-14-question-rounds-skill
spec: 2026-10-14-question-rounds-skill@1
---

# Question-Rounds Procedure and Sharpen Entry

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-14-question-rounds-skill after spec v1 approval)

## Objective

Write `.claude/skills/work/references/question-rounds.md` and the thin `.claude/skills/sharpen/SKILL.md`, and point the `work/SKILL.md` heavy route and `work/heavy.md` step 2 at the procedure.

- In scope: the files above under `.claude/skills/`.
- Out of scope: `.agents/`, OpenCode, docs, bundle and manifest.

## Acceptance criteria

- AC1 = SC1 (Claude Code copy).
- AC2 = SC2.
- AC3 = SC3.
- AC4 = SC4.
- AC5 = SC5.
- AC6 = SC6.
- AC7 = SC7 (Claude Code copy).
- AC8: `mise run validate` and `mise run test` pass on main repo (worktrees have pre-existing issues deferred to their owners).

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation suite before change | pass | ed82275 | parent B1: `mise run validate` exit 0 |
| AC1 | SC1 Layout: procedure file, sharpen skill, provenance | pass | 48e1949 | `.claude/skills/work/references/question-rounds.md` line 1 and §Provenance name `grilling` and `domain-modeling` at `49dd158`; `.claude/skills/sharpen/SKILL.md` has `disable-model-invocation: true`, a one-line description, and only points at the procedure (standalone mode) |
| AC2 | SC2 Rounds: whole-frontier, numbered, recommended answers | pass | 48e1949 | procedure §Round Mechanics items 1–5: whole frontier, Q1…Qn with recommended answer, dependent questions deferred, done when the frontier is empty and the owner confirms, no action before |
| AC3 | SC3 Facts vs Decisions: agent finds facts, subagents allowed | pass | 48e1949 | procedure §Facts versus Decisions: facts are the agent's job; read-only Haiku subagents for broad lookups without blocking independent questions; decisions are the owner's |
| AC4 | SC4 Domain Discipline: challenge, sharpen, scenarios, code cross-check, glossary | pass | 48e1949 | procedure §Domain Discipline 1–6: glossary challenge, fuzzy terms, scenarios, code cross-check, immediate writes to `docs/glossary.md` (lazy, no implementation detail), `CONTEXT.md` migration |
| AC5 | SC5 ADR Offers: three conditions, proposed, owner accepts | pass | 48e1949 | procedure §ADR Offers: all three conditions, written to `docs/decisions/` as `proposed`, only the owner accepts |
| AC6 | SC6 Standalone Close: persists glossary/ADRs, decision summary, offers /work | pass | 48e1949 | procedure §Standalone Mode: persists only glossary entries and owner-accepted ADR drafts, no task or spec files, closes with a decision summary and an offer to open `/work` |
| AC7 | SC7 Heavy Integration: SKILL.md references procedure, heavy.md step 2 runs it | pass | 48e1949 | `.claude/skills/work/SKILL.md` line 14 names `references/question-rounds.md` with `heavy.md` (layout after ADR 0010); `procedure.md` line 38 heavy route reads both; `heavy.md` step 2 runs the procedure and records `decided:` lines; references sit one level below `SKILL.md` |
| AC8 | `mise run validate` and `mise run test` on `main` | pass | 48e1949 | `mise run validate` exit 0 (Overall: pass), local; CI on `main` 48e1949: `pre-commit` success, `test` success |
| R1 | repository validation and test suites on `main` | pass | 48e1949 | `mise run validate` exit 0 (Overall: pass), local; CI on `main` 48e1949: `pre-commit` success, `test` success |
| V1 | self-review: files at 48e1949 read against SC1–SC7 | pass | 48e1949 | rows AC1–AC7 re-checked on the files at 48e1949 |

## Plan

1. Draft the procedure from the spec's expected behavior, citing upstream at `49dd158`.
2. Add the `sharpen` entry.
3. Update the heavy route and `heavy.md` step 2.
4. Validate and test.

## Outcome

The question-rounds procedure lives once in `.claude/skills/work/references/question-rounds.md` with its upstream provenance. `/sharpen` is a thin user-invoked entry that reads it in standalone mode, and the `/work` heavy route runs it in step 2 and records answers as `decided:` lines (SC1–SC7 for Claude Code).

## Checkpoint

- date: 2026-10-14
- branch: task/2026-10-14-question-rounds-01-procedure
- HEAD: 75d3efc
- done: procedure file, /sharpen skill, heavy route and heavy.md step 2 for Claude Code (SC1–SC7)
- next: child 02 (Antigravity/OpenCode)

- Update 2026-10-15: revalidated on `main` at 48e1949, after the spec history-walk fixes (`2026-10-14-spec-history-squash-creation`, `2026-10-14-fix-history-walk-sibling-unchanged`) cleared the spec history failure that had blocked the suites; every AC re-checked against the files at 48e1949; promoted `completed` → `verified`.
