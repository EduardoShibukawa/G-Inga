export type Status = "pass" | "fail" | "blocked" | "not run";

export interface CheckResult {
  name: string;
  status: Status;
  summary: string;
  /** Problems that make the check `fail` or `blocked`. One line each. */
  findings: string[];
  /** Sub-checks that were skipped and why. Never counted as a pass. */
  notRun: string[];
  /** Validation layer, used to group the summary. */
  layer?: string;
}

export function result(
  name: string,
  findings: string[],
  summary: string,
  extra: { blocked?: string[]; notRun?: string[] } = {},
): CheckResult {
  const blocked = extra.blocked ?? [];
  const status: Status = findings.length > 0 ? "fail" : blocked.length > 0 ? "blocked" : "pass";
  return { name, status, summary, findings: [...findings, ...blocked.map((b) => `blocked: ${b}`)], notRun: extra.notRun ?? [] };
}

export function printReport(results: CheckResult[], out: (line: string) => void = console.log): void {
  for (const r of results) {
    if (r.findings.length === 0 && r.notRun.length === 0) continue;
    out(`\n[${r.name}] ${r.status}`);
    for (const f of r.findings) out(`  - ${f}`);
    for (const n of r.notRun) out(`  - not run: ${n}`);
  }
  out("\nSummary");
  const width = Math.max(...results.map((r) => r.name.length));
  const layers = [...new Set(results.map((r) => r.layer ?? "universal"))];
  for (const layer of layers) {
    out(`  ${layer}`);
    for (const r of results.filter((x) => (x.layer ?? "universal") === layer)) out(`    ${r.name.padEnd(width)}  ${r.status.padEnd(7)}  ${r.summary}`);
  }
  out(`\nOverall: ${overall(results)}`);
}

export function overall(results: CheckResult[]): Status {
  if (results.some((r) => r.status === "fail")) return "fail";
  if (results.some((r) => r.status === "blocked")) return "blocked";
  if (results.every((r) => r.status === "not run")) return "not run";
  return "pass";
}

/** 0 = pass, 1 = a check failed, 2 = nothing failed but a check was blocked. */
export function exitCode(results: CheckResult[]): number {
  const o = overall(results);
  return o === "fail" ? 1 : o === "blocked" ? 2 : 0;
}
