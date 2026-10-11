#!/usr/bin/env bun
/**
 * Evaluates routing classifications against frozen scenario specifications (ADR 0002 §7 / Autoresearch EXP-01).
 * Supports grading predictions, checking safety guardrails (H2/H4 under-routing), and calculating agreement rates.
 */

import { readFileSync } from "node:fs";

export interface Scenario {
  id: string;
  description: string;
  expected_tier: "light" | "standard" | "heavy" | "investigation";
  deciding_signals: string;
  hard_guardrails: string[];
  brief_ref?: string;
}

export interface Prediction {
  id: string;
  predicted_tier: "light" | "standard" | "heavy" | "investigation";
  reasoning?: string;
}

export interface EvaluationResult {
  total: number;
  matches: number;
  accuracy: number;
  critical_misses: number;
  disagreements: Array<{
    id: string;
    description: string;
    expected: string;
    predicted: string;
    is_critical_miss: boolean;
    reasoning?: string;
  }>;
}

/**
 * Checks if a mismatch constitutes a critical miss / safety under-routing.
 * Under-routing occurs when an expected heavy scenario (especially H2 irreversible or H4 sensitive)
 * is misclassified as light or standard.
 */
export function isCriticalMiss(expected: string, predicted: string, hardGuardrails: string[]): boolean {
  if (expected === "heavy" && (predicted === "light" || predicted === "standard")) {
    // If it carries H2 or H4 or any hard guardrail, it's critical
    if (hardGuardrails.length > 0 || ["H2", "H4"].some(g => hardGuardrails.includes(g))) {
      return true;
    }
    return true;
  }
  return false;
}

export function evaluateRouting(scenarios: Scenario[], predictions: Prediction[]): EvaluationResult {
  const predMap = new Map(predictions.map(p => [p.id, p]));
  let matches = 0;
  let critical_misses = 0;
  const disagreements: EvaluationResult["disagreements"] = [];

  for (const scenario of scenarios) {
    const pred = predMap.get(scenario.id);
    if (!pred) {
      disagreements.push({
        id: scenario.id,
        description: scenario.description,
        expected: scenario.expected_tier,
        predicted: "missing",
        is_critical_miss: scenario.expected_tier === "heavy",
        reasoning: "No prediction provided"
      });
      if (scenario.expected_tier === "heavy") critical_misses++;
      continue;
    }

    if (pred.predicted_tier === scenario.expected_tier) {
      matches++;
    } else {
      const critical = isCriticalMiss(scenario.expected_tier, pred.predicted_tier, scenario.hard_guardrails);
      if (critical) critical_misses++;
      disagreements.push({
        id: scenario.id,
        description: scenario.description,
        expected: scenario.expected_tier,
        predicted: pred.predicted_tier,
        is_critical_miss: critical,
        reasoning: pred.reasoning
      });
    }
  }

  const total = scenarios.length;
  const accuracy = total > 0 ? (matches / total) * 100 : 0;

  return {
    total,
    matches,
    accuracy,
    critical_misses,
    disagreements
  };
}

// CLI runner if invoked directly
if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: bun tools/eval/evaluate_routing.ts <scenarios.json> <predictions.json>");
    process.exit(1);
  }

  const scenarios: Scenario[] = JSON.parse(readFileSync(args[0], "utf8"));
  const predictions: Prediction[] = JSON.parse(readFileSync(args[1], "utf8"));

  const res = evaluateRouting(scenarios, predictions);
  console.log(`\n=== G-Ingá Routing Evaluation Report ===`);
  console.log(`Total Scenarios: ${res.total}`);
  console.log(`Agreements:      ${res.matches}/${res.total} (${res.accuracy.toFixed(1)}%)`);
  console.log(`Critical Misses: ${res.critical_misses}`);

  if (res.disagreements.length > 0) {
    console.log(`\nDisagreements (${res.disagreements.length}):`);
    for (const d of res.disagreements) {
      const tag = d.is_critical_miss ? "[CRITICAL UNDER-ROUTE]" : "[MISMATCH]";
      console.log(`  ${tag} ${d.id}: expected ${d.expected}, got ${d.predicted} - "${d.description}"`);
    }
  } else {
    console.log(`\nAll scenarios routed in 100% agreement with expected labels.`);
  }

  if (res.critical_misses > 0) {
    console.error(`\nFAILED: Found ${res.critical_misses} critical safety under-routes.`);
    process.exit(2);
  }
}
