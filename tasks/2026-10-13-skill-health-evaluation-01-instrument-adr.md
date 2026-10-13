---
schema: task/1
tier: standard
status: todo
parent: 2026-10-13-skill-health-evaluation
spec: 2026-10-13-skill-health-evaluation@1
---

# Evaluation Instrument ADR

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-13-skill-health-evaluation after spec v1 approval)

## Objective

Verify which evaluation instruments are available in the owner's Claude Code and record the instrument choice as a proposed ADR linked from D7 (spec SC8).

- In scope: a proposed ADR in `docs/decisions/`, the D7 row and diagram in `docs/decision-map.md`, this record.
- Out of scope: editing any skill instruction file (spec SC6); changes to the approved spec or accepted ADRs.

## Acceptance criteria

- AC1 = SC8: proposed ADR records chosen runner, alternatives, relation to autoresearch, and is linked from the decision map under D7.
- AC2: availability of `claude plugin eval`, `skill-creator` and `/skill-doctor` is recorded with the observed evidence (command output or its absence).

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | c039980 | parent B1/B2: `mise run validate` exit 0, `mise run test` 227 pass |
