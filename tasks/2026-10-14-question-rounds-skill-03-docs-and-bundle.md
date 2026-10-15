---
schema: task/1
tier: standard
status: verified
verified_at: "48e1949"
parent: 2026-10-14-question-rounds-skill
spec: 2026-10-14-question-rounds-skill@1
depends_on:
  - 2026-10-14-question-rounds-skill-02-other-hosts
---

# Sharpen Docs, Bundle and Manifest

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-14-question-rounds-skill after spec v1 approval)

## Objective

Align `docs/principles.md` §2, annotate ADR 0004 open questions 1 and 3, add both `sharpen` and procedure copies to `tools/validate/bundle.json` and `docs/bundle.md`, and regenerate `manifest.json` with the two-commit protocol.

- In scope: the files above.
- Out of scope: other ADR changes; release tags.

## Acceptance criteria

- AC1 = SC9.
- AC2 = SC10.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation suite before change | pass | ed82275 | parent B1: `mise run validate` exit 0 |
| AC1 | SC9: principles §2 whole-frontier, no "grilling installed"; ADR 0004 OQ1/OQ3 → spec | pass | 48e1949 | `docs/principles.md` §2 lines 21–23 prescribe whole-frontier rounds and call `grilling` retired; ADR 0004 OQ1 (line 112) and OQ3 (line 114) say resolved by the spec |
| AC2 | SC10: bundle + manifest include sharpen/procedure copies; docs/bundle.md lists them; validate+test pass | pass | 48e1949 | `tools/validate/bundle.json` lists both `sharpen` and both procedure copies; `manifest.json` hashes all four; `docs/bundle.md` lines 14–20 list them; `mise run validate` exit 0 and CI `test` success on 48e1949 (was `blocked` on the spec history walk, fixed since) |
| R1 | repository validation and test suites on `main` | pass | 48e1949 | `mise run validate` exit 0 (Overall: pass), local; CI on `main` 48e1949: `pre-commit` success, `test` success |
| V1 | self-review: docs, bundle and manifest at 48e1949 against SC9–SC10 | pass | 48e1949 | files read at 48e1949 |

## Plan

1. Docs edits.
2. Bundle definition and `docs/bundle.md`.
3. Commit assets, then regenerate and commit `manifest.json` alone.
4. Validate and test.

## Outcome

`docs/principles.md` §2 prescribes whole-frontier rounds and no longer calls `grilling` installed. ADR 0004 open questions 1 and 3 point to the spec. The bundle definition, `manifest.json` and `docs/bundle.md` cover both `sharpen` entries and both procedure copies (SC9, SC10).

## Checkpoint

- Update 2026-10-15: revalidated on `main` at 48e1949, after the spec history-walk fixes (`2026-10-14-spec-history-squash-creation`, `2026-10-14-fix-history-walk-sibling-unchanged`) cleared the spec history failure that had blocked the suites; every AC re-checked against the files at 48e1949; promoted `completed` → `verified`.
