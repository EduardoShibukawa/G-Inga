# 0006 — Usage, context and cost observability

- **Status:** accepted (accepted by project owner 2026-10-11; covers multi-host local telemetry for Claude Code and Antigravity CLI)
- **Date:** 2026-10-10 (revised and accepted 2026-10-11)
- **Deciders:** project owner
- **Depends on:** nothing on the decision map. Constrained by [ADR 0001](0001-product-boundary.md) (personal SDLC harness scoped to Claude Code in V1), [ADR 0002](0002-ceremony-tiers-and-routing.md) §8 (what to measure) and [ADR 0003](0003-minimum-artifact-schemas.md) decision item 10 (`hard` and `guideline` budgets), all `accepted`, and by [ADR 0005](0005-native-primitive-mapping.md) (`proposed`), which leaves the fixed per-turn cost limit to D4 (U7). This record changes none of them.
- **Evidence:** [D4 evidence](../research/d4-observability-evidence.md), [D4 spike results](../research/d4-spike-results.md), and [D4 spike review](../research/d4-spike-review.md). Codes `T`, `G` and `K` below refer to the evidence note.
- **Correction of an earlier label:** until this record, the decision map's D4 row named `/cost` as a Claude Code signal. In the current commands reference `/cost` is an alias of `/usage`, as is `/stats` (T13). The row now names `/usage`; Git keeps the old wording.

## Context

D4 asks which token, context, tool and cost signals the harness can observe locally to inform D7 (evaluation) and the numeric limits left unset by ADR 0003.

Per [ADR 0001](0001-product-boundary.md), G-Ingá is a personal SDLC harness for Claude Code. Consequently, automated observability for V1 is scoped exclusively to Claude Code.

During initial discovery, two user environments were investigated comparatively:

- **E1:** Claude Code with a Claude Pro subscription;
- **E2:** Gemini CLI with a Google AI Pro subscription.

On 2026-10-10, comparative spike D4 was executed in an isolated environment outside target repositories (`d4-spike-results.md`). What the evidence and spike show:

- **Claude Code (`2.1.296` under OAuth Pro):** Emitted structured OpenTelemetry metrics and events locally via the `console` exporter without outbound network egress to third parties. Token counts (`input`, `output`, `cacheRead`, `cacheCreation`), execution duration (`claude_code.active_time.total`), API request latency/ttft, model id, and session counters were observed. List-price dollar figures were captured as estimates. Assistant responses were redacted by default (`"<REDACTED>"`), and prompt text was excluded. Native `/usage` session and request counts incremented by exactly 1, correlating with the OTel turn.
- **Gemini CLI (`0.63.0` under Google account personal OAuth):** Initialized its local file exporter and recorded lifecycle metrics (`gemini_cli.session.count`, `gemini_cli.onboarding.*`, `gemini_cli.config`, prompt length with prompt text omitted). However, before model inference could execute, Google's Cloud Code onboarding service rejected the request with `IneligibleTierError` / `UNSUPPORTED_CLIENT` (and HTTP 429 on retry). Google announced the sunset of `@google/gemini-cli` for individual/free accounts on June 18, 2026. Enterprise licenses and paid API keys remain supported upstream per documentation, but for the owner's individual subscription workflow, legacy Gemini CLI is blocked.
- **Antigravity CLI (`agy`):** Designated upstream successor for Google AI Pro individual accounts. However, its OpenTelemetry schema, event definitions, and compatibility with G-Ingá contracts have not been evaluated or validated. It is recorded as a future candidate post-V1, not as a supported host for V1.
- **Attribution gap:** Neither host natively attributes telemetry to a task. Signals are keyed by `session.id`, `prompt.id`, or `request_id` (T4, G3). Exposing `session.id` does not create automatic task attribution; attribution requires operational discipline or explicit harness correlation.
- **Cost concepts:** Physical token consumption, list-price estimated cost, plan quota/utilization, and effective billing operate under distinct semantics and must never be conflated.
- **Taxonomy status:** The six collection states (`observed`, `estimated`, `derived`, `absent`, `unsupported`, `collection_error`) remain a proposed taxonomy. The single-turn spike exercised several states in isolation, but did not empirically validate every state across every field.

