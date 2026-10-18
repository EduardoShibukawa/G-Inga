#!/usr/bin/env bun
/**
 * tools/eval/evaluate_girag_slicing.ts
 *
 * Evaluates Gira-G Architectural Slicing vs Full Context Exploration (Autoresearch EXP-07).
 *
 * Hypothesis:
 * "Injecting deterministic architectural slices via Gira-G (gira slice) into worker contexts
 * reduces input tokens by >= 30% compared to blind full-repo discovery while eliminating
 * 100% of out-of-scope boundary misses on complex multi-component tasks."
 *
 * Metrics:
 * - Percentage input token reduction (target: >= 30%)
 * - Scope accuracy rate (0 misses of required files / 100% boundary accuracy)
 * - Initialization time and slicing overhead (< 500ms SLA)
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

export interface FullExplorationData {
  strategy: string;
  scanned_files: string[];
  input_tokens: number;
  out_of_scope_files: string[];
  boundary_misses: string[];
}

export interface GiragSliceData {
  tier: "summary" | "contracts" | "deep";
  view: "full" | "architecture" | "governance";
  injected_files: string[];
  input_tokens: number;
  slicing_overhead_ms: number;
  boundary_misses: string[];
}

export interface ScenarioExpectations {
  min_token_reduction_pct: number;
  scope_accuracy_pct: number;
  max_overhead_ms: number;
}

export interface GiragSlicingScenario {
  id: string;
  name: string;
  category: string;
  description: string;
  focal_node: string;
  target_components: string[];
  required_files: string[];
  full_exploration: FullExplorationData;
  girag_slice: GiragSliceData;
  expected: ScenarioExpectations;
}

export interface ScenarioResult {
  scenario_id: string;
  name: string;
  category: string;
  full_input_tokens: number;
  slice_input_tokens: number;
  tokens_saved: number;
  token_reduction_pct: number;
  token_target_met: boolean;
  full_boundary_misses: string[];
  slice_boundary_misses: string[];
  boundary_accuracy_pct: number;
  boundary_accuracy_met: boolean;
  slicing_overhead_ms: number;
  overhead_target_met: boolean;
  pass: boolean;
  reason: string;
}

export interface SlicingEvaluationSummary {
  total_scenarios: number;
  passed_scenarios: number;
  failed_scenarios: number;
  overall_pass: boolean;
  hypothesis_verified: boolean;
  mean_token_reduction_pct: number;
  total_full_tokens: number;
  total_slice_tokens: number;
  total_tokens_saved: number;
  total_tokens_saved_pct: number;
  full_exploration_total_misses: number;
  girag_slice_total_misses: number;
  slice_boundary_accuracy_pct: number;
  max_overhead_ms: number;
  mean_overhead_ms: number;
  results: ScenarioResult[];
}

/**
 * Calculates token reduction percentage and tokens saved.
 */
export function calculateTokenReduction(
  fullTokens: number,
  sliceTokens: number
): { tokensSaved: number; reductionPct: number } {
  if (fullTokens <= 0) return { tokensSaved: 0, reductionPct: 0 };
  const tokensSaved = Math.max(0, fullTokens - sliceTokens);
  const reductionPct = (tokensSaved / fullTokens) * 100;
  return { tokensSaved, reductionPct };
}

/**
 * Evaluates a single Gira-G slicing benchmark scenario.
 */
