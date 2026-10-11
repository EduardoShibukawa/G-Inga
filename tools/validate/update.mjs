import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execSync } from "node:child_process";

const sourceRoot = resolve(process.cwd());

export function installBundle(targetRoot) {
  const target = resolve(targetRoot);
  console.log(`Installing / updating G-Ingá bundle to: ${target}`);

  const manifestSource = join(sourceRoot, "manifest.json");
  if (!existsSync(manifestSource)) {
    throw new Error("manifest.json not found in G-Ingá root. Run `node tools/validate/manifest.mjs` first.");
  }
  const manifest = JSON.parse(readFileSync(manifestSource, "utf8"));
  const files = manifest.files || {};

  // Atomically copy bundle assets without touching user files (tasks/ or specs/)
  for (const relPath of Object.keys(files)) {
    const src = join(sourceRoot, relPath);
    const dest = join(target, relPath);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest, { force: true });
  }

  // Copy manifest.json itself
  cpSync(manifestSource, join(target, "manifest.json"), { force: true });

  console.log(`Successfully installed ${Object.keys(files).length} bundle assets to ${target}`);
}

if (process.argv[1]?.endsWith("update.mjs")) {
  const dest = process.argv[2] || process.cwd();
  installBundle(dest);
}

