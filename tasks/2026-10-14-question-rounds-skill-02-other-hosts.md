---
schema: task/1
tier: standard
status: completed
parent: 2026-10-14-question-rounds-skill
spec: 2026-10-14-question-rounds-skill@1
depends_on:
  - 2026-10-14-question-rounds-skill-01-procedure-and-sharpen
---

# Sharpen on Antigravity and OpenCode

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-14-question-rounds-skill after spec v1 approval)

## Objective

Mirror child 01 under `.agents/skills/` with host paths, and register `sharpen` and `/sharpen` in `packages/opencode-plugin/index.ts` with a command prompt naming the procedure file.

- In scope: `.agents/skills/work/**`, `.agents/skills/sharpen/**`, `packages/opencode-plugin/index.ts`.
- Out of scope: changing how existing `/drive` and `/orchestrate` commands load skills.

## Acceptance criteria

- AC1 = SC8.
- AC2: SC1 and SC7 hold for the `.agents/` copies.
- AC3: `mise run validate` and `mise run test` pass.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation suite before change | pass | ed82275 | parent B1: `mise run validate` exit 0 |
| AC1 | SC8: equivalent sharpen + procedure under `.agents/skills/`, OpenCode registers `sharpen` + `/sharpen` naming the procedure file | pass | working tree @ 621cd44 | `.agents/skills/work/references/question-rounds.md` (verbatim from `.claude`; provenance points upstream), `.agents/skills/sharpen/SKILL.md`, `packages/opencode-plugin/index.ts` SKILLS entry |
| AC2 | SC1+SC7: `.agents/` copies satisfy layout + heavy integration | pass | working tree @ 621cd44 | `.agents/skills/work/SKILL.md` line 41 names `question-rounds.md` next to `heavy.md`; `heavy.md` step 2 runs the procedure and records `decided:` lines |
| AC3 | `mise run validate` and `mise run test` exit 0 | blocked | working tree @ 621cd44 | validate: child 02 files pass, overall fail from pre-existing `.claude/worktrees/` + spec history walk (child 01). test: `bundle.test.ts` fails on manifest drift (`.claude`+`.agents` work files); manifest regenerated in child 03 (SC10) |

## Plan

1. Mirror files with `.agents/` paths.
2. Register the OpenCode skill and command.
3. Validate and test.

## Checkpoint

- date: 2026-10-14
- branch: main (working tree, not a task branch)
- HEAD: 621cd44 (child 01 merged)
- done: mirrored `.agents/skills/work/references/question-rounds.md` + `.agents/skills/sharpen/SKILL.md`, wired `.agents` heavy route and `heavy.md` step 2, registered `sharpen` + `/sharpen` in `packages/opencode-plugin/index.ts` (AC1, AC2 pass)
- next: child 03 (docs/principles §2, bundle/manifest SC9/SC10) — regenerates `manifest.json`, unblocks AC3's test gate
