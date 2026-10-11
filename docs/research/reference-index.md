# Reference index

**Status:** research index. Not a decision, and not a list of dependencies. A reference appearing here doesn't mean it was adopted, read or trusted.
**Created:** 2026-10-10, from an audit of `main` at `ca42673`. Claude Code CLI in the session container: `2.1.296`.

This file catalogs every external reference found in the repository's briefs, principles, ADRs, research notes, contracts and tooling docs, and records how far each one was actually investigated. The detailed claims stay in the research notes; this index points to them and doesn't restate them. Update it additively: add rows or append to a row's notes, and never delete a reference, including rejected ones.

## How to read it

States:

- **listed:** the reference appears in a document. No record shows it was read for this project.
- **inspected:** someone read it, but the claims taken from it aren't pinned to a revision, came through a summary or secondary source, or cover only part of it.
- **verified:** the claims this project relies on were checked in the primary source at a pinned revision or a dated live page, in the note named under "Evidence".

"May inform" names decisions a reference could feed. It's a pointer, not a claim that the reference decided anything. Decision status lives only in the [decision map](../decision-map.md).

Origin abbreviations: **SB** = [SDLC brief](../briefs/sdlc-harness-brief.md), **WB** = [Wayfinder brief](../briefs/wayfinder-context-map-brief.md), **PR** = [principles](../principles.md), **D2N**, **D3N**, **D5N**, **D6N** = the [D2](d2-routing-evidence.md), [D3](d3-artifact-evidence.md), [D5](d5-native-primitive-evidence.md) and [D6](d6-reuse-evidence.md) evidence notes, **BR** = [brand and naming](../brand-and-roadmap.md), **DEV** = [development](../development.md).

## 1. Agent-engineering skill packs

| Reference | Author / org, type | Canonical URL | Origin | Consulted | State | What was learned (evidence) | May inform | Limits and pending checks |
|---|---|---|---|---|---|---|---|---|
| `skills` | Matt Pocock, GitHub repository (skills, Claude Code plugin `mattpocock-skills`) | <https://github.com/mattpocock/skills> | SB §12, PR §2, D2N, D3N, D5N, D6N | 2026-10-10 | verified at [`49dd158`](https://github.com/mattpocock/skills/tree/49dd158d1076134a641b33efb035946536778336) and tag `v1.3.1`; diffed against [`c55ee46`](https://github.com/mattpocock/skills/tree/c55ee46073ed923f86ce59a5eb3b6d895095d1b7) (official marketplace pin) | Routing on scale and uncertainty (P1); frontier question rounds (P4); spec and ticket formats incompatible with the contract (M1–M9); MIT license (P6); 27 skills, 11 model-invoked (P7); fast churn and renames (P10); `wayfinder` behavior (W1–W8) | D2, D3, D5, D6 (all consumed). The transition criteria in D6N §10 | `tdd`, `code-review`, `prototype`, `triage` not read in full. Owner's installed version and update setting not inspected (D6N §8). License of third-party text in `pr` not checked (P23). Rejected as a runtime dependency and as vendored copies ([ADR 0004](../decisions/0004-reuse-strategy-for-existing-skills.md), alternatives A, B, D, E, G); kept as a technique source |
| `agent-skills` | Addy Osmani, GitHub repository | <https://github.com/addyosmani/agent-skills> | SB §12, PR §4, PR §5, D2N, D3N | 2026-10-10 | verified at [`1be8e34`](https://github.com/addyosmani/agent-skills/tree/1be8e34187e34647bb83adc3a1323b26ae6f6abe), named files only | Phase routing and "when not to use" (O1); non-trivial any-of list (O2); task sizing (O3); rationalization tables (O4); skill invocation is stochastic, eval tiers (O5); one question at a time (O6); spec and task templates (A5–A8) | D2, D3 (consumed); D7 (eval tiers, O5); open question on question style (PR §2, ADR 0004 open question 1) | License not recorded. Only the files listed in D2N and D3N were read |
| `pstack` | Cursor (`cursor/plugins`), GitHub plugin directory | <https://github.com/cursor/plugins/blob/main/pstack/README.md> | SB §12, PR §3, D2N | 2026-10-10 | verified at [`d73344b`](https://github.com/cursor/plugins/tree/d73344bee8cf22e53b9d5f4cf5749d38ba38c174/pstack), three files | Task-type playbooks (X1); fact vs preference forks (X3); reversibility-based autonomy (X4); "prove it works" (X5); `blast-radius` evidence ladder (X7) | D2 (consumed); D7 (X5, X7) | License not recorded. Task-type playbooks as the primary routing axis were rejected ([ADR 0002](../decisions/0002-ceremony-tiers-and-routing.md), alternative E) |
| *Pocock vs Pstack vs Osmani: Which Skill Pack Wins?* | Rob Shocks, YouTube video | <https://www.youtube.com/watch?v=sU9MW8Ycq2M> | PR | none | listed | Nothing directly: D2N says the video wasn't read. Its attributions were rechecked against the packs, and two were corrected (D2N "Corrections to earlier attributions") | none | Secondhand summary only. Treat claims attributed to it as unverified |
| `claude-plugins-official` | Anthropic, GitHub marketplace repository | <https://github.com/anthropics/claude-plugins-official> | D6N | 2026-10-10 | verified at [`b8e53f1`](https://github.com/anthropics/claude-plugins-official/tree/b8e53f1c05dff3b6d751297f6527990ffc81c2f4), `marketplace.json` entry `mattpocock-skills` | Official listing pins Pocock `c55ee46`, 73 commits behind `main` (P9) | D6 (consumed) | The pin can move; recheck before relying on it |

