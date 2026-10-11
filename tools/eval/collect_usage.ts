/**
 * tools/eval/collect_usage.ts
 *
 * Multi-host local usage telemetry parser, privacy sanitizer, and markdown formatter.
 * Operationalizes ADR 0006 for the D7 evaluation protocol without remote egress.
 */

export type MeasureState =
  | "observed"
  | "estimated"
  | "derived"
  | "absent"
  | "unsupported"
  | "collection_error";

export interface UsageObservation {
  host: "claude-code" | "antigravity" | "unknown";
  cli_version?: string;
  scope_id?: string; // session_id or conversation_id (scrubbed of emails/uuids if needed)
  input_tokens: { value?: number; state: MeasureState; note?: string };
  output_tokens: { value?: number; state: MeasureState; note?: string };
  cache_read_tokens: { value?: number; state: MeasureState; note?: string };
  cache_write_tokens: { value?: number; state: MeasureState; note?: string };
  thinking_tokens: { value?: number; state: MeasureState; note?: string };
  total_tokens: { value?: number; state: MeasureState; note?: string };
  wall_duration_seconds: { value?: number; state: MeasureState; note?: string };
  cost_usd_estimate: { value?: number; state: MeasureState; note?: string };
  rate_limit_5h_used_pct?: { value?: number; state: MeasureState; note?: string };
  rate_limit_7d_used_pct?: { value?: number; state: MeasureState; note?: string };
}

/**
 * Sanitizes strings by scrubbing email addresses, auth tokens, and UUIDs.
 */
export function sanitizeText(text: string): string {
  if (!text) return "";
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[SCRUBBED_EMAIL]")
    .replace(/bearer\s+[a-zA-Z0-9_.-]+/gi, "Bearer [SCRUBBED_TOKEN]")
    .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, "[UUID]");
}

/**
 * Parses Antigravity CLI headless JSON envelope (--output-format json).
 * In Antigravity CLI:
 * - usage.input_tokens: cumulative prompt tokens not served from cache
 * - usage.cache_read_tokens: cumulative prompt tokens served from cache
 * - usage.output_tokens: cumulative model completion tokens
 * - usage.thinking_tokens: tokens spent on reasoning (subset of output)
 * - usage.total_tokens: input_tokens + output_tokens (excludes cache_read_tokens!)
 */
export function parseAntigravityJson(jsonStr: string): UsageObservation {
  const data = JSON.parse(jsonStr);
  const usage = data.usage || {};

  const inputVal = typeof usage.input_tokens === "number" ? usage.input_tokens : undefined;
  const outputVal = typeof usage.output_tokens === "number" ? usage.output_tokens : undefined;
  const cacheReadVal = typeof usage.cache_read_tokens === "number" ? usage.cache_read_tokens : undefined;
  const thinkingVal = typeof usage.thinking_tokens === "number" ? usage.thinking_tokens : undefined;
  const totalVal = typeof usage.total_tokens === "number" ? usage.total_tokens : undefined;
  const durationVal = typeof data.duration_seconds === "number" ? data.duration_seconds : undefined;

  return {
    host: "antigravity",
    scope_id: data.conversation_id ? sanitizeText(data.conversation_id) : undefined,
    input_tokens: {
      value: inputVal,
      state: inputVal !== undefined ? "observed" : "absent",
      note: "session-cumulative",
    },
    output_tokens: {
      value: outputVal,
      state: outputVal !== undefined ? "observed" : "absent",
      note: "session-cumulative",
    },
    cache_read_tokens: {
      value: cacheReadVal,
      state: cacheReadVal !== undefined ? "observed" : "absent",
      note: "session-cumulative",
    },
    cache_write_tokens: {
      state: "unsupported",
      note: "cacheCreation not exposed in agy envelope",
    },
    thinking_tokens: {
      value: thinkingVal,
      state: thinkingVal !== undefined ? "observed" : "absent",
      note: "subset of output_tokens",
    },
    total_tokens: {
      value: totalVal,
      state: totalVal !== undefined ? "observed" : "absent",
      note: "input + output (excludes cache_read)",
    },
    wall_duration_seconds: {
      value: durationVal,
      state: durationVal !== undefined ? "observed" : "absent",
    },
    cost_usd_estimate: {
      state: "unsupported",
      note: "flat subscription / no list price emitted",
    },
    rate_limit_5h_used_pct: {
      state: "unsupported",
      note: "unsupported in headless JSON",
    },
    rate_limit_7d_used_pct: {
      state: "unsupported",
      note: "unsupported in headless JSON",
    },
  };
}

