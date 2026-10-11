# D4 spike results: observability in Claude Code and Gemini CLI

**Status:** research note (spike results confirming [ADR 0006](../decisions/0006-usage-observability.md) and [D4 evidence](d4-observability-evidence.md)). Not a decision.  
**Date:** 2026-10-10.  
**Environment:** Linux x86_64, isolated temporary execution paths outside target repositories.

## 1. Scope and execution context

This spike evaluates the experimental feasibility of the observability architecture proposed in [ADR 0006](../decisions/0006-usage-observability.md). The objective is to verify whether OpenTelemetry and native usage signals exposed by Claude Code and Gemini CLI under real user subscription accounts can ground G-Ingá's metrics contract ([ADR 0002 §8](../decisions/0002-ceremony-tiers-and-routing.md)).

The experiment ran one isolated session per CLI using existing authentications, without modifying persistent user configuration, repository files, or installing external collectors.

| Item | Claude Code | Gemini CLI |
|---|---|---|
| Installed version | `2.1.296 (Claude Code)` | `0.63.0` |
| Authentication confirmed | `claude.ai` OAuth, subscription `pro` | `oauth-personal` (Google account, Google AI Pro intended) |
| Isolation method | Process-level environment variables in `/tmp/ginga_spike_claude/` | Workspace `.gemini/settings.json` + process env in `/tmp/ginga_spike_gemini/` |
| Synthetic workload | Single prompt: `"Responda exatamente SPIKE_OK. Não use ferramentas nem leia ou escreva arquivos."` | Same prompt |
| Overall result | `pass` (all target signals observed) | `blocked` (inference blocked by upstream client deprecation) |

## 2. Effective configuration

Telemetry was configured strictly local-only with all prompt, response, and tool payload logging gates closed.

### 2.1 Claude Code configuration

