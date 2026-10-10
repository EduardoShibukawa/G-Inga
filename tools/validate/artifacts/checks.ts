/**
 * Task/spec artifact checks: the contract in docs/artifact-contracts.md, its examples,
 * the rule fixtures, and real `tasks/` and `specs/` records.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Check, Context } from "../lib/check.ts";
import { fences, type MdFile } from "../lib/markdown.ts";
import { result, type CheckResult } from "../lib/report.ts";
import contract from "./contract.json" with { type: "json" };
import { allCases } from "./fixtures.ts";
import { checkHistory, isGitRepo, recordHistory } from "./history.ts";
import { parseRecord } from "./records.ts";
import { checkSnapshot, loadSnapshot } from "./rules.ts";

const CONTRACT = contract.source;
const DEFINED_BY = contract.defined_by;
const RECORD_DIRS = ["tasks", "specs"];

/** The contract checks apply where the contract document itself is present. */
function contractPresent(ctx: Context): true | string {
  return ctx.files.some((f) => f.path === CONTRACT) || `no ${CONTRACT}`;
}

/**
 * Records apply when any of these holds:
 * - `tasks/` or `specs/` holds a file that declares a `task/N` or `spec/N` schema. Then every `.md` file
 *   there is a record, and one without a known schema is `blocked` (contract §8);
 * - Git history shows such a record was ever committed, so deleting them all still runs the walk, which fails
 *   the deletions (§6.1, §7.1);
 * - the clone is shallow, so history can't rule that out: the walk then reports `blocked` (§7.1).
 * A plain `tasks/` folder of notes, never holding a schema, is left alone.
 */
export function recordsPresent(ctx: Context): true | string {
  for (const dir of RECORD_DIRS) {
    const abs = join(ctx.root, dir);
    if (!existsSync(abs)) continue;
    for (const name of readdirSync(abs).filter((n) => n.endsWith(".md"))) {
      const rec = parseRecord(`${dir}/${name}`, readFileSync(join(abs, name), "utf8"));
      if (/^(task|spec)\/\d+$/.test(String(rec.fm.schema ?? ""))) return true;
    }
  }
  const history = recordHistory(ctx.root);
  if (history.kind === "some" || (history.kind === "unknown" && history.reason === "shallow")) return true;
  if (history.kind === "unknown") return "no task or spec records, and not a Git repository (nothing was ever tracked)";
  return "no task or spec records, now or in Git history";
}

/** contract.json mirrors the contract document: same status as its defining ADR, same state-diagram edges. */
export function contractSync(files: MdFile[]): CheckResult {
  const name = "artifact-contract-sync";
  const doc = files.find((f) => f.path === CONTRACT)!;
  const adr = files.find((f) => f.path === DEFINED_BY);
  const findings: string[] = [];
  const adrStatus = adr && /^- \*\*Status:\*\* ([a-z]+)/m.exec(adr.text)?.[1];
  if (!adr) findings.push(`contract.json names ${DEFINED_BY} as its defining record, but it doesn't exist`);
  else if (adrStatus !== contract.status) findings.push(`tools/validate/artifacts/contract.json says "${contract.status}" but ${DEFINED_BY} says "${adrStatus}"`);

  const diagram = fences(doc.lines).find((b) => b.lang === "mermaid" && b.body.trimStart().startsWith("stateDiagram"));
  if (!diagram) return result(name, [...findings, `${CONTRACT}: no stateDiagram found`], "no state diagram");
  const edges = new Set<string>();
  const initial = new Set<string>();
  const final = new Set<string>();
  for (const m of diagram.body.matchAll(/^\s*(\[\*\]|\w+)\s*-->\s*(\[\*\]|\w+)/gm)) {
    if (m[1] === "[*]") initial.add(m[2]);
    else if (m[2] === "[*]") final.add(m[1]);
    else edges.add(`${m[1]} → ${m[2]}`);
  }
  const json = new Set(contract.task.transitions.map(([a, b]) => `${a} → ${b}`));
  for (const e of edges) if (!json.has(e)) findings.push(`${CONTRACT}:${diagram.line} diagram edge ${e} missing from contract.json`);
  for (const e of json) if (!edges.has(e)) findings.push(`contract.json edge ${e} not in the ${CONTRACT} state diagram`);
  const same = (a: Set<string>, b: string[]) => a.size === b.length && b.every((x) => a.has(x));
  if (!same(initial, contract.task.initial)) findings.push(`initial states differ: diagram [${[...initial]}] vs contract.json [${contract.task.initial}]`);
  if (!same(final, contract.task.final)) findings.push(`final states differ: diagram [${[...final]}] vs contract.json [${contract.task.final}]`);
  return result(name, findings, `${edges.size} diagram edges match contract.json; status ${adrStatus}`, {
    notRun: contract.task.transitions_from_prose.map((t) => `edge ${t.edge.join(" → ")} comes from prose, not the diagram (${t.source.split(":")[0]})`),
  });
}

