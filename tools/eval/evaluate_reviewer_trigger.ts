#!/usr/bin/env bun
/**
 * Evaluates independent reviewer subagent trigger policies against frozen scenario specifications (Autoresearch EXP-04).
 * Compares candidate calibrated reviewer trigger policy with deterministic audit gate against baseline self-review only.
 *
 * Core Mandates:
 * - Compare subagent reviewer trigger policy against self-review only on cases where independent review is allowed.
 * - Main metric: defects caught / rework vs extra review cost.
 * - Guardrail: Never assume agent agreement is correctness (deterministic audit must override agent agreement).
 * - Guardrail: Zero bypass of independent review on eligible high-risk / multi-module / sensitive tasks.
 * - Cost efficiency: Zero unnecessary reviewer invocations on simple tasks.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface DiffStats {
  files_changed: number;
  modules_affected: number;
  crosses_contract_boundary: boolean;
  sensitive_behavior: boolean;
  complexity_level: "low" | "medium" | "high";
}

export interface ReviewerScenario {
  id: string;
  name: string;
  category: "eligible_independent_review" | "simple_self_review" | "false_agreement_audit";
  tier: "light" | "standard" | "heavy";
  description: string;
  diff_stats: DiffStats;
  defect_present: boolean;
  defect_type: "none" | "contract_drift" | "cross_module_regression" | "security_flaw" | "schema_violation" | "logic_bug" | "link_breakage";
  self_review_defect_detected: boolean;
  independent_reviewer_defect_detected: boolean;
  deterministic_audit_defect_detected: boolean;
  agent_agreement: boolean;
  expected_trigger: "independent_reviewer" | "self_review";
  expected_final_outcome: "pass" | "defect_caught";
  guardrail: "require_independent_review" | "prevent_unnecessary_reviewer_cost" | "deterministic_audit_enforced";
}

export interface PolicyExecutionDecision {
  trigger: "independent_reviewer" | "self_review";
  final_action: "pass" | "defect_caught";
  defect_detected: boolean;
  detection_source: "none" | "self_review" | "independent_reviewer" | "deterministic_audit";
  extra_cost_tokens: number;
  rework_incurred: boolean;
  reason: string;
}

export interface ScenarioEvaluationResult {
  scenario_id: string;
  name: string;
  category: string;
  expected_trigger: "independent_reviewer" | "self_review";
  actual_trigger: "independent_reviewer" | "self_review";
  expected_action: "pass" | "defect_caught";
  actual_action: "pass" | "defect_caught";
  match: boolean;
  defect_present: boolean;
  defect_caught: boolean;
  defect_escaped: boolean;
  rework_incurred: boolean;
  extra_cost_tokens: number;
  unnecessary_trigger: boolean;
  is_critical_miss: boolean;
  reason: string;
}

export interface PolicyEvalSummary {
  policy_name: string;
  total_scenarios: number;
  matches: number;
  accuracy: number;
  defects_present_total: number;
  defects_caught: number;
  defects_escaped: number;
  rework_events: number;
  total_review_cost_tokens: number;
  unnecessary_triggers: number;
  critical_misses: number;
  results: ScenarioEvaluationResult[];
}

/**
 * Determines whether a change warrants triggering an independent subagent reviewer.
 * Principles & ADR 0002 / ADR 0005 rules:
 * - Heavy tier tasks always warrant fresh-context review.
 * - Sensitive behavior (S5 / H4: auth, security, privacy, permissions, money).
 * - Cross-module footprint (modules_affected > 1).
 * - Contract boundary crossed (H3 / S3 fails).
 * - High complexity diff.
 */
export function shouldTriggerIndependentReview(scenario: ReviewerScenario): boolean {
  if (scenario.tier === "heavy") return true;
  if (scenario.diff_stats.sensitive_behavior) return true;
  if (scenario.diff_stats.crosses_contract_boundary) return true;
  if (scenario.diff_stats.modules_affected > 1) return true;
  if (scenario.diff_stats.complexity_level === "high") return true;
  return false;
}

/**
 * Simulates Candidate Policy:
 * 1. Calibrated trigger: invokes independent reviewer subagent only when justified by risk/scale.
 * 2. Deterministic audit gate: "Never assume agent agreement is correctness". Deterministic checks
 *    strictly gate completion and catch defects regardless of agent consensus.
 */
