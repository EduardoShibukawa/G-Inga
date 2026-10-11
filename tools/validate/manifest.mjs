import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";

const root = resolve(process.cwd());

function getGitCommit() {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function sha256(filePath) {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

export function generateManifest() {
  const commit = getGitCommit();
  const files = {};

  // 1. .claude/skills/work/**
  const skillsDir = join(root, ".claude/skills/work");
  for (const name of readdirSync(skillsDir)) {
    if (name.endsWith(".md")) {
      const relPath = `.claude/skills/work/${name}`;
      files[relPath] = sha256(join(skillsDir, name));
    }
  }

  // 2. tools/validate/validate.js
  const valJs = join(root, "tools/validate/validate.js");
  files["tools/validate/validate.js"] = sha256(valJs);

  const manifest = {
    release: "1.0.0",
    commit,
    generated_at: new Date().toISOString(),
    files,
  };

  const jsonStr = JSON.stringify(manifest, null, 2) + "\n";
  writeFileSync(join(root, "manifest.json"), jsonStr);
  console.log("manifest.json generated with", Object.keys(files).length, "files");
  return manifest;
}

if (process.argv[1].endsWith("manifest.mjs")) {
  generateManifest();
}
