---
schema: task/1
tier: standard
status: todo
---

# Load G-Ingá in OMP only through the plugin channel

## Routing and approvals

- tier: standard (S2 fails: first OMP project config in the repository; S1, S3–S8 hold)

## Objective

The owner wants OMP (oh-my-pi coding agent) to load G-Ingá as a plugin, not from the project skill folders. Today three OMP providers read the skills straight from the checkout: `claude` reads `.claude/skills/`, `agents` reads `.agents/skills/`, and `opencode` reads the `.opencode/skills/` symlinks. Those copies outrank the plugin copy. Add an `.omp/config.yml` that turns off all three sources, so that inside this repository OMP sees the skills only when the `g-inga@g-inga` plugin is installed from `.claude-plugin/marketplace.json`.

In scope:

- New file `.omp/config.yml` (only the keys below).
- This task record.

Out of scope:

- `.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json` (OMP already accepts them; the canonical skills root layout owns the `skills` path in `plugin.json`).
- `.claude/settings.json`. Its `enabledPlugins: {"g-inga@g-inga": false}` does not block the OMP plugin (checked on 2026-10-16, see Checkpoint); leave it alone.
- Plugin slash commands (`commands/*.md`). Rejected: Claude Code loads the same plugin root and would show a `/g-inga:work` command next to the `/g-inga:work` skill. Under OMP the entry stays `/skill:work`, `/skill:drive`, and so on.
- Hooks, agents, model overrides, docs (tasks 02–09).

## Acceptance criteria

- AC1: `.omp/config.yml` contains exactly `skills.enableClaudeProject: false`, `skills.enableAgentsProject: false` and `disabledProviders: [opencode]`, plus comment lines that explain why. Run from the repository root, `omp config get skills.enableClaudeProject` and `omp config get skills.enableAgentsProject` print `false`, and `omp config get disabledProviders` prints `["opencode"]`.
- AC2: without the plugin, using an isolated profile (`--profile g-inga-check`, so the owner's real OMP state is untouched), `omp --profile g-inga-check read skill://work` run from the repository root fails with `Unknown skill`, and its `Available:` list contains none of `work`, `drive`, `orchestrate`, `sharpen`, `validator-flow`.
- AC3: with the plugin, after `omp --profile g-inga-check plugin marketplace add "$PWD"` and `omp --profile g-inga-check plugin install g-inga@g-inga`, the same `read skill://work` prints a first line `[Skill file: …/plugins/cache/plugins/g-inga___g-inga___…/SKILL.md]` (a plugin cache path, not the repository path). Reading `skill://does-not-exist` lists `drive`, `orchestrate`, `sharpen`, `validator-flow`, `work`, and nothing prefixed with `agents/`.
- AC4: the isolated profile is removed afterwards (`rm -rf ~/.omp/profiles/g-inga-check`), and `omp plugin marketplace list` (default profile) is the same as it was before the task.
- AC5: `mise run validate` and `mise run test` pass.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | `mise run validate` and `mise run test` before the first edit | not run | - | record the commit SHA you ran on |
| B2 | `omp plugin marketplace list` (default profile) before the task | not run | - | paste the output; AC4 compares against it |
| AC1 | `omp config get` for both keys | not run | - | |
| AC2 | `omp --profile g-inga-check read skill://work` without the plugin | not run | - | |
| AC3 | the same read with the plugin installed in the isolated profile | not run | - | |
| AC4 | profile removed; default marketplace list unchanged | not run | - | |
| AC5 | `mise run validate` and `mise run test` | not run | - | |
| V1 | diff read against AC1–AC5 and the out-of-scope list | not run | - | |

## Constraints and budget

- Executor: a cheaper model running in Antigravity or OpenCode. Follow the `standard` procedure in `.agents/skills/work/standard.md` (Antigravity) or `.claude/skills/work/standard.md` (OpenCode). Both resolve to `skills/work/standard.md` once the canonical skills root layout lands.
- Branch `work/2026-10-16-omp-host-compat-01-plugin-channel` from the current `main`. Deliver via PR; never commit to `main`.
- `omp read`, `omp config` and `omp plugin` make no model calls. No paid calls.
- Never install the plugin into the default OMP profile. The owner does that after merge, using the commands that task 09 documents.
- Two failed verification attempts without new information: stop, set `blocked`, fill `## Blockers` (E3).

## Plan

1. Run B1 and B2 and record them before any edit. Set `status: active`.
2. Create `.omp/config.yml`:

   ```yaml
   # G-Ingá loads in OMP only through the g-inga@g-inga plugin; project skill folders are not read.
   # disabledProviders replaces the user-level list in this repository (arrays are not merged).
   skills:
     enableClaudeProject: false
     enableAgentsProject: false
   disabledProviders:
     - opencode
   ```

3. Run AC1. Then run AC2, AC3 and AC4 in that order.
4. Run AC5, fill the table, read the diff (V1), set `completed`, then `verified` with `verified_at` once every row passes.
5. Update `## Checkpoint` and `## Outcome`.

## Checkpoint

- as of: 2026-10-16, branch work/omp-host-compat-tasks, head 47e8c69, task recorded, no edits
- done: probe on OMP 18.11.2 with an isolated profile and the plugin installed from a local checkout. With a temporary `.omp/config.yml` holding these keys, `skill://work` resolved to `~/.omp/profiles/<profile>/plugins/cache/plugins/g-inga___g-inga___0.0.0/.claude/skills/work/SKILL.md` inside this repository, so `.claude/settings.json` `enabledPlugins: false` did not exclude it. Without the plugin and with all three sources off, `Available:` lists no G-Ingá skill. With only the two `skills.*` keys set, `.opencode/skills/work/SKILL.md` still loaded, which is why `opencode` is disabled too. The plugin installs as version `0.0.0` because `plugin.json` has no `version`
- next: step 1 of the plan
