# D4 evidence: usage, context, tool and cost signals in Claude Code and Gemini CLI

**Status:** research note (input to [ADR 0006](../decisions/0006-usage-observability.md)). Not a decision.
**Read on:** 2026-10-10. Claude Code CLI in the session container: `2.1.296`. Gemini CLI wasn't installed or run; its claims come from upstream documentation and source at a pinned commit.

## Scope and environments

The owner uses two environments (owner statement, 2026-10-10, not inspected):

- **E1:** Claude Code, signed in with a Claude Pro subscription.
- **E2:** Gemini CLI, signed in with a Google AI Pro subscription (Google account login).

Research on how G-Ingá would run inside Gemini CLI is happening on a separate branch. This note doesn't read it or depend on it. It covers only what each CLI exposes for observing usage.

Nothing below was exercised: no telemetry was turned on, no exporter ran, and no task was measured. The comparative spike waits for the owner's approval (ADR 0006, "Spike").

## Labels

- **Fact (docs):** read in the official page, live on the date above, or in upstream docs at the pinned commit.
- **Fact (source):** read in upstream source code at the pinned commit.
- **Observed:** seen in this container, with the command that shows it. One environment, one time.
- **Inference (ours):** our reading, for the owner to check.
- **Hypothesis:** a claim to test, typically in the spike.
- **Open:** not known.

Codes: `T` for Claude Code docs, `G` for Gemini CLI, `K` for local observations here.

## Sources

