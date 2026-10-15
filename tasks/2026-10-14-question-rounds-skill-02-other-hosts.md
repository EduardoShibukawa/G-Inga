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
| AC1 | SC8: equivalent sharpen + procedure under `.agents/skills/`, OpenCode registers `sharpen` + `/sharpen` naming the procedure file | pass | 48e1949 | `.agents/skills/work/references/question-rounds.md` (same SHA-256 as the `.claude` copy in `manifest.json`), `.agents/skills/sharpen/SKILL.md`; `packages/opencode-plugin/index.ts` registers skill `sharpen` (`autoinvoke` false) and command `/sharpen` naming `.agents/skills/work/references/question-rounds.md`; live OpenCode v2.0.29 `/api/command` lists `sharpen`, `/api/skill` serves it with `autoinvoke` false |
| AC2 | SC1+SC7: `.agents/` copies satisfy layout + heavy integration | fail | 48e1949 | fail at 48e1949: fresh-context review finding F1 (2026-10-15): the procedure is a close copy of upstream (13 of 50 substantive lines verbatim, owner→user normalized; question format, domain-modeling subsections, glossary rules, ADR template) without the MIT notice, and lines 4 and 140 claim original text; SC1 requires G-Ingá's own text; the `.agents` copy is byte-identical |
| AC3 | `mise run validate` and `mise run test` exit 0 | pass | 48e1949 | `mise run validate` exit 0, local; CI on `main` 48e1949: `pre-commit` and `test` success (was `blocked` at 621cd44 on manifest drift and the spec history walk, both fixed since) |
| R1 | repository validation and test suites on `main` | pass | 48e1949 | `mise run validate` exit 0 (Overall: pass), local; CI on `main` 48e1949: `pre-commit` success, `test` success |
| V1 | self-review: `.agents/` copies and OpenCode registration at 48e1949 against SC8 | pass | 48e1949 | diff of the child's files read at 48e1949; no reference deeper than one level below `SKILL.md` |

## Plan

1. Mirror files with `.agents/` paths.
2. Register the OpenCode skill and command.
3. Validate and test.

## Outcome

Antigravity has the same `sharpen` entry and procedure copy under `.agents/skills/`, wired into its heavy route. The OpenCode plugin registers the `sharpen` skill and a `/sharpen` command that names the procedure file, so it runs without model invocation (SC8). The procedure copy shares the open SC1 finding (review F1).

## Checkpoint

- date: 2026-10-14
- branch: main (working tree, not a task branch)
- HEAD: 621cd44 (child 01 merged)
- done: mirrored `.agents/skills/work/references/question-rounds.md` + `.agents/skills/sharpen/SKILL.md`, wired `.agents` heavy route and `heavy.md` step 2, registered `sharpen` + `/sharpen` in `packages/opencode-plugin/index.ts` (AC1, AC2 pass)
- next: child 03 (docs/principles §2, bundle/manifest SC9/SC10) — regenerates `manifest.json`, unblocks AC3's test gate

- Update 2026-10-15: revalidated on `main` at 48e1949, after the spec history-walk fixes (`2026-10-14-spec-history-squash-creation`, `2026-10-14-fix-history-walk-sibling-unchanged`) cleared the spec history failure that had blocked the suites; every AC re-checked against the files at 48e1949. Not promoted: the parent's fresh-context review found SC1 unmet (F1, close copy of upstream); the record stays `completed` until the parent's fix child lands.
