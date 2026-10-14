---
name: work
description: Primary SDLC harness entry point for G-Ingá on Antigravity. Dispatches work across light, standard, and heavy ceremony tiers and handles resumption.
disable-model-invocation: true
---

# /work — G-Ingá SDLC Harness

Read `.agents/skills/work/references/procedure.md` and follow it for the request below. It holds the invariants, routing, escalation and the `light` procedure.

The tier files sit next to this one and are read only when the procedure routes to them:

- `.agents/skills/work/standard.md` for `standard`;
- `.agents/skills/work/heavy.md` for `heavy`, with `.agents/skills/work/review.md` for its review;
- `.agents/skills/work/resume.md` for `/work resume <task-id>`.
