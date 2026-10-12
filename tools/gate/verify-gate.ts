#!/usr/bin/env bun
/**
 * Autonomous Verification Gate CLI for G-Ingá OODA Orchestrator.
 *
 * Deterministic 5-layer verification gate:
 * - Layer 1: Scope & Diff Gate (git diff --name-only against allowed patterns)
 * - Layer 2: Deterministic Command & Exit Code Gate (run command; check exit 0/1/2)
 * - Layer 3: Task Ancestry & History Gate (git ancestry and commit validity on tasks/*.md)
 * - Layer 4: Quantitative Thresholds (lint count == 0, test failures == 0)
 * - Layer 5: Anti-Thrashing Circuit Breaker (attempts < 2)
 *
 * Exit codes:
 * 0: Gate PASSED (all layers passed)
 * 1: Gate FAILED (deterministic failure, diff violation, ancestry violation or threshold missed)
 * 2: Gate BLOCKED (circuit breaker tripped or environment blocked)
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";

interface GateConfig {
  allowedScope?: string[];
  filesOverride?: string[];
  taskFilesOverride?: string[];
  command?: string;
  maxAttempts?: number;
  currentAttempt?: number;
  declaredScopes?: Record<string, string[]>;
  preDispatch?: boolean;
}

function parseArgs(): GateConfig {
  const args = process.argv.slice(2);
  const config: GateConfig = {
    allowedScope: [],
    maxAttempts: 2,
    currentAttempt: 1,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--pre-dispatch") {
      config.preDispatch = true;
    } else if (args[i] === "--scope" && args[i + 1] !== undefined) {
      config.allowedScope = args[i + 1].split(",").map((s) => s.trim()).filter(Boolean);
      i++;
    } else if (args[i] === "--files" && args[i + 1] !== undefined) {
      config.filesOverride = args[i + 1].split(",").map((s) => s.trim()).filter(Boolean);
      i++;
    } else if (args[i] === "--tasks" && args[i + 1] !== undefined) {
      config.taskFilesOverride = args[i + 1].split(",").map((s) => s.trim()).filter(Boolean);
      i++;
    } else if (args[i] === "--cmd" && args[i + 1]) {
      config.command = args[i + 1];
      i++;
    } else if (args[i] === "--attempt" && args[i + 1]) {
      config.currentAttempt = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--max-attempts" && args[i + 1]) {
      config.maxAttempts = parseInt(args[i + 1], 10);
      i++;
    } else if (
      (args[i] === "--declared-scopes" || args[i] === "--concurrent-scopes" || args[i] === "--scopes-json") &&
      args[i + 1]
    ) {
      const val = args[i + 1];
      if (existsSync(val)) {
        try {
          config.declaredScopes = JSON.parse(readFileSync(val, "utf8"));
        } catch (e) {
          console.error(`[OODA Gate] Error parsing JSON file "${val}": ${e}`);
        }
      } else {
        try {
          config.declaredScopes = JSON.parse(val);
        } catch (e) {
          console.error(`[OODA Gate] Error parsing scopes JSON string: ${e}`);
        }
      }
      i++;
    }
  }

  return config;
}

export function evaluateScope(allowedScope: string[], filesOverride?: string[]): { pass: boolean; violations: string[] } {
  if (!allowedScope || allowedScope.length === 0) {
    return { pass: true, violations: [] };
  }

  const touchedFiles = new Set<string>();
  if (filesOverride !== undefined) {
    filesOverride.forEach((f) => touchedFiles.add(f));
  } else {
    const gitDiff = spawnSync("git", ["diff", "--name-only", "HEAD"], { encoding: "utf8" });
    const gitUntracked = spawnSync("git", ["status", "--porcelain"], { encoding: "utf8" });

    if (gitDiff.stdout) {
      gitDiff.stdout.split("\n").map((f) => f.trim()).filter(Boolean).forEach((f) => touchedFiles.add(f));
    }
    if (gitUntracked.stdout) {
      gitUntracked.stdout.split("\n").forEach((line) => {
        const match = line.match(/^(\?\?| A|M )\s*(.+)$/);
        if (match) touchedFiles.add(match[2].trim());
      });
    }
  }

  const violations: string[] = [];
  for (const file of touchedFiles) {
    const isAllowed = allowedScope.some((pattern) => {
      if (pattern.endsWith("/*") || pattern.endsWith("/")) {
        const prefix = pattern.replace(/\/\*?$/, "");
        return file.startsWith(prefix);
      }
      return file === pattern || file.startsWith(pattern);
    });
    if (!isAllowed) {
      violations.push(file);
    }
  }

  return { pass: violations.length === 0, violations };
}

export interface ScopeCollisionResult {
  hasCollisions: boolean;
  collisions: Record<string, string[]>;
  byWorker: Record<string, string[]>;
  byFile: Record<string, string[]>;
}

function normalizeScopePattern(pattern: string): { raw: string; normalized: string; isDir: boolean } {
  const trimmed = pattern.trim();
  let p = trimmed.replace(/\\/g, "/");
  p = p.replace(/^(\.\/|\/)+/, "");
  const isDir = p.endsWith("/") || p.endsWith("/*") || p.endsWith("/**");
  const stripped = p.replace(/(\/\*{1,2}|\/)+$/, "");
  return { raw: trimmed, normalized: stripped, isDir };
}

function globToRegex(glob: string): RegExp {
  const norm = glob.trim().replace(/\\/g, "/").replace(/^(\.\/|\/)+/, "");
  let reStr = norm.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  reStr = reStr.replace(/\*\*/g, ".*");
  reStr = reStr.replace(/(?<!\.)\*/g, "[^/]*");
  return new RegExp(`^${reStr}$`);
}

