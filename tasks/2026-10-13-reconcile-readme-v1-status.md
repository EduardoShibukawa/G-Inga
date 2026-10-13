---
schema: task/1
tier: standard
status: active
---

# Reconcile README Status with the Delivered V1

## Routing and approvals

- tier: standard (S1 holds: every README claim is checkable against repository files; S2 holds: edits follow the existing README structure; S3 holds: bounded to `README.md` and this record; S4 holds: two-way door)
- approved: owner request (2026-10-13, ticket to fix the stale README status)

## Objective

`README.md` still reports the V1 product as pending, says product runtime code is not implemented, and lists ADR 0006 as `proposed`. The repository shows otherwise:

- V1 child tasks `tasks/2026-10-11-minimal-v1-specification-01..05-*.md` are `verified` and the parent `tasks/2026-10-11-minimal-v1-specification.md` is `accepted`.
- The bundle exists: `.claude/skills/work/`, `.agents/skills/work/`, `tools/validate/`, and `manifest.json` with `release: 1.0.0`.
- `docs/decisions/0006-usage-observability.md` is `accepted` (2026-10-11).
- `/orchestrate` and `/drive` skills exist under `.claude/skills/` and `.agents/skills/`, beyond the V1 spec, with no ADR covering them.

Update the README status, the note, and the open/settled lists to match.

- In scope:
  - `README.md`
  - `tasks/2026-10-13-reconcile-readme-v1-status.md`
- Out of scope:
  - Any other file, including ADRs, specs, the decision map, and the skill bundles.

## Acceptance criteria

- AC1: The README status line reports the V1 implementation as delivered (child tasks `verified`, parent `accepted`, bundle release `1.0.0`).
- AC2: The README note no longer claims that product runtime code is unimplemented.
- AC3: ADR 0006 appears in the settled list as accepted and no longer in the open list.
- AC4: The README mentions that `/orchestrate` and `/drive` exist beyond the V1 spec with their governance decision pending, without linking a nonexistent ADR.
- AC5: `bun run validate` exits 0 and `bun run typecheck && bun run test` pass.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validate and test | pass | b1aa551720fdaf14b71d266c0be0c19a947f4d6c | `bun run validate` Overall pass (mise not installed; full history); `bun run typecheck` pass; `bun run test` 220 pass, 0 fail. HEAD b1aa551 differs from 6e7af64 only in `.markdownlint.jsonc` |

## Plan

skip: two README edits in one file; order does not matter.
