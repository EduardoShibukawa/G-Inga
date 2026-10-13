/**
 * tools/eval/evaluate_girag_slicing.test.ts
 *
 * Test suite for Autoresearch EXP-07: Gira-G Architectural Slicing vs Full Exploration.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  calculateTokenReduction,
  evaluateScenario,
  evaluateSlicingSuite,
  queryGiragSlice,
  resolveGiragBinary,
  type GiragSlicingScenario,
} from "./evaluate_girag_slicing";

const SCENARIO_PATH = resolve(process.cwd(), "docs/research/scenarios/girag-slicing-v1.json");

describe("Autoresearch EXP-07: Gira-G Slicing Benchmark", () => {
  test("Scenario dataset integrity and schema completeness", () => {
    expect(existsSync(SCENARIO_PATH)).toBe(true);
    const scenarios: GiragSlicingScenario[] = JSON.parse(readFileSync(SCENARIO_PATH, "utf8"));

    expect(scenarios.length).toBeGreaterThanOrEqual(12);

    for (const sc of scenarios) {
      expect(sc.id).toMatch(/^GIRAG-\d{2}$/);
      expect(sc.name.length).toBeGreaterThan(5);
      expect(sc.category.length).toBeGreaterThan(3);
      expect(sc.focal_node.length).toBeGreaterThan(3);
      expect(sc.target_components.length).toBeGreaterThan(0);
      expect(sc.required_files.length).toBeGreaterThan(0);

      // Full exploration properties
      expect(sc.full_exploration.input_tokens).toBeGreaterThan(15000);
      expect(sc.full_exploration.scanned_files.length).toBeGreaterThan(0);
      expect(sc.full_exploration.boundary_misses.length).toBeGreaterThan(0);

      // Gira-G slice properties
      expect(sc.girag_slice.input_tokens).toBeGreaterThan(1000);
      expect(sc.girag_slice.input_tokens).toBeLessThan(sc.full_exploration.input_tokens);
      expect(sc.girag_slice.injected_files.length).toBeGreaterThan(0);
      expect(sc.girag_slice.boundary_misses.length).toBe(0);
      expect(sc.girag_slice.slicing_overhead_ms).toBeLessThan(500);

      // Expectations
      expect(sc.expected.min_token_reduction_pct).toBe(30.0);
      expect(sc.expected.scope_accuracy_pct).toBe(100.0);
      expect(sc.expected.max_overhead_ms).toBe(500);
    }
  });

  test("Token reduction calculation handles normal and edge cases", () => {
    const { tokensSaved, reductionPct } = calculateTokenReduction(30000, 10000);
    expect(tokensSaved).toBe(20000);
    expect(reductionPct).toBeCloseTo(66.67, 1);

    const edgeZero = calculateTokenReduction(0, 500);
    expect(edgeZero.tokensSaved).toBe(0);
    expect(edgeZero.reductionPct).toBe(0);

    const edgeHigher = calculateTokenReduction(10000, 12000);
    expect(edgeHigher.tokensSaved).toBe(0);
    expect(edgeHigher.reductionPct).toBe(0);
  });

  test("Evaluator verifies >= 30% token reduction across all scenarios", () => {
    const scenarios: GiragSlicingScenario[] = JSON.parse(readFileSync(SCENARIO_PATH, "utf8"));

    for (const sc of scenarios) {
      const res = evaluateScenario(sc);
      expect(res.token_reduction_pct).toBeGreaterThanOrEqual(30.0);
      expect(res.token_target_met).toBe(true);
      expect(res.tokens_saved).toBe(sc.full_exploration.input_tokens - sc.girag_slice.input_tokens);
    }
  });

  test("Evaluator strictly enforces 0 boundary misses for Gira-G slices", () => {
    const scenarios: GiragSlicingScenario[] = JSON.parse(readFileSync(SCENARIO_PATH, "utf8"));

    for (const sc of scenarios) {
      const res = evaluateScenario(sc);
      expect(res.slice_boundary_misses.length).toBe(0);
      expect(res.boundary_accuracy_pct).toBe(100.0);
      expect(res.boundary_accuracy_met).toBe(true);

      // Check that baseline blind exploration had misses
      expect(res.full_boundary_misses.length).toBeGreaterThan(0);
    }
  });

  test("Evaluator trips failure when hypothetical boundary miss or token deficit occurs", () => {
    const scenarios: GiragSlicingScenario[] = JSON.parse(readFileSync(SCENARIO_PATH, "utf8"));
    const base = scenarios[0];

    // Case 1: boundary miss introduced
    const withMiss: GiragSlicingScenario = {
      ...base,
      girag_slice: {
        ...base.girag_slice,
        boundary_misses: ["docs/decisions/0006-usage-observability.md"],
      },
    };
    const resMiss = evaluateScenario(withMiss);
    expect(resMiss.pass).toBe(false);
    expect(resMiss.boundary_accuracy_met).toBe(false);
    expect(resMiss.reason).toContain("Boundary misses detected in slice");

    // Case 2: insufficient token reduction (< 30%)
    const lowReduction: GiragSlicingScenario = {
      ...base,
      girag_slice: {
        ...base.girag_slice,
        input_tokens: 25000, // from 28450 -> only 12.1%
      },
    };
    const resLow = evaluateScenario(lowReduction);
    expect(resLow.pass).toBe(false);
    expect(resLow.token_target_met).toBe(false);
    expect(resLow.reason).toContain("Token reduction");

    // Case 3: overhead SLA exceeded (> 500ms)
    const slowOverhead: GiragSlicingScenario = {
      ...base,
      girag_slice: {
        ...base.girag_slice,
        slicing_overhead_ms: 650,
      },
    };
    const resSlow = evaluateScenario(slowOverhead);
    expect(resSlow.pass).toBe(false);
    expect(resSlow.overhead_target_met).toBe(false);
    expect(resSlow.reason).toContain("Slicing overhead 650ms exceeds 500ms");
  });

  test("Full suite evaluation confirms hypothesis with 100% scenario pass", () => {
    const scenarios: GiragSlicingScenario[] = JSON.parse(readFileSync(SCENARIO_PATH, "utf8"));
    const summary = evaluateSlicingSuite(scenarios);

    expect(summary.total_scenarios).toBe(12);
    expect(summary.passed_scenarios).toBe(12);
    expect(summary.failed_scenarios).toBe(0);
    expect(summary.overall_pass).toBe(true);
    expect(summary.hypothesis_verified).toBe(true);

    // Aggregate token savings
    expect(summary.mean_token_reduction_pct).toBeGreaterThanOrEqual(30.0);
    expect(summary.mean_token_reduction_pct).toBeGreaterThan(60.0);
    expect(summary.total_tokens_saved).toBeGreaterThan(200000);
    expect(summary.total_tokens_saved_pct).toBeGreaterThan(60.0);

    // Boundary accuracy
    expect(summary.girag_slice_total_misses).toBe(0);
    expect(summary.slice_boundary_accuracy_pct).toBe(100.0);
    expect(summary.full_exploration_total_misses).toBe(12);

    // Latency overhead SLA
    expect(summary.max_overhead_ms).toBeLessThan(500);
    expect(summary.mean_overhead_ms).toBeLessThan(50);
  });

  test("Live Gira-G query integration validates fast bounded slicing on canonical index", () => {
    const result = queryGiragSlice("policy:0006-usage-observability", {
      tier: "summary",
      view: "full",
    });

    expect(result.success).toBe(true);
    expect(result.durationMs).toBeLessThan(500);
    expect(result.output).toBeDefined();

    const focalNode = result.output.focal_node;
    expect(focalNode).toBeDefined();
    expect(focalNode.id).toBe("policy:0006-usage-observability");
    expect(focalNode.metadata?.path).toBe("docs/decisions/0006-usage-observability.md");

    // Relationships / neighbors should be populated
    expect(result.output.neighbors?.length).toBeGreaterThan(0);
  });
});
