#!/usr/bin/env node
/**
 * Standalone zero-install runtime validator for G-Ingá SDLC harness.
 * Validates tasks/ and specs/ artifact contracts offline (Node 22+ / Bun compatible).
 * Verifies manifest.json integrity if present (SC5).
 *
 * Exit codes (SC4):
 *   0: All executed checks pass (with non-applicable checks not run).
 *   1: At least one check failed.
 *   2: No failures, but at least one mandatory or applicable check is blocked.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { checkSnapshot, loadSnapshot } from "./artifacts/rules.ts";
import { checkHistory, isGitRepo, recordHistory } from "./artifacts/history.ts";
import { parseRecord } from "./artifacts/records.ts";

const RECORD_DIRS = ["tasks", "specs"];

function recordsPresent(root) {
  for (const dir of RECORD_DIRS) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    for (const name of readdirSync(abs).filter((n) => n.endsWith(".md"))) {
      const rec = parseRecord(`${dir}/${name}`, readFileSync(join(abs, name), "utf8"));
      if (/^(task|spec)\/\d+$/.test(String(rec.fm.schema ?? ""))) return true;
    }
  }
  const history = recordHistory(root);
  if (history.kind === "some" || (history.kind === "unknown" && history.reason === "shallow")) return true;
  return false;
}

function checkManifestIntegrity(root) {
  const manifestPath = join(root, "manifest.json");
  if (!existsSync(manifestPath)) return { status: "not run", reason: "no manifest.json" };

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const files = manifest.files || {};
    const mismatches = [];

    for (const [relPath, expectedHash] of Object.entries(files)) {
      const fullPath = join(root, relPath);
      if (!existsSync(fullPath)) {
        mismatches.push(`${relPath}: missing file`);
        continue;
      }
      const actualHash = createHash("sha256").update(readFileSync(fullPath)).digest("hex");
      if (actualHash !== expectedHash) {
        mismatches.push(`${relPath}: hash mismatch (expected ${expectedHash}, got ${actualHash})`);
      }
    }

    if (mismatches.length > 0) {
      return { status: "fail", mismatches };
    }
    return { status: "pass", count: Object.keys(files).length };
  } catch (err) {
    return { status: "blocked", reason: `failed to parse manifest.json: ${err.message}` };
  }
}

function runValidation(targetRoot) {
  const root = resolve(targetRoot || process.cwd());
  console.log(`G-Ingá standalone validator (${root})`);

  if (!isGitRepo(root)) {
    console.error("blocked: not a Git repository");
    return 2;
  }

  // Preflight manifest check (SC5)
  const manifestCheck = checkManifestIntegrity(root);
  if (manifestCheck.status === "fail") {
    for (const m of manifestCheck.mismatches) {
      console.error(`fail: manifest integrity drift: ${m}`);
    }
    return 1;
  }
  if (manifestCheck.status === "blocked") {
    console.error(`blocked: manifest integrity: ${manifestCheck.reason}`);
    return 2;
  }

  const hasRecords = recordsPresent(root);
  if (!hasRecords) {
    console.log("universal checks: pass (no tasks or specs found)");
    return 0;
  }

  const historyResult = checkHistory(root);
  if ("blocked" in historyResult) {
    console.error(`blocked: ${historyResult.blocked}`);
    return 2;
  }

  const fail = historyResult.findings.filter((f) => f.level === "fail");
  const blocked = historyResult.findings.filter((f) => f.level !== "fail");

  for (const f of fail) {
    console.error(`fail: ${f.file} ${f.rule} ${f.msg}`);
  }
  for (const b of blocked) {
    console.error(`blocked: ${b.file} ${b.rule} [${b.level}] ${b.msg}`);
  }

  if (fail.length > 0) {
    console.log(`\nResult: fail (${fail.length} issue(s))`);
    return 1;
  }

  if (blocked.length > 0) {
    console.log(`\nResult: blocked (${blocked.length} issue(s))`);
    return 2;
  }

  console.log(`\nResult: pass (${historyResult.frozen.length} frozen, all active checks passed)`);
  return 0;
}

const targetDir = process.argv[2] === "--root" ? process.argv[3] : process.cwd();
const code = runValidation(targetDir);
process.exit(code);
