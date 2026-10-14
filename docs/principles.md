# Working principles

**Status:** proposed. These distill the [SDLC brief](briefs/sdlc-harness-brief.md) plus takeaways from Rob Shocks' video *"Pocock vs Pstack vs Osmani: Which Skill Pack Wins?"* (<https://www.youtube.com/watch?v=sU9MW8Ycq2M>). The video notes are a secondhand summary. The pack attributions were checked against the packs' source on 2026-10-10 ([evidence](research/d2-routing-evidence.md) §6): §3, §4 and §5 are confirmed, and §1 and §2 need the corrections noted there. Each principle names where it comes from.

## 1. Ceremony matches stakes

*Source: video §"ceremony balance"; brief §4 "does not force every task through a rigid ceremony".*

A button color change shouldn't load a spec, a grill session and an adversarial review. Work runs in one of three **tiers**, chosen by risk, uncertainty and blast radius:

| Tier | Typical task | Ceremony |
|---|---|---|
| `light` | Trivial, local, reversible | Do it, run the relevant check, report the evidence. No spec, no plan. |
| `standard` | Normal feature or bug | Short task file, then a plan if needed, implementation, targeted verification. |
| `heavy` | Ambiguous, cross-cutting, risky | Grill, then spec approval, plan, implementation, adversarial review, full verification. |

The routing criteria and what each tier loads are decided in [ADR 0002](decisions/0002-ceremony-tiers-and-routing.md) (decision **D2**, `accepted`). No reference pack defines tiers like these, so this is our own synthesis ([evidence](research/d2-routing-evidence.md) §5).

## 2. Align before building on ambiguity

*Source: Matt Pocock `grilling` (retired with the Pocock plugin, [ADR 0007](decisions/0007-harness-extensions-beyond-v1.md)); brief §3 "human owns significant decisions". Style settled 2026-10-14: whole frontier of answerable questions per round, each with a recommended answer — the [question-rounds procedure](../specs/2026-10-14-question-rounds-skill.md). "One question at a time" (Osmani's `interview-me`) was the rejected alternative.*

When requirements or domain terms are ambiguous, interrogate until shared understanding exists. Ask the whole frontier of answerable questions each round — each with a recommended answer — and defer questions that depend on an open answer to a later round. Don't invent behavior.

## 3. "Build passed" is not proof

*Source: pstack (per video); brief §8 "honest verification".*

Report results as `pass` / `fail` / `blocked` / `not run`. A completion claim needs evidence that exercises the acceptance criteria, not just a compiling build.

## 4. Pre-empt rationalizations

*Source: Addy Osmani `agent-skills` "anti-rationalization tables" (per video).*

Where an agent tends to skip a step, list its usual excuse with a rebuttal, for example "too simple to test" → "a one-line regression check costs less than a rework loop". Add a row only when the excuse has actually been observed (see the [friction log](friction-log.md)).

## 5. Doubt high-impact claims

*Source: "doubt-driven development" (per video); brief §3 "agent consensus is not proof".*

For `heavy` work, a separate reviewer role challenges key claims and decisions before moving on. It runs only when stakes justify the token cost.

## 6. Optimize tokens per verified task

*Source: owner priority; brief §9.*

Token economy is the top efficiency goal, measured per **verified** task. A cheap run that needs a redo costs more than a slightly dearer run that's right the first time. Cheap, deterministic verification (scripts, targeted tests) is itself a token-saving tool. What Claude Code exposes for measuring this is open decision **D4**.

## 7. Grow from friction, not from checklists

*Source: owner goal (personal, gradual, learning); [ADR 0001](decisions/0001-product-boundary.md).*

Packs are a textbook, not a religion. Add a skill, hook, script or schema only when a logged friction or explicit learning goal calls for it. Prefer native Claude Code primitives and the smallest mechanism that works.