## 2. Anthropic and Claude Code (official)

### 2.1 Claude Code documentation

All pages are live documents at `code.claude.com/docs/en/`. They change often; re-read before M1 relies on a detail.

| Page | URL | Origin | Consulted | State | What was learned (evidence) | May inform | Limits |
|---|---|---|---|---|---|---|---|
| Best practices | <https://code.claude.com/docs/en/best-practices> | D2N | 2026-10-10 | verified (live page) | Plan-mode heuristics (C1), verification strengths (C2), adversarial review (C3), interview then spec (C4) | D2 (consumed) | Live page, no revision pin |
| Permission modes | <https://code.claude.com/docs/en/permission-modes> | D2N | 2026-10-10 | verified (live page) | Auto-mode classifier blocks irreversible or external actions (C5) | D2 (consumed) | as above |
| Skills | <https://code.claude.com/docs/en/skills> | SB §12, D2N, D5N, D6N | 2026-10-10 | verified (live page) | Description cost, body lifecycle, 1,536-character listing cap, compaction re-attach, locations and precedence, `skillOverrides` limits (C6, C10–C12, N2–N6) | D5, D6 | as above |
| Model configuration / effort | <https://code.claude.com/docs/en/model-config> | D2N | 2026-10-10 | verified (live page) | Opus 5.5 defaults to `medium` effort; per-skill `effort` frontmatter; cache warning on mid-session change (C7) | D2 (consumed), effort policy (SB §2) | as above |
| Costs | <https://code.claude.com/docs/en/costs> | D2N; re-read in this audit | 2026-10-10 | verified (live page, full text read in this audit) | `/usage` Session block: per-model input, output, cache read and cache write tokens, plus a dollar estimate at list price; the dollar figure "isn't relevant for billing" on Pro and Max. Plan breakdown attributes recent usage to skills, subagents, plugins and MCP servers as approximate percentages from local history. `Prompt cache (main)` line (v2.1.251+). `/insights` report. Subagents draw on the same usage (C8) | **D4**, D7 | Whether a `/cost` command still exists isn't stated on this page. The [commands](https://code.claude.com/docs/en/commands) row in the re-read table below settles it: `/cost` is an alias of `/usage`. The decision map's D4 row, which named `/cost` at the time of this audit, now names `/usage` ([ADR 0006](../decisions/0006-usage-observability.md)). The owner's plan type (API or subscription) is unknown, and it changes what the dollar figure means |
| Monitoring usage (OpenTelemetry) | <https://code.claude.com/docs/en/monitoring-usage> | this audit | 2026-10-10 | inspected (first 100,000 of about 152,000 characters, through a summarizing fetch) | `claude_code.token.usage` (attribute `type`: `input`, `output`, `cacheRead`, `cacheCreation`; plus `model`, `query_source`, `effort`, `skill.name`, `agent.name`, `plugin.name`, `session.id`) and `claude_code.cost.usage`; `claude_code.api_request` events with per-request tokens and `cost_usd`. Enabled by `CLAUDE_CODE_ENABLE_TELEMETRY=1`; `console` and Prometheus exporters work locally. Non-official skill and agent names are redacted unless `OTEL_LOG_TOOL_DETAILS=1`. Cloud sessions need server-managed settings or environment variables | **D4**, D7 | Tail of the page not read. Not exercised: no telemetry was turned on in this audit. Quotes came through a summarizer and must be re-read verbatim before an ADR cites them |
| Status line | <https://code.claude.com/docs/en/statusline> | this audit | 2026-10-10 | inspected (full page fetched, field table read) | The status-line command gets JSON with `cost.total_cost_usd`, `cost.total_duration_ms`, `cost.total_api_duration_ms`, `context_window.total_input_tokens`, `total_output_tokens`, `current_usage`, `used_percentage`, `prompt_cache`, `session_id` and `transcript_path` | **D4** | Values describe the current context window and the session, not a task. Not exercised |
| Install plugins | <https://code.claude.com/docs/en/discover-plugins> | D6N | 2026-10-10 | verified (live page) | Install scopes; auto-update defaults per marketplace (C13, C14) | D6 (consumed) | as above |
| Plugin loading | <https://code.claude.com/docs/en/plugins/loading> | D6N | 2026-10-10 | verified (live page) | Version computed from the manifest; skills-directory plugins; synced plugins (C19–C21) | D5 FU1–FU5 | Cloud behavior of committed skills-directory plugins not verified (C21) |
| Plugin security | <https://code.claude.com/docs/en/plugins/security> | D6N | 2026-10-10 | verified (live page) | Plugin text can change on update; Anthropic doesn't verify contents (C16) | D6 (consumed) | as above |
| Marketplace reference | <https://code.claude.com/docs/en/plugins/marketplace-reference> | D6N | 2026-10-10 | verified (live page) | `plugin.json` version wins over the marketplace entry (P22) | D6 (consumed) | as above |
| Cloud environments | <https://code.claude.com/docs/en/cloud-environments> | D5N, D6N | 2026-10-10 | verified (live page) | What carries over to cloud sessions; account-enabled skills load; setup scripts vs `SessionStart` (C15, C20, N12, N13) | D5 FU1, FU5 | Account-synced plugins in cloud sessions not stated |
| Hooks | <https://code.claude.com/docs/en/hooks> | SB §12, D5N | 2026-10-10 | inspected (first 200,000 of 267,000 characters) | Handler types, exit-code semantics, `onFailure: "block"`, `Stop` continuation cap (N7, N8) | D5 H-1 | Tail not read (D5N "Sources") |
| Subagents | <https://code.claude.com/docs/en/sub-agents> | SB §12, D5N | 2026-10-10 | verified (live page) | Isolated context, same usage limits, `tools` restriction, description cost (N9) | D5 | as above |
| Memory (`CLAUDE.md`) | <https://code.claude.com/docs/en/memory> | D5N | 2026-10-10 | verified (live page) | Loaded in full every request; guidance, not enforcement; under 200 lines (N1) | D5 | as above |
| Features overview | <https://code.claude.com/docs/en/features-overview> | D5N | 2026-10-10 | verified (live page) | Context cost by feature; "hook vs skill" guidance (N10, N11) | D5, D4 | as above |
| Settings | <https://code.claude.com/docs/en/settings> | SB §12, D5N | 2026-10-10 | verified (live page) | Precedence (N15) | D5 | as above |
| Settings reference | <https://code.claude.com/docs/en/settings-reference> | D5N | 2026-10-10 | verified (live page) | `enabledPlugins` and its precedence (N17) | D5 FU6 | as above |
| Claude Code on the web | <https://code.claude.com/docs/en/claude-code-on-the-web> | D5N | 2026-10-10 | verified (live page) | `--cloud` clones the remote branch; teleport; expiry (N14) | D5 | as above |
| Commands | <https://code.claude.com/docs/en/commands> | SB §2, SB §12 | none | listed | — | D4 (`/usage`, `/context`, `/cost`), effort policy | Not read |
| Environment variables | <https://code.claude.com/docs/en/env-vars> | SB §2, SB §12 | none | listed | — | D4 (telemetry variables), effort policy (`CLAUDE_CODE_EFFORT_LEVEL`) | Not read |
| Plugins | <https://code.claude.com/docs/en/plugins> | SB §12 | none | listed | — | deferred plugin packaging | Not read |
| Local CLI | `claude` `2.1.296` in the session container | D2N, D5N, D6N, this audit | 2026-10-10 | verified (observed) | `claude plugin eval` exists (C9). `claude --version` prints `2.1.296` | D7 | One container; the owner's machine not inspected |
| Session transcripts | local `~/.claude/projects/<project>/<session>.jsonl` | SB §9, decision map D4 row, this audit | 2026-10-10 | verified (observed, one session) | In this audit's own transcript, 39 assistant entries carry `message.usage` with `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `service_tier` and `speed` | **D4**, D7 | One cloud container. The file format isn't a documented contract here; check its stability before M1 depends on it |

