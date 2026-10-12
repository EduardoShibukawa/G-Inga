/**
 * tools/eval/token_budget_guard.ts
 *
 * Telemetry Token Accounting & Cost Drift Calibration Guardrail (Autoresearch EXP-06).
 *
 * Normalizes multi-host session telemetry (Claude Code and Antigravity transcripts),
 * computes metrics (tokens_input, tokens_output, cache_read_tokens, cache_read_ratio, tokens_per_verified_task),
 * enforces ceremony budget ceilings (light: <5k, standard: <25k, heavy: <60k),
 * detects asymptotic context bloat and repetitive unproductive loops,
 * and outputs deterministic verdict (pass, warn, fail) with zero premature stop on legitimate tasks.
 */

import { sanitizeText } from "./collect_usage";

export type CeremonyTier = "light" | "standard" | "heavy";

export type BudgetVerdict = "pass" | "warn" | "fail";

export interface CeremonyBudgetLimit {
  tier: CeremonyTier;
  hardCeiling: number;
  warnRatio: number; // default 0.80 (80% of hard ceiling)
}

export const DEFAULT_BUDGET_LIMITS: Record<CeremonyTier, CeremonyBudgetLimit> = {
  light: {
    tier: "light",
    hardCeiling: 5000,
    warnRatio: 0.80,
  },
  standard: {
    tier: "standard",
    hardCeiling: 25000,
    warnRatio: 0.80,
  },
  heavy: {
    tier: "heavy",
    hardCeiling: 60000,
    warnRatio: 0.80,
  },
};

export interface TokenMetrics {
  tokens_input: number;
  tokens_output: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  total_tokens: number;
  cache_read_ratio: number;
  tokens_per_verified_task?: number;
}

export interface LoopDetectionResult {
  detected: boolean;
  loop_fingerprint?: string;
  consecutive_occurrences?: number;
  reason?: string;
}

export interface TokenBudgetEvaluation {
  host: "antigravity" | "claude-code" | "unknown";
  ceremony: CeremonyTier;
  metrics: TokenMetrics;
  loop_detection: LoopDetectionResult;
  verdict: BudgetVerdict;
  budget_ceiling: number;
  budget_usage_pct: number;
  reason: string;
}

/**
 * Normalizes a list of transcript lines from either Antigravity (.jsonl format)
 * or Claude Code (OTel / api_request JSON lines) into unified TokenMetrics.
 */
export function normalizeTranscriptTelemetry(
  lines: string[],
  hostHint?: "antigravity" | "claude-code"
): { host: "antigravity" | "claude-code" | "unknown"; metrics: TokenMetrics; actions: string[] } {
  let host: "antigravity" | "claude-code" | "unknown" = hostHint || "unknown";
  let input = 0;
  let output = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  const actions: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    try {
      const obj = JSON.parse(trimmed);

      // Antigravity transcript step
      if (obj.step_index !== undefined || obj.source !== undefined) {
        if (host === "unknown") host = "antigravity";
        if (typeof obj.input_tokens === "number") input += obj.input_tokens;
        if (typeof obj.output_tokens === "number") output += obj.output_tokens;
        if (typeof obj.cache_read_tokens === "number") cacheRead += obj.cache_read_tokens;
        if (typeof obj.cache_write_tokens === "number") cacheWrite += obj.cache_write_tokens;

        if (Array.isArray(obj.tool_calls)) {
          for (const tc of obj.tool_calls) {
            if (tc && tc.name) {
              const argTarget = tc.args?.TargetFile || tc.args?.AbsolutePath || tc.args?.CommandLine || tc.args?.Role || "";
              // Extract file basename if it's a path for clean fingerprinting
              const cleanedTarget = argTarget.split("/").pop() || argTarget;
              actions.push(cleanedTarget ? `${tc.name}:${cleanedTarget}` : tc.name);
            }
          }
        }
      }
      // Claude Code OTel / event format
      else if (obj.event === "api_request") {
        if (host === "unknown") host = "claude-code";
        if (typeof obj.input_tokens === "number") input += obj.input_tokens;
        if (typeof obj.output_tokens === "number") output += obj.output_tokens;
        if (typeof obj.cache_read_tokens === "number") cacheRead += obj.cache_read_tokens;
        if (typeof obj.cache_creation_tokens === "number") cacheWrite += obj.cache_creation_tokens;
        if (obj.tool_call) actions.push(String(obj.tool_call));
      } else if (obj.name === "claude_code.token.usage" || obj.metric === "token.usage") {
        if (host === "unknown") host = "claude-code";
        const attrs = obj.attributes || {};
        const val = obj.value || 0;
        if (attrs.type === "input") input += val;
        else if (attrs.type === "output") output += val;
        else if (attrs.type === "cacheRead") cacheRead += val;
        else if (attrs.type === "cacheCreation") cacheWrite += val;
      }
    } catch {
      // Fallback text matching
      const tokenMatch = trimmed.match(/token\.usage.*?type="([^"]+)".*?value=([0-9.]+)/);
      if (tokenMatch) {
        if (host === "unknown") host = "claude-code";
        const type = tokenMatch[1];
        const val = parseFloat(tokenMatch[2]);
        if (type === "input") input += val;
        else if (type === "output") output += val;
        else if (type === "cacheRead") cacheRead += val;
        else if (type === "cacheCreation") cacheWrite += val;
      }
    }
  }

  // Antigravity calculates total_tokens as input + output.
  // When cacheRead is present, cache_read_ratio is cacheRead / (cacheRead + input + output).
  // Total tokens billable/processed in session: input + output for Antigravity, or input + output + cacheRead + cacheWrite for Claude.
  // Standardized total_tokens across both: input + output (or full active context)
  const totalTokens = host === "claude-code"
    ? input + output + cacheRead + cacheWrite
    : input + output;

  const totalEvaluatedTokens = input + output + cacheRead + cacheWrite;
  const cacheReadRatio = totalEvaluatedTokens > 0
    ? Number((cacheRead / totalEvaluatedTokens).toFixed(4))
    : 0;

  return {
    host,
    metrics: {
      tokens_input: input,
      tokens_output: output,
      cache_read_tokens: cacheRead,
      cache_write_tokens: cacheWrite,
      total_tokens: totalTokens,
      cache_read_ratio: cacheReadRatio,
    },
    actions,
  };
}