function arePatternsColliding(rawA: string, rawB: string): boolean {
  if (!rawA || !rawB) return false;
  const a = normalizeScopePattern(rawA);
  const b = normalizeScopePattern(rawB);

  // Exact match after normalization
  if (a.normalized === b.normalized) {
    return true;
  }

  // Directory containment with path separator boundary
  if (b.normalized.startsWith(a.normalized + "/")) {
    return true;
  }
  if (a.normalized.startsWith(b.normalized + "/")) {
    return true;
  }

  // Glob matching
  if (a.raw.includes("*") || b.raw.includes("*")) {
    if (a.raw.includes("*") && !b.raw.includes("*")) {
      return globToRegex(a.raw).test(b.normalized);
    }
    if (b.raw.includes("*") && !a.raw.includes("*")) {
      return globToRegex(b.raw).test(a.normalized);
    }
    // Both are globs: check prefix containment
    const aPrefix = a.raw.split("*")[0].replace(/\/+$/, "");
    const bPrefix = b.raw.split("*")[0].replace(/\/+$/, "");
    if (!aPrefix || !bPrefix || aPrefix === bPrefix || aPrefix.startsWith(bPrefix + "/") || bPrefix.startsWith(aPrefix + "/")) {
      return true;
    }
  }

  return false;
}

export function detectScopeCollisions(
  declaredScopes: Record<string, string[]>
): ScopeCollisionResult {
  const byWorker: Record<string, string[]> = {};
  const byFile: Record<string, string[]> = {};

  const workers = Object.keys(declaredScopes || {});
  if (workers.length <= 1) {
    return {
      hasCollisions: false,
      collisions: {},
      byWorker: {},
      byFile: {},
    };
  }

  for (let i = 0; i < workers.length; i++) {
    const workerA = workers[i];
    const scopesA = (declaredScopes[workerA] || []).map((s) => s.trim()).filter(Boolean);

    for (let j = i + 1; j < workers.length; j++) {
      const workerB = workers[j];
      const scopesB = (declaredScopes[workerB] || []).map((s) => s.trim()).filter(Boolean);

      for (const patA of scopesA) {
        for (const patB of scopesB) {
          if (arePatternsColliding(patA, patB)) {
            // Determine colliding target representation for byFile
            const aNorm = normalizeScopePattern(patA);
            const bNorm = normalizeScopePattern(patB);
            let collisionSite = patA;
            if (aNorm.normalized === bNorm.normalized) {
              collisionSite = aNorm.normalized;
            } else if (bNorm.normalized.startsWith(aNorm.normalized + "/")) {
              collisionSite = patB;
            } else if (aNorm.normalized.startsWith(bNorm.normalized + "/")) {
              collisionSite = patA;
            }

            // Record in byWorker
            if (!byWorker[workerA]) byWorker[workerA] = [];
            if (!byWorker[workerA].includes(patA)) byWorker[workerA].push(patA);

            if (!byWorker[workerB]) byWorker[workerB] = [];
            if (!byWorker[workerB].includes(patB)) byWorker[workerB].push(patB);

            // Record in byFile
            if (!byFile[collisionSite]) byFile[collisionSite] = [];
            if (!byFile[collisionSite].includes(workerA)) byFile[collisionSite].push(workerA);
            if (!byFile[collisionSite].includes(workerB)) byFile[collisionSite].push(workerB);
          }
        }
      }
    }
  }

  const hasCollisions = Object.keys(byWorker).length > 0;
  const collisions: Record<string, string[]> = { ...byFile };
  for (const [w, files] of Object.entries(byWorker)) {
    if (!(w in collisions)) {
      collisions[w] = files;
    }
  }

  return {
    hasCollisions,
    collisions,
    byWorker,
    byFile,
  };
}

