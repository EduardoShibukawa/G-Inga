/**
 * Repository validation entry point (development tooling, not the G-Ingá product runtime).
 *
 *   bun tools/validate/main.ts                  required deterministic checks
 *   bun tools/validate/main.ts --external-only  external URL availability only (network)
 *   bun tools/validate/main.ts --root <dir>     validate another directory (used by tests)
 *
 * Checks come in layers: universal ones for any Markdown, then type-specific ones that run
 * only when the target contains what they validate (see docs/development.md).
 * Exit codes: 0 pass, 1 a check failed, 2 nothing failed but a check was blocked.
 * Read-only: no check edits any file.
 */
import { resolve } from "node:path";
import { artifactChecks } from "./artifacts/checks.ts";
import { decisionChecks } from "./decisions/decisionRecords.ts";
import { runChecks, type Context } from "./lib/check.ts";
import { listMarkdown } from "./lib/markdown.ts";
import { exitCode, printReport, type CheckResult } from "./lib/report.ts";
import { externalLinks } from "./universal/externalLinks.ts";
import { universalChecks } from "./universal/index.ts";

const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const root = resolve(rootArg >= 0 ? args[rootArg + 1] : resolve(import.meta.dir, "../.."));
const ctx: Context = { root, files: listMarkdown(root) };

let results: CheckResult[];
if (args.includes("--external-only")) {
  results = [await externalLinks(ctx.files)];
} else {
  results = [
    ...(await runChecks([...universalChecks, ...decisionChecks, ...artifactChecks], ctx)),
    { name: "external-links", status: "not run", summary: "network check; run `mise run validate:external`", findings: [], notRun: [] },
  ];
}
console.log(`G-Ingá repository validation (${root})`);
printReport(results);
process.exit(exitCode(results));
