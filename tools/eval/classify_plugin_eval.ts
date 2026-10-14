#!/usr/bin/env bun
/**
 * Deterministic post-run classifier for `claude plugin eval --json` results
 * (spec 2026-10-13-skill-health-evaluation SC7, ADR 0008).
 *
 * The CLI's own `passed` flag can be true for a run that ended with an error
 * (for example "Reached maximum number of turns"), and negative graders pass on
 * an empty trace. This classifier maps every case and arm to the repository
 * vocabulary instead, with no model call:
 *
 * - `not run`: the result file is missing or unreadable, or an arm has no runs.
 * - `blocked`: a run carries an `error`, the suite is `partial`, a run lacks a
 *   score, or a grader named as environment-blocked failed.
 * - `fail`: a complete run with no error that the CLI scored as not passed.
 * - `pass`: a complete run with no error that the CLI scored as passed, in a
 *   suite that is not partial.
 *
 * A pass never survives an error, a partial suite or a missing run.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type Verdict = "pass" | "fail" | "blocked" | "not run";

export interface GraderResult {
  name: string;
  passed: boolean;
  scored?: boolean;
}

export interface RunResult {
  score?: number | null;
  passed?: boolean | null;
  costUsd?: number;
  judgeCostUsd?: number;
  error?: string | null;
  tracePath?: string | null;
  graders?: GraderResult[];
}

export interface CaseResult {
  name: string;
  arms: Record<string, RunResult[] | undefined>;
}

export interface PluginEvalResult {
  costUsd?: number;
  partial?: boolean;
  partialReason?: string | null;
  cases?: CaseResult[];
}

/** A grader whose failure reflects the eval environment, not the skill: `<case>:<grader>`. */
export type EnvBlockedGrader = { caseName: string; grader: string };

export interface RunVerdict {
  verdict: Verdict;
  reason: string;
}

export interface ArmVerdict {
  arm: string;
  verdict: Verdict;
  runs: RunVerdict[];
}

export interface CaseVerdict {
  name: string;
  skill: string;
  /** Verdict of the `with` arm (the plugin under test); other arms are comparisons. */
  verdict: Verdict;
  arms: ArmVerdict[];
}

export type Counts = Record<Verdict, number>;

export interface Classification {
  verdict: Verdict;
  reason: string;
  partial: boolean;
  agentCostUsd: number;
  judgeCostUsd: number;
  cases: CaseVerdict[];
  bySkill: Record<string, Counts>;
}

const emptyCounts = (): Counts => ({ pass: 0, fail: 0, blocked: 0, "not run": 0 });

export function parseEnvBlocked(spec: string): EnvBlockedGrader {
  const idx = spec.indexOf(":");
  if (idx <= 0 || idx === spec.length - 1) {
    throw new Error(`invalid --env-blocked value "${spec}" (expected <case>:<grader>)`);
  }
  return { caseName: spec.slice(0, idx), grader: spec.slice(idx + 1) };
}

export function classifyRun(
  run: RunResult,
  caseName: string,
  partial: boolean,
  envBlocked: EnvBlockedGrader[] = [],
): RunVerdict {
  if (run.error) return { verdict: "blocked", reason: `run error: ${run.error}` };
  if (typeof run.passed !== "boolean" || typeof run.score !== "number") {
    return { verdict: "blocked", reason: "run has no score (did not complete)" };
  }
  const blockedGraders = (run.graders ?? []).filter(
    (g) => !g.passed && envBlocked.some((e) => e.caseName === caseName && e.grader === g.name),
  );
  if (blockedGraders.length > 0) {
    const names = blockedGraders.map((g) => g.name).join(", ");
    return { verdict: "blocked", reason: `environment-blocked grader failed: ${names}` };
  }
  if (partial) return { verdict: "blocked", reason: "suite is partial; a pass is not accepted" };
  return run.passed
    ? { verdict: "pass", reason: "complete run, passed" }
    : { verdict: "fail", reason: "complete run, not passed" };
}

/** Combine run verdicts: no runs -> not run; any fail -> fail; any blocked/not run -> blocked; else pass. */
export function combine(verdicts: Verdict[]): Verdict {
  if (verdicts.length === 0) return "not run";
  if (verdicts.includes("fail")) return "fail";
  if (verdicts.includes("blocked") || verdicts.includes("not run")) return "blocked";
  return "pass";
}

export function skillOf(caseName: string): string {
  return caseName.split("-")[0] ?? caseName;
}

