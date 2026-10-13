# G-Ingá

A personal, incrementally built agentic SDLC harness for Claude Code that emphasizes **tokens per verified task** and deterministic quality gates. The project name blends *ginga* (adaptability and fluid movement) with Ingá and Maringá, Paraná, Brazil (see [brand notes](docs/brand-and-roadmap.md), `proposed`).

## Problem

Autonomous AI coding agents frequently suffer from unpredictable autonomy, ceremony mismatch (over-engineering trivial edits or under-verifying risky structural changes), silent context drift across multi-turn sessions, unverified completion claims ("build passed" reported as proof of correctness), and high fixed context overhead from community skill packs.

G-Ingá solves this with:

1. **A single entry skill (`/work`)** featuring progressive disclosure across three ceremony tiers (`light`, `standard`, `heavy`);
2. **Zero ceremony overhead** and zero persisted files for trivial, local, reversible tasks (`light` tier);
3. **Deterministic artifact contracts** (`tasks/<id>.md`, `specs/<id>.md`) for complex work (`standard`, `heavy`);
4. **Self-contained pinned bundle distribution** (`.claude/skills/work/`, `tools/validate/`, `manifest.json`) with offline validation in local sessions and CI merge gates.

## Current Project Status

- **Status:** **V1 implemented.** The V1 child tasks (`tasks/2026-10-11-minimal-v1-specification-01..05-*.md`) are `verified` and the parent task is `accepted`; the pinned bundle (`.claude/skills/work/`, `.agents/skills/work/`, `tools/validate/`, `manifest.json` release `1.0.0`) is in the repository.
- **Approved Specification:** The [Minimal V1 Specification](specs/2026-10-11-minimal-v1-specification.md) (`spec/1`, `approved_version: 1`, hash `sha256:09ff9d3d15f71c9ee832e401edea5c833064c64a317457121b8f6f4f64bc5bab`) is frozen and approved.
- **Architectural Decisions Settled:**
  - Product boundary: Personal SDLC harness first ([ADR 0001](docs/decisions/0001-product-boundary.md)).
  - Ceremony tiers & routing rules ([ADR 0002](docs/decisions/0002-ceremony-tiers-and-routing.md)).
  - Artifact schemas and state machine contracts ([ADR 0003](docs/decisions/0003-minimum-artifact-schemas.md), [artifact contracts](docs/artifact-contracts.md)).
  - Reuse & coexistence strategy ([ADR 0004](docs/decisions/0004-reuse-strategy-for-existing-skills.md)).
  - Native primitive mapping and pinned bundle distribution ([ADR 0005](docs/decisions/0005-native-primitive-mapping.md)).
  - Usage & token observability ([ADR 0006](docs/decisions/0006-usage-observability.md)).
  - Evaluation protocol for exploratory pilot ([D7 Evaluation Protocol](docs/research/d7-evaluation-protocol.md)).
- **What Remains Open / Proposed:**
  - The `/orchestrate` and `/drive` skills (`.claude/skills/`, `.agents/skills/`) exist beyond the V1 spec; their governance decision is pending.

> [!NOTE]
> Implementation status is distinct from repository validation tooling: the repository development checks (`mise run validate`, `mise run test`) are fully functional and pass, validating documentation, contracts, and the product bundle.

## Documentation Index & Reading Order

For someone starting a new session or exploring the repository, follow this order:

1. **Orientation:** Read this `README.md` and [CLAUDE.md](CLAUDE.md).
2. **Documentation Map:** Consult [docs/README.md](docs/README.md) for a categorized index of all repository documents.
3. **Architecture:** Read [docs/decision-map.md](docs/decision-map.md) and accepted ADRs in [docs/decisions/](docs/decisions/).
4. **Contracts & Specifications:** Read [docs/artifact-contracts.md](docs/artifact-contracts.md) and [Minimal V1 Specification](specs/2026-10-11-minimal-v1-specification.md).
5. **Active Tasks:** Inspect active task records in [tasks/](tasks/).

## Install as a Claude Code Plugin

This repository is also a single-plugin marketplace ([`.claude-plugin/`](.claude-plugin/)). The `g-inga` plugin loads the skills under `.claude/skills/` (`work`, `drive`, `orchestrate`), namespaced as `/g-inga:<skill>`:

```sh
claude plugin marketplace add EduardoShibukawa/G-Inga
claude plugin install g-inga@g-inga
```

Inside a session, `/plugin install g-inga --marketplace EduardoShibukawa/G-Inga` does both in one step. The plugin is a personal convenience channel: the pinned bundle stays the distribution for target repositories and CI ([ADR 0005](docs/decisions/0005-native-primitive-mapping.md)). The manifest sets no `version`, so updates follow the repository's commits.

## Repository Validation and Development Setup

Install [mise](https://mise.jdx.dev/installing-mise.html) and Git, then from the repository root:

```sh
mise install        # installs pinned Bun
mise run validate   # runs all deterministic checks (markdown-lint, links, mermaid, artifact contracts)
mise run test       # type-checks and tests the validators and the product bundle
```

Additional commands (such as `mise run validate:external` for network checks) and troubleshooting guides are detailed in [docs/development.md](docs/development.md).