The [friction log](../friction-log.md) is still empty. ADR 0002 §8 and principle §6 (tokens per verified task) are the drivers, not an observed friction.

## Problem

Choose an observability approach for V1 that:

- focuses automated collection on Claude Code, aligning with [ADR 0001](0001-product-boundary.md);
- yields the ADR 0002 §8 measurements per task without manual transcript parsing;
- preserves each source's semantics without forcing false comparability across models or CLIs;
- strictly separates observed usage, estimated cost, plan utilization, and billing;
- enforces privacy by keeping prompt text, code snippets, tool inputs, and raw API bodies disabled;
- establishes clear privacy handling for account metadata before any local telemetry leaves the machine;
- promises enforcement only where a platform mechanism enforces.

## Decision (proposed)

1. **OpenTelemetry is the structured channel for automated usage observability in V1, scoped to Claude Code.** No G-Ingá runtime daemon, external collector or parser is built by this record. Telemetry is exported locally by the CLI process itself. The V1 spec decides the minimal mechanism to inspect these local signals.
2. **Native views are human cross-checks, not machine inputs.** `/usage` (with aliases `/cost` and `/stats`) in Claude Code is for the developer to inspect. G-Ingá does not parse interactive terminal text.
3. **Plan utilization comes from structured sources only.** In Claude Code, that is the status line's `rate_limits` (`observed`), providing rolling 5-hour and 7-day window percentages and reset timestamps (T18). Where structured quota data does not exist, plan utilization is `unsupported`.
4. **Local-only, privacy-minimal configuration.** Telemetry is configured by the owner in user-level settings or the launch environment, never in a committed repository file (which Claude Code ignores anyway, T2), and exported strictly to the local console or a local endpoint.

   | Setting | Claude Code (Supported Host) | Antigravity CLI `agy` (Supported Host) | Legacy Gemini CLI (Superseded Reference) |
   |---|---|---|---|
   | Turn on | `CLAUDE_CODE_ENABLE_TELEMETRY=1` | `--output-format json` / `stream-json` or `.agents/hooks.json` | `telemetry.enabled: true` |
   | Destination | `OTEL_METRICS_EXPORTER=console`; `OTEL_LOGS_EXPORTER=console` (or local OTLP) | stdout (headless JSON envelope) or disk (`~/.gemini/antigravity-cli/brain/<id>/.system_generated/logs/transcript_full.jsonl`) | `target: "local"` with `outfile` |
   | Prompt and response text | Explicitly set `OTEL_LOG_USER_PROMPTS=0` and `OTEL_LOG_ASSISTANT_RESPONSES=0` | Headless envelope emits response; `transcript_full.jsonl` stores prompts/thoughts. Scrub before export | **`logPrompts: false` set explicitly**, because default is `true` |
   | Tool inputs and content | Explicitly set `OTEL_LOG_TOOL_DETAILS=0` and `OTEL_LOG_TOOL_CONTENT=0` | Captured in `transcript_full.jsonl` step records; scrub before export | Covered by `logPrompts: false` (G8) |
   | Raw API bodies | Explicitly set `OTEL_LOG_RAW_API_BODIES=0` | Not exposed directly in headless JSON | Traces disabled (`traces: false`) |
   | Identity metadata | Set `OTEL_METRICS_INCLUDE_ACCOUNT_UUID=false`. Note: `user.email` is still attached to OTel resources (T9) | Session DB / settings.json may contain auth identities; scrub before sharing | `user.email` and `installation.id` attached (G3) |

   **Privacy and Sanitization Boundary:**
   - Content gates explicitly disabled in Claude Code: G-Ingá's launch configuration explicitly sets all five content gates to `0` (`OTEL_LOG_USER_PROMPTS=0`, `OTEL_LOG_ASSISTANT_RESPONSES=0`, `OTEL_LOG_TOOL_DETAILS=0`, `OTEL_LOG_TOOL_CONTENT=0`, `OTEL_LOG_RAW_API_BODIES=0`). This guarantees prompt text is excluded, assistant responses are redacted as `"<REDACTED>"`, and tool parameters are omitted.
   - Antigravity CLI sanitization boundary: Unlike Claude Code's environment gates, `agy` headless JSON and transcript files contain full text, tool calls, and model thoughts. Raw session transcripts or JSON envelopes must never be committed to Git or exported without automated or manual scrubbing of user prompts, source code, and credentials.
   - Precedence confirmed: Claude Code ignores telemetry exporter settings in a repository's `.claude/settings.json` (T2). Telemetry configuration in the launch environment takes precedence over user defaults and cannot be subverted by cloned repositories.
   - Local containment is not proof of absolute privacy: Local console export and disk storage prevent network egress, but raw logs must never leave the workstation or be committed to Git without an explicit sanitization step that strips personal emails, session tokens, and account identifiers.
