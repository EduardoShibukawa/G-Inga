---
schema: task/1
tier: standard
status: verified
verified_at: "fcd7c58"
---

# Make the Repository Installable as an Antigravity Plugin

## Routing and approvals

- tier: standard (additive personal plugin surface beside the ADR 0005 pinned bundle, the Claude Code marketplace, and the OpenCode plugin; no spec, ADR, or bundle change, so S1–S4, S6–S8 hold and S5 does not)
- approved: owner request (2026-10-16, "Quero instalar o G-Inga como plugin aqui, veja se está disponivel se nao estiver use o @[.agents/skills/work] e faça isso.")

## Objective

`agy plugin list` reports `No plugins installed.` and `agy plugin validate .` fails with `Error: missing plugin.json: stat plugin.json: no such file or directory` (while `agy plugin install .` without an Antigravity manifest falls back to the Claude Code extension importer and skips all skills). Add `.antigravity-plugin/plugin.json` pointing to `./.agents/skills/`, document the Antigravity plugin install commands in `README.md`, and install the `g-inga` plugin locally in Antigravity (`~/.gemini/config/plugins/g-inga`).

- In scope:
  - `.antigravity-plugin/plugin.json`
  - `README.md` Antigravity plugin install section
  - Local Antigravity plugin installation (`agy plugin install`)
  - `tasks/2026-10-16-antigravity-plugin-manifest.md`
- Out of scope:
  - `.claude/skills/`, `.agents/skills/`, `manifest.json`, and the pinned bundle
  - Approved specs, spec hashes, ADRs, and the decision map
  - Plugin `version` pinning and external marketplace submission

## Acceptance criteria

- AC1: `.antigravity-plugin/plugin.json` names plugin `g-inga` and lists `./.agents/skills/` under `skills`.
- AC2: `agy plugin validate .` succeeds (`[ok]`) and reports `skills : 4 processed`.
- AC3: Installing the plugin with `agy plugin install` registers `g-inga` as enabled (`source: antigravity`) in `agy plugin list --json` with the 4 skills `drive`, `orchestrate`, `sharpen`, and `work`.
- AC4: `README.md` documents the `agy plugin validate .` and `agy plugin install .` commands under `## Install as an Antigravity Plugin`.
- AC5: `mise run validate` and `mise run test` pass.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validate and test | pass | ea49f66 | `mise run validate` Overall pass; `mise run test` 274 pass, 0 fail |
| AC1 | `.antigravity-plugin/plugin.json` fields | pass | fcd7c58 | `name: g-inga`, `skills: ["./.agents/skills/"]` |
| AC2 | `agy plugin validate .` | pass | fcd7c58 | `[ok] .` — `skills : 4 processed` |
| AC3 | `agy plugin install` and `agy plugin list --json` | pass | fcd7c58 | `g-inga` enabled, `source: antigravity`, skills `drive`, `orchestrate`, `sharpen`, `work` at `~/.gemini/config/plugins/g-inga` |
| AC4 | `README.md` Antigravity install section | pass | fcd7c58 | `## Install as an Antigravity Plugin` with `agy plugin validate .` and `agy plugin install .` |
| AC5 | `mise run validate` and `mise run test` | pass | fcd7c58 | `mise run validate` Overall pass; `mise run test` 274 pass, 0 fail |
| V1 | diff read against AC1–AC5 and out-of-scope list | pass | fcd7c58 | 3 files, 71 insertions; no change under `.claude/skills/`, `.agents/`, `manifest.json`, `specs/`, `docs/decisions/` |

## Plan

skip: single-step additive manifest and documentation update followed by local plugin install and verification

## Outcome

The repository is now a valid native Antigravity plugin (`.antigravity-plugin/plugin.json` scanning `./.agents/skills/`), documented in `README.md`, and installed locally on the machine at `~/.gemini/config/plugins/g-inga` (`enabled: true`, `source: antigravity`, 4 skills: `drive`, `orchestrate`, `sharpen`, `work`). The pinned bundle and V1 spec are untouched.

## Checkpoint

- as of: 2026-10-16, branch feat/antigravity-plugin-manifest, head fcd7c58, task verified
- done: `.antigravity-plugin/plugin.json`, `README.md` install section, local `agy plugin install`, AC1–AC5 and V1 pass
- next: push branch, open PR, and merge into `main`
