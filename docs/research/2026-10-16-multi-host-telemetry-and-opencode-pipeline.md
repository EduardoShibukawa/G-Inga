# Multi-Host Telemetry and OpenCode Pipeline Research

Date: 2026-10-16. Status: research note (input to [ADR 0006](../decisions/0006-usage-observability.md) extension and spec [2026-10-16-usage-telemetry-pipeline](../../specs/2026-10-16-usage-telemetry-pipeline.md)).

## 1. Context and Problem Statement

Earlier observability work ([ADR 0006](../decisions/0006-usage-observability.md), [D4 evidence](d4-observability-evidence.md)) focused on Claude Code and Antigravity CLI, establishing the 6-state measurement taxonomy (`observed`, `estimated`, `derived`, `absent`, `unsupported`, `collection_error`) and strict privacy boundaries. However:

1. Telemetry collection remained largely manual or episodic during evaluations ([ADR 0008](../decisions/0008-skill-evaluation-instrument.md), [D7 evaluation protocol](d7-evaluation-protocol.md)).
2. OpenCode CLI usage was not observed or ingested into repository ledgers, despite OpenCode serving as an active coding agent host ([multi-host analysis](2026-10-13-multi-host-orchestration-analysis.md)) and plugin distribution target (`packages/opencode-plugin`).
3. Day-to-day continuous telemetry lacked automatic hooks to capture session metrics upon completion across hosts without remote egress.

This research document analyzes the CLI surfaces, OpenTelemetry (OTel) capabilities, and lifecycle hook integrations across all three target hosts—OpenCode CLI, Google Antigravity CLI, and Claude Code—to establish a unified local telemetry ingestion pipeline.

---

## 2. OpenCode CLI Telemetry Surfaces and Plugin Architecture

### 2.1 CLI Invocation and Output Surfaces

The installed OpenCode CLI (`opencode` v2.0.29+) provides three distinct command surfaces for observing and extracting execution metrics:

1. **Headless Execution (`opencode run --format json`):**
   - The `run` subcommand supports non-interactive execution with `--format json`.
   - In JSON output mode, OpenCode emits structured execution events and step summaries directly to `stdout`.
   - Each completed turn emits token accounting attributes: `tokens.input`, `tokens.output`, `tokens.reasoning`, and prompt cache metrics (`tokens.cache.read`, `tokens.cache.write`), along with `cost` and resolved model metadata (`providerID`, `id`, `variant`).

2. **Session Export (`opencode session export [--sanitize] [<session>]`):**
   - The `session export` command dumps complete session data in JSON format containing top-level properties: `info` (session metadata) and `messages` (chronological array of turns).
   - In non-interactive environments, a specific session ID must be passed (e.g., `opencode session export <sessionId>`).
   - Every assistant turn in `messages` carries:
     - `tokens.input` (prompt tokens not served from cache)
     - `tokens.output` (completion tokens)
     - `tokens.reasoning` (reasoning/thinking tokens, distinct from completion)
     - `tokens.cache.read` (cached prompt tokens)
     - `tokens.cache.write` (cache creation tokens)
     - `cost` (estimated cost in USD computed by provider pricing)
     - `model` (e.g. `{ "id": "nemotron-3.5-super-vl-free", "providerID": "opencode", "variant": "default" }`)
   - **Built-in Sanitization:** Passing `--sanitize` causes OpenCode to automatically redact prompt text, message bodies, and file paths into placeholder tokens (e.g., `[redacted:text:msg_...]`), eliminating credential and proprietary code leakage at the source while preserving token metrics.

3. **Aggregate Statistics (`opencode stats --json`):**
   - The `stats` subcommand computes aggregated analytics across sessions.
   - Flags include `--json`, `--project <dir>`, `--days <N>`, `--all`, `--models`, `--tools`, and `--cost`.
   - `--json` outputs a machine-readable summary:
     - `tokens`: `{ "input": N, "output": N, "reasoning": N, "cache": { "read": N, "write": N } }`
     - `cost`: numeric USD sum.
     - `models`: per-model breakdowns of steps, input/output/reasoning/cache tokens, and cost.
     - `tools`: counts of tool invocations, success/failure counts, and median durations (`durationP50`).

### 2.2 OTLP Plugin Architecture (`@devtheops/opencode-plugin-otel`)

OpenCode supports background OpenTelemetry export via the `@devtheops/opencode-plugin-otel` plugin (version 2.0.1+):

