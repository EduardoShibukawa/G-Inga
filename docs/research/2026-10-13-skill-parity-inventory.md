# Cross-Host Skill Parity Inventory

Inventory of every textual difference between the Claude Code copies (`.claude/skills/<s>/`) and the Antigravity copies (`.agents/skills/<s>/`) of the `work`, `drive` and `orchestrate` skills. Produced for spec `2026-10-13-skill-health-evaluation@1` SC4, task `tasks/2026-10-13-skill-health-evaluation-04-parity-inventory.md`.

The copies are host-specific by owner decision, so the bar is equivalent behaviour, not identical bytes. Each difference is classified as one of:

- `host adaptation`: the difference expresses the same behaviour in the host's own primitives, paths or naming (ADR 0005, `CLAUDE.md`, `GEMINI.md`).
- `drift`: the difference changes a host-neutral rule or makes one copy say something the other does not, beyond host mechanics.

No skill file was changed (spec SC6). Drift items are follow-up candidates only.

> Host-parity note (added 2026-10-14): the subagent model policy (`2026-10-14-harness-hardening` SC4/SC5) introduced a shared role-to-model table (`work/references/model-policy.md`) and model-named dispatches in `.claude/skills/`. Mirroring those changes to `.agents/skills/` and `.opencode/skills/` is pending and not reflected in this inventory, which predates them.

## Method

- Base commit: `f67d13c` (`git rev-parse --short HEAD`), worktree clean for both skill trees.
- Commands:

  ```bash
  for s in work drive orchestrate; do diff -rq .claude/skills/$s .agents/skills/$s; done
  for s in work drive orchestrate; do diff -r -u .claude/skills/$s .agents/skills/$s; done
  ```

- One-sided files: none. Every file, including support files and `references/`, exists on both sides.
- Files compared: 11 per side. Byte-identical: `work/references/artifact-contracts.md` only. The other 10 differ.
- Unit of classification: one diff hunk, or a cohesive group of lines inside a hunk when the hunk mixes host mechanics with a rule change.

## Inventory

### work

| ID | File | Difference | Class | Reason |
|---|---|---|---|---|
| W1 | `SKILL.md` | Frontmatter `description` adds "on Antigravity". | host adaptation | Host label only; dispatch behaviour is unchanged. |
| W2 | `SKILL.md` | Four procedure paths (`references/artifact-contracts.md`, `heavy.md`, `standard.md`, `resume.md`) point to `.agents/skills/work/` instead of `.claude/skills/work/`. | host adaptation | Each host reads its own installed copy; target files are equivalent. |
| W3 | `heavy.md` | Intro line adds "on Antigravity". | host adaptation | Host label only. |
| W4 | `heavy.md` | Paths to `references/artifact-contracts.md` (§4.3, §4.4) and `review.md` use `.agents/skills/work/`. | host adaptation | Host-local path to equivalent file. |
| W5 | `resume.md` | Intro line adds "on Antigravity". | host adaptation | Host label only. |
| W6 | `resume.md` | Path to `references/artifact-contracts.md` §4.4 uses `.agents/skills/work/`. | host adaptation | Host-local path to equivalent file. |
| W7 | `review.md` | Intro adds "in G-Ingá on Antigravity". | host adaptation | Host label only; the review prompt template is identical. |
| W8 | `standard.md` | Intro line adds "on Antigravity". | host adaptation | Host label only. |
| W9 | `standard.md` | Paths to `references/artifact-contracts.md` §3 and §3.4 use `.agents/skills/work/`. | host adaptation | Host-local path to equivalent file. |

### drive

| ID | File | Difference | Class | Reason |
|---|---|---|---|---|
| D1 | `SKILL.md` | Link labels for the orchestrate `SKILL.md` and `gate.md` read `.agents/skills/...` instead of `.claude/skills/...`; relative link targets are identical. | host adaptation | Label names the host-local copy; resolved target is the same relative file. |

### orchestrate

