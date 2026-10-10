# Wayfinder Brief: System Context Harness

**Purpose of this document:** provide the initial context for a Wayfinder session using Matt Pocock's engineering skills. This is a discovery brief, not a final architecture or implementation plan. Treat every design choice below as a hypothesis unless explicitly marked as a requirement.

## 1. Destination for the Wayfinder map

Reach a decision-complete, implementation-ready specification for an MVP of a **model-agnostic System Context Harness**: a tool that builds and maintains a trustworthy, multi-repository architectural map; exposes context selectively to humans and AI coding agents; supports models with different capabilities and costs; and proves its value through measurable evaluations.

The map is complete when the important product, architecture, data-model, retrieval, human-experience, integration, evaluation, and rollout decisions have been resolved sufficiently to hand the work to `/to-spec`, then later to `/to-tickets`. The Wayfinder phase is for resolving uncertainty. **Do not implement the product during this map unless a specific prototype ticket is approved to answer a design question.**

## 2. Product thesis

Large software systems are expensive for people and coding agents to understand because relevant context is scattered across repositories, source code, API contracts, message schemas, deployment configuration, architecture decision records, and tribal knowledge.

The proposed harness creates a persistent, queryable representation of the system and supplies only the relevant slice for a question or change. It should help:

- **Humans:** understand service responsibilities, trace cross-service flows, discover ownership and contracts, explore architecture, inspect evidence, onboard to unfamiliar parts of a system, and find or improve documentation.
- **Cost-constrained and local models:** work with concise, explicit, well-structured evidence; receive narrow tools and predictable outputs; avoid reading irrelevant repositories or large files; and rely on deterministic checks where possible.
- **More capable models:** investigate ambiguous cross-service behavior, combine evidence from multiple sources, plan broad changes, and ask deeper follow-up questions without being restricted to a shallow map.

The core knowledge representation should be independent of any particular LLM vendor, coding agent, IDE, or UI. Model- and agent-specific behavior should be adapters around a shared context API, not separate copies of the system knowledge.

## 3. Desired capabilities (candidate scope, not decisions)

1. **Multi-repository inventory:** map repositories to services and logical domains, while allowing one repository to contain multiple services or one service to span multiple repositories if evidence supports it.
2. **Macro architecture map:** represent services, domains, external systems, APIs, events, data stores, documents, and typed relationships. Keep the default map at service/interface level rather than flooding it with every class or function.
3. **Evidence and provenance:** every meaningful relationship should record where it came from, the source revision, when it was checked, and whether it was declared by a person, deterministically extracted, or inferred by a model. Inferences must not silently become facts.
4. **Selective retrieval:** answer a question by selecting a small relevant neighborhood of the map and linking to source files, contracts, docs, or line ranges. Fetch code details only when macro context is insufficient.
5. **Human-first exploration:** offer searchable documentation and a visual way to explore domains, services, flows, contracts, evidence, stale data, unknowns, and inferred relationships. A graph visualization alone is not enough; users should be able to answer real questions quickly.
6. **Agent integration:** provide a stable CLI/API and likely MCP tools for searching architecture, retrieving service context, tracing dependencies, opening source evidence, and assessing potential change impact.
7. **Incremental refresh:** detect repository changes, reprocess affected artifacts, remove or mark stale edges, and record the latest indexed commit. Avoid rebuilding the entire graph when unnecessary.
8. **Evaluation:** compare against a no-harness baseline across different models, including at least one cost-constrained/local model if feasible. Measure token use, answer/task correctness, evidence correctness, unsupported claims, latency, and human time-to-answer.
9. **Safe uncertainty:** if evidence is incomplete or stale, the system must say so. It must not fabricate a service dependency just to produce a complete-looking graph.

## 4. Important constraints and design principles

- **Model-agnostic core:** knowledge, identifiers, provenance, retrieval semantics, and tests must not depend on one provider.
- **Human and AI are first-class consumers:** do not treat the UI as an afterthought or the graph as solely an agent index.
- **Token reduction is a hypothesis to measure:** storing a graph does not reduce tokens by itself. Savings come from retrieval, filtering, summaries, stable references, and doing graph operations outside the LLM context.
- **Correctness before graph completeness:** a smaller evidence-backed map is better than a dense graph full of guesses.
- **Progressive depth:** use macro service knowledge first, contracts and interface relationships next, and symbol/class/function-level code indexing only when needed.
- **Deterministic before generative:** extract what parsers, repository metadata, contracts, configs, and deployment manifests can establish. Use an LLM only where semantic interpretation adds measurable value.
- **Avoid premature infrastructure:** do not decide on a dedicated graph database, vector database, agent framework, multi-agent architecture, or elaborate orchestration before a measured need appears.
- **Preserve source of truth:** generated summaries and diagrams are navigational aids. Source code, contracts, ADRs, and human-confirmed catalog entries remain inspectable evidence.
- **Incremental and reversible:** avoid irreversible coupling to a vendor, a graph schema, or a large fork before the prototype establishes value.
- **Resource-aware:** the initial target may include local inference on a machine with 32 GB RAM, but hardware configuration and model selection are not yet known. Do not promise capability or latency before benchmarking.

