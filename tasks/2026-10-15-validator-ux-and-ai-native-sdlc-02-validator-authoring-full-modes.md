---
schema: task/1
tier: standard
status: verified
parent: 2026-10-15-validator-ux-and-ai-native-sdlc
spec: 2026-10-15-validator-ux-and-ai-native-sdlc@1
depends_on: ["2026-10-15-validator-ux-and-ai-native-sdlc-01-spec-and-intent-artifact"]
verified_at: "aa1f018"
---

# Validator authoring/full modes plus messages

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-15-validator-ux-and-ai-native-sdlc)

## Objective

Implement child 02 of the approved spec: authoring vs full validation modes, SHA canonicalization (F4), structured finding messages (`observed`, `expected`, `next`), `--explain <rule>` mode, and heavy-parent `## Review: skip:` handling until verification.

In scope: `tools/validate/main.ts`, `tools/validate/standalone.ts`, `tools/validate/artifacts/records.ts`, `tools/validate/artifacts/rules.ts`, `tools/validate/artifacts/history.ts`, `tools/validate/artifacts/checks.ts`, `tools/validate/artifacts/fixtures.ts`, `tools/validate/artifacts/artifacts.test.ts`, `tools/validate/lib/check.ts`, `package.json`, `docs/artifact-contracts.md` (and generated contract copy), `tools/validate/validate.js`, `manifest.json`.
Out of scope: subagents and skills (child 03), history audit refinement for `intents/` and findings doc (child 04), final review fixes and integration (child 05).

## Acceptance criteria

1. AC1 = SC1: `validate --authoring` runs only current-state checks and never exits `fail` solely because of a historical commit.
2. AC2 = SC2: full `validate` keeps history and ancestry checks and fails or blocks on them as before.
3. AC3 = SC3: authoring and full mode share one finding/rule vocabulary; a current-tree finding is identical in both modes.
4. AC4 = SC4: SHA canonicalization prevents abbreviation and log-path mismatches from producing false failures, degrading to `blocked` when history is unavailable.
5. AC5 = SC5: each current-tree validator finding includes observed, expected, and one next action, and `--explain <rule>` documents the rule.
6. AC6 = SC6: heavy parents may keep `## Review: skip: <reason>` before `verified` and pass snapshot checks, while `skip:` or an `open` finding blocks `verified`.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and validator tests before child 02 edits | pass | 2aaa651 | `mise run validate && bun test tools/validate` |
| AC1 | authoring mode runs current-tree checks only and ignores past commit failures | pass | aa1f018 | unit tests in `tools/validate/artifacts/artifacts.test.ts` SC1 & SC2 |
| AC2 | full mode keeps history walk and ancestry checks | pass | aa1f018 | unit tests in `tools/validate/artifacts/artifacts.test.ts` SC1 & SC2 |
| AC3 | current-tree findings are identical in authoring and full modes | pass | aa1f018 | unit tests in `tools/validate/artifacts/artifacts.test.ts` SC1 & SC2 |
| AC4 | SHA canonicalization handles abbreviated SHAs and Ref log paths | pass | aa1f018 | unit tests in `tools/validate/artifacts/artifacts.test.ts` SC4 |
| AC5 | findings include observed/expected/next and `--explain <rule>` prints rule docs | pass | aa1f018 | unit tests in `tools/validate/artifacts/artifacts.test.ts` SC3 & SC5 |
| AC6 | heavy parent `## Review: skip:` allowed before verified and fails at verified | pass | aa1f018 | unit tests in `tools/validate/artifacts/artifacts.test.ts` SC6 |
| R1 | full repository validation and validator test suite | pass | aa1f018 | `mise run validate && bun test tools/validate` (133 pass, 8 skip, 0 fail) |
| V1 | diff read against AC1–AC6 | pass | aa1f018 | git diff inspected and verified against spec SC1–SC6 |

## Plan

1. Add `extractRefSha` in `tools/validate/artifacts/records.ts` and SHA canonicalization (`compareShas`, `gitResolveSha`) in `rules.ts` and `history.ts`.
2. Add structured finding templates (`observed`, `expected`, `next`), `--explain <rule>` support, and heavy-parent `## Review: skip:` guard at `verified` in `rules.ts`.
3. Wire `--authoring` and `--explain` across `tools/validate/lib/check.ts`, `tools/validate/artifacts/history.ts`, `tools/validate/artifacts/checks.ts`, `tools/validate/main.ts`, `tools/validate/standalone.ts`, and `package.json`.
4. Update `docs/artifact-contracts.md` for `intent/1` (§4.5), `## Review: skip:`, SHA canonicalization, and authoring mode, and regenerate the contract copy.
5. Add fixtures and unit tests in `tools/validate/artifacts/fixtures.ts` and `tools/validate/artifacts/artifacts.test.ts`, rebuild `validate.js`, regenerate `manifest.json`, and verify.

## Outcome

Delivered `--authoring` mode for fast current-state validation without historical walk failures, SHA canonicalization handling 7-to-40 character SHAs and trailing log paths in Ref cells, structured finding messages (`observed`, `expected`, `next`), `--explain <rule>` CLI documentation mode, heavy parent `## Review: skip:` timing guards, and performance memoization for SHA resolution and commit ancestry during history walk. All gates passed cleanly.
