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
   - SC10 and branch protection (SC3) are owner actions recorded on the parent.
4. Execute the children with `/drive`; integrated verification, adversarial review, owner acceptance.

## Review

Not run yet: the fresh-context adversarial review runs after integrated verification.

## Checkpoint

- as of: 2026-10-15, branch `task/2026-10-14-harness-hardening-05-session-close-merge`, head e083e6c, worktree clean
- done: 01 (merged), 02 and 03 (verified at 4fab75c, merged), 07 (verified at 57b33da, PR #61), 06 (verified at 24bec60, PR #62), 04 (verified at 41a830b, PR #64), 05 (verified at e083e6c)
- active: none
- blocked: none
- next: integrated SC rows and the fresh-context adversarial review on the parent; then merge the stacked PRs in order (#61, #62, #64, #63, #65, then this branch)
- revalidate: parent B1/B2 ran on 2edf21e
- owner actions pending: branch protection on `main` requiring the `pre-commit` check, read back through the GitHub API (SC3); acceptance
- resume prompt:

  ~~~text
  Resume 2026-10-14-harness-hardening on branch task/2026-10-14-harness-hardening-05-session-close-merge. Expected head e083e6c.
  Read the parent's ## Checkpoint, then reconcile it with `git status`, `git log -n 1` and the child statuses.
  If the head or any child status disagrees with the checkpoint, report the difference and dispatch nothing until it is reconciled.
  Otherwise run the parent's integrated verification and review. Done: 01-07. Blocked: none.
  ~~~
