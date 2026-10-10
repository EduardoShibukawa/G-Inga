/**
 * Repository validation entry point (development tooling, not the G-Ingá product runtime).
 *
 *   bun tools/validate/main.ts                  required deterministic checks
 *   bun tools/validate/main.ts --external-only  external URL availability only (network)
 *   bun tools/validate/main.ts --root <dir>     validate another directory (used by tests)
 *
 * Exit codes: 0 pass, 1 a check failed, 2 nothing failed but a check was blocked.
 * Read-only: no check edits any file.
 */
import { resolve } from "node:path";
import { d3Contract, d3Examples, d3Fixtures, d3Records } from "./checks/d3.ts";
import { decisions } from "./checks/decisions.ts";
import { externalLinks } from "./checks/externalLinks.ts";
import { localLinks } from "./checks/localLinks.ts";
import { markdownLint } from "./checks/markdownLint.ts";
import { mermaid } from "./checks/mermaid.ts";
import { listMarkdown } from "./lib/markdown.ts";
import { exitCode, printReport, type CheckResult } from "./lib/report.ts";

const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const root = resolve(rootArg >= 0 ? args[rootArg + 1] : resolve(import.meta.dir, "../.."));
const files = listMarkdown(root);

let results: CheckResult[];
if (args.includes("--external-only")) {
  results = [await externalLinks(files)];
} else {
  const isRepo = files.some((f) => f.path === "docs/artifact-contracts.md");
  results = [
    await markdownLint(root, files),
    localLinks(root, files),
    await mermaid(files),
    decisions(files),
    ...(isRepo ? [d3Contract(files), d3Examples(files), d3Fixtures()] : []),
    d3Records(root),
    { name: "external-links", status: "not run", summary: "network check; run `mise run validate:external`", findings: [], notRun: [] },
  ];
}
console.log(`G-Ingá repository validation (${root})`);
printReport(results);
process.exit(exitCode(results));