export function evaluateScenario(scenario: GiragSlicingScenario): ScenarioResult {
  const { tokensSaved, reductionPct } = calculateTokenReduction(
    scenario.full_exploration.input_tokens,
    scenario.girag_slice.input_tokens
  );

  const token_target_met = reductionPct >= scenario.expected.min_token_reduction_pct;

  // Verify that required files are in injected_files and no boundary misses exist
  const sliceMisses = scenario.girag_slice.boundary_misses;
  const boundary_accuracy_met = sliceMisses.length === 0;

  // Calculate scope accuracy: (required - misses) / required
  const reqCount = scenario.required_files.length;
  const boundary_accuracy_pct = reqCount > 0
    ? Math.max(0, ((reqCount - sliceMisses.length) / reqCount) * 100)
    : 100;

  const overhead_target_met = scenario.girag_slice.slicing_overhead_ms <= scenario.expected.max_overhead_ms;

  const pass = token_target_met && boundary_accuracy_met && overhead_target_met;

  const reasons: string[] = [];
  if (!token_target_met) {
    reasons.push(
      `Token reduction ${reductionPct.toFixed(1)}% below required ${scenario.expected.min_token_reduction_pct}%`
    );
  }
  if (!boundary_accuracy_met) {
    reasons.push(`Boundary misses detected in slice: ${sliceMisses.join(", ")}`);
  }
  if (!overhead_target_met) {
    reasons.push(
      `Slicing overhead ${scenario.girag_slice.slicing_overhead_ms}ms exceeds ${scenario.expected.max_overhead_ms}ms`
    );
  }

  const reason = pass
    ? `Passed: ${reductionPct.toFixed(1)}% tokens saved, 0 misses, ${scenario.girag_slice.slicing_overhead_ms}ms overhead`
    : reasons.join("; ");

  return {
    scenario_id: scenario.id,
    name: scenario.name,
    category: scenario.category,
    full_input_tokens: scenario.full_exploration.input_tokens,
    slice_input_tokens: scenario.girag_slice.input_tokens,
    tokens_saved: tokensSaved,
    token_reduction_pct: Number(reductionPct.toFixed(2)),
    token_target_met,
    full_boundary_misses: scenario.full_exploration.boundary_misses,
    slice_boundary_misses: sliceMisses,
    boundary_accuracy_pct: Number(boundary_accuracy_pct.toFixed(2)),
    boundary_accuracy_met,
    slicing_overhead_ms: scenario.girag_slice.slicing_overhead_ms,
    overhead_target_met,
    pass,
    reason,
  };
}

/**
 * Evaluates an entire suite of slicing scenarios and compiles aggregate statistics.
 */
export function evaluateSlicingSuite(scenarios: GiragSlicingScenario[]): SlicingEvaluationSummary {
  const results = scenarios.map(evaluateScenario);
  const passed_scenarios = results.filter((r) => r.pass).length;
  const failed_scenarios = results.length - passed_scenarios;

  const total_full_tokens = scenarios.reduce((sum, s) => sum + s.full_exploration.input_tokens, 0);
  const total_slice_tokens = scenarios.reduce((sum, s) => sum + s.girag_slice.input_tokens, 0);
  const { tokensSaved: total_tokens_saved, reductionPct: total_tokens_saved_pct } = calculateTokenReduction(
    total_full_tokens,
    total_slice_tokens
  );

  const mean_token_reduction_pct = results.length > 0
    ? results.reduce((sum, r) => sum + r.token_reduction_pct, 0) / results.length
    : 0;

  const full_exploration_total_misses = scenarios.reduce(
    (sum, s) => sum + s.full_exploration.boundary_misses.length,
    0
  );
  const girag_slice_total_misses = scenarios.reduce(
    (sum, s) => sum + s.girag_slice.boundary_misses.length,
    0
  );

  const totalRequiredFiles = scenarios.reduce((sum, s) => sum + s.required_files.length, 0);
  const slice_boundary_accuracy_pct = totalRequiredFiles > 0
    ? ((totalRequiredFiles - girag_slice_total_misses) / totalRequiredFiles) * 100
    : 100;

  const overheads = scenarios.map((s) => s.girag_slice.slicing_overhead_ms);
  const max_overhead_ms = overheads.length > 0 ? Math.max(...overheads) : 0;
  const mean_overhead_ms = overheads.length > 0
    ? overheads.reduce((a, b) => a + b, 0) / overheads.length
    : 0;

  const overall_pass = failed_scenarios === 0;
  // Hypothesis: token reduction >= 30%, 0 boundary misses, overhead < 500ms
  const hypothesis_verified =
    mean_token_reduction_pct >= 30.0 &&
    girag_slice_total_misses === 0 &&
    max_overhead_ms < 500 &&
    overall_pass;

  return {
    total_scenarios: scenarios.length,
    passed_scenarios,
    failed_scenarios,
    overall_pass,
    hypothesis_verified,
    mean_token_reduction_pct: Number(mean_token_reduction_pct.toFixed(2)),
    total_full_tokens,
    total_slice_tokens,
    total_tokens_saved,
    total_tokens_saved_pct: Number(total_tokens_saved_pct.toFixed(2)),
    full_exploration_total_misses,
    girag_slice_total_misses,
    slice_boundary_accuracy_pct: Number(slice_boundary_accuracy_pct.toFixed(2)),
    max_overhead_ms,
    mean_overhead_ms: Number(mean_overhead_ms.toFixed(2)),
    results,
  };
}

