---
schema: task/1
tier: standard
status: todo
parent: 2026-10-13-skill-health-evaluation
spec: 2026-10-13-skill-health-evaluation@1
depends_on:
  - 2026-10-13-skill-health-evaluation-01-instrument-adr
  - 2026-10-13-skill-health-evaluation-02-trigger-cases
  - 2026-10-13-skill-health-evaluation-03-conformance-cases
---

# Skill Health Baseline Run

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-13-skill-health-evaluation after spec v1 approval)

## Objective

Provide one documented command that runs the suite under the USD 5 ceiling, execute the phase 1 baseline once, and record aggregated results in the autoresearch ledger (spec SC2, SC3, SC5, SC6, SC7).

- In scope: a `mise` task, `.gitignore` for raw results, ledger rows in `records/autoresearch-ledger.tsv`, this record.
- Out of scope: editing any skill instruction file (spec SC6); changes to the approved spec or accepted ADRs.

## Acceptance criteria

- AC1 = SC7: a single documented command reruns the suite with `--max-cost-usd 5`; unexecuted cases report `blocked` or `not run`.
- AC2 = SC2, SC3: baseline run executed once; per-skill trigger and conformance results recorded.
- AC3 = SC5: ledger rows appended with existing columns; raw results ignored by git, no prompts or transcripts committed.
- AC4 = SC6: skill instruction files and their manifest hashes unchanged versus c039980.
- AC5: evaluation files stay outside the distributed bundle scope.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | c039980 | parent B1/B2: `mise run validate` exit 0, `mise run test` 227 pass |