## 5. Candidate references to investigate

Use current upstream documentation and source code, not third-party summaries alone. Check licenses, active development, data models, supported languages, update behavior, query interfaces, agent integrations, tests, and extension points. Confirm claims directly before recommending a fork.

### Existing projects

- **Understand Anything:** https://github.com/Egonex-AI/Understand-Anything
  - Investigate its structural extraction, semantic explanations, domain mapping, tours, visualization, incremental updates, data schema, and provider-specific coupling.
- **Graphify:** https://github.com/Graphify-Labs/graphify
  - Investigate deterministic extraction, persisted graph and queries, provenance for extracted versus inferred edges, cross-repository graph merging, MCP integration, supported languages, refresh behavior, and extension points.

Treat these as candidate components/references, not as predetermined foundations. Explicitly compare: fork one, combine selected modules, use both behind adapters, or build a small canonical layer that can consume/export their data. Avoid maintaining two full forks without evidence.

### Official agent/harness/context guidance

- Anthropic, Building effective agents: https://www.anthropic.com/engineering/building-effective-agents
- Anthropic, Effective context engineering for AI agents: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Anthropic, Effective harnesses for long-running agents: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- Anthropic, Writing effective tools for AI agents: https://www.anthropic.com/engineering/writing-tools-for-agents
- Anthropic, Code execution with MCP: https://www.anthropic.com/engineering/code-execution-with-mcp
- Anthropic, Advanced tool use: https://www.anthropic.com/engineering/advanced-tool-use
- Anthropic, Claude Opus 5.5 prompting guidance: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5
- Anthropic, Prompt caching: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- OpenAI, Harness engineering: https://openai.com/index/harness-engineering/
- OpenAI, Agents SDK: https://developers.openai.com/api/docs/guides/agents/sdk
- OpenAI, Agent evals: https://developers.openai.com/api/docs/guides/agent-evals
- MCP architecture: https://modelcontextprotocol.io/docs/learn/architecture
- GitHub Copilot repository custom instructions: https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions
- Google Cloud agent evaluation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/evaluate

These documents express vendor-specific recommendations and examples, not universal laws. Separate their observed results from principles that we can reasonably generalize and test.

## 6. Primary user scenarios to evaluate

Use these as candidate examples; refine them, don't automatically treat them all as MVP requirements.

1. “Which service owns this business capability, and what evidence supports that?”
2. “Trace this customer-facing flow across services, APIs, and events.”
3. “If this API contract changes, which known consumers, tests, and documents should I inspect?”
4. “Which service publishes this event, who consumes it, and how current is that information?”
5. “Explain this unfamiliar service to a new engineer, with links to the important source files and ADRs.”
6. “What relevant context should a coding agent receive before changing this endpoint?”
7. “Can a small/local model answer this question reliably with a compact retrieved context?”
8. “What does the system not know, and which edges are inferred, stale, or unverified?”
9. “What changed architecturally between two indexed commits?”
10. “Can a human correct a service responsibility or relationship and preserve attribution/history?”

## 7. Candidate conceptual model

Consider—but do not adopt without investigation—node types such as:

- Repository
- Service
- Domain / Capability
- API / Operation / Contract
- Event / Topic / Schema
- DataStore / Logical data resource
- ExternalSystem
- Document / ADR
- Team / Owner (only where accurate and useful)

Candidate typed relationships:

- `contains` / `implemented_in`
- `belongs_to_domain`
- `exposes_api`
- `calls_api`
- `publishes_event`
- `consumes_event`
- `reads_from` / `writes_to`
- `depends_on_external_system`
- `documents` / `owned_by`

Candidate evidence origins:

- `declared`: human-confirmed metadata or architecture record
- `extracted`: deterministic parser or explicit configuration/contract evidence
- `inferred`: LLM or heuristic hypothesis awaiting review

Consider whether a relation needs multiple evidence records, temporal validity, confidence/quality indicators, commit IDs, file/line references, and status such as current/stale/unverified. Do not overfit the initial schema to these examples.

## 8. Major unresolved questions: the Wayfinder should decide

The following are investigation themes, not pre-created conclusions. Split them into decision tickets only when the question is precise enough to resolve.

### Product boundary and users
- What exact pain and first workflow should the MVP solve?
- Is the first deliverable a developer tool for one workspace, a local-first product, or a service designed for teams from the start?
- Which human persona and which agent workflow should determine acceptance criteria?
- What is explicitly out of scope for the first release?

### Existing-project strategy
- What can be reused safely from Understand Anything and Graphify?
- Is Graphify a useful base, merely a parser/query component, or the wrong abstraction for the macro map?
- Is a canonical schema worth creating now, and what is the smallest interop contract?
- How should licenses, dependencies, update cadence, tests, and supply-chain/security concerns affect the fork decision?