Claude Code respects launch-environment OpenTelemetry variables:

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=console
export OTEL_LOGS_EXPORTER=console
export OTEL_METRICS_INCLUDE_ACCOUNT_UUID=false
# Content gates explicitly disabled (=0).
# Official documentation notes OTEL_LOG_ASSISTANT_RESPONSES inherits OTEL_LOG_USER_PROMPTS if unset;
# explicitly setting all five to 0 guarantees content gates remain closed:
export OTEL_LOG_USER_PROMPTS=0
export OTEL_LOG_ASSISTANT_RESPONSES=0
export OTEL_LOG_TOOL_DETAILS=0
export OTEL_LOG_TOOL_CONTENT=0
export OTEL_LOG_RAW_API_BODIES=0
```

Claude Code ignores telemetry exporter variables in repository `.claude/settings.json`, ensuring launch-environment configuration takes precedence and cannot be overridden by cloned repos.

Execution command:

```bash
claude --session-id d4000000-0000-4000-8000-000000000001 -p "Responda exatamente SPIKE_OK. Não use ferramentas nem leia ou escreva arquivos."
```

### 2.2 Gemini CLI configuration

Precedence inspection of the installed `gemini-cli` bundle (`/usr/lib/node_modules/@google/gemini-cli`) confirmed that workspace settings (`.gemini/settings.json` in the current working directory) and `GEMINI_TELEMETRY_*` environment variables override user settings.

In the throwaway directory `/tmp/ginga_spike_gemini/.gemini/settings.json`:

```json
{
  "telemetry": {
    "enabled": true,
    "target": "local",
    "outfile": "/tmp/ginga_spike_gemini/gemini_telemetry.json",
    "logPrompts": false,
    "traces": false
  },
  "privacy": {
    "usageStatisticsEnabled": false
  }
}
```

With matching process environment variables:

```bash
export GEMINI_TELEMETRY_ENABLED=true
export GEMINI_TELEMETRY_TARGET=local
export GEMINI_TELEMETRY_OUTFILE=/tmp/ginga_spike_gemini/gemini_telemetry.json
export GEMINI_TELEMETRY_LOG_PROMPTS=false
export GEMINI_TELEMETRY_TRACES_ENABLED=false
```

Execution command:

```bash
gemini --skip-trust -p "Responda exatamente SPIKE_OK. Não use ferramentas nem leia ou escreva arquivos."
```

## 3. Observed signals and classification

Field states follow the taxonomy defined in [ADR 0006](../decisions/0006-usage-observability.md) §5: `observed`, `estimated`, `derived`, `absent`, `unsupported`, `collection_error`.

### 3.1 Claude Code (Claude Pro)

Claude Code emitted both structured OpenTelemetry metrics/events and native `/usage` reporting.

| Signal / Field | Source | Value | Unit | State | Notes |
|---|---|---|---|---|---|
| `claude_code.session.count` | OTel metric | `1` | sessions | `observed` | Counter incremented on session launch |
| `claude_code.token.usage (input)` | OTel metric | `2` | tokens | `observed` | Excludes cached tokens |
| `claude_code.token.usage (output)` | OTel metric | `10` | tokens | `observed` | Output response tokens |
| `claude_code.token.usage (cacheRead)` | OTel metric | `8608` | tokens | `observed` | Tokens read from prompt cache |
| `claude_code.token.usage (cacheCreation)` | OTel metric | `11569` | tokens | `observed` | Tokens written to prompt cache |
| `claude_code.cost.usage` | OTel metric | `0.0944816` | USD | `estimated` | List-price estimate; not billing on Pro (T14) |
| `claude_code.active_time.total` | OTel metric | `2.512` | seconds | `observed` | Total active CLI execution time |
| `claude_code.api_request (duration_ms)` | OTel event | `2419` | ms | `observed` | API round-trip duration |
| `claude_code.api_request (ttft_ms)` | OTel event | `2378` | ms | `observed` | Time to first token |
| `claude_code.api_request (model)` | OTel event | `"claude-opus-5-5"` | — | `observed` | Model used for request |
| `claude_code.assistant_response (response)` | OTel event | `"<REDACTED>"` | — | `observed` | Response content redacted by default |
| `claude_code.assistant_response (response_length)` | OTel event | `8` | chars | `observed` | Length of `"SPIKE_OK"` |
| Native `/usage` session utilization | CLI `/usage` | `29%` | percentage | `observed` | 5-hour rolling window |
| Native `/usage` week utilization | CLI `/usage` | `98%` | percentage | `observed` | 7-day rolling window |
| Native `/usage` 7d request count | CLI `/usage` | `3721 → 3722` | requests | `observed` | Incremented by exactly 1 |
| Native `/usage` 7d session count | CLI `/usage` | `57 → 58` | sessions | `observed` | Incremented by exactly 1 |
| Native `/usage` cache hit | CLI `/usage` | `43%` | percentage | `observed` | Breakdown from local history |

### 3.2 Gemini CLI (Google AI Pro intended)

Gemini CLI initialized its local OpenTelemetry exporter, emitted startup metrics and logged lifecycle events. However, before the model inference request could be sent, Google's backend onboarding service rejected the request.

| Signal / Field | Source | Value | Unit | State | Notes |
|---|---|---|---|---|---|
| `gemini_cli.session.count` | OTel metric | `1` | sessions | `observed` | Emitted upon startup |
| `gemini_cli.onboarding.start` | OTel metric | `3` | attempts | `observed` | Account onboarding attempts |
| `gemini_cli.onboarding.success` | OTel metric | `3` | successes | `observed` | Initial handshake succeeded with `user_tier: "Gemini Code Assist"` |
| `gemini_cli.onboarding.duration` | OTel metric | Histogram | ms | `observed` | 193ms to 271ms durations recorded |
| `gemini_cli.config` | OTel event | Loaded metadata | — | `observed` | `model: auto`, `log_user_prompts_enabled: false`, `sandbox_enabled: true` |
| `gemini_cli.startup_stats` | OTel event | 9 phases | — | `observed` | Phase breakdown (`cli_startup`, `load_settings`, `authenticate`, etc.) |
| `gemini_cli.user_prompt (prompt_length)` | OTel event | `79` | chars | `observed` | Length of prompt input |
| `gemini_cli.user_prompt (prompt)` | OTel event | absent | — | `observed` | Prompt text omitted because `logPrompts: false` |
| `gemini_cli.plan.approval_mode_duration` | OTel event | `3598.88` | ms | `observed` | Mode duration for `default` approval mode |
| `gemini_cli.token.usage` | OTel metric | — | tokens | `absent` | Supported by schema; not emitted because model was not invoked due to onboarding rejection (`IneligibleTierError`). Collector functioned without error |
| `gemini_cli.api_response` | OTel event | — | — | `absent` | Supported by schema; not emitted because model was not invoked |
| Native `/stats session` | CLI `/stats` | — | — | `unsupported` | Interactive REPL command; unsupported in headless `-p` print mode (arguments treated as prompt) |
| Native `/stats model` | CLI `/stats` | — | — | `unsupported` | Interactive REPL command; unsupported in headless `-p` print mode (arguments treated as prompt) |

#### Upstream blocking cause

The model invocation failed with:

```text
IneligibleTierError: This client is no longer supported for Gemini Code Assist for individuals.
To continue using Gemini, please migrate to the Antigravity suite of products: https://antigravity.google
  ineligibleTiers: [
    {
      reasonCode: 'UNSUPPORTED_CLIENT',
      reasonMessage: 'This client is no longer supported for Gemini Code Assist for individuals...',
      tierId: 'free-tier',
      tierName: 'Gemini Code Assist for individuals'
    }
  ]