export function classifyResult(
  result: PluginEvalResult,
  envBlocked: EnvBlockedGrader[] = [],
): Classification {
  const partial = result.partial === true;
  const cases: CaseVerdict[] = [];
  const bySkill: Record<string, Counts> = {};
  let judgeCostUsd = 0;

  for (const c of result.cases ?? []) {
    const armNames = Object.keys(c.arms ?? {});
    if (!armNames.includes("with")) armNames.unshift("with");
    const arms: ArmVerdict[] = armNames.map((arm) => {
      const runs = (c.arms?.[arm] ?? []).map((r) => {
        judgeCostUsd += r.judgeCostUsd ?? 0;
        return classifyRun(r, c.name, partial, envBlocked);
      });
      return { arm, verdict: combine(runs.map((r) => r.verdict)), runs };
    });
    const verdict = arms.find((a) => a.arm === "with")!.verdict;
    const skill = skillOf(c.name);
    cases.push({ name: c.name, skill, verdict, arms });
    (bySkill[skill] ??= emptyCounts())[verdict]++;
  }

  const overall = combine(cases.map((c) => c.verdict));
  let reason = `${cases.length} cases`;
  if (cases.length === 0) reason = "result has no cases";
  if (partial) reason += `; suite partial (${result.partialReason ?? "no reason given"})`;

  return {
    verdict: overall,
    reason,
    partial,
    agentCostUsd: result.costUsd ?? 0,
    judgeCostUsd,
    cases,
    bySkill,
  };
}

/** Read a result file; a missing or unreadable file yields an overall `not run`. */
export function classifyFile(path: string, envBlocked: EnvBlockedGrader[] = []): Classification {
  let parsed: PluginEvalResult;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    return {
      verdict: "not run",
      reason: `result unreadable: ${path} (${(e as Error).message.split("\n")[0]})`,
      partial: false,
      agentCostUsd: 0,
      judgeCostUsd: 0,
      cases: [],
      bySkill: {},
    };
  }
  return classifyResult(parsed, envBlocked);
}

/**
 * Workspace kept by `--keep-temp` for a run: the trace lives at
 * `<tmp>/out/trace.jsonl` and the sandbox working directory at `<tmp>/sealed/home/cwd`.
 */
export function keptWorkspace(run: RunResult): string | null {
  if (!run.tracePath) return null;
  const ws = join(dirname(dirname(run.tracePath)), "sealed", "home", "cwd");
  return existsSync(ws) ? ws : null;
}

export function exitCodeFor(v: Verdict): number {
  return v === "pass" ? 0 : v === "fail" ? 1 : 2;
}

export function formatClassification(label: string, c: Classification): string {
  const lines = [`classify ${label}: ${c.verdict} (${c.reason})`];
  lines.push(`  cost: agent $${c.agentCostUsd.toFixed(4)} (CLI ceiling scope) + judge $${c.judgeCostUsd.toFixed(4)} (outside the CLI ceiling)`);
  for (const [skill, n] of Object.entries(c.bySkill)) {
    lines.push(`  ${skill}: pass ${n.pass}, fail ${n.fail}, blocked ${n.blocked}, not run ${n["not run"]}`);
  }
  for (const k of c.cases) {
    const arms = k.arms
      .map((a) => `${a.arm}=${a.verdict}${a.runs.length ? ` [${a.runs.map((r) => r.reason).join("; ")}]` : ""}`)
      .join(" ");
    lines.push(`  ${k.verdict.padEnd(7)} ${k.name}: ${arms}`);
  }
  return lines.join("\n");
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const usage = `Usage:
  bun tools/eval/classify_plugin_eval.ts <result.json> [--label <name>] [--env-blocked <case>:<grader>]... [--out <verdict.json>]
  bun tools/eval/classify_plugin_eval.ts <result.json> --workspace <case>
Exit: 0 pass, 1 fail, 2 blocked or not run. --workspace prints the kept workspace of the case's first with-arm run.`;
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(usage);
    process.exit(0);
  }
  const file = args[0]!;
  const envBlocked: EnvBlockedGrader[] = [];
  let label = file;
  let out: string | null = null;
  let workspaceCase: string | null = null;
  for (let i = 1; i < args.length; i++) {
    const flag = args[i];
    const value = args[++i];
    if (value === undefined) {
      console.error(`missing value for ${flag}\n${usage}`);
      process.exit(2);
    }
    if (flag === "--env-blocked") envBlocked.push(parseEnvBlocked(value));
    else if (flag === "--label") label = value;
    else if (flag === "--out") out = value;
    else if (flag === "--workspace") workspaceCase = value;
    else {
      console.error(`unknown flag ${flag}\n${usage}`);
      process.exit(2);
    }
  }

  if (workspaceCase !== null) {
    let ws: string | null = null;
    try {
      const parsed: PluginEvalResult = JSON.parse(readFileSync(file, "utf8"));
      const run = parsed.cases?.find((c) => c.name === workspaceCase)?.arms?.with?.[0];
      ws = run ? keptWorkspace(run) : null;
    } catch {
      ws = null;
    }
    if (!ws) process.exit(2);
    console.log(ws);
    process.exit(0);
  }

  const c = classifyFile(file, envBlocked);
  console.log(formatClassification(label, c));
  if (out) await Bun.write(out, JSON.stringify(c, null, 2) + "\n");
  process.exit(exitCodeFor(c.verdict));
}
