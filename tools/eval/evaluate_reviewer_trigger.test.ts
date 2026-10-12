import { describe, expect, test } from "bun:test";
import {
  evaluateReviewerTrigger,
  evaluateScenario,
  loadScenarios,
  runBaselinePolicy,
  runCandidatePolicy,
  shouldTriggerIndependentReview,
  type ReviewerScenario
} from "./evaluate_reviewer_trigger";

const mockEligibleScenario: ReviewerScenario = {
  id: "MOCK-ELIGIBLE-01",
  name: "Cross Module Contract Change",
  category: "eligible_independent_review",
  tier: "heavy",
  description: "Crosses subsystem boundary with contract drift",
  diff_stats: {
    files_changed: 4,
    modules_affected: 2,
    crosses_contract_boundary: true,
    sensitive_behavior: false,
    complexity_level: "high"
  },
  defect_present: true,
  defect_type: "contract_drift",
  self_review_defect_detected: false,
  independent_reviewer_defect_detected: true,
  deterministic_audit_defect_detected: false,
  agent_agreement: false,
  expected_trigger: "independent_reviewer",
  expected_final_outcome: "defect_caught",
  guardrail: "require_independent_review"
};

const mockSimpleScenario: ReviewerScenario = {
  id: "MOCK-SIMPLE-01",
  name: "Isolated Helper Comment Typo",
  category: "simple_self_review",
  tier: "light",
  description: "Fixes typos in comments without behavior changes",
  diff_stats: {
    files_changed: 1,
    modules_affected: 1,
    crosses_contract_boundary: false,
    sensitive_behavior: false,
    complexity_level: "low"
  },
  defect_present: false,
  defect_type: "none",
  self_review_defect_detected: false,
  independent_reviewer_defect_detected: false,
  deterministic_audit_defect_detected: false,
  agent_agreement: true,
  expected_trigger: "self_review",
  expected_final_outcome: "pass",
  guardrail: "prevent_unnecessary_reviewer_cost"
};

const mockFalseAgreementScenario: ReviewerScenario = {
  id: "MOCK-FALSE-AGREE-01",
  name: "Subtle Schema Drift with LLM Hallucination",
  category: "false_agreement_audit",
  tier: "standard",
  description: "Both agents hallucinate agreement, but schema validator detects mismatch",
  diff_stats: {
    files_changed: 2,
    modules_affected: 2,
    crosses_contract_boundary: true,
    sensitive_behavior: false,
    complexity_level: "medium"
  },
  defect_present: true,
  defect_type: "schema_violation",
  self_review_defect_detected: false,
  independent_reviewer_defect_detected: false,
  deterministic_audit_defect_detected: true,
  agent_agreement: true,
  expected_trigger: "independent_reviewer",
  expected_final_outcome: "defect_caught",
  guardrail: "deterministic_audit_enforced"
};

