---
schema: task/1
tier: standard
status: completed
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
| AC1 | SC1 Layout: procedure file, sharpen skill, provenance | pass | 75d3efc | `.claude/skills/work/references/question-rounds.md`, `.claude/skills/sharpen/SKILL.md` |
| AC2 | SC2 Rounds: whole-frontier, numbered, recommended answers | pass | 75d3efc | procedure §Round Mechanics |
| AC3 | SC3 Facts vs Decisions: agent finds facts, subagents allowed | pass | 75d3efc | procedure §Facts versus Decisions |
| AC4 | SC4 Domain Discipline: challenge, sharpen, scenarios, code cross-check, glossary | pass | 75d3efc | procedure §Domain Discipline |
| AC5 | SC5 ADR Offers: three conditions, proposed, owner accepts | pass | 75d3efc | procedure §ADR Offers |
| AC6 | SC6 Standalone Close: persists glossary/ADRs, decision summary, offers /work | pass | 75d3efc | procedure §Standalone Mode |
| AC7 | SC7 Heavy Integration: SKILL.md references procedure, heavy.md step 2 runs it | pass | 75d3efc | `.claude/skills/work/SKILL.md` line 41, `.claude/skills/work/heavy.md` step 2 |
| AC8 | validate & test on main repo | pass | — | main repo (excl. worktrees) passes all checks; worktrees have pre-existing issues |

## Plan

1. Draft the procedure from the spec's expected behavior, citing upstream at `49dd158`.
2. Add the `sharpen` entry.
3. Update the heavy route and `heavy.md` step 2.
4. Validate and test.

## Checkpoint

- date: 2026-10-14
- branch: task/2026-10-14-question-rounds-01-procedure
- HEAD: 75d3efc
- done: procedure file, /sharpen skill, heavy route and heavy.md step 2 for Claude Code (SC1–SC7)
- next: child 02 (Antigravity/OpenCode)