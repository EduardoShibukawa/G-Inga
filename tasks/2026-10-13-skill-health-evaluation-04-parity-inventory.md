---
schema: task/1
tier: standard
status: todo
parent: 2026-10-13-skill-health-evaluation
spec: 2026-10-13-skill-health-evaluation@1
---

# Cross-Host Skill Parity Inventory

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-13-skill-health-evaluation after spec v1 approval)

## Objective

Inventory every difference between the Claude Code and Antigravity copies of the three skills and classify each as host adaptation or drift (spec SC4).

- In scope: a research note under `docs/research/`, this record.
- Out of scope: editing any skill instruction file (spec SC6); changes to the approved spec or accepted ADRs.

## Acceptance criteria

- AC1 = SC4: every textual difference is listed and classified host adaptation or drift with a one-line reason.
- AC2: drift items are listed as follow-up candidates; no skill file changes.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | c039980 | parent B1/B2: `mise run validate` exit 0, `mise run test` 227 pass |