/**
 * Parses Claude Code local OTel console log dumps or structured JSON events.
 */
export function parseClaudeCodeOtel(logLines: string[]): UsageObservation {
  let input = 0;
  let output = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  let costUsd = 0;
  let activeTimeSec = 0;
  let sessionId: string | undefined;

  let hasTokens = false;
  let hasCost = false;
  let hasDuration = false;

  for (const line of logLines) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      // OTel metric counter or log record
      if (obj.name === "claude_code.token.usage" || obj.metric === "token.usage") {
        hasTokens = true;
        const attrs = obj.attributes || {};
        const val = obj.value || 0;
        if (attrs.type === "input") input += val;
        else if (attrs.type === "output") output += val;
        else if (attrs.type === "cacheRead") cacheRead += val;
        else if (attrs.type === "cacheCreation") cacheWrite += val;
      } else if (obj.name === "claude_code.cost.usage" || obj.metric === "cost.usage") {
        hasCost = true;
        costUsd += obj.value || 0;
      } else if (obj.name === "claude_code.active_time.total" || obj.metric === "active_time.total") {
        hasDuration = true;
        activeTimeSec += (obj.value || 0) / 1000; // ms to sec
      } else if (obj.event === "api_request") {
        hasTokens = true;
        if (typeof obj.input_tokens === "number") input += obj.input_tokens;
        if (typeof obj.output_tokens === "number") output += obj.output_tokens;
        if (typeof obj.cache_read_tokens === "number") cacheRead += obj.cache_read_tokens;
        if (typeof obj.cache_creation_tokens === "number") cacheWrite += obj.cache_creation_tokens;
        if (typeof obj.cost_usd === "number") {
          hasCost = true;
          costUsd += obj.cost_usd;
        }
      }
      if (obj.session_id || obj.sessionId) {
        sessionId = sanitizeText(obj.session_id || obj.sessionId);
      }
    } catch {
      // not a json line, check text patterns
      const tokenMatch = line.match(/token\.usage.*?type="([^"]+)".*?value=([0-9.]+)/);
      if (tokenMatch) {
        hasTokens = true;
        const type = tokenMatch[1];
        const val = parseFloat(tokenMatch[2]);
        if (type === "input") input += val;
        else if (type === "output") output += val;
        else if (type === "cacheRead") cacheRead += val;
        else if (type === "cacheCreation") cacheWrite += val;
      }
    }
  }

  const total = input + output + cacheRead + cacheWrite;

  return {
    host: "claude-code",
    scope_id: sessionId,
    input_tokens: {
      value: hasTokens ? input : undefined,
      state: hasTokens ? "observed" : "absent",
    },
    output_tokens: {
      value: hasTokens ? output : undefined,
      state: hasTokens ? "observed" : "absent",
    },
    cache_read_tokens: {
      value: hasTokens ? cacheRead : undefined,
      state: hasTokens ? "observed" : "absent",
    },
    cache_write_tokens: {
      value: hasTokens ? cacheWrite : undefined,
      state: hasTokens ? "observed" : "absent",
    },
    thinking_tokens: {
      state: "unsupported",
      note: "conflated inside output in Claude Code OTel",
    },
    total_tokens: {
      value: hasTokens ? total : undefined,
      state: hasTokens ? "derived" : "absent",
      note: "sum(input + output + cacheRead + cacheWrite)",
    },
    wall_duration_seconds: {
      value: hasDuration ? activeTimeSec : undefined,
      state: hasDuration ? "observed" : "absent",
    },
    cost_usd_estimate: {
      value: hasCost ? costUsd : undefined,
      state: hasCost ? "estimated" : "absent",
      note: "list-price estimate; not billing",
    },
    rate_limit_5h_used_pct: {
      state: "absent",
      note: "requires statusline snapshot",
    },
    rate_limit_7d_used_pct: {
      state: "absent",
      note: "requires statusline snapshot",
    },
  };
}

