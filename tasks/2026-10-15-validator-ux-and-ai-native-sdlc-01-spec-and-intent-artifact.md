---
schema: task/1
tier: standard
status: active
parent: 2026-10-15-validator-ux-and-ai-native-sdlc
spec: 2026-10-15-validator-ux-and-ai-native-sdlc@1
depends_on: []
---

# Spec and intent artifact

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-15-validator-ux-and-ai-native-sdlc)

## Objective

Implement child 01: register the `intent/1` artifact schema (storage under `intents/`), the validator's snapshot and history checks for it, and backfill an intent artifact for this heavy task.

In scope: schema registry and versioning entry for `intent/1`; kind/path/history support in `tools/validate`; a backfilled `intents/2026-10-15-validator-ux-and-ai-native-sdlc.md` preserving the origin prompt.
Out of scope: authoring/full validation modes (child 02), subagents and skills (child 03), history audit refinement (child 04).

## Acceptance criteria

1. AC1: an `intent/1` artifact under `intents/` parses, passes state and history checks, and preserves `## Original prompt`.
2. AC2: the schema registry lists `intent/1` and the current major for the `intent` family, subject to §8 freeze rules.
3. AC3: `intents/` is treated as a record directory for applicability, deletion and history (no deletion detection regressions).
4. AC4: the contract copy, fixtures and repository validation remain green.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation before the change | pass | cebd090 | `bun run validate`, `bun test tools/validate` (prior to this child) |
| AC1 | intent round-trip in current repository | not run |  |  |
| AC2 | schema registry lists intent/1 | not run |  |  |
| AC3 | intents/ records tracked by history applicability | not run |  |  |
| R1 | repository validation after the change | not run |  |  |
| V1 | diff read against AC1–AC4 | not run |  |  |

## Plan

1. Add `intent` as a record kind and `intents/` as a record directory in the validator.
2. Register `intent/1` in the schema registry and current majors.
3. Add state and skip checks for intent records.
4. Backfill `intents/2026-10-15-validator-ux-and-ai-native-sdlc.md`.
5. Rebuild the bundle, update the manifest, and verify.

## Outcome

Pending.