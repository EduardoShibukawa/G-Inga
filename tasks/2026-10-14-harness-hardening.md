---
schema: task/1
tier: heavy
status: active
spec: 2026-10-14-harness-hardening@1
---

# Harness Hardening from Usage Feedback

## Routing and approvals

- tier: heavy (H1: hook policy and subagent model policy are owner calls, H3: spans `work`, `drive`, `orchestrate`, the validator and ADR 0005, H4: harness policy and permissions, H5: multi-session decomposition)
- confirmed: heavy by owner (2026-10-14, "ADR 0009 + 1 spec (recomendado)")
- decided: structure → a new ADR for enforcement-primitive policy (revising ADR 0005 H-1), then one spec covering items 1–6, decomposed into children and executed with `/drive` by owner (2026-10-14, "ADR 0009 + 1 spec (recomendado)")
- decided: merge policy → the agent may merge its own pull requests after required checks pass by owner (2026-10-14, "Permitir merge pelo agente")
- decided: commit-gate mechanism → research first (mise task composition, distribution to target projects through the plugin, conventions other projects can compose) by owner (2026-10-14, "Pesquise qual seria a melhor solucao, talvez criar um step no MISE")
- decided: subagent model policy → research first by owner (2026-10-14, "Vamos pesquisar")
- decided: commit gate → mise manages the toolchain (bun, hk, uv when needed) and the gate is a mise step by owner (2026-10-14, "nao podemos usar mise, hk, bun e uv nese projeto? visto que o temos o mise ter as ferramentas seria um passo no mise")
- decided: G-Ingá validator step → namespaced mise file task in the bundle by owner (2026-10-14, "File task no bundle (recomendado)")
- decided: branch protection → require the CI check on `main` by owner (2026-10-14, "Sim, check obrigatório (recomendado)")
- decided: model policy → Haiku for read-only search, Sonnet for implementation, Opus for spec and adversarial review, one escalation to Opus by owner (2026-10-14, "Haiku/Sonnet/Opus + escalada (recomendado)")
- approved: spec v1 by owner (2026-10-14, "Aprovo spec v1 + ADR 0009 (recomendado)")
- approved: ADR 0009 accepted by owner (2026-10-14, "Aprovo spec v1 + ADR 0009 (recomendado)")

## Objective

Turn the recurring friction found by `/insights` and `/doctor` (2026-10-14) into deterministic enforcement where a rule is checkable and into explicit procedure where it is judgment.

- In scope:
  1. a verification gate that no commit can pass with a failing validator, and no masked exit code;
  2. a subagent model policy per role in `work`, `drive` and `orchestrate`, with cost recorded per child;
  3. a checkpoint and resume prompt after each verified child in `drive` and `orchestrate`, reconciled against Git on start;
  4. a session-close report of remote state (`origin/main` vs local vs worktrees), and the agent-merge rule;
  5. a check that the installed G-Ingá plugin is not stale against the repository;
  6. the known duplicate `work` listing when developing G-Ingá in this repository;
  7. a new ADR: when G-Ingá uses Claude Code hooks versus permissions, Git hooks, CI, skill text, `CLAUDE.md` and subagent parameters.
- Out of scope: the owner's personal `~/.claude` settings, Antigravity and OpenCode runtime changes beyond what the gate convention needs.

## Acceptance criteria

