# 0013 — Intent artifact and phased subagent portfolio for heavy tasks

- **Status:** proposed
- **Date:** 2026-10-15
- **Deciders:** project owner

## Context

A `heavy` task currently starts from an approval entry inside a parent task record. The AI-native SDLC playbook uses a pre-task `intent.md` that preserves the originator's request and becomes the source for the specification, which fits G-Ingá's artifact chain better than embedding intent in task metadata.

Subagents are used ad hoc today; the harness needs a small phased portfolio with one job each and the least tools.

## Decision

Introduce an `intent/1` artifact under `intents/`, created by a subagent, that preserves the original prompt verbatim and captures problem, outcome, affected users/systems, constraints, and open questions. A `heavy` task references or backfills this artifact.

Ship subagents in phases: validator-guide and researcher first, then reviewer, then verifier. Each subagent has one job and a minimal tool set. Add a skill explaining the validator flow to agents.

Human authority remains at gates; agents prepare and execute.

## Considered options

- Extend `task/1` with an intent section: rejected, it conflates task state with origin intent.
- Unvalidated markdown: rejected, it is not auditable.
- One multi-role subagent: rejected, context bloat and non-repeatable checks.

## Consequences

- A new schema family `intent/1` is registered and subject to the §8 versioning and freeze rules.
- Heavy task records gain an intent reference; existing heavy parents are grandfathered or backfilled during this change.
