import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { lint } from "markdownlint/promise";
import { parse as parseJsonc } from "../lib/jsonc.ts";
import type { MdFile } from "../lib/markdown.ts";
import { result, type CheckResult } from "../lib/report.ts";

/**
 * Briefs are background input kept as received (CLAUDE.md), so they are link-checked
 * but not style-linted: fixing their style would edit source material.
 */
export const LINT_EXCLUDED = [/^docs\/briefs\//];

export async function markdownLint(root: string, files: MdFile[]): Promise<CheckResult> {
  const configPath = join(root, ".markdownlint.jsonc");
  const config = existsSync(configPath) ? parseJsonc(readFileSync(configPath, "utf8")) : { default: true };
  const targets = files.filter((f) => !LINT_EXCLUDED.some((re) => re.test(f.path)));
  const strings = Object.fromEntries(targets.map((f) => [f.path, f.text]));
  const res = await lint({ strings, config });
  const findings: string[] = [];
  for (const [path, errors] of Object.entries(res)) {
    for (const e of errors) {
      findings.push(`${path}:${e.lineNumber} ${e.ruleNames.join("/")} ${e.ruleDescription}${e.errorDetail ? ` (${e.errorDetail})` : ""}`);
    }
  }
  const skipped = files.length - targets.length;
  return result("markdown-lint", findings, `${targets.length} files, ${findings.length} issues`, {
    notRun: skipped ? [`${skipped} file(s) under docs/briefs/ (verbatim inputs) are not style-linted`] : [],
  });
}
