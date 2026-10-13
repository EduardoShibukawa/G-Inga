---
schema: task/1
tier: standard
status: verified
verified_at: "357c60a"
---

# Implement Continuous Autonomous Driver Skill (`/drive`)

## Routing and approvals

- tier: standard (S1 holds: testable 3-layer architecture, CLI parameters, and Gira-G indexing integration criteria; S2 holds: follows SDLC harness tooling and ADR 0002 §5; S3 holds: bounded to `.agents/skills/drive/`, `.claude/skills/drive/`, and `tasks/`; S4 holds: two-way door)
- approved: standard procedure by owner (2026-10-12, "Implement Continuous Autonomous Driver Skill (/drive)")

## Objective

Implement the new canonical continuous autonomous driver skill `/drive` for G-Ingá across `.agents/skills/drive/SKILL.md` (Antigravity) and `.claude/skills/drive/SKILL.md` (Claude Code):

1. Define canonical skill metadata (name: `drive`, description: "Continuous backlog execution driver for G-Ingá. Scans pending tasks, resolves dependencies using Gira-G architectural indexing, partitions conflict-free execution waves, and orchestrates autonomous OODA delivery cycles with strict token budgets and circuit breakers.").
2. Detail the 3-Layer Autonomous Execution Architecture:
   - L1 Driver (`/drive`): Backlog scanning, dependency ordering, global run budget (< 100k tokens), and batch circuit breakers.
   - L2 Orchestrator (`/orchestrate`): OODA batch governance, wave partitioning (`orchestrate-runner.ts`), ephemeral worktree isolation (`worktree-runner.ts`), 5-layer verification gate, and atomic commits.
   - L3 Worker (`/work`): Scoped surgical micro-execution within isolated worktrees, bounded by Gira-G contextual slices (`gira slice`).
3. Specify Gira-G indexing integration using `docs/architecture/macro-map.json` and CLI queries (`gira locate`, `gira slice`, `gira impact`) for token-frugal context extraction.
4. Define parameters and execution modes: `--limit <N>` (default: 3), `--dry-run`, `--tag <tag>`, `--max-tokens <tokens>`.
5. Enforce anti-thrashing circuit breaker halts on 2 consecutive verification failures without new evidence (ADR 0002 §5, Trigger E3).
6. Ensure strict contract compliance and 100% pass on repository validation suite (`mise run validate`).

- In scope:
  - `.agents/skills/drive/SKILL.md`
  - `.claude/skills/drive/SKILL.md`
  - `tasks/2026-10-12-implement-drive-autonomous-skill.md`
- Out of scope:
  - Modifying approved specs, spec hashes, or ADRs.
  - Committing directly to git (atomic commit seal handled by parent orchestrator).

## Acceptance criteria

- AC1: `.agents/skills/drive/SKILL.md` and `.claude/skills/drive/SKILL.md` exist and export canonical skill frontmatter (name: `drive`, exact authorized description).
- AC2: Skill documentation details the 3-layer execution architecture (L1 Driver, L2 Orchestrator, L3 Worker) and continuous execution lifecycle.
- AC3: Skill documentation specifies Gira-G CLI integration (`gira locate`, `gira slice`, `gira impact`) with `docs/architecture/macro-map.json` for token-frugal context extraction.
- AC4: Skill documentation specifies CLI flags (`--limit`, `--dry-run`, `--tag`, `--max-tokens`) and circuit breaker halt behavior (2 consecutive failures).
- AC5: Relative markdown links and contract references resolve cleanly without broken links.
- AC6: Repository validation suite (`mise run validate`) passes with 100% compliance across all checks.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation suite | pass | df23fbdf987864edb2f12f573585811ef6767c1c | `mise run validate` passed on clean main branch |
| AC1 | canonical drive skill frontmatter | pass | 357c60a | name: `drive` and exact canonical description verified |
| AC2 | 3-layer architecture specification | pass | 357c60a | L1 Driver, L2 Orchestrator, and L3 Worker architecture documented |
| AC3 | Gira-G indexing integration | pass | 357c60a | `gira locate`, `gira slice`, and `gira impact` documented with macro-map.json |
| AC4 | CLI flags and circuit breaker | pass | 357c60a | `--limit`, `--dry-run`, `--tag`, `--max-tokens` and ADR 0002 E3 circuit breaker specified |
| AC5 | markdown link validation | pass | 357c60a | local link validation passes with 0 broken links (806 refs checked) |
| AC6 | repository validation suite | pass | 357c60a | `mise run validate` passed (80 markdown files, 0 issues) |
| V1 | diff review against scope | pass | 357c60a | diff strictly bounded to in-scope files |

## Outcome

Implemented the canonical continuous autonomous backlog execution skill `/drive` across both host environments (`.agents/skills/drive/SKILL.md` for Google Antigravity and `.claude/skills/drive/SKILL.md` for Claude Code). The skill formalizes the 3-Layer Autonomous Execution Architecture (L1 Driver, L2 Orchestrator, L3 Worker), integrates Gira-G architectural indexing (`docs/architecture/macro-map.json`) for token-frugal context extraction via `gira locate`, `gira slice`, and `gira impact`, defines standard operational parameters (`--limit`, `--dry-run`, `--tag`, `--max-tokens`), and mandates strict anti-thrashing circuit breaker halts on 2 consecutive verification failures (ADR 0002 §5, Trigger E3). Verified with 100% compliance under `mise run validate`.

## Checkpoint

- as of: 2026-10-12, branch feat/implement-drive-autonomous-skill, head 357c60a, task verified
- done: created drive skill definitions in .agents and .claude, verified all acceptance criteria, validated repository suite
- next: squash/merge PR to main and sync
