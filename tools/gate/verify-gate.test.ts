import { describe, expect, test } from "bun:test";
import {
  detectScopeCollisions,
  evaluateScope,
  evaluateTaskAncestry,
  parseTaskRecord,
  partitionWaves,
  validatePreDispatch,
} from "./verify-gate.ts";
import { spawnSync } from "node:child_process";
import { unlinkSync, writeFileSync } from "node:fs";

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
      "--tasks", "",
    ], { encoding: "utf8" });
    expect(proc.status).toBe(1);
    expect(proc.stderr).toContain("FAIL: Command exited with code 1");
  });

  test("Gate 2 & 5: CLI returns exit code 2 when circuit breaker trips (attempt > max)", () => {
    const proc = spawnSync("bun", [
      "tools/gate/verify-gate.ts",
      "--attempt", "3",
      "--max-attempts", "2",
    ], { encoding: "utf8" });
    expect(proc.status).toBe(2);
    expect(proc.stderr).toContain("Circuit Breaker");
  });

  test("Gate 3: parseTaskRecord extracts YAML frontmatter and verification rows", () => {
    const content = `---
schema: task/1
tier: standard
status: verified
verified_at: "e0e8e9c"
---

# Sample Task

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline check | pass | 71b1890 | baseline note |
| AC1 | acceptance test | pass | e0e8e9c | passed note |
`;
    const parsed = parseTaskRecord("tasks/test-task.md", content);
    expect(parsed).not.toBeNull();
    expect(parsed?.status).toBe("verified");
    expect(parsed?.verifiedAt).toBe("e0e8e9c");
    expect(parsed?.rows.length).toBe(2);
    expect(parsed?.rows[0].id).toBe("B1");
    expect(parsed?.rows[0].sha).toBe("71b1890");
    expect(parsed?.rows[1].id).toBe("AC1");
    expect(parsed?.rows[1].sha).toBe("e0e8e9c");
  });

  test("Gate 3: evaluateTaskAncestry passes when baseline commit is a strict valid ancestor of verified_at", () => {
    // 71b1890 is an ancestor of e0e8e9c in G-Ingá git history
    const content = `---
schema: task/1
tier: standard
status: verified
verified_at: "e0e8e9c"
---

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline check | pass | 71b1890 | baseline note |
| AC1 | acceptance test | pass | e0e8e9c | passed note |
`;
    const res = evaluateTaskAncestry(["tasks/valid-task.md"], {
      "tasks/valid-task.md": content,
    });
    expect(res.pass).toBe(true);
    expect(res.violations).toEqual([]);
    expect(res.checkedTasks).toEqual(["tasks/valid-task.md"]);
  });

  test("Gate 3: evaluateTaskAncestry fails when commit hash does not exist in local repo", () => {
    const content = `---
schema: task/1
tier: standard
status: verified
verified_at: "deadbeef00000000000000000000000000000000"
---

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline check | pass | 71b1890 | baseline note |
`;
    const res = evaluateTaskAncestry(["tasks/missing-verified-at.md"], {
      "tasks/missing-verified-at.md": content,
    });
    expect(res.pass).toBe(false);
    expect(res.violations.some((v) => v.includes("does not exist in local Git repository"))).toBe(true);
  });

  test("Gate 3: evaluateTaskAncestry fails when baseline commit does not exist", () => {
    const content = `---
schema: task/1
tier: standard
status: verified
verified_at: "e0e8e9c"
---

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline check | pass | nonexistingsha12345 | baseline note |
`;
    const res = evaluateTaskAncestry(["tasks/missing-b1.md"], {
      "tasks/missing-b1.md": content,
    });
    expect(res.pass).toBe(false);
    expect(res.violations.some((v) => v.includes("does not exist in local Git repository"))).toBe(true);
  });

  test("Gate 3: evaluateTaskAncestry fails when baseline is not an ancestor of verified_at (reversed ancestry)", () => {
    // e0e8e9c is a descendant, not an ancestor of 71b1890
    const content = `---
schema: task/1
tier: standard
status: verified
verified_at: "71b1890"
---

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline check | pass | e0e8e9c | reversed ancestry |
`;
    const res = evaluateTaskAncestry(["tasks/reversed-ancestry.md"], {
      "tasks/reversed-ancestry.md": content,
    });
    expect(res.pass).toBe(false);
    expect(res.violations.some((v) => v.includes("is not a strict ancestor of verified_at"))).toBe(true);
  });

  test("Gate 3: evaluateTaskAncestry fails when baseline commit equals verified_at", () => {
    const content = `---
schema: task/1
tier: standard
status: verified
verified_at: "e0e8e9c"
---

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline check | pass | e0e8e9c | identical commit |
`;
    const res = evaluateTaskAncestry(["tasks/equal-commit.md"], {
      "tasks/equal-commit.md": content,
    });
    expect(res.pass).toBe(false);
    expect(res.violations.some((v) => v.includes("equals verified_at"))).toBe(true);
  });

  test("Gate Pass: CLI returns exit code 0 when all layers pass", () => {
    const proc = spawnSync("bun", [
      "tools/gate/verify-gate.ts",
      "--scope", "tools/gate/",
      "--files", "tools/gate/verify-gate.ts",
      "--tasks", "",
      "--cmd", "bash -c 'exit 0'",
      "--attempt", "1",
    ], { encoding: "utf8" });
    expect(proc.status).toBe(0);
    expect(proc.stdout).toContain("ALL LAYERS PASSED");
  });

  describe("Gate 1: Concurrency & Scope Collision Detection", () => {
    test("detectScopeCollisions returns hasCollisions: false for empty scopes or single worker", () => {
      expect(detectScopeCollisions({}).hasCollisions).toBe(false);
      expect(detectScopeCollisions({ "worker-1": ["src/index.ts"] }).hasCollisions).toBe(false);
    });

    test("detectScopeCollisions returns hasCollisions: false when workers have disjoint scopes", () => {
      const res = detectScopeCollisions({
        "worker-1": ["src/auth/login.ts", "src/auth/token.ts"],
        "worker-2": ["src/billing/checkout.ts", "src/billing/invoice.ts"],
      });
      expect(res.hasCollisions).toBe(false);
      expect(res.collisions).toEqual({});
      expect(res.byWorker).toEqual({});
      expect(res.byFile).toEqual({});
    });

    test("detectScopeCollisions detects exact file collision between two workers", () => {
      const res = detectScopeCollisions({
        "worker-1": ["tools/gate/verify-gate.ts", "tools/gate/verify-gate.test.ts"],
        "worker-2": ["tools/gate/verify-gate.ts", "tasks/task-b.md"],
      });
      expect(res.hasCollisions).toBe(true);
      expect(res.byWorker["worker-1"]).toContain("tools/gate/verify-gate.ts");
      expect(res.byWorker["worker-2"]).toContain("tools/gate/verify-gate.ts");
      expect(res.byFile["tools/gate/verify-gate.ts"]).toEqual(["worker-1", "worker-2"]);
      expect(res.collisions["tools/gate/verify-gate.ts"]).toEqual(["worker-1", "worker-2"]);
      expect(res.collisions["worker-1"]).toContain("tools/gate/verify-gate.ts");
    });

    test("detectScopeCollisions detects directory prefix containment collision", () => {
      const res = detectScopeCollisions({
        "worker-1": ["tools/gate/"],
        "worker-2": ["tools/gate/verify-gate.ts"],
      });
      expect(res.hasCollisions).toBe(true);
      expect(res.byWorker["worker-1"]).toContain("tools/gate/");
      expect(res.byWorker["worker-2"]).toContain("tools/gate/verify-gate.ts");
    });

    test("detectScopeCollisions detects directory wildcard collision", () => {
      const res = detectScopeCollisions({
        "worker-1": ["tools/gate/*"],
        "worker-2": ["tools/gate/verify-gate.ts"],
      });
      expect(res.hasCollisions).toBe(true);
      expect(res.byWorker["worker-1"]).toContain("tools/gate/*");
      expect(res.byWorker["worker-2"]).toContain("tools/gate/verify-gate.ts");
    });

    test("detectScopeCollisions does not falsely collide on path without boundary separator", () => {
      const res = detectScopeCollisions({
        "worker-1": ["tools/gate"],
        "worker-2": ["tools/gatekeeper.ts"],
      });
      expect(res.hasCollisions).toBe(false);
    });

    test("detectScopeCollisions normalizes relative paths with leading ./", () => {
      const res = detectScopeCollisions({
        "worker-1": ["./tools/gate/verify-gate.ts"],
        "worker-2": ["tools/gate/verify-gate.ts"],
      });
      expect(res.hasCollisions).toBe(true);
      expect(res.byFile["tools/gate/verify-gate.ts"]).toEqual(["worker-1", "worker-2"]);
    });

    test("detectScopeCollisions isolates multi-worker collisions and preserves non-colliding workers", () => {
      const res = detectScopeCollisions({
        "worker-1": ["src/shared.ts", "src/auth.ts"],
        "worker-2": ["src/shared.ts", "src/billing.ts"],
        "worker-3": ["src/billing.ts", "src/reports.ts"],
        "worker-4": ["src/independent.ts"],
      });
      expect(res.hasCollisions).toBe(true);
      expect(res.byWorker["worker-1"]).toEqual(["src/shared.ts"]);
      expect(res.byWorker["worker-2"]).toEqual(["src/shared.ts", "src/billing.ts"]);
      expect(res.byWorker["worker-3"]).toEqual(["src/billing.ts"]);
      expect(res.byWorker["worker-4"]).toBeUndefined();
    });

    test("CLI returns exit code 0 when declared scopes are disjoint", () => {
      const proc = spawnSync("bun", [
        "tools/gate/verify-gate.ts",
        "--tasks", "",
        "--declared-scopes",
        JSON.stringify({
          "worker-1": ["src/a.ts"],
          "worker-2": ["src/b.ts"],
        }),
      ], { encoding: "utf8" });
      expect(proc.status).toBe(0);
      expect(proc.stdout).toContain("All declared scopes are mutually disjoint");
    });

    test("CLI returns exit code 1 when declared scopes collide", () => {
      const proc = spawnSync("bun", [
        "tools/gate/verify-gate.ts",
        "--declared-scopes",
        JSON.stringify({
          "worker-1": ["tools/gate/verify-gate.ts"],
          "worker-2": ["tools/gate/verify-gate.ts"],
        }),
      ], { encoding: "utf8" });
      expect(proc.status).toBe(1);
      expect(proc.stderr).toContain("Scope collision detected between concurrent workers");
    });

    test("CLI parses declared scopes from JSON file path", () => {
      const tempPath = `tasks/temp-scopes-${Date.now()}.json`;
      writeFileSync(tempPath, JSON.stringify({
        "worker-1": ["tools/gate/verify-gate.ts"],
        "worker-2": ["tools/gate/verify-gate.ts"],
      }), "utf8");

      try {
        const proc = spawnSync("bun", [
          "tools/gate/verify-gate.ts",
          "--declared-scopes",
          tempPath,
        ], { encoding: "utf8" });
        expect(proc.status).toBe(1);
        expect(proc.stderr).toContain("Scope collision detected between concurrent workers");
      } finally {
        unlinkSync(tempPath);
      }
    });

    test("validatePreDispatch returns pass: true and single wave for disjoint scopes", () => {
      const scopes = {
        "worker-1": ["src/module-a/index.ts", "src/module-a/utils.ts"],
        "worker-2": ["src/module-b/index.ts", "src/module-b/service.ts"],
        "worker-3": ["docs/architecture.md"],
      };
      const res = validatePreDispatch(scopes);
      expect(res.pass).toBe(true);
      expect(res.hasCollisions).toBe(false);
      expect(res.collisions).toEqual({});
      expect(res.byWorker).toEqual({});
      expect(res.waves).toEqual([["worker-1", "worker-2", "worker-3"]]);
    });

    test("validatePreDispatch returns pass: false and identifies conflicting workers", () => {
      const scopes = {
        "worker-1": ["src/shared/types.ts", "src/feature-a.ts"],
        "worker-2": ["src/shared/types.ts", "src/feature-b.ts"],
      };
      const res = validatePreDispatch(scopes);
      expect(res.pass).toBe(false);
      expect(res.hasCollisions).toBe(true);
      expect(res.byWorker["worker-1"]).toContain("src/shared/types.ts");
      expect(res.byWorker["worker-2"]).toContain("src/shared/types.ts");
      expect(res.byFile["src/shared/types.ts"]).toEqual(["worker-1", "worker-2"]);
    });

    test("partitionWaves serializes conflicting workers into conflict-free sequential waves", () => {
      const scopes = {
        "worker-1": ["src/a.ts"],
        "worker-2": ["src/a.ts"],
        "worker-3": ["src/b.ts"],
      };
      const waves = partitionWaves(scopes);
      // Wave 1: worker-1, worker-3 (disjoint)
      // Wave 2: worker-2 (conflicts with worker-1)
      expect(waves.length).toBe(2);
      expect(waves[0]).toEqual(["worker-1", "worker-3"]);
      expect(waves[1]).toEqual(["worker-2"]);

      // Verify each wave internally has zero collisions
      for (const wave of waves) {
        const waveScopes: Record<string, string[]> = {};
        for (const w of wave) {
          waveScopes[w] = scopes[w as keyof typeof scopes];
        }
        expect(detectScopeCollisions(waveScopes).hasCollisions).toBe(false);
      }
    });

    test("partitionWaves handles multiple chain collisions into cascading waves", () => {
      const scopes = {
        "worker-1": ["tools/gate/"],
        "worker-2": ["tools/gate/verify-gate.ts"],
        "worker-3": ["tools/gate/verify-gate.test.ts"],
        "worker-4": ["docs/README.md"],
      };
      const waves = partitionWaves(scopes);
      // worker-1 takes tools/gate/, worker-4 takes docs/README.md in wave 1
      // worker-2 collides with wave 1 (worker-1), moves to wave 2
      // worker-3 collides with wave 1 (worker-1), and in wave 2 it might be disjoint from worker-2 depending on path matching:
      // Note: tools/gate/verify-gate.ts vs tools/gate/verify-gate.test.ts are disjoint!
      expect(waves[0]).toContain("worker-1");
      expect(waves[0]).toContain("worker-4");
      expect(waves[1]).toContain("worker-2");
      expect(waves[1]).toContain("worker-3");

      for (const wave of waves) {
        const waveScopes: Record<string, string[]> = {};
        for (const w of wave) {
          waveScopes[w] = scopes[w as keyof typeof scopes];
        }
        expect(detectScopeCollisions(waveScopes).hasCollisions).toBe(false);
      }
    });

    test("CLI with --pre-dispatch returns exit code 0 when disjoint", () => {
      const proc = spawnSync("bun", [
        "tools/gate/verify-gate.ts",
        "--pre-dispatch",
        "--declared-scopes",
        JSON.stringify({
          w1: ["src/a.ts"],
          w2: ["src/b.ts"],
        }),
      ], { encoding: "utf8" });
      expect(proc.status).toBe(0);
      expect(proc.stdout).toContain("[OODA Gate Pre-Dispatch] PASS");
    });

    test("CLI with --pre-dispatch returns exit code 1 when colliding and suggests waves", () => {
      const proc = spawnSync("bun", [
        "tools/gate/verify-gate.ts",
        "--pre-dispatch",
        "--declared-scopes",
        JSON.stringify({
          w1: ["src/a.ts"],
          w2: ["src/a.ts"],
        }),
      ], { encoding: "utf8" });
      expect(proc.status).toBe(1);
      expect(proc.stderr).toContain("[OODA Gate Pre-Dispatch] FAIL: Scope collision detected between concurrent workers");
      expect(proc.stderr).toContain("Worker \"w1\" collides on: [src/a.ts]");
      expect(proc.stderr).toContain("Worker \"w2\" collides on: [src/a.ts]");
      expect(proc.stderr).toContain("Suggested serialized execution waves:");
    });
  });
});
