/**
 * tools/eval/judge_runner.test.ts
 *
 * Hermetic unit test suite for offline LLM-as-a-judge runner.
 * Verifies prompt synthesis, mocked model evaluation, scoring rubrics,
 * grounding checks, and composite quality calculations.
 */

import { describe, expect, it } from "bun:test";
import {
  buildJudgePrompt,
  computeCompositeQualityScore,
  computeOverallScore,
  evaluateOfflineDeterministic,
  runJudge,
  validateGrounding,
  type JudgeEvaluationOutput,
  type JudgeRubricScores,
} from "./judge_runner";

describe("judge_runner", () => {
  describe("Scoring calculations", () => {
    it("computes overall score as equal-weighted arithmetic mean of 4 dimensions", () => {
      const scores: JudgeRubricScores = {
        contract_adherence: { score: 1.0, reasoning: "Perfect" },
        token_economy: { score: 0.8, reasoning: "Good" },
        semantic_integrity: { score: 1.0, reasoning: "Pass" },
        vocabulary_discipline: { score: 0.6, reasoning: "Minor issue" },
      };
      // 0.25 * (1.0 + 0.8 + 1.0 + 0.6) = 0.25 * 3.4 = 0.85
      expect(computeOverallScore(scores)).toBe(0.85);
    });

    it("blends deterministic and judge scores into composite quality score (0.60 / 0.40)", () => {
      // 0.60 * 1.00 + 0.40 * 0.80 = 0.60 + 0.32 = 0.92
      expect(computeCompositeQualityScore(1.0, 0.8, "pass")).toBe(0.92);
      expect(computeCompositeQualityScore(0.5, 0.5, "pass")).toBe(0.5);
    });

    it("caps composite quality score at 0.00 if verdict is fail", () => {
      expect(computeCompositeQualityScore(1.0, 0.9, "fail")).toBe(0.0);
    });
  });

  describe("Prompt synthesis and sanitization", () => {
    it("generates structured prompt including rubric, instructions, and target content", () => {
      const target = "--- \nschema: task/1\nstatus: verified\n---";
      const prompt = buildJudgePrompt(target, "sample telemetry row");

      expect(prompt).toContain("You are the automated G-Ingá Quality and Architecture Judge.");
      expect(prompt).toContain("contract_adherence (Weight 0.25)");
      expect(prompt).toContain("vocabulary_discipline (Weight 0.25)");
      expect(prompt).toContain("schema: task/1");
      expect(prompt).toContain("sample telemetry row");
    });

    it("sanitizes sensitive tokens like home directory paths in target content", () => {
      const target = "File path: /home/shibuka/secrets.env with API key sk-ant-api03-1234567890abcdef1234567890abcdef";
      const prompt = buildJudgePrompt(target);

      expect(prompt).not.toContain("/home/shibuka");
      expect(prompt).toContain("~/secrets.env");
    });
  });

  describe("Grounding verification", () => {
    it("passes when all citations exist verbatim in target content", () => {
      const target = "This is a verified delivery complying with ADR 0006.";
      const output: JudgeEvaluationOutput = {
        evaluation_id: "eval-1",
        target_id: "t1",
        timestamp: "2026-10-16T12:00:00Z",
        overall_score: 0.9,
        rubric_scores: {
          contract_adherence: { score: 1.0, reasoning: "" },
          token_economy: { score: 1.0, reasoning: "" },
          semantic_integrity: { score: 0.8, reasoning: "" },
          vocabulary_discipline: { score: 0.8, reasoning: "" },
        },
        findings: [
          {
            dimension: "contract_adherence",
            severity: "info",
            citation: "ADR 0006",
            message: "Complies with ADR 0006.",
          },
        ],
        verdict: "pass",
      };

      const res = validateGrounding(output, target);
      expect(res.valid).toBe(true);
      expect(res.ungroundedCitations).toEqual([]);
    });

    it("flags ungrounded citations that do not exist in target content", () => {
      const target = "Clean code without issues.";
      const output: JudgeEvaluationOutput = {
        evaluation_id: "eval-2",
        target_id: "t2",
        timestamp: "2026-10-16T12:00:00Z",
        overall_score: 0.5,
        rubric_scores: {
          contract_adherence: { score: 0.5, reasoning: "" },
          token_economy: { score: 0.5, reasoning: "" },
          semantic_integrity: { score: 0.5, reasoning: "" },
          vocabulary_discipline: { score: 0.5, reasoning: "" },
        },
        findings: [
          {
            dimension: "vocabulary_discipline",
            severity: "critical",
            citation: "fabricated hallucinated phrase",
            message: "Claimed defect not present in text.",
          },
        ],
        verdict: "fail",
      };

      const res = validateGrounding(output, target);
      expect(res.valid).toBe(false);
      expect(res.ungroundedCitations).toContain("fabricated hallucinated phrase");
    });
  });

  describe("evaluateOfflineDeterministic", () => {
    it("penalizes forbidden vocabulary like 'success' or 'all green'", () => {
      const content = "Status: all green! All tests were a great success.";
      const res = evaluateOfflineDeterministic(content, "test-target");

      expect(res.rubric_scores.vocabulary_discipline.score).toBe(0.0);
      expect(res.verdict).toBe("fail");
      expect(res.findings.some((f) => f.dimension === "vocabulary_discipline")).toBe(true);
    });

    it("passes compliant content with standard vocabulary", () => {
      const content = `---
schema: task/1
status: verified
---
## Routing and approvals
- tier: standard
## Verification
| Ref | Check | Result |
| B1  | test  | pass   |
| V1  | test  | pass   |
`;
      const res = evaluateOfflineDeterministic(content, "test-task");
      expect(res.rubric_scores.vocabulary_discipline.score).toBe(1.0);
      expect(res.rubric_scores.contract_adherence.score).toBe(1.0);
      expect(res.verdict).toBe("pass");
    });
  });

  describe("runJudge CLI and runner pipeline", () => {
    it("executes in dry-run mode without external model invocation", async () => {
      const results = await runJudge({
        targets: ["README.md"],
        dryRun: true,
      });

      expect(results.length).toBe(1);
      expect(results[0].verdict).toBe("pass");
      expect(results[0].overall_score).toBe(1.0);
      expect(results[0].rubric_scores.contract_adherence.reasoning).toContain("Dry run");
    });

    it("executes with mocked model invoker hermetically", async () => {
      const mockInvoker = async (prompt: string, model: string): Promise<string> => {
        const mockOutput: JudgeEvaluationOutput = {
          evaluation_id: "mock-eval-123",
          target_id: "README.md",
          timestamp: "2026-10-16T12:00:00Z",
          overall_score: 0.95,
          rubric_scores: {
            contract_adherence: { score: 1.0, reasoning: "OK" },
            token_economy: { score: 1.0, reasoning: "OK" },
            semantic_integrity: { score: 0.9, reasoning: "OK" },
            vocabulary_discipline: { score: 0.9, reasoning: "OK" },
          },
          findings: [
            {
              dimension: "contract_adherence",
              severity: "info",
              citation: "G-Ingá",
              message: "Valid root project header.",
            },
          ],
          verdict: "pass",
        };
        return JSON.stringify(mockOutput);
      };

      const results = await runJudge({
        targets: ["README.md"],
        model: "mock-model",
        modelInvoker: mockInvoker,
      });

      expect(results.length).toBe(1);
      expect(results[0].evaluation_id).toBe("mock-eval-123");
      expect(results[0].overall_score).toBe(0.95);
      expect(results[0].verdict).toBe("pass");
    });
  });
});
