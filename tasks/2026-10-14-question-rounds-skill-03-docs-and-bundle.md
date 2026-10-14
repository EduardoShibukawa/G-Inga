---
schema: task/1
tier: standard
status: completed
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
| AC1 | SC9: principles §2 whole-frontier, no "grilling installed"; ADR 0004 OQ1/OQ3 → spec | pass | 27a3755 | `docs/principles.md` §2, `docs/decisions/0004-reuse-strategy-for-existing-skills.md` OQ1+OQ3 |
| AC2 | SC10: bundle + manifest include sharpen/procedure copies; docs/bundle.md lists them; validate+test pass | blocked | 5031625 | bundle.json scope+assets, docs/bundle.md, manifest.json regenerated (two-commit), validator rebuilt, `manifest --check` pass, `bundle.test.ts` 33/33. `mise run validate`/`test` still exit 1 on pre-existing spec history walk (`specs/2026-10-14-question-rounds-skill.md` created as `approved`, child 01 squash merge) |

## Plan

1. Docs edits.
2. Bundle definition and `docs/bundle.md`.
3. Commit assets, then regenerate and commit `manifest.json` alone.
4. Validate and test.
