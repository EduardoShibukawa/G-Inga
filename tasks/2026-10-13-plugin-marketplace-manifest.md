---
schema: task/1
tier: standard
status: verified
verified_at: "63e6aa4"
---

# Make the Repository Installable as a Claude Code Plugin Marketplace

## Routing and approvals

- tier: heavy (H3: distribution channel beside the ADR 0005 pinned bundle; spec non-goal "Plugin packaging, marketplace distribution" (E5))
- confirmed: heavy by owner (2026-10-13, "Confirmar heavy (Recomendado)")
- override: owner ordered standard; risk: plugin channel added outside the V1 spec scope without an ADR amendment, so it must stay additive and leave the pinned bundle untouched
- approved: owner request (2026-10-13, "mas so um ponto adicionar como plugin via REPO, olhe as docs por favor")

## Objective

`claude plugin marketplace add EduardoShibukawa/G-Inga` fails with "no manifest found at .claude-plugin/marketplace.json". Make the repository a single-plugin marketplace, as the Claude Code docs describe (code.claude.com/docs/en/plugins/marketplace-reference, plugins/manifest-reference): the marketplace entry points at the repository root (`"source": "./"`), and the plugin manifest adds `./.claude/skills/` to the skill scan, so no file moves.

- In scope:
  - `.claude-plugin/marketplace.json`
  - `.claude-plugin/plugin.json`
  - `README.md` install section
  - `tasks/2026-10-13-plugin-marketplace-manifest.md`
- Out of scope:
  - `.claude/skills/`, `.agents/skills/`, `manifest.json` and the pinned bundle.
  - Approved specs, spec hashes, ADRs and the decision map.
  - Plugin `version` pinning, release tags, and Anthropic directory submission.

## Acceptance criteria

- AC1: `.claude-plugin/marketplace.json` names marketplace `g-inga` with one entry `g-inga` whose `source` is `./`.
- AC2: `.claude-plugin/plugin.json` names plugin `g-inga` and lists `./.claude/skills/` under `skills`.
- AC3: `claude plugin validate .` reports `Validation passed` (warnings allowed: no `version`, by design; `CLAUDE.md` at the plugin root).
- AC4: Loading the repository as a plugin shows the skills `work`, `drive` and `orchestrate`.
- AC5: `README.md` gives the marketplace add and install commands.
- AC6: `mise run validate` and `mise run test` pass.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validate and test | pass | 075ac8b | `mise run validate` Overall pass; `mise run test` 227 pass, 0 fail |
| AC1 | marketplace manifest fields | pass | 63e6aa4 | `name: g-inga`, one entry `g-inga`, `source: ./` |
| AC2 | plugin manifest fields | pass | 63e6aa4 | `name: g-inga`, `skills: ["./.claude/skills/"]` |
| AC3 | `claude plugin validate .` | pass | 63e6aa4 | `Validation passed with warnings`: no `version` (by design), `CLAUDE.md` at plugin root |
| AC4 | `claude --plugin-dir . plugin details g-inga` | pass | 63e6aa4 | `Skills (3) drive, orchestrate, work`; ~154 tok always-on |
| AC5 | README install section | pass | 63e6aa4 | `marketplace add`, `install g-inga@g-inga`, one-step `/plugin install` line |
| AC6 | validate and test | pass | 63e6aa4 | `mise run validate` Overall pass; `mise run test` 227 pass, 0 fail |
| V1 | diff read against AC1-AC5 and the out-of-scope list | pass | 63e6aa4 | 4 files, 87 insertions; no change under `.claude/skills/`, `.agents/`, `manifest.json`, `specs/`, `docs/decisions/` |

## Outcome

The repository is a single-plugin marketplace. `claude plugin marketplace add EduardoShibukawa/G-Inga` then `claude plugin install g-inga@g-inga` installs the `g-inga` plugin, which loads `/g-inga:work`, `/g-inga:drive` and `/g-inga:orchestrate` from `.claude/skills/`. The pinned bundle and the V1 spec are unchanged.

Follow-ups (not done):

- Record the plugin channel in ADR 0005 / the decision map if it becomes more than a personal convenience.
- Inside this repository, the project skills and the plugin skills both load when the plugin is enabled (namespaced, no collision, ~154 tok extra); disable the plugin per repository if that cost matters.
- Install from GitHub is not run until this branch reaches `main` (the marketplace clones the default branch).

## Checkpoint

- as of: 2026-10-13, branch feat/plugin-marketplace-manifest, head 63e6aa4, task verified
- done: marketplace and plugin manifests, README install section, AC1-AC6 and V1 pass
- next: owner review and PR merge; then run `claude plugin marketplace add EduardoShibukawa/G-Inga`
