---
schema: task/1
tier: standard
status: verified
verified_at: "19c24dd"
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
| AC1 | `grep '^disable-model-invocation'` over all six `SKILL.md` files | pass | 19c24dd | `true` for `work`, `drive`, `orchestrate` on `.claude/` and `.agents/` |
| AC2 | procedure layout and parity | pass | 19c24dd | `## Invariants` to the end of `procedure.md` matches `ed82275:<host>/skills/work/SKILL.md` on both hosts; host-normalized `diff` of the two `procedure.md` copies is empty; thin `SKILL.md` names `standard.md`, `heavy.md`, `review.md`, `resume.md` |
| AC3 | worker instructions | pass | 19c24dd | `git grep` finds `references/procedure.md` in both hosts' `drive/SKILL.md`, `orchestrate/SKILL.md` and `subagent-prompt.md` (template and example); 0 matches for a worker that runs, executes or invokes `/work` |
| AC4 | OpenCode evidence and test | pass | 19c24dd | evidence in parent Notes; `bun test packages/opencode-plugin` 2 pass, wired into `mise run test` |
| AC5 | bundle and manifest | pass | 19c24dd | `bundle.json`, `docs/bundle.md` and `validate.js` list both copies; assets commit 772ec86, manifest commit 2ff89d1; `manifest.mjs --check` pass |
| AC6 | decision records | pass | 19c24dd | ADR 0005 item 1 and Alternative B point to ADR 0010; decision map lists it; ADR 0008 context corrected |
| AC7 | follow-up task | pass | 19c24dd | `tasks/2026-10-14-evals-user-invoked-skills.md`, `todo` |
| V1 | self-review: `git diff ed82275..19c24dd` read against AC1–AC7 | pass | 19c24dd | no out-of-scope file; moved procedure text unchanged apart from the intro and the two added notes |
| R1 | `mise run validate` and `mise run test` | pass | 19c24dd | validate exit 0 (Overall: pass); test exit 0: 244 pass, 0 fail |

## Outcome

`/work` is user-invoked on both hosts. Its procedure lives in `work/references/procedure.md`, and `SKILL.md` is a thin entry. `/drive` and `/orchestrate` workers are pointed at that file. The bundle and manifest cover both copies, and an OpenCode test pins `autoinvoke: false`. Evaluation cases are tracked in `2026-10-14-evals-user-invoked-skills`.

## Checkpoint

- Date: 2026-10-14
- Branch: `feat/work-user-invoked` (worktree `.claude/worktrees/epic-bell-e24599`)
- Done: AC1–AC7 implemented and checked at 19c24dd; R1 pass.
- Next action: parent integrated verification.
