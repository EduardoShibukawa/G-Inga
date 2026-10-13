---
schema: task/1
tier: standard
status: verified
verified_at: "8d50993"
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
| AC1 | frontmatter flag on four skills | pass | 8d50993 | `grep -n '^disable-model-invocation'` over `.claude/skills/*/SKILL.md` and `.agents/skills/*/SKILL.md`: `true` for `orchestrate` and `drive` on both hosts, `false` for both `/work` copies |
| AC2 | staleness rule in `/drive` Step 2 | pass | 8d50993 | Step 2 in both copies: anchor read from `gira.yaml`; stale when the `git rev-list --count` over the four paths is greater than 0; stale map readable, reported as `gira map: stale (anchor <short-sha>, <count> commits)` in the ledger and worker prompts; `not run` when the anchor is empty or not in history; regeneration only where `gira` is on `PATH`, committing `gira.yaml` and the map together; not a validator layer; never gate evidence. Runs only when `gira` is available, next to the existing `not run` fallback |
| AC3 | mirror diffs | pass | 8d50993 | `/drive` diff shows only the two pre-existing host-specific reference lines; `/orchestrate` diff is byte-identical to its diff at 36034be (`cmp`), so the frontmatter flag matches on both hosts |
| AC4 | staleness commands run | pass | 8d50993 | commands as written in the skill: anchor `47cc03d`, `git cat-file -e` ok, count 7, so the map is stale; an empty anchor makes `git cat-file` fail (the `not run` path). `gira` not on `PATH` in this session, so `/drive` itself would take the fallback |
| AC5 | validate and test | pass | 8d50993 | `mise run validate` Overall pass, exit 0 (external-links `not run`, network); `mise run test` exit 0, typecheck pass, 227 pass, 0 fail |
| V1 | diff bounded to declared scope | pass | 8d50993 | `git diff --name-only 36034be 8d50993` lists only the five in-scope files; `bundle.json`, `manifest.json`, `/work` and `tools/` untouched |

## Plan

skip: two independent edits (frontmatter flag, one paragraph in Step 2) applied identically to both host copies.

## Outcome

`/orchestrate` and `/drive` are now user-invocable on both hosts, so `/work` is again the only model-invocable description per turn (ADR 0007 item 2). Step 2 of both `/drive` copies carries the ADR 0007 item 3 staleness check as a deterministic Git command, run only when `gira` is available and reported in the session ledger; it adds no validator layer. At 8d50993 the map anchored at `47cc03d` is stale (7 commits touch the watched paths); regenerating it needs the owner-local `gira` CLI.

Follow-up observation: ADR 0007 item 3 also names a `gira.yaml` locator that doesn't resolve as a fallback trigger; the existing `/drive` fallback checks only `command -v gira`. Left out of this task's scope.

## Checkpoint

- as of: 2026-10-13, branch work/adr0007-followup-A, head 8d50993, task verified
- done: flipped `disable-model-invocation` on four skills, added the staleness check to both `/drive` copies, verified AC1-AC5 and V1
- next: owner review and PR