### Knowledge and data model
- What is the minimum node/edge schema for cross-service architecture?
- How do we distinguish API call relationships from inferred business-flow relationships?
- How should provenance, confidence, freshness, revisions, conflicting evidence, and human corrections work?
- How do we represent repositories that contain multiple deployables, and services that span code/config repositories?

### Ingestion and maintenance
- Which sources are worth supporting first: repository metadata, OpenAPI/AsyncAPI, application configs, code imports/calls, deployment manifests, IaC, ADRs, README, runtime telemetry?
- Which languages and frameworks are in the initial target?
- How do we identify changes and update the graph incrementally?
- What happens when relationships are dynamic, externally configured, or impossible to infer statically?

### Retrieval and context design
- What is the smallest useful context contract for agents?
- How should a query select and rank nodes, paths, evidence, and source snippets?
- What does a tool return by default, and how does the agent request deeper detail?
- How do context budgets work across cheap, local, and frontier models without hardcoding a provider?
- When, if ever, is vector/embedding retrieval useful beyond graph and keyword retrieval?

### Human experience and documentation
- Which human workflows must the UI support in the MVP?
- Is the first UI a Markdown/documentation site, an interactive graph, a CLI, or a small combination?
- How can a user inspect the evidence and correct an inaccurate relationship?
- What generated docs should exist, and how do we prevent stale generated docs from looking authoritative?

### Agent integration and control
- Is MCP the primary interface, with CLI/API as core primitives, or one adapter among others?
- Which initial agents/runtimes should be supported?
- Which tasks should remain deterministic, and which should invoke an LLM?
- How should the harness expose uncertainty and prevent unsupported claims?

### Evaluation and economics
- What baseline will establish token use, answer quality, time-to-answer, and task completion without a harness?
- How many representative cross-service questions/tasks are needed for a first useful benchmark?
- What thresholds would justify continuing: token savings, equal-or-better correctness, lower human effort, or another outcome?
- Which local model and hardware configuration can be reproducibly benchmarked? What exactly does “32 GB machine” mean (system RAM, VRAM, CPU, OS)?
- How should indexing cost, refresh cost, query cost, latency, and maintenance cost be counted?

### Trust, security, and operational boundaries
- What code and metadata can be read, stored, or sent to remote APIs?
- How will secrets be excluded from indexing and logs?
- How do repository permissions and private source references work?
- How do we detect stale graphs, failed indexers, and schema migrations?
- What must remain local for the first version?

## 9. Known risks and hypotheses to challenge

- A graph alone does not save tokens; retrieval and result shaping are the actual mechanism.
- A correct map cannot always be derived from static code. Dynamic URLs, runtime topic names, external configuration, and undocumented behavior create blind spots.
- A detailed code graph can bury the architectural signal. The macro map should remain the default, with deeper indexing on demand.
- LLM-generated descriptions can become durable misinformation without provenance, freshness, and review.
- A model's ability to use a harness differs by model and task. More explicit workflows may help smaller models but can constrain stronger models or add overhead.
- A complex agent framework may cost more in tokens and maintenance than it saves. Prefer deterministic functions and a few clear tools until evaluation shows the need for more.
- Forking two projects can create integration and maintenance costs. Reuse must be justified against adapters or selective reimplementation.
- Graph completeness, answer correctness, and UI usefulness are different metrics. They must be tested separately.
- A visually compelling graph may not support the most frequent developer questions; prioritize real tasks over diagram aesthetics.

## 10. Working preferences for this map

- Be critical and analytical. Challenge the problem framing, hidden assumptions, and premature commitments.
- Do not treat our current ideas as decisions. Compare alternatives and state trade-offs.
- Separate sourced facts, engineering inferences, and hypotheses.
- Prefer official primary sources, repository code/tests/READMEs, and reproducible experiments over third-party summaries.
- Cite links for claims about projects, APIs, licenses, benchmarks, and model capabilities. Confirm current status before making decisions.
- Ask one focused question at a time during grilling. Avoid oversized question dumps; explain why a question matters in plain language.
- Wayfinder tickets must resolve decisions or investigations, not read like implementation tasks. Use prototypes only when a concrete experiment is needed to resolve a question.
- Preserve uncertainty and the reasons behind decisions. Don't silently convert assumptions to requirements.
- Keep human readability and context/token efficiency as explicit design concerns.
- Stop when the destination is reached. Do not begin implementation; hand off to `/to-spec` and then later `/to-tickets`.

## 11. Initial instruction for the agent

Read this brief as background. Inspect the currently installed Matt Pocock skills, especially Wayfinder and its dependencies, and inspect the repository's existing instructions and issue-tracker setup before creating artifacts. If the tracker is not configured, use `/setup-matt-pocock-skills` and ask me to confirm the proposed tracker; local Markdown is acceptable for this exploratory effort if it is the configured fallback.

Then invoke `/wayfinder` and begin by clarifying the destination for the whole effort. Use this brief as context, not as a pre-decided ticket list. Explore the uncertainty broadly, look for existing work/docs that might already answer questions, and build a dependency-aware map of decision tickets. Resolve one ticket at a time. Do not write code or choose a final technology stack merely because it appears in this brief.
