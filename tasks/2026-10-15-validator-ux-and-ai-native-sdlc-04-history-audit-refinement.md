---
schema: task/1
tier: standard
status: active
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
| AC1 | intent/1 round-trips through validator parse, rules, and history walk | not run |  | history fixtures in `artifacts.test.ts` |
| AC2 | history audit covers intents and findings doc documents F4/F8 resolutions | not run |  | inspection of `history.ts` and `artifact-contract-validator-findings.md` |
| R1 | full repository validation and test suite | not run |  | `mise run validate && bun test tools/validate` |
| V1 | diff read against AC1 and AC2 | not run |  | git diff inspected against spec SC7 |

## Plan

1. Refine `tools/validate/artifacts/history.ts` so `rev-list` and `--diff-filter=D` include `intents`, add `checkIntentTransition`, and prevent intent deletions.
2. Add intent fixture helper and history cases (`H-intent-create`, `H-intent-del`, `H-intent-reopen`) in `tools/validate/artifacts/fixtures.ts` and `tools/validate/artifacts/artifacts.test.ts`.
3. Update `docs/research/artifact-contract-validator-findings.md` documenting resolutions for F4 and F8.
4. Rebuild `validate.js`, run test suite, seal commit with manifest regeneration, and mark Child 04 verified.
