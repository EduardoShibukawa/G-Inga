---
name: work
description: Primary SDLC harness entry point for G-Ingá. Dispatches work across light, standard, and heavy ceremony tiers and handles resumption.
disable-model-invocation: true
---

# /work — G-Ingá SDLC Harness

Read `.claude/skills/work/references/procedure.md` and follow it for the request below. It holds the invariants, routing, escalation and the `light` procedure.

The procedure reads these reference files, all next to it in `.claude/skills/work/references/`: `procedure.md`, `artifact-contracts.md`, `model-policy.md`, `question-rounds.md`.

The tier files sit next to this one and are read only when the procedure routes to them:

- `.claude/skills/work/standard.md` for `standard`;
- `.claude/skills/work/heavy.md` for `heavy`, with `.claude/skills/work/references/question-rounds.md` for its question rounds and `.claude/skills/work/review.md` for its review;
- `.claude/skills/work/resume.md` for `/work resume <task-id>`.
