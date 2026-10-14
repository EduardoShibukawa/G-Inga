# Enforcement primitives, commit gate and subagent model policy

Research for [task](../../tasks/2026-10-14-harness-hardening.md), 2026-10-14. Inputs: `/insights` and `/doctor` reports from the owner's sessions (2026-09-01 to 2026-10-14), [ADR 0005](../decisions/0005-native-primitive-mapping.md) H-1, and the primary sources listed per fact. Codes `E1`… are cited by the ADR and spec that follow.

## Friction that motivates this

| Code | Observation | Source |
|---|---|---|
| E1 | Invalid task records were committed and pushed because a `validate \| tail && git commit` chain tested `tail`'s exit code, not the validator's. At least four sessions needed amend or forward-fix commits | `/insights` friction category 1 |
| E2 | Nine research subagents ran on Opus by default until the owner objected. Built-in `Explore` inherits the main model | `/insights` category 2; E12 |
| E3 | Usage limits stopped an 11-child epic after child 1 and killed a background adversarial review | `/insights` category 3 |
| E4 | Sessions ended with work only on local branches or worktrees while the owner assumed it was on `main`; stale state was read after merges | `/insights` suggestions |
| E5 | The installed `g-inga` plugin was a day behind `main` and still exposed `/drive` and `/orchestrate` to model invocation after the repository made them user-invocable | `/doctor`, 2026-10-14 |
| E6 | Inside this repository, `work` and `g-inga:work` are both listed, because the plugin's skills path is this repository's `.claude/skills/` | `/doctor`; `.claude-plugin/plugin.json` |
| E7 | `main` has no branch protection and no required status checks; repository auto-merge is off | `gh api repos/…/branches/main/protection` → "Branch not protected", 2026-10-14 |

## Commit gate: facts