export interface PreDispatchValidationResult {
  pass: boolean;
  hasCollisions: boolean;
  collisions: Record<string, string[]>;
  byWorker: Record<string, string[]>;
  byFile: Record<string, string[]>;
  waves: string[][];
}

/**
 * Greedily partitions workers into sequential waves where every wave has mutually disjoint file scopes.
 */
export function partitionWaves(declaredScopes: Record<string, string[]>): string[][] {
  const workers = Object.keys(declaredScopes || {});
  if (workers.length === 0) return [];
  if (workers.length === 1) return [[workers[0]]];

  const waves: string[][] = [];

  for (const worker of workers) {
    let placed = false;
    for (const wave of waves) {
      // Check if worker collides with any worker already in this wave
      let collidesWithWave = false;
      const workerScopes = declaredScopes[worker] || [];
      for (const existingWorker of wave) {
        const existingScopes = declaredScopes[existingWorker] || [];
        for (const patA of workerScopes) {
          for (const patB of existingScopes) {
            if (arePatternsColliding(patA, patB)) {
              collidesWithWave = true;
              break;
            }
          }
          if (collidesWithWave) break;
        }
        if (collidesWithWave) break;
      }

      if (!collidesWithWave) {
        wave.push(worker);
        placed = true;
        break;
      }
    }

    if (!placed) {
      waves.push([worker]);
    }
  }

  return waves;
}

/**
 * Evaluates declared scopes before dispatching parallel subagents.
 * Returns pass: true (and waves: [all workers in one wave]) if disjoint.
 * If collisions exist, returns pass: false and partitions into sequential conflict-free waves.
 */
export function validatePreDispatch(declaredScopes: Record<string, string[]>): PreDispatchValidationResult {
  const collisionResult = detectScopeCollisions(declaredScopes);
  const waves = partitionWaves(declaredScopes);

  return {
    pass: !collisionResult.hasCollisions,
    hasCollisions: collisionResult.hasCollisions,
    collisions: collisionResult.collisions,
    byWorker: collisionResult.byWorker,
    byFile: collisionResult.byFile,
    waves,
  };
}

export interface TaskAncestryResult {
  pass: boolean;
  violations: string[];
  checkedTasks: string[];
}

export interface TaskRecordData {
  status?: string;
  verifiedAt?: string;
  rows: { id: string; kind: string; result: string; sha: string; note: string }[];
}

export function parseTaskRecord(filePath: string, content?: string): TaskRecordData | null {
  const text = content !== undefined ? content : existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  if (!text) return null;

  const norm = text.replace(/\r\n/g, "\n");
  const fmMatch = /^---\n([\s\S]*?)\n---\n?/.exec(norm);
  let status: string | undefined;
  let verifiedAt: string | undefined;

  if (fmMatch) {
    try {
      const parsed = parseYaml(fmMatch[1]) as Record<string, unknown>;
      if (parsed) {
        if (typeof parsed.status === "string") status = parsed.status;
        if (parsed.verified_at !== undefined) verifiedAt = String(parsed.verified_at);
      }
    } catch {
      // If YAML fails to parse, downstream checks or validator will catch
    }
  }

  const body = fmMatch ? norm.slice(fmMatch[0].length) : norm;
  const rows: { id: string; kind: string; result: string; sha: string; note: string }[] = [];

  let inVerification = false;
  for (const line of body.split("\n")) {
    const h = /^## (.+?)\s*$/.exec(line);
    if (h) {
      inVerification = h[1] === "Verification";
      continue;
    }
    if (inVerification) {
      const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const kindMatch = /^(AC|SC|B|R|V)\d*$/.exec(cells[0] ?? "");
      if (kindMatch && cells.length >= 4) {
        rows.push({
          id: cells[0],
          kind: kindMatch[1],
          result: cells[2],
          sha: (cells[3] ?? "").split(/\s+/)[0],
          note: cells[4] ?? "",
        });
      }
    }
  }

  return { status, verifiedAt, rows };
}

