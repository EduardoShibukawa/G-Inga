/**
 * Bundle commit-gate step (ADR 0009 §2, spec 2026-10-14-harness-hardening SC2): a target repository
 * that installs the pinned bundle can compose its own `pre-commit` mise task from the shipped
 * `g-inga:validate` file task. `mise run pre-commit` rejects an invalid record and accepts a valid
 * one, and a minimal Git `pre-commit` hook that runs it (no hk) makes Git itself reject an invalid
 * record commit and accept a valid one.
 *
 * Needs mise on PATH. Skipped without mise; G_INGA_REQUIRE_RUNTIMES=1 (set in CI) turns that into a
 * failure.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { task } from "./artifacts/fixtures.ts";
import { REPO } from "./testkit.ts";
import { updateBundle } from "./update.mjs";

const temps: string[] = [];
afterAll(() => temps.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

const root = mkdtempSync(join(tmpdir(), "g-inga-bundle-step-"));
temps.push(root);
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
  if (!cwd.startsWith(root) && cwd !== tmpdir()) throw new Error(`bundle step: refusing to run outside ${root}: "${cwd}"`);
  const p = Bun.spawnSync(["sh", "-c", script], { cwd, env: ENV, stdout: "pipe", stderr: "pipe" });
  return { code: p.exitCode, out: p.stdout.toString() + p.stderr.toString() };
}

// Inside the temp root from the start, so a failed setup test never points later tests at this repository.
const target = join(root, "target");
const head = (dir: string) => sh("git rev-parse HEAD", dir).out.trim();

const hasMise = sh("command -v mise", tmpdir()).code === 0;
const requireRuntimes = process.env.G_INGA_REQUIRE_RUNTIMES === "1";

const INVALID = "tasks/2026-10-14-invalid.md";
const VALID = "tasks/2026-10-14-valid.md";
const FINDING = `${INVALID} §3.3 working tree: status "nonsense" is not a task state`;

describe.skipIf(!hasMise && !requireRuntimes)("bundle commit-gate step (g-inga:validate)", () => {
  test("a target repository installs the bundle and composes pre-commit -> g-inga:validate", () => {
    expect(hasMise).toBe(true);
    mkdirSync(target);
    // The pinned bundle, exactly as update.mjs delivers it, including the shipped file task.
    updateBundle(REPO, target);
    // The one change the target makes: its own pre-commit task depends on the shipped file task.
    writeFileSync(join(target, "mise.toml"), '[tasks.pre-commit]\ndepends = ["g-inga:validate"]\n');
    // Seed Git so the artifact-records history walk has history to walk.
    expect(sh("git init -q && git config commit.gpgsign false && git add -A && git commit -q -m init", target).code).toBe(0);
    // The minimal hook a target without hk installs: Git runs `mise run pre-commit`.
    const hook = join(target, ".git", "hooks", "pre-commit");
    writeFileSync(hook, "#!/bin/sh\nexec mise run pre-commit\n");
    chmodSync(hook, 0o755);
    // The shipped file task is executable and listed as g-inga:validate.
    expect(sh("mise tasks", target).out).toContain("g-inga:validate");
  }, 120_000);

  test("mise run pre-commit rejects an invalid record and names the finding", () => {
    mkdirSync(join(target, "tasks"), { recursive: true });
    writeFileSync(join(target, INVALID), task({ status: "nonsense" }));
    const r = sh("mise run pre-commit", target);
    expect(r.code).not.toBe(0);
    expect(r.out).toContain(FINDING);
    sh(`rm ${INVALID}`, target);
  }, 120_000);

  test("mise run pre-commit accepts a valid record", () => {
    writeFileSync(join(target, VALID), task({ status: "todo" }));
    const r = sh("mise run pre-commit", target);
    expect(r.code).toBe(0);
    sh(`rm ${VALID}`, target);
  }, 120_000);

  test("the Git hook rejects the commit of an invalid record and names the finding", () => {
    const before = head(target);
    writeFileSync(join(target, INVALID), task({ status: "nonsense" }));
    const r = sh(`git add ${INVALID} && git commit -q -m invalid`, target);
    expect(r.code).not.toBe(0);
    expect(r.out).toContain(FINDING);
    expect(head(target)).toBe(before);
    sh(`git rm -q -f --cached ${INVALID}; rm -f ${INVALID}`, target);
  }, 120_000);

  test("the Git hook accepts the commit of a valid record", () => {
    const before = head(target);
    writeFileSync(join(target, VALID), task({ status: "todo" }));
    const r = sh(`git add ${VALID} && git commit -q -m valid`, target);
    expect(r.code).toBe(0);
    expect(head(target)).not.toBe(before);
  }, 120_000);
});