- **Architecture:** The plugin registers with OpenCode's plugin lifecycle and wraps agent execution with standard OpenTelemetry SDK components:
  - `@opentelemetry/sdk-metrics` (metric streams: counters, histograms)
  - `@opentelemetry/sdk-logs` (event logs)
  - `@opentelemetry/sdk-trace-base` (span traces)
  - `@arizeai/openinference-semantic-conventions` (standard LLM span attributes: `llm.token_count.prompt`, `llm.token_count.completion`, `llm.model_name`)
- **Exporters:** Supports gRPC, HTTP/protobuf, and HTTP/JSON exporters via standard OTLP environment variables:
  - `OTEL_EXPORTER_OTLP_ENDPOINT` (e.g., `http://localhost:4318`)
  - `OTEL_EXPORTER_OTLP_PROTOCOL` (`http/json`, `http/protobuf`, `grpc`)
  - `OTEL_SERVICE_NAME=opencode`
- **Deployment:** The plugin is added via `opencode plugin add @devtheops/opencode-plugin-otel` or placed in `~/.config/opencode/plugins/`. In CI or automated runs where a local collector is absent, fallback to `opencode session export --sanitize` or `opencode run --format json` ensures robust, zero-daemon metric extraction.

---

## 3. Antigravity CLI Lifecycle Hooks and Transcript Processing

### 3.1 Lifecycle Hook Architecture (`.agents/hooks.json`)

Antigravity CLI provides native lifecycle hooks configured in `.agents/hooks.json` (or `.agent/hooks.json`, `~/.gemini/config/hooks.json`):

- **Execution Model:** Hooks run external shell commands (`type: "command"`) synchronously at key lifecycle transition points.
- **Hook Events:**
  - `SessionStart`: Runs once when a session starts.
  - `PreToolUse` / `PostToolUse`: Runs before/after tool execution with tool-specific matchers.
  - `PreInvocation`: Runs before calling the model.
  - `PostInvocation`: Runs after tool execution finishes for a turn.
  - `Stop`: Runs when the agent execution loop terminates (normal completion, token exhaustion, or user stop).

### 3.2 Context Payloads on `stdin`

All Antigravity hooks receive a JSON payload on `stdin` using camelCase protojson keys:

```json
{
  "conversationId": "3a7419b4-d672-4929-97b8-62604ac8a110",
  "workspacePaths": ["/home/shibuka/Projetos/G-Inga"],
  "transcriptPath": "/home/shibuka/.gemini/antigravity-cli/brain/3a7419b4-d672-4929-97b8-62604ac8a110/.system_generated/logs/transcript.jsonl",
  "artifactDirectoryPath": "/home/shibuka/.gemini/antigravity-cli/brain/3a7419b4-d672-4929-97b8-62604ac8a110",
  "modelName": "auto",
  "executionNum": 1,
  "terminationReason": "NO_TOOL_CALL",
  "fullyIdle": true
}
```

Key fields for usage telemetry:

- `conversationId`: Unique session identifier.
- `transcriptPath`: Absolute path to `transcript.jsonl` (and `transcript_full.jsonl`).
- `terminationReason`: Reason for termination (`"NO_TOOL_CALL"`, `"MAX_INVOCATIONS"`, `"MAX_TOKEN_BUDGET_EXCEEDED"`, `"ERROR"`).

### 3.3 Transcript Ingestion Pipeline

To capture usage without blocking the interactive loop or requiring manual developer actions:

- **Hook configuration:** A hook entry in `.agents/hooks.json` attaches to the `Stop` or `PostInvocation` event:

```json
{
  "usage-telemetry": {
    "Stop": [
      {
        "type": "command",
        "command": "bun tools/eval/run_usage.ts --host antigravity --stdin-hook",
        "timeout": 15
      }
    ]
  }
}
```

- **Telemetry execution:** `tools/eval/run_usage.ts` reads the payload from `stdin`, extracts `transcriptPath`, and parses step entries from `transcript.jsonl`.
- **Scripted execution:** In headless scripted runs (`agy -p --output-format json`), the command stdout produces an envelope with cumulative session tokens (`usage.input_tokens`, `usage.output_tokens`, `usage.cache_read_tokens`, `usage.thinking_tokens`, `usage.total_tokens`) and `duration_seconds`. Both surfaces map into normalized `UsageObservation` structures.

---

## 4. Claude Code Native OpenTelemetry Emission

### 4.1 Native Activation and Endpoints

Claude Code includes built-in OpenTelemetry instrumentation activated via environment variables:

