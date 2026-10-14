---
schema: task/1
tier: standard
status: completed
---

# Make the Repository Installable as an OpenCode Plugin Package

## Routing and approvals

- tier: standard (additive distribution surface beside the ADR 0005 pinned bundle and the Claude Code marketplace; no spec, no ADR change, no bundle change, so S1–S4 hold with nothing to clear)
- approved: owner request (2026-10-14, "vamos criar isso entao por favor"; "Só as skills globais"; "Plugin instalável global (via GitHub)")

## Objective

`opencode plugin list` shows no G-Ingá plugin and there are no `/work`, `/drive`, `/orchestrate` slash commands, because the previous tasks only built a Claude Code plugin (`.claude-plugin/`, which OpenCode never reads) and project skill symlinks. Make the repository an installable OpenCode plugin package, and remove the global skills now that plugins are the delivery mechanism.

- In scope:
  - `packages/opencode-plugin/index.ts` (dependency-free plugin entry)
  - `packages/opencode-plugin/package.json`
  - root `package.json` `exports` (entry pointer only; no dependency changes)
  - `README.md` OpenCode install section
  - global skill removal (`~/.opencode/skill`, `~/.claude/skills/synced`, `~/.claude/skills/.trash`) with backup; herdr plugins and OpenCode config stay
  - `tasks/2026-10-14-opencode-plugin-package.md`
- Out of scope:
  - `.claude/skills/`, `.agents/skills/`, `manifest.json` and the pinned bundle (untouched; the plugin reads the canonical skills, it does not move them)
  - Approved specs, spec hashes, ADRs and the decision map
  - Plugin `version` pinning, release tags, merge to `main` and the owner install check from GitHub (follow-ups)

## Acceptance criteria

- AC1: the plugin entry default-exports `{ id: "g-inga", setup }`, registers skills `work`, `drive`, `orchestrate` from the repository `.claude/skills/` (skipping ids a project already provides) and registers commands `work`, `drive`, `orchestrate` that submit through `session.prompt` with the session and delivery preserved.
- AC2: `packages/opencode-plugin/package.json` names the package with `exports` pointing at `./index.ts` and zero dependencies.
- AC3: root `package.json` only gains `exports`; `bun.lock` and `devDependencies` are unchanged.
- AC4: with the package directory in the global `plugin` array, `g-inga` is `active`, `/api/command` lists `work`, `drive`, `orchestrate`, and after the global cleanup `/api/skill` serves them from the plugin path.
- AC5: `README.md` gives the `opencode plugin add github:EduardoShibukawa/G-Inga` command.
- AC6: the global skill sources are gone, a backup tarball exists, and the herdr plugins plus OpenCode config are intact.
- AC7: `mise run validate` and `mise run test` show no new failures against the baseline.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline `mise run validate` on clean `c5c164f` | pass | c5c164f | worktree without untracked files; Overall pass (markdown-lint 112 files, local-links 1028 refs, mermaid 54/54, decision-records, artifact checks) |
| AC1 | plugin `setup` against a stub context (`bun run /tmp/opencode/plugin-test.ts`) | pass | 00861b0 | `id: g-inga`; skills work (autoinvoke true, 5199 B), drive, orchestrate from `.claude/skills/`; commands work, drive, orchestrate; `execute` preserves sessionID/delivery and prefixes the skill prompt |
| AC2 | `packages/opencode-plugin/package.json` fields | pass | 00861b0 | `name: g-inga-opencode-plugin`, `private`, `type: module`, `exports: {".": "./index.ts"}`, zero dependencies |
| AC3 | root `package.json` diff; lockfile untouched | pass | 00861b0 | diff c5c164f..00861b0 touches only `description` + `exports`; `bun.lock` absent from the diff; `bun install --frozen-lockfile` runs clean inside `mise run validate` |
| AC4 | live registration: `/api/plugin`, `/api/command`, `/api/skill` | pass | 00861b0 | `g-inga` `active` (local path); commands `work`, `drive`, `orchestrate` (`G-Ingá: …`); skills served from `/home/tg/Projetos/G-Inga/.claude/skills/…` with work autoinvoke true, drive/orchestrate false |
| AC5 | README install section | pass | 00861b0 | `opencode plugin add github:EduardoShibukawa/G-Inga` at README.md:60, tracking the default branch |
| AC6 | global skill removal, backup, herdr intact | pass | 00861b0 | `~/.opencode/skill`, `~/.claude/skills/synced`, `~/.claude/skills/.trash` removed; backup `~/.local/share/opencode/global-skills-backup-2026-10-14.tar.gz` (360 entries); `herdr-agent-state.js`, `herdr-opencode/tui.js`, `cli.json`, `tui.jsonc` untouched |
| AC7 | `mise run validate` and `mise run test` | fail | 00861b0 | validate: fails only outside this change — (a) the unrelated untracked `tasks/2026-10-13-cursor-host-bundle.md` (§7: its spec file is absent from the tree) and (b) the git-ignored `.claude/worktrees/backlog-seed-tasks-e38dc9/` populated by another parallel session (the validator scans it; all 34 markdown-lint issues and local-links failures are in there). Every check covering this change passes. test: 227 pass, 1 fail — the single fail is the `this repository` meta-test asserting validate exit code, same root causes |
| V1 | diff read against AC1–AC7 and the out-of-scope list | pass | 00861b0 | 5 files, 246 insertions, 1 deletion; no change under `.claude/skills/`, `.agents/`, `manifest.json`, `specs/`, `docs/decisions/` |

## Outcome

The repository is an installable OpenCode plugin package and the global skills are gone. `g-inga` loads `active` with `/work`, `/drive`, `/orchestrate` and the three skills served from the plugin. AC1–AC6 and V1 pass. AC7 fails only outside this change: the unrelated untracked cursor-host-bundle task (missing spec file) and another parallel session's git-ignored worktree (`.claude/worktrees/backlog-seed-tasks-e38dc9/`), both of which the validator scans; everything this change owns passes.

Follow-ups (not done):

- Merge to `main` (via PR) so `opencode plugin add github:EduardoShibukawa/G-Inga` resolves; until then the global install points at the local checkout directory.
- Owner install check from GitHub after merge.
- Re-run `mise run validate` once the cursor-host-bundle spec situation is resolved; then this record can move to `verified`.
- Record the OpenCode plugin channel in ADR 0005 / the decision map if it becomes more than a personal convenience (same standing as the Claude Code marketplace channel).

## Checkpoint

- as of: 2026-10-14, branch feat/opencode-plugin-package, head 00861b0, task completed
- done: plugin entry, package manifests, root exports, README section, global cleanup with backup, AC1–AC6 and V1 pass
- next: owner review, PR and merge; re-run validate after the unrelated cursor spec is resolved
