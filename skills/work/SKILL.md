---
name: work
description: Primary SDLC harness entry point for G-Ingá. Dispatches work across light, standard, and heavy ceremony tiers and handles resumption.
disable-model-invocation: true
---

# /work — G-Ingá SDLC Harness

Read `skills/work/references/procedure.md` and follow it for the request below. It holds the invariants, routing, escalation and the `light` procedure.

The procedure reads these reference files, all next to it in `skills/work/references/`: `procedure.md`, `artifact-contracts.md`, `model-policy.md`, `question-rounds.md`.

The tier files sit next to this one and are read only when the procedure routes to them:

- `skills/work/standard.md` for `standard`;
- `skills/work/heavy.md` for `heavy`, with `skills/work/references/question-rounds.md` for its question rounds and `skills/work/review.md` for its review;
- `skills/work/resume.md` for `/work resume <task-id>`.