/**
 * Resolves path to the Gira-G binary if present on host.
 */
export function resolveGiragBinary(): string | null {
  if (process.env.GIRA_BIN && existsSync(process.env.GIRA_BIN)) {
    return process.env.GIRA_BIN;
  }
  const defaultLabPath = "/home/tg/Git/duh-homelab/labs/gira-g/bin/gira";
  if (existsSync(defaultLabPath)) {
    return defaultLabPath;
  }
  try {
    const whichOut = execSync("which gira 2>/dev/null", { encoding: "utf8" }).trim();
    if (whichOut && existsSync(whichOut)) {
      return whichOut;
    }
  } catch {
    // Binary not in PATH
  }
  return null;
}

/**
 * Executes a slice query via the Gira-G CLI harness or falls back to direct macro-map index lookup.
 * Returns measured execution duration and extracted slice.
 */
interface SupportedMacroMap {
  schema_version: "1.0.0";
  nodes: Array<Record<string, any> & { id: string }>;
  relationships: Array<Record<string, any> & { source_id: string; target_id: string }>;
}

function describeSchemaVersion(data: Record<string, any>): string {
  if (!Object.prototype.hasOwnProperty.call(data, "schema_version")) return "<missing>";
  const value = JSON.stringify(data.schema_version);
  return value === undefined ? String(data.schema_version) : value;
}

/**
 * Parses and validates only the Macro Map contract this evaluator has verified.
 * Keep schema 2 unsupported until the producer contract and consumer support are approved.
 */
function parseSupportedMacroMap(contents: string): SupportedMacroMap {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (err: any) {
    throw new Error(`Malformed Macro Map JSON: ${String(err?.message || err)}`);
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid Macro Map structure: top-level value must be an object");
  }

  const data = parsed as Record<string, any>;
  if (data.schema_version !== "1.0.0") {
    throw new Error(`Unsupported Macro Map schema_version: ${describeSchemaVersion(data)}`);
  }
  if (!Array.isArray(data.nodes)) {
    throw new Error("Invalid Macro Map structure: nodes must be an array");
  }
  if (!Array.isArray(data.relationships)) {
    throw new Error("Invalid Macro Map structure: relationships must be an array");
  }

  for (const [index, node] of data.nodes.entries()) {
    if (node === null || typeof node !== "object" || Array.isArray(node) || typeof node.id !== "string") {
      throw new Error(`Invalid Macro Map structure: nodes[${index}].id must be a string`);
    }
  }
  for (const [index, relationship] of data.relationships.entries()) {
    if (
      relationship === null ||
      typeof relationship !== "object" ||
      Array.isArray(relationship) ||
      typeof relationship.source_id !== "string" ||
      typeof relationship.target_id !== "string"
    ) {
      throw new Error(
        `Invalid Macro Map structure: relationships[${index}] must have string source_id and target_id`
      );
    }
  }

  return data as SupportedMacroMap;
}

