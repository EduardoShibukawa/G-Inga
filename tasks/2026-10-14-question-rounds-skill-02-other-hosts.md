---
schema: task/1
tier: standard
status: verified
verified_at: "55f7299"
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
| AC1 | SC8: equivalent sharpen + procedure under `.agents/skills/`, OpenCode registers `sharpen` + `/sharpen` naming the procedure file | pass | 55f7299 | `.agents/skills/work/references/question-rounds.md` byte-identical to the `.claude` copy, with no host path; `.agents/skills/sharpen/SKILL.md`; `packages/opencode-plugin/index.ts` registers skill `sharpen` (`autoinvoke` false) and `/sharpen` naming `.claude/skills/work/references/question-rounds.md`, the file the loaded skill names; `bun test packages/opencode-plugin` 2/2 |
| AC2 | SC1+SC7: `.agents/` copies satisfy layout + heavy integration | pass | 55f7299 | overlap gate on the `.agents` copy: 0/41 verbatim lines, 0.0% shingles; `.agents/skills/work/SKILL.md` lines 11 and 16 name `references/question-rounds.md`; `heavy.md` step 2 runs it |
| AC3 | `mise run validate` and `mise run test` exit 0 | pass | 55f7299 | `mise run validate` exit 0; `mise run test` exit 0 (264 pass, 0 fail) |
| R1 | repository validation and test suites after the review fixes | pass | 55f7299 | `mise run validate` exit 0 (Overall: pass); `mise run test` exit 0 (264 pass, 0 fail) at 55f7299 (child `-04-review-fixes`) |
| V1 | self-review: `.agents/` copies and OpenCode registration at 55f7299 against SC8 | pass | 55f7299 | files read at 55f7299 |

## Plan

1. Mirror files with `.agents/` paths.
2. Register the OpenCode skill and command.
3. Validate and test.

## Outcome

Antigravity has the same `sharpen` entry and procedure copy under `.agents/skills/`, wired into its heavy route. The OpenCode plugin registers the `sharpen` skill and a `/sharpen` command that names the procedure file, so it runs without model invocation (SC8).

## Checkpoint

- date: 2026-10-14
- branch: main (working tree, not a task branch)
- HEAD: 621cd44 (child 01 merged)
- done: mirrored `.agents/skills/work/references/question-rounds.md` + `.agents/skills/sharpen/SKILL.md`, wired `.agents` heavy route and `heavy.md` step 2, registered `sharpen` + `/sharpen` in `packages/opencode-plugin/index.ts` (AC1, AC2 pass)
- next: child 03 (docs/principles §2, bundle/manifest SC9/SC10) — regenerates `manifest.json`, unblocks AC3's test gate

- Update 2026-10-15: revalidated on `main` at 48e1949, after the spec history-walk fixes (`2026-10-14-spec-history-squash-creation`, `2026-10-14-fix-history-walk-sibling-unchanged`) cleared the spec history failure that had blocked the suites; every AC re-checked against the files at 48e1949. Not promoted: the parent's fresh-context review found SC1 unmet (F1, close copy of upstream); the record stays `completed` until the parent's fix child lands.
- Update 2026-10-15 (later): the parent's review fixes (child `-04-review-fixes`, verified at 55f7299) rewrote the procedure in G-Ingá's own words; every AC re-checked at 55f7299; promoted `completed` → `verified`.