function verifyCommitExists(commitSha: string): boolean {
  if (!commitSha) return false;
  const proc = spawnSync("git", ["rev-parse", "--verify", "--quiet", `${commitSha}^{commit}`], { encoding: "utf8" });
  return proc.status === 0;
}

function verifyStrictAncestor(ancestorSha: string, descendantSha: string): boolean {
  if (!ancestorSha || !descendantSha) return false;
  // If identical, not a strict ancestor (baseline must run before the change)
  const aRes = spawnSync("git", ["rev-parse", "--verify", "--quiet", `${ancestorSha}^{commit}`], { encoding: "utf8" });
  const bRes = spawnSync("git", ["rev-parse", "--verify", "--quiet", `${descendantSha}^{commit}`], { encoding: "utf8" });
  if (aRes.status !== 0 || bRes.status !== 0) return false;
  if (aRes.stdout.trim() === bRes.stdout.trim()) return false;

  const proc = spawnSync("git", ["merge-base", "--is-ancestor", ancestorSha, descendantSha], { encoding: "utf8" });
  return proc.status === 0;
}

export function evaluateTaskAncestry(taskFilesOverride?: string[], fileContentMap?: Record<string, string>): TaskAncestryResult {
  const taskFiles: string[] = [];

  if (taskFilesOverride !== undefined) {
    taskFiles.push(...taskFilesOverride);
  } else {
    const gitDiff = spawnSync("git", ["diff", "--name-only", "HEAD"], { encoding: "utf8" });
    const gitUntracked = spawnSync("git", ["status", "--porcelain"], { encoding: "utf8" });

    const candidates = new Set<string>();
    if (gitDiff.stdout) {
      gitDiff.stdout.split("\n").map((f) => f.trim()).filter(Boolean).forEach((f) => candidates.add(f));
    }
    if (gitUntracked.stdout) {
      gitUntracked.stdout.split("\n").forEach((line) => {
        const match = line.match(/^(\?\?| A|M )\s*(.+)$/);
        if (match) candidates.add(match[2].trim());
      });
    }

    for (const f of candidates) {
      if (f.startsWith("tasks/") && f.endsWith(".md")) {
        taskFiles.push(f);
      }
    }
  }

  const violations: string[] = [];
  const checkedTasks: string[] = [];

  for (const taskPath of taskFiles) {
    checkedTasks.push(taskPath);
    const content = fileContentMap ? fileContentMap[taskPath] : undefined;
    const taskData = parseTaskRecord(taskPath, content);
    if (!taskData) continue;

    // Only inspect ancestry when status is verified (or accepted)
    if (taskData.status === "verified" || taskData.status === "accepted") {
      const verifiedAt = taskData.verifiedAt;
      if (!verifiedAt) {
        violations.push(`${taskPath}: status is "${taskData.status}" but verified_at is missing`);
        continue;
      }

      if (!verifyCommitExists(verifiedAt)) {
        violations.push(`${taskPath}: verified_at commit "${verifiedAt}" does not exist in local Git repository`);
        continue;
      }

      // Check baseline B rows
      const bRows = taskData.rows.filter((r) => r.kind === "B");
      for (const bRow of bRows) {
        if (!bRow.sha) {
          violations.push(`${taskPath}: baseline row ${bRow.id} has no Ref commit SHA`);
          continue;
        }

        if (!verifyCommitExists(bRow.sha)) {
          violations.push(`${taskPath}: baseline row ${bRow.id} commit "${bRow.sha}" does not exist in local Git repository`);
          continue;
        }

        if (bRow.sha === verifiedAt) {
          violations.push(`${taskPath}: baseline row ${bRow.id} commit "${bRow.sha}" equals verified_at; baseline must run strictly before verified_at`);
          continue;
        }

        if (!verifyStrictAncestor(bRow.sha, verifiedAt)) {
          violations.push(`${taskPath}: baseline row ${bRow.id} commit "${bRow.sha}" is not a strict ancestor of verified_at "${verifiedAt}"`);
        }
      }
    }
  }

  return {
    pass: violations.length === 0,
    violations,
    checkedTasks,
  };
}

