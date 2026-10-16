import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

export interface MdFile {
  /** Repository-relative path with `/` separators. */
  path: string;
  text: string;
  lines: string[];
}

const SKIP_DIRS = new Set([".git", "node_modules"]);

/** Every `.md` file under `root`, except dependency and Git directories. */
export function listMarkdown(root: string): MdFile[] {
  const out: MdFile[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      if (SKIP_DIRS.has(name)) continue;
      const abs = join(dir, name);
      const st = lstatSync(abs);
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) walk(abs);
      else if (name.endsWith(".md")) {
        const text = readFileSync(abs, "utf8");
        out.push({ path: relative(root, abs).split("\\").join("/"), text, lines: text.split("\n") });
      }
    }
  };
  walk(root);
  return out;
}

export interface Fence {
  lang: string;
  /** 1-based line of the opening fence. */
  line: number;
  body: string;
}

/** Fenced code blocks (``` or ~~~), outermost only. */
export function fences(lines: string[]): Fence[] {
  const out: Fence[] = [];
  let open: { marker: string; lang: string; line: number; body: string[] } | null = null;
  lines.forEach((l, i) => {
    const m = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)/.exec(l);
    if (!open) {
      if (m) open = { marker: m[1], lang: m[2] ?? "", line: i + 1, body: [] };
    } else if (m && m[1][0] === open.marker[0] && m[1].length >= open.marker.length && l.trim() === m[1]) {
      out.push({ lang: open.lang, line: open.line, body: open.body.join("\n") });
      open = null;
    } else open.body.push(l);
  });
  return out;
}

/** Lines with fenced code blanked and inline code spans removed, so links in examples are ignored. */
export function proseLines(lines: string[]): string[] {
  const out: string[] = [];
  let marker: string | null = null;
  for (const l of lines) {
    const m = /^ {0,3}(`{3,}|~{3,})/.exec(l);
    if (marker) {
      if (m && m[1][0] === marker[0] && m[1].length >= marker.length && l.trim() === m[1]) marker = null;
      out.push("");
    } else if (m) {
      marker = m[1];
      out.push("");
    } else out.push(l.replace(/(`+)[^`]*?\1/g, ""));
  }
  return out;
}

/** GitHub-style heading anchor. */
export function slug(heading: string): string {
  return heading
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

export interface Heading {
  level: number;
  text: string;
  line: number;
}

export function headings(lines: string[]): Heading[] {
  const out: Heading[] = [];
  proseLines(lines).forEach((l, i) => {
    const m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l);
    // Inline code was stripped by proseLines; read the raw line for the text.
    if (m) {
      const raw = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(lines[i])!;
      out.push({ level: m[1].length, text: raw[2], line: i + 1 });
    }
  });
  return out;
}

export function anchors(lines: string[]): Set<string> {
  const seen = new Map<string, number>();
  const out = new Set<string>();
  for (const h of headings(lines)) {
    const base = slug(h.text);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.add(n === 0 ? base : `${base}-${n}`);
  }
  return out;
}

export interface Link {
  target: string;
  line: number;
  /** Text right after the link, used for `§N` section references. */
  after: string;
}

/** Inline links, images, reference definitions and `<scheme:...>` autolinks outside code. */
export function links(lines: string[]): Link[] {
  const out: Link[] = [];
  proseLines(lines).forEach((l, i) => {
    const inline = /!?\[(?:[^\[\]]|\[[^\]]*\])*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
    for (const m of l.matchAll(inline)) out.push({ target: m[1], line: i + 1, after: l.slice(m.index! + m[0].length) });
    const def = /^ {0,3}\[[^\]]+\]:\s*<?(\S+?)>?(\s|$)/.exec(l);
    if (def) out.push({ target: def[1], line: i + 1, after: "" });
    for (const m of l.matchAll(/<((?:https?|mailto):[^>\s]+)>/g)) out.push({ target: m[1], line: i + 1, after: "" });
  });
  return out;
}

export const isExternal = (target: string) => /^[a-z][a-z0-9+.-]*:/i.test(target);
