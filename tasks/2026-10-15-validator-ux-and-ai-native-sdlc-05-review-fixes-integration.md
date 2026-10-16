---
schema: task/1
tier: standard
status: active
parent: 2026-10-15-validator-ux-and-ai-native-sdlc
spec: 2026-10-15-validator-ux-and-ai-native-sdlc@1
depends_on: ["2026-10-15-validator-ux-and-ai-native-sdlc-02-validator-authoring-full-modes", "2026-10-15-validator-ux-and-ai-native-sdlc-03-subagents-skills", "2026-10-15-validator-ux-and-ai-native-sdlc-04-history-audit-refinement"]
---

# Review fixes and integration

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-15-validator-ux-and-ai-native-sdlc)

## Objective

Implement child 05 of the approved spec: Review fixes, contract table synchronization, and integrated end-to-end verification.

In scope:

- Synchronize `docs/artifact-contracts.md` §7.2 fixtures table with `fixtures.ts` (include X10–X15).
- Rebuild contract copy in `.claude/skills/work/references/artifact-contracts.md`.
- Verify SC10: decision map records the policy changes and proposed ADRs (0012, 0013) are present.
- Verify SC11: full test suites and repository validation pass cleanly.
- Verify integrated criteria across all children (SC1–SC11).

Out of scope: other children; protected actions not explicitly approved.

## Acceptance criteria

1. AC1 = SC10: decision map records policy changes; proposed ADR(s) 0012 and 0013 are present.
2. AC2 = SC11: contract §7.2 table matches fixtures; full repository validation and test suites pass cleanly.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | full repository validation and test suite before edits | pass | 9a2a494 | `mise run validate && bun test tools/validate` |
| AC1 | decision map and ADRs present and valid | not run |  | inspection of `docs/decision-map.md` and `docs/decisions/` |
| AC2 | contract table synced and validator tests pass | not run |  | `docs/artifact-contracts.md` §7.2 and `bun test tools/validate` |
| R1 | full repository validation and test suite | not run |  | `mise run validate && bun test tools/validate` |
| V1 | diff read against AC1 and AC2 | not run |  | git diff inspected against SC10 and SC11 |

## Plan

1. Synchronize `docs/artifact-contracts.md` §7.2 table with fixtures (X10–X15) and rebuild contract copy.
2. Inspect `docs/decision-map.md` and ADRs 0012, 0013 to confirm SC10 compliance.
3. Rebuild standalone validator bundle `tools/validate/validate.js` and regenerate `manifest.json`.
4. Run full gates: `mise run validate` and `bun test tools/validate`.
5. Seal child 05 as verified and advance parent checkpoint.
