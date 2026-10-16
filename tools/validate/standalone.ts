#!/usr/bin/env node
/**
 * Source of the standalone, zero-install G-Ingá product validator (V1 spec SC4, SC5).
 * `bun run build:validator` bundles it into tools/validate/validate.js, which runs offline on
 * Node >= 22 or Bun with node: built-ins only. tools/validate/validate.ts is the Bun entry of the same bundle.
 *
 *   node tools/validate/validate.js [--root <dir>] [--authoring] [--explain [rule]]
 *   bun tools/validate/validate.ts [--root <dir>] [--authoring] [--explain [rule]]
 *
 * Checks, each reported as pass, fail, blocked or not run:
 *   manifest-integrity  every file in manifest.json exists, lies inside the bundle scope and matches its SHA-256 (SC5)
 *   artifact-records    contract rules and (in full mode) the history walk over tasks/, specs/ and intents/
 *
 * Exit codes (SC4): 0 every executed check passed; 1 a check failed; 2 nothing failed but a check was blocked.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { checkAuthoring, checkHistory, isGitRepo, recordHistory } from "./artifacts/history.ts";
import { parseRecord } from "./artifacts/records.ts";
import { explainRule } from "./artifacts/rules.ts";
import bundle from "./bundle.json" with { type: "json" };

type Status = "pass" | "fail" | "blocked" | "not run";
interface CheckResult {
  name: string;
  status: Status;
  summary: string;
  details: string[];
}

const RECORD_DIRS = ["tasks", "specs", "intents"];
/** Bundle scope (SC5): the only paths a manifest may cover. manifest.json itself is never covered. */
const BUNDLE_SCOPE: string[] = bundle.scope;

function inBundleScope(relPath: string): boolean {
  if (relPath.startsWith("/") || relPath.includes("\\") || relPath.split("/").some((s) => s === ".." || s === "." || s === "")) return false;
  return BUNDLE_SCOPE.some((p) => relPath.startsWith(p) && relPath.length > p.length);
}

function recordsPresent(root: string, mode: "authoring" | "full" = "full"): boolean {
  for (const dir of RECORD_DIRS) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    for (const name of readdirSync(abs).filter((n) => n.endsWith(".md"))) {
      const rec = parseRecord(`${dir}/${name}`, readFileSync(join(abs, name), "utf8"));
      if (/^(task|spec|intent)\/\d+$/.test(String(rec.fm.schema ?? ""))) return true;
    }
  }
  if (mode === "authoring") return false;
  const history = recordHistory(root);
  return history.kind === "some" || (history.kind === "unknown" && history.reason === "shallow");
}

function checkManifestIntegrity(root: string): CheckResult {
  const name = "manifest-integrity";
  const manifestPath = join(root, "manifest.json");
  // The validator ships inside the bundle with its manifest (SC1), so a missing manifest is a missing prerequisite.
  if (!existsSync(manifestPath)) return { name, status: "blocked", summary: "manifest.json not found; bundle integrity can't be checked", details: [] };

  let manifest: { files?: unknown };
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { files?: unknown };
  } catch (err) {
    return { name, status: "fail", summary: `manifest.json doesn't parse: ${err instanceof Error ? err.message : String(err)}`, details: [] };
  }
  const files = manifest.files;
  if (!files || typeof files !== "object" || Array.isArray(files) || Object.keys(files).length === 0)
    return { name, status: "fail", summary: 'manifest.json has no "files" map', details: [] };

  const details: string[] = [];
  for (const [relPath, expected] of Object.entries(files as Record<string, unknown>)) {
    if (relPath === "manifest.json" || !inBundleScope(relPath)) {
      details.push(`${relPath}: outside the bundle scope (${BUNDLE_SCOPE.join(", ")})`);
      continue;
    }
    if (typeof expected !== "string" || !/^[0-9a-f]{64}$/.test(expected)) {
      details.push(`${relPath}: expected hash is not a SHA-256 hex digest`);
      continue;
    }
    const fullPath = join(root, relPath);
    if (!existsSync(fullPath)) {
      details.push(`${relPath}: missing file`);
      continue;
    }
    const actual = createHash("sha256").update(readFileSync(fullPath)).digest("hex");
    if (actual !== expected) details.push(`${relPath}: hash mismatch (expected ${expected}, got ${actual})`);
  }
  const count = Object.keys(files).length;
  return details.length
    ? { name, status: "fail", summary: `${details.length} of ${count} bundle files drifted from manifest.json`, details }
    : { name, status: "pass", summary: `${count} bundle files match manifest.json`, details: [] };
}