### 2.2 Claude platform and Anthropic engineering

| Reference | URL | Origin | State | May inform | Limits |
|---|---|---|---|---|---|
| Prompting Claude Opus 5.5 | <https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5> | SB §2, SB §12, WB §5 | listed | effort policy, skill text (M1) | The brief's claims about it (medium default, status-only turns) weren't rechecked; only the medium default is verified, through C7 |
| Claude prompting best practices | <https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices> | SB §12 | listed | skill text (M1) | Not read |
| Effort | <https://platform.claude.com/docs/en/build-with-claude/effort> | SB §2, SB §12 | listed | effort policy, D4 | Not read |
| Prompt caching | <https://platform.claude.com/docs/en/build-with-claude/prompt-caching> | WB §5 | listed | D4 (cache tokens), ADR 0002 §8 cost structure | Not read |
| Building effective agents | <https://www.anthropic.com/engineering/building-effective-agents> | WB §5 | listed | general | Not read |
| Effective context engineering for AI agents | <https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents> | WB §5 | listed | D5, context map (deferred) | Not read |
| Effective harnesses for long-running agents | <https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents> | WB §5 | listed | checkpoints and resume (contract), D7 | Not read |
| Writing effective tools for AI agents | <https://www.anthropic.com/engineering/writing-tools-for-agents> | WB §5 | listed | context map (deferred) | Not read |
| Code execution with MCP | <https://www.anthropic.com/engineering/code-execution-with-mcp> | WB §5 | listed | context map (deferred) | Not read |
| Advanced tool use | <https://www.anthropic.com/engineering/advanced-tool-use> | WB §5 | listed | context map (deferred) | Not read |

