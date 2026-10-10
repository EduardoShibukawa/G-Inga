# Development

**Status:** repository tooling, not the G-Ingá product. It validates this repository's documents and the D3 contract on fixtures. It doesn't decide how the product runs its own validator (D5).

## Setup

The toolchain is [mise](https://mise.jdx.dev/) plus [Bun](https://bun.sh/). Node.js, npm, pnpm and Yarn aren't used.

| File | Pins |
|---|---|
| `mise.toml` | Bun version and the `mise run` tasks. `locked = true`: mise installs only what `mise.lock` pins |
| `mise.lock` | Bun download URL and checksum per platform |
| `package.json`, `bun.lock` | development dependencies, installed with `bun install --frozen-lockfile` |

Mermaid diagrams are rendered in a headless Chromium or Chrome, which mise doesn't manage. The validator looks for `MERMAID_BROWSER` (or `PUPPETEER_EXECUTABLE_PATH`), then `PLAYWRIGHT_BROWSERS_PATH`, then the usual system paths. Without a browser the Mermaid check is `blocked`, never `pass`. Bun trusts Puppeteer's install script by default, which would download about 670 MB of Chrome; `.puppeteerrc.json` (`skipDownload: true`) turns that off for every `bun install`.

## Commands

```sh
mise install                 # Bun, as pinned in mise.lock
mise run validate            # every required deterministic check
mise run test                # type-check and test the validators
mise run validate:external   # external URL availability (network)
```

`mise run validate` runs `bun install --frozen-lockfile` first, then `bun run validate`. With dependencies already installed, `bun run validate` is the direct equivalent. CI runs `mise run test` and `mise run validate` in `.github/workflows/validate.yml`.

Exit codes: `0` every check passed or was `not run`; `1` a check failed; `2` nothing failed but a check was `blocked`.

No check edits a document. A failure is fixed in the document or, if the rule is wrong, in the validator, never by the validator.

## Checks

| Check | What it proves | Source of the rule |
|---|---|---|
| `markdown-lint` | markdownlint with `.markdownlint.jsonc` (line length and table pipe style off). `docs/briefs/` isn't style-linted: briefs are kept as received | markdownlint defaults |
| `local-links` | Relative links and images resolve inside the repository, `#anchors` match a heading, `[doc](x.md) §N` and `ADR NNNN §N` match a numbered heading or ADR decision item, `ADR NNNN` exists. Links in code are ignored. No network | — |
| `mermaid` | Every `mermaid` block renders to SVG with `@mermaid-js/mermaid-cli` | — |
| `decision-records` | ADR H1, Status, Date and Deciders lines; statuses in the decision map's vocabulary; map rows agree with their ADRs and with the map diagram; a document whose Status cites "decision Dn" agrees with the map | [decision map](decision-map.md) |
| `d3-contract` | `tools/validate/d3/transitions.json` has ADR 0003's status and the same edges as the §3.3 state diagram | [artifact contracts](artifact-contracts.md) |
| `d3-examples` | The §9 example records satisfy the contract's state rules | artifact contracts §9 |
| `d3-fixtures` | The §7.2 test table and review cases give the expected `pass`, `fail`, `blocked` or `frozen` | artifact contracts §7.2 |
| `d3-records` | Real `tasks/` and `specs/`, with the Git history walk. `not run` while the repository has none | artifact contracts §7.1 |
| `external-links` | `not run` in `validate`. `validate:external` reports 404 and 410 as `fail`, and network errors, 401, 403, 429 and 5xx as `blocked` | — |

## D3 checks

The D3 checks encode the [artifact contracts](artifact-contracts.md) as they are. `transitions.json` is a copy of the §3.3 state machine for the script, not a second source of truth: `d3-contract` fails when the two drift. The diagram stays hand-written, because its labels carry the guards in prose.

Where the contract is ambiguous, the validator reports `blocked` with the conflicting sections instead of picking a meaning. Known cases are listed in [D3 validator findings](research/d3-validator-findings.md).

The validator is a development check of the contract. It isn't the product's artifact validator, whose mechanism is D5's call.