function checkRecords(root: string, mode: "authoring" | "full" = "full"): CheckResult {
  const name = "artifact-records";
  if (!recordsPresent(root, mode))
    return {
      name,
      status: "not run",
      summary: mode === "authoring" ? "no task, spec or intent records in working tree" : "no task or spec records, now or in Git history",
      details: [],
    };
  const history = mode === "authoring" ? checkAuthoring(root) : checkHistory(root);
  if ("blocked" in history) return { name, status: "blocked", summary: history.blocked, details: [] };
  const fail = history.findings.filter((f) => f.level === "fail");
  const blocked = history.findings.filter((f) => f.level !== "fail");
  const details = [
    ...fail.map((f) => `fail: ${f.file} ${f.rule} ${f.msg}`),
    ...blocked.map((f) => `blocked: ${f.file} ${f.rule} [${f.level}] ${f.msg}`),
  ];
  if (fail.length) return { name, status: "fail", summary: `${fail.length} failing finding(s)`, details };
  if (blocked.length) return { name, status: "blocked", summary: `${blocked.length} blocked finding(s)`, details };
  return {
    name,
    status: "pass",
    summary: mode === "authoring" ? "authoring snapshot check done (history walk skipped)" : `history walk done; ${history.frozen.length} frozen`,
    details: [],
  };
}

function runValidation(targetRoot: string, mode: "authoring" | "full" = "full"): { code: number; results: CheckResult[] } {
  const root = resolve(targetRoot);
  if (mode === "full" && !isGitRepo(root)) {
    // Both mandatory inputs (history walk, ancestry) need Git; nothing may pass silently without it.
    return { code: 2, results: [{ name: "git", status: "blocked", summary: "not a Git repository", details: [] }] };
  }
  const results = [checkManifestIntegrity(root), checkRecords(root, mode)];
  const code = results.some((r) => r.status === "fail") ? 1 : results.some((r) => r.status === "blocked") ? 2 : 0;
  return { code, results };
}

function main(argv: string[]): number {
  if (argv.includes("--explain")) {
    const idx = argv.indexOf("--explain");
    const ruleArg = argv[idx + 1] && !argv[idx + 1].startsWith("--") ? argv[idx + 1] : undefined;
    const explained = explainRule(ruleArg);
    console.log(explained.output);
    return explained.ok ? 0 : 1;
  }
  const i = argv.indexOf("--root");
  if (i >= 0 && (!argv[i + 1] || argv[i + 1].startsWith("--"))) {
    console.error("blocked: --root needs a directory");
    return 2;
  }
  const mode: "authoring" | "full" = argv.includes("--authoring") ? "authoring" : "full";
  const root = resolve(i >= 0 ? argv[i + 1] : process.cwd());
  console.log(`G-Ingá standalone validator (${root}${mode === "authoring" ? ", authoring mode" : ""})`);
  const { code, results } = runValidation(root, mode);
  for (const r of results) {
    console.log(`  ${r.name.padEnd(20)} ${r.status.padEnd(8)} ${r.summary}`);
    for (const d of r.details) console.log(`    - ${d}`);
  }
  console.log(`\nOverall: ${code === 0 ? "pass" : code === 1 ? "fail" : "blocked"}`);
  return code;
}

process.exit(main(process.argv.slice(2)));
