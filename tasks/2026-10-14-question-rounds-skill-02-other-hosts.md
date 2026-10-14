---
schema: task/1
tier: standard
status: todo
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

## Plan

1. Mirror files with `.agents/` paths.
2. Register the OpenCode skill and command.
3. Validate and test.
