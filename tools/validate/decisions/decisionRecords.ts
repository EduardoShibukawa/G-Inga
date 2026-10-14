import type { Check } from "../lib/check.ts";
import { fences, links, type MdFile } from "../lib/markdown.ts";
import { result, type CheckResult } from "../lib/report.ts";

const MAP = "docs/decision-map.md";
const ADR_RE = /^docs\/decisions\/(\d{4})-[^/]+\.md$/;

/**
 * Cross-document consistency of decisions, limited to rules the docs state explicitly:
 * - status values come from the vocabulary declared in the decision map;
 * - each ADR has a unique number, a numbered H1 and Status, Date and Deciders lines;
 * - each decision-map row has a valid status and resolvable dependencies, and its diagram edges match;
 * - a row that links an ADR has the same status as that ADR, and every ADR is linked from the map;
 * - a document whose Status line cites "decision Dn" carries the same status as row Dn.
 */
export function decisions(files: MdFile[]): CheckResult {
  const findings: string[] = [];
  const map = files.find((f) => f.path === MAP);
  if (!map) return result("decision-records", [], "no decision map", { blocked: [`${MAP} not found`] });

  const vocabLine = map.lines.find((l) => /Status values are/.test(l));
  const vocab = new Set([...(vocabLine ?? "").matchAll(/`([a-z ]+)`/g)].map((m) => m[1]));
  if (vocab.size === 0) findings.push(`${MAP}: no "Status values are ..." vocabulary line`);

  const adrs = new Map<string, { file: MdFile; status?: string }>();
  for (const f of files) {
    const m = ADR_RE.exec(f.path);
    if (!m) continue;
    const status = /^- \*\*Status:\*\* ([a-z ]+?)(?:\s*[(.]|$)/m.exec(f.text)?.[1];
    const dup = adrs.get(m[1]);
    if (dup) findings.push(`${f.path}: ADR number ${m[1]} is already used by ${dup.file.path}`);
    adrs.set(m[1], { file: f, status });
    if (!new RegExp(`^# ${m[1]} — \\S`).test(f.lines[0] ?? "")) findings.push(`${f.path}:1 H1 must start with "# ${m[1]} — "`);
    if (!status) findings.push(`${f.path}: missing "- **Status:** <status>" line`);
    else if (vocab.size && !vocab.has(status)) findings.push(`${f.path}: status "${status}" not in [${[...vocab].join(", ")}]`);
    for (const key of ["Date", "Deciders"]) if (!f.text.includes(`- **${key}:**`)) findings.push(`${f.path}: missing "- **${key}:**" line`);
  }

  const rows = new Map<string, { status: string; deps: string[]; line: number; record: string }>();
  map.lines.forEach((l, i) => {
    const cells = l.split("|").map((c) => c.trim());
    if (cells.length < 5 || !/^[A-Z]\d+$/.test(cells[1])) return;
    // | ID | Decision | Status | Depends on | Record |  or  | ID | Topic | Status | Record |
    const hasDeps = cells.length >= 7;
    rows.set(cells[1], { status: cells[3], deps: hasDeps ? parseDeps(cells[4]) : [], line: i + 1, record: hasDeps ? cells[5] : cells[4] });
  });
  for (const [id, row] of rows) {
    const where = `${MAP}:${row.line} ${id}`;
    if (vocab.size && !vocab.has(row.status)) findings.push(`${where}: status "${row.status}" not in vocabulary`);
    for (const d of row.deps) if (!rows.has(d)) findings.push(`${where}: depends on unknown "${d}"`);
    for (const l of links([row.record])) {
      const num = /decisions\/(\d{4})-/.exec(l.target)?.[1];
      const adr = num ? adrs.get(num) : undefined;
      if (adr?.status && adr.status !== row.status) findings.push(`${where}: map says "${row.status}" but ${adr.file.path} says "${adr.status}"`);
    }
  }
  const linkedFromMap = new Set(links(map.lines).map((l) => /decisions\/(\d{4})-/.exec(l.target)?.[1]).filter(Boolean));
  for (const [num, adr] of adrs) if (!linkedFromMap.has(num)) findings.push(`${adr.file.path}: not linked from ${MAP}`);

  const diagram = fences(map.lines).find((b) => b.lang === "mermaid");
  if (diagram) {
    const edges = new Set<string>();
    for (const m of diagram.body.matchAll(/\b([A-Z]\d+)\b(?:\[[^\]]*\])?\s*-->\s*([A-Z]\d+)\b/g)) edges.add(`${m[1]}->${m[2]}`);
    for (const e of edges) {
      const [from, to] = e.split("->");
      if (rows.has(from) && rows.has(to) && !rows.get(to)!.deps.includes(from)) findings.push(`${MAP}: diagram edge ${from} --> ${to} not in ${to}'s "Depends on"`);
    }
    for (const [id, row] of rows) for (const d of row.deps) if (!edges.has(`${d}->${id}`)) findings.push(`${MAP}: ${id} depends on ${d} but the diagram has no ${d} --> ${id}`);
  }

  for (const f of files) {
    const m = /\*\*Status:\*\* ([a-z]+) \(decision (D\d+)\b/.exec(f.text);
    if (!m) continue;
    const row = rows.get(m[2]);
    if (!row) findings.push(`${f.path}: Status cites unknown decision ${m[2]}`);
    else if (row.status !== m[1]) findings.push(`${f.path}: status "${m[1]}" but ${MAP} has ${m[2]} as "${row.status}"`);
  }

  return result("decision-records", findings, `${adrs.size} ADRs, ${rows.size} map rows`);
}

function parseDeps(cell: string): string[] {
  return cell === "none" ? [] : cell.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Applies when the target has a decision map or decision records. ADRs without a map are `blocked`. */
export const decisionChecks: Check[] = [
  {
    name: "decision-records",
    layer: "decision records",
    applies: (ctx) => ctx.files.some((f) => f.path === MAP || ADR_RE.test(f.path)) || `no ${MAP} or docs/decisions/NNNN-*.md`,
    run: (ctx) => decisions(ctx.files),
  },
];
