---
schema: spec/1
status: draft
version: 1
---

# Harness Hardening

## Problem

The owner's usage reports for 2026-09-01 to 2026-10-14 show friction the harness should have prevented ([research](../docs/research/2026-10-14-enforcement-and-model-policy.md), E1–E7):

- Invalid task records were committed and pushed because the validator's exit code was masked by a shell chain (E1). Nothing deterministic runs before a commit, and `main` has no required check (E7), while the agent is now allowed to merge.
- Subagents ran on the most expensive model by default, and usage limits cut long epics after the first child, losing progress that no checkpoint captured (E2, E3).
- Sessions ended with work on local branches while the owner assumed it was on `main` (E4).
- The installed plugin went stale silently and kept exposing `/drive` and `/orchestrate` to model invocation (E5). Inside this repository the plugin lists a duplicate `work` (E6).

Who is affected: the owner, in this repository and in every target repository that uses the G-Ingá bundle or plugin.

Heavy triggers: H1 (hook and model policy were owner calls), H3 (spans the skills, the validator bundle, CI and ADR 0005), H4 (harness policy and permissions), H5 (multi-session).

## Expected behavior

- A commit whose staged records fail the validator is rejected by Git itself, whatever command chain the agent or the owner used. CI rejects the same pull request, and `main` can't receive it.
- Each subagent dispatch in `work`, `drive` and `orchestrate` names a model by role, and each child records which model ran and what it consumed.
- After each verified child, `drive` and `orchestrate` leave a checkpoint and a resume prompt, so a cut-off session resumes from the last verified child. On start they reconcile the checkpoint with Git and stop on a mismatch.
- A session that delivers work ends with a report of what is on `origin/main`, what is only local, and which worktrees hold unmerged work. The agent merges only after required checks pass.
- A session using a stale G-Ingá plugin, or a repository without the commit hook installed, starts with a one-line warning.
- Developing G-Ingá in this repository lists each harness skill once.

## Scope

- In scope:
  - the commit-gate convention of [ADR 0009](../docs/decisions/0009-enforcement-primitives.md): mise-managed toolchain with hk, the `pre-commit` mise task, the `g-inga:validate` bundle step, a deny rule for `--no-verify`, the CI job;
  - the role-based model policy and its per-child recording;
  - checkpoint and resume behavior in `drive` and `orchestrate`;
  - the session-close report and the agent-merge rule in `work`, `drive` and `orchestrate`;
  - the plugin `SessionStart` warning;
  - the duplicate listing in this repository;
  - ADR 0009 and the decision map.
- Out of scope: the owner's personal `~/.claude` settings; Antigravity and OpenCode runtime changes beyond running the same mise task; formatter or linter steps for target projects; uv until a Python step exists.
- Non-goals: an unattended headless epic driver; a PR shepherd loop; changing the validator's rules.

## Acceptance criteria

- SC1 **Gate in this repository.** After `mise install` in a fresh clone, the Git pre-commit hook is installed. Staging an invalid task record and running `mise run validate | tail -1 && git commit` leaves no new commit, and the hook's output names the finding. A valid commit succeeds. Every worktree of the clone is covered.
- SC2 **Gate in a target repository.** In a fixture target repository with the updated bundle, a `pre-commit` mise task that depends on `g-inga:validate` rejects an invalid record commit and accepts a valid one. The bundle manifest covers the new file task, and the manifest drift check passes.
- SC3 **Bypass and backstop.** This repository's checked-in permissions deny `git commit --no-verify` and `git commit -n`. The CI workflow runs `mise run pre-commit` on pull requests. Branch protection on `main` requires that job, read back through the GitHub API (owner action).
- SC4 **Model policy.** `work`, `drive` and `orchestrate` state one role-to-model table: read-only search on Haiku, implementation on Sonnet, spec authoring and adversarial review on Opus. Every subagent dispatch in their procedures names a model. After a Sonnet worker fails verification once, the retry runs on Opus, and a second failure follows the existing E3 circuit breaker.
- SC5 **Per-child cost record.** Each child dispatched by `drive` or `orchestrate` gets a verification note with the model and the token totals, in the ADR 0006 vocabulary, with no prompt content.
- SC6 **Checkpoint and resume.** After each verified child, the parent's `## Checkpoint` names the done, active and blocked children, the branch and HEAD, and holds a copy-pasteable resume prompt. A table-top walk of a cut-off after child N shows the resume starts at child N+1. On start, a checkpoint whose HEAD or child statuses disagree with Git is reported, and no child is dispatched until it is reconciled.
- SC7 **Session close and merge.** The handoff procedure fetches `origin`, reports commits on `origin/main`, local-only commits and worktrees with unmerged work, and verifies after a merge that `origin/main` contains it. The merge procedure merges only when required checks pass, never with `--admin`.
- SC8 **Startup warnings.** With the plugin enabled, a session prints one warning when the installed plugin's commit differs from the marketplace's `main`, and one when the repository has a `pre-commit` mise task but no installed Git hook. The check never blocks the session, adds no more than 3 seconds, and reaches the network at most once per 24 hours.
- SC9 **Single listing here.** In a session in this repository, `work`, `drive` and `orchestrate` are each listed once.
- SC10 **Decision recorded.** ADR 0009 is accepted by the owner, the decision map links it as an extension of D5, and ADR 0005 H-1 points to it.

