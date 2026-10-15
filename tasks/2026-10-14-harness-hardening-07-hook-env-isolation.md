---
schema: task/1
tier: standard
status: verified
verified_at: "57b33da"
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
| AC1 | history fixtures with a hook's `GIT_DIR` and `GIT_INDEX_FILE` pointing at another repository | pass | 57b33da | `artifacts.test.ts` "history fixtures ignore an inherited GIT_DIR and GIT_INDEX_FILE": child process started with that environment, every `H-` case as expected, decoy `.git/config` byte-identical. Failed first on the unfixed tree (`H-squash-no-entry`, `H-baseline`, `H-reopen` off) |
| AC2 | valid commit from a linked worktree; failed setup can't reach this repository | pass | 57b33da | `commit-gate.test.ts` 5/5 pass, including "a valid record commits from another worktree, and the hook leaves the clone's config alone"; with the setup test failing (manifest drift before regeneration) the later tests failed in under 7 ms and wrote nothing to this worktree |
| AC3 | SC1 live: commit from a linked worktree of this repository through the installed hook | pass | 57b33da | 227e17d and 57b33da committed from a linked worktree with the hk hook running the full `mise run pre-commit` (fixtures included); `.git/config` sha256 `14195d4a9ac4…` before and after, `core.bare` false |
| R1 | repository validation and test suites after change | pass | 57b33da | `mise run validate` exit 0 (Overall: pass); `mise run test` exit 0 (259 pass, 0 fail) |
| V1 | self-review of 48e1949..57b33da against AC1–AC3 | pass | 57b33da | diff confined to `tools/validate/artifacts/history.ts`, `tools/validate/validate.js` (rebuilt), `manifest.json` (regenerated alone), the two test files and this record; `manifest.json` commit is 227e17d, per the two-commit protocol |

## Plan

1. Repro test that runs the history fixtures in a child process started with a hook's `GIT_DIR` and `GIT_INDEX_FILE` (failed first on the unfixed tree: 3 history cases off).
2. Drop `git rev-parse --local-env-vars` names from the environment of every git `history.ts` spawns.
3. Commit-gate test: valid commit from the linked worktree; `sh()` refuses a cwd outside the temp root.
4. Rebuild the bundle validator; regenerate the manifest in its own commit.

## Outcome

`tools/validate/artifacts/history.ts` now spawns every git with Git's repository-local variables (`git rev-parse --local-env-vars`, plus `GIT_CONFIG_KEY_<n>`/`GIT_CONFIG_VALUE_<n>`) removed, so the history fixtures act only on their temp repositories and the real-history checks find the repository from `cwd`. The bundle validator is rebuilt and the manifest regenerated. The commit-gate test covers a valid commit from a linked worktree, and keeps every git call inside its temp root even when the setup test fails.

Incident record: on 2026-10-15 the unfixed validator, run by the hook from a linked worktree, twice set `core.bare = true` and a `fixture` identity in this clone's `.git/config`; the owner repaired it by hand both times. A second path to the same damage was the commit-gate test itself: a failed setup left `clone` empty, so later tests ran `git commit` in the current repository, and hk's stash held the uncommitted fix while the old validator ran.
