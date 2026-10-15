---
schema: task/1
tier: standard
status: verified
verified_at: "55f7299"
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
| AC1 | SC1 Layout: procedure file, sharpen skill, provenance | pass | 55f7299 | `.claude/skills/work/references/question-rounds.md` names `grilling` and `domain-modeling` at `49dd158` (line 1 and §Provenance); overlap gate against upstream: 0/41 verbatim lines, 0.0% of 8-word shingles; `.claude/skills/sharpen/SKILL.md` has `disable-model-invocation: true`, a one-line description and no procedure of its own |
| AC2 | SC2 Rounds: whole-frontier, numbered, recommended answers | pass | 55f7299 | §The model and §Running a round: whole ready set per round, Q1…Qn each with a recommended pick and reason, dependent questions held for a later round, stop when nothing is ready, owner confirms before any action |
| AC3 | SC3 Facts vs Decisions: agent finds facts, subagents allowed | pass | 55f7299 | §Facts and decisions: facts looked up by the agent, read-only subagent in the read-only search role for wide lookups without pausing independent questions, decisions always to the owner |
| AC4 | SC4 Domain Discipline: challenge, sharpen, scenarios, code cross-check, glossary | pass | 55f7299 | §Keeping the vocabulary honest 1–5, entry rules (no implementation detail, lazy creation) and §Legacy `CONTEXT.md` migration |
| AC5 | SC5 ADR Offers: three conditions, proposed, owner accepts | pass | 55f7299 | §When to offer an ADR: all three conditions, written to `docs/decisions/` as `proposed`, only the owner accepts; house layout |
| AC6 | SC6 Standalone Close: persists glossary/ADRs, decision summary, offers /work | pass | 55f7299 | §Standalone mode: only glossary entries and owner-agreed ADR drafts as `proposed`, no task or spec file, decision summary, offer to continue under `/work` |
| AC7 | SC7 Heavy Integration: SKILL.md references procedure, heavy.md step 2 runs it | pass | 55f7299 | `.claude/skills/work/SKILL.md` lines 11 and 16 name `references/question-rounds.md`; `heavy.md` step 2 runs it and records `decided:` lines; every reference file is named in `SKILL.md` |
| AC8 | `mise run validate` and `mise run test` | pass | 55f7299 | `mise run validate` exit 0 (Overall: pass); `mise run test` exit 0 (264 pass, 0 fail) |
| R1 | repository validation and test suites after the review fixes | pass | 55f7299 | `mise run validate` exit 0 (Overall: pass); `mise run test` exit 0 (264 pass, 0 fail) at 55f7299 (child `-04-review-fixes`) |
| V1 | self-review: files at 55f7299 read against SC1–SC7 | pass | 55f7299 | rows AC1–AC8 re-checked on the rewritten procedure |

## Plan

1. Draft the procedure from the spec's expected behavior, citing upstream at `49dd158`.
2. Add the `sharpen` entry.
3. Update the heavy route and `heavy.md` step 2.
4. Validate and test.

## Outcome

The question-rounds procedure lives once in `.claude/skills/work/references/question-rounds.md` with its upstream provenance. `/sharpen` is a thin user-invoked entry that reads it in standalone mode, and the `/work` heavy route runs it in step 2 and records answers as `decided:` lines (SC1–SC7 for Claude Code; the text was rewritten in G-Ingá's own words by `-04-review-fixes`).

## Checkpoint

- date: 2026-10-14
- branch: task/2026-10-14-question-rounds-01-procedure
- HEAD: 75d3efc
- done: procedure file, /sharpen skill, heavy route and heavy.md step 2 for Claude Code (SC1–SC7)
- next: child 02 (Antigravity/OpenCode)

- Update 2026-10-15: revalidated on `main` at 48e1949, after the spec history-walk fixes (`2026-10-14-spec-history-squash-creation`, `2026-10-14-fix-history-walk-sibling-unchanged`) cleared the spec history failure that had blocked the suites; every AC re-checked against the files at 48e1949. Not promoted: the parent's fresh-context review found SC1 unmet (F1, close copy of upstream); the record stays `completed` until the parent's fix child lands.
- Update 2026-10-15 (later): the parent's review fixes (child `-04-review-fixes`, verified at 55f7299) rewrote the procedure in G-Ingá's own words; every AC re-checked at 55f7299; promoted `completed` → `verified`.
