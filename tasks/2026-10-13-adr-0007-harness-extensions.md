---
schema: task/1
tier: standard
status: active
---

# Draft decision record 0007: Harness Extensions Beyond V1

## Routing and approvals

- tier: standard (S1 holds: each divergence is checkable against named repo files; S2 holds: follows the existing ADR and decision-map format; S3 holds: bounded to one new ADR, `docs/decision-map.md`, `docs/README.md`, and this record; S4 holds: two-way door, the ADR stays `proposed` until the owner decides)
- approved: owner request (2026-10-13, audit of the approved V1 spec against the repository, ticket W3 "Draft decision record 0007 harness extensions beyond V1")

## Objective

Record, in a `proposed` ADR, the divergences found by an audit of the approved V1 spec (`specs/2026-10-11-minimal-v1-specification.md@1`) against the repository, each with context, options, and a recommended decision for the owner:

1. Manifest scope covers `.agents/skills/work/**` beyond the V1 spec SC5 scope.
2. `/orchestrate` and `/drive` are model-invocable skills beyond the single V1 entry skill.
3. `/drive` depends on the external, owner-local Gira-G CLI.
4. V1 spec `## Verification` items 2 and 4 have no rows in the accepted parent task, and SC8's plugin retirement diverges from the spec's transition expectation.
5. ADR 0006 still describes ADR 0005 as `proposed`.

Also index the ADR in `docs/decision-map.md` and `docs/README.md`, and fix the stale `active` labels on accepted task records in `docs/README.md`.

- In scope:
  - `docs/decisions/0007-harness-extensions-beyond-v1.md`
  - `docs/decision-map.md`
  - `docs/README.md`
  - `tasks/2026-10-13-adr-0007-harness-extensions.md`
- Out of scope:
  - The approved spec `specs/2026-10-11-minimal-v1-specification.md` (hash-frozen) and accepted ADRs 0001–0006.
  - Accepted or verified task records, including `tasks/2026-10-11-minimal-v1-specification.md`.
  - Acting on the recommendations (skill frontmatter, `manifest.json`, `bundle.json`, `/drive` fallback); each needs owner acceptance first.

## Acceptance criteria

- AC1: `docs/decisions/0007-harness-extensions-beyond-v1.md` exists with status `proposed`, the Status/Date/Deciders/Depends on header, and Context, Problem, Decision, Alternatives, Consequences and Open questions sections covering divergences 1–5, each with options and a recommendation.
- AC2: Every factual claim in decision record 0007 matches the repository files it cites.
- AC3: `docs/decision-map.md` has a `proposed` row linking decision record 0007, and `docs/README.md` indexes decision record 0007 and labels `tasks/2026-10-11-repo-first-operating-model.md` with its real status `accepted`.
- AC4: No file outside the in-scope list changes; the approved spec and ADRs 0001–0006 are unchanged.
- AC5: `bun run validate` passes (markdown-lint, local-links, decision-records), and `bun run typecheck` and `bun run test` pass.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validate and test | pass | b1aa551 | `bun run validate` Overall pass (decision-records: 6 ADRs, 8 map rows); `bun run typecheck` pass; `bun run test` 220 pass, 0 fail. Full history (`git rev-parse --is-shallow-repository` false). mise not installed; Bun used directly. b1aa551 differs from 6e7af64 only in `.markdownlint.jsonc` |

## Plan

1. Open this record with the baseline.
2. Draft decision record 0007; add the decision-map row and `docs/README.md` entries; fix the stale status labels.
3. Run validate, typecheck and test; record results with the change commit SHA.

## Checkpoint

- as of: 2026-10-13, branch worktree-agent-a6ddbba1d1bec1974, head b1aa551, worktree clean before this record
- done: baseline recorded
- next: draft decision record 0007 and index entries
