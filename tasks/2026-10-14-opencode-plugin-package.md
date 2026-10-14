---
schema: task/1
tier: standard
status: active
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
| B1 | baseline validate before the first edit | not run | | |
| AC1 | plugin setup against a stub context | not run | | |
| AC2 | package manifest fields | not run | | |
| AC3 | root package diff and lockfile | not run | | |
| AC4 | live plugin, command and skill registration | not run | | |
| AC5 | README install section | not run | | |
| AC6 | global removal and backup | not run | | |
| AC7 | validate and test | not run | | |
| V1 | diff read against AC1–AC7 and the out-of-scope list | not run | | |

## Outcome

Pending verification.

## Checkpoint

- as of: 2026-10-14, branch feat/opencode-plugin-package, task active
- done: plugin entry, package manifests, root exports, README section, global cleanup with backup
- next: run AC1–AC7 and V1, set verified_at, commit
