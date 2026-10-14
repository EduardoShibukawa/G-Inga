---
schema: task/1
tier: standard
status: verified
verified_at: "90b5365"
parent: 2026-10-14-harness-hardening
spec: 2026-10-14-harness-hardening@1
---

# Commit Gate with mise and hk

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-14-harness-hardening after spec v1 approval)

## Objective

Install the ADR 0009 commit gate in this repository: hk pinned through mise, a `postinstall` hook running `hk install`, a `pre-commit` mise task that hk runs, a deny rule for `--no-verify`, and a CI job running `mise run pre-commit`.

- In scope: `mise.toml`, `mise.lock`, `hk.pkl`, mise task files, checked-in `.claude/settings.json` permissions, `.github/workflows/`, tests and docs for the gate.
- Out of scope: the bundle step (child 02); branch protection (owner action on the parent).

## Acceptance criteria

- AC1: spike recorded: whether a TOML `depends` can name a namespaced mise file task, with the mise version; the result picks ADR 0009 §2 path or its fallback.
- AC2 = SC1.
- AC3 = SC3, except the branch-protection readback, which the parent records.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | 2edf21e | parent B1/B2: `mise run validate` exit 0, `mise run test` 242 pass |
| B2 | repository validation suite before change | pass | 005bdb1 | `mise run validate` exit 0 (Overall: pass) |
| B3 | repository test suite before change | pass | 005bdb1 | `mise run test` exit 0: 249 pass, 0 fail |
| AC1 | file-task `depends` spike, with mise versions | pass | 90b5365 | Notes: works on mise 2026.4.3 and 2026.10.7; ADR 0009 §2 path, no fallback |
| AC2 | SC1: gate in this repository | pass | 90b5365 | `tools/gate/commit-gate.test.ts` 4 pass: `mise install` in a fresh clone installs the hook; `git add` + `mise run validate \| tail -1 && git commit` leaves HEAD unchanged and prints the validator finding; a valid record commits; a second worktree is gated. With `postinstall` disabled, 3 of 4 fail |
| AC3 | SC3 except branch protection: deny rules and CI job | pass | 90b5365 | `.claude/settings.json` denies `git commit --no-verify`, `-n`, `-nm`, `HK=0` and `core.hooksPath` overrides; `.github/workflows/validate.yml` job `pre-commit` runs `mise run pre-commit` on pull requests; local `mise run pre-commit` exit 0 |
| R1 | repository validation and test suites | pass | 90b5365 | `mise run validate` exit 0 (Overall: pass); `mise run test` exit 0: 253 pass, 0 fail |
| V1 | self-review of `005bdb1..90b5365` against AC1–AC3 | pass | 90b5365 | old job name only in a dated research note, left as written |

## Plan

1. Spike file-task `depends` in a scratch repository and record the result (done: Notes).
2. Pin hk through mise; add the `postinstall` hook and `hk.pkl` whose pre-commit step runs `mise run pre-commit`.
3. Add the `pre-commit` mise task depending on `validate`.
4. Add the `--no-verify` / `-n` deny rule to checked-in project settings.
5. Add the CI job; tests that create a throwaway repository and prove SC1.

## Outcome

The commit gate is installed in this repository's configuration. `mise install` installs the hk hook, which runs `mise run pre-commit` (→ `validate`), and a masked shell chain can't commit an invalid record. The agent's bypasses are denied in checked-in settings, and CI runs the same task in the `pre-commit` job. The hook isn't installed in the owner's clone yet (see Checkpoint). Not delivered here: branch protection (owner action, parent) and the bundle step (child 02). The deny rules are prefix and glob matches: other flag spellings (for example `-anm`) aren't covered, and the CI job remains the backstop.

## Notes

Spike (AC1), 2026-10-14, in a scratch Git repository: a file task at `.mise/tasks/g-inga/validate` is listed as `g-inga:validate`, and a TOML task with `depends = ["g-inga:validate"]` runs it first. When the file task exits 1, the TOML task doesn't run and `mise run` exits 1. Same result on mise 2026.4.3 (owner's machine) and 2026.10.7 (CI). ADR 0009 §2 path holds; the fallback line isn't needed, and ADR 0009 isn't revised.

Findings while installing the gate:

- `[hooks]` is experimental in mise 2026.4.3 and stable in 2026.10.7, so `mise.toml` sets `experimental = true`.
- hk 1.24.0 needs the Pkl CLI to read `hk.pkl`, so `pkl` is pinned too.
- A failed `postinstall` is a mise warning: `mise install` still exits 0. The test checks the hook file, not the exit code.
- hk stashes untracked files during the hook, so an untracked `mise.local.toml` vanishes while the step runs; a git-ignored one stays.
- Once the hook is in a clone's shared hooks directory, a worktree whose branch predates the gate can't commit (`"hk" couldn't exec process`) until it merges `main`. So the hook isn't installed in the owner's clone in this session; `docs/development.md` lists the fix.
- `mise lock` run in a worktree nested under the main clone also rewrites the main clone's `mise.lock` (mise updates every lockfile in the directory hierarchy). The lockfile here was generated from a copy outside the clone.

## Checkpoint

- Date: 2026-10-14
- Branch: `task/2026-10-14-harness-hardening-01-commit-gate` (worktree `.claude/worktrees/epic-bell-e24599`), PR #55; verified at 90b5365
- Done: B rows; spike (AC1); hk + pkl pinned, `postinstall`, `hk.pkl`, `pre-commit` task; deny rules; CI `pre-commit` job; end-to-end test; docs in `docs/development.md`.
- Next action: merge PR #55 with a merge commit once `gh pr checks` is all pass. Owner actions: (1) branch protection on `main` requiring `pre-commit`; (2) after the merge, run `mise install` in the main clone, after merging `main` into open worktree branches; (3) the main clone's `mise.lock` has an uncommitted rewrite from this session's `mise lock` (format downgrade by mise 2026.4.3); restore it with `git checkout -- mise.lock`.
