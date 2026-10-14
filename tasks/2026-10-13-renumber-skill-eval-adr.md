---
schema: task/1
tier: standard
status: verified
verified_at: "0d91f6b"
---

# Renumber the Skill Evaluation ADR to 0008

## Routing and approvals

- tier: standard (S1, S2, S4, S7 hold: a file rename plus reference updates, checkable by `grep` and `local-links`; `light` is excluded because the change spans docs, task records and a validator module, and the new uniqueness rule is a validator behavior change)
- approved: owner request (2026-10-13, `/drive --limit 4` backlog item a "renumber-skill-eval-adr")

## Objective

Two ADRs share number 0007 on `main`: `docs/decisions/0007-harness-extensions-beyond-v1.md` (cited by `/drive` as "ADR 0007 item 3") and `docs/decisions/0007-skill-evaluation-instrument.md` (merged later). Renumber the skill evaluation one to 0008, update every live reference, and make the `decision-records` check fail on a duplicate ADR number.

- In scope:
  - `docs/decisions/0007-skill-evaluation-instrument.md` → `docs/decisions/0008-skill-evaluation-instrument.md`
  - `docs/decision-map.md`, `docs/README.md`
  - `tools/eval/classify_plugin_eval.ts` (doc comment)
  - `tools/validate/decisions/decisionRecords.ts`, `tools/validate/validate.test.ts`
  - `tasks/2026-10-13-skill-health-evaluation.md`, `tasks/2026-10-13-skill-health-evaluation-05-baseline-run.md` (both `completed`, prose references only)
  - `tasks/2026-10-13-renumber-skill-eval-adr.md`
- Out of scope:
  - `specs/2026-10-11-minimal-v1-specification.md` (hash-frozen) and every `verified` record.
  - Approval log entries and evidence rows already recorded at a commit (history).

## Acceptance criteria

- AC1: Exactly one ADR file per number under `docs/decisions/`; the skill evaluation ADR is `0008` with H1 `# 0008 — Skill evaluation instrument`.
- AC2: No live reference to the skill evaluation ADR uses `0007`; the remaining ones are listed below as known stale references.
- AC3: `decision-records` fails when two ADRs share a number, with a committed test; at the pre-rename tree it reports the real duplicate.
- AC4: `mise run validate` passes.
- AC5: `mise run test` passes (0 fail).

## Known stale references

Left as recorded history; each one means the skill evaluation instrument, now ADR 0008:

- `tasks/2026-10-13-skill-health-evaluation-01-instrument-adr.md` (`verified`): AC1 row and `## Outcome` cite `docs/decisions/0007-skill-evaluation-instrument.md` / "ADR 0007".
- `tasks/2026-10-13-skill-health-evaluation.md`: the `approved: ADR 0007 accepted by owner` log entry and the SC8 evidence row at `f21e3d9`.

`mise.toml` cites only ADR 0006 and the skill health spec carries no ADR number, so neither needed a change.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validate | pass | 43ca06a | Overall pass; `decision-records` reports "7 ADRs" for 8 files (the duplicate collapsed silently) |
| B2 | baseline test | pass | 43ca06a | 240 pass, 0 fail |
| AC1 | one ADR per number | pass | 0d91f6b | `ls docs/decisions/`: 0001–0008, one file each; H1 `# 0008 — Skill evaluation instrument` |
| AC2 | no live 0007 reference to the skill evaluation ADR | pass | 0d91f6b | `grep -rn 0007-skill-evaluation` hits only this record and the verified child 01 (listed as stale); map, docs index and `classify_plugin_eval.ts` cite 0008 |
| AC3 | duplicate ADR number fails | pass | 0d91f6b | new `validate.test.ts` case passes; before the rename `mise run validate` failed with "0007-skill-evaluation-instrument.md: ADR number 0007 is already used by ...0007-harness-extensions-beyond-v1.md" |
| AC4 | validate | pass | 0d91f6b | Overall pass; `decision-records` "8 ADRs, 9 map rows" |
| AC5 | test | pass | 0d91f6b | 241 pass, 0 fail |
| V1 | diff read against AC1-AC5 and the out-of-scope list | pass | 0d91f6b | 9 files; rename detected by git; no change to the approved spec or any `verified` record |

## Plan

skip: rename, update references, add the check; the acceptance criteria are the plan.

## Outcome

The skill evaluation instrument is ADR 0008; the decision map, docs index and the eval classifier comment cite it, and the two `completed` skill health records use the new number in prose. `decision-records` now rejects two ADRs sharing a number, so the collision can't recur silently. Recorded history keeps 0007 and is listed under Known stale references.

## Checkpoint

- as of: 2026-10-13, branch work/renumber-skill-eval-adr, head 0d91f6b plus the commit recording this status, worktree clean after it, task verified; next: owner review of the PR