## 3. Other vendors and standards

| Reference | Author / org, type | URL | Origin | State | May inform | Limits |
|---|---|---|---|---|---|---|
| Harness engineering | OpenAI, article | <https://openai.com/index/harness-engineering/> | SB §12, WB §5 | listed | general harness design, D7 | Not read. Vendor-specific results, per WB §5 |
| Agents SDK | OpenAI, documentation | <https://developers.openai.com/api/docs/guides/agents/sdk> | SB §12, WB §5 | listed | none on the V1 path (G-Ingá targets Claude Code) | Not read |
| Agent evals | OpenAI, documentation | <https://developers.openai.com/api/docs/guides/agent-evals> | SB §12, WB §5 | listed | D7 | Not read |
| MCP architecture | Model Context Protocol, specification docs | <https://modelcontextprotocol.io/docs/learn/architecture> | SB §12, WB §5 | listed | context map (deferred). MCP is out of V1 ([ADR 0005](../decisions/0005-native-primitive-mapping.md) item 12, `proposed`) | Not read |
| Repository custom instructions | GitHub (Copilot), documentation | <https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions> | WB §5 | listed | context map (deferred), model-agnostic pointer text | Not read |
| Agent evaluation (Vertex AI Agent Engine) | Google Cloud, documentation | <https://docs.cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/evaluate> | WB §5 | listed | D7 | Not read |
| DORA / DevOps capabilities | Google Cloud, documentation | <https://docs.cloud.google.com/architecture/devops> | SB §12 | listed | D7 metrics | Not read |
| OWASP SAMM | OWASP, maturity model | <https://owaspsamm.org/model/> | SB §12 | listed | security floor (ADR 0002 H4) | Not read |
| Secure Software Development Framework (SP 800-218) | NIST, standard | <https://csrc.nist.gov/pubs/sp/800/218/final> | SB §12 | listed | security floor | Not read |
| Incident management guide | Google SRE, guide | <https://sre.google/resources/practices-and-processes/incident-management-guide/> | SB §12 | listed | SDLC operations scope (SB §4) | Not read |

