---
schema: spec/1
status: approved
version: 1
approved_version: 1
approved_hash: sha256:2a246575ad38a7df03f5ca8810e94870bd988949fb256e6b9171cbffac06e8fd
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
- `/work` heavy step 2 runs the same procedure, recording each answer as a `decided:` line.
- The procedure lives once, as a reference file of the `work` skill. `/sharpen` is a thin user-invoked entry that reads it, and the `/work` heavy route reads it directly, one level from `SKILL.md`. No skill reads another skill's `SKILL.md`.

## Scope

- In scope:
  - the question-rounds procedure as `work/references/question-rounds.md` (both host copies);
  - the `sharpen` entry skill for Claude Code, Antigravity and OpenCode;
  - the `work/SKILL.md` heavy route and `work/heavy.md` step 2 (both host copies) pointing to the procedure;
  - `docs/principles.md` §2 aligned to whole-frontier rounds;
  - ADR 0004 open questions 1 and 3 annotated as resolved by this spec;
  - the bundle definition, manifest and bundle documentation.
- Out of scope:
  - switching `work` to `disable-model-invocation: true`: `/drive` and `/orchestrate` workers invoke `/work`, which the flag would block (separate task);
  - how OpenCode commands load skills with `autoinvoke: false` for `/drive` and `/orchestrate` (separate task);
  - a `wayfinder` replacement (ADR 0004 OQ5);
  - vendoring upstream text (ADR 0004 item 6);
  - creating a glossary in this repository before a term is resolved.

## Acceptance criteria

- SC1 **Layout.** The procedure exists once per host as `work/references/question-rounds.md`, with a provenance line naming `grilling` and `domain-modeling` at upstream commit `49dd158` (ADR 0004 item 5); its text is G-Ingá's own, not a close copy. A `sharpen` skill with `disable-model-invocation: true` and a one-line human-facing description tells the agent to read and follow that file in standalone mode, and holds no procedure of its own.
- SC2 **Rounds.** The procedure instructs whole-frontier rounds: numbered questions, each with a recommended answer, dependent questions deferred to a later round, done only when the frontier is empty and the owner confirms, no action before confirmation.
- SC3 **Facts versus decisions.** The procedure assigns fact-finding to the agent, allows read-only subagents for broad lookups that don't block independent questions, and reserves decisions for the owner.
- SC4 **Domain discipline.** The procedure instructs term challenge against `docs/glossary.md`, sharpening fuzzy terms, edge-case scenarios and claim-versus-code checks; it writes resolved terms to `docs/glossary.md` immediately, keeps the glossary free of implementation detail, creates it lazily, and migrates an existing `CONTEXT.md` into it.
- SC5 **ADR offers.** The procedure offers an ADR only under the three conditions and writes it to `docs/decisions/` as `proposed`, never accepted.
- SC6 **Standalone close.** A standalone session persists nothing beyond glossary entries and owner-accepted ADR drafts, and ends with a decision summary and an offer to open `/work`.
- SC7 **Heavy integration.** In both host copies, the `work/SKILL.md` heavy route names `references/question-rounds.md` next to `heavy.md`, and `heavy.md` step 2 runs that procedure and records answers as `decided:` lines; no file references sit more than one level below `SKILL.md`.
- SC8 **Hosts.** An equivalent `sharpen` skill and procedure copy exist under `.agents/skills/`, and the OpenCode plugin registers the `sharpen` skill and a `/sharpen` command whose prompt names the procedure file, so it works without model invocation.
- SC9 **Docs.** `docs/principles.md` §2 prescribes whole-frontier rounds and no longer calls `grilling` installed; ADR 0004 open questions 1 and 3 point to this spec as their resolution.
- SC10 **Bundle.** The bundle definition and `manifest.json` include both `sharpen` copies and both procedure copies, `docs/bundle.md` lists them, and `mise run validate` and `mise run test` pass.

## Interfaces and dependencies

- ADR 0004 items 3, 5 and 6; D5 items 3 and 6.
- Harness-hardening spec model policy: read-only search subagents use Haiku.
- `tools/validate/bundle.json`, `tools/validate/manifest.mjs` two-commit protocol, `packages/opencode-plugin/index.ts`.
- Anthropic: Claude Code skills docs (invocation table, blocked calls, supporting files) and skill authoring best practices (one-level references).
- Upstream technique source: `mattpocock/skills` at `49dd158`, `grilling` and `domain-modeling` skill files.

## Decisions

- Question format: whole frontier per round, numbered, each with a recommended answer (owner, 2026-10-14).
- Glossary: plain repository doc at `docs/glossary.md`, not a contract artifact, created lazily; an existing `CONTEXT.md` is migrated (owner, 2026-10-14).
- Name `/sharpen`, user-invoked only (owner, 2026-10-14).
- Layout: one procedure as a `work` reference file, read by `/sharpen` and by the heavy route; never another skill's `SKILL.md`, which a blocked `disable-model-invocation` call forbids reproducing (owner, 2026-10-14, after comparing Pocock's two-layer split with Anthropic's skills docs).
- Fact-finding through read-only subagents is allowed (owner, 2026-10-14).
- Hosts: Claude Code, Antigravity, OpenCode; ships in the bundle (owner, 2026-10-14).
- Invocation rule: entry points the owner types are `disable-model-invocation: true`; what another skill or subagent must reach is a reference file; `/work` stays model-invocable until its workers stop invoking it (owner, 2026-10-14).

## Risks and constraints

- Each host copy names its own path (`.claude/` or `.agents/`), as `work` already does for `heavy.md`.
- Anthropic advises one reference level; the heavy route therefore names the procedure in `work/SKILL.md`, not only inside `heavy.md`.
- Subagent fact-finding adds cost per round; the skill keeps lookups read-only and scoped.
- Manifest regeneration needs the two-commit protocol; a squash merge breaks `manifest.mjs --check`.

## Verification

- SC1–SC9: inspection of the changed files against each criterion.
- SC10: `mise run validate` and `mise run test` exit 0.
- One live `/sharpen` run on a real idea, recorded in the parent task.

## Rollback

Remove the `sharpen` skill and procedure copies and the OpenCode registration, revert `work/heavy.md` step 2 and `docs/principles.md` §2, and regenerate the manifest.

## Open questions

None.

## Revisions

None.
