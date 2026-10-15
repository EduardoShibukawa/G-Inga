---
schema: spec/1
status: draft
version: 1
---

# Prompt-Audit Remediation

## Problem

A prompt audit of the instruction files that load in G-Ingá sessions (2026-10-15) found rules the repository contradicts and rules no session can follow:

- `/orchestrate` and its references describe tickets in `map.md` moving `open → claimed → resolved`. `map.md` doesn't exist, and the validator accepts only the `task/1` states. An orchestrator that follows the text finds no work or writes records the validator rejects.
- `ooda-cycle.md` describes a four-layer gate without the Git lineage layer; the skill and `gate.md` define five.
- The artifact contract says no validator exists, while every guarded transition runs one.
- `/work`'s procedure asks every session, workers included, to respect per-tier token ceilings, an 80% warning and a 500 ms setup SLA. A session can't read its own token count, and the tooling already enforces these limits after the fact.
- `/orchestrate` sets a numeric ceiling on the orchestrator's own context and gates on it by "transcript inspection", which nothing can measure.
- The dispatch template is in Portuguese while repository docs are English.
- The circuit breaker reverts the whole working tree, which can discard work outside the ticket.
- `CLAUDE.md` forbids conversation memory while auto-memory loads in every session.

Heavy triggers: H4 (harness policy) and H3 (several skills plus the accepted contract).

## Expected behavior

- `/orchestrate`, its references and `/drive` read and write only `task/1` records in `tasks/`, using the contract's states.
- Every description of the verification gate names the same five layers.
- The artifact contract's status line states what the validator implements.
- `/work`'s procedure no longer instructs the session on budgets it can't observe; it names the tooling that enforces them and keeps the ADR 0006 privacy rule.
- `/orchestrate` keeps exploration in subagents without a numeric ceiling on its own context, and its gate has no unmeasurable row.
- Skills, references and dispatch templates are in English.
- A tripped circuit breaker reverts only the ticket's in-scope files, or discards the ticket's isolated worktree.
- `CLAUDE.md` treats the repository as canonical and auto-memory as a hint checked against it.

## Scope

- In scope: the `orchestrate`, `drive` and `work` skill files named above in both host copies (`.claude/skills/`, `.agents/skills/`); `docs/artifact-contracts.md` and its generated copy; `CLAUDE.md`; the bundle manifest.
- Out of scope: `question-rounds.md` (owned by the question-rounds task); worker-reported token usage and the `/drive` budget (owned by the harness-hardening spec, cost per child); the plugin copy of the skills; moving skills to a root `skills/` directory distributed by plugin (separate decision).
- Non-goals: changing gate tooling behavior under `tools/`.

## Acceptance criteria

- SC1: No `orchestrate` or `drive` file in either host copy names `map.md` or a ticket state outside the `task/1` states; the selection, start and seal steps name `task/1` states.
- SC2: `ooda-cycle.md` names the same five gate layers, in the same order, as `gate.md`.
- SC3: The contract's status line no longer says no validator exists, and states the validator's coverage as checked against `tools/validate/`; the generated copy matches (`contract-copy` check passes).
- SC4: `procedure.md` (both copies) has no per-tier token ceiling, warning ratio or setup SLA as an instruction to the session; it names the enforcing tooling and keeps the ADR 0006 privacy rule.
- SC5: `orchestrate` has no numeric ceiling on the orchestrator's context, and Layer 4 of `gate.md` has no row that can't be measured by a command.
- SC6: `subagent-prompt.md` (both copies) is entirely in English and has no all-caps warning line; its sections and report fields are unchanged.
- SC7: No `orchestrate` file instructs a whole-tree revert (`git checkout HEAD .`, `git clean -fd` without a path); the circuit breaker reverts the ticket's in-scope files or discards its isolated worktree.
- SC8: `CLAUDE.md` rule 2 states the repository is canonical and auto-memory is a hint checked against it before acting.
- SC9: No `orchestrate` file names a `run_in_background` parameter; the manifest is regenerated, and `mise run validate` and `mise run test` pass.

## Interfaces and dependencies

- The `task/1` contract (§3.3, §3.4) is consumed, not changed.
- The bundle manifest and the contract copy are regenerated with their existing tools.
- Children touching `drive` or `orchestrate` depend on `2026-10-14-harness-hardening-04` and `-05`, which edit the same files.

## Decisions

- Five gate layers, as `gate.md` defines and `tools/gate/verify-gate.ts` implements, over the four in `ooda-cycle.md`.
- Budget enforcement stays in tooling; prose that duplicates it as a session instruction is removed rather than reworded.
- English for every skill file, over a Portuguese exception for dispatch templates.
- Scoped revert over whole-tree revert, so a trip can't discard unrelated work.

## Risks and constraints

- Concurrent edits: the harness-hardening children edit `drive` and `orchestrate`; sequencing avoids conflicts.
- The contract is an accepted document: only its status sentence changes, with owner approval.
- No protected actions.

## Verification

- End to end: grep both host copies for the removed states, `map.md`, ceilings, `run_in_background` and whole-tree reverts (SC1, SC4, SC5, SC7, SC9); read the gate layers side by side (SC2); `contract-copy` and manifest checks (SC3, SC9); `mise run validate` and `mise run test`.
- Review focus: that no rewrite weakens a gate rule or the circuit breaker.

## Rollback

skip: text-only changes on a branch, reversible by revert.

## Open questions

- deferred: skill layout (root `skills/` distributed by plugin) is a separate decision with its own ADR; this spec edits current paths, which a later move carries over.

## Revisions

- v1 (2026-10-15): initial draft from the prompt-audit findings and owner answers Q1–Q6.
