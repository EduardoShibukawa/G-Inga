---
schema: task/1
tier: standard
status: active
parent: 2026-10-14-harness-hardening
spec: 2026-10-14-harness-hardening@1
depends_on:
  - 2026-10-14-harness-hardening-01-commit-gate
---

# Isolate the Validator's Git Calls from the Hook Environment

## Routing and approvals

- tier: standard (bug against SC1 of the approved spec, found while integrating child 06; one module, `tools/validate/artifacts/history.ts`, plus tests and the rebuilt bundle validator)

## Objective

A commit from a linked worktree must not let the validator act on the repository. Inside a Git hook in a linked worktree, Git exports absolute `GIT_DIR` and `GIT_INDEX_FILE`. The validator's history fixtures inherited them, so `git init` and `git config` in their temp directories rewrote the real `.git/config` (`core.bare = true`, a `fixture` identity), and every later command in the clone failed until it was repaired by hand. This happened twice on 2026-10-15.

- In scope: `tools/validate/artifacts/history.ts` (drop Git's repository-local variables for every git it spawns), `tools/validate/validate.js` (rebuilt), `manifest.json` (regenerated), `tools/validate/artifacts/artifacts.test.ts` (repro), `tools/gate/commit-gate.test.ts` (valid commit from a linked worktree; `clone` inside the temp root from the start, and `sh()` refuses any other cwd, so a failed setup test never runs git or writes records in this repository).
- Out of scope: other spawners under `tools/gate/` (they act on the repository they run in, not on fixtures).

## Acceptance criteria

- AC1: with `GIT_DIR` and `GIT_INDEX_FILE` pointing at another repository, the history fixtures give their expected outcomes and leave that repository's config unchanged (repro failed first).
- AC2: in a fresh clone with the hook installed, a valid record commits from a linked worktree and the clone's `core.bare` stays `false`; a failed setup test can't make later tests run git in this repository.
- AC3 = SC1 (live): a commit of this change from a linked worktree of this repository passes the hook, and `.git/config` is unchanged.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository `pre-commit` and `test` CI jobs before change | pass | 48e1949 | CI run on `main`: `pre-commit` success, `test` success; local `mise run validate` exit 0 (Overall: pass) |

## Plan

1. Repro test that runs the history fixtures in a child process started with a hook's `GIT_DIR` and `GIT_INDEX_FILE` (failed first on the unfixed tree: 3 history cases off).
2. Drop `git rev-parse --local-env-vars` names from the environment of every git `history.ts` spawns.
3. Commit-gate test: valid commit from the linked worktree; `sh()` refuses a cwd outside the temp root.
4. Rebuild the bundle validator; regenerate the manifest in its own commit.
