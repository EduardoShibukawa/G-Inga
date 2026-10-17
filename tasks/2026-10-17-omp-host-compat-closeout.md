---
schema: task/1
tier: standard
status: active
---

# Close out OMP host compatibility: acceptance, validator timeout, stale PR and branch hygiene

## Routing and approvals

- tier: standard (S2 fails: ordered actions across task records, a validator test and a PR; S1, S3, S4, S6–S8 hold because each outcome is checkable once the owner records the decision; S5 doesn't)
- decided: G-D1, accept tasks 01–09 → accept 01–08, then 09; the task 08 B1 timeout (120 s under load, passes in isolation) is recorded as baseline under load, environmental by owner (owner, 2026-10-17 (session decision message))
- decided: G-D3, PR #47 → close as superseded, no merge or rebase by owner (owner, 2026-10-17 (session decision message))
- decided: G-D2, validator self-test timeout → option (d), tier standard, authorized by owner (2026-10-17): remove the expensive full-repository validation from `bun test`; preserve G1 (seven required checks remain applicable in full mode), G2 (check names do not use decision-ID prefixes) and G3 (validator leaves a committed Git fixture unchanged) in lightweight contract tests. Keep full validation mandatory in CI via `mise run validate` / `pre-commit`; document that local `mise run test` no longer runs the full repository validator.

## Objective

Collect the evidence the owner needs to close the OMP host-compatibility work. Then, after each decision, carry it out: record acceptance of tasks 01–09, fix or formally accept the validator timeout, close the superseded PR #47, and propose a branch cleanup list.

In scope:

- This record, the `accepted:` entries in `tasks/2026-10-16-omp-host-compat-0[1-9]-*.md` after the owner accepts, and the change chosen for `tools/validate/validate.test.ts` (G-D2).
- Closing PR #47 with a comment, once authorized.
- A proposed list of remote branches to delete. Deleting them needs a separate approval.

Out of scope:

- Any change to tasks 01–09 other than the `accepted:` entry and `status`.
- Machine-local configuration outside the repository (`~/.omp`). It isn't versioned, and this record lists no values from it.
- Deleting anything without an explicit owner approval.

## Acceptance criteria

- AC1: each owner decision G-D1–G-D5 is recorded as a `decided:` entry in this log, quoting the owner.
- AC2: if G-D1 accepts, tasks 01–08 and then 09 carry `accepted: by owner (<date>, <ref>)` and `status: accepted`, and `mise run validate` passes.
- AC3: G-D2 option (d) is carried out without reducing gate coverage: `validate.test.ts` no longer recursively validates the canonical repository; `repo-contract.test.ts` covers G1 with `applies()`, G2 with a decision-ID-name mutation, and G3 using a committed Git fixture and before/after porcelain state. `mise run test` and `mise run validate` pass; full validation remains a required CI check; F-003 records measured cost and the timeout.
- AC4: if G-D3 authorizes, PR #47 is closed with a comment that links the commits on `main` that carry its content.
- AC5: G-D5 produces a list of remote branches. For each branch it gives the head, the commits ahead of `main`, and a proposal (delete / keep / ask). Nothing is deleted without approval.
- AC6: `mise run validate` and `mise run test` pass at `verified_at`.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | `mise run validate` before the first edit | pass | f33e945 | worktree `work/2026-10-17-omp-host-compat-closeout`, Overall pass (49.3 s) |
| B2 | `mise run test` on `main` | pass | f33e945 | [CI run 219](https://github.com/EduardoShibukawa/G-Inga/actions/runs/38993843536); jobs `test` and `pre-commit` success; the "this repository" test took 36.9 s |
| AC1 | `decided:` entries read against G-D1–G-D5 | not run | | G-D1, G-D2 (direction only) and G-D3 recorded; G-D4 and G-D5 still open |
| AC2 | `mise run validate` after the `accepted:` entries | pass | 865d03f | exit 0 after tasks 01–08 (42.6 s) and again after task 09 (865d03f tree); all nine tasks `status: accepted` |
| AC3 | G-D2 repo-contract tests plus `mise run test` and `mise run validate` | not run | | code and tests are on `work/2026-10-17-gd2-repo-contract`; awaiting CI evidence |
| AC4 | PR #47 state and closing comment | pass | 7815059 | [PR #47](https://github.com/EduardoShibukawa/G-Inga/pull/47) closed 2026-10-17 without merge, branch kept. `git diff origin/main 741a3f2 -- docs/friction-log.md specs/2026-10-14-question-rounds-skill.md` empty; merge-tree conflicts only in the four `tasks/2026-10-14-question-rounds*` files. Comment links #49 (621cd44), #50 (7072181), #52 (6f2690c), #53 (e9aa41d), #63 (930fc3e), #65 (ae4fef9), #67 (31a5bfb), #74 (e1b407a) |
| AC5 | branch list reviewed by the owner | not run | | |
| AC6 | `mise run validate` and `mise run test` | not run | | |
| V1 | diff read against AC1–AC6 and the out-of-scope list | not run | | |

## Owner decisions

Evidence was gathered on 2026-10-17 at `f33e945`.

### G-D1: accept tasks 01–09?

| Task | `verified_at` | Baseline note |
|---|---|---|
| 01 plugin-channel | `d24dc6c` | B1 pass (rerun on a quiet machine) |
| 02 commit-bypass-guard | `ec6da30` | B1 pass (rerun under `flock`) |
| 03 session-start-warnings | `94b4fe9` | B1 pass on run 2; run 1 hit the 120 s timeout under contention |
| 04 plugin-agents | `50eb9be` | B1 pass; first test run 331 pass / 1 fail (120 s timeout, load 17) |
| 05 skill-relative-paths | `77c7eb6` | B1 pass |
| 06 model-policy-host-mapping | `ce66e82` | B1 pass |
| 07 skill-dispatch-host-neutral | `7eed4c6` | B1 pass |
| 08 usage-telemetry-omp-host | `97404df` | **B1 fail**: 120 s timeout under contention, passes alone. AC1–AC7 and V1 pass at `97404df` |
| 09 docs-and-integration | `97574d2` | B1 pass; `depends_on` 01–08 |

- There is no parent record for 01–09.
- A `B` row records the starting state and may be `fail` (`docs/artifact-contracts.md` §3.4). The 08 baseline failure is environmental, not a defect of the task.
- **Proposal:** accept 01–08, then 09, noting the 08 baseline in the `accepted:` entry.

### G-D2: the 120 s timeout in `tools/validate/validate.test.ts:170`

The owner authorized option (d), tier `standard`, on 2026-10-17. This is a test-architecture change, not a validator-rule change, and must not reduce gate coverage.

- Remove the `describe("this repository")` test that reruns the full validator against the canonical repository inside `bun test`.
- Add `tools/validate/repo-contract.test.ts` with three bounded contracts:
  - **G1:** assert the seven required checks still exist and each `applies(ctx)` returns `true` in full mode. This does not claim that `applies()` proves the checks pass; the full validator in CI remains the pass/fail gate.
  - **G2:** assert no check name starts with a decision-ID prefix; include a deliberately invalid name such as `d1-custom-check` so a broken predicate fails the test.
  - **G3:** create a committed temporary Git fixture, run the validator on it, and assert `git status --porcelain --untracked-files=all` is unchanged. The fixture is weaker than self-validating the real repository, so G3's boundary is explicit.
- Keep `mise run validate` as the full current-tree and history audit. The required CI `pre-commit` job must continue invoking `mise run validate`; it must not treat a missing required status or `not run` as success.
- Document that local `mise run test` type-checks and runs validator tests but no longer runs a full self-validation of the canonical repository.
- Record F-003 in `docs/friction-log.md`: 57 s elapsed, about 4 min CPU, and the 120 s timeout observed under load.
- Target: the contract tests take under 5 s. The exact timing and all three mutation guards remain unverified until CI runs.

### G-D3: PR #47

- PR #47 (`741a3f2`, base `ed82275`, 232 commits behind) is open and `CONFLICTING`. Its only check-run, `validate`, passed.
- Its six paths are already on `main`:
  - `specs/2026-10-14-question-rounds-skill.md` and the parent plus children 01–03, with child 04 added later;
  - the parent is `accepted`;
  - the friction entries F-001 and F-002 are in `docs/friction-log.md`;
  - the implementation landed through PR #49 (`621cd44`).
- A rebase would add nothing.
- **Proposal:** close it as superseded.

### G-D4: machine-local OMP configuration

- The keys reported earlier (Antigravity, `secrets.enabled`, `showTokenUsage`) live in the owner's user configuration, not in this repository.
- The versioned `.omp/config.yml` holds only:
  - the skill-folder switches;
  - `disabledProviders`;
  - the agent model overrides.
- **Proposal:** keep machine-local configuration out of the repository. Document only the key names the workflow assumes, if any.

### G-D5: branch hygiene

- Every local branch is merged into `origin/main`.
- Thirty-seven remote branches have commits that aren't on `main`, according to local refs that weren't fetched: `agy/*`, `archive/*`, `claude/*`, `gemini/*`, `task-claims/*`, `feat/*` and `task/*`.
- **Proposal:** fetch with `--prune`, then produce the AC5 list for approval.

### Already settled (no decision needed)

- **CI failures after #84–#88** (runs 201–205):
  - Cause: `artifact-records` failed with "verified → todo is not reachable" for omp-host-compat-01. A history-walk bug read the wrong state when a merge brought in an older creation.
  - Fix: PR #89 (`75d2f05`). Every later run on `main` passed.
  - Not settled: whether #89 added a regression test.
- **ADR 0007:** `accepted (2026-10-13)`, set by the owner in `36034be`.

## Plan

1. Record each owner decision as `decided:`.
2. G-D1 and G-D3 are already complete on `main`; validate the G-D2 implementation branch, preserve G1–G3, then update this record with CI evidence.
3. Fetch, then build the G-D5 list.
4. Run AC6 and V1, then open the PR.

## Checkpoint

- as of: 2026-10-17, branch `work/2026-10-17-omp-closeout-decisions`, base `7815059`, worktree `/home/shibuka/Projetos/G-Inga-wt-closeout-decisions`
- done: G-D1 (tasks 01–09 accepted, commits `6235c22`, `865d03f`); G-D3 (PR #47 closed); G-D2 scope authorized and implementation prepared on `work/2026-10-17-gd2-repo-contract`
- next: collect CI evidence for G-D2 and validate AC3; owner answers G-D4 and G-D5; then AC5, AC6, V1
- open: G-D4, G-D5, G-D2 verification, whether PR #89 added a regression test
- revalidate: rerun `mise run validate` and `mise run test` if `main` moves