| ID | File | Difference | Class | Reason |
|---|---|---|---|---|
| O1 | `SKILL.md` | Principle 3 names the subagent primitive `Agent` tool vs `invoke_subagent`. | host adaptation | Same context-isolation rule in each host's dispatch primitive (ADR 0005). |
| O2 | `SKILL.md` | Mermaid ACT node: "parallel Agent tool calls" vs "invoke_subagent concurrent workers". | host adaptation | Diagram label for the host primitive. |
| O3 | `SKILL.md` | DECIDE: template link label path and "Before any `Agent` tool dispatch" vs "Before any call to `invoke_subagent`". | host adaptation | Same mandatory collision check, host primitive name and path. |
| O4 | `SKILL.md` | ACT dispatch: multiple `Agent` calls with `subagent_type: "general-purpose"`/`"Explore"` vs one `invoke_subagent` batch with `TypeName: "self"`/`"research"`. | host adaptation | Equivalent parallel dispatch and worker/read-only roles in each host's API. |
| O5 | `SKILL.md` | Claude copy has a "Working Tree Selection" block: shared tree only when the collision check passes; `isolation: "worktree"` or `worktree-runner.ts` otherwise; worktree results MUST be merged back before Gate Layer 1. Antigravity copy has no equivalent. | drift | The shared-tree condition and merge-back-before-Layer-1 rule are host-neutral gate rules missing on Antigravity. |
| O6 | `SKILL.md` | Async wait: `run_in_background` plus harness notification and "final report is its `Agent` result" vs "Antigravity will deliver asynchronous wakeup messages". Both forbid polling. | host adaptation | Same wait-without-polling behaviour, host-specific completion channel. |
| O7 | `SKILL.md` | Layer 5 retry: "send ... to the same agent via `SendMessage` (keeps its context)" vs "send ... to subagent". | host adaptation | Same corrective-feedback step; `SendMessage` continuation is a Claude Code primitive. |
| O8 | `SKILL.md` | GATE link label and three References link labels use `.agents/skills/orchestrate/`; relative targets identical. | host adaptation | Label names the host-local copy. |
| G1 | `gate.md` | Mermaid retry node: "SendMessage failure log to worker" vs "Send failure log to worker". | host adaptation | Host primitive name removed; same retry edge. |
| G2 | `gate.md` | Exit-code table row `1`: feed output "via `SendMessage`" vs "to worker". | host adaptation | Same retry action, host primitive name. |
| G3 | `gate.md` | First failure: "same agent via `SendMessage` (keeps its context)" vs "the subagent". | host adaptation | Same corrective step expressed in each host's messaging primitive. |
| C1 | `references/ooda-cycle.md` | State `gating --> claimed` label: "Failure log sent via SendMessage" vs "Re-dispatched with failure log". | drift | Antigravity label implies a fresh dispatch, while its own `gate.md` and `SKILL.md` send feedback to the existing subagent. |
| C2 | `references/ooda-cycle.md` | State table `executing`: "spawned via `Agent` tool call" vs "spawned via `invoke_subagent`". | host adaptation | Host primitive name. |
| C3 | `references/ooda-cycle.md` | Phase 4 dispatch: multiple `Agent` calls with `subagent_type` vs `invoke_subagent`. | host adaptation | Same parallel dispatch, host primitive. |
| C4 | `references/ooda-cycle.md` | Phase 4 working tree: Claude copy allows the shared tree only when the collision check passes, else worktree isolation, and requires merge-back before Gate Layer 1; Antigravity copy says `Workspace: "inherit"` (or `"share"` when isolated worktrees are supported) with no condition and no merge-back. | drift | Same host-neutral rule as O5 is missing on Antigravity. |
| C5 | `references/ooda-cycle.md` | Phase 4 wait: background agents plus notification, "Never poll or sleep" vs "Cease tool execution ... until system wakeup". | host adaptation | Same wait-without-polling behaviour, host completion channel. |
| P1 | `subagent-prompt.md` | Title: "(`Agent` tool)" vs "(`invoke_subagent`)". | host adaptation | Host primitive name. |
| P2 | `subagent-prompt.md` | Intro: "parallel `Agent` tool calls" vs "`invoke_subagent`". | host adaptation | Host primitive name; template obligations unchanged. |
| P3 | `subagent-prompt.md` | "the `prompt` for each `Agent` call" vs "the prompt for `invoke_subagent`". | host adaptation | Host primitive parameter name. |
| P4 | `subagent-prompt.md` | Report channel: "como relatório final do Agent" vs "via retorno ou send_message". | host adaptation | Same report format, host return channel. |

## Drift follow-up candidates

None are fixed here (spec SC6). Each is a candidate for a separate task that edits skill files.

1. **O5 + C4: worktree selection and merge-back rule missing on Antigravity.** Port the host-neutral parts to `.agents/skills/orchestrate/SKILL.md` and `references/ooda-cycle.md`: the shared working tree only when the pre-dispatch collision check passes, isolation otherwise, and worktree results merged into the orchestrator branch before Gate Layer 1. Express isolation in Antigravity terms (`Workspace` setting or `tools/gate/worktree-runner.ts`).
2. **C1: retry semantics inconsistent on Antigravity.** `.agents/skills/orchestrate/references/ooda-cycle.md` says the ticket is "Re-dispatched", while the Antigravity `gate.md` and `SKILL.md` send failure logs to the existing subagent. Align the state label with the gate procedure, as the Claude copy does.

## Counts

| Skill | Files differing | host adaptation | drift | Total |
|---|---|---|---|---|
| work | 5 | 9 | 0 | 9 |
| drive | 1 | 1 | 0 | 1 |
| orchestrate | 4 | 17 | 3 | 20 |
| **Total** | 10 | 27 | 3 | 30 |

All 30 differences are classified (100%). One-sided files: 0.
