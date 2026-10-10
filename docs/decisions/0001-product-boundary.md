# 0001 — Product boundary: personal SDLC harness first

- **Status:** accepted (2026-10-10)
- **Date:** 2026-10-10
- **Deciders:** project owner (approved 2026-10-10)

## Context

Two input briefs describe related but different products:

- [`sdlc-harness-brief.md`](../briefs/sdlc-harness-brief.md) — an agentic SDLC harness (workflows, specs, tasks, checkpoints, verification gates, evaluation), aimed at public distribution as a Claude Code plugin and validated on a PetClinic lab.
- [`wayfinder-context-map-brief.md`](../briefs/wayfinder-context-map-brief.md) — a model-agnostic, multi-repository system-context map with provenance, selective retrieval, a human UI and MCP/CLI adapters.

The owner clarified the real motivation (2026-10-10): **a personal workflow/harness that solves the owner's own problems, improves gradually, and serves as a learning vehicle.** The owner already runs a self-built workflow at work focused on speed and, above all, **token economy**, after moving from plan mode to Matt Pocock's skills.

## Decision

1. G-Ingá is a **personal SDLC harness for Claude Code**. The public repository is a by-product, not the goal.
2. The **system-context map is deferred** as a separate future module. It enters scope only when a logged friction shows that navigating a multi-repo system is a recurring cost.
3. The harness's knowledge artifacts carry **provenance and freshness** (declared / extracted / inferred / stale), so a future map can plug in as one more knowledge producer.
4. Every new harness component must trace to a **logged friction** in [`friction-log.md`](../friction-log.md) or to an explicit learning goal.
5. The primary metric is **tokens (and time) per verified task**, not raw tokens per run.

## Alternatives considered

| Option | Why not now |
|---|---|
| Context map as the core | PetClinic (2 repos, 1 REST API) can't demonstrate its value; it needs its own lab, multi-model eval and UI, which roughly doubles the scope. No logged friction for it yet. |
| Both as one product | Two evaluation stories and two sets of infrastructure at once; conflicts with incremental, learning-driven growth. |
| Adopt an existing pack wholesale (Pocock / Osmani / pstack) | Doesn't fit the owner's token-economy priority or the existing work workflow; the packs are used as a textbook, not a religion. |

## Consequences

- Deprioritized until evidence asks for them: plugin packaging, installer, stable/experimental channels, the full 12-scenario PetClinic lab, and global learning promotion.
- The brief's "real-world test drive" becomes the **primary** validation. PetClinic becomes an optional controlled fixture for A/B comparisons.
- The brief's other confirmed decisions (autonomy limits, honest pass/fail/not-run evidence, spec/task model, native Claude Code primitives first) stay in force.
