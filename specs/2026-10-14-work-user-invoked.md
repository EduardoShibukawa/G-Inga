---
schema: spec/1
status: draft
version: 1
---

# User-Invoked `/work` with a Worker Procedure Reference

## Problem

`/work` is the only G-Ingá skill the model can invoke by itself. The owner's invocation rule (2026-10-14) makes every entry point the owner types user-invoked, and puts anything another skill or subagent must reach in a reference file. `/work` stayed model-invocable for one reason: `/drive` and `/orchestrate` dispatch worker subagents that "execute `/work`".

Claude Code's skills documentation says that `disable-model-invocation: true` does three things:

- it blocks Claude's Skill-tool call;
- it tells Claude not to reproduce the skill's steps another way;
- it stops the skill from being preloaded into subagents.

Flipping the flag today would therefore leave workers without the procedure. Reading `work/SKILL.md` directly would be reproducing a blocked skill.

The OpenCode plugin maps `disable-model-invocation: true` to `autoinvoke: false`. Its `/drive` and `/orchestrate` commands only say "Load the `<id>` skill", and nothing records whether that works when `autoinvoke` is false.

Who is affected: the owner, in this repository and in every target repository that installs the bundle or the plugin.

Heavy triggers:

- H3: the change reaches the bundle, `/drive`, `/orchestrate`, the OpenCode plugin and the accepted ADR 0005 item 1.
- H4: it is harness policy.

## Expected behavior

- On Claude Code and Antigravity, `/work` runs only when the owner types it. The model cannot invoke it, and its description no longer costs context every turn.
- Typing `/work <request>` behaves as before: routing line first, then the tier procedures.
- `/drive` and `/orchestrate` workers follow the same `/work` procedure by reading a reference file named in their dispatch prompt. They never invoke the `work` skill.
- The `/work`, `/drive` and `/orchestrate` OpenCode commands keep loading their skills with `autoinvoke: false`, and the evidence for that is recorded.
- A change typed without `/work` gets no automatic routing line. The delivered pointer is unchanged, and the agent suggests typing `/work`.

## Scope

- In scope:
  - the `/work` procedure body moved to one reference file per host, with `SKILL.md` reduced to a thin user-invoked entry that names that file and the tier files;
  - the `/drive` and `/orchestrate` worker instructions and the subagent prompt template on both hosts;
  - the bundle definition, `docs/bundle.md` and the integrity manifest;
  - recorded evidence and a regression test for the OpenCode `autoinvoke` mapping;
  - ADR 0010, a pointer from ADR 0005 item 1, the decision map, and the stale count in ADR 0008's context;
  - a follow-up task for the evaluation cases.
- Out of scope:
  - evaluation case changes: conformance prompts that say "Use the work skill", the `work` should-fire and registration trigger cases, and the same pre-existing defect in the `drive` and `orchestrate` cases (follow-up task);
  - the delivered pointer text;
  - regenerating the Gira-G map, which still records the old flag (owner-local `gira`);
  - the question-rounds procedure and `/sharpen` (separate spec).
- Non-goals: changing routing rules, tier procedures or the artifact contract.

## Acceptance criteria

- SC1 **Flag.** Both host copies of `work/SKILL.md` set `disable-model-invocation: true`. Every G-Ingá skill on both hosts is then user-invoked.
- SC2 **Procedure layout.** Each host has one `work/references/procedure.md` holding the routing, escalation and light-tier procedure that `SKILL.md` held, with that host's paths. `SKILL.md` holds no procedure. It tells the agent to read and follow that file for the typed request, and it names `standard.md`, `heavy.md`, `resume.md` and `review.md` itself, so each is one level from `SKILL.md`. Apart from paths and the host description, the two procedure copies are identical.
- SC3 **Workers.** On both hosts, `/drive` Step 4, the `/orchestrate` worker dispatch and `subagent-prompt.md` tell each worker to read and follow that host's `work/references/procedure.md`, and never to invoke the `work` skill. No skill text still says a worker runs or executes `/work`.
- SC4 **OpenCode.** The task records the evidence from the installed OpenCode:
  - `autoinvoke: false` only removes a skill from the per-session skill listing;
  - the `skill` tool loads any registered skill by id without checking `autoinvoke`;
  - the tool's description admits a skill the user explicitly references.

  The command prompts stay unchanged. A test in `mise run test` asserts that the plugin registers `work`, `drive` and `orchestrate` with `autoinvoke: false`, and that each command prompt names its skill id.
