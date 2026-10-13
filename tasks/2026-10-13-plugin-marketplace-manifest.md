---
schema: task/1
tier: standard
status: active
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
| AC1 | marketplace manifest fields | not run | | |
| AC2 | plugin manifest fields | not run | | |
| AC3 | `claude plugin validate .` | not run | | |
| AC4 | `claude --plugin-dir . plugin details g-inga` | not run | | |
| AC5 | README install section | not run | | |
| AC6 | validate and test | not run | | |
| V1 | diff read against AC1-AC5 and the out-of-scope list | not run | | |
