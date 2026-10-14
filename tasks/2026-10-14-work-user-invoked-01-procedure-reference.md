---
schema: task/1
tier: standard
status: active
parent: 2026-10-14-work-user-invoked
spec: 2026-10-14-work-user-invoked@1
---

# Move the `/work` Procedure to a Reference and Flip the Flag

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-14-work-user-invoked after spec v1 approval)

## Objective

Make `/work` user-invoked on both hosts, with its procedure in `work/references/procedure.md`, and point `/drive` and `/orchestrate` workers at that file.

- In scope: `.claude/skills/{work,drive,orchestrate}/`, `.agents/skills/{work,drive,orchestrate}/`, `tools/validate/bundle.json`, `manifest.json`, `docs/bundle.md`, an OpenCode plugin test and the `test` script, ADR 0005 and ADR 0008, and a follow-up task for evaluation cases.
- Out of scope: evaluation case files, the delivered pointer, `docs/architecture/macro-map.json`.

## Acceptance criteria

- AC1 = SC1.
- AC2 = SC2.
- AC3 = SC3.
- AC4 = SC4.
- AC5 = SC5.
- AC6 = SC6, except the owner's acceptance, which the parent records.
- AC7 = SC7.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | ed82275 | parent B1 and B2: `mise run validate` exit 0; `mise run test` 242 pass, 0 fail |

## Checkpoint

- Date: 2026-10-14
- Branch: `feat/work-user-invoked` (worktree `.claude/worktrees/epic-bell-e24599`)
- Done: decomposed at `@1`.
- Next action: implement AC1–AC7.
