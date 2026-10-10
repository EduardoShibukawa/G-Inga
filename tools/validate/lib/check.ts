import type { MdFile } from "./markdown.ts";
import type { CheckResult } from "./report.ts";

export interface Context {
  /** Directory under validation. */
  root: string;
  /** Every Markdown file under `root`. No file is assumed to have frontmatter. */
  files: MdFile[];
}

export type Layer = "universal" | "decision records" | "task/spec artifacts";

/**
 * One check. `applies` says whether the target contains what the check validates;
 * when it returns a reason instead of `true`, the check is reported `not run` with that reason.
 */
export interface Check {
  name: string;
  layer: Layer;
  applies: (ctx: Context) => true | string;
  run: (ctx: Context) => CheckResult | Promise<CheckResult>;
}

export async function runChecks(checks: Check[], ctx: Context): Promise<(CheckResult & { layer: Layer })[]> {
  const out: (CheckResult & { layer: Layer })[] = [];
  for (const c of checks) {
    const applies = c.applies(ctx);
    const r: CheckResult = applies === true ? await c.run(ctx) : { name: c.name, status: "not run", summary: applies, findings: [], notRun: [] };
    out.push({ ...r, name: c.name, layer: c.layer });
  }
  return out;
}
