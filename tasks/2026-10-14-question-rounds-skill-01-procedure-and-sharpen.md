---
schema: task/1
tier: standard
status: todo
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
- AC8: `mise run validate` and `mise run test` pass.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation suite before change | pass | ed82275 | parent B1: `mise run validate` exit 0 |

## Plan

1. Draft the procedure from the spec's expected behavior, citing upstream at `49dd158`.
2. Add the `sharpen` entry.
3. Update the heavy route and `heavy.md` step 2.
4. Validate and test.