## 4. Context-map candidates (deferred by ADR 0001)

[ADR 0001](../decisions/0001-product-boundary.md) defers the system-context map until a logged friction asks for it. These stay candidates, not rejected and not selected.

| Reference | Author / org, type | URL | Origin | Consulted | State | What was learned | May inform | Limits and pending checks |
|---|---|---|---|---|---|---|---|---|
| Understand Anything | Egonex-AI, GitHub repository | <https://github.com/Egonex-AI/Understand-Anything> | WB §5, SB §12 | none | listed | Nothing investigated | the deferred context map only | License, activity, schema, provider coupling all unchecked (WB §5 list) |
| Graphify | Graphify-Labs, GitHub repository | <https://github.com/Graphify-Labs/graphify> | WB §5, SB §12 | none | listed | Nothing investigated | the deferred context map only | Same as above. WB §5 warns against maintaining two forks without evidence |
| Open Knowledge Format (OKF) | Google Cloud, blog post (announcement) | <https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing> | SB §3, SB §12; decision map "Deferred" list | 2026-10-10 (web search only) | listed | Secondary sources found in this audit say OKF launched in June 2026 as Markdown with YAML frontmatter (`type` the only required field, reserved `index.md` and `log.md`), that a v0.2 adds optional provenance, trust, lifecycle and freshness signals, and that the spec lives in the `GoogleCloudPlatform/knowledge-catalog` GitHub repository under Apache 2.0. **None of this was read in a primary source** | ADR 0001 decision item 3 (provenance and freshness labels); the deferred context map | SB §3 requires re-checking the official spec before adopting any part. Candidate format reference only, not a dependency. Spec repository, version and license unverified |
| Google AX | Google (identity unconfirmed) | not recorded | the audit request only; no repository document mentions it | 2026-10-10 (web search only) | listed (identity unconfirmed) | A web search found `github.com/google/ax`, described by secondary pages as "Agent Executor", a distributed runtime for agent harnesses under Apache 2.0, with breaking changes expected. Separately, "AX" also names the "agent experience" concept used by Nx, Cloudflare and Netlify. Which one the owner meant isn't known | none until identified | Ask the owner for the intended title or URL before investigating. Nothing here is a primary-source claim |

## 5. PetClinic laboratory

| Reference | URL | Origin | State | May inform | Limits |
|---|---|---|---|---|---|
| Spring PetClinic Angular | <https://github.com/spring-petclinic/spring-petclinic-angular> | SB §8, SB §12 | listed | D7 (optional fixture, per ADR 0001 Consequences) | SB §8: commits, licenses, dependency compatibility and test status not verified. Brief decision 8 (exact revisions) open |
| Spring PetClinic REST | <https://github.com/spring-petclinic/spring-petclinic-rest> | SB §8, SB §12 | listed | D7 | Same |

## 6. Repository tooling

| Reference | URL | Origin | State | Notes |
|---|---|---|---|---|
| mise | <https://mise.jdx.dev/> ([install](https://mise.jdx.dev/installing-mise.html), [shell setup](https://mise.jdx.dev/shell-setup.html), [troubleshooting](https://mise.jdx.dev/troubleshooting.html)) | DEV | inspected | CI uses mise `2026.10.7` (DEV). Not installed in this audit's container |
| Bun | <https://bun.sh/> | DEV | verified (observed) | `1.4.2` in this container, matching `mise.toml`. Runtime for the repository validator; product runtime is ADR 0005 U2 (open) |
| markdownlint, Mermaid CLI, Puppeteer, TypeScript, `yaml` | npm packages in `package.json` | DEV | inspected | Versions pinned by `bun.lock`. Not installed in this audit |

