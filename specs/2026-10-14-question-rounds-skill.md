---
schema: spec/1
status: draft
version: 1
---

# Sharpen: G-Ingá Question Rounds

## Problem

The owner retired the Pocock plugin (ADR 0007). Its two most used skills, `grilling` (35 uses) and `domain-modeling` (30 uses), have no G-Ingá replacement (friction F-001, F-002). `work/heavy.md` step 2 names "structured question rounds" without a procedure, there is no way to stress-test an idea outside a confirmed `heavy` task, and no G-Ingá skill keeps domain vocabulary or says when to offer an ADR. `docs/principles.md` §2 still prescribes one question at a time and calls `grilling` installed.

## Expected behavior

- The owner runs `/sharpen <idea or plan>` and gets rounds of numbered questions. Each round holds every decision whose prerequisites are settled, and each question carries a recommended answer. Questions that depend on an open answer wait for a later round.
- Facts are never asked of the owner. The agent looks them up, dispatching read-only subagents when a lookup is broad, and keeps asking the questions that don't depend on it while the lookup runs. Decisions are always put to the owner.
- During the rounds the agent challenges terms that conflict with `docs/glossary.md`, proposes precise terms for fuzzy ones, probes boundaries with concrete edge-case scenarios and checks the owner's claims against the code. A resolved term is written to `docs/glossary.md` at once.
- An ADR is offered only when a decision is hard to reverse, surprising without context and the result of a real trade-off. It goes to `docs/decisions/` as `proposed`; only the owner accepts it.
- The session ends when no question is left open and the owner confirms shared understanding. Nothing is implemented before that. A standalone session closes with a summary of decisions and an offer to open `/work` with them.
- `/work` heavy step 2 runs its question rounds by following `/sharpen`, recording each answer as a `decided:` line.

## Scope

- In scope:
  - the `sharpen` skill for Claude Code, Antigravity and OpenCode;
  - `work/heavy.md` step 2 (both host copies) pointing to it;
  - `docs/principles.md` §2 aligned to whole-frontier rounds;
  - ADR 0004 open questions 1 and 3 annotated as resolved by this spec;
  - the bundle definition, manifest and bundle documentation.
- Out of scope:
  - switching `work` to `disable-model-invocation: true` (owner policy recorded in Decisions; separate task);
  - a `wayfinder` replacement (ADR 0004 OQ5);
  - vendoring upstream text (ADR 0004 item 6);
  - creating a glossary in this repository before a term is resolved.

## Acceptance criteria

- SC1 **Skill.** A `sharpen` skill exists for Claude Code with `disable-model-invocation: true` and a provenance line naming `grilling` and `domain-modeling` at upstream commit `49dd158` (ADR 0004 item 5). Its text is G-Ingá's own, not a close copy.
- SC2 **Rounds.** The skill instructs whole-frontier rounds: numbered questions, each with a recommended answer, dependent questions deferred to a later round, done only when the frontier is empty and the owner confirms, no action before confirmation.
- SC3 **Facts versus decisions.** The skill assigns fact-finding to the agent, allows read-only subagents for broad lookups that don't block independent questions, and reserves decisions for the owner.
- SC4 **Domain discipline.** The skill instructs term challenge against `docs/glossary.md`, sharpening fuzzy terms, edge-case scenarios and claim-versus-code checks; it writes resolved terms to `docs/glossary.md` immediately, keeps the glossary free of implementation detail, creates it lazily, and migrates an existing `CONTEXT.md` into it.
- SC5 **ADR offers.** The skill offers an ADR only under the three conditions and writes it to `docs/decisions/` as `proposed`, never accepted.
- SC6 **Standalone close.** A standalone session persists nothing beyond glossary entries and owner-accepted ADR drafts, and ends with a decision summary and an offer to open `/work`.
- SC7 **Heavy integration.** `work/heavy.md` step 2, in both host copies, tells the agent to read and follow the `sharpen` skill file and to record answers as `decided:` lines.
- SC8 **Hosts.** An equivalent `sharpen` skill exists under `.agents/skills/`, and the OpenCode plugin registers the `sharpen` skill and a `/sharpen` command.
- SC9 **Docs.** `docs/principles.md` §2 prescribes whole-frontier rounds and no longer calls `grilling` installed; ADR 0004 open questions 1 and 3 point to this spec as their resolution.
- SC10 **Bundle.** The bundle definition and `manifest.json` include both `sharpen` copies, `docs/bundle.md` lists them, and `mise run validate` and `mise run test` pass.

## Interfaces and dependencies

- ADR 0004 items 3, 5 and 6; D5 items 3 and 6.
- Harness-hardening spec model policy: read-only search subagents use Haiku.
- `tools/validate/bundle.json`, `tools/validate/manifest.mjs` two-commit protocol, `packages/opencode-plugin/index.ts`.
- Upstream technique source: `mattpocock/skills` at `49dd158`, `grilling` and `domain-modeling` skill files.

## Decisions

- Question format: whole frontier per round, numbered, each with a recommended answer (owner, 2026-10-14).
- Glossary: plain repository doc at `docs/glossary.md`, not a contract artifact, created lazily; an existing `CONTEXT.md` is migrated (owner, 2026-10-14).
- Name `/sharpen`; user-invoked only; a skill that needs it reads its file (owner, 2026-10-14).
- Fact-finding through read-only subagents is allowed (owner, 2026-10-14).
- Hosts: Claude Code, Antigravity, OpenCode; ships in the bundle (owner, 2026-10-14).
- Owner policy: every G-Ingá skill should be `disable-model-invocation: true`, run when the owner asks or a skill that uses it says so (owner, 2026-10-14). Applied here to `sharpen` only.

## Risks and constraints

- With `disable-model-invocation: true` the agent can't call the skill through the Skill tool, so `heavy.md` must reference the file path, which differs per host.
- Subagent fact-finding adds cost per round; the skill keeps lookups read-only and scoped.
- Manifest regeneration needs the two-commit protocol; a squash merge breaks `manifest.mjs --check`.

## Verification

- SC1–SC9: inspection of the changed files against each criterion.
- SC10: `mise run validate` and `mise run test` exit 0.
- One live `/sharpen` run on a real idea, recorded in the parent task.

## Rollback

Remove the `sharpen` skill copies and the OpenCode registration, revert `work/heavy.md` step 2 and `docs/principles.md` §2, and regenerate the manifest.

## Open questions

None.

## Revisions

None.