| Code | Fact | Source |
|---|---|---|
| E8 | A Git `pre-commit` hook that exits non-zero aborts the commit, whatever shell chain invoked `git commit`. Masking with `\| tail` cannot reach it | Git hooks documentation (`githooks(5)`) |
| E9 | `mise generate git-pre-commit --write` writes `.git/hooks/pre-commit` that runs a mise task (default name `pre-commit`) and passes staged files as `STAGED`. `--task` picks another task | `mise generate git-pre-commit --help`, mise 2026.4.3 (local) |
| E10 | mise `[hooks] postinstall` runs on every `mise install`, "even when every tool is already installed", and needs no shell activation. `enter`/`cd` hooks need `mise activate` | <https://mise.jdx.dev/hooks.html> |
| E11 | mise file tasks in subdirectories are namespaced with `:` (`mise-tasks/db/migrate.sh` → `db:migrate`). Whether a TOML `depends` may name a file task is not stated: needs a spike | <https://mise.jdx.dev/tasks/file-tasks.html> |
| E12 | hk (jdx, mise's sister project, v2.6.0, MIT) manages Git hooks with typed Pkl config, parallel steps, and stashes unstaged changes so checks see only staged content. Cross-project config sharing is not documented on its landing page | <https://hk.jdx.dev/> |
| E13 | Claude Code plugins ship hooks in `hooks/hooks.json`; they merge with user and project hooks when the plugin is enabled | <https://code.claude.com/docs/en/hooks> |
| E14 | `PreToolUse` exit 2 blocks and feeds stderr back. Hooks fail open on timeout or error unless `"onFailure": "block"` (v2.1.295+). The `if` field is "best-effort"; the docs say to "use the permission system rather than a hook to enforce a hard allow or deny" | same |
| E15 | `SessionStart` stdout or `additionalContext` is injected as a system reminder before the first prompt | same |
| E16 | OpenCode plugins expose `tool.execute.before`; the docs' `.env` example blocks a tool by throwing. Blocking a bash `git commit` this way is inferred, not documented | <https://opencode.ai/docs/plugins/> |
| E17 | A Claude Code hook covers only Claude Code. G-Ingá also targets Antigravity and OpenCode, and the owner commits by hand too | `packages/opencode-plugin/index.ts`; ADR 0005 H-1 coverage notes |

### Commit gate implications

- A Git hook is the only layer every host and every commit form passes through (E8, E17). A Claude `PreToolUse` hook sees only Bash commits it can parse (E14) and nothing outside Claude Code.
- mise already standardizes the tooling. `postinstall` can install the Git hook without activation (E9, E10), so `mise install` is the single setup step and every worktree of the clone shares `.git/hooks`.
- A **task-name convention** gives composition: the target project owns a `pre-commit` mise task and composes its own steps through `depends`; G-Ingá contributes one step (its validator). Whether the G-Ingá step can ship as a namespaced file task inside the pinned bundle (E11) needs a spike.
- `git commit --no-verify` bypasses any Git hook. A permission deny rule covers the agent; CI with a required check covers everything else (E7).
- hk adds staged-only checking and fixer orchestration (E12). It is more machinery than one validator step needs today.
- Claude Code hooks remain the right tool for session-lifecycle signals that Git cannot see, such as a `SessionStart` warning for a stale plugin or a missing Git hook (E5, E15).

## Subagent model policy: facts

| Code | Fact | Source |
|---|---|---|
| E18 | Subagent model order: per-invocation `model` parameter → agent frontmatter `model` → `CLAUDE_CODE_SUBAGENT_MODEL` → main model | <https://code.claude.com/docs/en/sub-agents> |
| E19 | Built-in `Explore` runs on the main conversation's model (Opus when the main is Fable on a subscription); `CLAUDE_CODE_SUBAGENT_MODEL` alone does not change `Explore` or `Plan` | same |
| E20 | Plugins can ship agents in `agents/`, registered as `<plugin>:<name>`; plugin agents ignore `hooks`, `mcpServers` and `permissionMode` frontmatter | same |
| E21 | Base input / output prices per MTok: Opus 5.5 $4 / $20; Sonnet 5.5 $2 / $10; Haiku 5.5 $0.10 / $0.50 (prompts ≤ 100k tokens), $0.50 / $2.50 above | <https://platform.claude.com/docs/en/about-claude/pricing>, 2026-10-14 |
| E22 | Cheapest per token is not cheapest per approved task: weak tool-calling loops burn retries and hit the E3 circuit breaker; review by a different model catches misses cheaper than a second pass by the same one | [multi-host analysis](2026-10-13-multi-host-orchestration-analysis.md) |
| E23 | Aider's architect/editor split: role-based model pairs scored higher than either model alone on its editing benchmark | [similar harness ideas](2026-10-13-similar-harness-ideas.md) §4 |

### Model policy implications

- The per-invocation `model` parameter wins over everything (E18), so skill text can set a model per role without custom agent definitions. That keeps ADR 0005 item 7 (no custom subagent by default) intact.
- `Explore` spikes in `/orchestrate` currently run on the main model (E19), so they need an explicit `model`.
- Haiku 5.5 is about 40× cheaper than Opus 5.5 per input token and Sonnet 5.5 about 2× (E21). On a subscription the same ratio approximates quota consumption, which is what cut sessions short (E3).
- Role, not task category, is the routing axis with evidence (E23). Cost per verified task, not per token, is the measure (E22), so the policy needs an escalation step and per-child recording to be judged.
- Other hosts map roles to their own model flags; the contract names roles, the host adapter names models.

## Open for the owner

1. Commit gate: Git hook through a mise `pre-commit` task convention (recommended), hk, a Claude `PreToolUse` hook, or both.
2. Where the G-Ingá validator step lives in a target project: a namespaced file task in the bundle (spike E11) or a documented line the project adds to its own `pre-commit` task.
3. Branch protection with a required `validate` check on `main`, now that the agent may merge (E7).
4. Model roles: Haiku for read-only search, Sonnet for implementation, Opus for spec and adversarial review, with one escalation to Opus after a Sonnet worker fails verification.
