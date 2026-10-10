# Decision map

Open and settled decisions needed for a minimal V1. Status values are `proposed`, `accepted`, `rejected`, `superseded` and `open`. A decision becomes `accepted` only with the owner's explicit approval.

```mermaid
flowchart TD
    D1["D1 Product boundary"] --> D2["D2 Ceremony tiers and routing"]
    D1 --> D6["D6 Reuse strategy for existing skills"]
    D2 --> D3["D3 Artifact schemas: task, spec, checkpoint, evidence"]
    D4["D4 Token and cost observability"] --> D7["D7 Evaluation approach"]
    D2 --> D5["D5 Native primitive mapping"]
    D3 --> D5
    D6 --> D5
    D5 --> V1["Minimal V1 spec ready for approval"]
    D7 --> V1
```

| ID | Decision | Status | Depends on | Record / next step |
|---|---|---|---|---|
| D1 | Product boundary: personal SDLC harness first, context map deferred | accepted | none | [ADR 0001](decisions/0001-product-boundary.md) |
| D2 | Ceremony tiers (`light` / `standard` / `heavy`): routing criteria and what each tier loads | accepted | D1 | [ADR 0002](decisions/0002-ceremony-tiers-and-routing.md), evidence in [research note](research/d2-routing-evidence.md). Follow-ups in the ADR are open but don't block |
| D3 | Minimal schemas and state transitions for task, spec, checkpoint and evidence | accepted | D2 | [ADR 0003](decisions/0003-minimum-artifact-schemas.md), field-level [artifact contracts](artifact-contracts.md), evidence in [research note](research/d3-artifact-evidence.md). Revised after review (parent lifecycle, spec versions, verification commits, downgrade, history checks), then accepted. Follow-ups in the ADR are open but don't block |
| D4 | Which token/cost signals Claude Code exposes locally (`/cost`, session transcripts, OpenTelemetry, statusline input) | open | none | Research against current official docs. Can run now, in parallel. Its answer sets the numeric budget limits that ADR 0003 leaves unset |
| D5 | Which parts are skills, hooks, scripts, subagents or `CLAUDE.md` | open | D2, D3, D6 | Waits on D6. Smallest mechanism per need. Keep the fixed per-turn routing cost small (ADR 0002 §8). Also decides where `tasks/` and `specs/` live in a target repo and how the ADR 0003 validator runs |
| D6 | Reuse of Matt Pocock skills: depend on the installed plugin, vendor copies, or write our own | open | D1 | **Next blocking** (the last input D5 waits on). Compare against token cost and the owner's customizations, and against the ADR 0003 contracts: Pocock's `to-spec` and `to-tickets` write formats that lack states, versions and evidence |
| D7 | Evaluation: friction log plus matched before/after comparisons; PetClinic optional | open | D4 | Define the smallest repeatable comparison |

## Not on the V1 path

| ID | Topic | Status | Record |
|---|---|---|---|
| B1 | Brand narrative and codename policy (codenames kept separate from milestones and SemVer) | proposed | [brand-and-roadmap.md](brand-and-roadmap.md). Doesn't block V1 |

## Deferred, not rejected

These stay deferred until a logged friction justifies them: plugin packaging and installer, stable/experimental channels, the multi-repo context map, PetClinic as a mandatory lab, global learning promotion and OKF adoption.
