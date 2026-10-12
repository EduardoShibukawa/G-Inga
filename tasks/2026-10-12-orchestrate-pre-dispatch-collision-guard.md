---
schema: task/1
tier: standard
status: verified
verified_at: "9f81310"
---

# Autonomous OODA Orchestration: Pre-Dispatch Concurrency Collision Check

## Routing and approvals

- tier: standard (S1 holds: testable concurrency collision criteria; S2 holds: adds pre-dispatch guardrail and wave partitioning; S3 holds: bounded to tools/gate, .agents/skills/orchestrate, and tasks/; S4 holds: two-way door)
- approved: standard procedure by owner (2026-10-12, "Ticket #TASK-F2 — Pré-dispatch Concurrency Collision Check no Harness /orchestrate")

## Objective

Connect `detectScopeCollisions` as an obligatory pre-dispatch guardrail in Step 3 DECIDE of the OODA loop:

- In `tools/gate/verify-gate.ts`, implement `validatePreDispatch` and `partitionWaves`, and add the CLI flag `--pre-dispatch` evaluating declared scopes across concurrent workers.
- Reject concurrent execution when scopes collide (exit code 1) and identify conflicting workers.
- Suggest conflict-free sequential execution waves via `partitionWaves`.
- Support CLI invocation: `bun tools/gate/verify-gate.ts --pre-dispatch --declared-scopes <json>` returning exit code 0 when disjoint, exit code 1 when colliding.
- Add comprehensive unit tests in `tools/gate/verify-gate.test.ts`.
- Update OODA workflow in `.agents/skills/orchestrate/SKILL.md` (Step 3 DECIDE and mermaid diagram) formalizing pre-dispatch collision guardrail before `invoke_subagent`.
- Update `.agents/skills/orchestrate/gate.md` detailing the Pre-Dispatch Concurrency Collision Guardrail in Layer 1.

- In scope:
  - `.agents/skills/orchestrate/SKILL.md`
  - `.agents/skills/orchestrate/gate.md`
  - `tools/gate/verify-gate.ts`
  - `tools/gate/verify-gate.test.ts`
  - `tasks/2026-10-12-orchestrate-pre-dispatch-collision-guard.md`
- Out of scope:
  - Modifying core validation scripts in `tools/validate/`.
  - Modifying specs, spec hashes, or ADR definitions.
  - Committing to git (atomic seal handled by parent orchestrator).

## Acceptance criteria

- AC1: `tools/gate/verify-gate.ts` implements `validatePreDispatch(declaredScopes: Record<string, string[]>): PreDispatchValidationResult` and `partitionWaves(declaredScopes: Record<string, string[]>): string[][]`.
- AC2: Expose CLI validation in `verify-gate.ts` via `--pre-dispatch` and `--declared-scopes`, exiting with code 0 on disjoint scopes and code 1 on collisions.
- AC3: Unit test suite in `tools/gate/verify-gate.test.ts` covers `validatePreDispatch` for disjoint and colliding scopes, `partitionWaves` for cascading conflict resolution, and CLI `--pre-dispatch` execution.
- AC4: Documentation in `.agents/skills/orchestrate/SKILL.md` and `.agents/skills/orchestrate/gate.md` formalizes mandatory pre-dispatch check in Step 3 DECIDE and Layer 1.
- AC5: All tests in `tools/gate/verify-gate.test.ts` pass with 100% success rate.

## Plan

1. Record baseline check B1 on commit `9ead293`.
2. Implement `validatePreDispatch`, `partitionWaves`, and CLI `--pre-dispatch` in `tools/gate/verify-gate.ts`.
3. Add unit tests in `tools/gate/verify-gate.test.ts`.
4. Update `.agents/skills/orchestrate/SKILL.md` and `.agents/skills/orchestrate/gate.md`.
5. Run unit tests (`bun test tools/gate/verify-gate.test.ts`) and repository validation (`mise run validate`).
6. Create task record and report outcome.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation suite | pass | 9ead293 | `mise run validate` (exit 0) and `verify-gate.test.ts` (22 pass) on main |
| AC1 | validatePreDispatch & partitionWaves implementation | pass | 9f81310 | functions export and partition conflicting workers into conflict-free waves |
| AC2 | CLI --pre-dispatch flag and exit codes | pass | 9f81310 | exits 0 on disjoint scopes, exits 1 on collisions with detailed conflict log |
| AC3 | comprehensive unit tests in verify-gate.test.ts | pass | 9f81310 | 28 tests pass in bun test tools/gate/verify-gate.test.ts |
| AC4 | orchestrate SKILL.md and gate.md documentation updated | pass | 9f81310 | Step 3 DECIDE and Layer 1 updated with pre-dispatch invariants |
| AC5 | test suite passes with 100% success rate | pass | 9f81310 | bun test tools/gate/verify-gate.test.ts passes all 28 tests |
| V1 | diff review against V1 governance | pass | 9f81310 | strictly bounded to in-scope files; approved spec hash untouched |

## Outcome

Implemented the Pre-Dispatch Concurrency Collision Check in `tools/gate/verify-gate.ts` (`validatePreDispatch`, `partitionWaves`, and `--pre-dispatch` CLI flag). The harness now deterministically validates declared worker scopes before dispatch, rejecting collisions (exit code 1) and generating sequential conflict-free execution waves. Added 6 new unit tests (28 total pass in `verify-gate.test.ts`), updated OODA loop documentation in `.agents/skills/orchestrate/SKILL.md` (Step 3 DECIDE and diagram) and `.agents/skills/orchestrate/gate.md` (Layer 1).

## Checkpoint

- as of: 2026-10-12, branch main, head 9f81310, task verified
- done: pre-dispatch collision guardrail implemented, tested, documented, and verified
- next: parent orchestrator executes atomic seal commit in Step 6 SEAL