- SC5 **Bundle.** `bundle.json` and `docs/bundle.md` list both `procedure.md` copies. `manifest.json` is regenerated with the two-commit protocol, and `bun tools/validate/manifest.mjs --check` passes.
- SC6 **Decision records.** ADR 0010 states the rule and revises ADR 0005 item 1 and Alternative B. It records the deviation from the approved V1 spec's "model-invocable entry skill" without editing that spec, and the owner accepts it. ADR 0005 item 1 points to ADR 0010. The decision map lists ADR 0010. ADR 0008's context no longer says three model-invoked skills.
- SC7 **Follow-up.** A `todo` standard task names the evaluation cases to change and why.
- SC8 **Checks.** `mise run validate` and `mise run test` pass at the integrated head.

## Interfaces and dependencies

- Changed contracts:
  - the delivered bundle gains two files;
  - the `work` skill becomes user-invoked on both hosts;
  - the worker dispatch prompt of `/drive` and `/orchestrate` changes.
- Consumers: owner sessions on Claude Code, Antigravity and OpenCode; `/drive` and `/orchestrate` workers; target repositories that update the bundle; the `claude plugin eval` cases (follow-up).
- External: Claude Code skills documentation (invocation control); OpenCode v2.0.29 skill tool and skill guidance behavior.

## Decisions

- The invocation rule, the `/work` exception and the follow-up task for the flip (owner, 2026-10-14, recorded in the question-rounds spec).
- The worker procedure lives in `work/references/procedure.md`, with `SKILL.md` as a thin entry (owner, 2026-10-14). Rejected alternatives:
  - workers reading `SKILL.md`, which reproduces a blocked skill;
  - a separate worker-only file, which duplicates the routing rules.
- OpenCode commands stay as they are, and the evidence is recorded with a regression test (owner, 2026-10-14). Rejected alternative: naming the absolute skill path in each command, kept for the case where OpenCode starts filtering the tool by `autoinvoke`.
- The delivered pointer is unchanged (owner, 2026-10-14). Rejected alternative: a pointer that also names the procedure file, which changes target text.
- The decision record is a new ADR 0010 (owner, 2026-10-14). Rejected alternative: a revision line inside ADR 0005.
- Evaluation cases go to a follow-up task (owner, 2026-10-14). Rejected alternative: changing them in this work without a paid run to verify.

## Risks and constraints

- **Compaction.** ADR 0005 item 2 kept routing in `SKILL.md` so compaction re-attaches it. A procedure read with the Read tool isn't re-attached. Mitigation: `procedure.md` stays short, and after compaction the agent rereads it when no routing line is in context. ADR 0010 records this as a consequence.
- **Two levels.** In an owner session, `procedure.md` routes to the tier files, two levels below `SKILL.md`. `SKILL.md` names them directly to keep each one level away, as Anthropic's authoring guidance advises.
- **Lost auto-routing.** A change typed without `/work` gets no routing line. This is accepted (ADR 0005 Alternative B's cost) and recorded in ADR 0010.
- **Stale evaluation cases.** Until the follow-up lands, the `work` trigger and conformance cases expect model invocation. They run only on owner approval.
- **Parallel edits.** Harness-hardening children 03–05 (`todo`) edit the same skill files. Whichever lands second rebases.
- **Merge mode.** The manifest's commit must stay in history, so this branch merges with a merge commit, never a squash.

## Verification

- Integrated regression: `mise run validate` and `mise run test` at the integrated head.
- End-to-end:
  - SC1–SC3 by text checks (`git grep`) over both hosts;
  - SC2 parity by a diff of the two procedure copies after path normalization;
  - SC4 by the new test and the recorded binary evidence;
  - SC5 by `manifest.mjs --check`;
  - SC6 and SC7 by reading the records.
- Review focus:
  - any remaining path where a worker or skill still invokes `work`;
  - procedure text lost or changed in the move;
  - manifest and bundle consistency.

## Rollback

skip: a two-way door. Revert the commits and regenerate the manifest; no target is updated by this work.

## Open questions

## Revisions

- v1 (2026-10-14): first draft from the owner's invocation rule and question rounds of 2026-10-14.