/**
 * Formats a UsageObservation into a clean markdown table conforming to ADR 0006 §5.
 */
export function formatObservationMarkdown(obs: UsageObservation): string {
  const rows: Array<{ metric: string; state: MeasureState; value: string; note: string }> = [
    {
      metric: "Input tokens",
      state: obs.input_tokens.state,
      value: obs.input_tokens.value !== undefined ? obs.input_tokens.value.toLocaleString() : "—",
      note: obs.input_tokens.note || "",
    },
    {
      metric: "Output tokens",
      state: obs.output_tokens.state,
      value: obs.output_tokens.value !== undefined ? obs.output_tokens.value.toLocaleString() : "—",
      note: obs.output_tokens.note || "",
    },
    {
      metric: "Cache read tokens",
      state: obs.cache_read_tokens.state,
      value: obs.cache_read_tokens.value !== undefined ? obs.cache_read_tokens.value.toLocaleString() : "—",
      note: obs.cache_read_tokens.note || "",
    },
    {
      metric: "Cache write tokens",
      state: obs.cache_write_tokens.state,
      value: obs.cache_write_tokens.value !== undefined ? obs.cache_write_tokens.value.toLocaleString() : "—",
      note: obs.cache_write_tokens.note || "",
    },
    {
      metric: "Thinking tokens",
      state: obs.thinking_tokens.state,
      value: obs.thinking_tokens.value !== undefined ? obs.thinking_tokens.value.toLocaleString() : "—",
      note: obs.thinking_tokens.note || "",
    },
    {
      metric: "Total tokens",
      state: obs.total_tokens.state,
      value: obs.total_tokens.value !== undefined ? obs.total_tokens.value.toLocaleString() : "—",
      note: obs.total_tokens.note || "",
    },
    {
      metric: "Wall duration (s)",
      state: obs.wall_duration_seconds.state,
      value: obs.wall_duration_seconds.value !== undefined ? obs.wall_duration_seconds.value.toFixed(2) : "—",
      note: obs.wall_duration_seconds.note || "",
    },
    {
      metric: "List price estimate (USD)",
      state: obs.cost_usd_estimate.state,
      value: obs.cost_usd_estimate.value !== undefined ? `$${obs.cost_usd_estimate.value.toFixed(4)}` : "—",
      note: obs.cost_usd_estimate.note || "",
    },
  ];

  let md = `### Usage Observation: ${obs.host}\n\n`;
  if (obs.scope_id) {
    md += `- **Scope:** \`${obs.scope_id}\`\n\n`;
  }
  md += `| Metric | State | Value | Note |\n`;
  md += `|---|---|---|---|\n`;
  for (const r of rows) {
    md += `| ${r.metric} | \`${r.state}\` | ${r.value} | ${r.note} |\n`;
  }

  return md;
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`Usage:
  bun tools/eval/collect_usage.ts --antigravity <file.json>
  bun tools/eval/collect_usage.ts --claude-otel <file.log>
`);
    process.exit(0);
  }

  const mode = args[0];
  const file = args[1];
  if (!file) {
    console.error("Error: input file required");
    process.exit(1);
  }

  const fs = await import("node:fs/promises");
  const content = await fs.readFile(file, "utf8");

  if (mode === "--antigravity") {
    const obs = parseAntigravityJson(content);
    console.log(formatObservationMarkdown(obs));
  } else if (mode === "--claude-otel") {
    const lines = content.split("\n");
    const obs = parseClaudeCodeOtel(lines);
    console.log(formatObservationMarkdown(obs));
  } else {
    console.error(`Unknown flag: ${mode}`);
    process.exit(1);
  }
}
