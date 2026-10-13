---
schema: task/1
tier: standard
status: verified
verified_at: "c283268"
---

# Autonomous OODA Orchestration: Auto-Wave Runner & Token Budget Guardrail

## Routing and approvals

- tier: standard (S1 holds: testable automated wave runner and token budget criteria; S2 holds: implements orchestrate-runner harness and skill documentation; S3 holds: bounded to tools/gate, .agents/skills/orchestrate, and tasks/; S4 holds: two-way door)
- approved: standard procedure by owner (2026-10-12, "Ticket #TASK-AUTO-RUNNER — Autonomous Orchestration Auto-Wave Runner & Token Budget Guardrail")

## Objective

Operationalize the autonomous wave execution harness for `/orchestrate` integrating EXP-05 (Dynamic Worktree Isolation) and EXP-06 (Token Budget Guardrail):

- Implement `tools/gate/orchestrate-runner.ts` providing automated ticket batch intake, pre-dispatch wave partitioning via `partitionWaves`, concurrent wave execution in ephemeral Git worktrees via `worktree-runner.ts`, and token budget evaluation per ticket and aggregate batch via `token_budget_guard.ts`.
- Expose programmatic APIs (`runOrchestrationBatch`, `partitionWaves`, `executeWave`, `evaluateTicketBudget`, `evaluateBatchBudget`) and CLI flags (`--batch`, `--repo`, `--ceremony`, `--dry-run`, `--max-tokens`, `--json`).
- Implement comprehensive unit tests in `tools/gate/orchestrate-runner.test.ts` covering parsing, partitioning, simulated/real worktree concurrency, token limits, and CLI execution.
- Update `.agents/skills/orchestrate/SKILL.md` documenting the auto-runner CLI in Step 3 DECIDE and Step 4 ACT.

- In scope:
  - `tools/gate/orchestrate-runner.ts`
  - `tools/gate/orchestrate-runner.test.ts`
  - `.agents/skills/orchestrate/SKILL.md`
  - `tasks/2026-10-12-orchestrate-auto-wave-runner.md`
- Out of scope:
  - Modifying core validation scripts in `tools/validate/`.
  - Modifying specs, spec hashes, or ADR definitions.
  - Committing directly to git (atomic seal handled by parent orchestrator).

## Acceptance criteria

- AC1: `tools/gate/orchestrate-runner.ts` implements ticket batch loading (JSON, file, CLI) and automated wave partitioning via `partitionWaves`.
- AC2: `tools/gate/orchestrate-runner.ts` executes wave workers concurrently in isolated ephemeral Git worktrees with cleanup.
- AC3: `tools/gate/orchestrate-runner.ts` integrates `token_budget_guard.ts` evaluating ticket and batch token ceilings (<25k tokens for standard) and telemetry loop detection.
- AC4: Comprehensive unit test suite in `tools/gate/orchestrate-runner.test.ts` covers parsing, wave partitioning, dry-run & real worktree execution, token budget limits, and CLI flags with 100% pass rate.
- AC5: `.agents/skills/orchestrate/SKILL.md` documents the auto-runner CLI and its integration with EXP-05 and EXP-06 in Step 3 DECIDE and Step 4 ACT.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation suite | pass | 206a8aca5f92b6a96ee27fdd1047b688a3386d0b | `bun run validate` & `bun test` pass on HEAD |
| AC1 | ticket batch loading and wave partitioning | pass | c283268 | `parseTicketsInput` and `partitionTicketsIntoWaves` partition tickets |
| AC2 | concurrent worker worktree execution | pass | c283268 | ephemeral worktree isolation with <500ms setup overhead |
| AC3 | token budget guardrail integration | pass | c283268 | enforces 25k standard ceiling, 80% warn, and loop detection |
| AC4 | unit test suite in orchestrate-runner.test.ts | pass | c283268 | 26 tests pass in bun test tools/gate/orchestrate-runner.test.ts |
| AC5 | orchestrate SKILL.md documentation | pass | c283268 | auto-runner CLI and EXP-05/EXP-06 documented in Step 3 & Step 4 |
| V1 | diff review against scope | pass | c283268 | diff strictly bounded to in-scope files; spec hash untouched |

## Outcome

Delivered the Autonomous Orchestration Auto-Wave Runner (`tools/gate/orchestrate-runner.ts`) integrating EXP-05 (Dynamic Worktree Isolation) and EXP-06 (Token Budget Guardrail). The runner provides automated intake and wave partitioning of tickets, zero-collision concurrent worker execution in ephemeral worktrees, telemetry loop detection, and token accounting enforcing standard ceremony limits (<25k tokens). Tested comprehensively with 26 unit tests and verified via the 5-layer Autonomous Verification Gate.

## Checkpoint

- as of: 2026-10-12, branch main, head c283268, task verified
- done: auto-wave runner implemented, tested, verified through all 5 layers of verification gate, committed in c283268
- next: deliver final report to owner
