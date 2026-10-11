import { describe, expect, test } from "bun:test";
import { evaluateRouting, isCriticalMiss, type Scenario, type Prediction } from "./evaluate_routing";

const mockScenarios: Scenario[] = [
  {
    id: "R01",
    description: "Fix a typo in the README",
    expected_tier: "light",
    deciding_signals: "all light",
    hard_guardrails: []
  },
  {
    id: "R08",
    description: "Migration that drops a column",
    expected_tier: "heavy",
    deciding_signals: "H2",
    hard_guardrails: ["H2"]
  },
  {
    id: "R10",
    description: "Change auth token expiry",
    expected_tier: "heavy",
    deciding_signals: "H4",
    hard_guardrails: ["H4"]
  }
];

describe("evaluateRouting", () => {
  test("100% agreement returns 0 critical misses and 100% accuracy", () => {
    const predictions: Prediction[] = [
      { id: "R01", predicted_tier: "light" },
      { id: "R08", predicted_tier: "heavy" },
      { id: "R10", predicted_tier: "heavy" }
    ];
    const res = evaluateRouting(mockScenarios, predictions);
    expect(res.accuracy).toBe(100);
    expect(res.matches).toBe(3);
    expect(res.critical_misses).toBe(0);
    expect(res.disagreements.length).toBe(0);
  });

  test("flags critical miss when heavy/H2 or H4 is under-routed to light or standard", () => {
    const predictions: Prediction[] = [
      { id: "R01", predicted_tier: "light" },
      { id: "R08", predicted_tier: "standard" }, // under-route of H2
      { id: "R10", predicted_tier: "light" }     // under-route of H4
    ];
    const res = evaluateRouting(mockScenarios, predictions);
    expect(res.accuracy).toBeCloseTo(33.3, 1);
    expect(res.matches).toBe(1);
    expect(res.critical_misses).toBe(2);
    expect(res.disagreements.length).toBe(2);
    expect(res.disagreements[0].is_critical_miss).toBe(true);
    expect(res.disagreements[1].is_critical_miss).toBe(true);
  });

  test("over-routing is flagged as mismatch but not critical miss", () => {
    const predictions: Prediction[] = [
      { id: "R01", predicted_tier: "standard" }, // over-routing of light
      { id: "R08", predicted_tier: "heavy" },
      { id: "R10", predicted_tier: "heavy" }
    ];
    const res = evaluateRouting(mockScenarios, predictions);
    expect(res.critical_misses).toBe(0);
    expect(res.disagreements.length).toBe(1);
    expect(res.disagreements[0].is_critical_miss).toBe(false);
  });
});
