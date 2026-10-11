#!/usr/bin/env node
/**
 * Installs or updates the G-Ingá product bundle in a target repository (V1 spec SC6, ADR 0005 FU3).
 * Source-repository utility: it runs from a G-Ingá checkout and isn't delivered in the bundle (docs/bundle.md).
 *
 *   node tools/validate/update.mjs <target-dir> [--source <g-inga-checkout>]
 *   bun tools/validate/update.mjs <target-dir> [--source <g-inga-checkout>]
 *
 * Exit codes: 0 updated (or already up to date); 1 failed, target unchanged or fully restored;
 * 2 failed and the rollback was incomplete: the target may hold a mixed bundle and .g-inga-update/ keeps the journal.
 *
 * Failure atomicity on the working tree:
 *  1. Validate: the source manifest's paths are inside the bundle scope and every source file matches its hash.
 *     Nothing outside the scope (tasks/, specs/, any other user file) is ever planned.
 *  2. Stage: copy every asset into <target>/.g-inga-update/new/ (same filesystem) and re-hash the staged bytes.
 *  3. Replace: per file, move the old file to .g-inga-update/backup/ and rename the staged file into place.
 *     A journal records each step before the next. manifest.json goes last, so an interrupted run leaves the old
 *     manifest, which the validator then reports as drift instead of passing a mixed bundle.
 *  4. Verify the installed hashes. Any error in 3 or 4 rolls every step back from the journal.
 *  5. A later run finds a leftover journal (crash, kill), rolls that run back first and reports it.
 * The target's Git commit of the result stays the publication unit (FU3): review `git status`, then commit.
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUNDLE = JSON.parse(readFileSync(join(HERE, "bundle.json"), "utf8"));
export const WORK_DIR = ".g-inga-update";
const MANIFEST = "manifest.json";

export class UpdateError extends Error {
  /** @param {string} message @param {number} code 1 target unchanged or restored, 2 restoration incomplete */
  constructor(message, code = 1) {
    super(message);
    this.code = code;
  }
}

export function inBundleScope(relPath) {
  if (typeof relPath !== "string" || relPath.startsWith("/") || relPath.includes("\\")) return false;
  if (relPath.split("/").some((s) => s === ".." || s === "." || s === "")) return false;
  return BUNDLE.scope.some((p) => relPath.startsWith(p) && relPath.length > p.length);
}

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const isFile = (path) => existsSync(path) && lstatSync(path).isFile();

/** Parses a manifest and checks its shape and scope. Returns the `files` map. */
function readManifest(path, label) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    throw new UpdateError(`${label} manifest.json doesn't parse: ${err.message}`);
  }
  const files = manifest?.files;
  if (!files || typeof files !== "object" || Array.isArray(files) || !Object.keys(files).length)
    throw new UpdateError(`${label} manifest.json has no "files" map`);
  for (const [rel, hash] of Object.entries(files)) {
    if (rel === MANIFEST || !inBundleScope(rel)) throw new UpdateError(`${label} manifest.json lists ${rel}, outside the bundle scope (${BUNDLE.scope.join(", ")})`);
    if (typeof hash !== "string" || !/^[0-9a-f]{64}$/.test(hash)) throw new UpdateError(`${label} manifest.json: ${rel} has no SHA-256 digest`);
  }
  return files;
}

/** Undoes the steps a journal records, newest first. Throws UpdateError(code 2) when a step can't be undone. */
export function rollback(target, journal) {
  const work = join(target, WORK_DIR);
  const problems = [];
  for (const step of [...journal.steps].reverse()) {
    const dest = join(target, step.rel);
    try {
      if (step.installed && existsSync(dest)) rmSync(dest);
      const saved = join(work, "backup", step.rel);
      // A backup flagged but never moved (interrupted right before the rename) left the old file in place.
      if (step.backup && existsSync(saved)) renameSync(saved, dest);
      else if (step.backup && !existsSync(dest)) problems.push(`${step.rel}: backup missing`);
    } catch (err) {
      problems.push(`${step.rel}: ${err.message}`);
    }
  }
  for (const dir of [...journal.createdDirs].reverse()) {
    try {
      rmdirSync(join(target, dir));
    } catch (err) {
      if (err.code !== "ENOENT") problems.push(`${dir}/: ${err.message}`);
    }
  }
  if (problems.length)
    throw new UpdateError(`rollback incomplete; the target may hold a mixed bundle. Recovery data is in ${work}:\n  ${problems.join("\n  ")}`, 2);
}

