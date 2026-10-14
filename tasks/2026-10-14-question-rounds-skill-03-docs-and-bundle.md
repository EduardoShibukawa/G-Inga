---
schema: task/1
tier: standard
status: todo
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

## Plan

1. Docs edits.
2. Bundle definition and `docs/bundle.md`.
3. Commit assets, then regenerate and commit `manifest.json` alone.
4. Validate and test.