SC1–SC10 from `specs/2026-10-14-harness-hardening.md`.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation suite before change | pass | 2edf21e | `mise run validate` exit 0 (Overall: pass) |
| B2 | repository test suite before change | pass | 2edf21e | `mise run test` exit 0: 242 pass, 0 fail |
| SC1 | gate in this repository | pass | f7839c3 | `tools/gate/commit-gate.test.ts` 5/5 (fresh clone `mise install` installs the hook; masked `mise run validate \| tail -1 && git commit` leaves no commit and names the finding; valid commit; linked worktree gated and a valid commit from it); live: commits from linked worktrees of this clone through the hook since child 07, `.git/config` unchanged |
| SC2 | gate in a target repository | pass | f7839c3 | `tools/validate/bundle-validate-step.test.ts`: fixture target with the bundle, `pre-commit` depends on `g-inga:validate`, a Git hook rejects the invalid record commit (HEAD unchanged, finding named) and accepts a valid one; `manifest.mjs --check` pass |
| SC3 | bypass deny rules, CI job, branch protection | blocked | f7839c3 | deny rules for `--no-verify` and `-n` in `.claude/settings.json`; `.github/workflows` runs `mise run pre-commit` on pull requests; branch protection: `gh api repos/EduardoShibukawa/G-Inga/branches/main/protection` returns 404 "Branch not protected" (owner action) |
| SC4 | model policy | pass | f7839c3 | one table in `work/references/model-policy.md`; every dispatch in `work`, `drive`, `orchestrate` names a model (grep); first failure → new dispatch on Opus, second → E3 |
| SC5 | per-child cost record | pass | f7839c3 | text: `drive` Step 6 and `orchestrate` SEAL record model and ADR 0006 totals from the host's agent result; records: children 04, 05, 08 carry the note (host reports `total_tokens` only); 02, 03, 06 predate the rule in the same wave |
| SC6 | checkpoint and resume | pass | f7839c3 | `work/resume.md` template and reconciliation, referenced by `drive` and `orchestrate`; table-top walk in child 04; this checkpoint follows the template |
| SC7 | session close and merge | pass | f7839c3 | `work/references/procedure.md` "Session Close and Merge"; table-top in child 05 |
| SC8 | startup warnings | pass | f7839c3 | `tools/gate/startup-warnings.test.ts`: stale vs current plugin, 24 h cache including failures, local hook check first, every mise config location, fail open under 3 s |
| SC9 | single listing here | not run | f7839c3 | `.claude/settings.json` disables `g-inga@g-inga` here; the fresh-session listing runs after the change reaches `main` (owner, next session) |
| SC10 | decision recorded | pass | f7839c3 | ADR 0009 `accepted` 2026-10-14; decision map D5 → ADR 0009; ADR 0005 H-1 heading points to ADR 0009 |
| V1 | integrated read of 2edf21e..f7839c3 against SC1–SC10 after the review fixes | pass | f7839c3 | children 01–08 verified; review findings below |

## Plan

1. Research the commit-gate mechanism and model tiering: [research note](../docs/research/2026-10-14-enforcement-and-model-policy.md) (done).
2. ADR 0009 and spec v1 written; spec v1 approved and ADR 0009 accepted by the owner (done).
3. Decompose into children at `@1` (done):
   - `-01-commit-gate`: spike file-task `depends`; mise + hk + `pre-commit` task here; deny rule; CI job (SC1, SC3 except branch protection).
   - `-02-bundle-validate-step`: `g-inga:validate` in the bundle and manifest; fixture target repo (SC2). Depends on 01.
   - `-03-model-policy`: role table and dispatch models in the three skills; per-child cost note (SC4, SC5).
   - `-04-checkpoint-resume`: checkpoint, resume prompt and Git reconciliation in `drive` and `orchestrate` (SC6). Depends on 03 (same files).
   - `-05-session-close-merge`: handoff report and merge rule (SC7). Depends on 04 (same files).
   - `-06-startup-warnings`: plugin `SessionStart` hook and script with tests; single listing here (SC8, SC9). Depends on 01.
   - `-07-hook-env-isolation`: the validator's git calls ignore a hook's `GIT_DIR`/`GIT_INDEX_FILE` (SC1 incident, 2026-10-15).
   - `-08-review-fixes`: the fresh-context review's findings inside spec v1 (SC2, SC4, SC5, SC8).
   - SC10 and branch protection (SC3) are owner actions recorded on the parent.
4. Execute the children with `/drive`; integrated verification, adversarial review, owner acceptance.

## Review

Fresh-context adversarial review on Opus (`work/review.md`), 2026-10-15, over 2edf21e..43a7699:

- [F1, major, SC2] no commit was ever rejected in a target repository; no way to install the hook there -> fixed in 3e5f51e (fixture commits through a Git hook; `docs/bundle.md` install options; actionable warning)
- [F2, major, SC4] the Opus retry used `SendMessage` to the Sonnet worker, which can't change the model -> fixed in 3e5f51e (new dispatch on Opus with the failure log)
- [F3, minor, SC4] model-less dispatch in `orchestrate/references/ooda-cycle.md` -> fixed in 3e5f51e
- [F4, major, SC1/SC3] the deny list misses forms such as `HK_SKIP_HOOK=pre-commit`, `HK='0'`, `git -C . commit --no-verify`, combined short flags (`-an`), abbreviated `--no-veri`, case-variant `core.hookspath`, `GIT_CONFIG_COUNT`, `commit-tree` -> open, owner decision: the deny list is the checked-in permission policy (H4); SC3's letter (`--no-verify`, `-n`) holds, and the deterministic backstop is the required CI check, which needs branch protection (owner action). Proposed additions are in the checkpoint
- [F5, minor, SC1] merge, cherry-pick, rebase and revert commits don't run the hook (incl. `worktree-runner.ts` merges) -> open, follow-up: SC1 names the commit hook; the CI `pre-commit` job on the pull request is the backstop once branch protection is on
- [F6, minor, risks] `refs/stash` is shared across worktrees, not per worktree -> fixed in 3e5f51e (`hk.pkl` comment); the parallel-commit race stays a known risk
- [F7, minor, SC8] failed lookups weren't cached; the network check could starve the hook check -> fixed in 3e5f51e
- [F8, minor, SC8] only `mise.toml` was read -> fixed in 3e5f51e
- [F9, minor, SC5] worker self-reported token usage -> fixed in 3e5f51e (host's agent result); children 01–03 and 06 have no cost note
- Review covered the hook environment: no other git call on the hook path inherits `GIT_DIR`/`GIT_INDEX_FILE` after child 07.

Review complete for the implementation; F4 and F5 wait on the owner.

## Checkpoint

- as of: 2026-10-15, branch `task/2026-10-14-harness-hardening-08-review-fixes`, head f7839c3, worktree clean
- done: 01, 02, 03 (merged), 07 (57b33da, PR #61), 06 (24bec60, PR #62), 04 (41a830b, PR #64), 05 (e083e6c, PR #66), 08 (f7839c3)
- active: none
- blocked: none
- next: owner actions below; then the fresh-session SC9 listing, `verified`, and acceptance
- revalidate: none
- owner actions pending:
  1. SC3: branch protection on `main` requiring the `pre-commit` check (and `test`), read back through `gh api repos/EduardoShibukawa/G-Inga/branches/main/protection`;
  2. F4: decide whether to extend the deny list in `.claude/settings.json` (proposed: `Bash(HK_SKIP*)`, `Bash(* HK_SKIP*)`, `Bash(HK='0'*)`, `Bash(git -C * commit*--no-verify*)`, `Bash(git commit*--no-veri*)`, `Bash(git -c core.hookspath*)`, `Bash(GIT_CONFIG_COUNT*)`), knowing patterns can't cover combined short flags;
  3. F5: decide whether merge/rebase commits need a local gate or the CI check suffices;
  4. SC9: in the next session in this repository after merge, confirm `work`, `drive`, `orchestrate` are listed once;
  5. acceptance.
- resume prompt:

  ~~~text
  Resume 2026-10-14-harness-hardening on branch main after the stacked PRs (#61, #62, #64, #63, #65, #66, #67 and the child 08 PR) are merged.
  Read the parent's ## Checkpoint, then reconcile it with `git status`, `git log -n 1` and the child statuses.
  If the head or any child status disagrees with the checkpoint, report the difference and dispatch nothing until it is reconciled.
  Otherwise record SC3 and SC9 once the owner actions are done, then move the parent to `verified`. Done: 01-08. Blocked: none.
  ~~~