5. **One common record per observation, without forced equivalence.** A *usage observation* carries:
   - **source:** CLI, CLI version, signal (`otel-metric`, `otel-log`, `statusline`, `headless-json`, `transcript-log`), authentication kind (`subscription`, `api-key`, `unknown`), and active privacy-flag state;
   - **scope:** `session_id`, `conversation_id`, `prompt_id` or `request_id` when available, model, time window;
   - **measures:** input, output, cache read, cache write, thinking, tool tokens, tool calls by name, active wall duration, API duration, TTFT, context size, compaction tokens before/after. Each measure retains its native field name;
   - **cost estimate:** amount, currency, basis (`list-price estimate by CLI`), and source. It is never billing;
   - **plan utilization:** rolling window, used percentage, reset time, source.

   **Field State Taxonomy:**
   Every measure carries exactly one state:

   | State | Meaning |
   |---|---|
   | `observed` | The source reported a measured value. `0` is valid only when empirically measured as zero |
   | `estimated` | The source labels the value an estimate (Claude `cost_usd`, compaction `pre_tokens`) |
   | `derived` | G-Ingá computed the value from observed fields. The formula is recorded |
   | `absent` | The source supports the field, but nothing was emitted in the scope |
   | `unsupported` | The source schema does not expose the field |
   | `collection_error` | Collection failed or was aborted before measurement. Reason is recorded |

   *Separation of execution state and collection state:* The exit status of a CLI process must not be conflated with metric collection states. When a field is supported by the source schema but nothing is emitted within the scope, its state is `absent`. It is not zero (which would falsely imply zero tokens consumed during an inference) and not `collection_error` (which is reserved for evidence of actual collector failure).
6. **Four separate cost notions, never inferred from one another:**
   1. *Observed usage:* Physical counts of processed units (`input`, `output`, `cacheRead`, `cacheCreation`, `thinking`, active durations), measured according to provider tokenizers.
   2. *Estimated monetary cost:* Claude Code's `cost.usage` / `cost_usd` list-price calculation, useful solely as an informative synthetic benchmark.
   3. *Plan quota and utilization:* Provider-enforced limits (Claude status line 5-hour and 7-day rate limits; Antigravity subscription credit limits).
   4. *Effective billing:* Monthly flat-rate subscription fees ($20/month) that do not vary with token volume. G-Ingá never calculates or claims billing.
7. **Enforcement stays as ADR 0003 sets it.** Token and time limits are `guideline`. Telemetry is emitted after the request and cannot block interactive turns. Plan quotas are enforced by the provider.
8. **Per-task attribution analysis and boundaries:**
   Because runtimes key signals by `session.id` or `conversation_id` rather than task id, linking usage to G-Ingá tasks requires harness association.
   - *Option 1: Record `session_id` in task `## Checkpoint`:* Checkpoints exist only when work stops or crosses sessions ([artifact contracts](../artifact-contracts.md) §1). Checkpoints are overwritten on update, losing the history of earlier sessions.
   - *Option 2: Record `session_id` in `## Routing and approvals`:* The routing log grammar is restricted to ten closed keywords ([artifact contracts](../artifact-contracts.md) §2.3). Adding a `session:` keyword alters the contract grammar.
   - *Option 3: Support multiple sessions per task:* Real tasks that are interrupted, resumed, or escalated naturally span multiple sessions.
   *Resolution for V1:* The contract gap for `session_id` / `conversation_id` remains open. Documentation may manually record an association between a session and a task as exploratory operational evidence in execution reports, but must not present this association as structured, guaranteed, or automatically processable by the harness. Neither `schema: task/1` nor the routing log grammar is modified in V1.
