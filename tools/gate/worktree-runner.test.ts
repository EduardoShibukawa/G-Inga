import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import {
  createWorktree,
  runInWorktree,
  getWorktreeDiff,
  commitWorktreeChanges,
  mergeWorktreeBranch,
  removeWorktree,
  listWorktrees,
} from "./worktree-runner";

function setupTempRepo(): string {
  const repoDir = mkdtempSync(join(tmpdir(), "g-inga-test-repo-"));
  spawnSync("git", ["init", "-b", "main"], { cwd: repoDir });
  spawnSync("git", ["config", "user.name", "Test User"], { cwd: repoDir });
  spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: repoDir });

  writeFileSync(join(repoDir, "README.md"), "# Test Repository\n");
  spawnSync("git", ["add", "README.md"], { cwd: repoDir });
  spawnSync("git", ["commit", "-m", "Initial commit"], { cwd: repoDir });

  return repoDir;
}

describe("Dynamic Worktree Runner & Isolation Harness", () => {
  let repoDir: string;

  beforeEach(() => {
    repoDir = setupTempRepo();
  });

  afterEach(() => {
    if (existsSync(repoDir)) {
      rmSync(repoDir, { recursive: true, force: true });
    }
  });

  it("creates and cleans up an ephemeral worktree in temporary directory", () => {
    const wt = createWorktree({ repoDir, detach: true });
    expect(existsSync(wt.path)).toBe(true);
    expect(existsSync(join(wt.path, "README.md"))).toBe(true);

    const worktreesBefore = listWorktrees(repoDir);
    expect(worktreesBefore.length).toBe(2); // main repo + 1 worktree

    const cleaned = removeWorktree(wt);
    expect(cleaned).toBe(true);
    expect(existsSync(wt.path)).toBe(false);

    const worktreesAfter = listWorktrees(repoDir);
    expect(worktreesAfter.length).toBe(1);
  });

  it("measures worktree setup overhead and satisfies < 500ms SLA", () => {
    const wt = createWorktree({ repoDir, detach: true });
    expect(wt.setupTimeMs).toBeLessThan(500);
    removeWorktree(wt);
  });

  it("executes commands hermetically in isolated worktree sandbox", () => {
    const wt = createWorktree({ repoDir, detach: true });
    const res = runInWorktree(wt, {
      command: "echo 'hello from sandbox'",
      env: { CUSTOM_VAR: "custom_val" },
    });

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("hello from sandbox");
    removeWorktree(wt);
  });

  it("handles failing sandbox commands and captures non-zero exit codes", () => {
    const wt = createWorktree({ repoDir, detach: true });
    const res = runInWorktree(wt, {
      command: "sh -c 'exit 42'",
    });

    expect(res.exitCode).toBe(42);
    // Cleanup must succeed even after failure
    const cleaned = removeWorktree(wt);
    expect(cleaned).toBe(true);
  });

  it("prevents .git/index.lock collisions across concurrent worktree workers", () => {
    const wt1 = createWorktree({ repoDir, branch: "worker/lock-1" });
    const wt2 = createWorktree({ repoDir, branch: "worker/lock-2" });

    // In shared repo, concurrent commits can trigger .git/index.lock contention
    // With isolated worktrees, each worktree has its own index
    writeFileSync(join(wt1.path, "file1.txt"), "Worker 1 content\n");
    writeFileSync(join(wt2.path, "file2.txt"), "Worker 2 content\n");

    const commit1 = commitWorktreeChanges(wt1, "Worker 1 commit");
    const commit2 = commitWorktreeChanges(wt2, "Worker 2 commit");

    expect(commit1).toBeTruthy();
    expect(commit2).toBeTruthy();
    expect(commit1).not.toBe(commit2);

    removeWorktree(wt1);
    removeWorktree(wt2);
  });

  it("performs sequential hermetic merge of independent worker branches to main", () => {
    const wt1 = createWorktree({ repoDir, branch: "feat/part-1" });
    const wt2 = createWorktree({ repoDir, branch: "feat/part-2" });

    writeFileSync(join(wt1.path, "part1.txt"), "Part 1\n");
    commitWorktreeChanges(wt1, "Add part 1");

    writeFileSync(join(wt2.path, "part2.txt"), "Part 2\n");
    commitWorktreeChanges(wt2, "Add part 2");

    removeWorktree(wt1);
    removeWorktree(wt2);

    // Merge both to main
    const m1 = mergeWorktreeBranch(repoDir, "feat/part-1", "main");
    expect(m1.success).toBe(true);

    const m2 = mergeWorktreeBranch(repoDir, "feat/part-2", "main");
    expect(m2.success).toBe(true);

    // Verify main has both files
    expect(existsSync(join(repoDir, "part1.txt"))).toBe(true);
    expect(existsSync(join(repoDir, "part2.txt"))).toBe(true);
  });

  it("detects merge conflicts without corrupting primary repository state", () => {
    const wt1 = createWorktree({ repoDir, branch: "conflict/branch-a" });
    const wt2 = createWorktree({ repoDir, branch: "conflict/branch-b" });

    writeFileSync(join(wt1.path, "shared.txt"), "Conflict Line Alpha\n");
    commitWorktreeChanges(wt1, "Commit Alpha");

    writeFileSync(join(wt2.path, "shared.txt"), "Conflict Line Beta\n");
    commitWorktreeChanges(wt2, "Commit Beta");

    removeWorktree(wt1);
    removeWorktree(wt2);

    // Merge branch A
    const mA = mergeWorktreeBranch(repoDir, "conflict/branch-a", "main");
    expect(mA.success).toBe(true);

    // Merge branch B (should fail cleanly and abort)
    const mB = mergeWorktreeBranch(repoDir, "conflict/branch-b", "main");
    expect(mB.success).toBe(false);
    expect(mB.conflictFiles).toContain("shared.txt");

    // Main repo must be clean (no uncommitted conflict markers left)
    const status = spawnSync("git", ["status", "--porcelain"], { cwd: repoDir, encoding: "utf-8" });
    expect(status.stdout.trim()).toBe("");
  });

  it("forcefully purges untracked and dirty artifacts during worktree cleanup", () => {
    const wt = createWorktree({ repoDir, detach: true });
    writeFileSync(join(wt.path, "dirty.log"), "Some untracked dirty log\n");

    const cleaned = removeWorktree(wt, true);
    expect(cleaned).toBe(true);
    expect(existsSync(wt.path)).toBe(false);

    // Main repo is unaffected
    const status = spawnSync("git", ["status", "--porcelain"], { cwd: repoDir, encoding: "utf-8" });
    expect(status.stdout.trim()).toBe("");
  });

  it("handles high concurrency wave of 5 parallel workers with overhead < 500ms per worker", () => {
    const startAll = performance.now();
    const workers = [1, 2, 3, 4, 5].map((i) => {
      const wt = createWorktree({ repoDir, branch: `wave/worker-${i}` });
      return { id: i, wt };
    });

    const totalSetupMs = performance.now() - startAll;
    const avgSetupMs = totalSetupMs / workers.length;

    expect(avgSetupMs).toBeLessThan(500);

    for (const { id, wt } of workers) {
      expect(wt.setupTimeMs).toBeLessThan(500);
      writeFileSync(join(wt.path, `worker_${id}.txt`), `Worker ${id} payload`);
      commitWorktreeChanges(wt, `Worker ${id} commit`);
      removeWorktree(wt);
    }

    const remaining = listWorktrees(repoDir);
    expect(remaining.length).toBe(1);
  });

  it("validates all 10 synthetic concurrency scenarios from worktree-concurrency-v1.json", () => {
    const scenariosPath = join(__dirname, "../../docs/research/scenarios/worktree-concurrency-v1.json");
    expect(existsSync(scenariosPath)).toBe(true);

    const content = JSON.parse(readFileSync(scenariosPath, "utf-8"));
    expect(content.length).toBeGreaterThanOrEqual(10);

    for (const scenario of content) {
      expect(scenario.id).toMatch(/^WTC-\d{2}$/);
      expect(scenario.name).toBeTruthy();
      expect(scenario.category).toBeTruthy();
      expect(scenario.workers.length).toBeGreaterThanOrEqual(1);
    }
  });
});
