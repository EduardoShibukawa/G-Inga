# Documentation Map

Navigation index for G-Ingá repository documentation, architectural decisions, specifications, task records, and tooling.

## 1. Getting Started & Principles

- [README.md](../README.md): Repository entry point, problem statement, current status, and quickstart.
- [CLAUDE.md](../CLAUDE.md): Session operating instructions for AI agents working in this repository.
- [docs/principles.md](principles.md): Core operating principles (token frugality, deterministic gates, provenance).
- [docs/brand-and-roadmap.md](brand-and-roadmap.md): Naming, brand narrative, and milestone roadmap (`proposed`).
- [docs/friction-log.md](friction-log.md): Logged friction points driving harness evolution.

## 2. Architecture & Decisions

- [docs/decision-map.md](decision-map.md): Map of architectural decisions (D1–D7), dependencies, and current statuses.
- [ADR 0001: Product boundary](decisions/0001-product-boundary.md) (`accepted`): Personal SDLC harness first; context map deferred.
- [ADR 0002: Ceremony tiers and routing](decisions/0002-ceremony-tiers-and-routing.md) (`accepted`): `light`, `standard`, and `heavy` tier definitions and routing invariants.
- [ADR 0003: Minimum artifact schemas](decisions/0003-minimum-artifact-schemas.md) (`accepted`): Minimal contracts for task, spec, checkpoint, and evidence records.
- [ADR 0004: Reuse strategy for existing skills](decisions/0004-reuse-strategy-for-existing-skills.md) (`accepted`): Transitional coexistence with upstream plugins without runtime dependencies.
- [ADR 0005: Native primitive mapping](decisions/0005-native-primitive-mapping.md) (`accepted`): Primitive mapping, pinned bundle distribution architecture (Alternative A), co-located validator, and CI merge gating.
- [ADR 0006: Usage observability](decisions/0006-usage-observability.md) (`proposed`): OpenTelemetry and local usage observation signals (exploratory, non-blocking for V1 core).

## 3. Contracts & Specifications

- [docs/artifact-contracts.md](artifact-contracts.md) (`accepted`): Field-level schema contracts for `task/1` and `spec/1`, state machines, transition guards, and verification rules.
- [specs/2026-10-11-minimal-v1-specification.md](../specs/2026-10-11-minimal-v1-specification.md) (`approved`): The approved Minimal V1 Specification for the G-Ingá SDLC harness (`approved_version: 1`, hash `sha256:09ff9d3d15f71c9ee832e401edea5c833064c64a317457121b8f6f4f64bc5bab`).

## 4. Active Work & Task Records

- [tasks/2026-10-11-minimal-v1-specification.md](../tasks/2026-10-11-minimal-v1-specification.md) (`active`): Parent governance task for minimal V1 specification and SDLC harness governance.
- [tasks/2026-10-11-repo-first-operating-model.md](../tasks/2026-10-11-repo-first-operating-model.md) (`active`): Active governance task establishing the repository-first operating model, status reconciliation, and validator coexistence architecture.

## 5. Research & Sources

- [docs/briefs/sdlc-harness-brief.md](briefs/sdlc-harness-brief.md): Original prompt brief for the SDLC harness (background input).
- [docs/research/d2-routing-evidence.md](research/d2-routing-evidence.md): Evidence and evaluation for ceremony tiers and routing.
- [docs/research/d3-artifact-evidence.md](research/d3-artifact-evidence.md): Evidence for artifact schemas and state transitions.
- [docs/research/d4-observability-evidence.md](research/d4-observability-evidence.md): Evidence on local CLI observability signals.
- [docs/research/d5-native-primitive-evidence.md](research/d5-native-primitive-evidence.md): Evidence on Claude Code primitives and delivery channels.
- [docs/research/d6-reuse-evidence.md](research/d6-reuse-evidence.md): Evidence on upstream skill reuse and context costs.
- [docs/research/d7-evaluation-protocol.md](research/d7-evaluation-protocol.md) (`accepted`): Evaluation protocol and exploratory pilot on real tasks.
- [docs/research/artifact-contract-validator-findings.md](research/artifact-contract-validator-findings.md): Known validator findings (F1–F14) and contract review cases.

## 6. Repository Development Tooling

- [docs/bundle.md](bundle.md): Product bundle contents, manifest `commit` semantics, target adoption and the failure-atomic update procedure.
- [docs/development.md](development.md): Toolchain setup (`mise`, Bun), repository validation commands (`mise run validate`, `mise run test`), check layers, and troubleshooting.