9. **Cumulative vs. Window Semantics (Critical Antigravity Discovery):**
   In Antigravity CLI (`agy`), `usage.input_tokens`, `usage.cache_read_tokens`, and `usage.output_tokens` in the headless JSON envelope represent the **session-cumulative sum** across all model calls, NOT the context footprint of the final turn. Furthermore, `usage.total_tokens` equals `input_tokens + output_tokens` and explicitly excludes `cache_read_tokens`. Basal prompt footprint must be inspected at `step_index: 1` in `transcript_full.jsonl`.
10. **Incomparability of Raw Tokens Across Hosts:**
    **Raw token counts must never be directly compared between Claude Code and Antigravity CLI.** Antigravity injects an extensive system prompt, tool definitions, and environment rules (~12,000 basal tokens) and utilizes distinct tokenizers (Gemini vs. Claude). Compare only verified task success rates, wall time, human interventions, and ceremony escalations.

### Measurement criteria (from ADR 0002 §8)

| Measurement | Where it comes from | Claude Code (Host) | Antigravity CLI `agy` (Host) | Legacy Gemini CLI (Superseded) |
|---|---|---|---|---|
| Tier, escalations, check runs, first-pass result, rework, escaped defects, artifacts read | Task records, Git, friction log | Provider-independent (`observed`) | Provider-independent (`observed`) | Provider-independent (`observed`) |
| Input and output tokens | OTel metrics / Headless JSON | `observed` (`input`, `output`) | `observed` (`input_tokens`, `output_tokens`) | `absent` (auth blocked) |
| Cache tokens | OTel metrics / Headless JSON | `observed` (`cacheRead`, `cacheCreation`) | `observed` (`cache_read_tokens`; `cacheCreation` unsupported) | `absent` (auth blocked) |
| Thinking tokens | OTel metrics / Headless JSON | `unsupported` (conflated in output) | `observed` (`thinking_tokens` in `usage`) | `absent` (auth blocked) |
| Tool calls | OTel events / Session transcript | `observed` (names, counts, duration) | `observed` (in `transcript_full.jsonl`) | `absent` (auth blocked) |
| Wall and API duration | OTel metrics / Headless JSON | `observed` (`active_time`, `api_request`) | `observed` (`duration_seconds`) | `observed` (startup only) |
| Human interventions | Task records & tool decision sources | Partly `observed` | Partly `observed` | Partly `observed` |
| Context use | Status line / Transcript step 1 | `observed` / `estimated` | `observed` (`transcript_full.jsonl` step 1) | `absent` |
| Estimated cost | OTel metric (`cost.usage`) | `estimated` (list price; not billing) | `unsupported` (flat subscription) | `unsupported` |
| Plan utilization | Status line `rate_limits` | `observed` (5h and 7d percentages) | `unsupported` in headless mode | `unsupported` |
| Billing | — | Out of scope | Out of scope | Out of scope |

---

## Spike D4 execution and calibrated findings

Spike D4 was executed on 2026-10-10 (`d4-spike-results.md`, `d4-spike-review.md`). The experiment executed isolated synthetic prompts across both CLIs without altering persistent configurations.

### Calibrated conclusions by criteria

1. **Confirmed in tested environment:**
   - Claude Code (`2.1.296` under personal OAuth Pro) reliably emits OTel metrics (`token.usage`, `cost.usage`, `active_time.total`, `session.count`) and events (`api_request`, `assistant_response`) to the local console.
   - Claude Code privacy gates operate as documented: assistant responses are redacted (`"<REDACTED>"`), and prompt text is excluded when content gates remain unset.
   - Claude Code native `/usage` session and request counters incremented (+1 request, +1 session), matching OTel event counts.
   - Structured plan rate limits (`rate_limits.five_hour`, `rate_limits.seven_day`) are accessible via Claude Code's status line JSON.
