---
schema: task/1
tier: standard
status: todo
parent: 2026-10-13-skill-health-evaluation
spec: 2026-10-13-skill-health-evaluation@1
---

# Skill Conformance Evaluation Cases

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-13-skill-health-evaluation after spec v1 approval)

## Objective

Author behavioral conformance cases for the three skills with deterministic graders wherever possible (spec SC1 behavioral part, SC3 case design).

- In scope: conformance cases under `evals/conformance/`, this record.
- Out of scope: editing any skill instruction file (spec SC6); changes to the approved spec or accepted ADRs.

## Acceptance criteria

- AC1 = SC1 (behavioral part): each skill has at least two behavioral cases, each stating expected outcome and grader type.
- AC2 = SC3 (design): cases cover light persists zero files under `tasks/` and `specs/`; standard yields a record the validator accepts; heavy stops for owner confirmation before creating children.
- AC3: model-graded checks are used only where no deterministic check exists and are labeled model-graded.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | c039980 | parent B1/B2: `mise run validate` exit 0, `mise run test` 227 pass |
