---
schema: task/1
tier: standard
status: verified
verified_at: "1d8ba7c"
---

# Autonomous OODA Orchestration: Git Task Ancestry & Lineage Gate

## Routing and approvals

- tier: standard (S1 holds: deterministic git ancestry check criteria; S2 holds: adds task ancestry verification layer to verify-gate; S3 holds: bounded to tools/gate and .agents/skills/orchestrate; S4 holds: two-way door)
- approved: standard procedure by owner (2026-10-12, "Executar aprimoramento do harness OODA /orchestrate a partir da main: implementar validação determinística de linhagem Git e ancestralidade de tarefas no verify-gate")

## Objective

Enhance the Autonomous Verification Gate (`tools/gate/verify-gate.ts`) to validate task artifact lineage and Git commit ancestry deterministically before sealing commits and opening PRs:

- Inspect modified or staged `tasks/*.md` records.
- For records with `status: verified`, extract `verified_at` and baseline commit `B1` (and other B/AC references).
- Verify via `git merge-base --is-ancestor` that baseline commit is a strict valid ancestor of `verified_at` and that both hashes exist in the local repository.
- Reject with exit code 1 (`fail`) if commits do not exist or violate strict ancestry rules.
- Add comprehensive unit tests in `tools/gate/verify-gate.test.ts`.
- Update documentation in `.agents/skills/orchestrate/gate.md` and `.agents/skills/orchestrate/SKILL.md`.

- In scope:
  - `tools/gate/verify-gate.ts`
  - `tools/gate/verify-gate.test.ts`
  - `.agents/skills/orchestrate/gate.md`
  - `.agents/skills/orchestrate/SKILL.md`
  - `tasks/2026-10-12-orchestrate-task-ancestry-gate.md`
- Out of scope:
  - Altering core validator bundles in `tools/validate/` unless required.
  - Modifying specs or ADR definitions.

## Acceptance criteria

- AC1: `verify-gate.ts` parses modified/staged (or explicitly specified) `tasks/*.md` artifacts, checks existence of referenced commits in git, and strictly verifies that baseline commit `B1` is an ancestor of `verified_at`.
- AC2: Fails with exit code 1 when a referenced commit does not exist locally or when baseline is not a valid ancestor of `verified_at`.
- AC3: Unit tests in `tools/gate/verify-gate.test.ts` cover valid ancestry, non-existent commit hashes, and ancestry violation scenarios.
- AC4: Documentation in `.agents/skills/orchestrate/gate.md` and `.agents/skills/orchestrate/SKILL.md` updated to detail the Task Ancestry & History Gate layer.
- AC5: Full verification suites `mise run validate` and `mise run test` pass with 100% success rate.

## Plan

1. Record baseline verification B1 on HEAD commit `e0e8e9c`.
2. Extend `tools/gate/verify-gate.ts` with task ancestry extraction and verification function `evaluateTaskAncestry`.
3. Wire `evaluateTaskAncestry` into `evaluateGate` CLI execution.
4. Add unit tests for `evaluateTaskAncestry` in `tools/gate/verify-gate.test.ts`.
5. Update orchestrate gate documentation in `.agents/skills/orchestrate/gate.md` and `.agents/skills/orchestrate/SKILL.md`.
6. Run `mise run validate` and `bun test tools/gate/verify-gate.test.ts`.
7. Commit code changes, verify with `tools/gate/verify-gate.ts`, seal task record with `verified_at`, and push PR.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation and test suite | pass | e0e8e9c | `mise run validate` (exit 0) & `mise run test` (127 pass) on main |
| AC1 | task ancestry verification in verify-gate | pass | 1d8ba7c | evaluateTaskAncestry extracts task frontmatter & verifies git ancestry |
| AC2 | gate failure on invalid or missing commit | pass | 1d8ba7c | non-existent commits and ancestry violations return exit code 1 |
| AC3 | unit tests in verify-gate.test.ts | pass | 1d8ba7c | 11 tests pass in bun test tools/gate/verify-gate.test.ts |
| AC4 | orchestrate documentation updated | pass | 1d8ba7c | gate.md and SKILL.md documented with 5-layer gate and lineage check |
| AC5 | full canonical validation and test suite | pass | 1d8ba7c | mise run validate (exit 0) and mise run test (133 pass, 0 fail) |
| V1 | diff review against V1 governance | pass | 1d8ba7c | all changes scoped to tools/gate, .agents/skills/orchestrate and tasks/ |

## Outcome

Implemented Layer 3 (Task Ancestry & Git Lineage Gate) in `tools/gate/verify-gate.ts`. The verification gate now validates modified or staged `tasks/*.md` records: checks whether referenced commits exist locally and guarantees via `git merge-base --is-ancestor` that baseline `B1` is a strict ancestor of `verified_at`. Added 6 new unit tests (11 total passing in `verify-gate.test.ts`), updated orchestration gate documentation (`gate.md` and `SKILL.md`), and achieved 100% pass across all 133 repository tests and canonical validators.

## Checkpoint

- as of: 2026-10-12, branch feat/orchestrate-task-ancestry-gate, head 1d8ba7c, task verified
- done: task ancestry gate implemented, tested, documented, validated, and verified
- next: push branch to origin and open pull request