- `CLAUDE_CODE_ENABLE_TELEMETRY=1`: Enables the telemetry subsystem.
- `OTEL_EXPORTER_OTLP_ENDPOINT`: Directs exports to a local or remote collector (e.g., `http://localhost:4318/v1/metrics`).
- `OTEL_METRICS_EXPORTER`: Supports `otlp`, `prometheus`, `console`, or `none`.
- `OTEL_LOGS_EXPORTER`: Supports `otlp`, `console`, or `none`.

> [!IMPORTANT]
> Claude Code explicitly ignores OTel exporter environment variables declared inside repository configuration files (`.claude/settings.json` and `.claude/settings.local.json`). They must be set in the process launch environment or user settings (`~/.claude/settings.json`).

### 4.2 Emitted Metrics and Events

- **Metric: `claude_code.token.usage`:**
  - Counter incremented after each API request.
  - Tagged by `type`: `input`, `output`, `cacheRead`, or `cacheCreation`.
  - Tagged by `model`, `query_source` (`main`, `subagent`), and `skill.name`.
- **Metric: `claude_code.cost.usage`:**
  - Cumulative estimated cost in USD based on Anthropic model list pricing.
- **Metric: `claude_code.active_time.total`:**
  - Total active execution time in milliseconds.
- **Event: `claude_code.api_request`:**
  - Emitted per request with detailed token attributes (`input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_creation_tokens`), `cost_usd`, `duration_ms`, and `prompt.id`.

### 4.3 Content Gates and Privacy Boundaries (ADR 0006)

To adhere strictly to ADR 0006 (no prompt text, no repository code, no secrets in telemetry):

```bash
export OTEL_LOG_USER_PROMPTS=0
export OTEL_LOG_ASSISTANT_RESPONSES=0
export OTEL_LOG_TOOL_DETAILS=0
export OTEL_LOG_TOOL_CONTENT=0
export OTEL_LOG_RAW_API_BODIES=0
export OTEL_METRICS_INCLUDE_ACCOUNT_UUID=false
```

With these gates closed:

- Prompts and assistant messages are redacted as `"<REDACTED>"`.
- Tool parameters and raw file contents are excluded.
- User account UUIDs are excluded from metrics.
- In addition, G-Ingá's parser applies `sanitizeText()` to strip any lingering email addresses or session auth tokens before writing to `records/usage-ledger.tsv`.

---

## 5. Normalized Observation Schema and Measurement Taxonomy

All three hosts map into the normalized `UsageObservation` schema defined in `tools/eval/collect_usage.ts` and `tools/eval/run_usage.ts`:

| Signal / Field | Claude Code | Antigravity CLI | OpenCode CLI |
|---|---|---|---|
| `host` | `"claude-code"` | `"antigravity"` | `"opencode"` |
| `input_tokens` | `observed` (OTel `input`) | `observed` (`usage.input_tokens` / transcript) | `observed` (`tokens.input`) |
| `output_tokens` | `observed` (OTel `output`) | `observed` (`usage.output_tokens`) | `observed` (`tokens.output`) |
| `cache_read_tokens` | `observed` (OTel `cacheRead`) | `observed` (`usage.cache_read_tokens`) | `observed` (`tokens.cache.read`) |
| `cache_write_tokens` | `observed` (OTel `cacheCreation`) | `unsupported` (not emitted by agy envelope) | `observed` (`tokens.cache.write`) |
| `thinking_tokens` | `unsupported` (grouped into output) | `observed` (`usage.thinking_tokens`) | `observed` (`tokens.reasoning`) |
| `cost_usd_estimate` | `observed` (`cost.usage` in USD) | `unsupported` (flat subscription) | `observed` (`cost` in USD) |
| `wall_duration_seconds` | `observed` (`active_time.total`) | `observed` (`duration_seconds`) | `derived` (event timestamps) |
| `scope_id` | `session_id` (sanitized) | `conversation_id` (sanitized) | `session_id` (sanitized) |

### Persistence Policy

- **Raw Traces:** Intermediate JSONL dumps and verbose logs are stored in `records/usage/` and git-ignored via `.gitignore` to prevent repository bloat.
- **Tabular Ledger:** Consolidated run records are appended to `records/usage-ledger.tsv` following the ADR 0006 TSV schema.
- **Human-Readable Summaries:** The aggregator (`tools/eval/aggregate_usage.ts`) outputs Markdown comparison tables in `records/usage-summary.md` reporting token totals, prompt cache efficiency ratios, cost, and wall duration.