describe("Reviewer Trigger Policy Evaluator (Autoresearch EXP-04)", () => {
  describe("shouldTriggerIndependentReview trigger logic", () => {
    test("triggers on heavy tier task", () => {
      const scenario: ReviewerScenario = {
        ...mockSimpleScenario,
        tier: "heavy"
      };
      expect(shouldTriggerIndependentReview(scenario)).toBe(true);
    });

    test("triggers on sensitive behavior", () => {
      const scenario: ReviewerScenario = {
        ...mockSimpleScenario,
        diff_stats: { ...mockSimpleScenario.diff_stats, sensitive_behavior: true }
      };
      expect(shouldTriggerIndependentReview(scenario)).toBe(true);
    });

    test("triggers on contract boundary crossing", () => {
      const scenario: ReviewerScenario = {
        ...mockSimpleScenario,
        diff_stats: { ...mockSimpleScenario.diff_stats, crosses_contract_boundary: true }
      };
      expect(shouldTriggerIndependentReview(scenario)).toBe(true);
    });

    test("triggers on multi-module diff", () => {
      const scenario: ReviewerScenario = {
        ...mockSimpleScenario,
        diff_stats: { ...mockSimpleScenario.diff_stats, modules_affected: 3 }
      };
      expect(shouldTriggerIndependentReview(scenario)).toBe(true);
    });

    test("triggers on high complexity diff", () => {
      const scenario: ReviewerScenario = {
        ...mockSimpleScenario,
        diff_stats: { ...mockSimpleScenario.diff_stats, complexity_level: "high" }
      };
      expect(shouldTriggerIndependentReview(scenario)).toBe(true);
    });

    test("does not trigger on simple, single-module, non-sensitive, low-complexity change", () => {
      expect(shouldTriggerIndependentReview(mockSimpleScenario)).toBe(false);
    });
  });

  describe("Candidate Policy Execution", () => {
    test("triggers independent review and catches defect on eligible task", () => {
      const decision = runCandidatePolicy(mockEligibleScenario, 3500);
      expect(decision.trigger).toBe("independent_reviewer");
      expect(decision.final_action).toBe("defect_caught");
      expect(decision.defect_detected).toBe(true);
      expect(decision.extra_cost_tokens).toBe(3500);
      expect(decision.rework_incurred).toBe(false);

      const evalResult = evaluateScenario(mockEligibleScenario, decision);
      expect(evalResult.match).toBe(true);
      expect(evalResult.defect_caught).toBe(true);
      expect(evalResult.is_critical_miss).toBe(false);
    });

    test("retains self-review and avoids cost on simple task", () => {
      const decision = runCandidatePolicy(mockSimpleScenario, 3500);
      expect(decision.trigger).toBe("self_review");
      expect(decision.final_action).toBe("pass");
      expect(decision.extra_cost_tokens).toBe(0);
      expect(decision.rework_incurred).toBe(false);

      const evalResult = evaluateScenario(mockSimpleScenario, decision);
      expect(evalResult.match).toBe(true);
      expect(evalResult.unnecessary_trigger).toBe(false);
      expect(evalResult.is_critical_miss).toBe(false);
    });

    test("deterministic audit strictly overrides false agent agreement", () => {
      const decision = runCandidatePolicy(mockFalseAgreementScenario, 3500);
      expect(decision.final_action).toBe("defect_caught");
      expect(decision.detectionSource).toBe("deterministic_audit");
      expect(decision.rework_incurred).toBe(false);

      const evalResult = evaluateScenario(mockFalseAgreementScenario, decision);
      expect(evalResult.match).toBe(true);
      expect(evalResult.defect_caught).toBe(true);
      expect(evalResult.is_critical_miss).toBe(false);
    });
  });

  describe("Baseline Policy Failure Modes", () => {
    test("baseline self-review misses eligible defects and incurs rework", () => {
      const decision = runBaselinePolicy(mockEligibleScenario);
      expect(decision.trigger).toBe("self_review");
      expect(decision.final_action).toBe("pass");
      expect(decision.rework_incurred).toBe(true);

      const evalResult = evaluateScenario(mockEligibleScenario, decision);
      expect(evalResult.match).toBe(false);
      expect(evalResult.defect_escaped).toBe(true);
      expect(evalResult.is_critical_miss).toBe(true);
    });

    test("baseline falsely passes on hallucinated agreement, violating audit guardrail", () => {
      const decision = runBaselinePolicy(mockFalseAgreementScenario);
      expect(decision.final_action).toBe("pass");
      expect(decision.rework_incurred).toBe(true);

      const evalResult = evaluateScenario(mockFalseAgreementScenario, decision);
      expect(evalResult.match).toBe(false);
      expect(evalResult.is_critical_miss).toBe(true);
    });
  });

  describe("Dataset Evaluation (reviewer-trigger-v1.json)", () => {
    test("loads scenario dataset successfully", () => {
      const scenarios = loadScenarios("docs/research/scenarios/reviewer-trigger-v1.json");
      expect(scenarios.length).toBeGreaterThanOrEqual(12);

      const categories = new Set(scenarios.map((s) => s.category));
      expect(categories.has("eligible_independent_review")).toBe(true);
      expect(categories.has("simple_self_review")).toBe(true);
      expect(categories.has("false_agreement_audit")).toBe(true);
    });

    test("candidate policy achieves 100% agreement, 0 critical misses, and 0 escaped defects", () => {
      const scenarios = loadScenarios("docs/research/scenarios/reviewer-trigger-v1.json");
      const summary = evaluateReviewerTrigger(scenarios, "candidate");

      expect(summary.accuracy).toBe(100);
      expect(summary.critical_misses).toBe(0);
      expect(summary.defects_escaped).toBe(0);
      expect(summary.rework_events).toBe(0);
      expect(summary.unnecessary_triggers).toBe(0);
      expect(summary.defects_caught).toBe(summary.defects_present_total);
    });

    test("comparison demonstrates candidate superiority over baseline", () => {
      const scenarios = loadScenarios("docs/research/scenarios/reviewer-trigger-v1.json");
      const candidate = evaluateReviewerTrigger(scenarios, "candidate");
      const baseline = evaluateReviewerTrigger(scenarios, "baseline");

      // Candidate catches all defects; baseline catches 0
      expect(candidate.defects_caught).toBeGreaterThan(baseline.defects_caught);
      expect(candidate.rework_events).toBe(0);
      expect(baseline.rework_events).toBeGreaterThan(0);

      // Baseline incurs critical misses due to review bypass & unverified false agreement
      expect(candidate.critical_misses).toBe(0);
      expect(baseline.critical_misses).toBeGreaterThan(0);

      // Candidate avoids unnecessary triggers on all simple scenarios
      expect(candidate.unnecessary_triggers).toBe(0);
    });
  });
});