2. **Partially supported:**
   - Per-task attribution via session boundaries: Telemetry correctly keys by `session.id`, enabling correlation if the harness tracks session boundaries. However, host runtimes offer zero native task tagging, and multi-session task tracking lacks an artifact schema home.
   - Skill attribution: Upstream documentation indicates user-defined skill names appear in `skill.name` (T5); this was verified in documentation but only partially exercised under synthetic prompts.
3. **Not tested:**
   - Multi-turn token accumulation and cache churn dynamics across complex, long-running tasks.
   - Context compaction event behavior (`claude_code.compaction`).
   - Subagent nested delegation attribution under real workflows.
   - Antigravity CLI (`agy`) OpenTelemetry emission, schema, and performance.
4. **Blocked by external dependency:**
   - Operational token usage and API latency collection in `@google/gemini-cli@0.63.0` under individual Google AI Pro personal accounts, due to upstream Cloud Code onboarding rejection (`IneligibleTierError` / `UNSUPPORTED_CLIENT`).

### Methodological and validity notes

- **Repository validation vs. runtime observation vs. architectural decision:**
  1. *Repository validation:* A passing result from `mise run validate` or `mise run test` verifies Markdown syntax, JSON schemas, and internal link integrity. It does **not** prove runtime behavior, network reliability, or CLI telemetry stability.
  2. *Runtime observation:* A successful or blocked run in an isolated spike demonstrates empirical behavior under specific environment flags at $N=1$, but does not prove statistical stability across multi-turn workflows or compactions.
  3. *Architectural decision:* Defining product boundaries (scoping V1 to Claude Code per ADR 0001, classifying states, deferring Antigravity CLI, or revising contracts for task attribution) is an intentional governance choice by the project owner, not an automatic consequence of passing static tests or running an isolated command.
- **Independence of Claude Code V1:** The upstream deprecation and failure of Gemini CLI under personal accounts does **not** impede or block Claude Code automated observability for V1.
- **No aggregate scores:** Numerical confidence scores are omitted from decision records in favor of explicit qualitative criteria.

---

### Alternatives considered

| ID | Option | Pros | Cons | Verdict |
|---|---|---|---|---|
| A | **Local OpenTelemetry for Claude Code, 6-state common record (this proposal)** | Structured machine ingestion, no parsing, keeps source semantics, proven in Spike D4 | Off by default, requires local launch configuration; multi-session attribution unresolved | **recommended for Claude Code** |
| B | Native views only (`/usage`, `/stats`) | Zero configuration, exposes plan bars | Terminal UI format; automation requires brittle terminal scraping | Rejected for automation; kept as human cross-check |
| C | Conversation transcripts and session files | Already written to disk, message-level granularity | Contains complete prompts, source code, and secrets; format is an unstable internal detail | Rejected for production; used under sanitization for deep audit |
| D | Status line as primary collector | Structured; only source of Claude plan utilization | Claude-only, interactive-only, current-window scope | Used exclusively for Claude plan utilization (item 3) |
| E | **Headless JSON envelope (`-p --output-format json`)** | Per-run structured totals (`usage.input_tokens`, `output_tokens`, `duration_seconds`) | Scripted/headless runs only; does not cover interactive TUI sessions | **recommended for Antigravity CLI evaluation harness** |
| F | Proxy or gateway in front of CLIs | Centralized logging point | Operational complexity without logged friction; violates Google terms (G19) | Rejected |
| G | No measurement; friction log only | Zero setup overhead | Loses ability to evaluate tokens per verified task (principle §6) | Rejected |
| H | Normalized single schema with mandatory fields | Simplified schema | Forces fake zeros and conflates unlike tokenizers across models | Rejected |

---

## Consequences

- Automated observability in G-Ingá covers both supported V1 hosts with tailored local channels: Claude Code via local OpenTelemetry console export, and Google Antigravity CLI via headless JSON envelopes (`--output-format json`) and sanitized transcript inspection.
- The harness avoids remote telemetry daemons or third-party egress; collection is entirely local to the developer's workstation.
- Raw token numbers across hosts are explicitly non-comparable; evaluations focus on ceremony escalations, task pass rates, and wall durations.
- The fixed per-turn context cost limit ([ADR 0005](0005-native-primitive-mapping.md), U7) remains unset until real development tasks are observed under G-Ingá.

