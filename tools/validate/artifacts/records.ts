import { createHash } from "node:crypto";
import { parse as parseYaml } from "yaml";
import contract from "./contract.json" with { type: "json" };

export type Kind = "task" | "spec";

export interface Row {
  id: string;
  kind: string;
  result: string;
  /** First token of the Ref column: the commit SHA. */
  sha: string;
  note: string;
}

export interface LogEntry {
  keyword: string;
  text: string;
}

export interface Artifact {
  id: string;
  kind: Kind;
  path: string;
  fm: { [key: string]: unknown };
  /** Frontmatter could not be parsed or has no known schema. */
  unreadable?: string;
  body: string;
  sections: Map<string, string>;
  log: LogEntry[];
  rows: Row[];
}

export const RESULTS = new Set(contract.results);

/** `tasks/<id>.md` or `specs/<id>.md` → parsed record. */
export function parseRecord(path: string, text: string): Artifact {
  const kind: Kind = path.startsWith("specs/") ? "spec" : "task";
  const id = path.replace(/^.*\//, "").replace(/\.md$/, "");
  const norm = text.replace(/\r\n/g, "\n");
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(norm);
  const rec: Artifact = { id, kind, path, fm: {}, body: "", sections: new Map(), log: [], rows: [] };
  if (!m) {
    rec.unreadable = "no YAML frontmatter";
    rec.body = norm;
  } else {
    rec.body = norm.slice(m[0].length);
    try {
      rec.fm = (parseYaml(m[1]) as Artifact["fm"]) ?? {};
    } catch (e) {
      rec.unreadable = `frontmatter is not valid YAML: ${(e as Error).message.split("\n")[0]}`;
    }
  }
  let current: string | null = null;
  let fence = false;
  for (const line of rec.body.split("\n")) {
    if (/^(```|~~~)/.test(line)) fence = !fence;
    const h = !fence && /^## (.+?)\s*$/.exec(line);
    if (h) {
      current = h[1];
      rec.sections.set(current, "");
    } else if (current) rec.sections.set(current, rec.sections.get(current) + line + "\n");
  }
  for (const line of (rec.sections.get("Routing and approvals") ?? "").split("\n")) {
    const e = /^[-*] ([a-z-]+):\s*(.*)$/.exec(line.trim());
    if (e) rec.log.push({ keyword: e[1], text: e[2] });
  }
  for (const line of (rec.sections.get("Verification") ?? "").split("\n")) {
    const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    const kindMatch = /^(AC|SC|B|R|V)\d+$/.exec(cells[0] ?? "");
    if (!kindMatch || cells.length < 4) continue;
    rec.rows.push({ id: cells[0], kind: kindMatch[1], result: cells[2], sha: (cells[3] ?? "").split(/\s+/)[0], note: cells[4] ?? "" });
  }
  return rec;
}

/**
 * Spec body hash (§4.3): every line after the closing `---` of the frontmatter, LF endings,
 * matching `awk 'n >= 2 { print } /^---$/ { n++ }' | sha256sum` (each line newline-terminated).
 */
export function bodyHash(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();
  let n = 0;
  const out: string[] = [];
  for (const l of lines) {
    if (n >= 2) out.push(l + "\n");
    if (l === "---") n++;
  }
  return "sha256:" + createHash("sha256").update(out.join("")).digest("hex");
}

/** Target tier of a routing entry, or undefined if the entry doesn't set the tier. */
export function tierOf(e: LogEntry): string | undefined {
  if (e.keyword === "tier") return /^(\w+)/.exec(e.text)?.[1];
  if (e.keyword === "escalated" || e.keyword === "downgraded") return /^\w+\s*(?:→|->)\s*(\w+)/.exec(e.text)?.[1];
  if (e.keyword === "override") return /owner ordered (\w+)/.exec(e.text)?.[1];
  return undefined;
}

export function specRef(rec: Artifact): { id: string; version: number } | undefined {
  const v = rec.fm.spec;
  const m = typeof v === "string" ? /^(.+)@(\d+)$/.exec(v) : null;
  return m ? { id: m[1], version: Number(m[2]) } : undefined;
}

export const str = (v: unknown) => (typeof v === "string" ? v : v === undefined || v === null ? undefined : String(v));
