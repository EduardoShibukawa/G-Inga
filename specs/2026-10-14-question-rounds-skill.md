---
schema: spec/1
status: draft
version: 1
---

# G-Ingá Question Rounds

## Problem

The owner retired the Pocock plugin (ADR 0007). Its two most used skills, `grilling` (35 uses) and `domain-modeling` (30 uses), have no G-Ingá replacement (friction F-001, F-002). `work/heavy.md` step 2 names "structured question rounds" without a procedure, and there is no way to stress-test an idea outside a confirmed `heavy` task.

## Expected behavior

To be settled in the question rounds recorded in `tasks/2026-10-14-question-rounds-skill.md`.

## Scope

To be settled in the question rounds.

## Acceptance criteria

To be settled in the question rounds.

## Interfaces and dependencies

- ADR 0004 items 3, 5 and 6; D5 items 3 and 6.
- ADR 0009 model policy.
- Upstream technique source: `mattpocock/skills` at `49dd158`, `skills/productivity/grilling/SKILL.md` and `skills/engineering/domain-modeling/SKILL.md`.

## Decisions

None yet.

## Risks and constraints

- Every-turn token cost of a new skill description (ADR 0002 §8): prefer user-invoked only.
- Name must not collide with upstream skill names (ADR 0004, D5 item 3).

## Verification

To be settled in the question rounds.

## Rollback

Remove the skill and revert `work/heavy.md` step 2.

## Open questions

1. ADR 0004 OQ1: whole frontier per round or one question at a time.
2. ADR 0004 OQ3: glossary as a plain repository doc or none.
3. Plugin bundle or repository-only.

## Revisions

None.
