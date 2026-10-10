import { existsSync } from "node:fs";
import { join } from "node:path";
import contract from "../d3/transitions.json" with { type: "json" };
import { allCases } from "../d3/fixtures.ts";
import { checkHistory, isGitRepo } from "../d3/history.ts";
import { checkSnapshot, loadSnapshot } from "../d3/rules.ts";
import { fences, type MdFile } from "../lib/markdown.ts";
import { result, type CheckResult } from "../lib/report.ts";

const CONTRACT = "docs/artifact-contracts.md";
const ADR = "docs/decisions/0003-minimum-artifact-schemas.md";

/** transitions.json mirrors the contract: same decision status, same §3.3 diagram edges. */
export function d3Contract(files: MdFile[]): CheckResult {
  const doc = files.find((f) => f.path === CONTRACT);
  const adr = files.find((f) => f.path === ADR);
  if (!doc || !adr) return result("d3-contract", [], "contract docs missing", { blocked: [`${!doc ? CONTRACT : ADR} not found`] });
  const findings: string[] = [];
  const adrStatus = /^- \*\*Status:\*\* ([a-z]+)/m.exec(adr.text)?.[1];
  if (adrStatus !== contract.status) findings.push(`tools/validate/d3/transitions.json says "${contract.status}" but ${ADR} says "${adrStatus}"`);

  const diagram = fences(doc.lines).find((b) => b.lang === "mermaid" && b.body.trimStart().startsWith("stateDiagram"));
  if (!diagram) return result("d3-contract", [...findings, `${CONTRACT}: no stateDiagram found`], "no state diagram");
  const edges = new Set<string>();
  const initial = new Set<string>();
  const final = new Set<string>();
  for (const m of diagram.body.matchAll(/^\s*(\[\*\]|\w+)\s*-->\s*(\[\*\]|\w+)/gm)) {
    if (m[1] === "[*]") initial.add(m[2]);
    else if (m[2] === "[*]") final.add(m[1]);
    else edges.add(`${m[1]} → ${m[2]}`);
  }
  const json = new Set(contract.task.transitions.map(([a, b]) => `${a} → ${b}`));
  for (const e of edges) if (!json.has(e)) findings.push(`${CONTRACT}:${diagram.line} diagram edge ${e} missing from transitions.json`);
  for (const e of json) if (!edges.has(e)) findings.push(`transitions.json edge ${e} not in the ${CONTRACT} §3.3 diagram`);
  const same = (a: Set<string>, b: string[]) => a.size === b.length && b.every((x) => a.has(x));
  if (!same(initial, contract.task.initial)) findings.push(`initial states differ: diagram [${[...initial]}] vs transitions.json [${contract.task.initial}]`);
  if (!same(final, contract.task.final)) findings.push(`final states differ: diagram [${[...final]}] vs transitions.json [${contract.task.final}]`);
  return result("d3-contract", findings, `${edges.size} diagram edges match transitions.json; status ${adrStatus}`, {
    notRun: contract.task.transitions_from_prose.map((t) => `edge ${t.edge.join(" → ")} comes from prose, not the diagram (${t.source.split(":")[0]})`),
  });
}

/** The record examples in the contract (§9) satisfy the contract's own state rules. */
export function d3Examples(files: MdFile[]): CheckResult {
  const doc = files.find((f) => f.path === CONTRACT);
  if (!doc) return result("d3-examples", [], "contract missing", { blocked: [`${CONTRACT} not found`] });
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
  return result("d3-examples", findings.filter((f) => !f.includes("[blocked]") && !f.includes("[ambiguous]")), `${snapshot.size} example records from ${CONTRACT} §9`, {
    blocked: findings.filter((f) => f.includes("[blocked]") || f.includes("[ambiguous]")),
    notRun,
  });
}

/** The contract's own §7.2 test table plus review cases, on isolated fixtures. */
export function d3Fixtures(): CheckResult {
  const findings: string[] = [];
  for (const c of allCases) {
    const { outcome, findings: got } = c.run();
    if (outcome !== c.expect) findings.push(`${c.id} (${c.title}): expected ${c.expect}, got ${outcome}${got.length ? ` — ${got.map((f) => f.msg).join("; ")}` : ""}`);
  }
  return result("d3-fixtures", findings, `${allCases.length} fixtures, ${allCases.length - findings.length} as expected`);
}

/** Real `tasks/` and `specs/` in the repository under validation, if any. */
export function d3Records(root: string): CheckResult {
  if (!existsSync(join(root, "tasks")) && !existsSync(join(root, "specs")))
    return { name: "d3-records", status: "not run", summary: "no tasks/ or specs/ in this repository", findings: [], notRun: [] };
  if (!isGitRepo(root)) return result("d3-records", [], "not checked", { blocked: ["the D3 record checks need a Git repository (§7.1)"] });
  const res = checkHistory(root);
  if ("blocked" in res) return result("d3-records", [], "history walk not run", { blocked: [res.blocked] });
  const fail = res.findings.filter((f) => f.level === "fail").map((f) => `${f.file} ${f.rule} ${f.msg}`);
  const blocked = res.findings.filter((f) => f.level !== "fail").map((f) => `${f.file} ${f.rule} [${f.level}] ${f.msg}`);
  return result("d3-records", fail, `history walk done; ${res.frozen.length} frozen`, { blocked, notRun: res.frozen.map((f) => `frozen (not pass): ${f}`) });
}
