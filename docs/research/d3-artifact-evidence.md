# D3 evidence: how the references persist specs and tasks

**Status:** research note (input to [ADR 0003](../decisions/0003-minimum-artifact-schemas.md)). Not a decision.
**Read on:** 2026-10-10, at the same pinned revisions as the [D2 evidence](d2-routing-evidence.md). This note only adds what D2 didn't cover: artifact shape, state and versioning.

Labels follow the D2 note: **Fact (verified)**, **Author recommendation**, **Inference (ours)**.

| Source | Revision | Files read |
|---|---|---|
| Matt Pocock, `skills` | [`49dd158`](https://github.com/mattpocock/skills/tree/49dd158d1076134a641b33efb035946536778336) | `skills/engineering/to-spec`, `to-tickets`, `implement` |
| Addy Osmani, `agent-skills` | [`1be8e34`](https://github.com/addyosmani/agent-skills/tree/1be8e34187e34647bb83adc3a1323b26ae6f6abe) | `skills/spec-driven-development`, `planning-and-task-breakdown` |

## Findings

| # | Label | Claim | Where |
|---|---|---|---|
| A1 | Fact | Pocock's spec template has Problem Statement, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope and Further Notes. It has no status, version or approval field. The spec is published to an issue tracker. | `to-spec/SKILL.md` L19–75 |
| A2 | Author recommendation | Specs and tickets should avoid file paths and code snippets because "they may end up being outdated very quickly". | `to-spec/SKILL.md` L55, `to-tickets/SKILL.md` L105 |
| A3 | Fact | A local ticket is one Markdown file per ticket (`.scratch/<feature-slug>/issues/<NN>-<slug>.md`) with: what to build, "Blocked by", `Status: ready-for-agent`, and acceptance-criteria checkboxes. Never one combined file. | `to-tickets/SKILL.md` L62, L69–82 |
| A4 | Fact | Wide refactors are sequenced as expand → migrate batches → contract, each its own ticket with blocking edges. | `to-tickets/SKILL.md` L40 |
| A5 | Fact | Osmani's spec template has Objective, Tech Stack, Commands, Project Structure, Code Style, Testing Strategy, Boundaries, Success Criteria and Open Questions. | `spec-driven-development/SKILL.md` L115–146 |
| A6 | Author recommendation | "The spec is a living document": update it when decisions or scope change, then implement. No approval step is attached to the update. | `spec-driven-development/SKILL.md` L216–223 |
| A7 | Fact | Osmani's task carries acceptance criteria, verification steps, dependencies, files likely touched and an estimated scope. Tasks live in `tasks/plan.md` and `tasks/todo.md`, or in an external tracker. | `planning-and-task-breakdown/SKILL.md` L81–103, L143–162 |
| A8 | Fact | When an existing plan belongs to different work, the agent must "stop and ask" and must not "delete, overwrite, or rename the existing files on your own". | `planning-and-task-breakdown/SKILL.md` L152–153 |

## What this means for D3

- **Fact:** neither reference versions its artifact format, separates `completed` from `verified` and `accepted`, or protects an approved spec from later edits. Those are requirements from the [SDLC brief](../briefs/sdlc-harness-brief.md) §3 and [ADR 0002](../decisions/0002-ceremony-tiers-and-routing.md), so D3 has to define them itself.
- **Fact:** both references keep one file per task (A3) or per plan (A7), in Markdown, with acceptance criteria as the central content. That matches the brief's "structured Markdown is the initial source of truth".
- **Inference:** A6 (spec edited freely) conflicts with the brief's rule that replacing an approved spec needs human approval. D3 needs a cheap way to detect an edit to an approved spec.
- **Inference:** A8 is the same safety rule D3 needs for schema changes: never rewrite an existing artifact silently to make it fit.
