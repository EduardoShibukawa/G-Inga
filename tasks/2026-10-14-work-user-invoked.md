---
schema: task/1
tier: heavy
status: active
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

## Plan

1. Question rounds: two rounds, frontier empty (done).
2. Spec v1 and ADR 0010 drafted; spec v1 approved and ADR 0010 accepted by the owner (done).
3. Decompose at `@1` into one child (done): `-01-procedure-reference` covers SC1–SC7 (one session, one footprint). SC6 acceptance is recorded on this parent.
4. Integrated verification (SC8), adversarial review, owner acceptance, PR with a merge commit (manifest protocol).

## Notes

OpenCode evidence (SC4), read from the installed `opencode` v2.0.29 binary (`strings` over `/usr/bin/opencode`):

- The skill-guidance loader keeps a skill in the session's listing only when it has a description and `autoinvoke` is not `false`.
- The `skill` tool takes `id` and calls `get(id)` on the skill registry, with no `autoinvoke` check. It fails only when the id isn't registered, and it then asserts the `skill` permission.
- The tool's description: "The skill ID must match an available skill or a skill explicitly referenced by the user."
- The frontmatter parser maps `disable-model-invocation: true` to `autoinvoke: false` unless `metadata["opencode/autoinvoke"]` is set.

So "Load the `<id>` skill" in a command prompt resolves with `autoinvoke: false`. `drive` and `orchestrate` already run this way.

## Review

Not run yet: the fresh-context adversarial review runs after integrated verification.

## Checkpoint

- Date: 2026-10-14
- Branch: `feat/work-user-invoked` from ed82275 (worktree `.claude/worktrees/epic-bell-e24599`)
- Done: heavy confirmed; two question rounds decided; spec v1 drafted; ADR 0010 proposed; baseline B1 and B2 recorded.
- Next action: owner approves spec v1 and accepts ADR 0010; then decompose and implement child 01.
