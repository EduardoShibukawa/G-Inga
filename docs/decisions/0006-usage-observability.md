# 0006 — Usage, context and cost observability

- **Status:** proposed (not accepted. It waits for the owner's decision; see "What needs the owner")
- **Date:** 2026-10-10
- **Deciders:** project owner (pending)
- **Depends on:** nothing on the decision map. Constrained by [ADR 0002](0002-ceremony-tiers-and-routing.md) §8 (what to measure) and [ADR 0003](0003-minimum-artifact-schemas.md) decision item 10 (`hard` and `guideline` budgets), both `accepted`, and by [ADR 0005](0005-native-primitive-mapping.md) (`proposed`), which leaves the fixed per-turn cost limit to D4 (U7). This record changes none of them.
- **Evidence:** [D4 evidence](../research/d4-observability-evidence.md). Codes `T`, `G` and `K` below refer to that note.
- **Correction of an earlier label:** until this record, the decision map's D4 row named `/cost` as a Claude Code signal. In the current commands reference `/cost` is an alias of `/usage`, as is `/stats` (T13). The row now names `/usage`; Git keeps the old wording.

## Context

D4 asks which token, context, tool and cost signals the harness can actually observe. Its answer feeds D7 (evaluation) and the numeric limits that ADR 0003 left unset.

The owner works in two environments (owner statement, 2026-10-10):

- Claude Code with a Claude Pro subscription;
- Gemini CLI with a Google AI Pro subscription.

What the evidence shows:

- Both CLIs export OpenTelemetry metrics and logs with per-request token counts, tool calls, durations and session ids. Both are off by default (T1, G1).
- They differ in the details. Only Claude emits a dollar estimate (T6). Only Gemini reports thinking and tool tokens separately (G4). Claude splits cache reads from cache writes, Gemini doesn't. Whether Gemini's input count includes cached tokens isn't documented (Q3).
- Neither CLI attributes usage to a task. Signals are keyed by session, prompt or request (T4, G3).
- Plan utilization is structured only in Claude's status line (T18). Gemini shows quota as text in `/stats model` (G13).
- On subscriptions, Claude's dollar figures are list-price estimates, "not relevant for billing purposes" (T14). Google AI Pro is a fixed-price subscription limited by requests per day (G17).
- Privacy defaults differ. Claude redacts prompt and response text by default (T10), and a repository can't turn its telemetry on (T2). Once Gemini telemetry is enabled, `logPrompts` defaults to `true` (G1), and a project's `.gemini/settings.json` outranks user settings (G2). Gemini's separate Usage Statistics to Google are on by default (G10).
- Nothing was exercised. Every signal claim is documentation or source, not a measurement.

Scope note: this record treats Gemini CLI as a second **signal source**. It doesn't make Gemini CLI a G-Ingá host. [ADR 0001](0001-product-boundary.md) still scopes G-Ingá to Claude Code, and the research on running G-Ingá inside Gemini CLI lives on a separate branch that this record doesn't read.

The [friction log](../friction-log.md) is still empty. ADR 0002 §8 and principle §6 (tokens per verified task) are the drivers, not an observed friction.

## Problem

Choose the smallest observability approach that:

- yields the ADR 0002 §8 measurements per task, for each CLI the owner uses;
- keeps each source's meaning intact and never presents unlike values as comparable;
- separates observed usage, estimated cost, plan utilization and billing;
- keeps prompts, code and secrets out of what is collected;
- promises enforcement only where a platform enforces.

## Decision (proposed)

1. **OpenTelemetry is the structured channel for usage, in each CLI, through its own configuration.** No G-Ingá runtime, collector or parser is built by this record. The V1 spec decides whether and when one exists.
2. **Native views are cross-checks, not inputs.** `/usage` (with its aliases `/cost` and `/stats`) in Claude Code and `/stats` in Gemini CLI are for a person to read. G-Ingá doesn't parse their text.
3. **Plan utilization comes from structured sources only.** In Claude Code that's the status line's `rate_limits` (T18). In Gemini CLI there is no structured source today, so it's `unsupported`, and the owner reads `/stats model`.
4. **Local-only, privacy-minimal configuration.** Telemetry is configured by the owner in user-level settings or the launch environment, never in a committed project file, and exported to a local file or a collector on the machine.

   | | Claude Code | Gemini CLI |
   |---|---|---|
   | Turn on | `CLAUDE_CODE_ENABLE_TELEMETRY=1` | `telemetry.enabled: true` |
   | Destination | `OTEL_METRICS_EXPORTER` and `OTEL_LOGS_EXPORTER` set to `console` or a local OTLP endpoint | `target: "local"` with `outfile` |
   | Prompt and response text | leave `OTEL_LOG_USER_PROMPTS`, `OTEL_LOG_ASSISTANT_RESPONSES` and `OTEL_LOG_RAW_API_BODIES` unset | **`logPrompts: false`, set explicitly**, because the default is `true` |
   | Tool inputs and content | leave `OTEL_LOG_TOOL_DETAILS` and `OTEL_LOG_TOOL_CONTENT` unset | covered by `logPrompts: false` (G8) |
   | Traces | not enabled | `traces: false` |
   | Identity | set `OTEL_METRICS_INCLUDE_ACCOUNT_UUID=false`. `user.email` is still attached (T9) and must be dropped before anything leaves the machine | `user.email` and `installation.id` are attached (G3), same rule |

   Any exception, such as turning on prompt logging for a debugging session, needs the owner's approval and a recorded reason. Whether to turn off Gemini's Usage Statistics (`privacy.usageStatisticsEnabled`) is the owner's call (G10). It's not part of G-Ingá's signal.
5. **One common record per observation, without forced equivalence.** A *usage observation* carries:
   - **source:** CLI, CLI version, signal (for example `otel-metric`, `otel-log`, `statusline`), authentication kind (`subscription`, `api-key`, `unknown`) and the privacy-flag state in effect;
   - **scope:** session id, prompt or request id when available, model, time window;
   - **measures:** input, output, cache read, cache write, cache (undivided), thinking and tool tokens, tool calls by name, durations, context use, compaction before and after, attribution (skill, subagent). Each one keeps the source's native field name;
   - **cost estimate:** amount, currency, basis (`list-price estimate by the CLI`) and source. It's never billing;
   - **plan utilization**, as a separate record: window, used percentage, reset time, source.

   Every measure carries one state:

   | State | Meaning |
   |---|---|
   | `observed` | the source reported this value. `0` is a valid observed value |
   | `estimated` | the source labels it an estimate (Claude `cost_usd`, compaction `pre_tokens`) |
   | `derived` | G-Ingá computed it from observed values. The method is recorded |
   | `absent` | the source supports it, but nothing was emitted in this scope |
   | `unsupported` | the source doesn't expose it (Gemini cost, Claude thinking tokens) |
   | `collection_error` | collection failed. The reason is recorded |

   Values are never summed or compared across CLIs or models. Within a CLI, `derived` totals need a documented definition (Q3 is open for Gemini).
6. **Four separate cost notions, never inferred from one another:**
   1. observed usage (tokens, requests, durations);
   2. estimated monetary cost: Claude's list-price estimate only;
   3. plan quota and utilization: Claude's `rate_limits` and Gemini's daily request quota;
   4. effective billing: out of scope. G-Ingá never computes or claims it. On both subscriptions it's a fixed price, not a function of these signals.
7. **Enforcement stays as ADR 0003 sets it.** Token and time limits are `guideline`. No signal here can stop an interactive request: all are reported after the fact. Plan quotas are enforced by the provider, not by G-Ingá. Claude's `--max-budget-usd` (print mode, on a dollar estimate) and Gemini's `maxSessionTurns` (turns) are platform limits, not token budgets. They aren't adopted here. D7 may revisit them for scripted evaluation runs.
8. **Per-task attribution through session boundaries.** One session per task, the SDLC brief's default, plus the session id recorded with the task links usage to a task. Where that id is written is open (question 3). Until it's settled, usage is analyzed per session.
9. **Not used:** parsing native command text, transcripts or Gemini session files (they hold full conversations, K1, G16), proxies or gateways (Gemini's terms forbid third-party access to its services, G19), and remote telemetry backends.

### Measurement criteria (from ADR 0002 §8)

| Measurement | Where it comes from | Claude Code | Gemini CLI |
|---|---|---|---|
| Tier, escalations, check runs, first-pass result, rework, escaped defects, artifacts read | task records, Git, friction log | provider-independent | provider-independent |
| Input and output tokens | OTel | `observed` | `observed` |
| Cache tokens | OTel | read and write `observed` separately | one `cache` value `observed`; read/write `unsupported` |
| Thinking tokens | OTel | `unsupported` (inside output) | `observed` |
| Tool calls | OTel | `observed` | `observed` |
| Wall time | OTel | `observed` | `observed` |
| Human interventions | records, plus tool decision source | partly `observed` | partly `observed` |
| Context use | status line, compaction event | `observed` / `estimated` | compaction `observed`; live percentage only in the UI |
| Estimated cost | OTel | `estimated` | `unsupported` |
| Plan utilization | status line / text | `observed` | `unsupported` (structured) |
| Billing | — | out of scope | out of scope |

### Spike (not run; waits for the owner's approval)

A throwaway check, outside any target repository, with the configuration in item 4:

1. One short session per CLI under the owner's real subscriptions. Confirm the token, tool and duration signals appear, with prompt text absent (Q1, Q2, H2).
2. Compare the OpenTelemetry totals with `/usage` and `/stats model` for the same session (H1).
3. Settle Q3 to Q6 where the session shows the answer.

No real task, no benchmark, and no change to the owner's permanent settings until the owner approves it.

## Alternatives considered

| ID | Option | Pros | Cons | Verdict |
|---|---|---|---|---|
| A | **OpenTelemetry per CLI, local-only, common record with per-field states (this proposal)** | structured, documented in both CLIs, no parsing, keeps each source's meaning | off by default, needs per-machine setup; plan utilization only for Claude; not yet exercised | **recommended** |
| B | Native views only (`/usage`, `/stats`) | zero setup, includes plan views | text UI; automating means parsing output | rejected as the channel; kept as a cross-check |
| C | Transcripts and session files | already on disk, per-message detail | full conversation content; formats aren't documented contracts | rejected |
| D | Status line as the collector | structured; only source of Claude plan utilization | Claude only, interactive only, session-level | used only for plan utilization (item 3) |
| E | Headless JSON `stats` (Gemini) or `-p` runs | per-run structured totals | only scripted runs; fields not documented in detail | deferred to D7's evaluation runner |
| F | A proxy or gateway in front of both CLIs | one place for every number | against Gemini's terms (G19); infrastructure without a friction | rejected |
| G | No measurement; friction log only | no setup | loses tokens per verified task, principle §6 | rejected |
| H | One normalized schema with every field mandatory | simple to compare | forces fake zeros and false equivalence | rejected |

## Consequences

- D4 has an answer to propose: what can be observed, how it's labeled, and what stays a `guideline`. D7 can design its comparison on those signals once the spike confirms them.
- The fixed per-turn cost limit (ADR 0005, U7) still has no number. OpenTelemetry gives per-request tokens, but not the share of fixed context in each request. `/context` shows it to a person. A number waits for the spike and real tasks.
- The owner configures telemetry once per machine. A cloud session needs its own configuration through environment settings (monitoring usage docs, cloud sessions), and nothing is collected where it isn't configured. Reports say `not run` in that case.
- Gemini's defaults make a careless setup leak prompt text into telemetry. Item 4 counters that only if the owner applies it, and a project `.gemini/settings.json` can override user settings (G2). Nothing in G-Ingá enforces it.

## Risks

- **Unverified emission on subscriptions** (Q1, Q2). If a CLI emits nothing under the owner's plan, this proposal falls back to option B for that CLI.
- **Silent semantic drift.** Both CLIs change fast. Metric names and attributes can change between versions, so each observation records the CLI version.
- **False comparability.** Different tokenizers and models make cross-CLI totals meaningless. Item 5 forbids comparing them.
- **Identity in telemetry.** `user.email` is attached in both CLIs (T9, G3). It has to be dropped before any export leaves the machine.

## What needs the owner

1. Accept, revise or reject this record. It stays `proposed` until then.
2. Approve or decline the spike above.
3. Where the session id that links usage to a task is recorded: in the task record (an amendment to the [artifact contracts](../artifact-contracts.md), outside D4) or only in the report.
4. Whether Gemini's Usage Statistics to Google stay on (G10).
5. Whether the Gemini CLI host research on the separate branch changes the scope note above. That would be a new decision, not an edit of this one.
