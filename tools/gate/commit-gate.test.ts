/**
 * Commit gate (ADR 0009 §2, spec 2026-10-14-harness-hardening SC1): after `mise install` in a fresh
 * clone, Git itself rejects a commit whose staged task record fails the validator, even behind a
 * masked shell chain, in every worktree; a valid commit succeeds.
 *
 * The throwaway origin carries this repository's real `mise.toml`, `mise.lock` and `hk.pkl`, so the
 * `postinstall` hook, hk and the `pre-commit` → `validate` wiring are the ones under test. Only the
 * body of `validate` is swapped, through `mise.local.toml`, for the bundle's standalone validator
 * (the origin gets the pinned bundle, as a target repository does):
 * the full repository suite needs this repository's documents and takes about a minute per commit.
 *
 * Needs mise on PATH and network on first run (hk download, hk's Pkl package). Skipped without
 * mise; G_INGA_REQUIRE_RUNTIMES=1 (set in CI) turns that into a failure.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { task } from "../validate/artifacts/fixtures.ts";
import { REPO } from "../validate/testkit.ts";
import { updateBundle } from "../validate/update.mjs";

const temps: string[] = [];
afterAll(() => temps.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

const root = mkdtempSync(join(tmpdir(), "g-inga-gate-"));
temps.push(root);
// Trusted for every mise call below, including the ones the Git hook makes.
const ENV = {
  ...process.env,
  MISE_TRUSTED_CONFIG_PATHS: root,
  GIT_AUTHOR_NAME: "f",
  GIT_AUTHOR_EMAIL: "f@example.invalid",
  GIT_COMMITTER_NAME: "f",
  GIT_COMMITTER_EMAIL: "f@example.invalid",
};

function sh(script: string, cwd: string) {
  // Any cwd outside the temp root would run git, and the hook, in a real repository.
  if (!cwd.startsWith(root) && cwd !== tmpdir()) throw new Error(`commit gate: refusing to run outside ${root}: "${cwd}"`);
  const p = Bun.spawnSync(["sh", "-c", script], { cwd, env: ENV, stdout: "pipe", stderr: "pipe" });
  return { code: p.exitCode, out: p.stdout.toString() + p.stderr.toString() };
}
const head = (dir: string) => sh("git rev-parse HEAD", dir).out.trim();

const hasMise = sh("command -v mise", tmpdir()).code === 0;
const requireRuntimes = process.env.G_INGA_REQUIRE_RUNTIMES === "1";

/** Swaps `validate` for the standalone validator and stubs its `setup` dependency; mise local config, not committed. */
const LOCAL_VALIDATE = '[tasks.setup]\nrun = "true"\n\n[tasks.validate]\nrun = "bun tools/validate/validate.js"\n\n[tasks."validate:authoring"]\nrun = "bun tools/validate/validate.js --authoring"\n';
const INVALID = "tasks/2026-10-14-invalid.md";
const VALID = "tasks/2026-10-14-valid.md";
const FINDING = `${INVALID} §3.3 working tree: status "nonsense" is not a task state`;

describe.skipIf(!hasMise && !requireRuntimes)("commit gate", () => {
  // Inside the temp root from the start, so a failed setup test never points later tests at this repository.
  const clone = join(root, "clone");

  test("mise install in a fresh clone installs the pre-commit hook", () => {
    expect(hasMise).toBe(true);
    const origin = join(root, "origin");
    mkdirSync(origin);
    // The pinned bundle, as a target repository gets it, so the standalone validator can pass.
    updateBundle(REPO, origin);
    for (const f of ["mise.toml", "mise.lock", "hk.pkl"]) cpSync(join(REPO, f), join(origin, f));
    expect(sh("git init -q && git config commit.gpgsign false && git add -A && git commit -q -m init", origin).code).toBe(0);

    expect(sh(`git clone -q "${origin}" "${clone}" && git -C "${clone}" config commit.gpgsign false`, root).code).toBe(0);
    // Ignored, as a local override usually is; hk would otherwise stash it with the untracked files.
    expect(sh('echo mise.local.toml >> "$(git rev-parse --git-common-dir)/info/exclude"', clone).code).toBe(0);
    writeFileSync(join(clone, "mise.local.toml"), LOCAL_VALIDATE);
    const r = sh("mise install", clone);
    expect(r.code).toBe(0);
    // A failed postinstall is only a mise warning, so the hook file is the evidence.
    const hook = join(clone, sh("git rev-parse --git-path hooks", clone).out.trim(), "pre-commit");
    expect(existsSync(hook)).toBe(true);
  }, 300_000);

  test("a masked validator chain can't commit an invalid record, and the hook names the finding", () => {
    mkdirSync(join(clone, "tasks"), { recursive: true });
    writeFileSync(join(clone, INVALID), task({ status: "nonsense" }));
    const before = head(clone);
    const r = sh(`git add ${INVALID} && mise run validate | tail -1 && git commit -m invalid`, clone);
    expect(r.code).not.toBe(0);
    expect(head(clone)).toBe(before);
    expect(r.out).toContain(FINDING);
    expect(sh(`git rm -q --cached ${INVALID} && rm ${INVALID}`, clone).code).toBe(0);
  }, 120_000);

  test("a valid record commits", () => {
    writeFileSync(join(clone, VALID), task({ status: "todo" }));
    const before = head(clone);
    const r = sh(`git add ${VALID} && git commit -q -m valid`, clone);
    if (r.code !== 0) console.error(r.out);
    expect(r.code).toBe(0);
    expect(head(clone)).not.toBe(before);
  }, 120_000);

  test("another worktree of the clone is gated too", () => {
    const wt = join(root, "wt");
    expect(sh(`git worktree add -q "${wt}" -b wt`, clone).code).toBe(0);
    writeFileSync(join(wt, "mise.local.toml"), LOCAL_VALIDATE);
    mkdirSync(join(wt, "tasks"), { recursive: true });
    writeFileSync(join(wt, INVALID), task({ status: "nonsense" }));
    const before = head(wt);
    const r = sh(`git add ${INVALID} && git commit -q -m invalid`, wt);
    expect(r.code).not.toBe(0);
    expect(head(wt)).toBe(before);
    expect(r.out).toContain(FINDING);
  }, 120_000);

  test("a valid record commits from another worktree, and the hook leaves the clone's config alone", () => {
    const wt = join(root, "wt");
    expect(sh(`git rm -q --cached ${INVALID} && rm ${INVALID}`, wt).code).toBe(0);
    const valid = "tasks/2026-10-14-valid-wt.md";
    writeFileSync(join(wt, valid), task({ status: "todo" }));
    const before = head(wt);
    const r = sh(`git add ${valid} && git commit -q -m valid`, wt);
    if (r.code !== 0) console.error(r.out);
    expect(r.code).toBe(0);
    expect(head(wt)).not.toBe(before);
    expect(sh("git config --get core.bare", clone).out.trim()).toBe("false");
  }, 120_000);
});
