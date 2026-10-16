---
schema: intent/1
status: draft
---

# Validator UX redesign and AI-native SDLC alignment

## Problem

The validator's full gate is correct but expensive to satisfy while iterating, and the SDLC layer has no explicit origin artifact before a heavy task starts. Sessions spent more time on process choreography than on the change, and repaired records cannot clear old failures without rewriting history.

## Outcome

An authoring validation mode for local iteration, an intent artifact preserving the original prompt, phased subagents, and clearer validator UX, while keeping full history and commit-order gates in full mode.

## Affected users/systems

Agents using the validator day to day; maintainers of the artifact contract; reviewers evaluating heavy tasks.

## Constraints

- `baseline/verified_at` invariants are not relaxed in either mode.
- Full validation remains the gate of record before merge/acceptance and in CI.
- Human authority remains at gates.

## Open questions

None.

## Original prompt

> Implement the validator UX redesign and the AI-native SDLC alignment (intent artifact, authoring/full validation modes, phased subagent portfolio, skills) as one heavy task, preserving the original request and capturing the affected scope before specification.
