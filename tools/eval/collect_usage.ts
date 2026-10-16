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
  host: "claude-code" | "antigravity" | "opencode" | "omp" | "unknown";
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
 * Parses Antigravity CLI transcript logs (transcript.jsonl / transcript_full.jsonl).
 * In Antigravity CLI transcripts:
 * - Each turn/step logs input_tokens, output_tokens, cache_read_tokens, and thinking_tokens.
 * - Sums tokens across turns into cumulative usage.
 * - Duration is derived from step timestamps if not explicitly given.
 * - Wall duration is observed if explicit duration_seconds exists, derived from timestamps, or absent.
 */
export function parseAntigravityTranscript(transcriptInput: string | string[]): UsageObservation {
  const lines = Array.isArray(transcriptInput) ? transcriptInput : transcriptInput.split("\n");
  let input = 0;
  let output = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  let thinking = 0;

  let hasInput = false;
  let hasOutput = false;
  let hasCacheRead = false;
  let hasCacheWrite = false;
  let hasThinking = false;

  let scopeId: string | undefined;
  let firstTimestamp: number | undefined;
  let lastTimestamp: number | undefined;
  let explicitDuration: number | undefined;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (obj.conversation_id || obj.conversationId || obj.scope_id) {
        scopeId = sanitizeText(obj.conversation_id || obj.conversationId || obj.scope_id);
      }
      if (typeof obj.duration_seconds === "number") {
        explicitDuration = obj.duration_seconds;
      }
      if (obj.created_at || obj.timestamp) {
        const t = new Date(obj.created_at || obj.timestamp).getTime();
        if (!isNaN(t)) {
          if (firstTimestamp === undefined || t < firstTimestamp) firstTimestamp = t;
          if (lastTimestamp === undefined || t > lastTimestamp) lastTimestamp = t;
        }
      }

      // Check usage envelope or step tokens
      const u = obj.usage || obj;
      if (typeof u.input_tokens === "number") {
        input += u.input_tokens;
        hasInput = true;
      }
      if (typeof u.output_tokens === "number") {
        output += u.output_tokens;
        hasOutput = true;
      }
      if (typeof u.cache_read_tokens === "number") {
        cacheRead += u.cache_read_tokens;
        hasCacheRead = true;
      }
      if (typeof u.cache_write_tokens === "number") {
        cacheWrite += u.cache_write_tokens;
        hasCacheWrite = true;
      }
      if (typeof u.thinking_tokens === "number") {
        thinking += u.thinking_tokens;
        hasThinking = true;
      }
    } catch {
      // not a json line, ignore
    }
  }

  let durationVal: number | undefined = explicitDuration;
  let durationState: MeasureState = explicitDuration !== undefined ? "observed" : "absent";
  if (durationVal === undefined && firstTimestamp !== undefined && lastTimestamp !== undefined && lastTimestamp >= firstTimestamp) {
    durationVal = (lastTimestamp - firstTimestamp) / 1000;
    durationState = "derived";
  }

  const totalVal = (hasInput || hasOutput) ? input + output : undefined;

  return {
    host: "antigravity",
    scope_id: scopeId,
    input_tokens: {
      value: hasInput ? input : undefined,
      state: hasInput ? "observed" : "absent",
      note: "session-cumulative transcript",
    },
    output_tokens: {
      value: hasOutput ? output : undefined,
      state: hasOutput ? "observed" : "absent",
      note: "session-cumulative transcript",
    },
    cache_read_tokens: {
      value: hasCacheRead ? cacheRead : undefined,
      state: hasCacheRead ? "observed" : "absent",
      note: "session-cumulative transcript",
    },
    cache_write_tokens: {
      value: hasCacheWrite ? cacheWrite : undefined,
      state: hasCacheWrite ? "observed" : "unsupported",
      note: hasCacheWrite ? undefined : "cacheCreation not exposed in agy envelope/transcript",
    },
    thinking_tokens: {
      value: hasThinking ? thinking : undefined,
      state: hasThinking ? "observed" : "absent",
      note: "subset of output_tokens",
    },
    total_tokens: {
      value: totalVal,
      state: totalVal !== undefined ? "observed" : "absent",
      note: "input + output (excludes cache_read)",
    },
    wall_duration_seconds: {
      value: durationVal,
      state: durationState,
    },
    cost_usd_estimate: {
      state: "unsupported",
      note: "flat subscription / no list price emitted",
    },
    rate_limit_5h_used_pct: {
      state: "unsupported",
      note: "unsupported in transcript",
    },
    rate_limit_7d_used_pct: {
      state: "unsupported",
      note: "unsupported in transcript",
    },
  };
}

