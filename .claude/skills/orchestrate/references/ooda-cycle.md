# OODA Orchestration Cycle Reference

This document formalizes the state machine, graph transitions, and operational loop of the `/orchestrate` harness.

---

## 1. Ticket Lifecycle State Machine

A ticket moves through deterministic states across the OODA loop:

```mermaid
stateDiagram-v2
    [*] --> open: Ticket created in map.md
    open --> claimed: OODA Orient: Selected on unblocked frontier
    claimed --> executing: OODA Act: Dispatched to worker subagent
    executing --> gating: Subagent returns: Autonomous Gate initiated
    gating --> resolved: Gate 1-4 pass: Atomic commit sealed
    gating --> claimed: Gate fails (Attempts < 2): New Opus Agent dispatched with failure log
    gating --> blocked: Gate fails (Attempts >= 2): Circuit breaker trips
    blocked --> [*]: Escalated to repository owner
    resolved --> [*]: Graph frontier advances
```

### State Definitions

| State | Definition | Permitted Next States |
|---|---|---|
| `open` | Ticket exists in dependency graph; dependencies may or may not be met. | `claimed` |
| `claimed` | Unblocked ticket locked by orchestrator; verification contract assigned. | `executing` |
| `executing` | Subagent spawned via `Agent` tool call and running tasks. | `gating` |
| `gating` | Worker finished; orchestrator executing 4-layer verification gate. | `resolved`, `claimed`, `blocked` |
| `resolved` | All gate layers passed (`exit 0`), commit sealed, ticket closed. | Final state |
| `blocked` | Circuit breaker tripped after 2 failures, or environmental block (`exit 2`). | Human intervention |

---

## 2. The 6 Phases of the Loop

### Phase 1: OBSERVE

- Read the repository status (`git status --porcelain`, current branch, HEAD).
- Read the roadmap DAG (`map.md` or `tasks/`).
- Parse dependencies: identify tickets whose prerequisites are completely in state `resolved`.

### Phase 2: ORIENT

- Prioritize unblocked tickets (e.g. foundational ADRs/schemas before implementation, core libraries before CLI wrappers).
- Transition selected ticket to `claimed`.
- Extract constraints and define the **Verification Contract** (allowed paths, required commands, metrics).

### Phase 3: DECIDE

- Determine concurrent batch size $N$ ($\le 4$).
- Partition workload so that no two concurrent subagents have overlapping files in their `In scope:` paths.
- Prepare the structured prompts using `subagent-prompt.md`.

### Phase 4: ACT

- Invoke subagents concurrently by issuing multiple `Agent` tool calls in a single message (`subagent_type: "general-purpose"`, or `"Explore"` for read-only spikes), each with `model` set by role from `.claude/skills/work/references/model-policy.md`: `sonnet` for implementation workers, `haiku` for `Explore` spikes, `opus` for the retry after a first verification failure.
- Use the default shared working tree only when the pre-dispatch collision check passes; otherwise set `isolation: "worktree"` (or use `tools/gate/worktree-runner.ts`) and merge worktree results back into the orchestrator branch before Gate Layer 1.
- Agents run in the background (`run_in_background`, the default); cease tool execution and wait for the harness completion notification. Never poll or sleep.

### Phase 5: GATE

- Intercept subagent completion.
- Run Layer 1 (Scope & Diff Gate): verify zero out-of-scope edits.
- Run Layer 2 (Deterministic Command Gate): execute test suites; map exit codes strictly (`pass`, `fail`, `blocked`).
- Run Layer 3 (Quantitative Metric Gate): verify zero regressions, linter errors, or latency thresholds.
- Run Layer 4 (Circuit Breaker): if failures $\ge 2$, escalate and mark `blocked`.

### Phase 6: SEAL & ADVANCE

- Mark ticket `resolved` in `map.md`.
- Commit changes atomically:

```bash
git add <scope-files> map.md
git commit -m "<type>(<scope>): <summary> [resolves #ID]"
```

- Re-evaluate the dependency graph to uncover newly unblocked tickets.
- Repeat until the entire graph is resolved or remaining items are blocked.
