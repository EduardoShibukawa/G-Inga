import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  normalizeTranscriptTelemetry,
  detectActionLoop,
  evaluateTokenBudget,
  exportSanitizedBudgetReport,
  DEFAULT_BUDGET_LIMITS,
  type TokenBudgetEvaluation,
} from "./token_budget_guard";

describe("Token Budget Guardrail & Telemetry Accounting (Autoresearch EXP-06)", () => {
  const scenarioPath = resolve(__dirname, "../../docs/research/scenarios/token-budget-v1.json");
  const rawScenarios = readFileSync(scenarioPath, "utf-8");
  const scenarios = JSON.parse(rawScenarios);

  test("Dataset integrity: contains at least 12 scenarios covering light, standard, heavy", () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(12);

    const ceremonies = new Set(scenarios.map((s: any) => s.ceremony));
    expect(ceremonies.has("light")).toBe(true);
    expect(ceremonies.has("standard")).toBe(true);
    expect(ceremonies.has("heavy")).toBe(true);

    const hosts = new Set(scenarios.map((s: any) => s.host));
    expect(hosts.has("antigravity")).toBe(true);
    expect(hosts.has("claude-code")).toBe(true);
  });

  test("Antigravity transcript parsing extracts correct token metrics", () => {
    const lines = [
      JSON.stringify({
        step_index: 1,
        source: "USER_EXPLICIT",
        type: "USER_INPUT",
        input_tokens: 1500,
        cache_read_tokens: 800,
        output_tokens: 0,
      }),
      JSON.stringify({
        step_index: 2,
        source: "MODEL",
        type: "PLANNER_RESPONSE",
        input_tokens: 2500,
        cache_read_tokens: 1200,
        output_tokens: 450,
        tool_calls: [{ name: "view_file", args: { AbsolutePath: "/path/to/file.ts" } }],
      }),
    ];

    const result = normalizeTranscriptTelemetry(lines);
    expect(result.host).toBe("antigravity");
    expect(result.metrics.tokens_input).toBe(4000);
    expect(result.metrics.tokens_output).toBe(450);
    expect(result.metrics.cache_read_tokens).toBe(2000);
    expect(result.metrics.total_tokens).toBe(4450); // input + output
    expect(result.metrics.cache_read_ratio).toBeCloseTo(2000 / (4000 + 450 + 2000), 4);
    expect(result.actions).toEqual(["view_file:file.ts"]);
  });

  test("Claude Code OTel and event parsing extracts correct token metrics", () => {
    const lines = [
      JSON.stringify({
        event: "api_request",
        input_tokens: 3000,
        output_tokens: 500,
        cache_read_tokens: 1000,
        cache_creation_tokens: 200,
        tool_call: "bash:bun test",
      }),
      JSON.stringify({
        name: "claude_code.token.usage",
        attributes: { type: "input" },
        value: 2000,
      }),
      JSON.stringify({
        name: "claude_code.token.usage",
        attributes: { type: "output" },
        value: 300,
      }),
    ];

    const result = normalizeTranscriptTelemetry(lines);
    expect(result.host).toBe("claude-code");
    expect(result.metrics.tokens_input).toBe(5000);
    expect(result.metrics.tokens_output).toBe(800);
    expect(result.metrics.cache_read_tokens).toBe(1000);
    expect(result.metrics.cache_write_tokens).toBe(200);
    expect(result.metrics.total_tokens).toBe(7000); // 5000 + 800 + 1000 + 200
  });

  test("Loop detection captures 100% of repetitive unproductive actions", () => {
    const loopActions = [
      "run_command:bun test",
      "run_command:bun test",
      "run_command:bun test",
    ];
    const loopResult = detectActionLoop(loopActions);
    expect(loopResult.detected).toBe(true);
    expect(loopResult.loop_fingerprint).toBe("run_command:bun test");
    expect(loopResult.consecutive_occurrences).toBe(3);

    const normalActions = [
      "view_file:a.ts",
      "write_to_file:a.ts",
      "run_command:bun test",
      "write_to_file:b.ts",
      "run_command:bun test",
    ];
    const normalResult = detectActionLoop(normalActions);
    expect(normalResult.detected).toBe(false);
  });

  test("Budget evaluation respects ceremony ceilings and warning thresholds", () => {
    // Light ceiling is 5000
    const lightUnder = evaluateTokenBudget(
      { tokens_input: 2500, tokens_output: 500, cache_read_tokens: 1000, cache_write_tokens: 0, total_tokens: 3000, cache_read_ratio: 0.25 },
      "light",
      { detected: false }
    );
    expect(lightUnder.verdict).toBe("pass");

    const lightWarn = evaluateTokenBudget(
      { tokens_input: 3600, tokens_output: 600, cache_read_tokens: 1000, cache_write_tokens: 0, total_tokens: 4200, cache_read_ratio: 0.2 },
      "light",
      { detected: false }
    );
    expect(lightWarn.verdict).toBe("warn"); // >= 80% (4000)

    const lightOver = evaluateTokenBudget(
      { tokens_input: 4500, tokens_output: 800, cache_read_tokens: 1000, cache_write_tokens: 0, total_tokens: 5300, cache_read_ratio: 0.15 },
      "light",
      { detected: false }
    );
    expect(lightOver.verdict).toBe("fail"); // > 5000
  });

  test("Loop guardrail immediately triggers fail even if under hard ceiling", () => {
    const evalResult = evaluateTokenBudget(
      { tokens_input: 1200, tokens_output: 300, cache_read_tokens: 500, cache_write_tokens: 0, total_tokens: 1500, cache_read_ratio: 0.25 },
      "standard",
      { detected: true, reason: "Repeated run_command 3 times" }
    );
    expect(evalResult.verdict).toBe("fail");
    expect(evalResult.loop_detection.detected).toBe(true);
  });

  test("Zero premature stops on legitimate complex tasks within ceiling", () => {
    // Standard ceiling 25k, task at 23.5k without loops
    const legitTask = evaluateTokenBudget(
      { tokens_input: 20500, tokens_output: 3000, cache_read_tokens: 15000, cache_write_tokens: 0, total_tokens: 23500, cache_read_ratio: 0.3896 },
      "standard",
      { detected: false },
      true
    );
    expect(legitTask.verdict).toBe("warn"); // Warn is not Fail; it allows completion without aborting verified task
    expect(legitTask.verdict !== "fail").toBe(true);
    expect(legitTask.metrics.tokens_per_verified_task).toBe(23500);
  });

  test("Full scenario benchmark: 100% agreement with expected verdict on all 12 scenarios", () => {
    let loopDetectedCount = 0;
    let expectedLoopCount = 0;

    for (const sc of scenarios) {
      const normalized = normalizeTranscriptTelemetry(sc.transcript_lines, sc.host);
      const loop = detectActionLoop(normalized.actions);

      if (sc.is_loop) {
        expectedLoopCount++;
        if (loop.detected) loopDetectedCount++;
      }

      const evaluation = evaluateTokenBudget(
        normalized.metrics,
        sc.ceremony,
        loop,
        sc.verified_success,
        sc.host
      );

      // Verify verdict match
      expect(evaluation.verdict).toBe(sc.expected_verdict);

      // Verify metrics match within reasonable delta
      expect(normalized.metrics.tokens_input).toBe(sc.expected_metrics.tokens_input);
      expect(normalized.metrics.tokens_output).toBe(sc.expected_metrics.tokens_output);
      expect(normalized.metrics.cache_read_tokens).toBe(sc.expected_metrics.cache_read_tokens);
      expect(normalized.metrics.total_tokens).toBe(sc.expected_metrics.total_tokens);
      expect(normalized.metrics.cache_read_ratio).toBeCloseTo(sc.expected_metrics.cache_read_ratio, 3);
    }

    // 100% runaway loop detection
    expect(loopDetectedCount).toBe(expectedLoopCount);
    expect(expectedLoopCount).toBeGreaterThanOrEqual(3);
  });

  test("Privacy sanitization scrubs sensitive emails and UUIDs from report", () => {
    const mockEval: TokenBudgetEvaluation = {
      host: "antigravity",
      ceremony: "standard",
      metrics: {
        tokens_input: 5000,
        tokens_output: 1000,
        cache_read_tokens: 2000,
        cache_write_tokens: 0,
        total_tokens: 6000,
        cache_read_ratio: 0.25,
      },
      loop_detection: { detected: false },
      verdict: "pass",
      budget_ceiling: 25000,
      budget_usage_pct: 24.0,
      reason: "Within budget for user test@company.com with session 12345678-1234-1234-1234-123456789abc",
    };

    const report = exportSanitizedBudgetReport(mockEval);
    expect(report).not.toContain("test@company.com");
    expect(report).not.toContain("12345678-1234-1234-1234-123456789abc");
    expect(report).toContain("[SCRUBBED_EMAIL]");
    expect(report).toContain("[UUID]");
  });
});