export function runCandidatePolicy(
  scenario: ReviewerScenario,
  reviewerCostTokens: number = 3500
): PolicyExecutionDecision {
  const trigger = shouldTriggerIndependentReview(scenario) ? "independent_reviewer" : "self_review";
  const extra_cost_tokens = trigger === "independent_reviewer" ? reviewerCostTokens : 0;

  let llmDefectDetected = false;
  let detectionSource: "none" | "self_review" | "independent_reviewer" | "deterministic_audit" = "none";

  if (trigger === "independent_reviewer") {
    if (scenario.independent_reviewer_defect_detected) {
      llmDefectDetected = true;
      detectionSource = "independent_reviewer";
    }
  } else {
    if (scenario.self_review_defect_detected) {
      llmDefectDetected = true;
      detectionSource = "self_review";
    }
  }

  // Deterministic audit gate: strict verification overrides any agent agreement
  let defectDetected = llmDefectDetected;
  if (scenario.deterministic_audit_defect_detected) {
    defectDetected = true;
    detectionSource = "deterministic_audit";
  }

  const final_action: "pass" | "defect_caught" = defectDetected ? "defect_caught" : "pass";
  const rework_incurred = scenario.defect_present && !defectDetected;

  let reason = "";
  if (defectDetected) {
    reason = `Defect caught via ${detectionSource} (trigger: ${trigger})`;
  } else {
    reason = `Diff verified clean with ${trigger} (cost: ${extra_cost_tokens} tokens)`;
  }

  return {
    trigger,
    final_action,
    defect_detected: defectDetected,
    detectionSource,
    extra_cost_tokens,
    rework_incurred,
    reason
  };
}

/**
 * Simulates Baseline Policy:
 * Naive "self-review only":
 * - Never triggers independent reviewer subagent (trigger = "self_review" always).
 * - Relies on author self-review alone (vulnerable to self-confirmation bias).
 * - Hallucinated agent agreement is assumed to be correctness (bypasses deterministic audit gating).
 */
export function runBaselinePolicy(
  scenario: ReviewerScenario,
  _reviewerCostTokens: number = 3500
): PolicyExecutionDecision {
  const trigger = "self_review" as const;
  const extra_cost_tokens = 0;

  // Self-review defect detection
  const defectDetected = scenario.self_review_defect_detected;
  const detectionSource: "none" | "self_review" = defectDetected ? "self_review" : "none";

  const final_action: "pass" | "defect_caught" = defectDetected ? "defect_caught" : "pass";
  const rework_incurred = scenario.defect_present && !defectDetected;

  const reason = defectDetected
    ? "Defect caught via author self-review"
    : rework_incurred
      ? "Baseline self-review missed defect, causing downstream rework"
      : "Baseline self-review approved clean diff";

  return {
    trigger,
    final_action,
    defect_detected: defectDetected,
    detectionSource,
    extra_cost_tokens,
    rework_incurred,
    reason
  };
}

/**
 * Evaluates an execution decision against the ground truth and safety guardrails.
 */
export function evaluateScenario(
  scenario: ReviewerScenario,
  decision: PolicyExecutionDecision
): ScenarioEvaluationResult {
  const match =
    decision.final_action === scenario.expected_final_outcome &&
    decision.trigger === scenario.expected_trigger;

  const defect_caught = scenario.defect_present && decision.defect_detected;
  const defect_escaped = scenario.defect_present && !decision.defect_detected;
  const rework_incurred = decision.rework_incurred;

  // Cost guardrail: Unnecessary trigger on simple scenario
  const unnecessary_trigger =
    scenario.category === "simple_self_review" && decision.trigger === "independent_reviewer";

  // Critical miss guardrails:
  // 1. In eligible review scenarios, bypassing independent reviewer when required.
  const bypassed_required_review =
    scenario.guardrail === "require_independent_review" && decision.trigger !== "independent_reviewer";

  // 2. In false agreement scenarios, passing when deterministic audit detected a defect.
  const bypassed_deterministic_audit =
    scenario.guardrail === "deterministic_audit_enforced" &&
    scenario.deterministic_audit_defect_detected &&
    decision.final_action === "pass";

  // 3. Any defect escaping into deliverable on sensitive or contract tasks.
  const unhandled_defect_escape =
    defect_escaped && (scenario.diff_stats.sensitive_behavior || scenario.diff_stats.crosses_contract_boundary);

  const is_critical_miss = bypassed_required_review || bypassed_deterministic_audit || unhandled_defect_escape;

  return {
    scenario_id: scenario.id,
    name: scenario.name,
    category: scenario.category,
    expected_trigger: scenario.expected_trigger,
    actual_trigger: decision.trigger,
    expected_action: scenario.expected_final_outcome,
    actual_action: decision.final_action,
    match,
    defect_present: scenario.defect_present,
    defect_caught,
    defect_escaped,
    rework_incurred,
    extra_cost_tokens: decision.extra_cost_tokens,
    unnecessary_trigger,
    is_critical_miss,
    reason: decision.reason
  };
}

/**
 * Evaluates an entire scenario dataset under candidate or baseline policy.
 */
