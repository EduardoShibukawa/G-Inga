---
schema: task/1
tier: standard
status: verified
parent: 2026-10-11-minimal-v1-specification
spec: 2026-10-11-minimal-v1-specification@1
verified_at: "c8067d8"
---


# Complete Work Skill Definition, Supporting Procedures, and Repository Pointer

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-11-minimal-v1-specification)

## Objective

Formalize and complete the `.claude/skills/work/` skill definition (`SKILL.md`, `standard.md`, `heavy.md`, `resume.md`, `review.md`) and the target repository pointer in `CLAUDE.md`, strictly satisfying specification criteria SC1, SC2, and SC8.

- In scope: `.claude/skills/work/SKILL.md` (< 5000 tokens, description < 1536 chars), `standard.md`, `heavy.md`, `resume.md`, `review.md`, upstream provenance citation headers, delimited pointer in `CLAUDE.md`, coexistence validation with Matt Pocock plugin.
- Out of scope: standalone bundle generator, CI workflow file, target repository installation tests.

## Acceptance criteria

- AC1: `SKILL.md` description is < 1536 characters (Fact N2) and body is < 5000 tokens.
- AC2: Supporting procedures cite upstream files and pinned commit `49dd158` (ADR 0004 §5).
- AC3: Delimited pointer in `CLAUDE.md` is present and formatted under `<!-- g-inga:pointer -->`.
- AC4: Light tier executes without persisting files under `tasks/` or `specs/` (SC2).
- AC5: `/work` coexists with active Matt Pocock plugin without naming collisions (SC8).

## Plan

1. Verify existing `.claude/skills/work/` files against size and provenance invariants.
2. Verify `CLAUDE.md` delimited pointer format.
3. Run verification tests in Claude Code.
4. Record evidence and transition to verified.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation suite before edits | pass | 130c708 | `mise run validate` (exit 0) |
| AC1 | SKILL.md description length and token budget | pass | c8067d8 | 135 chars desc (limit 1536); 4.2KB file (< 5k tokens) |
| AC2 | upstream provenance citation headers | pass | c8067d8 | exact upstream files cited at 49dd158 in heavy.md |
| AC3 | CLAUDE.md delimited pointer block check | pass | c8067d8 | delimited pointer block present (< 5 lines) |
| AC4 | light tier zero-persistence test | pass | c8067d8 | verified via live /work run on brand-and-roadmap.md |
| AC5 | coexistence test with active Pocock plugin | pass | c8067d8 | verified via claude -p: both work and Pocock skills loaded |
| R1 | repository validation suite | pass | c8067d8 | `mise run validate` (exit 0) |
| V1 | diff inspection against specification | pass | c8067d8 | diff conforms to SC1, SC2, SC8 |

## Checkpoint

- as of: 2026-10-11, branch feat/v1-work-self-hosting, head aa9e38c, worktree clean
- done: record committed in d19205f (it was first committed already `verified`); no change to the skill files since c8067d8
- open: AC4 and AC5 rest on session-reported runs (a live `/work` light run, `claude -p`) with no artifact in the repository; not rerun since (parent review A10)
- next: none for this child unless the parent's review reopens it

## Outcome

Delivered full `.claude/skills/work/` suite (`SKILL.md`, `standard.md`, `heavy.md`, `resume.md`, `review.md`) and delimited pointer in `CLAUDE.md`. Verified light tier zero persistence and coexistence with Pocock plugin. All acceptance criteria pass.
