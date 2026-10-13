---
schema: task/1
tier: standard
status: active
---

# Port the `/orchestrate` Skill to Claude Code

## Routing and approvals

- tier: standard (S1 holds: parity with the Antigravity skill is checkable file by file; S2 holds: follows the existing multi-host skill layout used by `/work` and `/drive`; S3 holds: bounded to `.claude/skills/`, `docs/README.md`, and `tasks/`; S4 holds: two-way door)
- approved: owner request (2026-10-13, "Use o /orchestrate para implementar tudo que temos no agy para o Claude")

## Objective

Bring every skill that exists for Antigravity (`.agents/skills/`) to Claude Code (`.claude/skills/`). The audit at bd7a882 shows `/work` and `/drive` already exist on both hosts; `/orchestrate` exists only under `.agents/skills/orchestrate/`, and `.claude/skills/drive/SKILL.md` links across hosts into it.

1. Create `.claude/skills/orchestrate/` (`SKILL.md`, `gate.md`, `subagent-prompt.md`, `references/ooda-cycle.md`) with the same invariants, OODA loop, 5-layer gate, and tooling (`tools/gate/*`, `tools/eval/token_budget_guard.ts`).
2. Translate Antigravity primitives to Claude Code ones: `invoke_subagent` to the `Agent` tool, `TypeName` to `subagent_type`, `Workspace` to `isolation: "worktree"`, and Antigravity wakeups to background-agent completion notifications.
3. Point `.claude/skills/drive/SKILL.md` at the Claude Code copy of `/orchestrate`.
4. List the skill bundles per host in `docs/README.md`.

- In scope:
  - `.claude/skills/orchestrate/SKILL.md`
  - `.claude/skills/orchestrate/gate.md`
  - `.claude/skills/orchestrate/subagent-prompt.md`
  - `.claude/skills/orchestrate/references/ooda-cycle.md`
  - `.claude/skills/drive/SKILL.md`
  - `docs/README.md`
  - `tasks/2026-10-13-port-orchestrate-skill-to-claude-code.md`
- Out of scope:
  - `.agents/skills/` (the Antigravity source stays unchanged).
  - `manifest.json` and the pinned `/work` bundle; approved specs, spec hashes, and ADRs.
  - Behavior changes to `tools/gate/` or `tools/eval/`.

## Acceptance criteria

- AC1: `.claude/skills/orchestrate/` holds `SKILL.md`, `gate.md`, `subagent-prompt.md`, and `references/ooda-cycle.md`; `SKILL.md` frontmatter has `name: orchestrate` and the same description as the Antigravity skill.
- AC2: The Claude Code copy keeps the 5 invariants, the 6-step OODA loop, the 5 gate layers, the 4-value vocabulary, and the 2-attempt circuit breaker of the Antigravity skill.
- AC3: The Claude Code copy names no Antigravity-only primitive (`invoke_subagent`, `TypeName`, `Workspace`, Antigravity wakeups) and uses the `Agent` tool equivalents instead.
- AC4: `.claude/skills/drive/SKILL.md` links to `.claude/skills/orchestrate/` and no longer links into `.agents/`.
- AC5: `docs/README.md` lists the skill bundles for both hosts.
- AC6: `mise run validate` and `mise run test` pass.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validate and test | pass | bd7a8824588fb2a004a0acd223cd0b4b08f2512e | `bun run validate` pass after `git fetch --unshallow` (mise not installed; same Bun 1.4.2 pin); `bun run typecheck` pass; `bun run test` 220 pass, 0 fail |

## Checkpoint

- as of: 2026-10-13, branch claude/orchestrate-agy-claude-wx4m3m, head bd7a882, worktree clean before task record
- done: audited `.agents/skills/` against `.claude/skills/`, recorded baseline B1
- next: dispatch workers for the orchestrate port and the drive/docs links, then gate and seal