## Risks

- **Semantic and version drift:** Fast-moving CLI releases may alter metric names or attributes. Observations must record CLI version.
- **Identity leakage in local metadata:** Standard OTel attributes attach `user.email`. Any automated tool that exports or archives telemetry must scrub identity fields.
- **Transcript and envelope leakage:** Antigravity CLI transcripts and JSON output contain prompts and code snippets. Local sanitization is mandatory before committing or sharing experimental records.

---

## Relation to D7 and minimal V1 evaluation

Decision **D7** addresses evaluation: defining the smallest repeatable comparison to measure whether G-Ingá optimizes tokens and time per verified task ([principles](../principles.md) §6).

### Disentangling D7 from D4

1. **What D7 requires from D4:**
   - A verified local mechanism to observe input tokens, output tokens, cache reads/writes, active execution duration, and plan rate-limit utilization across supported hosts (Claude Code via OTel / statusline, Antigravity CLI via headless JSON / transcripts).
   - Strict separation of estimated list-price figures from billing.
   - Non-comparability guidelines preventing naive token-count comparisons across different model tokenizers.
2. **What D7 does NOT require from D4:**
   - External telemetry daemons, collector processes, or time-series databases.
   - Synthetic benchmarks (HumanEval, SWE-bench) or mandatory multi-repository labs (PetClinic remains an optional fixture per ADR 0001).
   - Arbitrary numerical token budgets or artificial execution thresholds.

### Evaluation boundaries: ready vs. limited in D7

To prevent contradictions between the open task attribution contract and evaluation goals, D7's scope is strictly separated:

1. **D7 that can advance now:**
   - Deterministic verification results per task (`pass`, `fail`, `blocked`, `not run` at `verified_at`);
   - First-pass verification success rate (criteria verified at `verified_at` without regression);
   - Recorded ceremony escalations (`light` → `standard` → `heavy`);
   - Frictions identified and resolved in `friction-log.md`;
   - Matched before-and-after comparisons on real development tasks, with documented attribution limitations;
   - Per-session telemetry observations recorded manually as exploratory evidence (e.g., in execution reports), without presenting them as structured, automated per-task metrics.
2. **D7 that remains limited:**
   - Automated attribution of tokens and active execution duration per task;
   - Aggregations requiring a structured, machine-verifiable relationship between `session.id` / `conversation_id` and `task.id`.

### Minimal V1 evaluation definition

The minimal V1 evaluation framework is defined as follows:

- **Workload:** Matched before-and-after comparisons on real development tasks within the owner's personal repositories, comparing unassisted CLI sessions against G-Ingá harness guidance.
- **Deterministic Quality Gates (Ready):** First-pass verification success rate (criteria verified at `verified_at` without rework/regression loops) and deterministic verification outcomes.
- **Process Friction (Ready):** Count of ceremony escalations (`light` → `standard` → `heavy`) and friction entries logged in `friction-log.md`.
- **Usage Signals (Exploratory / Limited):** Session-level token totals and active execution wall time observed locally (OTel for Claude Code, headless JSON for Antigravity) and noted manually as exploratory evidence alongside task execution reports. Automated aggregation per task is excluded pending schema evolution.
- **Specification Boundary:**
  - *Specifiable now:* Task selection criteria, verification evidence requirements, friction logging conventions, and host capture commands.
  - *Dependent on future schema evolution:* Automated joining of host session identifiers to `task.id`. No contract or schema is altered in V1.

---

## What needs the owner

1. **Confirm the multi-host observability model:** Confirm the dual-channel approach (local OTel for Claude Code; headless JSON / sanitized transcripts for Antigravity CLI) and the 6-state taxonomy for local usage observations.
2. **Task attribution direction:** When artifact schemas are next revised, decide where `session_id` / `conversation_id` should be recorded (amendment to `schema: task/1` frontmatter, a new keyword in `## Routing and approvals`, or handled strictly in ephemeral execution reports).
3. **Accept, revise or reject this record:** This record remains `proposed` pending the owner's explicit decision.
