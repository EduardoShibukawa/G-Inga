---
schema: task/1
tier: standard
status: verified
verified_at: "a2bba4a"
---

# Draft ADR 0007: Harness Extensions Beyond V1

## Routing and approvals

- tier: standard (S1 holds: each divergence is checkable against named repo files; S2 holds: follows the existing ADR and decision-map format; S3 holds: bounded to one new ADR, `docs/decision-map.md`, `docs/README.md`, and this record; S4 holds: two-way door, the ADR stays `proposed` until the owner decides)
- approved: owner request (2026-10-13, audit of the approved V1 spec against the repository, ticket W3 "Draft ADR 0007 harness extensions beyond V1")

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
- AC2: Every factual claim in ADR 0007 matches the repository files it cites.
- AC3: `docs/decision-map.md` has a `proposed` row linking ADR 0007, and `docs/README.md` indexes ADR 0007 and labels `tasks/2026-10-11-repo-first-operating-model.md` with its real status `accepted`.
- AC4: No file outside the in-scope list changes; the approved spec and ADRs 0001–0006 are unchanged.
- AC5: `bun run validate` passes (markdown-lint, local-links, decision-records), and `bun run typecheck` and `bun run test` pass.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validate and test | pass | b1aa551 | `bun run validate` Overall pass (decision-records: 6 ADRs, 8 map rows); `bun run typecheck` pass; `bun run test` 220 pass, 0 fail. Full history (`git rev-parse --is-shallow-repository` false). mise not installed; Bun used directly. b1aa551 differs from 6e7af64 only in `.markdownlint.jsonc` |
| AC1 | ADR 0007 drafted as proposed | pass | a2bba4a | header has Status `proposed`, Date, Deciders, Depends on; sections Context, Problem, Decision, Alternatives considered, Consequences, Open questions cover items 1–5 with options and a recommendation each |
| AC2 | factual claims checked | pass | a2bba4a | checked against `bundle.json` (15 assets), `manifest.json`, SKILL.md frontmatter (descriptions 134/173/267 chars on Claude Code, 149 for Antigravity `/work`, all `disable-model-invocation: false`), `gira.yaml`, macro map (357 `commit_sha`, all `47cc03d`), `git rev-list` (12 commits, 8 non-merge, 47cc03d..b1aa551), parent task rows, ADR 0004 §7, ADR 0005 §1 and Alternatives B and D, ADR 0006 header |
| AC3 | decision map and docs index | pass | a2bba4a | D8 row `proposed` links ADR 0007 under "Not on the V1 path"; `docs/README.md` indexes ADR 0007 and labels both accepted task records `accepted` (the parent record on line 31 was also stale) |
| AC4 | scope bounded | pass | a2bba4a | `git diff --stat 86c9c27..a2bba4a` touches only the 4 in-scope files; spec and ADRs 0001–0006 unchanged |
| AC5 | validate, typecheck, test | pass | a2bba4a | `bun run validate` Overall pass (markdown-lint, local-links, decision-records 7 ADRs and 9 map rows); `bun run typecheck` exit 0; `bun run test` 220 pass, 0 fail |
| V1 | diff review against ticket and governance | pass | a2bba4a | self-review of `86c9c27..a2bba4a`: ADR stays `proposed`, no edit to the approved spec, ADRs 0001–0006 or accepted task records; recommendations need owner acceptance before any follow-up task |

## Plan

1. Open this record with the baseline.
2. Draft ADR 0007; add the decision-map row and `docs/README.md` entries; fix the stale status labels.
3. Run validate, typecheck and test; record results with the change commit SHA.

## Outcome

ADR 0007 (`proposed`) records five divergences between the approved V1 spec and the repository and recommends, per item: accept the `.agents/skills/work/**` manifest scope as a recorded SC5 deviation; keep `/orchestrate` and `/drive` outside the bundle and make them user-invocable; treat Gira-G as optional with a `not run` fallback and a staleness rule; run spec Verification items 2 and 4 in a new follow-up task and ratify the Pocock plugin retirement; leave ADR 0006's stale label as a note. The decision map gains row D8, and `docs/README.md` indexes the ADR with corrected task statuses. Nothing is enacted until the owner accepts.

## Checkpoint

- as of: 2026-10-13, branch worktree-agent-a6ddbba1d1bec1974, head a2bba4a, task verified
- done: drafted ADR 0007, added D8 row and docs index entries, fixed stale task labels, verified AC1–AC5
- next: owner review of ADR 0007 per item; on acceptance, open the follow-up tasks it names
