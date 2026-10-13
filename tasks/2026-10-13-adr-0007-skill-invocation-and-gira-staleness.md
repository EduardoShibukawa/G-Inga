---
schema: task/1
tier: standard
status: active
---

# Make `/orchestrate` and `/drive` User-Invocable and Add the Gira-G Staleness Rule

## Routing and approvals

- tier: standard (S1 holds: every change is checkable by `grep` and `diff`; S2 holds: frontmatter flips and one added paragraph in an existing skill section; S3 holds: bounded to four skill files and this record, no consumed contract changes; S4 holds: two-way door; S5: the policy itself was decided in accepted ADR 0007, this task only transcribes it; S6 and S7 hold: `mise run validate` and `mise run test` pass at the baseline. ADR 0007 item 2 sizes the frontmatter change alone as `light`; this task also carries the item 3 staleness rule and keeps a record, and `light` never has a file, contract §3.1)
- approved: ADR 0007 follow-up for Decision items 2 and 3 by owner (2026-10-13, acceptance of [ADR 0007](../docs/decisions/0007-harness-extensions-beyond-v1.md) at 36034be, "Both are authorized by the acceptance on 2026-10-13")

## Objective

Restore the V1 budget of one model-invocable skill description by making `/orchestrate` and `/drive` user-invocable on both hosts (ADR 0007 item 2, fact `N3` of ADR 0005), and add the Gira-G staleness policy of ADR 0007 item 3 to Step 2 of both `/drive` copies as a deterministic instruction next to the existing `not run` fallback.

- In scope:
  - `.claude/skills/orchestrate/SKILL.md`
  - `.claude/skills/drive/SKILL.md`
  - `.agents/skills/orchestrate/SKILL.md`
  - `.agents/skills/drive/SKILL.md`
  - `tasks/2026-10-13-adr-0007-skill-invocation-and-gira-staleness.md`
- Out of scope:
  - `/work` on either host, `tools/validate/bundle.json` and `manifest.json` (neither covers `/orchestrate` or `/drive`).
  - A validator layer for staleness (owner answer to ADR 0007 open question 2), and any parsing of `gira.yaml` under `tools/`.
  - Regenerating `gira.yaml` or `docs/architecture/macro-map.json` (needs the owner-local `gira` CLI).
  - The approved spec, ADRs, and existing accepted or verified task records.
  - ADR 0007 item 4 (verification walk and spike S2), handled by a separate follow-up.

## Acceptance criteria

- AC1: `.claude/skills/orchestrate/SKILL.md`, `.claude/skills/drive/SKILL.md`, `.agents/skills/orchestrate/SKILL.md` and `.agents/skills/drive/SKILL.md` set `disable-model-invocation: true` in their frontmatter; both `/work` copies still set `false`.
- AC2: Step 2 of both `/drive` copies states the staleness rule of ADR 0007 item 3: the anchor is read from `gira.yaml`; the map is stale when `git rev-list --count <anchor>..HEAD -- .claude/skills .agents/skills tools docs/decisions` is greater than 0; a stale map may still be read but the run reports it as stale with its anchor; the check is `not run` when the anchor can't be read or isn't in local history; regeneration happens only where `gira` is on `PATH` and commits `gira.yaml` and the map together; Gira-G output is never gate evidence; the check is a `/drive` instruction, not a validator layer.
- AC3: `diff .claude/skills/drive/SKILL.md .agents/skills/drive/SKILL.md` and the same diff for `/orchestrate` show only pre-existing host-specific lines, so the staleness text is identical in both `/drive` copies.
- AC4: the staleness commands as written in the skill run in this repository and give a deterministic result.
- AC5: `mise run validate` exits 0 with Overall pass; `mise run test` exits 0.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validate and test | pass | 36034be | `mise install` ok; `mise run validate` Overall pass, exit 0 (external-links `not run`, network); `mise run test` exit 0, typecheck pass, 227 pass, 0 fail |
| AC1 | frontmatter flag on four skills | not run | | |
| AC2 | staleness rule in `/drive` Step 2 | not run | | |
| AC3 | mirror diffs | not run | | |
| AC4 | staleness commands run | not run | | |
| AC5 | validate and test | not run | | |
| V1 | diff bounded to declared scope | not run | | |

## Plan

skip: two independent edits (frontmatter flag, one paragraph in Step 2) applied identically to both host copies.

## Checkpoint

- as of: 2026-10-13, branch work/adr0007-followup-A, head 36034be, worktree dirty (this record)
- done: baseline B1 recorded
- next: edit the four skill files, then verify AC1-AC5 and V1
