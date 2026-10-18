/**
 * tools/eval/evaluate_girag_slicing.test.ts
 *
 * Test suite for Autoresearch EXP-07: Gira-G Architectural Slicing vs Full Exploration.
 */

import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  calculateTokenReduction,
  evaluateScenario,
  evaluateSlicingSuite,
  queryGiragSlice,
  resolveGiragBinary,
  type GiragSlicingScenario,
} from "./evaluate_girag_slicing";

const SCENARIO_PATH = resolve(process.cwd(), "docs/research/scenarios/girag-slicing-v1.json");

function withIndexFixture(contents: string, callback: (indexPath: string, directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), "girag-macro-map-"));
  const indexPath = join(directory, "macro-map.json");
  writeFileSync(indexPath, contents, "utf8");
  try {
    callback(indexPath, directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function validMacroMap(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schema_version: "1.0.0",
    nodes: [
      { id: "node-a", name: "A" },
      { id: "node-b", name: "B" },
    ],
    relationships: [{ source_id: "node-a", target_id: "node-b", type: "depends_on" }],
    ...overrides,
  });
}

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

  test("Direct fallback accepts the supported Macro Map and traverses relationships", () => {
    withIndexFixture(validMacroMap(), (indexPath) => {
      const result = queryGiragSlice("node-a", { indexPath, binaryPath: null });
      expect(result.success).toBe(true);
      expect(result.strategy).toBe("index_traversal");
      expect(result.output.focal_node.id).toBe("node-a");
      expect(result.output.neighbors.map((node: { id: string }) => node.id)).toEqual(["node-b"]);
      expect(result.output.relationships).toHaveLength(1);
    });
  });

  test("Direct fallback rejects missing, malformed, unknown, and unsupported schema versions", () => {
    const cases: Array<{ label: string; contents: string }> = [
      { label: "missing", contents: JSON.stringify({ nodes: [], relationships: [] }) },
      { label: "null", contents: validMacroMap({ schema_version: null }) },
      { label: "empty", contents: validMacroMap({ schema_version: "" }) },
      { label: "boolean", contents: validMacroMap({ schema_version: true }) },
      { label: "object", contents: validMacroMap({ schema_version: { version: "1.0.0" } }) },
      { label: "array", contents: validMacroMap({ schema_version: ["1.0.0"] }) },
      { label: "integer schema 2", contents: validMacroMap({ schema_version: 2 }) },
      { label: "unknown integer", contents: validMacroMap({ schema_version: 999 }) },
      { label: "unknown string", contents: validMacroMap({ schema_version: "9.9.9" }) },
      { label: "wrong representation", contents: validMacroMap({ schema_version: "2" }) },
    ];

    for (const fixture of cases) {
      withIndexFixture(fixture.contents, (indexPath) => {
        const result = queryGiragSlice("node-a", { indexPath, binaryPath: null });
        expect(result.success, fixture.label).toBe(false);
        expect(result.error, fixture.label).toContain("Unsupported Macro Map schema_version:");
        expect(result.error, fixture.label).not.toContain("Node node-a not found");
      });
    }
  });

  test("Direct fallback distinguishes malformed JSON from invalid graph structure", () => {
    withIndexFixture("{not valid JSON", (indexPath) => {
      const result = queryGiragSlice("node-a", { indexPath, binaryPath: null });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Malformed Macro Map JSON:");
    });

    const invalidMaps = [
      { label: "null top-level value", contents: "null" },
      { label: "array top-level value", contents: "[]" },
      { label: "missing nodes", contents: JSON.stringify({ schema_version: "1.0.0", relationships: [] }) },
      { label: "nodes not array", contents: validMacroMap({ nodes: {} }) },
      { label: "relationships not array", contents: validMacroMap({ relationships: null }) },
      { label: "node is null", contents: validMacroMap({ nodes: [null] }) },
      { label: "node id not string", contents: validMacroMap({ nodes: [{ id: 42 }] }) },
      { label: "relationship target missing", contents: validMacroMap({ relationships: [{ source_id: "node-a" }] }) },
    ];

    for (const fixture of invalidMaps) {
      withIndexFixture(fixture.contents, (indexPath) => {
        const result = queryGiragSlice("node-a", { indexPath, binaryPath: null });
        expect(result.success, fixture.label).toBe(false);
        expect(result.error, fixture.label).toContain("Invalid Macro Map structure:");
        expect(result.error, fixture.label).not.toContain("Node node-a not found");
      });
    }
  });

  test("A valid map with an absent node is distinct from schema and structure errors", () => {
    withIndexFixture(validMacroMap(), (indexPath) => {
      const result = queryGiragSlice("node-missing", { indexPath, binaryPath: null });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Node node-missing not found in index");
      expect(result.error).not.toContain("Unsupported Macro Map schema_version:");
      expect(result.error).not.toContain("Invalid Macro Map structure:");
    });
  });

  test("CLI unavailable and CLI failure both enforce the same fallback schema gate", () => {
    withIndexFixture(validMacroMap({ schema_version: 2 }), (indexPath, directory) => {
      const unavailable = queryGiragSlice("node-a", { indexPath, binaryPath: null });
      const failingBinary = join(directory, "gira-fails");
      writeFileSync(failingBinary, "#!/bin/sh\nexit 1\n", "utf8");
      chmodSync(failingBinary, 0o755);

      const afterCliFailure = queryGiragSlice("node-a", { indexPath, binaryPath: failingBinary });
      expect(unavailable.success).toBe(false);
      expect(afterCliFailure.success).toBe(false);
      expect(unavailable.error).toContain("Unsupported Macro Map schema_version: 2");
      expect(afterCliFailure.error).toBe(unavailable.error);
      expect(afterCliFailure.strategy).toBe("index_traversal");
    });
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
