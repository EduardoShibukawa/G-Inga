/**
 * Prerequisite check run by the package.json scripts before anything imports a dependency.
 * Without node_modules, Bun would otherwise auto-install unlocked versions from its global
 * cache, then crash with exit 1, which reads like a failed check.
 *
 *   bun tools/validate/preflight.ts   exit 0 ready, 2 a prerequisite is missing (see docs/development.md)
 *
 * Imports only node: modules, so it runs before `bun install`. mise.toml stays the only pin.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const SETUP = "see docs/development.md#troubleshooting";

export function preflight(repo: string, bunVersion: string): { missing: string[]; warnings: string[] } {
  const pkg = JSON.parse(readFileSync(join(repo, "package.json"), "utf8")) as { devDependencies?: Record<string, string> };
  const absent = Object.keys(pkg.devDependencies ?? {}).filter((d) => !existsSync(join(repo, "node_modules", d, "package.json")));
  const missing = absent.length
    ? [`dependencies not installed (${absent.join(", ")}): run \`mise run setup\`, or \`bun install --frozen-lockfile\`; ${SETUP}`]
    : [];
  const pinned = /^\s*bun\s*=\s*"([^"]+)"/m.exec(readFileSync(join(repo, "mise.toml"), "utf8"))?.[1];
  const warnings =
    pinned && pinned !== bunVersion
      ? [`Bun ${bunVersion} is running, mise.toml pins ${pinned}; results may differ from CI. Use \`mise run ...\`; ${SETUP}`]
      : [];
  return { missing, warnings };
}

if (import.meta.main) {
  const { missing, warnings } = preflight(resolve(import.meta.dir, "../.."), Bun.version);
  for (const w of warnings) console.error(`warning: ${w}`);
  for (const m of missing) console.error(`blocked: ${m}`);
  process.exit(missing.length ? 2 : 0);
}