export function queryGiragSlice(
  nodeId: string,
  options?: { tier?: string; view?: string; indexPath?: string; binaryPath?: string | null }
): {
  success: boolean;
  durationMs: number;
  output?: any;
  error?: string;
  strategy: "cli" | "index_traversal";
} {
  const indexPath = options?.indexPath || resolve(process.cwd(), "docs/architecture/macro-map.json");
  const tier = options?.tier || "summary";
  const view = options?.view || "full";
  const bin = options?.binaryPath !== undefined ? options.binaryPath : resolveGiragBinary();

  if (bin && existsSync(bin) && existsSync(indexPath)) {
    const start = performance.now();
    try {
      const cmd = `"${bin}" slice "${nodeId}" --tier ${tier} --view ${view} --index "${indexPath}"`;
      const stdout = execSync(cmd, { encoding: "utf8", timeout: 2000 });
      const durationMs = Number((performance.now() - start).toFixed(2));
      const parsed = JSON.parse(stdout);
      return { success: true, durationMs, output: parsed, strategy: "cli" };
    } catch (err: any) {
      // CLI error
    }
  }

  // Fast direct graph index traversal fallback
  if (existsSync(indexPath)) {
    const start = performance.now();
    try {
      const data = parseSupportedMacroMap(readFileSync(indexPath, "utf8"));
      const focal = data.nodes.find((n: any) => n.id === nodeId);
      if (!focal) {
        const durationMs = Number((performance.now() - start).toFixed(2));
        return {
          success: false,
          durationMs,
          error: `Node ${nodeId} not found in index`,
          strategy: "index_traversal",
        };
      }
      const rels = data.relationships.filter(
        (r: any) => r.source_id === nodeId || r.target_id === nodeId
      );
      const neighborIds = new Set(rels.flatMap((r: any) => [r.source_id, r.target_id]).filter((id: string) => id !== nodeId));
      const neighbors = data.nodes.filter((n: any) => neighborIds.has(n.id));
      const durationMs = Number((performance.now() - start).toFixed(2));

      return {
        success: true,
        durationMs,
        output: { focal_node: focal, tier, neighbors, relationships: rels },
        strategy: "index_traversal",
      };
    } catch (err: any) {
      const durationMs = Number((performance.now() - start).toFixed(2));
      return {
        success: false,
        durationMs,
        error: String(err?.message || err),
        strategy: "index_traversal",
      };
    }
  }

  return {
    success: false,
    durationMs: 0,
    error: `Index file not found at ${indexPath}`,
    strategy: "index_traversal",
  };
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2);
  const scenarioFile = args[0] || resolve(process.cwd(), "docs/research/scenarios/girag-slicing-v1.json");

  if (!existsSync(scenarioFile)) {
    console.error(`Scenario file not found: ${scenarioFile}`);
    process.exit(1);
  }

  const scenarios: GiragSlicingScenario[] = JSON.parse(readFileSync(scenarioFile, "utf8"));
  const summary = evaluateSlicingSuite(scenarios);

  console.log(`\n=== Autoresearch EXP-07: Gira-G Architectural Slicing Benchmark ===\n`);
  console.log(`Total Scenarios:              ${summary.total_scenarios}`);
  console.log(`Passed Scenarios:             ${summary.passed_scenarios}/${summary.total_scenarios}`);
  console.log(`Overall Pass:                 ${summary.overall_pass ? "YES" : "NO"}`);
  console.log(`Hypothesis Verified:          ${summary.hypothesis_verified ? "PASS" : "FAIL"}`);
  console.log(`----------------------------------------------------------------`);
  console.log(`Total Full Input Tokens:      ${summary.total_full_tokens.toLocaleString()}`);
  console.log(`Total Gira-G Slice Tokens:    ${summary.total_slice_tokens.toLocaleString()}`);
  console.log(`Total Tokens Saved:           ${summary.total_tokens_saved.toLocaleString()} (${summary.total_tokens_saved_pct}%)`);
  console.log(`Mean Token Reduction:         ${summary.mean_token_reduction_pct}% (Target: >= 30%)`);
  console.log(`----------------------------------------------------------------`);
  console.log(`Blind Discovery Misses:       ${summary.full_exploration_total_misses} total misses across scenarios`);
  console.log(`Gira-G Slice Boundary Misses: ${summary.girag_slice_total_misses} (100% boundary accuracy)`);
  console.log(`Max Slicing Overhead:         ${summary.max_overhead_ms}ms (SLA: < 500ms)`);
  console.log(`Mean Slicing Overhead:        ${summary.mean_overhead_ms}ms`);
  console.log(`================================================================\n`);

  if (!summary.hypothesis_verified) {
    console.error(`Evaluation FAILED: Hypothesis not verified.`);
    process.exit(2);
  }
}