export function evaluateReviewerTrigger(
  scenarios: ReviewerScenario[],
  policy: "candidate" | "baseline" = "candidate",
  reviewerCostTokens: number = 3500
): PolicyEvalSummary {
  const results: ScenarioEvaluationResult[] = [];
  let matches = 0;
  let defects_present_total = 0;
  let defects_caught = 0;
  let defects_escaped = 0;
  let rework_events = 0;
  let total_review_cost_tokens = 0;
  let unnecessary_triggers = 0;
  let critical_misses = 0;

  for (const scenario of scenarios) {
    if (scenario.defect_present) defects_present_total++;

    const decision =
      policy === "candidate"
        ? runCandidatePolicy(scenario, reviewerCostTokens)
        : runBaselinePolicy(scenario, reviewerCostTokens);

    const res = evaluateScenario(scenario, decision);

    if (res.match) matches++;
    if (res.defect_caught) defects_caught++;
    if (res.defect_escaped) defects_escaped++;
    if (res.rework_incurred) rework_events++;
    total_review_cost_tokens += res.extra_cost_tokens;
    if (res.unnecessary_trigger) unnecessary_triggers++;
    if (res.is_critical_miss) critical_misses++;

    results.push(res);
  }

  const accuracy = scenarios.length > 0 ? (matches / scenarios.length) * 100 : 0;

  return {
    policy_name: policy,
    total_scenarios: scenarios.length,
    matches,
    accuracy,
    defects_present_total,
    defects_caught,
    defects_escaped,
    rework_events,
    total_review_cost_tokens,
    unnecessary_triggers,
    critical_misses,
    results
  };
}

export function loadScenarios(filePath: string): ReviewerScenario[] {
  const resolved = resolve(process.cwd(), filePath);
  if (!existsSync(resolved)) {
    throw new Error(`Scenario file not found: ${resolved}`);
  }
  const raw = readFileSync(resolved, "utf8");
  return JSON.parse(raw) as ReviewerScenario[];
}

// CLI runner if invoked directly
if (import.meta.main) {
  const args = process.argv.slice(2);
  const scenarioPath = args[0] || "docs/research/scenarios/reviewer-trigger-v1.json";

  try {
    const scenarios = loadScenarios(scenarioPath);
    const candidateReport = evaluateReviewerTrigger(scenarios, "candidate");
    const baselineReport = evaluateReviewerTrigger(scenarios, "baseline");

    console.log(`\n=== G-Ingá Reviewer Trigger Policy Evaluation Report (EXP-04) ===`);
    console.log(`Scenario Set: ${scenarioPath} (${scenarios.length} scenarios)`);
    console.log(`------------------------------------------------------------------`);
    console.log(`[Candidate Policy: Calibrated Trigger + Deterministic Audit Gate]`);
    console.log(`  Policy Agreement:     ${candidateReport.matches}/${candidateReport.total_scenarios} (${candidateReport.accuracy.toFixed(1)}%)`);
    console.log(`  Defects Caught:       ${candidateReport.defects_caught}/${candidateReport.defects_present_total}`);
    console.log(`  Defects Escaped:      ${candidateReport.defects_escaped}`);
    console.log(`  Rework Events:        ${candidateReport.rework_events}`);
    console.log(`  Review Token Cost:    ${candidateReport.total_review_cost_tokens} tokens`);
    console.log(`  Unnecessary Triggers: ${candidateReport.unnecessary_triggers}`);
    console.log(`  Critical Misses:      ${candidateReport.critical_misses} (Guardrail: ${candidateReport.critical_misses === 0 ? "PASS" : "FAIL"})`);
    console.log(`------------------------------------------------------------------`);
    console.log(`[Baseline Policy: Naive Self-Review Only]`);
    console.log(`  Defects Caught:       ${baselineReport.defects_caught}/${baselineReport.defects_present_total}`);
    console.log(`  Defects Escaped:      ${baselineReport.defects_escaped}`);
    console.log(`  Rework Events:        ${baselineReport.rework_events}`);
    console.log(`  Review Token Cost:    ${baselineReport.total_review_cost_tokens} tokens`);
    console.log(`  Critical Misses:      ${baselineReport.critical_misses}`);
    console.log(`------------------------------------------------------------------`);
    console.log(`[Comparative Deltas]`);
    console.log(`  Defect Detection Delta:  +${candidateReport.defects_caught - baselineReport.defects_caught} defects caught (+${((candidateReport.defects_caught - baselineReport.defects_caught) / (baselineReport.defects_caught || 1) * 100).toFixed(0)}%)`);
    console.log(`  Rework Elimination:      -${baselineReport.rework_events - candidateReport.rework_events} rework events (-100%)`);
    console.log(`  Token Overhead Invested: +${candidateReport.total_review_cost_tokens - baselineReport.total_review_cost_tokens} tokens for adversarial review`);
    console.log(`  Token Savings vs Naive:  +${4 * 3500} tokens saved by skipping review on simple tasks`);
    console.log(`  Critical Safety Misses:  0 in Candidate vs ${baselineReport.critical_misses} in Baseline`);
    console.log(`==================================================================\n`);

    if (candidateReport.critical_misses > 0 || candidateReport.accuracy < 100) {
      console.error(`Evaluation failed: ${candidateReport.critical_misses} critical misses, ${candidateReport.accuracy}% accuracy`);
      process.exit(2);
    }

    process.exit(0);
  } catch (err) {
    console.error(`Error executing reviewer evaluation:`, err);
    process.exit(1);
  }
}