## 7. Brand and naming sources

Kept for completeness. They support [brand and naming](../brand-and-roadmap.md) (`proposed`, not on the V1 path), which records for each one whether it was corroborated or founder-provided.

| Reference | URL | Use in that document |
|---|---|---|
| Priberam: broto, ginga, banzeiro, trama, sanfona | <https://dicionario.priberam.org/broto>, <https://dicionario.priberam.org/ginga>, <https://dicionario.priberam.org/banzeiro>, <https://dicionario.priberam.org/trama>, <https://dicionario.priberam.org/sanfona> | definitions (founder-provided) |
| UNESCO capoeira | <https://ich.unesco.org/RL/00892>, <https://ich.unesco.org/en/decisions/9.COM/10.8> | context (corroborated) |
| Portal Amazônia, banzeiros | <https://portalamazonia.com/amazonia/portal-amazonia-responde-o-que-sao-os-banzeiros/> | definition (corroborated) |
| Embrapa, Revista Caatinga, Fundaj (mandacaru) | <https://www.infoteca.cnptia.embrapa.br/bitstream/doc/951853/1/CIT12002.pdf>, <https://doaj.org/article/bcb90f8b977e4f80832c00d1a49a8ca3>, <https://pesquisaescolar.fundaj.gov.br/pt-br/artigo/mandacaru/> | definition |
| IBGE, UEPG, Câmara de Maringá (Maringá and its song) | <https://www.ibge.gov.br/biblioteca/visualizacao/dtb/parana/maringa.pdf>, <https://revistas.uepg.br/index.php/folkcom/article/download/18845/209209214776/209209238742>, <https://sapl.cmm.pr.gov.br/ta/195/text> | history |
| Bem Paraná (Parque do Ingá) | <https://www.bemparana.com.br/noticias/parana/cidadesdoparana/mp-arquiva-investigacao-sobre-concessao-do-parque-do-inga-e-aponta-ausencia-de-irregularidades/> | corroboration |
| Ginga (middleware), Wikipedia | <https://en.wikipedia.org/wiki/Ginga_(middleware)> | name collision to include in the name checks |

## 8. Rejected or deferred as candidates

Kept so a later reader doesn't mistake presence in this index for adoption.

| Candidate | Outcome | Record |
|---|---|---|
| Adopt a pack wholesale (Pocock, Osmani or pstack) | rejected | [ADR 0001](../decisions/0001-product-boundary.md), alternatives |
| Depend on the Pocock plugin; vendor its skills; keep it permanently beside G-Ingá | rejected (vendoring: "for now", with a bar for exceptions) | [ADR 0004](../decisions/0004-reuse-strategy-for-existing-skills.md), alternatives A, B, D, E, G |
| pstack task-type playbooks as the primary routing axis | rejected; only "type picks the verification technique" kept | [ADR 0002](../decisions/0002-ceremony-tiers-and-routing.md), alternative E |
| Understand Anything, Graphify, OKF, PetClinic as a mandatory lab | deferred, not rejected | [ADR 0001](../decisions/0001-product-boundary.md); decision map "Deferred, not rejected" |
| MCP servers in V1 | not used in V1 (`proposed`) | [ADR 0005](../decisions/0005-native-primitive-mapping.md) item 12 |

## 9. Coverage gaps

- No books or individual researchers are cited anywhere in the repository. The only named people are pack and article authors (Pocock, Osmani, the pstack author, Rob Shocks) and the OKF announcement's authors, who appear only in secondary sources.
- All Anthropic engineering posts, the platform prompting and effort guides, every OpenAI, Google, OWASP, NIST and MCP reference, and both context-map repositories are **listed only**.
- For D4, the token signals now have documentation evidence (§2.1: costs, monitoring usage, status line, transcripts), but none was exercised on a task, and the owner's plan type and machine weren't inspected.
- For D7, no evaluation reference has been read: OpenAI agent evals, Vertex agent evaluation, DORA and the PetClinic repositories are listed only. Osmani's eval tiers (O5) and the local `claude plugin eval` (C9) are the only inspected inputs.
- Google AX has no identity or URL in the repository. The original brief file names `CLAUDE_CODE_PROJECT_BRIEF_OPUS_5_5.md` and `WAYFINDER_SYSTEM_CONTEXT_HARNESS.md` don't exist in the repository; their content appears to be the two files under `docs/briefs/`, which is an inference from titles and the compact starter prompt (SB §15), not a byte comparison.