/** The record examples in the contract (§9) satisfy the contract's own state rules. */
export function contractExamples(files: MdFile[]): CheckResult {
  const doc = files.find((f) => f.path === CONTRACT)!;
  const records = new Map<string, string>();
  for (const b of fences(doc.lines).filter((b) => b.lang === "markdown" && /^---\nschema:/.test(b.body))) {
    let path: string | undefined;
    for (let i = b.line - 2; i >= 0 && !path; i--) path = /`((?:tasks|specs)\/[^`]+\.md)`/.exec(doc.lines[i])?.[1];
    if (path) records.set(path, b.body + "\n");
  }
  const snapshot = loadSnapshot(records);
  const all = checkSnapshot(snapshot, { ancestry: () => undefined });
  const notRun = all.filter((f) => f.level === "blocked" && /ancestor/.test(f.msg)).map((f) => `${f.file}: ${f.msg}`);
  const findings = all.filter((f) => !notRun.includes(`${f.file}: ${f.msg}`)).map((f) => `${f.file} ${f.rule} [${f.level}] ${f.msg}`);
  for (const r of snapshot.values())
    if (String(r.fm.approved_hash ?? "").startsWith("sha256:<")) notRun.push(`${r.path}: approved_hash is a placeholder in the example, body hash not compared`);
  return result("artifact-contract-examples", findings.filter((f) => !f.includes("[blocked]") && !f.includes("[ambiguous]")), `${snapshot.size} example records from ${CONTRACT} §9`, {
    blocked: findings.filter((f) => f.includes("[blocked]") || f.includes("[ambiguous]")),
    notRun,
  });
}

/** The contract's §7.2 test table plus review cases, on isolated fixtures. */
export function ruleFixtures(): CheckResult {
  const findings: string[] = [];
  for (const c of allCases) {
    const { outcome, findings: got } = c.run();
    if (outcome !== c.expect) findings.push(`${c.id} (${c.title}): expected ${c.expect}, got ${outcome}${got.length ? ` — ${got.map((f) => f.msg).join("; ")}` : ""}`);
  }
  return result("artifact-rule-fixtures", findings, `${allCases.length} fixtures, ${allCases.length - findings.length} as expected`);
}

/** Real records under `tasks/` and `specs/`: current state rules plus the Git history walk. */
export function records(root: string): CheckResult {
  const name = "artifact-records";
  if (!isGitRepo(root)) return result(name, [], "not checked", { blocked: ["record checks need a Git repository (contract §7.1)"] });
  const res = checkHistory(root);
  if ("blocked" in res) return result(name, [], "history walk not run", { blocked: [res.blocked] });
  const fail = res.findings.filter((f) => f.level === "fail").map((f) => `${f.file} ${f.rule} ${f.msg}`);
  const blocked = res.findings.filter((f) => f.level !== "fail").map((f) => `${f.file} ${f.rule} [${f.level}] ${f.msg}`);
  return result(name, fail, `history walk done; ${res.frozen.length} frozen`, { blocked, notRun: res.frozen.map((f) => `frozen (not pass): ${f}`) });
}

export const artifactChecks: Check[] = [
  { name: "artifact-contract-sync", layer: "task/spec artifacts", applies: contractPresent, run: (ctx) => contractSync(ctx.files) },
  { name: "artifact-contract-examples", layer: "task/spec artifacts", applies: contractPresent, run: (ctx) => contractExamples(ctx.files) },
  { name: "artifact-rule-fixtures", layer: "task/spec artifacts", applies: contractPresent, run: () => ruleFixtures() },
  { name: "artifact-records", layer: "task/spec artifacts", applies: recordsPresent, run: (ctx) => records(ctx.root) },
];