/**
 * Parses Claude Code local OTel console log dumps or structured JSON events.
 */
export function parseClaudeCodeOtel(logLines: string[] | string): UsageObservation {
  const lines = Array.isArray(logLines) ? logLines : logLines.split("\n");
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

  for (const line of lines) {
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
 * Parses OpenCode CLI outputs:
 * - opencode session export [--sanitize]
 * - opencode stats --json
 * - opencode run --format json
 */
export function parseOpencodeJson(jsonStr: string): UsageObservation {
  let input = 0;
  let output = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  let thinking = 0;
  let costUsd = 0;
  let wallDurationSec = 0;

  let hasInput = false;
  let hasOutput = false;
  let hasCacheRead = false;
  let hasCacheWrite = false;
  let hasThinking = false;
  let hasCost = false;
  let hasDuration = false;
  let durationIsDerived = false;

  let scopeId: string | undefined;
  let cliVersion: string | undefined;

  function extractFromTurn(turn: any) {
    if (!turn || typeof turn !== "object") return;
    const t = turn.tokens || turn;
    if (typeof t.input === "number") {
      input += t.input;
      hasInput = true;
    } else if (typeof t.input_tokens === "number") {
      input += t.input_tokens;
      hasInput = true;
    }

    if (typeof t.output === "number") {
      output += t.output;
      hasOutput = true;
    } else if (typeof t.output_tokens === "number") {
      output += t.output_tokens;
      hasOutput = true;
    }

    if (typeof t.reasoning === "number") {
      thinking += t.reasoning;
      hasThinking = true;
    } else if (typeof t.thinking === "number") {
      thinking += t.thinking;
      hasThinking = true;
    } else if (typeof t.thinking_tokens === "number") {
      thinking += t.thinking_tokens;
      hasThinking = true;
    }

    const c = t.cache || {};
    if (typeof c.read === "number") {
      cacheRead += c.read;
      hasCacheRead = true;
    } else if (typeof t.cache_read === "number") {
      cacheRead += t.cache_read;
      hasCacheRead = true;
    } else if (typeof t.cache_read_tokens === "number") {
      cacheRead += t.cache_read_tokens;
      hasCacheRead = true;
    }

    if (typeof c.write === "number") {
      cacheWrite += c.write;
      hasCacheWrite = true;
    } else if (typeof t.cache_write === "number") {
      cacheWrite += t.cache_write;
      hasCacheWrite = true;
    } else if (typeof t.cache_write_tokens === "number") {
      cacheWrite += t.cache_write_tokens;
      hasCacheWrite = true;
    }

    const costVal = typeof turn.cost === "number" ? turn.cost : (typeof turn.cost_usd === "number" ? turn.cost_usd : undefined);
    if (costVal !== undefined) {
      costUsd += costVal;
      hasCost = true;
    }

    const durVal = typeof turn.duration === "number" ? turn.duration : (typeof turn.duration_seconds === "number" ? turn.duration_seconds : undefined);
    if (durVal !== undefined) {
      wallDurationSec += durVal;
      hasDuration = true;
    }
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // try JSONL (e.g. streaming line format)
    const lines = jsonStr.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const item = JSON.parse(trimmed);
        if (item.session_id || item.sessionId || item.id) {
          if (!scopeId) scopeId = sanitizeText(item.session_id || item.sessionId || item.id);
        }
        extractFromTurn(item);
      } catch {
        // ignore malformed line
      }
    }
  }

  if (parsed) {
    if (parsed.info) {
      if (parsed.info.id || parsed.info.session_id) {
        scopeId = sanitizeText(parsed.info.id || parsed.info.session_id);
      }
      if (parsed.info.version || parsed.info.cli_version) {
        cliVersion = sanitizeText(parsed.info.version || parsed.info.cli_version);
      }
      if (parsed.info.created_at && parsed.info.updated_at) {
        const start = typeof parsed.info.created_at === "number" ? parsed.info.created_at : new Date(parsed.info.created_at).getTime();
        const end = typeof parsed.info.updated_at === "number" ? parsed.info.updated_at : new Date(parsed.info.updated_at).getTime();
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          wallDurationSec = (end - start) / 1000;
          hasDuration = true;
          durationIsDerived = true;
        }
      }
    }
    if (parsed.session_id || parsed.sessionId || parsed.id) {
      if (!scopeId) scopeId = sanitizeText(parsed.session_id || parsed.sessionId || parsed.id);
    }
    if (parsed.version || parsed.cli_version) {
      if (!cliVersion) cliVersion = sanitizeText(parsed.version || parsed.cli_version);
    }

    if (Array.isArray(parsed.messages)) {
      for (const msg of parsed.messages) {
        extractFromTurn(msg);
      }
    } else if (Array.isArray(parsed)) {
      for (const item of parsed) {
        extractFromTurn(item);
      }
    } else {
      extractFromTurn(parsed);
    }
  }

  const hasAnyTokens = hasInput || hasOutput || hasCacheRead || hasCacheWrite || hasThinking;
  const totalVal = hasAnyTokens ? input + output + cacheRead + cacheWrite : undefined;

  return {
    host: "opencode",
    cli_version: cliVersion,
    scope_id: scopeId,
    input_tokens: {
      value: hasInput ? input : undefined,
      state: hasInput ? "observed" : "absent",
      note: "tokens.input",
    },
    output_tokens: {
      value: hasOutput ? output : undefined,
      state: hasOutput ? "observed" : "absent",
      note: "tokens.output",
    },
    cache_read_tokens: {
      value: hasCacheRead ? cacheRead : undefined,
      state: hasCacheRead ? "observed" : "absent",
      note: "tokens.cache.read",
    },
    cache_write_tokens: {
      value: hasCacheWrite ? cacheWrite : undefined,
      state: hasCacheWrite ? "observed" : "absent",
      note: "tokens.cache.write",
    },
    thinking_tokens: {
      value: hasThinking ? thinking : undefined,
      state: hasThinking ? "observed" : "absent",
      note: "tokens.reasoning",
    },
    total_tokens: {
      value: totalVal,
      state: totalVal !== undefined ? "derived" : "absent",
      note: "sum(input + output + cacheRead + cacheWrite)",
    },
    wall_duration_seconds: {
      value: hasDuration ? wallDurationSec : undefined,
      state: hasDuration ? (durationIsDerived ? "derived" : "observed") : "absent",
    },
    cost_usd_estimate: {
      value: hasCost ? costUsd : undefined,
      state: hasCost ? "observed" : "absent",
      note: "provider pricing USD",
    },
    rate_limit_5h_used_pct: {
      state: "unsupported",
      note: "unsupported in OpenCode CLI",
    },
    rate_limit_7d_used_pct: {
      state: "unsupported",
      note: "unsupported in OpenCode CLI",
    },
  };
}

