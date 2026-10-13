---
schema: task/1
tier: standard
status: completed
parent: 2026-10-13-skill-health-evaluation
spec: 2026-10-13-skill-health-evaluation@1
---

# Cross-Host Skill Parity Inventory

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-13-skill-health-evaluation after spec v1 approval)

## Objective

Inventory every difference between the Claude Code and Antigravity copies of the three skills and classify each as host adaptation or drift (spec SC4).

- In scope: a research note under `docs/research/`, this record.
- Out of scope: editing any skill instruction file (spec SC6); changes to the approved spec or accepted ADRs.

## Acceptance criteria

- AC1 = SC4: every textual difference is listed and classified host adaptation or drift with a one-line reason.
- AC2: drift items are listed as follow-up candidates; no skill file changes.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | c039980 | parent B1/B2: `mise run validate` exit 0, `mise run test` 227 pass |
| AC1 | `diff -r` of `.claude/skills/<s>/` vs `.agents/skills/<s>/` for work, drive, orchestrate; every difference classified in `docs/research/2026-10-13-skill-parity-inventory.md` | pass | worktree | base f67d13c; 11 files per side, 10 differ, 0 one-sided; 30/30 differences classified with one-line reason (work 9/0, drive 1/0, orchestrate 17/3 host adaptation/drift) |
| AC2 | drift listed as follow-up candidates; skill files unchanged | pass | worktree | 2 follow-up candidates (O5+C4 worktree merge-back rule missing on Antigravity; C1 retry semantics); `git diff --stat -- .claude/skills .agents/skills` empty |

## Outcome

- Delivered: `docs/research/2026-10-13-skill-parity-inventory.md` with 30 classified differences (27 host adaptation, 3 drift) across work, drive and orchestrate.
- Not delivered: no skill edits by design (spec SC6).
- Follow-ups: port the worktree selection and merge-back-before-Gate-Layer-1 rule to the Antigravity orchestrate `SKILL.md` and `references/ooda-cycle.md`; align the Antigravity `ooda-cycle.md` retry label with its `gate.md` procedure.
