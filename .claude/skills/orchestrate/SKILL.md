---
name: orchestrate
description: Autonomous OODA loop orchestration harness. Manages task graphs, dispatches parallel subagents, enforces deterministic Go/No-Go verification gates, and seals atomic commits.
disable-model-invocation: true
---

# /orchestrate — Autonomous OODA Orchestration Harness

Macro-governor for autonomous multi-task execution over dependency graphs and task backlogs. Dispatches parallel micro-execution via subagents running `/work` and enforces deterministic Go/No-Go verification gates before any commit or frontier advancement.

## Non-Negotiable Invariants

1. **Tokens Per Verified Task:** Never trust verbal self-attestation from subagents or models. Accept deliverables only when all 5 layers of the Verification Gate evaluate to `pass`.
2. **Strict 4-Value Vocabulary:** Report checks strictly using `pass`, `fail`, `blocked`, or `not run`. Exit code 0 is strictly forbidden if any mandatory check is skipped or unrun.
3. **Context Isolation:** Keep the orchestrator root context lean (< 25k tokens). Exploration, iterative editing, and tool output belong strictly inside ephemeral subagents (`Agent` tool).
4. **Anti-Thrashing Circuit Breaker (ADR 0002 §5, Trigger E3):** Maximum 2 verification attempts per ticket without new information. On the second consecutive failure, halt the ticket, mark it `blocked`, and escalate to the repository owner.
5. **Macro vs Micro Division:** `/orchestrate` governs the roadmap graph (`map.md`, `tasks/`), dependency resolution, parallel concurrency, and gating. Micro-delivery within scoped boundaries is delegated to subagents running `/work`.

## The 6-Step OODA Loop

```mermaid
flowchart TD
    OBS["1. OBSERVE: git status, HEAD, map.md / tasks/"] --> ORI["2. ORIENT: Unblocked frontier, constraints, thresholds"]
    ORI --> DEC["3. DECIDE: Batch size N, pre-dispatch scope collision check"]
    DEC -->|"Collisions detected"| SER["Serialize into conflict-free waves"]
    SER --> ACT
    DEC -->|"Disjoint scopes"| ACT["4. ACT: parallel Agent tool calls"]
    ACT --> GATE{"5. GATE: 5-Layer Autonomous Verification"}
    GATE -->|"Pass (All 5 Layers)"| SEAL["6. SEAL: Commit batch, update graph, advance frontier"]
    GATE -->|"Fail (Attempts < 2)"| RETRY["Retry with deterministic failure diff"]
    RETRY --> ACT
    GATE -->|"Fail (Attempts >= 2)"| ESC["Circuit Breaker: Mark blocked & escalate"]
```

### 1. OBSERVE (State Inspection)

- Inspect Git worktree: `git status --porcelain`, current branch, and HEAD SHA.
- Inspect the task graph: read `map.md` (or `tasks/` directory).
- Identify tickets in state `open` whose dependencies are fully resolved (`Blocked by: []` or all dependencies in `resolved` / `verified`).

### 2. ORIENT (Frontier & Contract Definition)

- Select the next unblocked tickets on the dependency frontier.
- Transition selected tickets from `open` to `claimed`.
- Map architectural constraints, applicable ADRs (`docs/decisions/`), and specs (`specs/`).
- Define the explicit **Verification Contract** for each ticket:
  - Allowed file scope (`In scope: [...]`).
  - Required deterministic check commands (e.g., `mise run validate`, `mise run test`).
  - Quantitative thresholds (e.g., zero linter issues, schema adherence).

### 3. DECIDE (Concurrency & Pre-Dispatch Collision Guardrail)

- Determine batch size $N$ based on independent unblocked branches (typically 1 to 4 concurrent tickets).
- Prepare structured dispatch prompts using [.claude/skills/orchestrate/subagent-prompt.md](subagent-prompt.md).
- **Mandatory Pre-Dispatch Concurrency Collision Check:**
  - Before any `Agent` tool dispatch, execute the deterministic collision guardrail across all declared worker scopes:

    ```bash
    bun tools/gate/verify-gate.ts --pre-dispatch --declared-scopes '{"worker-1": ["scope1/"], "worker-2": ["scope2/"]}'
    ```

  - Alternatively, evaluate programmatically via `validatePreDispatch(declaredScopes)`.
  - **Invariants:**
    - If scopes collide (Exit Code 1), parallel dispatch is strictly rejected.
    - Conflicting workers MUST be partitioned into sequential conflict-free execution waves (`partitionWaves`).
    - Only mutually disjoint batches (Exit Code 0) are dispatched concurrently.
  - **Automated Wave Execution Harness (`orchestrate-runner.ts`):**
    - The auto-runner CLI (`tools/gate/orchestrate-runner.ts`) automates wave partitioning, worker dispatch in ephemeral worktrees (EXP-05), and token budget calibration (EXP-06):

      ```bash
      bun tools/gate/orchestrate-runner.ts --batch batch.json --ceremony standard
      ```

    - Supports dry-run validation:

      ```bash
      bun tools/gate/orchestrate-runner.ts --batch '{"worker-1": ["scope1/"], "worker-2": ["scope2/"]}' --dry-run
      ```

