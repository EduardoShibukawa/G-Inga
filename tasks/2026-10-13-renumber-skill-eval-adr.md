---
schema: task/1
tier: standard
status: active
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

## Plan

skip: rename, update references, add the check; the acceptance criteria are the plan.