## Interfaces and dependencies

- Changed contracts:
  - the pinned bundle and its integrity manifest gain the `g-inga:validate` file task (ADR 0005 FU2, FU3); target repositories update the bundle to adopt it;
  - the `pre-commit` mise task becomes a convention target repositories compose;
  - the plugin gains `hooks/hooks.json` with a `SessionStart` entry.
- Consumers: this repository, target repositories using the bundle, the owner's plugin installations, the CI workflow.
- External systems: mise, hk (pinned through mise), GitHub branch protection, the marketplace repository for the staleness check.

## Decisions

- Commit gate: mise-managed toolchain, hk installs and runs the Git hook, steps composed as mise tasks, G-Ingá contributes `g-inga:validate`. Alternatives and reasons in [ADR 0009](../docs/decisions/0009-enforcement-primitives.md).
- Model policy: per-invocation `model` parameter set by the skill text, not custom agent definitions, so ADR 0005 item 7 holds (research E18–E23).
- Merge: the agent may merge after required checks pass (owner, 2026-10-14).
- Duplicate listing: this repository disables its own plugin through checked-in project settings, so the live project skills are the only copy here. Alternatives were renaming the project skills or moving the plugin's skills path; both break the single canonical source.

## Risks and constraints

- Every commit pays the validator's runtime. Mitigation: narrow the step to commits touching `tasks/` or `specs/` if it becomes friction.
- A broken validator blocks all commits. `git commit --no-verify` stays available to the owner, not the agent.
- hk's stash of unstaged changes can surprise parallel worktrees: each worktree has its own index, so the stash is per worktree.
- The staleness check reaches the network; it is cached and fails open.
- Protected actions: changing branch protection (owner), merging pull requests (agent, after required checks).

## Verification

- Integrated regression: `mise run validate` and `mise run test` at the integrated head; the new hook installer and the staleness script have unit tests.
- End-to-end: SC1 and SC2 in throwaway repositories created by the test suite; SC3 by reading the workflow and the branch-protection API; SC4–SC7 by text checks on the skill files plus a table-top walk; SC8 by running the hook script against a stale and a current fixture; SC9 in a fresh session listing.
- Review focus: gate bypasses (commit forms, worktrees, `--no-verify`), bundle-manifest consistency, and whether any skill dispatch still omits a model.

## Rollback

- Remove the `postinstall` hook and run `hk uninstall` to drop the Git hook; revert the commits.
- Revert the bundle to the previous release tag; the manifest check confirms the revert.
- Branch protection can be removed by the owner in repository settings.

## Open questions

- deferred: whether a TOML `depends` can name a mise file task. Safe to proceed: the first child spikes it, and ADR 0009 §2 names the fallback.
- deferred: the exact source of the installed plugin's commit for SC8 (cache path or a manifest field). Safe to proceed: the child picks it and SC8 tests both stale and current cases.

## Revisions

- v1 (2026-10-14): first draft from `/insights` and `/doctor` friction and the owner's decisions of 2026-10-14.