### 4. ACT (Concurrent Dispatch & Asynchronous Wait)

- Dispatch worker subagents in parallel by issuing multiple `Agent` tool calls in a single message, each with role and scoped prompt:
  - Set `subagent_type: "general-purpose"` for implementation workers (or `subagent_type: "Explore"` for read-only spikes).
  - Include the verification contract directly in the prompt.
- **Working Tree Selection:**
  - Default shared working tree: allowed only when the pre-dispatch collision check passes (mutually disjoint scopes).
  - Isolated worktrees: set `isolation: "worktree"` on the `Agent` call (or use `tools/gate/worktree-runner.ts`). Worktree results MUST be merged back into the orchestrator branch before Gate Layer 1.
- **Dynamic Git Worktree Isolation (EXP-05):**
  - When running concurrent workers locally or through the auto-runner, workers execute inside isolated ephemeral git worktrees (`tools/gate/worktree-runner.ts`), eliminating `.git/index.lock` contention and ensuring setup overhead < 500ms.
- **Token Budget Guardrail (EXP-06):**
  - Telemetry across workers is monitored via `tools/eval/token_budget_guard.ts`. Standard ceremony tickets enforce hard ceilings (< 25,000 tokens) with warning alerts at $\ge 80\%$ consumption.
- Agents run in the background (`run_in_background`, the default); the harness notifies the orchestrator when each agent completes. Do NOT poll in a loop or sleep.
- Each worker's final report is its `Agent` result.

### 5. GATE (Deterministic Autonomous Verification)

Upon receiving subagent reports, execute the **Autonomous Verification Gate** ([.claude/skills/orchestrate/gate.md](gate.md)) across five sequential layers:

1. **Layer 1 (Scope & Diff Gate):**
   - Run `git status --porcelain` and `git diff --name-only`.
   - Reject immediately if files outside declared scope were modified or temp files leaked.
   - Rollback dirty out-of-scope edits via `git checkout -- <file>`.
2. **Layer 2 (Deterministic Command & Exit Code Gate):**
   - Execute verification commands: `mise run validate`, `mise run test`, or task-specific test suites.
   - Map exit codes strictly: `0` = `pass`, `1` = `fail`, `2` = `blocked`.
3. **Layer 3 (Task Ancestry & Git Lineage Gate):**
   - Validate modified `tasks/*.md` records.
   - When status is `verified` or `accepted`, check that `verified_at` and baseline commit `B1` exist locally.
   - Ensure `B1` is a strict valid ancestor of `verified_at` via `git merge-base --is-ancestor`.
4. **Layer 4 (Quantitative Metric & Threshold Gate):**
   - Verify objective thresholds (e.g. 0 lint warnings, schema validation, performance latency).
5. **Layer 5 (Anti-Thrashing Circuit Breaker):**
   - Track verification failure count per ticket.
   - If count < 2: send deterministic failure logs to the same agent via `SendMessage` (keeps its context) for corrective action.
   - If count $\ge 2$: stop worker, mark ticket `blocked`, record escalation, and alert owner.

### 6. SEAL & ADVANCE (Atomic Integration)

- Update ticket status in roadmap (`map.md` / `tasks/`) to `resolved`.
- Create an atomic descriptive Git commit referencing the resolved ticket IDs:
  `git commit -m "<type>(<scope>): <summary> [resolves #ID]"`
- Advance the frontier of the dependency graph and repeat the OODA loop until all tickets are `resolved` or `blocked`.

## References & Procedures

- Verification Gate Rules & Rollback: [.claude/skills/orchestrate/gate.md](gate.md)
- Subagent Canonical Prompt Template: [.claude/skills/orchestrate/subagent-prompt.md](subagent-prompt.md)
- OODA State Machine & Transitions: [.claude/skills/orchestrate/references/ooda-cycle.md](references/ooda-cycle.md)
- Automated Wave Runner: [tools/gate/orchestrate-runner.ts](../../../tools/gate/orchestrate-runner.ts)
- Token Budget Guardrail (EXP-06): [tools/eval/token_budget_guard.ts](../../../tools/eval/token_budget_guard.ts)
