import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  classifyFile,
  classifyResult,
  classifyRun,
  combine,
  exitCodeFor,
  keptWorkspace,
  parseEnvBlocked,
  type PluginEvalResult,
  type RunResult,
} from "./classify_plugin_eval";

const ok: RunResult = { score: 1, passed: true, costUsd: 0.01, judgeCostUsd: 0.001, error: null, graders: [] };
const failed: RunResult = { score: 0.5, passed: false, costUsd: 0.01, judgeCostUsd: 0, error: null, graders: [] };
const erroredButPassed: RunResult = { ...ok, error: "exit 1: Reached maximum number of turns (4)" };

describe("classifyRun", () => {
  test("a run with an error is blocked even when the CLI marked it passed", () => {
    const v = classifyRun(erroredButPassed, "drive-should-fire", false);
    expect(v.verdict).toBe("blocked");
    expect(v.reason).toContain("maximum number of turns");
  });

  test("complete runs map to pass and fail", () => {
    expect(classifyRun(ok, "x", false).verdict).toBe("pass");
    expect(classifyRun(failed, "x", false).verdict).toBe("fail");
  });

  test("a run without a score is blocked", () => {
    expect(classifyRun({ error: null }, "x", false).verdict).toBe("blocked");
  });

  test("a partial suite never yields pass", () => {
    expect(classifyRun(ok, "x", true).verdict).toBe("blocked");
  });

  test("an environment-blocked grader turns a failed run into blocked, only for its case", () => {
    const run: RunResult = { ...failed, graders: [{ name: "det-validator", passed: false }] };
    const env = [parseEnvBlocked("work-standard:det-validator")];
    expect(classifyRun(run, "work-standard", false, env).verdict).toBe("blocked");
    expect(classifyRun(run, "other-case", false, env).verdict).toBe("fail");
  });
});

describe("combine", () => {
  test("no runs is not run; fail dominates; blocked beats pass", () => {
    expect(combine([])).toBe("not run");
    expect(combine(["pass", "blocked", "fail"])).toBe("fail");
    expect(combine(["pass", "blocked"])).toBe("blocked");
    expect(combine(["pass", "not run"])).toBe("blocked");
    expect(combine(["pass", "pass"])).toBe("pass");
  });
});

describe("classifyResult", () => {
  const result: PluginEvalResult = {
    costUsd: 0.05,
    partial: false,
    cases: [
      { name: "drive-should-fire", arms: { with: [erroredButPassed], without: [ok] } },
      { name: "drive-near-miss", arms: { with: [failed], without: [failed] } },
      { name: "work-should-fire", arms: { with: [ok], without: [ok] } },
      { name: "work-missing-arm", arms: {} },
    ],
  };

  test("case verdict follows the with arm and counts per skill", () => {
    const c = classifyResult(result);
    const byName = Object.fromEntries(c.cases.map((k) => [k.name, k]));
    expect(byName["drive-should-fire"]!.verdict).toBe("blocked");
    expect(byName["drive-should-fire"]!.arms.find((a) => a.arm === "without")!.verdict).toBe("pass");
    expect(byName["drive-near-miss"]!.verdict).toBe("fail");
    expect(byName["work-missing-arm"]!.verdict).toBe("not run");
    expect(c.bySkill.drive).toEqual({ pass: 0, fail: 1, blocked: 1, "not run": 0 });
    expect(c.bySkill.work).toEqual({ pass: 1, fail: 0, blocked: 0, "not run": 1 });
    expect(c.verdict).toBe("fail");
    expect(c.agentCostUsd).toBe(0.05);
    expect(c.judgeCostUsd).toBeCloseTo(0.004, 6);
  });

  test("a partial suite reports blocked, never pass", () => {
    const c = classifyResult({ partial: true, partialReason: "auth_failed", cases: [{ name: "work-a", arms: { with: [ok] } }] });
    expect(c.verdict).toBe("blocked");
    expect(c.reason).toContain("auth_failed");
  });

  test("an all-pass suite is pass with exit 0", () => {
    const c = classifyResult({ cases: [{ name: "work-a", arms: { with: [ok] } }] });
    expect(c.verdict).toBe("pass");
    expect(exitCodeFor(c.verdict)).toBe(0);
    expect(exitCodeFor("fail")).toBe(1);
    expect(exitCodeFor("blocked")).toBe(2);
    expect(exitCodeFor("not run")).toBe(2);
  });
});

describe("files and workspaces", () => {
  const dir = mkdtempSync(join(tmpdir(), "classify-plugin-eval-"));

  test("a missing or malformed result file is not run", () => {
    expect(classifyFile(join(dir, "absent.json")).verdict).toBe("not run");
    const bad = join(dir, "bad.json");
    writeFileSync(bad, "{not json");
    expect(classifyFile(bad).verdict).toBe("not run");
  });

  test("keptWorkspace resolves the sandbox cwd next to the trace only when it exists", () => {
    const run = join(dir, "claude-eval-x");
    mkdirSync(join(run, "out"), { recursive: true });
    const trace = join(run, "out", "trace.jsonl");
    expect(keptWorkspace({ tracePath: trace })).toBeNull();
    mkdirSync(join(run, "sealed", "home", "cwd"), { recursive: true });
    expect(keptWorkspace({ tracePath: trace })).toBe(join(run, "sealed", "home", "cwd"));
    expect(keptWorkspace({})).toBeNull();
  });

  test("parseEnvBlocked rejects malformed values", () => {
    expect(() => parseEnvBlocked("no-colon")).toThrow();
    expect(() => parseEnvBlocked(":g")).toThrow();
  });
});
