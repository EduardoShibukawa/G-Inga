import { describe, expect, test } from "bun:test";
import {
  evaluateCircuitBreaker,
  evaluateScenario,
  loadScenarios,
  runBaselinePolicy,
  runCandidatePolicy,
  type CircuitBreakerScenario
} from "./evaluate_circuit_breaker";

const mockTransientScenario: CircuitBreakerScenario = {
  id: "MOCK-01",
  name: "Transient Test Flake",
  category: "transient_failure",
  description: "Fails once then passes on retry",
  expected_action: "resolve",
  useful_progress_demonstrated: false,
  guardrail: "allow_transient_retry",
  history: [
    {
      attempt: 1,
      command: "bun test",
      status: "fail",
      error_fingerprint: "SOCKET_TIMEOUT",
      error_message: "Network socket timed out",
      has_new_info: true,
      useful_progress: false
    },
    {
      attempt: 2,
      command: "bun test",
      status: "pass",
      error_fingerprint: null,
      error_message: null,
      has_new_info: true,
      useful_progress: true
    }
  ]
};

const mockStagnantScenario: CircuitBreakerScenario = {
  id: "MOCK-02",
  name: "Stagnant Syntax Error",
  category: "stagnant_failure",
  description: "Fails identically twice without new information",
  expected_action: "replan",
  useful_progress_demonstrated: false,
  guardrail: "trip_circuit_breaker",
  history: [
    {
      attempt: 1,
      command: "bun run build",
      status: "fail",
      error_fingerprint: "SYNTAX_ERR",
      error_message: "Unexpected token at 1:1",
      has_new_info: true,
      useful_progress: false
    },
    {
      attempt: 2,
      command: "bun run build",
      status: "fail",
      error_fingerprint: "SYNTAX_ERR",
      error_message: "Unexpected token at 1:1",
      has_new_info: false,
      useful_progress: false
    }
  ]
};

const mockProgressiveScenario: CircuitBreakerScenario = {
  id: "MOCK-03",
  name: "Progressive Compilation Fixes",
  category: "progressive_failure",
  description: "Fails twice but each attempt yields new diagnostics and progress",
  expected_action: "proceed",
  useful_progress_demonstrated: true,
  guardrail: "no_premature_stop",
  history: [
    {
      attempt: 1,
      command: "tsc",
      status: "fail",
      error_fingerprint: "TS_3_ERRS",
      error_message: "3 errors found",
      has_new_info: true,
      useful_progress: false
    },
    {
      attempt: 2,
      command: "tsc",
      status: "fail",
      error_fingerprint: "TS_1_ERR",
      error_message: "1 error found",
      has_new_info: true,
      useful_progress: true
    }
  ]
};

describe("Candidate Circuit-Breaker Policy", () => {
  test("resolves transient failure on second attempt without premature trip", () => {
    const decision = runCandidatePolicy(mockTransientScenario);
    expect(decision.final_action).toBe("resolve");
    expect(decision.tripped_circuit_breaker).toBe(false);
    expect(decision.stopped_at_attempt).toBe(2);
    expect(decision.unproductive_retries).toBe(0);
  });

  test("trips circuit breaker on second consecutive failure without new info", () => {
    const decision = runCandidatePolicy(mockStagnantScenario);
    expect(decision.final_action).toBe("replan");
    expect(decision.tripped_circuit_breaker).toBe(true);
    expect(decision.stopped_at_attempt).toBe(2);
    expect(decision.unproductive_retries).toBe(0);
  });

  test("permits proceeding when attempts demonstrate new diagnostic information", () => {
    const decision = runCandidatePolicy(mockProgressiveScenario);
    expect(decision.final_action).toBe("proceed");
    expect(decision.tripped_circuit_breaker).toBe(false);
    expect(decision.unproductive_retries).toBe(0);
  });
});

describe("Guardrail and Premature Stop Detection", () => {
  test("flags critical miss when policy stops prematurely despite useful progress demonstrated", () => {
    // Artificial premature stop: policy returned replan on progressive scenario
    const artificialFlawedDecision = {
      final_action: "replan" as const,
      stopped_at_attempt: 2,
      tripped_circuit_breaker: true,
      unproductive_retries: 0,
      reason: "Premature abort"
    };

    const res = evaluateScenario(mockProgressiveScenario, artificialFlawedDecision);
    expect(res.match).toBe(false);
    expect(res.premature_stop).toBe(true);
    expect(res.is_critical_miss).toBe(true);
  });

  test("does not flag premature stop when useful progress was false or action is proceed", () => {
    const validCandidateDecision = runCandidatePolicy(mockProgressiveScenario);
    const res = evaluateScenario(mockProgressiveScenario, validCandidateDecision);
    expect(res.premature_stop).toBe(false);
    expect(res.is_critical_miss).toBe(false);
    expect(res.match).toBe(true);
  });
});

describe("Baseline vs Candidate Policy Comparison", () => {
  test("baseline policy executes unproductive retries on stagnant failure", () => {
    const baselineDecision = runBaselinePolicy(mockStagnantScenario, 3);
    expect(baselineDecision.unproductive_retries).toBeGreaterThan(0);
  });

  test("candidate policy eliminates unproductive retries compared to baseline", () => {
    const candidateDecision = runCandidatePolicy(mockStagnantScenario);
    const baselineDecision = runBaselinePolicy(mockStagnantScenario, 3);
    expect(candidateDecision.unproductive_retries).toBe(0);
    expect(baselineDecision.unproductive_retries).toBeGreaterThan(0);
  });
});

describe("Frozen Scenario Set Evaluation (circuit-breaker-v1.json)", () => {
  const scenarios = loadScenarios("docs/research/scenarios/circuit-breaker-v1.json");

  test("dataset contains 12 scenarios covering transient, stagnant, and progressive recovery", () => {
    expect(scenarios.length).toBe(12);
    const categories = new Set(scenarios.map((s) => s.category));
    expect(categories.has("transient_failure")).toBe(true);
    expect(categories.has("stagnant_failure")).toBe(true);
    expect(categories.has("progressive_failure")).toBe(true);
  });

  test("candidate policy achieves 100% agreement and 0 critical misses", () => {
    const summary = evaluateCircuitBreaker(scenarios, "candidate");
    expect(summary.total_scenarios).toBe(12);
    expect(summary.matches).toBe(12);
    expect(summary.accuracy).toBe(100);
    expect(summary.critical_misses).toBe(0);
    expect(summary.premature_stops).toBe(0);
    expect(summary.unproductive_retries).toBe(0);
    expect(summary.verified_successes).toBe(3);
    expect(summary.circuit_breaker_trips).toBe(5);
  });

  test("baseline policy accumulates unproductive retries on the frozen dataset", () => {
    const baselineSummary = evaluateCircuitBreaker(scenarios, "baseline");
    expect(baselineSummary.unproductive_retries).toBe(5);
  });

  test("loadScenarios throws on missing file", () => {
    expect(() => loadScenarios("docs/research/scenarios/non-existent.json")).toThrow();
  });
});
