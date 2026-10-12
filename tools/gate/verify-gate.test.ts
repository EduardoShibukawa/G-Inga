import { describe, expect, test } from "bun:test";
import { evaluateScope, evaluateTaskAncestry, parseTaskRecord } from "./verify-gate.ts";
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
});