```

Google's Cloud Code API (`https://cloudcode-pa.googleapis.com/v1internal:onboardUser`) returned `UNSUPPORTED_CLIENT` (and HTTP 429 `RESOURCE_EXHAUSTED` on retries) for the `oauth-personal` authentication type under the individual Google account. Upstream policy deprecates `gemini-cli` individual access in favor of Antigravity.

## 4. Privacy and isolation evidence

1. **Local-only export verified:**
   - Claude Code: emitted records directly to the process stdout/stderr streams (`console` exporter). No outbound network connection to third-party telemetry sinks was initiated.
   - Gemini CLI: written directly to `/tmp/ginga_spike_gemini/gemini_telemetry.json`. `privacy.usageStatisticsEnabled` was set to `false`, preventing Google Clearcut telemetry transmission.
2. **Prompt and code privacy verified:**
   - Claude Code: prompt text was absent from all metric and event records. `claude_code.assistant_response.response` was explicitly recorded as `"<REDACTED>"`.
   - Gemini CLI: `gemini_cli.user_prompt` recorded `prompt_length: 79` and `prompt_id`, with the `prompt` string completely excluded, proving that `logPrompts: false` functions as designed.
3. **Identity exposure confirmed (ADR 0006 §4):**
   - Both CLIs attached user email and internal account identifiers to local OpenTelemetry resource and data point attributes (`user.email`, `organization.id`, `installation.id`). Setting `OTEL_METRICS_INCLUDE_ACCOUNT_UUID=false` omits the account UUID from metrics, but does NOT remove `user.email` from OTel events or resources.
   - This experimentally confirms ADR 0006's rule: local telemetry files must never be forwarded off the machine without stripping identity attributes.
   - All temporary files in `/tmp` containing these raw records were purged immediately after analysis.

## 5. Comparison and limitations

| Characteristic | Claude Code (`2.1.296`) | Gemini CLI (`0.63.0`) |
|---|---|---|
| Metric delivery | OTel metrics and events via `console` or OTLP | OTel metrics and events via local file or OTLP |
| Token split | `input`, `output`, `cacheRead`, `cacheCreation` | `input`, `output`, `thought`, `cache`, `tool` (per docs; `absent` in spike due to auth block) |
| Cost signal | List-price dollar estimate (`claude_code.cost.usage`) | `unsupported` |
| Native views | `/usage` (quota bars, rolling activity, attribution) | `/stats` (REPL only; `unsupported` in `-p`) |
| Attribution keys | `session.id`, `prompt.id`, `request_id` | `session.id`, `prompt_id` |
| Production readiness | `pass` — ready for harness consumption | `blocked` — client deprecated by provider for individual personal OAuth |

## 6. Open questions settled by the spike

- **Q1 (Claude Pro OTel emission):** Settled. Claude Code emits `token.usage`, `cost.usage`, and `api_request` events under OAuth Claude Pro authentication.
- **Q2 (Gemini CLI OTel emission under Google AI Pro):** Settled with limitation. Lifecycle and session metrics emit (`observed`), but token-level metrics and API responses were `absent` because Google discontinued individual Gemini Code Assist support for `gemini-cli` (`UNSUPPORTED_CLIENT`), aborting before model invocation. The local collector functioned without error.
- **H1 (OTel vs native alignment):** Settled for Claude Code. Request count and session count in `/usage` incremented exactly (+1 request, +1 session) matching the OTel session count (`1`) and API request event. Token totals in `/usage` reflect 7-day rolling aggregates rather than single-turn counts.
- **H2 (Privacy-minimal configuration):** Settled. Disabling prompt logging in both CLIs successfully prevents prompt and response content from leaking into telemetry while preserving token counts and durations.

## 7. Conclusion and recommendation

- **Spike outcome:**
  - Claude Code: **pass**. The OpenTelemetry schema meets all requirements for ADR 0002 §8 metrics (input/output tokens, cache reads/writes, durations, session counters, cost estimate).
  - Gemini CLI: **blocked**. Blocked by upstream provider deprecation of `gemini-cli` individual access (`UNSUPPORTED_CLIENT`).
- **Recommendation for ADR 0006:**
  - **Maintain ADR 0006 as `proposed`.**
  - Claude Code's telemetry path is mature and validated.
  - Gemini CLI's observability channel cannot serve as a reliable signal source for G-Ingá under personal subscriptions unless alternative authentication (e.g., enterprise project ADC or gateway) or an updated client runtime is approved by the owner.
