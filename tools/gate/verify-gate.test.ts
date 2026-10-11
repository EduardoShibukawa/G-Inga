import { describe, expect, test } from "bun:test";
import { evaluateScope } from "./verify-gate.ts";
import { spawnSync } from "node:child_process";

describe("Autonomous Verification Gate", () => {
  test("Gate 1: fails when touched files exceed allowed scope", () => {
    const res = evaluateScope(["docs/non-existent-scope/"], ["src/unexpected-file.ts"]);
    expect(res.pass).toBe(false);
    expect(res.violations.length).toBeGreaterThan(0);
  });

  test("Gate 1: passes when touched files are strictly within allowed scope", () => {
    const res = evaluateScope(
      [".agents/skills/orchestrate/", "tools/gate/"],
      [".agents/skills/orchestrate/SKILL.md", "tools/gate/verify-gate.ts"]
    );
    expect(res.pass).toBe(true);
    expect(res.violations).toEqual([]);
  });

  test("Gate 2: CLI returns exit code 1 when command fails", () => {
    const proc = spawnSync("bun", [
      "tools/gate/verify-gate.ts",
      "--cmd", "bash -c 'exit 1'",
      "--scope", "tools/gate/",
      "--files", "tools/gate/verify-gate.ts",
    ], { encoding: "utf8" });
    expect(proc.status).toBe(1);
    expect(proc.stderr).toContain("FAIL: Command exited with code 1");
  });

  test("Gate 2 & 4: CLI returns exit code 2 when circuit breaker trips (attempt > max)", () => {
    const proc = spawnSync("bun", [
      "tools/gate/verify-gate.ts",
      "--attempt", "3",
      "--max-attempts", "2",
    ], { encoding: "utf8" });
    expect(proc.status).toBe(2);
    expect(proc.stderr).toContain("Circuit Breaker");
  });

  test("Gate Pass: CLI returns exit code 0 when all layers pass", () => {
    const proc = spawnSync("bun", [
      "tools/gate/verify-gate.ts",
      "--scope", "tools/gate/",
      "--files", "tools/gate/verify-gate.ts",
      "--cmd", "bash -c 'exit 0'",
      "--attempt", "1",
    ], { encoding: "utf8" });
    expect(proc.status).toBe(0);
    expect(proc.stdout).toContain("ALL LAYERS PASSED");
  });
});
