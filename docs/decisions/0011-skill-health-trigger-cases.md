# 0011 — Skill-health trigger cases under user-invoked skills

- **Status:** proposed
- **Date:** 2026-10-15
- **Deciders:** project owner
- **Depends on:** [ADR 0010](0010-user-invoked-entry-skills.md) (`accepted`) and [ADR 0008](0008-skill-evaluation-instrument.md) (`accepted`), D7 on the [decision map](../decision-map.md).
- **Spec:** [Skill Health Evaluation](../../specs/2026-10-13-skill-health-evaluation.md) v1, criterion SC1.

## Context

ADR 0010 made every G-Ingá skill user-invoked (`disable-model-invocation: true`): a model-initiated `Skill` call is now a defect, never a pass. The Skill Health Evaluation spec's SC1 still requires "at least one should-fire … trigger case" per skill, which is no longer satisfiable — nothing should make the model invoke a G-Ingá skill by name.

The follow-up task `2026-10-14-evals-user-invoked-skills` (merged as PR #58) retired the three should-fire trigger cases and retyped the conformance cases to slash commands. ADR 0008's Consequences already note that trigger-accuracy cases no longer apply.

## Decision

1. SC1's "should-fire" trigger-case requirement is retired. It is replaced by the invariant that no trigger case may score a model-initiated `Skill` call to a G-Ingá skill as a pass.
2. The trigger suite keeps its "should-not-fire" and "near-miss" cases, re-read as "no spurious invocation": the model must not invoke a G-Ingá skill even for on-topic or borderline requests.
3. Behavioral conformance is exercised by typed slash commands (`/work …`, `/drive …`, `/orchestrate …`), not by model-initiated invocation.
4. The spec text stays unchanged, as ADR 0007 and ADR 0010 did for their deviations. SC1's amendment is recorded here until the spec is next reopened.

## Consequences

- The trigger-accuracy dimension of the Skill Health Evaluation baseline narrows to "no spurious invocation": there is no positive "fires when it should" signal, because firing is now owner-typed.
- SC1's coverage count no longer includes should-fire cases; a future spec v2 should drop that clause to match.

## Options considered

| Option | Why not |
|---|---|
| Reopen the spec now (draft v2, amend SC1, re-approve) | heavier than the gap warrants; no other change needs reapproval yet |
| Leave the spec and the evals untouched | the validator and future readers would see SC1 as unsatisfied |
