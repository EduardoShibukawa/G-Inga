---
schema: intent/1
status: draft
---

# Local telemetry dashboard exporter

## Problem

Usage telemetry in G-Ingá is systematically logged to `records/usage-ledger.tsv` following ADR 0006. While `tools/eval/aggregate_usage.ts` produces terminal outputs and summary Markdown tables, engineers lack an immediate, zero-dependency visual interface to inspect token consumption trends, cache hit ratio dynamics across hosts (Claude Code, Google Antigravity, OpenCode), cost trajectories, and quality scores over time without configuring heavy external observability infrastructure (e.g. Grafana servers, remote collectors).

## Outcome

A lightweight, local-first dashboard generator (`tools/eval/export_dashboard.ts`) that parses `records/usage-ledger.tsv` and produces a standalone, self-contained HTML/SVG visual report. The report can be opened directly in any browser offline, displaying:

1. Aggregate token consumption over time (input, output, and cache read tokens).
2. Cache hit ratio progression per host and condition (with vs without skills).
3. Quality score distributions and weekly LLM-as-a-judge quality blending.
4. Per-task and per-model efficiency summaries.

## Affected users/systems

- Engineers and harness architects inspecting local agentic performance and prompt cache efficiency.
- Telemetry records in `records/usage-ledger.tsv`.
- Evaluation tooling under `tools/eval/`.

## Constraints

- Local-first and hermetic: zero external dependencies, no remote telemetry servers, no external CDN assets or remote scripts.
- Robust TSV parsing: strictly adheres to the 18-column TSV schema defined in ADR 0006, gracefully handling placeholder values (`-`, `unsupported`, `absent`, `derived`).
- Self-contained output: standalone HTML file containing embedded SVG charts and responsive CSS for viewing in offline environments.
- Deterministic checks: `bun run validate` and `bun test` pass with 0 errors.

## Open questions

None.

## Original prompt

> Implement a local-first telemetry dashboard exporter that parses `records/usage-ledger.tsv` and generates a clean, self-contained HTML/SVG visualizer of token trends, cache ratios, and quality scores over time without requiring external telemetry infrastructure.
