/** Shared test helpers. Fixtures live under the OS temp dir; canonical documents are only read. */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { findBrowser } from "./universal/mermaid.ts";

export const REPO = resolve(import.meta.dir, "../..");
const MAIN = join(import.meta.dir, "main.ts");
const temps: string[] = [];

export const hasBrowser = findBrowser() !== undefined;
/** Makes the Mermaid check `blocked` when a test doesn't need a real render. */
export const NO_BROWSER = { MERMAID_BROWSER: "/nonexistent" };

/** A throwaway directory with the repository's markdownlint config plus `files`; optionally committed. */
export function fixtureDir(files: Record<string, string>, opts: { git?: boolean } = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "g-inga-validate-"));
  temps.push(dir);
  const base = { ".markdownlint.jsonc": readFileSync(join(REPO, ".markdownlint.jsonc"), "utf8") };
  for (const [p, text] of Object.entries({ ...base, ...files })) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), text);
  }
  if (opts.git) {
    git(dir, "init", "-q");
    // Repo-local identity so raw `git` calls in tests (e.g. `merge`) also work on a runner with no
    // ambient Git identity, instead of only the `-c`-wrapped ones.
    git(dir, "config", "user.email", "f@example.invalid");
    git(dir, "config", "user.name", "f");
    git(dir, "config", "commit.gpgsign", "false");
    commitAll(dir);
  }
  return dir;
}

export function git(dir: string, ...args: string[]) {
  return Bun.spawnSync(["git", ...args], { cwd: dir, stdout: "pipe", stderr: "pipe" });
}

export function commitAll(dir: string) {
  git(dir, "add", "-A");
  git(dir, "-c", "user.email=f@example.invalid", "-c", "user.name=f", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "fixture");
}

export function cleanupFixtures() {
  temps.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true }));
}

/** Runs the entry point on `root`; returns the exit code and output. */
export function validate(root: string, env: Record<string, string> = {}, extraArgs: string[] = []) {
  const p = Bun.spawnSync(["bun", MAIN, "--root", root, ...extraArgs], { env: { ...process.env, ...env }, stdout: "pipe", stderr: "pipe" });
  return { code: p.exitCode, out: p.stdout.toString() + p.stderr.toString() };
}

/** The summary line of one check, e.g. `status("local-links", out) === "pass"`. */
export function status(check: string, out: string): string | undefined {
  return new RegExp(`^\\s+${check}\\s+(pass|fail|blocked|not run)\\b`, "m").exec(out)?.[1];
}

export const DECISION_MAP =
  "# Decision map\n\nStatus values are `proposed`, `accepted` and `open`.\n\n| ID | Decision | Status | Depends on | Record |\n|---|---|---|---|---|\n| D1 | One | open | none | none |\n";