| Source | Revision | Read |
|---|---|---|
| Claude Code docs, [costs](https://code.claude.com/docs/en/costs) | live page, 2026-10-10, raw Markdown (41 KB), read in full | `/usage`, plan breakdown, prompt cache line |
| Claude Code docs, [monitoring usage](https://code.claude.com/docs/en/monitoring-usage) | live page, 2026-10-10, raw Markdown (153 KB) | configuration variables, content gates, standard attributes, metrics, cost and token counters, events (`api_request`, `tool_result`, `compaction`), security and privacy. Traces sections read only for their content gates |
| Claude Code docs, [status line](https://code.claude.com/docs/en/statusline) | live page, 2026-10-10, raw Markdown (67 KB) | input JSON fields, context window fields, rate limit usage |
| Claude Code docs, [commands](https://code.claude.com/docs/en/commands) | live page, 2026-10-10 | rows for `/usage`, `/cost`, `/stats`, `/context` |
| Local CLI | `claude` `2.1.296` | `claude --help` (`--max-budget-usd`), this session's transcript |
| Gemini CLI, `google-gemini/gemini-cli` | [`9b6e026`](https://github.com/google-gemini/gemini-cli/tree/9b6e0265d16bbd29ca51e33c9e0c01dc4cec5e83), `main` HEAD on 2026-10-10 | docs: `docs/cli/telemetry.md`, `docs/reference/commands.md` (`/stats`), `docs/cli/headless.md`, `docs/reference/configuration.md` (precedence, `privacy`, `telemetry`, `ui.footer`, `model.maxSessionTurns`), `docs/cli/session-management.md`, `docs/resources/quota-and-pricing.md`, `docs/resources/tos-privacy.md`. Source: `packages/core/src/telemetry/types.ts`, `loggers.ts`, `sdk.ts`, `clearcut-logger/clearcut-logger.ts` |

Not read: Claude Code's [data usage](https://code.claude.com/docs/en/data-usage) page (Anthropic's own operational telemetry), its [settings reference](https://code.claude.com/docs/en/settings-reference) section on ignored `env` variables, and Gemini CLI's headless `stats` schema beyond the headless reference. Each is named where a claim depends on it.

## 1. Claude Code

### 1.1 OpenTelemetry

| # | Label | Claim | Where |
|---|---|---|---|
| T1 | Fact (docs) | Export is turned on with `CLAUDE_CODE_ENABLE_TELEMETRY=1`. Exporters: metrics `otlp`, `prometheus`, `console`, `none`; logs (events) `otlp`, `console`, `none`; traces are beta. "OpenTelemetry export to your backend is opt-in and requires explicit configuration." | monitoring usage: quick start, configuration variables, security and privacy |
| T2 | Fact (docs) | "Claude Code ignores the OpenTelemetry exporter variables in a repository's `.claude/settings.json` and `.claude/settings.local.json`, so a repository can't use them to turn telemetry on, choose where it goes, or capture content." They go in managed settings, user settings, `--settings` or the launch environment | monitoring usage, line 65 of the raw page |
| T3 | Fact (docs) | Metrics: `claude_code.session.count`, `lines_of_code.count`, `pull_request.count`, `commit.count`, `cost.usage` (USD, "Cost of the Claude Code session"), `token.usage` (tokens), `code_edit_tool.decision`, `active_time.total` (s) | monitoring usage, metrics table |
| T4 | Fact (docs) | `token.usage` and `cost.usage` are "incremented after each API request". Token `type` is `input`, `output`, `cacheRead` or `cacheCreation`; `input` excludes cache reads and writes. Both carry `model`, `query_source` (`main`, `subagent`, `auxiliary`), `speed`, `effort`, and attribution `agent.name`, `skill.name`, `plugin.name`, `marketplace.name`, `mcp_server.name`, `mcp_tool.name` | monitoring usage, cost counter and token counter |
| T5 | Fact (docs) | Attribution redaction: user-defined skill names appear verbatim; user-defined agent names become `"custom"`; third-party plugin skills and plugins become `"third-party"`. `OTEL_LOG_TOOL_DETAILS=1` reveals real names, and also tool inputs and Bash commands | monitoring usage, cost counter; configuration variables |
| T6 | Fact (docs) | Event `claude_code.api_request`, one per API call: `model`, `cost_usd` ("Estimated cost in USD"), `cost_usd_micros`, `duration_ms`, `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_creation_tokens`, `query_source`, `effort`, the attribution fields, and `prompt.id` for correlation | monitoring usage, API request event |
| T7 | Fact (docs) | Event `claude_code.tool_result`: tool name, `success`, `duration_ms`, `decision_source`. Tool parameters, inputs and full error messages only with `OTEL_LOG_TOOL_DETAILS=1` | monitoring usage, tool result event |
| T8 | Fact (docs) | Event `claude_code.compaction`: `trigger` (`auto`, `manual`), `success`, `duration_ms`, `pre_tokens` and `post_tokens` ("approximate token count") | monitoring usage, compaction event |
| T9 | Fact (docs) | Standard attributes include `session.id`, `organization.id`, `user.account_uuid` and `user.account_id` (`OTEL_METRICS_INCLUDE_ACCOUNT_UUID`, default `true`) and `user.email`, "always included when available". With OAuth sign-in, `user.email` is "sent only to the OTel endpoint you configure, never to Anthropic" | monitoring usage, standard attributes; security and privacy |
| T10 | Fact (docs) | Content gates, all off by default: `OTEL_LOG_USER_PROMPTS` (prompt text; "Only prompt length is recorded" otherwise), `OTEL_LOG_ASSISTANT_RESPONSES`, `OTEL_LOG_TOOL_DETAILS`, `OTEL_LOG_TOOL_CONTENT` (needs tracing), `OTEL_LOG_RAW_API_BODIES` (full request and response bodies, including the conversation history). "Raw file contents and code snippets are not included in metrics or events" | monitoring usage, configuration variables; security and privacy |
| T11 | Fact (docs) | `OTEL_RESOURCE_ATTRIBUTES` adds custom key–value pairs, which `OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES` (default `true`) copies onto metric datapoints | monitoring usage, multi-team attributes |
| T12 | Open | The monitoring page doesn't condition telemetry on the authentication method or plan. Whether every metric above is emitted under a Claude Pro OAuth sign-in wasn't verified | — |

### 1.2 Native commands, status line, transcripts

| # | Label | Claim | Where |
|---|---|---|---|
| T13 | Fact (docs) | `/usage` shows "session cost, plan usage limits, and activity stats". **`/cost` and `/stats` are aliases of `/usage`** (`/stats` opens the Stats tab) | commands |
| T14 | Fact (docs) | The `/usage` Session block shows per-model input, output, cache read and cache write tokens plus a dollar figure computed "locally from token counts at list price". It "is intended for API users. Claude Max and Pro subscribers have usage included in their subscription, so the session cost figure isn't relevant for billing purposes." Totals reset on `/clear` | costs, "Using the `/usage` command" |
| T15 | Fact (docs) | On Pro, Max, Team and Enterprise, `/usage` adds plan usage bars and an attribution of recent usage to skills, subagents, plugins and MCP servers as percentages, "approximate and computed from local session history on this machine" | costs, "Plan usage breakdown" |
| T16 | Fact (docs) | `/context` visualizes current context usage as a grid with optimization suggestions | commands |
| T17 | Fact (docs) | The status line command receives JSON on stdin with `cost.total_cost_usd` (estimate at list price), `cost.total_duration_ms`, `cost.total_api_duration_ms`, `context_window.total_input_tokens`, `total_output_tokens`, `context_window_size`, `used_percentage`, `current_usage` (per category, from the last API call), `prompt_cache`, `session_id` and `transcript_path` | status line, available data |
| T18 | Fact (docs) | `rate_limits.five_hour` and `rate_limits.seven_day`, each with `used_percentage` (0–100) and `resets_at`, are present "only for claude.ai Pro and Max subscribers, or behind a Claude apps gateway with spend limits, and only after the first API response" | status line, "Rate limit usage" |
| T19 | Fact (local CLI) | `--max-budget-usd <amount>`: "Maximum dollar amount to spend on API calls (only works with --print)" | `claude --help`, `2.1.296` |
| K1 | Observed | This session's transcript (`~/.claude/projects/<project>/<session>.jsonl`) has `message.usage` on 39 assistant entries, with `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `service_tier` and `speed`. It also holds the full conversation | local file, read for key names only |

## 2. Gemini CLI

### 2.1 OpenTelemetry

| # | Label | Claim | Where |
|---|---|---|---|
| G1 | Fact (docs) | Settings `telemetry.*` in `.gemini/settings.json`, overridable by environment variables. Defaults: `enabled` `false`, `traces` `false`, `target` `"local"`, `otlpEndpoint` `http://localhost:4317`, **`logPrompts` `true`**, `useCollector` `false`. `outfile` saves telemetry to a file and overrides `otlpEndpoint`. The docs recommend file output for local development | `docs/cli/telemetry.md`, configuration table, "Local telemetry" |
| G2 | Fact (docs) | Settings precedence, lowest first: defaults, system defaults, user `~/.gemini/settings.json`, **project `.gemini/settings.json`**, system settings, environment variables, command-line arguments. The telemetry page names no exception for project settings | `docs/reference/configuration.md`, lines 9–60 |
| G3 | Fact (docs) | Common attributes on all data: `session.id`, `installation.id`, `active_approval_mode`, and `user.email` "when authenticated" | `docs/cli/telemetry.md`, "Logs, metrics, and traces" |
| G4 | Fact (docs) | Metric `gemini_cli.token.usage`, `type` = `input`, `output`, `thought`, `cache` or `tool`, attribute `model`. Also `api.request.count` and `.latency`, `tool.call.count` (`function_name`, `success`, `decision`, `tool_type`) and `.latency`, `agent.run.count`, `agent.duration`, `agent.turns`, `chat_compression`, and the GenAI semantic-convention metrics `gen_ai.client.token.usage` and `gen_ai.client.operation.duration`. **No cost metric** | `docs/cli/telemetry.md`, metrics |
| G5 | Fact (docs) | Log `gemini_cli.api_response`: `model`, `status_code`, `duration_ms`, `input_token_count`, `output_token_count`, `cached_content_token_count`, `thoughts_token_count`, `tool_token_count`, `total_token_count`, `prompt_id`, `auth_type`, `finish_reasons`, optional `response_text` | `docs/cli/telemetry.md`, API logs |
| G6 | Fact (docs) | Log `gemini_cli.tool_call`: `function_name`, `function_args`, `duration_ms`, `success`, `decision`, `tool_type`, `mcp_server_name`, `prompt_id`, optional line-change metadata. Log `gemini_cli.chat_compression`: `tokens_before`, `tokens_after` | `docs/cli/telemetry.md`, tools; chat and streaming |
| G7 | Fact (docs) | Log `gemini_cli.user_prompt`: `prompt_length`, `prompt_id`, and `prompt`, "excluded if `telemetry.logPrompts` is `false`". `gemini_cli.config` records `log_user_prompts_enabled` and `auth_type` | `docs/cli/telemetry.md`, sessions |
| G8 | Fact (source) | Payload gating at `9b6e026`: `prompt`, `request_text`, `response_text`, `function_args` and tool metadata are added only when `getTelemetryLogPromptsEnabled()` is true. `gen_ai.input.messages` on the GenAI operation-details log records is added only when `shouldIncludePayloads(config)`, defined as `getTelemetryTracesEnabled() && getTelemetryLogPromptsEnabled()` | `packages/core/src/telemetry/types.ts` L108, L222, L381–385, L415–418, L451, L479–483, L721 |
| G9 | Fact (docs) | "Detailed trace attributes (like full prompts and tool outputs) are disabled by default"; `telemetry.traces` turns them on | `docs/cli/telemetry.md`, traces |
| G10 | Fact (docs + source) | A separate channel, Usage Statistics, goes to Google through the Clearcut logger, controlled by `privacy.usageStatisticsEnabled`, **default `true`**. `logApiResponse`, `logToolCall` and others call `ClearcutLogger.getInstance(config)`, which returns nothing when the setting is off. The privacy notice says these statistics follow Google's Privacy Policy and explains how to opt out. What the Clearcut events contain wasn't read | `docs/reference/configuration.md` L502–505; `docs/resources/tos-privacy.md` L16, L100–104; `loggers.ts` L307–316; `clearcut-logger.ts` L341 |
| G11 | Fact (source) | The SDK builds its OpenTelemetry resource from `service.name` and `service.version` with `resourceFromAttributes`. Whether `OTEL_RESOURCE_ATTRIBUTES` from the environment is merged wasn't established | `packages/core/src/telemetry/sdk.ts` L215–217 |
| G12 | Fact (docs) | `target: "gcp"` exports to Google Cloud Trace, Monitoring and Logging in a project the user sets, and can reuse the CLI's OAuth credentials (`useCliAuth`) | `docs/cli/telemetry.md`, "Google Cloud telemetry" |

### 2.2 Native commands, footer, session files, quota

| # | Label | Claim | Where |
|---|---|---|---|
| G13 | Fact (docs) | `/stats` shows statistics for the current session. Sub-commands: `session` (default: duration, tool calls, performance), `model` ("token counts and quota information"), `tools` | `docs/reference/commands.md` L438–450 |
| G14 | Fact (docs) | Headless mode (`-p` or a non-TTY): `--output-format json` returns `response`, `stats` ("Token usage and API latency metrics") and `error`; `stream-json` ends with a `result` event carrying "aggregated statistics and per-model token usage breakdowns". The field names inside `stats` aren't listed there. Exit code `53` means "Turn limit exceeded" | `docs/cli/headless.md` |
| G15 | Fact (docs) | No user-scriptable status line was found in the configuration reference. The built-in footer can show model and context usage; `ui.footer.hideContextPercentage` defaults to `true` | `docs/reference/configuration.md` L350–382 |
| G16 | Fact (docs) | Sessions are saved automatically under `~/.gemini/tmp/<project_hash>/chats/` with the full conversation, tool inputs and outputs, "token usage statistics (input, output, cached, etc.)" and thought summaries. Retention is configurable (`sessionRetention.maxAge`) | `docs/cli/session-management.md` L13–22, L152–184 |
| G17 | Fact (docs) | Quota for a Google account on Google AI Pro: 1,500 requests per user per day. Paid subscriptions are "fixed price". Quotas "are specific to your account and their limits vary" | `docs/resources/quota-and-pricing.md` L15–24, L78, L101–105 |
| G18 | Fact (docs) | `model.maxSessionTurns` caps user, model and tool turns in a session (`-1` unlimited) | `docs/reference/configuration.md` L539–542 |
| G19 | Fact (docs) | Accessing the services behind Gemini CLI "using third-party software, tools, or services (for example, using OpenClaw with Gemini CLI OAuth) is a violation of applicable terms" | `docs/resources/tos-privacy.md` L10–14 |

## 3. Signal matrix

Kinds: **observed** (the CLI reports a counted value), **estimated** (the CLI labels it an estimate), **derived** (G-Ingá would compute it), **unavailable**. Use: **guidance** (shown to a person or agent during work), **audit** (recorded for later analysis), **enforcement** (something stops the action).

### 3.1 Claude Code, Claude Pro (E1)

| Signal | Measures | Kind | Works on Pro? | Granularity and attribution limits | Configuration, default | Privacy exposure | Use |
|---|---|---|---|---|---|---|---|
| OTel `token.usage` (T4) | tokens per request by `type`, aggregated as a counter | observed | not conditioned on auth in the docs; unverified (T12) | per session and model; attribution to skill (verbatim for own skills) and subagent (`custom`) (T5). No task id | off; user, managed or launch env only (T2) | metadata plus `user.email`, account ids (T9) | audit |
| OTel `api_request` event (T6) | the same per request, plus duration and `prompt.id` | observed (tokens), estimated (`cost_usd`) | as above | per request; joins prompts through `prompt.id` | off; needs a logs exporter | as above; no content by default (T10) | audit |
| OTel `cost.usage` (T3, T4) | dollars at list price | estimated | emitted figure isn't billing for Pro (T14) | per session and model | off | as above | audit only, labeled estimate |
| OTel `tool_result` (T7) | tool name, success, duration | observed | as above | per call; inputs gated | off | Bash commands and inputs only if `OTEL_LOG_TOOL_DETAILS=1` | audit |
| OTel `compaction` (T8) | tokens before and after compaction | estimated ("approximate") | as above | per compaction | off | metadata | audit |
| `/usage` (aliases `/cost`, `/stats`) (T13–T15) | session tokens, list-price estimate, plan bars, attribution shares | observed / estimated | yes; plan bars and attribution are subscriber features | session; attribution is approximate, local history only | always available, interactive | stays on screen | guidance; a person's cross-check |
| Status line JSON (T17, T18) | session cost estimate, durations, live context window, prompt cache, **plan rate-limit utilization** | observed (tokens, context, rate limits), estimated (cost) | yes; `rate_limits` exists only for Pro and Max | session and current window, not task | needs a status line command in user settings | local process only | guidance; audit if the script records it |
| `/context` (T16) | context composition | observed | yes | current window | interactive | screen only | guidance |
| Transcript JSONL (K1) | per-message usage | observed | observed in a cloud session; plan unknown | per message | always written | **full conversation, code and tool output** | not proposed (fallback for the spike only) |
| `--max-budget-usd` (T19) | dollar estimate cap | estimated | unverified for subscription | per `-p` run | flag | none | enforcement in print mode, on an estimate; not adopted |

### 3.2 Gemini CLI, Google AI Pro (E2)

| Signal | Measures | Kind | Works on AI Pro? | Granularity and attribution limits | Configuration, default | Privacy exposure | Use |
|---|---|---|---|---|---|---|---|
| OTel `token.usage` (G4) | tokens by `input`, `output`, `thought`, `cache`, `tool` | observed | not conditioned on auth in the docs; unverified | per model; `session.id` common attribute (G3). No skill attribution; agent runs have their own metrics | off; target `local` | `user.email`, `installation.id` (G3) | audit |
| OTel `api_response` log (G5) | per request token counts by category, duration, `prompt_id`, `auth_type` | observed | as above | per request | off | `response_text` only with `logPrompts` (G8) | audit |
| Cost | — | **unavailable** (no metric, G4) | — | — | — | — | — |
| OTel `tool_call` log and metrics (G6) | tool name, success, decision, duration | observed | as above | per call | off | `function_args` only with `logPrompts` (G8) | audit |
| OTel `user_prompt` log (G7) | prompt length, id | observed | as above | per prompt | off | **prompt text by default** once telemetry is on, because `logPrompts` defaults to `true` (G1) | audit, only with `logPrompts: false` |
| OTel `chat_compression` (G6) | tokens before and after | observed | as above | per compression | off | metadata | audit |
| `/stats session`, `model`, `tools` (G13) | duration, tool calls, token counts, quota information | observed | yes per docs; quota content for AI Pro unverified | session | interactive | screen only | guidance; a person's cross-check |
| Headless `stats` (G14) | token usage and latency per run | observed | unverified | per `-p` run | flag | depends on the run | audit, for scripted evaluation runs (D7) |
| Footer (G15) | model, context percentage | observed | yes | current window | percentage hidden by default | screen | guidance |
| Session files (G16) | conversation and token usage | observed | yes | per session | always on, retention configurable | **full conversation and tool output** | not proposed |
| `model.maxSessionTurns`, exit `53` (G14, G18) | turn cap | — | yes | per session | setting | none | enforcement of turns, not tokens; not adopted |
| Quota (G17) | 1,500 requests per day for AI Pro | documented limit; live utilization only as `/stats model` text | yes | per account per day | provider | — | guidance; provider-enforced |
| Usage Statistics to Google (G10) | not read | — | — | — | **on by default** | leaves the machine to Google | not a G-Ingá signal; a privacy setting |

### 3.3 What differs, and what can't be compared yet

- **Fact:** Claude's token `input` excludes cache reads and writes, which have their own types (T4). Gemini's docs list `input_token_count` and `cached_content_token_count` side by side but don't say whether one includes the other (G5). **Open:** whether adding Gemini input and cache double-counts.
- **Fact:** Gemini reports `thought` and `tool` token types (G4). Claude's token counter has no thinking type; its docs elsewhere say thinking is billed as output (costs page, "Adjust extended thinking"). **Inference:** Claude thinking tokens are inside `output`, not separable from these signals.
- **Fact:** only Claude emits a dollar estimate (T6, T3). Gemini has none (G4).
- **Fact:** plan utilization is structured only in Claude's status line (T18). Gemini shows quota in `/stats model` text (G13), and G-Ingá won't parse text output.
- **Inference:** the two CLIs use different tokenizers and models. Equal counts don't mean equal work, so cross-CLI totals aren't comparable. Comparisons stay within one CLI and one model until a spike shows otherwise.

## 4. Privacy: what can leave the machine

| Path | Claude Code | Gemini CLI |
|---|---|---|
| OpenTelemetry to a local file or collector | stays local when the exporter is `console` or the endpoint is local (T1) | stays local with `target: "local"` and `outfile` (G1) |
| OpenTelemetry to a remote endpoint | wherever the user points it; `user.email` included (T9) | `target: "gcp"` sends to a Google Cloud project (G12); `user.email` included (G3) |
| Prompt and response text in telemetry | off by default (T10) | **on by default once telemetry is enabled** (`logPrompts: true`, G1); payloads in GenAI records also need `traces` (G8) |
| A cloned repository turning telemetry on | can't, through project settings (T2) | **Inference:** can. Project `.gemini/settings.json` outranks user settings (G2), and nothing exempts `telemetry`. Not tested |
| Vendor's own usage statistics | separate operational telemetry, governed by a page not read here | Clearcut Usage Statistics, on by default (G10) |
| Local full-content stores | transcripts (K1) | session files (G16) |

## 5. Mapping to ADR 0002 §8 measurements

| ADR 0002 §8 measurement | Source | Claude Code | Gemini CLI |
|---|---|---|---|
| Initial and final tier, escalations and triggers | task record routing log (contract) | provider-independent | provider-independent |
| Tokens: input, output | OTel | `token.usage` `input`, `output` (T4) | `token.usage` `input`, `output` (G4) |
| Tokens: cache read and write | OTel | `cacheRead`, `cacheCreation` (T4) | `cache` only, no read/write split (G4) |
| Thinking tokens (not in §8, reported when present) | OTel | unavailable separately | `thought` (G4) |
| Wall time | OTel | `active_time.total`, `api_request.duration_ms` (T3, T6) | `api.request.latency`, `agent.duration` (G4) |
| Number of check runs | task record verification table | provider-independent | provider-independent |
| Human interventions | task record and `tool_result.decision_source` (T7) | partly observed | `tool_call.decision` (G6) |
| First-pass verification, rework, escaped defects | task record, Git, friction log | provider-independent | provider-independent |
| Artifacts produced vs read later | Git and the records | provider-independent | provider-independent |
| Cost | — | estimate only (T6), not billing on Pro (T14) | unavailable |
| Plan utilization (not in §8, kept separate) | status line / `/stats` | `rate_limits` (T18) | quota in text only (G13, G17) |

Attribution to a task is the gap in both CLIs: every signal is keyed by session, prompt or request, never by a G-Ingá task (T4, G3). **Inference:** one session per task (the SDLC brief's default) plus the session id recorded with the task would close it; where that id is written is an open question for ADR 0006.

## 6. Hard vs guideline

- **Fact:** every signal above is reported after the request that produced it (T4, G5). None can stop a request in an interactive session.
- **Fact:** Claude's `--max-budget-usd` stops a `-p` run on a dollar estimate (T19); Gemini's `maxSessionTurns` caps turns (G18). Neither is a token budget, and neither applies to interactive work.
- **Fact:** plan quotas are enforced by the provider (T18, G17). G-Ingá can report them, not set them.
- **Inference:** under ADR 0003 decision item 10, token and time limits stay `guideline`. Measurement adds evidence for later tuning, not enforcement.

## 7. Open questions and hypotheses

| ID | Question or hypothesis | How to settle |
|---|---|---|
| Q1 | Do Claude Code's OTel token and cost metrics emit under Claude Pro OAuth (T12)? | spike |
| Q2 | Do Gemini CLI's OTel metrics and logs emit under a Google AI Pro login, and with what `auth_type`? | spike |
| Q3 | Does Gemini `input_token_count` include `cached_content_token_count`? | source reading or spike |
| Q4 | Field names inside Gemini headless `stats` | spike or source reading |
| Q5 | Does Gemini merge `OTEL_RESOURCE_ATTRIBUTES` into its resource (G11)? This decides whether a task label can ride along | source reading |
| Q6 | Does a project `.gemini/settings.json` turn telemetry on or set `logPrompts` (G2)? | spike in a throwaway directory |
| Q7 | What Gemini's Clearcut Usage Statistics contain (G10) | source reading; owner decides the opt-out |
| H1 | Hypothesis: within one CLI, OTel totals for a session match the native view (`/usage` or `/stats model`) for the same session | spike |
| H2 | Hypothesis: a privacy-minimal configuration (ADR 0006) still yields every field §5 needs | spike |
