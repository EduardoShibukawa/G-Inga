---
schema: task/1
tier: standard
status: verified
verified_at: "dcc83d4"
---

# Fix the History Walk's Parallel-Branch Deletion False Positive

## Routing and approvals

- tier: standard (S1, S2, S3, S4 hold: a bounded fix inside `tools/validate/artifacts/` that aligns the implementation with the already-approved §6.1 semantics without changing the contract or policy. `light` is excluded because S6 fails: `mise run validate` is red at baseline on the false positive)
- approved: owner request (2026-10-13, "Quer que eu abra um /work standard pra corrigir a falha do validador? ... sim")

## Objective

Make the history walk's deletion detection DAG-aware so a record present on one branch and absent on a parallel branch (before their merge) is not reported as deleted, while a real committed deletion still fails deterministically.

- In scope:
  - `tools/validate/artifacts/history.ts`
  - `tools/validate/artifacts/artifacts.test.ts`
  - `tools/validate/validate.js` (bundle rebuild)
  - `manifest.json` (bundle provenance)
  - `tasks/2026-10-13-fix-history-walk-parallel-branch-deletion.md`
- Out of scope:
  - `docs/artifact-contracts.md` and the §6.1 rule text (the contract is unchanged).
  - `.claude/skills/work/**` and any policy, routing or tier change.

## Acceptance criteria

- AC1: A record present on one branch and absent on a parallel branch (before their merge) is not flagged; a real committed deletion still fails.
- AC2: A regression test covers the parallel-branch topology and fails without the fix.
- AC3: `mise run validate` passes (40/40 fixtures, `artifact-records` pass).
- AC4: `mise run test` passes (0 fail).
- AC5: `manifest.mjs --check` passes for the rebuilt bundle.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validate | fail | 75125ab | `artifact-records` fail: §6.1 false positive; `tasks/2026-10-13-record-plugin-channel-adr-0005.md` reported deleted although it exists at HEAD |
| AC1 | DAG-aware deletion detection | pass | dcc83d4 | `git log --full-history --diff-filter=D` returns no deletions on this repo, so the false positive is gone; the `H-del` fixture (real committed deletion) still fails |
| AC2 | regression test | pass | dcc83d4 | new `artifacts.test.ts` case: guard disabled → the test fails, restored → passes; now also runs with no ambient Git identity (`GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null`: 66 pass, 0 fail) |
| AC3 | validate | pass | dcc83d4 | Overall pass; `artifact-rule-fixtures` 40/40; `artifact-records` pass |
| AC4 | test | pass | dcc83d4 | 228 pass, 0 fail at dcc83d4 in a clean checkout (no untracked files), reproducing CI; `validate` is Overall pass there |
| AC5 | manifest provenance | pass | dcc83d4 | `manifest.mjs --check`: pass |
| V1 | diff read against AC1-AC5 and the out-of-scope list | pass | dcc83d4 | 6 files, 124 insertions, 5 deletions; 0 files under `docs/` or `.claude/skills/` |

## Plan

skip: single-step fix; the acceptance criteria are the plan.

## Outcome

The history walk no longer reads a parallel-branch absence as a deletion. Removal detection now uses git's own `--full-history --diff-filter=D` (DAG-aware), and the working-tree deletion stays handled by the walk. A regression test pins the parallel-branch topology. `mise run validate`, `mise run test` (228 pass) and `manifest.mjs --check` are all green.

The first CI run caught a gap in the original verification: the regression test's raw `git merge` needs a Git identity, which passed locally only because this machine has a global one, while the runner has none. `fixtureDir` now sets `user.email`/`user.name`/`commit.gpgsign` repo-locally, so every raw `git` call in a test works on CI. Verification was refreshed at the fix commit (`dcc83d4`).
