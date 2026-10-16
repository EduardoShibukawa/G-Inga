---
schema: task/1
tier: standard
status: verified
verified_at: "d24dc6c"
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
| B1 | `mise run validate` and `mise run test` before the first edit | pass | f678867 | re-run on a quiet machine: validate exit 0 (79.6 s, Overall pass); test `flock /tmp/g-inga-test.lock mise run test`: 332 pass, 0 fail, exit 0 (100.4 s). Earlier contention failure (fail, 120 s timeout, 2 runs) kept in Checkpoint history |
| B2 | `omp plugin marketplace list` (default profile) before the task | pass | f678867 | `No marketplaces configured` / `Add one with: omp plugin marketplace add <source>` (exit 0; taken under /tmp/g-inga-omp-probe.lock, released) |
| AC1 | `omp config get` for both keys | pass | d24dc6c | `omp config get skills.enableClaudeProject` = `false`; `skills.enableAgentsProject` = `false`; `disabledProviders` = `["opencode"]` (run from the repository root) |
| AC2 | `omp --profile g-inga-check read skill://work` without the plugin | pass | d24dc6c | `Unknown skill: work`; `Available: diagnose-crash, omarchy` (none of work, drive, orchestrate, sharpen, validator-flow) |
| AC3 | the same read with the plugin installed in the isolated profile | pass | d24dc6c | `marketplace add "$PWD"` and `install g-inga@g-inga` (0.0.0) exit 0; first line `[Skill file: /home/shibuka/.omp/profiles/g-inga-check/plugins/cache/plugins/g-inga___g-inga___0.0.0/.claude/skills/work/SKILL.md]`; `skill://does-not-exist` lists `diagnose-crash, drive, omarchy, orchestrate, sharpen, validator-flow, work`; no `agents/` entry |
| AC4 | profile removed; default marketplace list unchanged | pass | d24dc6c | `rm -rf ~/.omp/profiles/g-inga-check` (exit 0, directory gone); default `omp plugin marketplace list` = `No marketplaces configured` / `Add one with: omp plugin marketplace add <source>`, equal to B2; probe lock released |
| AC5 | `mise run validate` and `mise run test` | pass | d24dc6c | validate exit 0 (Overall pass, 72.6 s); `flock /tmp/g-inga-test.lock mise run test`: 332 pass, 0 fail, exit 0 (85.0 s) |
| V1 | diff read against AC1–AC5 and the out-of-scope list | pass | d24dc6c | `git diff de588c3 d24dc6c`: only `.omp/config.yml` (new, 7 lines) and this record; no changes to `.claude-plugin/`, `.claude/settings.json`, `commands/`, hooks, agents or docs |

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

- as of: 2026-10-16, branch work/2026-10-16-omp-host-compat-01-plugin-channel, implementation commit d24dc6c (verified_at); final record commit is the branch HEAD
- history: B1 failed at f678867 under CPU contention from 5 parallel workers. The full `mise run test` timed out the test "every layer applies" at 120000 ms on two runs (161 s, 150 s); a solo rerun passed (112.08 s). The quiet-machine re-run at f678867 passed (see B1).
- done: B1 and B2 pass; `.omp/config.yml` committed (d24dc6c); AC1-AC5 and V1 pass at d24dc6c; isolated profile removed.
- next: none for this task; owner review and PR merge.

## Outcome

- `.omp/config.yml` sets `skills.enableClaudeProject: false`, `skills.enableAgentsProject: false` and `disabledProviders: [opencode]`. In this repository OMP reads the G-Ingá skills only from the `g-inga@g-inga` plugin: without the plugin `skill://work` is unknown, and with the plugin in the isolated profile it resolves to the plugin cache.
- The default OMP profile was not changed (marketplace list equals B2). The plugin was installed only in the `g-inga-check` profile, which was removed.
- Observed, not a G-Ingá issue: `skill://does-not-exist` also lists `diagnose-crash` and `omarchy` (non-G-Ingá skills available in that profile). No `agents/` entries appear.
- Out of scope items were not touched. `.claude/settings.json` was left unchanged as the record requires.
