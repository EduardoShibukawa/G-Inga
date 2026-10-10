# Brand and roadmap narrative

**Status:** proposed (2026-10-10). Nothing here is an accepted decision, a feature commitment, or a release plan.

## Identity

- **Owner-declared:** the name `G-Ingá` combines *ginga* (the swaying base movement of capoeira; adaptation and movement) with Ingá and Maringá, in Paraná, Brazil.
- **Context (agent-researched, owner to confirm the intended reading):** the Parque do Ingá is a central urban park in Maringá ([local news coverage](https://www.bemparana.com.br/noticias/parana/cidadesdoparana/mp-arquiva-investigacao-sobre-concessao-do-parque-do-inga-e-aponta-ausencia-de-irregularidades/), seen only through a search summary, not opened). *Ingá* is also the common name of the *Inga* trees.
- **Character:** a Brazilian project that adapts to the task in front of it rather than forcing one rigid process. That's the same idea as [principles](principles.md) §1, "ceremony matches stakes".

## Three things that stay separate

| Concern | What it is | Source of truth |
|---|---|---|
| Brand narrative and codenames | Story and vocabulary for talking about the project's phases | this document, `proposed` |
| Milestones (M0–M6) | Internal plan, advanced by evidenced exit criteria | [SDLC brief](briefs/sdlc-harness-brief.md) §10, [decision map](decision-map.md) |
| Versions and channels | SemVer `MAJOR.MINOR.PATCH`. `stable`/`experimental` channels are deferred by [ADR 0001](decisions/0001-product-boundary.md) | release tags, once releases exist |

Rules (proposed):

1. Codenames never appear in version strings, git tags, package or plugin names, config keys, file paths or APIs.
2. A codename never implies scope. Features enter through the decision map and the friction log, never because a name suggests them.
3. Codenames don't map one-to-one to M0–M6. Milestones are evidence gates; codenames are storytelling.

## Candidate codename family

These are a creative hypothesis. The "possible theme" column is a story, not scope.

| Name | Meaning | Possible theme | Notes |
|---|---|---|---|
| **Broto** | sprout, bud | birth and early experimentation (the current M0–M2 period) | Fits now. Low risk. |
| **Ginga** | capoeira's base movement | first stable milestone: adaptive workflows, verified delivery | Redundant with the product name ("G-Ingá Ginga"). Also a well-known Brazilian software name: the digital-TV middleware standard of Brazil's SBTVD, also ITU-T H.761 ([Wikipedia](https://en.wikipedia.org/wiki/Ginga_(middleware)), [SBC paper](https://sol.sbc.org.br/index.php/webmedia/article/view/8031); seen through search results, pages not opened). Strong reason not to use it as a release codename. |
| **Banzeiro** | river waves and turbulence left by boats (Amazon usage) | wider flows, operational feedback, diagnosis | Evocative for incidents. Regional; may need explaining. |
| **Roda** | capoeira or samba circle | collaboration and independent review between agents | Generic word, so likely name collisions. Multi-agent work isn't in scope (brief §3: "do not delegate by default"). |
| **Trama** | weave; also "plot/scheme" | connected context across projects, contracts and dependencies | Matches the deferred context map (ADR 0001). The "scheme" connotation is mildly negative. |
| *Mandacaru* | caatinga cactus that thrives with little water | inspiration only: doing more with fewer tokens | No module. Keep as a metaphor for token economy. |
| *Sanfona* | accordion that expands and contracts | inspiration only: ceremony and context that scale with the task | No module. Overlaps with *ginga* as "adaptation". |

Observations:

- The family mixes themes: capoeira (Ginga, Roda), nature (Broto, Mandacaru), water (Banzeiro), craft (Trama), music (Sanfona). That's fine for a narrative, but less memorable than one theme.
- "Ginga", "Sanfona" and the product name all carry the idea of adaptation. Using all three dilutes it.
- Banzeiro, Roda and Trama describe capabilities that are currently deferred or out of scope. They stay story only unless a logged friction brings that capability in.

## Options for how codenames attach

| Option | Description | Trade-off |
|---|---|---|
| **1. Narrative only (recommended now)** | Names describe eras in docs and talks. Nothing technical carries them | Zero coupling. Easy to rename or drop |
| 2. Major release lines | Each future `MAJOR` gets a name, like Debian or Android | Needs a stable release first. Ties a name to scope once chosen |
| 3. Milestones | M-numbers get names | Conflicts with evidence-gated milestones. Rejected |

Recommendation: option 1 now. Use "Broto" informally for the current phase if the owner likes it. Reconsider option 2 only after a first stable release exists.

## Before any public adoption

`not run` so far. Before any name becomes public and final, check:

- GitHub org and repo names, and the Claude Code plugin and marketplace names.
- Package registries the project might publish to.
- Domains.
- Trademark conflicts in the relevant classes, at least INPI (Brazil), and USPTO/EUIPO if distribution goes beyond Brazil.
- Unwanted meanings or connotations in Portuguese and English.

The check covers `G-Ingá` itself, its ASCII form `g-inga`, and every codename kept.
