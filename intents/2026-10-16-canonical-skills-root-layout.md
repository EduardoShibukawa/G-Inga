---
schema: intent/1
status: approved
---

# Canonical skills root layout migration

## Problem

Skills are currently duplicated across `.claude/skills/` (for Claude Code) and `.agents/skills/` (for Google Antigravity), while `.opencode/skills/` and `packages/opencode-plugin/` rely on separate symlinks or paths. Changes made to one skill tree (such as model policies, session checkpointing, and verification procedures) require manual mirroring across hosts, leading to parity drift, maintenance overhead, and inconsistencies across execution environments.

## Outcome

A single canonical `skills/` directory at the repository root housing all harness skills (`drive`, `orchestrate`, `sharpen`, `validator-flow`, `work`), serving Claude Code, Google Antigravity, and OpenCode via symlinks (`.claude/skills`, `.agents/skills`, `.opencode/skills`) or plugin manifests/adapters without code duplication, while preserving full host compatibility and passing all verification checks.

## Affected users/systems

- Host environments: Claude Code (`.claude/skills/`), Google Antigravity (`.agents/skills/`), and OpenCode (`.opencode/skills/`, `packages/opencode-plugin/`).
- Harness skills: `work`, `drive`, `orchestrate`, `sharpen`, `validator-flow`.
- Packaging and verification tooling: `manifest.json`, `tools/validate/bundle.json`, `tools/validate/artifacts/checks.ts`, and repository link checkers.
- Agents and maintainers authoring or executing tasks across multi-host environments.

## Constraints

- Zero functional regression: all existing skills must continue to execute identically in Claude Code, Google Antigravity, and OpenCode.
- Host compatibility: Claude Code, Antigravity, and OpenCode must resolve skills seamlessly without requiring proprietary alterations in external tooling.
- Deterministic checks: `bun run validate` and `bun test` must pass (including link resolution, bundle parity, and artifact checks).
- No code duplication: the canonical source of truth for each skill must exist solely in root `skills/`.

## Open questions

None.

## Original prompt

> Unify `.claude/skills/` and `.agents/skills/` into a single canonical `skills/` root directory in the repository. Distribute skills cleanly to Claude Code, Google Antigravity, and OpenCode via symlinks or plugin manifests without duplicating code or creating drift across host environments, ensuring all validation gates and tests pass.