/**
 * Detects repetitive unproductive loops in action sequences.
 * A loop is detected if the identical action (tool + target/command) repeats >= 3 consecutive times.
 */
export function detectActionLoop(actions: string[], threshold: number = 3): LoopDetectionResult {
  if (actions.length < threshold) {
    return { detected: false };
  }

  let currentStreak = 1;
  let lastAction = actions[0];

  for (let i = 1; i < actions.length; i++) {
    if (actions[i] === lastAction && lastAction !== "") {
      currentStreak++;
      if (currentStreak >= threshold) {
        return {
          detected: true,
          loop_fingerprint: lastAction,
          consecutive_occurrences: currentStreak,
          reason: `Action '${lastAction}' repeated ${currentStreak} consecutive times without progression`,
        };
      }
    } else {
      lastAction = actions[i];
      currentStreak = 1;
    }
  }

  return { detected: false };
}

/**
 * Evaluates session token metrics against ceremony tier budget ceilings and loop guardrails.
 */
export function evaluateTokenBudget(
  metrics: TokenMetrics,
  ceremony: CeremonyTier,
  loopResult: LoopDetectionResult,
  verifiedSuccess?: boolean,
  host: "antigravity" | "claude-code" | "unknown" = "unknown"
): TokenBudgetEvaluation {
  const budget = DEFAULT_BUDGET_LIMITS[ceremony];
  const usagePct = Number(((metrics.total_tokens / budget.hardCeiling) * 100).toFixed(2));

  // 1. Loop detection: If runaway loop is detected, deterministic FAIL
  if (loopResult.detected) {
    return {
      host,
      ceremony,
      metrics: {
        ...metrics,
        tokens_per_verified_task: verifiedSuccess ? metrics.total_tokens : undefined,
      },
      loop_detection: loopResult,
      verdict: "fail",
      budget_ceiling: budget.hardCeiling,
      budget_usage_pct: usagePct,
      reason: `Unproductive loop detected (${loopResult.reason})`,
    };
  }

  // 2. Budget ceiling check: Exceeding hard ceiling triggers FAIL
  if (metrics.total_tokens > budget.hardCeiling) {
    return {
      host,
      ceremony,
      metrics: {
        ...metrics,
        tokens_per_verified_task: verifiedSuccess ? metrics.total_tokens : undefined,
      },
      loop_detection: loopResult,
      verdict: "fail",
      budget_ceiling: budget.hardCeiling,
      budget_usage_pct: usagePct,
      reason: `Total tokens (${metrics.total_tokens}) exceeded ${ceremony} hard ceiling (${budget.hardCeiling})`,
    };
  }

  // 3. Drift warning check: >= 80% of budget triggers WARN
  if (metrics.total_tokens >= budget.hardCeiling * budget.warnRatio) {
    return {
      host,
      ceremony,
      metrics: {
        ...metrics,
        tokens_per_verified_task: verifiedSuccess ? metrics.total_tokens : undefined,
      },
      loop_detection: loopResult,
      verdict: "warn",
      budget_ceiling: budget.hardCeiling,
      budget_usage_pct: usagePct,
      reason: `Context drift warning: budget consumption at ${usagePct}% (>= 80% threshold)`,
    };
  }

  // 4. Within budget: PASS
  return {
    host,
    ceremony,
    metrics: {
      ...metrics,
      tokens_per_verified_task: verifiedSuccess ? metrics.total_tokens : undefined,
    },
    loop_detection: loopResult,
    verdict: "pass",
    budget_ceiling: budget.hardCeiling,
    budget_usage_pct: usagePct,
    reason: `Within ${ceremony} ceremony budget (${usagePct}% consumed)`,
  };
}

/**
 * Sanitizes and exports token metrics into an ADR 0006 compliant summary.
 */
export function exportSanitizedBudgetReport(evalResult: TokenBudgetEvaluation): string {
  const sanitizedReason = sanitizeText(evalResult.reason);
  return [
    `# Token Budget Evaluation Report`,
    `- Host: ${evalResult.host}`,
    `- Ceremony: ${evalResult.ceremony}`,
    `- Verdict: ${evalResult.verdict}`,
    `- Usage: ${evalResult.metrics.total_tokens} / ${evalResult.budget_ceiling} tokens (${evalResult.budget_usage_pct}%)`,
    `- Cache Read Ratio: ${(evalResult.metrics.cache_read_ratio * 100).toFixed(1)}%`,
    `- Loop Detected: ${evalResult.loop_detection.detected}`,
    `- Reason: ${sanitizedReason}`,
  ].join("\n");
}