/** Rolls back a run that died without cleaning up. Returns a message, or undefined when there was none. */
function recoverInterrupted(target) {
  const work = join(target, WORK_DIR);
  if (!existsSync(work)) return undefined;
  const journalPath = join(work, "journal.json");
  if (existsSync(journalPath)) {
    let journal;
    try {
      journal = JSON.parse(readFileSync(journalPath, "utf8"));
    } catch (err) {
      throw new UpdateError(`an interrupted update left ${journalPath}, which doesn't parse (${err.message}); recover by hand`, 2);
    }
    rollback(target, journal);
  }
  rmSync(work, { recursive: true, force: true });
  return `rolled back an interrupted update found in ${work}`;
}

/**
 * @param {string} sourceRoot G-Ingá checkout holding manifest.json and the assets it lists
 * @param {string} targetRoot repository receiving the bundle
 * @param {{ fault?: (step: number, rel: string) => void, log?: (line: string) => void }} [opts]
 *   `fault` runs after each replacement step; tests use it to induce a mid-update failure.
 */
export function updateBundle(sourceRoot, targetRoot, opts = {}) {
  const log = opts.log ?? (() => {});
  const source = resolve(sourceRoot);
  const target = resolve(targetRoot);
  if (!existsSync(target) || !statSync(target).isDirectory()) throw new UpdateError(`target ${target} is not a directory`);
  if (source === target) throw new UpdateError("source and target are the same directory");

  // 1. Validate the source completely before touching the target.
  const sourceManifest = join(source, MANIFEST);
  if (!isFile(sourceManifest)) throw new UpdateError(`no manifest.json in source ${source}`);
  const files = readManifest(sourceManifest, "source");
  for (const [rel, hash] of Object.entries(files)) {
    const src = join(source, rel);
    if (!isFile(src)) throw new UpdateError(`source asset missing: ${rel}`);
    const actual = sha256(src);
    if (actual !== hash) throw new UpdateError(`source asset ${rel} doesn't match the source manifest (expected ${hash}, got ${actual})`);
  }

  const recovered = recoverInterrupted(target);
  if (recovered) log(recovered);

  // The target's current bundle: files its manifest lists that the new one drops are removed (whole-bundle replacement).
  const targetManifest = join(target, MANIFEST);
  const oldFiles = existsSync(targetManifest) ? readManifest(targetManifest, "target") : {};
  const removals = Object.keys(oldFiles).filter((rel) => !(rel in files) && existsSync(join(target, rel)));
  for (const rel of [...Object.keys(files), ...removals, MANIFEST]) {
    const dest = join(target, rel);
    if (existsSync(dest) && !lstatSync(dest).isFile()) throw new UpdateError(`target ${rel} exists and isn't a regular file; refusing to replace it`);
    // Never write through a symlinked or non-directory parent: it could lead outside the bundle scope.
    for (let d = dirname(rel); d !== "."; d = dirname(d)) {
      const abs = join(target, d);
      if (existsSync(abs) && !lstatSync(abs).isDirectory()) throw new UpdateError(`target ${d} isn't a plain directory; refusing to write ${rel} through it`);
    }
  }

  // 2. Stage.
  const work = join(target, WORK_DIR);
  try {
    mkdirSync(work); // not recursive: fails if another run holds it
  } catch (err) {
    throw new UpdateError(`can't create ${work}: ${err.message}`);
  }
  const staged = (rel) => join(work, "new", rel);
  const changed = [];
  try {
    for (const [rel, hash] of Object.entries(files)) {
      const dest = join(target, rel);
      if (isFile(dest) && sha256(dest) === hash) continue; // idempotent: identical files stay untouched
      mkdirSync(dirname(staged(rel)), { recursive: true });
      copyFileSync(join(source, rel), staged(rel));
      if (sha256(staged(rel)) !== hash) throw new UpdateError(`staged copy of ${rel} doesn't match the manifest`);
      changed.push(rel);
    }
    const manifestChanged = !isFile(targetManifest) || sha256(targetManifest) !== sha256(sourceManifest);
    if (!changed.length && !removals.length && !manifestChanged) {
      rmSync(work, { recursive: true, force: true });
      return { installed: [], removed: [], unchanged: Object.keys(files).length, recovered };
    }
    copyFileSync(sourceManifest, staged(MANIFEST));
    changed.push(MANIFEST);
  } catch (err) {
    rmSync(work, { recursive: true, force: true });
    throw err instanceof UpdateError ? err : new UpdateError(`staging failed: ${err.message}`);
  }

  // 3. Replace, journaling every step first.
  const journal = { steps: [], createdDirs: [] };
  const journalPath = join(work, "journal.json");
  const save = () => writeFileSync(journalPath, JSON.stringify(journal));
  save();
  const mkdirs = (dir) => {
    const missing = [];
    for (let d = dir; d !== target && !existsSync(join(target, d)); d = dirname(d)) missing.unshift(d);
    for (const d of missing) {
      journal.createdDirs.push(d);
      save();
      mkdirSync(join(target, d));
    }
  };
  const backup = (rel, step) => {
    mkdirSync(dirname(join(work, "backup", rel)), { recursive: true });
    step.backup = true;
    save();
    renameSync(join(target, rel), join(work, "backup", rel));
  };
  let n = 0;
  try {
    const order = [...changed.filter((r) => r !== MANIFEST).sort(), ...removals.sort().map((r) => ({ remove: r })), MANIFEST];
    for (const item of order) {
      const rel = typeof item === "string" ? item : item.remove;
      const step = { rel, backup: false, installed: false };
      journal.steps.push(step);
      if (existsSync(join(target, rel))) backup(rel, step);
      if (typeof item === "string") {
        mkdirs(dirname(rel));
        step.installed = true;
        save();
        renameSync(staged(rel), join(target, rel));
      }
      opts.fault?.(++n, rel);
    }
    // 4. Verify what landed.
    for (const [rel, hash] of Object.entries(files)) if (sha256(join(target, rel)) !== hash) throw new Error(`installed ${rel} doesn't match the manifest`);
    for (const rel of removals) if (existsSync(join(target, rel))) throw new Error(`${rel} should have been removed`);
  } catch (err) {
    rollback(target, journal); // throws code 2 when it can't restore
    rmSync(work, { recursive: true, force: true });
    throw new UpdateError(`update failed at step ${n + 1} (${err.message}); the target was restored to its previous state`);
  }
  rmSync(work, { recursive: true, force: true });
  return { installed: changed, removed: removals, unchanged: Object.keys(files).length - changed.filter((r) => r !== MANIFEST).length, recovered };
}

function main(argv) {
  const i = argv.indexOf("--source");
  const source = i >= 0 ? argv[i + 1] : resolve(HERE, "../..");
  const target = argv.find((a, j) => !a.startsWith("--") && !(i >= 0 && j === i + 1));
  if (!target || !source) {
    console.error("usage: update.mjs <target-dir> [--source <g-inga-checkout>]");
    return 1;
  }
  try {
    const r = updateBundle(source, target, { log: (l) => console.log(l) });
    console.log(`G-Ingá bundle update: ${resolve(target)}`);
    console.log(`  installed ${r.installed.length}, removed ${r.removed.length}, unchanged ${r.unchanged}`);
    for (const p of r.installed) console.log(`  + ${p}`);
    for (const p of r.removed) console.log(`  - ${p}`);
    console.log("Review `git status` in the target and commit the bundle in one commit.");
    return 0;
  } catch (err) {
    console.error(`error: ${err.message}`);
    return err instanceof UpdateError ? err.code : 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
