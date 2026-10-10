import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { anchors, headings, isExternal, links, proseLines, type MdFile } from "../lib/markdown.ts";
import { result, type CheckResult } from "../lib/report.ts";

/**
 * Deterministic local references only. Never touches the network:
 * - relative links and images resolve to a file or directory inside the repository;
 * - `#anchor` fragments resolve to a heading in the target Markdown file;
 * - `[text](file.md) §N` and `ADR NNNN §N` resolve to a numbered heading, or to item N of an ADR's Decision list;
 * - `ADR NNNN` names an existing record in docs/decisions/.
 */
export function localLinks(root: string, files: MdFile[]): CheckResult {
  const byPath = new Map(files.map((f) => [f.path, f]));
  const anchorCache = new Map<string, Set<string>>();
  const anchorsOf = (p: string) => {
    if (!anchorCache.has(p)) anchorCache.set(p, anchors(byPath.get(p)!.lines));
    return anchorCache.get(p)!;
  };
  const adrs = listAdrs(root);
  const findings: string[] = [];
  let count = 0;

  for (const f of files) {
    for (const l of links(f.lines)) {
      if (isExternal(l.target)) continue;
      count++;
      const where = `${f.path}:${l.line}`;
      const [rawPath, fragment] = splitFragment(l.target);
      let targetPath = f.path;
      if (rawPath) {
        let decoded: string;
        try {
          decoded = decodeURIComponent(rawPath);
        } catch {
          findings.push(`${where} malformed link target "${l.target}"`);
          continue;
        }
        const abs = normalize(join(root, dirname(f.path), decoded));
        const rel = relative(root, abs).split("\\").join("/");
        if (rel.startsWith("..")) {
          findings.push(`${where} link leaves the repository: "${l.target}"`);
          continue;
        }
        if (!existsSync(abs)) {
          findings.push(`${where} broken link: "${l.target}" (no ${rel})`);
          continue;
        }
        if (statSync(abs).isDirectory()) continue;
        targetPath = rel;
      }
      if (fragment !== undefined && targetPath.endsWith(".md") && byPath.has(targetPath)) {
        if (!anchorsOf(targetPath).has(fragment.toLowerCase())) findings.push(`${where} missing anchor "#${fragment}" in ${targetPath}`);
      }
      const section = /^\s*§(\d+(?:\.\d+)*)/.exec(l.after);
      if (section && targetPath.endsWith(".md") && byPath.has(targetPath) && !hasSection(byPath.get(targetPath)!, section[1])) {
        findings.push(`${where} ${targetPath} has no section §${section[1]}`);
      }
    }

    proseLines(f.lines).forEach((line, i) => {
      for (const m of line.matchAll(/\bADR (\d{4})(?: §(\d+(?:\.\d+)*))?/g)) {
        count++;
        const adr = adrs.get(m[1]);
        const where = `${f.path}:${i + 1}`;
        if (!adr) findings.push(`${where} "ADR ${m[1]}" has no record in docs/decisions/`);
        else if (m[2] && byPath.has(adr) && !hasSection(byPath.get(adr)!, m[2])) findings.push(`${where} ADR ${m[1]} has no section §${m[2]}`);
      }
    });
  }
  return result("local-links", findings, `${count} local references in ${files.length} files`);
}

function splitFragment(target: string): [string, string | undefined] {
  const i = target.indexOf("#");
  return i < 0 ? [target, undefined] : [target.slice(0, i), target.slice(i + 1)];
}

/** `§N` is a numbered heading ("### 4. ...", "### 3.4 ...") or, in a decision record, item N of "## Decision". */
function hasSection(f: MdFile, n: string): boolean {
  const re = new RegExp(`^${n.replace(/\./g, "\\.")}(\\.|\\s)`);
  if (headings(f.lines).some((h) => re.test(h.text))) return true;
  if (!f.path.startsWith("docs/decisions/") || n.includes(".")) return false;
  const start = f.lines.findIndex((l) => /^## Decision\b/.test(l));
  if (start < 0) return false;
  const end = f.lines.findIndex((l, i) => i > start && /^## /.test(l));
  return f.lines.slice(start + 1, end < 0 ? undefined : end).some((l) => l.startsWith(`${n}. `));
}

function listAdrs(root: string): Map<string, string> {
  const dir = join(root, "docs/decisions");
  const out = new Map<string, string>();
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const m = /^(\d{4})-.*\.md$/.exec(name);
    if (m) out.set(m[1], `docs/decisions/${name}`);
  }
  return out;
}
