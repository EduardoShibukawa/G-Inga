---
schema: task/1
tier: standard
status: verified
verified_at: "9339809"
---

# Intake and Catalog G-Ingá Autoresearch Program

## Routing and approvals

- tier: standard (S1 holds: clear outcome of ingesting, cataloging, and cross-referencing the Autoresearch Program research procedure; S2 holds: follows established docs/research and task patterns; S3 holds: bounded documentation addition without touching V1 runtime bundle or spec hashes; S4 holds: two-way door)
- approved: standard procedure by owner (2026-10-11, "vamos")

## Objective

Ingest the proposed research procedure `G-INGA-AUTORESEARCH-PROGRAM.md` from the owner download into the canonical repository documentation (`docs/research/autoresearch-program.md`), update documentation navigation indexes, catalog Karpathy's autoresearch reference in `docs/research/reference-index.md`, and record the baseline for the first candidate experiments.

- In scope:
  - Copy and canonicalize `G-INGA-AUTORESEARCH-PROGRAM.md` into `docs/research/autoresearch-program.md`.
  - Update `docs/README.md` to index the new autoresearch program document under Research & Evidence.
  - Update `docs/research/reference-index.md` adding Andrej Karpathy's autoresearch repository reference.
  - Run canonical validation and test suites (`mise run validate` and `mise run test`).
- Out of scope:
  - Modifying product runtime code or V1 bundle.
  - Modifying approved V1 specification or specification hash.
  - Executing actual autoresearch candidate loops or experiments (which will have their own task records).

## Acceptance criteria

- AC1: `docs/research/autoresearch-program.md` contains the canonicalized text of the Autoresearch Program with correct repository internal links and references.
- AC2: `docs/README.md` includes `docs/research/autoresearch-program.md` in its document map under Research & Evidence.
- AC3: `docs/research/reference-index.md` catalogs `karpathy/autoresearch` with URL, context, consultation status, and relationship to G-Ingá evaluation.
- AC4: Canonical validation (`mise run validate`) and test suite (`mise run test`) pass with exit 0.

## Plan

1. Record baseline check suite on branch `docs/autoresearch-program-intake` (B1).
2. Create `docs/research/autoresearch-program.md` from `/home/tg/Downloads/G-INGA-AUTORESEARCH-PROGRAM.md`.
3. Update `docs/README.md` and `docs/research/reference-index.md`.
4. Run canonical validation suite and test suite.
5. Record verification results, update task record, and prepare PR.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation suite | pass | 33a2b38 | `mise run validate` (exit 0) & `mise run test` (115 pass) on main |
| AC1 | canonicalized autoresearch doc | pass | 9339809 | docs/research/autoresearch-program.md created with repo links |
| AC2 | docs index updated | pass | 9339809 | docs/README.md §5 updated with autoresearch program link |
| AC3 | reference index updated | pass | 9339809 | docs/research/reference-index.md §12 catalogs karpathy/autoresearch |
| AC4 | validation & test suites | pass | 9339809 | `mise run validate` (exit 0) & `mise run test` (115 pass) |
| V1 | diff review against V1 governance | pass | 9339809 | doc changes only; no bundle or spec hash modified |

## Outcome

The G-Ingá Autoresearch Program has been incorporated into canonical repository documentation under `docs/research/autoresearch-program.md`, cross-referenced in `docs/README.md`, and its external reference (`karpathy/autoresearch`) cataloged in `docs/research/reference-index.md` §12. Canonical validation and test suites pass cleanly.

## Checkpoint

- as of: 2026-10-11, branch docs/autoresearch-program-intake, head 9339809, task verified
- done: autoresearch program ingested, indexed, and cataloged; full validation suite passed; verified commit recorded
- next: commit task verification update, push branch to origin, and create PR for owner review
