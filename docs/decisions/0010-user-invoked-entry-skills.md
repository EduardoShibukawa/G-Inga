# 0010 — User-invoked entry skills

- **Status:** proposed
- **Date:** 2026-10-14
- **Deciders:** project owner
- **Depends on:** D5 on the [decision map](../decision-map.md), settled by [ADR 0005](0005-native-primitive-mapping.md), and D8, settled by [ADR 0007](0007-harness-extensions-beyond-v1.md). This record revises ADR 0005 item 1 and Alternative B. ADR 0005 keeps its status.
- **Evidence:**
  - ADR 0005 facts `N2` and `N3`;
  - the Claude Code skills documentation on invocation control;
  - OpenCode v2.0.29 skill-tool behavior, recorded in the task.
- **Spec:** [User-Invoked `/work` with a Worker Procedure Reference](../../specs/2026-10-14-work-user-invoked.md) v1.

## Context

ADR 0005 item 1 made `/work` model-invocable. Its description sat in context every turn so that a change typed without `/work` still got a routing line. Alternative B, a user-only entry skill, was deferred until the description cost mattered or auto-loading misfired. ADR 0007 made `/drive` and `/orchestrate` user-invocable and left `/work` as the only model-invocable skill.

On 2026-10-14 the owner set one rule for every G-Ingá skill: an entry point the owner types is user-invoked, and anything another skill or subagent must reach is a reference file. `/work` stayed model-invocable only because `/drive` and `/orchestrate` workers invoke it.

`disable-model-invocation: true` blocks the Skill-tool call, tells Claude not to reproduce the skill another way, and keeps the skill out of subagent preloads. Workers therefore can't reach `/work` through the skill, and they can't read its `SKILL.md` either.

## Decision

1. **Entry points are user-invoked.** Every G-Ingá skill sets `disable-model-invocation: true` on every host, `/work` included. No G-Ingá skill description is in context by default.
2. **Shared procedure lives in a reference file.** The `/work` procedure moves to `work/references/procedure.md` on each host.
   - `work/SKILL.md` is a thin entry. It names that file and the tier files, one level each, and holds no procedure.
   - Workers dispatched by `/drive` and `/orchestrate` get the procedure path in their prompt. They never invoke the `work` skill.
   - No skill reads another skill's `SKILL.md`.
3. **The pointer is unchanged.** The delivered pointer still says changes go through `/work`. When the owner asks for a change without typing it, the agent suggests `/work` and doesn't route on its own.
4. **OpenCode.** The plugin keeps mapping the flag to `autoinvoke: false`. In OpenCode that only hides a skill from the per-session listing. The `skill` tool loads any registered skill by id, so commands that name their skill keep working. If OpenCode starts filtering the tool by `autoinvoke`, the commands name the skill file path instead.
5. **Deviation from the V1 spec.** The approved V1 spec describes "a single, model-invocable entry skill". This record replaces "model-invocable" with "user-invoked" and keeps the spec text unchanged, as ADR 0007 did for its deviations.

## Options considered

| Option | Why not |
|---|---|
| Keep `/work` model-invocable (ADR 0005 item 1) | contradicts the owner's rule; one description per turn on every session |
| Workers read `work/SKILL.md` directly | reproduces a skill whose model invocation is disabled |
| A worker-only reference with routing and `standard` | duplicates routing rules in two files |
| Pointer names the procedure file | changes text delivered to targets; the owner keeps `/work` as the only route |

## Consequences

- A change typed without `/work` gets no automatic routing line. This is ADR 0005 Alternative B's known cost, now accepted.
- Compaction no longer re-attaches the routing rules, because the agent reads them with the Read tool and not through skill invocation (ADR 0005 item 2). The procedure stays short, and the agent rereads it when no routing line is in context.
- The fixed per-turn skill-description cost of G-Ingá is zero on Claude Code and Antigravity.
- Trigger-accuracy evaluation of `/work` no longer applies, and conformance cases must type `/work`. A follow-up task tracks the case changes (ADR 0008).
- The bundle gains `work/references/procedure.md` for each host.