## 10. Additions: D4 consolidation (2026-10-10)

Added after the first version of this index, for [D4 evidence](d4-observability-evidence.md) and [ADR 0006](../decisions/0006-usage-observability.md) (`proposed`). Earlier rows stay as written. Where this section corrects or settles one of them, it says so.

### 10.1 Claude Code, re-read as raw page text

| Reference | URL | Consulted | State | What was learned (evidence) | May inform | Limits |
|---|---|---|---|---|---|---|
| Costs (re-read) | <https://code.claude.com/docs/en/costs> | 2026-10-10 | verified (raw Markdown, read in full) | Same as the row in §2.1. Thinking tokens are billed as output ("Adjust extended thinking"; used in D4 evidence §3.3) | D4 | Live page, no revision pin |
| Monitoring usage (re-read) | <https://code.claude.com/docs/en/monitoring-usage> | 2026-10-10 | verified for the sections cited in D4 evidence (raw Markdown, 153 KB); traces sections read only for content gates | Metrics, attributes, events, content gates, `user.email` handling, repository settings can't turn telemetry on (T1–T11). **Correction to the §2.1 row:** user-defined skill names appear verbatim in `skill.name`; only user-defined agent names (`custom`) and third-party plugin names (`third-party`) are redacted by default (T5). `OTEL_LOG_ASSISTANT_RESPONSES` inherits `OTEL_LOG_USER_PROMPTS` when unset; closing content gates requires explicitly setting all 5 flags to `0`. `OTEL_METRICS_INCLUDE_ACCOUNT_UUID=false` omits account UUID from metrics but does not remove `user.email` from events or resources | D4, D7 | Emission under a Pro OAuth sign-in not verified (T12) |
| Status line (re-read) | <https://code.claude.com/docs/en/statusline> | 2026-10-10 | verified (raw Markdown, field tables) | Adds `rate_limits.five_hour` and `seven_day` (`used_percentage`, `resets_at`), present only for Pro and Max subscribers or behind a gateway (T18) | D4 (plan utilization) | Not exercised |
| Commands | <https://code.claude.com/docs/en/commands> | 2026-10-10 | verified (live page, rows read) | `/cost` and `/stats` are aliases of `/usage`; `/context` shows context composition (T13, T16). **Settles the §2.1 "Costs" row's pending note** about `/cost` | D4 | Other commands not read |
| Local CLI `--max-budget-usd` | `claude --help`, `2.1.296` | 2026-10-10 | verified (observed) | Dollar cap for `--print` runs only (T19) | D7 | Behavior on subscriptions not verified |
| Data usage | <https://code.claude.com/docs/en/data-usage> | none | listed | — | D4 privacy (Anthropic's operational telemetry) | Not read |

### 10.2 Gemini CLI