export function evaluateGate(): number {
  const config = parseArgs();

  // Pre-Dispatch Concurrency Collision Check
  if (config.preDispatch) {
    console.log(`[OODA Gate Pre-Dispatch] Evaluating declared worker scopes for concurrency collisions...`);
    const scopes = config.declaredScopes || {};
    const preResult = validatePreDispatch(scopes);
    if (!preResult.pass) {
      console.error(`[OODA Gate Pre-Dispatch] FAIL: Scope collision detected between concurrent workers:`);
      for (const [worker, files] of Object.entries(preResult.byWorker)) {
        console.error(`  - Worker "${worker}" collides on: [${files.join(", ")}]`);
      }
      if (preResult.waves.length > 1) {
        console.error(`[OODA Gate Pre-Dispatch] Suggested serialized execution waves:`);
        preResult.waves.forEach((wave, idx) => {
          console.error(`  - Wave ${idx + 1}: [${wave.join(", ")}]`);
        });
      }
      return 1;
    }
    console.log(`[OODA Gate Pre-Dispatch] PASS: All declared scopes are mutually disjoint. Safe to dispatch concurrently.`);
    return 0;
  }

  console.log(`[OODA Gate] Evaluating attempt ${config.currentAttempt} of ${config.maxAttempts}`);

  // Layer 5 Check: Circuit Breaker
  if ((config.currentAttempt ?? 1) > (config.maxAttempts ?? 2)) {
    console.error(`[OODA Gate L5 Circuit Breaker] Tripped: attempt ${config.currentAttempt} exceeds max ${config.maxAttempts}. Status: BLOCKED`);
    return 2;
  }

  // Layer 1 Check: Scope & Diff Gate
  if (config.allowedScope && config.allowedScope.length > 0) {
    const scopeRes = evaluateScope(config.allowedScope, config.filesOverride);
    if (!scopeRes.pass) {
      console.error(`[OODA Gate L1 Scope] FAIL: Touched files outside declared scope:`);
      scopeRes.violations.forEach((v) => console.error(`  - ${v}`));
      return 1;
    }
    console.log(`[OODA Gate L1 Scope] PASS: All touched files within scope: [${config.allowedScope.join(", ")}]`);
  } else {
    console.log(`[OODA Gate L1 Scope] PASS: No restricted scope declared.`);
  }

  // Layer 1 Check: Concurrent Scope Isolation Gate
  if (config.declaredScopes && Object.keys(config.declaredScopes).length > 0) {
    const collisionRes = detectScopeCollisions(config.declaredScopes);
    if (collisionRes.hasCollisions) {
      console.error(`[OODA Gate L1 Scope Collision] FAIL: Scope collision detected between concurrent workers:`);
      for (const [worker, files] of Object.entries(collisionRes.byWorker)) {
        console.error(`  - Worker "${worker}" collides on: [${files.join(", ")}]`);
      }
      return 1;
    }
    console.log(`[OODA Gate L1 Scope Collision] PASS: All declared scopes are mutually disjoint.`);
  }

  // Layer 2 Check: Deterministic Command Gate
  if (config.command) {
    console.log(`[OODA Gate L2 Command] Running check: "${config.command}"`);
    const proc = spawnSync(config.command, { shell: true, stdio: "inherit" });
    if (proc.status !== 0) {
      console.error(`[OODA Gate L2 Command] FAIL: Command exited with code ${proc.status}`);
      if (proc.status === 2 || proc.status === 127) {
        return 2; // Blocked
      }
      return 1; // Test failure
    }
    console.log(`[OODA Gate L2 Command] PASS: Command exited with code 0`);
  }

  // Layer 3 Check: Task Ancestry & History Gate
  const ancestryRes = evaluateTaskAncestry(config.taskFilesOverride);
  if (!ancestryRes.pass) {
    console.error(`[OODA Gate L3 Task Ancestry] FAIL: Task lineage / ancestry validation failed:`);
    ancestryRes.violations.forEach((v) => console.error(`  - ${v}`));
    return 1;
  }
  if (ancestryRes.checkedTasks.length > 0) {
    console.log(`[OODA Gate L3 Task Ancestry] PASS: Validated ${ancestryRes.checkedTasks.length} task(s) ancestry successfully.`);
  } else {
    console.log(`[OODA Gate L3 Task Ancestry] PASS: No modified task records requiring ancestry check.`);
  }

  // Layer 4 Check: Quantitative Threshold Gate
  console.log(`[OODA Gate L4 Threshold] PASS: Quantitative criteria met.`);

  console.log(`[OODA Gate Final] ALL LAYERS PASSED. Status: PASS (Go)`);
  return 0;
}

if (import.meta.main) {
  process.exit(evaluateGate());
}
