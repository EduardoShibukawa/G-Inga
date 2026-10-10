# Brand and naming

**Status:** proposed (2026-10-10, revised with the founder's clarification). The name `G-Ingá` is the founder's preferred project name, pending the checks at the end of this document. Every other association here is a proposal. Nothing in this document is an accepted decision, a feature commitment or a release plan.

## Why these names

The founder is Brazilian, lives in Maringá, Paraná, loves Brazilian music across genres, and enjoys the humor and creativity of the Brazilian animated series *Irmão do Jorel*. The names come from that personal ground. They aren't Brazilian words used as decoration.

The voice should feel Brazilian, inventive, warm, resourceful and technically serious. Avoid generic AI branding, national stereotypes and shallow use of culture. Treat capoeira, a living Afro-Brazilian practice, with respect. *Irmão do Jorel* inspires tone only: no characters, names or imagery from that third-party work are used.

## How to read this document

For each name there are three kinds of statement:

- **Cultural fact:** what the word means and where it comes from. Each one says how it was checked:
  - *corroborated*: confirmed in this session through web search results, with the sources cited.
  - *founder-provided*: given by the founder with a reference. Not independently checked in this session.

  The founder's reference links couldn't be opened from this session's environment because the network policy blocked them. They're kept as the primary references.
- **Intended metaphor:** what the founder wants the name to evoke for G-Ingá. This is a creative choice, not a fact.
- **Possible association:** a phase or capability the name could label. Always `proposed`.

## Naming rules (proposed)

1. **Versioning is independent.** Releases use SemVer. Codenames never appear in version strings, git tags, package or plugin names, config keys, file paths or APIs.
2. **Channels.** If release channels are introduced, `stable` and `experimental` are the only ones. [ADR 0001](decisions/0001-product-boundary.md) defers channels until a logged friction justifies them.
3. **No release has to have a codename.** That includes major releases.
4. **Names don't set scope.** A codename never determines scope, priority or acceptance criteria. Features enter through the [decision map](decision-map.md) and the [friction log](friction-log.md). Never create a module, workflow or feature just to give a name a technical purpose.
5. **Names are separate from the internal plan.** A name may label a public release or era once it's reached. It never replaces or defines the internal M0–M6 milestones, which advance on evidenced exit criteria (see the [SDLC brief](briefs/sdlc-harness-brief.md) §10).
6. **Keep meanings distinct.** Don't use two names for the same idea.

## Overview

| Name | Literal meaning | Intended metaphor | Possible association (`proposed`) |
|---|---|---|---|
| G-Ingá | coined: *ginga* + *Ingá* | Brazilian identity, adaptive and grounded | the product |
| Broto | sprout | early growth | bootstrap and experimentation |
| Ginga | capoeira's base movement | adaptive movement with balance and purpose | first stable milestone, or the core philosophy |
| Banzeiro | waves on Amazonian rivers | propagation and consequential movement | operational feedback and cross-system effects |
| Roda | circle; the capoeira circle | shared practice and collective learning | collaboration and independent review |
| Trama | weave; plot | interwoven relationships | cross-project context and architecture mapping |
| Mandacaru | Caatinga cactus | resilience under constraints | resource-aware recovery |
| Sanfona | Brazilian accordion | controlled expansion and contraction | adaptive effort and context |
| Cadência | cadence, rhythm | rhythm and pacing | execution discipline |
| Canção | song | music and Maringá's identity | brand storytelling |

## The names

### G-Ingá

- **Cultural fact:** a coined wordplay, not an official etymology or a technical term. It joins:
  - ***ginga*** (see Ginga below).
  - ***Ingá***. The founder means the connection to Maringá and the Parque do Ingá. Corroborated: the Parque do Ingá is a central urban park in Maringá ([local news](https://www.bemparana.com.br/noticias/parana/cidadesdoparana/mp-arquiva-investigacao-sobre-concessao-do-parque-do-inga-e-aponta-ausencia-de-irregularidades/)).
  - *Ingá* is also the common name of the *Inga* trees (*ingazeiros*). Maringá's own name traces to a song about "Maria do Ingá" (see Canção).
- **Intended metaphor:** an adaptive engineering harness that helps agents read their surroundings, pick a fitting workflow, adapt when evidence changes, and deliver verifiable results within clear boundaries.

### Broto

- **Cultural fact** (founder-provided, [Priberam](https://dicionario.priberam.org/broto)): a sprout, or the early development of a plant, shoot, leaf or flower.
- **Intended metaphor:** the project's first growth. The minimal foundation is built by hand, early workflows get tried out, and the harness slowly starts supporting its own development.
- **Possible association:** the bootstrap and early experimental phase. It implies no feature and no version number.

### Ginga

- **Cultural fact** (founder-provided, [Priberam](https://dicionario.priberam.org/ginga)): in capoeira, the ginga is the continuous, fundamental body movement. It lets the player:
  - shift position and stay ready;
  - respond to the other player;
  - move between possible actions.

  It combines rhythm, coordination, flexibility, balance and tactical awareness. It isn't just dancing or aimless movement: it's the base the capoeira game grows from.
- **Context** (corroborated): UNESCO describes capoeira as an Afro-Brazilian practice that is at once a fight and a dance ([UNESCO](https://ich.unesco.org/RL/00892)).
- **Intended metaphor:** the harness adapts its process to the task without losing its objective, its safety boundaries or its engineering discipline. Examples:
  - A small, reversible bug fix doesn't need an elaborate architectural process.
  - A risky change triggers deeper investigation and stronger verification.
  - New evidence can change the implementation strategy.
  - When a task can't be finished safely, the agent stops, preserves state and explains the blocker.

  This is the idea behind [principles](principles.md) §1 and the tiers in [ADR 0002](decisions/0002-ceremony-tiers-and-routing.md). Don't reduce ginga to a generic synonym for "agility".
- **Possible association:** the first stable milestone, or the product's core adaptive philosophy.
- **Notes:**
  - As a release name, "G-Ingá Ginga" repeats the root. Using Ginga for the philosophy avoids that.
  - "Ginga" is already a known Brazilian software name: the middleware standard of Brazil's digital TV system, ITU-T H.761 ([Wikipedia](https://en.wikipedia.org/wiki/Ginga_(middleware)), seen through search results). Include it in the name checks.

### Banzeiro

- **Cultural fact** (corroborated, [Portal Amazônia](https://portalamazonia.com/amazonia/portal-amazonia-responde-o-que-sao-os-banzeiros/), also founder-provided with [Priberam](https://dicionario.priberam.org/banzeiro)):
  - It's a regional Amazonian word for waves or undulations on a river. Elsewhere in Brazil the same thing is usually just called *onda*.
  - Portal Amazônia names wind as the main cause. Other accounts also mention passing boats.
  - Banzeiros can be strong enough to make a crossing dangerous.

  Ginga is purposeful movement. A banzeiro is waves spreading through an environment.
- **Intended metaphor:** reasoning about broader consequences and feedback across the lifecycle. Examples:
  - how a change spreads across components and contracts;
  - linking deployments to observed behavior;
  - turning operational signals and incident findings into engineering tasks;
  - feeding verified operational evidence back into decisions.
- **Possible association:** a future release or milestone that extends the harness toward operational feedback, impact analysis and cross-system flows. That doesn't place these capabilities in V2 or justify building them.

### Roda

- **Cultural fact** (corroborated, [UNESCO](https://ich.unesco.org/RL/00892), [Committee decision 9.COM 10.8](https://ich.unesco.org/en/decisions/9.COM/10.8)):
  - *Roda* means circle.
  - In the roda de capoeira, two players play in the center. The surrounding group sings, claps, plays instruments and sustains the rhythm.
  - The circle includes a master who carries and guards its knowledge. It's a place where knowledge is learned by observation and imitation.
  - UNESCO inscribed the capoeira circle on the Representative List of the Intangible Cultural Heritage of Humanity in 2014.
- **Intended metaphor:** collaboration among specialized agents and humans, with clear responsibilities, independent reviews and shared evidence. Agent consensus never proves correctness by itself. Independent verification is still required.
- **Possible association:** future capabilities for structured collaboration and independent assessment.
- **Note:** delegation isn't a default today (SDLC brief §3).

### Trama

- **Cultural fact** (founder-provided, [Priberam](https://dicionario.priberam.org/trama)): the interwoven threads of a textile, a structure made by crossing elements, or the connected sequence of events in a story. It can also mean a plot in the sense of a scheme.
- **Intended metaphor:** relationships across repositories, services, APIs, events, dependencies, architecture decisions and documentation. The point is evidence-backed connections that keep provenance, freshness and uncertainty, not a big graph for its own sake.
- **Possible association:** a future context and architecture-mapping capability, only if evaluation shows it's worth the complexity. ADR 0001 defers the context map.

### Mandacaru

- **Cultural fact** (corroborated, [Embrapa](https://www.infoteca.cnptia.embrapa.br/bitstream/doc/951853/1/CIT12002.pdf), [Revista Caatinga](https://doaj.org/article/bcb90f8b977e4f80832c00d1a49a8ca3), plus the founder's reference, [Fundaj](https://pesquisaescolar.fundaj.gov.br/pt-br/artigo/mandacaru/)):
  - Mandacaru (mainly *Cereus jamacaru*) is a tall columnar cactus native to Brazil's semi-arid Caatinga.
  - It tolerates low rainfall and stores water.
  - It's a recognizable part of the Caatinga landscape.
- **Intended metaphor:** resilience under constraints. Examples: budget-aware execution, safe recovery after an interruption, and graceful handling of tools that aren't available.
- **Possible association:** a future concept, workflow or milestone. No separate module is approved.

### Sanfona

- **Cultural fact** (founder-provided, [Priberam](https://dicionario.priberam.org/sanfona)): a Brazilian instrument related to the accordion, closely tied to traditions such as forró. Its bellows expand and contract as it's played.
- **Intended metaphor:** adjusting the depth and effort of a workflow to the task. Examples:
  - expanding investigation when uncertainty rises;
  - running lighter for low-risk changes;
  - putting more verification into high-impact changes;
  - managing context and effort deliberately.

  It's never permission to drop mandatory safety checks when budgets are tight.
- **Possible association:** a future concept or internal name. No module is approved.

### Cadência

- **Cultural fact** (founder-provided, no reference): rhythmic movement, flow, or a pattern of progression. It also has musical meanings.
- **Intended metaphor:** keeping an appropriate pace: coordinating implementation and verification, and stopping repeated work that no longer produces useful evidence.
- **Possible association:** a candidate name only. That responsibility belongs in the core workflow, so it doesn't get a separate component.

### Canção

- **Cultural fact** (corroborated, IBGE municipal history ([PDF](https://www.ibge.gov.br/biblioteca/visualizacao/dtb/parana/maringa.pdf)), [UEPG article](https://revistas.uepg.br/index.php/folkcom/article/download/18845/209209214776/209209238742), plus the founder's reference, the [Maringá city council](https://sapl.cmm.pr.gov.br/ta/195/text)):
  - *Canção* means song.
  - Maringá's name is linked to the song "Maringá" (1931) by Joubert de Carvalho. The song tells of "Maria do Ingá", a young woman from Pombal, Paraíba.
  - The city is nicknamed *Cidade Canção*, "Song City".
  - Accounts differ on how deliberately the song came to name the city. The UEPG article argues it wasn't composed for that purpose.
- **Intended metaphor:** composing one coherent engineering process from several specialized practices, where different workflows and checks add up to one verified result.
- **Possible association:** mainly brand storytelling. No module or release.

## Observations

- The names come from four areas of Brazilian life: capoeira (Ginga, Roda), nature (Broto, Mandacaru, Banzeiro), music (Sanfona, Cadência, Canção) and craft (Trama). That's coherent as a portrait of the founder's references, not as one single theme.
- Ginga, Sanfona and Cadência sit close together, and each keeps a distinct focus:
  - **Ginga:** purposeful adaptation, the philosophy.
  - **Sanfona:** how much effort and context to use.
  - **Cadência:** pacing.

  Keep those focuses when writing about them.
- Banzeiro, Roda and Trama describe capabilities that are deferred or out of scope today. They stay narrative until evidence brings those capabilities in.

## Before public adoption

`not run` so far. Before any name becomes public and final, check:

- GitHub organization and repository names, and Claude Code plugin and marketplace names.
- Package registries the project might publish to.
- Domains.
- Trademark conflicts in the relevant classes: at least INPI (Brazil), plus USPTO and EUIPO if distribution goes beyond Brazil.
- Existing software with the same name (for example, Ginga's digital-TV middleware).
- Unwanted meanings in Portuguese and English.

The check covers `G-Ingá`, its ASCII form `g-inga`, and every codename kept.
