---
schema: task/1
tier: heavy
status: accepted
verified_at: "19c24dd"
spec: 2026-10-14-work-user-invoked@1
---

# User-Invoked `/work` with a Worker Procedure Reference

## Routing and approvals

- tier: heavy (H3: reaches the bundle, `/drive`, `/orchestrate`, the OpenCode plugin and accepted ADR 0005 item 1; H4: harness policy)
- confirmed: heavy by owner (2026-10-14, "Sim, heavy (Recommended)")
- decided: worker access → move the `/work` body to `work/references/procedure.md` per host, `SKILL.md` becomes a thin entry, `/drive`, `/orchestrate` and `subagent-prompt.md` name the file by owner (2026-10-14, "Corpo em references/ (Recommended)")
- decided: OpenCode commands → keep the prompts, record the binary evidence and add a test pinning the `autoinvoke` mapping by owner (2026-10-14, "Manter + registrar (Recommended)")
- decided: delivered pointer → unchanged; without `/work` the agent suggests typing it by owner (2026-10-14, "Manter pointer (Recommended)")
- decided: decision record → new ADR 0010 revising ADR 0005 item 1 and recording the V1 spec deviation by owner (2026-10-14, "ADR 0010 nova (Recommended)")
- decided: evaluation cases → follow-up `todo` task, out of this scope by owner (2026-10-14, "Task de follow-up (Recommended)")
- approved: spec v1 by owner (2026-10-14, "Aprovo spec v1 + ADR 0010 (Recommended)")
- approved: ADR 0010 accepted by owner (2026-10-14, "Aprovo spec v1 + ADR 0010 (Recommended)")
- accepted: by owner (2026-10-14, "Feito")

## Objective

Make `/work` user-invoked on both hosts, as the owner's invocation rule of 2026-10-14 requires (question-rounds spec, Decisions). `/drive` and `/orchestrate` workers then reach the `/work` procedure through a reference file and not through the skill.

- In scope: both `work` skill copies, the `/drive` and `/orchestrate` worker instructions and subagent prompt template on both hosts, the bundle definition, manifest and `docs/bundle.md`, an OpenCode plugin test, ADR 0010, ADR 0005, ADR 0008 and the decision map, and a follow-up task for the evaluation cases.
- Out of scope: evaluation case edits, the delivered pointer, Gira-G map regeneration, question rounds and `/sharpen`.

## Acceptance criteria

SC1–SC8 from `specs/2026-10-14-work-user-invoked.md`.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation suite before change | pass | ed82275 | `mise run validate` exit 0 (Overall: pass) |
| B2 | repository test suite before change | pass | ed82275 | `mise run test` exit 0: 242 pass, 0 fail |
| SC1 | flag on every skill, both hosts | pass | 19c24dd | child AC1 |
| SC2 | procedure layout, one-level tier files, host parity | pass | 19c24dd | child AC2 |
| SC3 | workers name the procedure file, never the skill | pass | 19c24dd | child AC3 |
| SC4 | OpenCode evidence and regression test | pass | 19c24dd | child AC4; Notes |
| SC5 | bundle and two-commit manifest | pass | 19c24dd | child AC5 |
| SC6 | ADR 0010 accepted, ADR 0005, 0008 and decision map | pass | 19c24dd | child AC6; acceptance in the log above |
| SC7 | evaluation follow-up task | pass | 19c24dd | child AC7 |
| SC8 | `mise run validate` and `mise run test` at the integrated head | pass | 19c24dd | validate exit 0; test 244 pass, 0 fail |
| V1 | self-review: integrated diff `ed82275..19c24dd` read against SC1–SC8 | pass | 19c24dd | matches the fresh-context review |
| R1 | integrated regression | pass | 19c24dd | same run as SC8; `manifest.mjs --check` pass |

## Plan

1. Question rounds: two rounds, frontier empty (done).
2. Spec v1 and ADR 0010 drafted; spec v1 approved and ADR 0010 accepted by the owner (done).
3. Decompose at `@1` into one child (done): `-01-procedure-reference` covers SC1–SC7 (one session, one footprint). SC6 acceptance is recorded on this parent.
4. Integrated verification (SC8) and adversarial review (done); PR with a merge commit (manifest protocol); owner acceptance.

## Notes

OpenCode evidence (SC4), read from the installed `opencode` v2.0.29 binary (`strings` over `/usr/bin/opencode`):

- The skill-guidance loader keeps a skill in the session's listing only when it has a description and `autoinvoke` is not `false`.
- The `skill` tool takes `id` and calls `get(id)` on the skill registry, with no `autoinvoke` check. It fails only when the id isn't registered, and it then asserts the `skill` permission.
- The tool's description: "The skill ID must match an available skill or a skill explicitly referenced by the user."
- The frontmatter parser maps `disable-model-invocation: true` to `autoinvoke: false` unless `metadata["opencode/autoinvoke"]` is set.

So "Load the `<id>` skill" in a command prompt resolves with `autoinvoke: false`. `drive` and `orchestrate` already run this way.

## Review

Fresh-context adversarial review of `ed82275..19c24dd` against spec v1 (2026-10-14): no correctness bug and no SC1–SC7 violation.

- [F1] minor: with only the OpenCode plugin installed (no bundle in the target), `/work` used to carry routing inline. It now carries a pointer to `.claude/skills/work/references/procedure.md`, which doesn't resolve there -> rejected: the plugin header already limits deep references to repositories where the bundle is present, and the spec's "behaves as before" covers repositories with the bundle. Reported to the owner as a known limitation for plugin-only targets.

## Outcome

`/work` is user-invoked on Claude Code and Antigravity, and every G-Ingá skill now is (ADR 0010). Workers of `/drive` and `/orchestrate` read `work/references/procedure.md`. OpenCode commands keep working with `autoinvoke: false`, and a test pins that. Known limitation (review F1): a target with only the OpenCode plugin and no bundle gets no routing from `/work`. Accepted by the owner (PR #51 merged into `main` at 005bdb1). Pending: the evaluation follow-up `2026-10-14-evals-user-invoked-skills` (`todo`); Gira-G map regeneration (owner-local).

## Checkpoint

- Date: 2026-10-14
- Branch: `feat/work-user-invoked` (worktree `.claude/worktrees/epic-bell-e24599`); verified at 19c24dd
- Done: spec v1 approved, ADR 0010 accepted; child 01 verified; SC1–SC8, R1 and V1 pass; review F1 resolved.
- Merged: PR #51 into `main` at 005bdb1 (merge commit); owner accepted (2026-10-14).
- Next action: none on this record. Follow-ups: `2026-10-14-evals-user-invoked-skills` (`todo`); Gira-G map regeneration on the owner's machine (`gira index`).
