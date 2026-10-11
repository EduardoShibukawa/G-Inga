#!/usr/bin/env node
/**
 * Generates or checks manifest.json, the bundle's integrity manifest (V1 spec SC5). Source-repository utility.
 *
 *   bun tools/validate/manifest.mjs           write manifest.json for the committed bundle at HEAD
 *   bun tools/validate/manifest.mjs --check   verify the committed manifest's provenance (exit 0 pass, 1 fail, 2 blocked)
 *
 * `commit` semantics (docs/bundle.md): the G-Ingá commit whose tree holds every listed asset with exactly the
 * listed SHA-256. A manifest can't name the commit that contains it, so the protocol takes two commits:
 *  1. commit the bundle assets (commit C);
 *  2. run this script at C with those assets unmodified in the working tree; it hashes the blobs of C and writes
 *     `commit: C`; then commit manifest.json alone (commit M, a descendant of C).
 * `--check` proves the result: C exists, is HEAD or an ancestor of HEAD, and its blobs, the working tree and the
 * manifest agree for exactly the assets bundle.json lists. A squash merge that drops C from history fails the check.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUNDLE = JSON.parse(readFileSync(join(HERE, "bundle.json"), "utf8"));

function git(root, args) {
  const p = spawnSync("git", args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
  return { ok: p.status === 0, status: p.status, out: p.stdout ?? Buffer.alloc(0) };
}
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
/** Raw bytes of `rel` at `rev`, or undefined when absent. */
function blob(root, rev, rel) {
  const r = git(root, ["cat-file", "blob", `${rev}:${rel}`]);
  return r.ok ? r.out : undefined;
}

export function generateManifest(root = resolve(HERE, "../..")) {
  const head = git(root, ["rev-parse", "--verify", "HEAD"]);
  if (!head.ok) throw new Error("not a Git repository with a commit; commit the bundle assets first");
  const commit = head.out.toString().trim();
  const files = {};
  const problems = [];
  for (const rel of BUNDLE.assets) {
    const committed = blob(root, commit, rel);
    if (!committed) {
      problems.push(`${rel}: not committed at HEAD`);
      continue;
    }
    const abs = join(root, rel);
    if (!existsSync(abs) || !readFileSync(abs).equals(committed)) {
      problems.push(`${rel}: working tree differs from HEAD`);
      continue;
    }
    files[rel] = sha256(committed);
  }
  if (problems.length) throw new Error(`commit the bundle assets before generating the manifest:\n  ${problems.join("\n  ")}`);
  const manifest = { release: BUNDLE.release, commit, files };
  writeFileSync(join(root, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

/** @returns {{ status: "pass" | "fail" | "blocked", findings: string[] }} */
export function checkManifest(root = resolve(HERE, "../..")) {
  const findings = [];
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  } catch (err) {
    return { status: "fail", findings: [`manifest.json: ${err.message}`] };
  }
  if (manifest.release !== BUNDLE.release) findings.push(`release ${manifest.release} differs from bundle.json ${BUNDLE.release}`);
  const listed = Object.keys(manifest.files ?? {}).sort();
  const expected = [...BUNDLE.assets].sort();
  if (JSON.stringify(listed) !== JSON.stringify(expected)) findings.push(`files [${listed.join(", ")}] differ from bundle.json assets [${expected.join(", ")}]`);
  const commit = String(manifest.commit ?? "");
  if (!/^[0-9a-f]{40}$/.test(commit)) return { status: "fail", findings: [...findings, `commit "${commit}" is not a full SHA-1`] };
  if (!git(root, ["cat-file", "-e", `${commit}^{commit}`]).ok) {
    const shallow = git(root, ["rev-parse", "--is-shallow-repository"]).out.toString().trim() === "true";
    return shallow
      ? { status: "blocked", findings: [...findings, `commit ${commit} isn't available in this shallow clone`] }
      : { status: "fail", findings: [...findings, `commit ${commit} doesn't exist`] };
  }
  const anc = git(root, ["merge-base", "--is-ancestor", commit, "HEAD"]);
  if (anc.status !== 0) findings.push(`commit ${commit} is not HEAD or an ancestor of HEAD`);
  for (const rel of expected) {
    const want = manifest.files?.[rel];
    const committed = blob(root, commit, rel);
    if (!committed) findings.push(`${rel}: absent from the tree of ${commit.slice(0, 7)}`);
    else if (sha256(committed) !== want) findings.push(`${rel}: blob at ${commit.slice(0, 7)} doesn't match the manifest`);
    const abs = join(root, rel);
    if (!existsSync(abs)) findings.push(`${rel}: missing from the working tree`);
    else if (sha256(readFileSync(abs)) !== want) findings.push(`${rel}: working tree doesn't match the manifest; commit the assets, then regenerate the manifest`);
  }
  return { status: findings.length ? "fail" : "pass", findings };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--check")) {
    const r = checkManifest();
    console.log(`manifest provenance: ${r.status}`);
    for (const f of r.findings) console.log(`  - ${f}`);
    process.exit(r.status === "pass" ? 0 : r.status === "fail" ? 1 : 2);
  }
  try {
    const m = generateManifest();
    console.log(`manifest.json: ${Object.keys(m.files).length} files at commit ${m.commit}`);
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exit(1);
  }
}
