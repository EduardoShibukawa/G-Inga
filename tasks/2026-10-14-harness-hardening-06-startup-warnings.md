---
schema: task/1
tier: standard
status: verified
verified_at: "24bec60"
parent: 2026-10-14-harness-hardening
spec: 2026-10-14-harness-hardening@1
depends_on:
  - 2026-10-14-harness-hardening-01-commit-gate
---

# Startup Warnings and Single Listing

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-14-harness-hardening after spec v1 approval)

## Objective

Ship a plugin `SessionStart` hook that warns when the plugin is stale or the Git hook is missing, and list each harness skill once in this repository.

- In scope: plugin `hooks/hooks.json`, the warning script and its tests, checked-in project settings disabling the plugin here, development docs.
- Out of scope: auto-updating the plugin; changing marketplace settings.

## Acceptance criteria

- AC1 = SC8.
- AC2 = SC9.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | 2edf21e | parent B1/B2: `mise run validate` exit 0, `mise run test` 242 pass |
| B2 | repository validation and test suites before change | pass | 7ebfbe9 | `mise run validate` exit 0 (Overall: pass); `mise run test` exit 0 (256 pass, 0 fail) |
| AC1 | SC8: SessionStart hook warns on stale plugin (24 h cache, <= 3 s cap, fail open) and missing Git pre-commit hook | pass | 24bec60 | `tools/gate/startup-warnings.test.ts` covers stale vs current plugin, 24 h cache hit without network, missing Git hook when `mise.toml` defines `pre-commit`, and unreachable remote failing open under 3 s with exit 0 |
| AC2 | SC9: `work`, `drive` and `orchestrate` listed once in this repository | pass | 24bec60 | `.claude/settings.json` sets `"enabledPlugins": { "g-inga@g-inga": false }` (project settings override user settings, N17), documented in `docs/development.md` |
| R1 | repository validation and test suites after change | pass | 24bec60 | `mise run validate` exit 0 (Overall: pass); `mise run test` exit 0 (264 pass, 0 fail) after rebase onto child 07 (1f20cdb, on `main` 48e1949); first verified at 731b82e on the pre-rebase base; `node tools/validate/validate.js` exit 0 |
| V1 | self-review of 1f20cdb..24bec60 against AC1–AC2 | pass | 24bec60 | diff confined to `hooks/hooks.json`, `hooks/session-start.mjs`, `tools/gate/startup-warnings.test.ts`, `.claude/settings.json` and `docs/development.md` |

## Plan

1. Pick the installed-commit source; write the script with a 24 h cache and a 3 s cap; fail open.
2. Tests: stale, current, missing hook, network down.
3. Disable `g-inga@g-inga` in this repository's checked-in settings; document why.

## Outcome

The plugin now ships `hooks/hooks.json` with a `SessionStart` entry invoking `hooks/session-start.mjs` (3 s timeout, fail open). On start, it reads the installed `g-inga@g-inga` commit from `~/.claude/plugins/installed_plugins.json` (falling back to `CLAUDE_PLUGIN_ROOT`) and compares it against the marketplace's `main` commit (`git ls-remote`, cached for 24 h in `${XDG_CACHE_HOME:-~/.cache}/g-inga/marketplace-main.json`), printing one warning when stale; and checks whether `mise.toml` defines a `pre-commit` task without an installed Git `pre-commit` hook, printing one warning when missing. Checked-in `.claude/settings.json` sets `"enabledPlugins": { "g-inga@g-inga": false }` so `work`, `drive` and `orchestrate` are each listed once when working in this repository (documented in `docs/development.md`).
