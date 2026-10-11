#!/usr/bin/env node
/**
 * Builds or checks the bundle's copy of the artifact contract (task 2026-10-11-minimal-v1-specification-04).
 * Source-repository utility: `docs/artifact-contracts.md` stays the canonical text in G-Ingá; the bundle delivers
 * `.claude/skills/work/references/artifact-contracts.md` so a target repository has the contract `/work` cites.
 *
 *   bun tools/validate/contract-copy.mjs           write the copy from the canonical file
 *   bun tools/validate/contract-copy.mjs --check   exit 0 when the copy is current, 1 when it drifted or is missing
 *
 * The transform is deterministic and documented in the copy's own header:
 *  1. prepend HEADER (one HTML comment naming the source and saying the file is a generated copy);
 *  2. prefix every relative Markdown link target with LINK_PREFIX, so a link that resolved from docs/ resolves
 *     from the copy's directory inside a G-Ingá checkout. Absolute URLs and `#anchor` links are left as they are.
 * Every other byte is the canonical text. `mise run validate` reports drift as `artifact-contract-copy`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const CONTRACT_SOURCE = "docs/artifact-contracts.md";
export const CONTRACT_COPY = ".claude/skills/work/references/artifact-contracts.md";
export const LINK_PREFIX = "../../../../docs/";
export const HEADER =
  `<!-- Generated copy of ${CONTRACT_SOURCE} from G-Ingá, delivered in the /work bundle. Do not edit: ` +
  `change the canonical file and run \`bun tools/validate/contract-copy.mjs\`. Transform: this comment is added ` +
  `and relative link targets are prefixed with ${LINK_PREFIX}, which resolves only in a G-Ingá checkout. -->\n`;

/** The copy for a given canonical text. Pure: same input, same bytes. */
export function renderContractCopy(canonical) {
  const body = canonical.replace(/\]\(([^)\s]+)\)/g, (whole, target) => (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(target) ? whole : `](${LINK_PREFIX}${target})`));
  return HEADER + body;
}

/** Compares the committed copy with the transform of the canonical file. Returns findings; empty means current. */
export function checkContractCopy(root = resolve(HERE, "../..")) {
  const src = join(root, CONTRACT_SOURCE);
  const copy = join(root, CONTRACT_COPY);
  if (!existsSync(src)) return [`${CONTRACT_SOURCE} is missing`];
  if (!existsSync(copy)) return [`${CONTRACT_COPY} is missing; run \`bun tools/validate/contract-copy.mjs\``];
  const expected = renderContractCopy(readFileSync(src, "utf8"));
  const actual = readFileSync(copy, "utf8");
  if (actual === expected) return [];
  const a = actual.split("\n");
  const e = expected.split("\n");
  let line = 0;
  while (line < a.length && line < e.length && a[line] === e[line]) line++;
  return [`${CONTRACT_COPY}:${line + 1} differs from the transform of ${CONTRACT_SOURCE}; run \`bun tools/validate/contract-copy.mjs\``];
}

export function writeContractCopy(root = resolve(HERE, "../..")) {
  const out = join(root, CONTRACT_COPY);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, renderContractCopy(readFileSync(join(root, CONTRACT_SOURCE), "utf8")));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--check")) {
    const findings = checkContractCopy();
    for (const f of findings) console.error(f);
    console.log(findings.length ? "contract copy: fail" : "contract copy: pass");
    process.exit(findings.length ? 1 : 0);
  }
  writeContractCopy();
  console.log(`wrote ${CONTRACT_COPY}`);
}
