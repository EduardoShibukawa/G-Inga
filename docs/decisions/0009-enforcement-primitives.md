# 0009 — Enforcement primitives and the commit gate

- **Status:** accepted (accepted by project owner 2026-10-14)
- **Date:** 2026-10-14
- **Deciders:** project owner
- **Depends on:** D5 on the [decision map](../decision-map.md), settled by [ADR 0005](0005-native-primitive-mapping.md). This record extends D5 and settles its open follow-up H-1. ADR 0005 keeps its status until the owner decides.
- **Evidence:** [enforcement and model policy research](../research/2026-10-14-enforcement-and-model-policy.md) (codes `E1`–`E23`).
- **Spec:** [Harness Hardening](../../specs/2026-10-14-harness-hardening.md) v1.

## Context

ADR 0005 put guidance where judgment lives and enforcement where rules are checkable, then left the commit gate open (H-1). Its revisit condition required a logged friction where an invalid record commit reached a pull request. `/insights` (2026-09-01 to 2026-10-14) shows that it happened in at least four sessions, through `validate | tail && git commit` chains that tested the wrong exit code (E1). The owner has since allowed the agent to merge its own pull requests, and `main` has no branch protection (E7), so nothing deterministic stands between an invalid commit and `main`.

## Decision

### 1. Which primitive for which kind of rule

| Kind of rule | Primitive | Why | Examples |
|---|---|---|---|
| Static "never run X" | Permission rule (`deny` / `ask`) | Checked by the harness itself; the hook docs defer hard allow/deny to permissions (E14) | `git commit --no-verify`, `git push --force` to `main` |
| Invariant on repository content, checkable by a script | Git hook through the mise toolchain, plus a required CI check | Every host and every commit form passes through Git (E8, E17). A non-zero hook aborts the commit, so shell masking can't reach it | the G-Ingá validator before a commit |
| Session-lifecycle signal Git can't see; failing open is acceptable | Claude Code hook in the plugin's `hooks/hooks.json` | Fires on session events and injects context (E13, E15) | `SessionStart` warning: installed plugin is stale, or the Git hook isn't installed |
| Procedure that needs judgment | Skill text | Loaded on demand; ADR 0005 item 3 | checkpoint after each child, session-close report |
| Universal, short, always-on constraint | `CLAUDE.md` | Paid every turn, so only what can't be derived | language policy, never commit to `main` |
| Cost policy per role | Per-invocation `model` parameter set by the skill | Highest precedence, no custom agent files (E18) | spec model policy |

A Claude Code hook never carries a rule that must hold on every host or for human commits. Where a rule also needs fast in-session feedback, the Claude hook calls the same mise task the Git hook calls; it never re-implements the check.

### 2. The commit gate (settles H-1)

- **mise manages the toolchain.** Bun, hk and any later tool (for example uv, once a Python step exists) are pinned in `mise.toml` and `mise.lock`. Nothing is installed outside mise.
- **hk installs and runs the Git hook.** A `postinstall` mise hook runs `hk install`, so `mise install` is the only setup step (E10). hk runs only on staged content and stashes the rest (E12).
- **mise composes the steps.** The `pre-commit` mise task is the convention. A project composes its own steps with `depends`, and hk's pre-commit step runs that task. The steps live in mise, not in hk's config, so a host or CI that runs `mise run pre-commit` gets the same checks without hk.
- **G-Ingá contributes one step.** The pinned bundle ships the validator as a namespaced mise file task, `g-inga:validate` (E11). A target project adds it to its `pre-commit` task. If a spike shows a TOML `depends` cannot name a file task, the bundle documents one line the project adds instead, and this record is revised.
- **Bypass and backstop.** A permission deny rule covers `git commit --no-verify` and `-n` for the agent. CI runs `mise run pre-commit` on every pull request, and branch protection on `main` requires that job, so a human bypass or a host without the hook still can't merge red.

### 3. Agent merge

The agent may merge its own pull request once the required check passes. It never uses `--admin` or any flag that skips branch protection.

## Options considered

| ID | Option | Why not chosen |
|---|---|---|
| A | Keep ADR 0005 alternative I: skill step plus CI, no hook | The skill step was masked in practice (E1), and CI isn't required on `main` (E7) |
| B | Claude Code `PreToolUse` hook on `git commit` only | Claude Code only, Bash-parsed commits only, "best-effort" matching (E14, E17) |
| C | Plain Git hook from `mise generate git-pre-commit` | Viable and simpler, but checks the working tree rather than only staged content (E9, E12) |
| D | Git hook plus a `PreToolUse` hook re-running the validator | Two implementations of one rule; the Git hook already reports to the agent through Bash output |
| E | hk with steps defined in Pkl, not in mise tasks | Ties every host and CI to hk and Pkl; mise tasks stay host-neutral |

## Consequences

- ADR 0005 H-1 becomes settled by this record. ADR 0005 item 12 changes in one place: a `SessionStart` hook is used, for warnings only. `Stop` and `UserPromptSubmit` hooks stay unused.
- `mise.toml` gains hk and a `postinstall` hook; a new `hk.pkl` and a `pre-commit` task are added to this repository, which dogfoods the convention.
- The pinned bundle and its manifest gain the `g-inga:validate` file task, so the bundle contract changes (FU2) and target repositories need a bundle update.
- Owner action: enable branch protection on `main` with the CI job as a required check.
- Every commit now pays the validator's runtime. If that becomes friction, the step narrows to commits that touch `tasks/` or `specs/`.
