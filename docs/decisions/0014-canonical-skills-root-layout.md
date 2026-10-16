# 0014 — Canonical skills root layout migration

- **Status:** accepted (accepted by project owner 2026-10-16)
- **Date:** 2026-10-16
- **Deciders:** project owner

## Context

Skills are currently duplicated across `.claude/skills/` (for Claude Code) and `.agents/skills/` (for Google Antigravity), while `.opencode/skills/` and `packages/opencode-plugin/` rely on separate symlinks or paths. Changes made to one skill tree (such as model policies, session checkpointing, and verification procedures) require manual mirroring across hosts, leading to parity drift, maintenance overhead, and inconsistencies across execution environments.

ADR 0005 FU2 established project-local copies committed under dedicated bundle directories (`.claude/skills/work/`, etc.), while ADR 0005 FU7 established a personal plugin channel reading `.claude/skills/`.

## Decision

Amending ADR 0005 (FU2, FU7):

1. Establish a single canonical `skills/` root directory in the repository housing all harness skills (`drive`, `orchestrate`, `sharpen`, `validator-flow`, `work`).
2. Serve host-specific environments (Claude Code, Google Antigravity, OpenCode) through symlinks (`.claude/skills`, `.agents/skills`, `.opencode/skills`) pointing to the root `skills/` directory or canonical skills.
3. Update `.claude-plugin/plugin.json` to source skills from `./skills/`, eliminating duplicate skill scans.
4. Update bundle packaging and contract copy tools (`tools/validate/bundle.json`, `tools/validate/contract-copy.mjs`) to treat root `skills/` as the sole canonical source of truth.
5. Update benchmark contamination checks (`tools/eval/ab_runner.ts`) to verify absence of root `skills/` alongside `.claude/skills` and `.agents/skills` during baseline runs.

## Considered options

- Retain separate `.claude/skills/` and `.agents/skills/` directories with an automated synchronization script: rejected, still duplicates files and risks hidden drift or conflicting edits.
- Move skills to `.claude/skills/` and symlink `.agents/skills/`: rejected, treats one host as privileged and causes asymmetric path conventions.
- Unify under root `skills/` with symlinks for host directories: accepted, provides neutral, clean architecture with zero code duplication and full multi-host compatibility.

## Consequences

- All harness skills are edited exclusively under `skills/`.
- Claude Code, Antigravity, and OpenCode load identical skill definitions without drift.
- Link prefixes in contract copies adjust to depth 3 (`../../../docs/`).
- Markdown discovery in the validator skips duplicate symlinks to avoid duplicate lints or false link resolution errors.
