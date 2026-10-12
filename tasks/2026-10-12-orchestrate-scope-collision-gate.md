---
schema: task/1
tier: standard
status: verified
verified_at: "4a13a82"
---

# Autonomous OODA Orchestration: Concurrency & File Scope Collision Gate

## Routing and approvals

- tier: standard (S1 holds: deterministic concurrency scope check criteria; S2 holds: adds concurrent scope collision gate layer to verify-gate; S3 holds: bounded to tools/gate, .agents/skills/orchestrate, and tasks/; S4 holds: two-way door)
- approved: standard procedure by owner (2026-10-12, "Executar Ticket #TASK-C: detecção e prevenção determinística de colisões de arquivos em escopo entre subagentes e execuções paralelas no Autonomous Verification Gate")

## Objective

Implement deterministic detection and prevention of file scope collisions between subagents and parallel executions in the Autonomous Verification Gate:

- In `tools/gate/verify-gate.ts`, implement `detectScopeCollisions(declaredScopes: Record<string, string[]>): ScopeCollisionResult`.
- Detect exact file collisions, directory prefix containment (e.g. `tools/gate/` vs `tools/gate/verify-gate.ts`), wildcard globs, and normalized paths (`./`).
- Expose validation via CLI (`--declared-scopes`, `--concurrent-scopes`, `--scopes-json`) supporting inline JSON and JSON file paths.
- Add comprehensive unit tests in `tools/gate/verify-gate.test.ts`.
- Update documentation in `.agents/skills/orchestrate/gate.md` reflecting concurrent scope isolation in Layer 1.

- In scope:
  - `tools/gate/verify-gate.ts`
  - `tools/gate/verify-gate.test.ts`
  - `.agents/skills/orchestrate/gate.md`
  - `tasks/2026-10-12-orchestrate-scope-collision-gate.md`
- Out of scope:
  - Altering core validator bundles in `tools/validate/` unless required.
  - Modifying specs or ADR definitions.

## Acceptance criteria

- AC1: `verify-gate.ts` implements `detectScopeCollisions(declaredScopes: Record<string, string[]>): ScopeCollisionResult` returning `hasCollisions`, `collisions`, `byWorker`, and `byFile`.
- AC2: Expose CLI validation in `verify-gate.ts` via `--declared-scopes`, `--concurrent-scopes`, and `--scopes-json` flags supporting inline JSON string and file path, exiting with code 1 on collisions and code 0 on clean disjoint scopes.
- AC3: Unit test suite in `tools/gate/verify-gate.test.ts` comprehensively covers disjoint scopes, exact file collisions, directory containment, wildcard globs, path boundary checks, path normalization, multi-worker isolation, and CLI executions.
- AC4: Documentation in `.agents/skills/orchestrate/gate.md` updated to detail Concurrent Scope Isolation invariants and API within Layer 1.
- AC5: Full verification suites `bun test tools/gate/verify-gate.test.ts` (all 22 pass) and `bun run validate` pass with 100% success rate.

## Plan

1. Record baseline verification B1 on commit `1d8ba7c`.
2. Implement `detectScopeCollisions` and helper functions in `tools/gate/verify-gate.ts`.
3. Add CLI argument parsing for `--declared-scopes` in `verify-gate.ts` and integrate into Layer 1 evaluation.
4. Add comprehensive unit tests in `tools/gate/verify-gate.test.ts`.
5. Update orchestration gate documentation in `.agents/skills/orchestrate/gate.md`.
6. Run `bun test tools/gate/verify-gate.test.ts` and `bun run validate`.
7. Record outcome and checkpoint.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation and test suite | pass | 1d8ba7c | `mise run validate` (exit 0) & `mise run test` (133 pass) on main |
| AC1 | detectScopeCollisions function implementation | pass | 4a13a82 | detects exact match, directory prefix containment, and globs |
| AC2 | CLI declared scopes flags and exit codes | pass | 4a13a82 | --declared-scopes, --concurrent-scopes, --scopes-json support inline/file JSON |
| AC3 | comprehensive unit tests in verify-gate.test.ts | pass | 4a13a82 | 22 tests pass in bun test tools/gate/verify-gate.test.ts |
| AC4 | orchestrate gate documentation updated | pass | 4a13a82 | gate.md Layer 1 documented with concurrent scope isolation |
| AC5 | full canonical validation suite | pass | 4a13a82 | bun run validate and bun test exit 0 with 0 errors |
| V1 | diff review against V1 governance | pass | 4a13a82 | all changes scoped to tools/gate, .agents/skills/orchestrate and tasks/ |

## Outcome

Implemented deterministic Concurrency & File Scope Collision Gate in `tools/gate/verify-gate.ts`. The verification gate now validates declared scopes across concurrent workers, detecting exact file collisions, directory prefix containment, and wildcard collisions before or during Layer 1 verification. Added 11 new unit tests (22 total passing in `verify-gate.test.ts`), exposed CLI flags (`--declared-scopes`, `--concurrent-scopes`, `--scopes-json`), documented Layer 1 concurrent scope isolation in `.agents/skills/orchestrate/gate.md`, and passed full repository validation and test suites.

## Checkpoint

- as of: 2026-10-12, branch feat/ooda-pipeline-advancement, head 1ad624d, task verified
- done: concurrency scope collision gate implemented, tested, documented, and verified
- next: return ready_for_gate report to parent orchestrator
