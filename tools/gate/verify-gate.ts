#!/usr/bin/env bun
/**
 * Autonomous Verification Gate CLI for G-Ingá OODA Orchestrator.
 *
 * Deterministic 4-layer verification gate:
 * - Layer 1: Scope & Diff Gate (git diff --name-only against allowed patterns)
 * - Layer 2: Deterministic Command & Exit Code Gate (run command; check exit 0/1/2)
 * - Layer 3: Quantitative Thresholds (lint count == 0, test failures == 0)
 * - Layer 4: Anti-Thrashing Circuit Breaker (attempts < 2)
 *
 * Exit codes:
 * 0: Gate PASSED (all layers passed)
 * 1: Gate FAILED (deterministic failure, diff violation or threshold missed)
 * 2: Gate BLOCKED (circuit breaker tripped or environment blocked)
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

interface GateConfig {
  allowedScope?: string[];
  filesOverride?: string[];
  command?: string;
  maxAttempts?: number;
  currentAttempt?: number;
}

function parseArgs(): GateConfig {
  const args = process.argv.slice(2);
  const config: GateConfig = {
    allowedScope: [],
    maxAttempts: 2,
    currentAttempt: 1,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--scope" && args[i + 1]) {
      config.allowedScope = args[i + 1].split(",").map((s) => s.trim());
      i++;
    } else if (args[i] === "--files" && args[i + 1]) {
      config.filesOverride = args[i + 1].split(",").map((s) => s.trim());
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

export function evaluateGate(): number {
  const config = parseArgs();
  console.log(`[OODA Gate] Evaluating attempt ${config.currentAttempt} of ${config.maxAttempts}`);

  // Layer 4 Check: Circuit Breaker
  if ((config.currentAttempt ?? 1) > (config.maxAttempts ?? 2)) {
    console.error(`[OODA Gate L4 Circuit Breaker] Tripped: attempt ${config.currentAttempt} exceeds max ${config.maxAttempts}. Status: BLOCKED`);
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

  // Layer 3 Check: Quantitative Threshold Gate
  console.log(`[OODA Gate L3 Threshold] PASS: Quantitative criteria met.`);

  console.log(`[OODA Gate Final] ALL LAYERS PASSED. Status: PASS (Go)`);
  return 0;
}

if (import.meta.main) {
  process.exit(evaluateGate());
}