/**
 * Parses an OMP session file (~/.omp/agent/sessions/<encoded-cwd>/<timestamp>_<sessionId>.jsonl),
 * one JSON object per line. Sums assistant message usage and model_usage entries.
 * Only usage, cost, identifiers and timestamps are read; message content is never copied.
 */
export function parseOmpSession(raw: string): UsageObservation {
  let input = 0;
  let output = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  let total = 0;
  let costUsd = 0;

  let hasUsage = false;
  let hasCost = false;
  let timestampCount = 0;
  let firstTs = Number.POSITIVE_INFINITY;
  let lastTs = Number.NEGATIVE_INFINITY;

  let scopeId: string | undefined;
  let cliVersion: string | undefined;

  function addUsage(usage: object) {
    hasUsage = true;
    if ("input" in usage && typeof usage.input === "number") input += usage.input;
    if ("output" in usage && typeof usage.output === "number") output += usage.output;
    if ("cacheRead" in usage && typeof usage.cacheRead === "number") cacheRead += usage.cacheRead;
    if ("cacheWrite" in usage && typeof usage.cacheWrite === "number") cacheWrite += usage.cacheWrite;
    if ("totalTokens" in usage && typeof usage.totalTokens === "number") total += usage.totalTokens;
    if (
      "cost" in usage &&
      typeof usage.cost === "object" &&
      usage.cost !== null &&
      "total" in usage.cost &&
      typeof usage.cost.total === "number"
    ) {
      costUsd += usage.cost.total;
      hasCost = true;
    }
  }

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let entry: unknown;
    try {
      entry = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (typeof entry !== "object" || entry === null) continue;

    const type = "type" in entry ? entry.type : undefined;

    if ("timestamp" in entry && typeof entry.timestamp === "string") {
      const ms = Date.parse(entry.timestamp);
      if (!Number.isNaN(ms)) {
        timestampCount++;
        firstTs = Math.min(firstTs, ms);
        lastTs = Math.max(lastTs, ms);
      }
    }

    if (type === "session" && !scopeId && "id" in entry && typeof entry.id === "string") {
      scopeId = sanitizeText(entry.id);
    }
    if (
      type === "model_change" &&
      !cliVersion &&
      "runtime" in entry &&
      typeof entry.runtime === "object" &&
      entry.runtime !== null &&
      "version" in entry.runtime &&
      typeof entry.runtime.version === "string"
    ) {
      cliVersion = sanitizeText(entry.runtime.version);
    }

    if (
      type === "message" &&
      "message" in entry &&
      typeof entry.message === "object" &&
      entry.message !== null &&
      "role" in entry.message &&
      entry.message.role === "assistant" &&
      "usage" in entry.message &&
      typeof entry.message.usage === "object" &&
      entry.message.usage !== null
    ) {
      addUsage(entry.message.usage);
    } else if (
      type === "model_usage" &&
      "usage" in entry &&
      typeof entry.usage === "object" &&
      entry.usage !== null
    ) {
      addUsage(entry.usage);
    }
  }

  const durationSec = timestampCount >= 2 ? (lastTs - firstTs) / 1000 : undefined;

  return {
    host: "omp",
    cli_version: cliVersion,
    scope_id: scopeId,
    input_tokens: {
      value: hasUsage ? input : undefined,
      state: hasUsage ? "observed" : "absent",
      note: "usage.input",
    },
    output_tokens: {
      value: hasUsage ? output : undefined,
      state: hasUsage ? "observed" : "absent",
      note: "usage.output",
    },
    cache_read_tokens: {
      value: hasUsage ? cacheRead : undefined,
      state: hasUsage ? "observed" : "absent",
      note: "usage.cacheRead",
    },
    cache_write_tokens: {
      value: hasUsage ? cacheWrite : undefined,
      state: hasUsage ? "observed" : "absent",
      note: "usage.cacheWrite",
    },
    thinking_tokens: {
      state: "unsupported",
      note: "OMP folds reasoning into output",
    },
    total_tokens: {
      value: hasUsage ? total : undefined,
      state: hasUsage ? "observed" : "absent",
      note: "sum(usage.totalTokens)",
    },
    wall_duration_seconds: {
      value: durationSec,
      state: durationSec !== undefined ? "derived" : "absent",
      note: "last minus first entry timestamp",
    },
    cost_usd_estimate: {
      value: hasCost ? costUsd : undefined,
      state: hasCost ? "estimated" : "absent",
      note: "OMP model catalog pricing",
    },
    rate_limit_5h_used_pct: {
      state: "unsupported",
      note: "unsupported in OMP",
    },
    rate_limit_7d_used_pct: {
      state: "unsupported",
      note: "unsupported in OMP",
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
  bun tools/eval/collect_usage.ts --antigravity-transcript <file.jsonl>
  bun tools/eval/collect_usage.ts --claude-otel <file.log>
  bun tools/eval/collect_usage.ts --opencode <file.json>
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
  } else if (mode === "--antigravity-transcript") {
    const obs = parseAntigravityTranscript(content);
    console.log(formatObservationMarkdown(obs));
  } else if (mode === "--claude-otel") {
    const lines = content.split("\n");
    const obs = parseClaudeCodeOtel(lines);
    console.log(formatObservationMarkdown(obs));
  } else if (mode === "--opencode") {
    const obs = parseOpencodeJson(content);
    console.log(formatObservationMarkdown(obs));
  } else {
    console.error(`Unknown flag: ${mode}`);
    process.exit(1);
  }
}
