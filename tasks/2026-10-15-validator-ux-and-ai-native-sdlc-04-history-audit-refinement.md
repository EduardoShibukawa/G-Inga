---
schema: task/1
tier: standard
status: verified
verified_at: "5fdda765e9271808ce4c3a0ecccb54f4f3e44387"
parent: 2026-10-15-validator-ux-and-ai-native-sdlc
spec: 2026-10-15-validator-ux-and-ai-native-sdlc@1
depends_on: ["2026-10-15-validator-ux-and-ai-native-sdlc-02-validator-authoring-full-modes", "2026-10-15-validator-ux-and-ai-native-sdlc-03-subagents-skills"]
---

# History audit refinement

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-15-validator-ux-and-ai-native-sdlc)

## Objective

Implement child 04 of the approved spec: History audit refinement for `intents/`, deletion checks, and findings documentation.

In scope:

- Refine `tools/validate/artifacts/history.ts` so `rev-list` and `--diff-filter=D` include `intents`, add `checkIntentTransition`, and enforce deletion rules for `intent/1` (SC7).
- Add intent history fixtures (`H-intent-create`, `H-intent-del`, `H-intent-reopen`) in `tools/validate/artifacts/fixtures.ts` and `tools/validate/artifacts/artifacts.test.ts` (SC7).
- Update `docs/research/artifact-contract-validator-findings.md` documenting the resolutions of F4 and F8 (ADR 0012, SC1, SC4).
- Rebuild standalone validator bundle `tools/validate/validate.js` and regenerate manifest.

Out of scope: other children.

## Acceptance criteria

1. AC1 = SC7: `intent/1` artifact round-trips through the validator (parse, rules, history) and preserves the original prompt verbatim.
2. AC2 = F4/F8: history audit and deletion detection cover `intents/`, and findings doc records the resolutions for F4 and F8.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | full repository validation and test suite before edits | pass | 780cdfb | `mise run validate && bun test tools/validate` |
| AC1 | intent/1 round-trips through validator parse, rules, and history walk | pass | 5fdda76 | history fixtures in `artifacts.test.ts` |
| AC2 | history audit covers intents and findings doc documents F4/F8 resolutions | pass | 5fdda76 | inspection of `history.ts` and `artifact-contract-validator-findings.md` |
| R1 | full repository validation and test suite | pass | 5fdda76 | `mise run validate && bun test tools/validate` |
| V1 | diff read against AC1 and AC2 | pass | 5fdda76 | git diff inspected against spec SC7 |

## Plan

1. Refine `tools/validate/artifacts/history.ts` so `rev-list` and `--diff-filter=D` include `intents`, add `checkIntentTransition`, and prevent intent deletions.
2. Add intent fixture helper and history cases (`H-intent-create`, `H-intent-del`, `H-intent-reopen`) in `tools/validate/artifacts/fixtures.ts` and `tools/validate/artifacts/artifacts.test.ts`.
3. Update `docs/research/artifact-contract-validator-findings.md` documenting resolutions for F4 and F8.
4. Rebuild `validate.js`, run test suite, seal commit with manifest regeneration, and mark Child 04 verified.

## Outcome

Implemented history audit tracking and deletion prohibition for `intent/1` artifacts in `tools/validate/artifacts/history.ts`. Added fixtures (`H-intent-create`, `H-intent-del`, `H-intent-reopen`) to test intent creation, deletion prevention, and lifecycle state rules. Documented the resolutions of findings F4 (SHA canonicalization) and F8 (authoring mode vs immutable history walk) in `docs/research/artifact-contract-validator-findings.md`. Rebuilt the standalone validator bundle and regenerated `manifest.json`.