All at `google-gemini/gemini-cli` [`9b6e026`](https://github.com/google-gemini/gemini-cli/tree/9b6e0265d16bbd29ca51e33c9e0c01dc4cec5e83) (`main` HEAD on 2026-10-10), Google, Apache 2.0 per its own terms page. The separate Gemini host research branch wasn't read.

| Reference | Path | Consulted | State | What was learned (evidence) | May inform | Limits |
|---|---|---|---|---|---|---|
| Telemetry | [`docs/cli/telemetry.md`](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/telemetry.md) | 2026-10-10 | verified (read in full at the pin) | Settings and defaults, including `logPrompts` `true` and `traces` `false`; metrics `gemini_cli.token.usage` (`input`, `output`, `thought`, `cache`, `tool`); `api_response`, `tool_call`, `user_prompt` logs; no cost metric; common attributes include `user.email` (G1, G3–G7, G9, G12) | D4 | Not exercised; emission under Google AI Pro unverified (Q2) |
| Telemetry source | `packages/core/src/telemetry/types.ts`, `loggers.ts`, `sdk.ts`, `clearcut-logger/clearcut-logger.ts` | 2026-10-10 | verified (named lines) | Prompt, response and tool-argument payloads gated by `logPrompts`; GenAI message payloads need `traces` and `logPrompts`; Clearcut gated by `usageStatisticsEnabled`; resource built from service name and version (G8, G10, G11) | D4 privacy | Clearcut payload contents not read (Q7) |
| Commands (`/stats`) | `docs/reference/commands.md` | 2026-10-10 | verified (section read) | `/stats session`, `model` (token counts and quota information), `tools` (G13) | D4 | Output format not documented as structured |
| Headless mode | `docs/cli/headless.md` | 2026-10-10 | inspected | JSON `stats` and stream-json `result` carry usage; exit `53` for turn limit (G14) | D7 | `stats` field names not listed (Q4) |
| Configuration reference | `docs/reference/configuration.md` | 2026-10-10 | verified (sections named in D4 evidence) | Settings precedence with project above user (G2); `privacy.usageStatisticsEnabled` default `true` (G10); footer context percentage hidden by default (G15); `model.maxSessionTurns` (G18) | D4 | Rest of the file not read |
| Session management | `docs/cli/session-management.md` | 2026-10-10 | inspected | Sessions saved under `~/.gemini/tmp/<project_hash>/chats/` with full history and token usage (G16) | D4 privacy | File format not read |
| Quotas and pricing | `docs/resources/quota-and-pricing.md` | 2026-10-10 | inspected | Google AI Pro: 1,500 requests per user per day, fixed-price subscription (G17) | D4 (plan utilization) | Limits "vary" per account; the owner's quota not checked |
| Terms and privacy | `docs/resources/tos-privacy.md` | 2026-10-10 | inspected | Apache 2.0; Usage Statistics opt-out; third-party access to the services behind the CLI violates the terms (G10, G19) | D4 (rejects a proxy) | Not legal advice |
| OpenTelemetry GenAI semantic conventions | <https://github.com/open-telemetry/semantic-conventions/blob/main/docs/gen-ai/gen-ai-metrics.md> | none | listed | Cited by Gemini's telemetry page for `gen_ai.client.*` metrics | D4 common record (possible naming source) | Not read |

### 10.3 Coverage after this addition

- D4's signals are now verified in documentation for both CLIs, and partly in Gemini's source. None was exercised: the spike in ADR 0006 waits for the owner.
- Still listed only: Anthropic's data-usage page, the OpenTelemetry GenAI conventions, and everything §9 already named.

## 11. Additions: Post-Spike G-S1 and Antigravity Transition (2026-10-10)

Added after the G-S1 spike audit, for [Gemini CLI host decision review](gemini-cli-host-decision-review.md).

| Reference | Author / org, type | URL / Path | Consulted | State | What was learned (evidence) | May inform | Limits |
|---|---|---|---|---|---|---|---|
| Transitioning Gemini CLI to Antigravity CLI | Google Developers Blog (Dmitry Lyalin, Taylor Mullen) | <https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/> | 2026-10-10 | verified (live page read in full) | Deprecation of `@google/gemini-cli` for individual and free accounts on June 18, 2026; transition to Antigravity CLI (`agy`); preservation of Gemini CLI for enterprise licenses and paid API keys | host decision, ADR 0001, ADR 0005 | Future enterprise roadmap not verified |
| Antigravity CLI Reference | Google Antigravity, official documentation | <https://antigravity.google/docs/cli/reference> | 2026-10-10 | verified (`agy --help` and local reference docs) | Non-interactive flags (`-p`, `--output-format json`), permission bypass (`--dangerously-skip-permissions`), config file `~/.gemini/antigravity-cli/settings.json` | host decision, D5 | Detailed OTel schema for `agy` not published |
| Antigravity Customizations and Rules | Google Antigravity, official documentation | <https://antigravity.google/docs/rules-workflows> | 2026-10-10 | verified (offline specification in `agy-customizations`) | `GEMINI.md` / `AGENTS.md` directory rules, 24 KB per-file limit, 20,000-token rules budget (`defaultRulesBudget`), `.agents/` workspace discovery root | host decision, D5 | Behavior under deep directory trees not tested |
