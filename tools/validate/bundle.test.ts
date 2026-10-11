/**
 * Tests of the product bundle (V1 spec SC1, SC4, SC5, SC6): the standalone validator installed in clean target
 * repositories under Node >= 22 and Bun, the manifest's provenance, and the failure-atomic update procedure.
 * Every target is a throwaway directory under the OS temp dir; the canonical files are only read.
 *
 * G_INGA_REQUIRE_RUNTIMES=1 (set in CI) turns a missing Node >= 22 into a failure instead of a skipped test.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { task } from "./artifacts/fixtures.ts";
import bundle from "./bundle.json" with { type: "json" };
import { checkManifest } from "./manifest.mjs";
import { REPO } from "./testkit.ts";
import { updateBundle, UpdateError, WORK_DIR } from "./update.mjs";

const temps: string[] = [];
afterAll(() => temps.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));
function tempDir(prefix = "g-inga-bundle-"): string {
  const d = mkdtempSync(join(tmpdir(), prefix));
  temps.push(d);
  return d;
}

function run(cmd: string[], cwd: string, env: Record<string, string> = {}) {
  const p = Bun.spawnSync(cmd, { cwd, env: { ...process.env, ...env }, stdout: "pipe", stderr: "pipe" });
  return { code: p.exitCode, out: p.stdout.toString() + p.stderr.toString() };
}
const git = (dir: string, ...args: string[]) => run(["git", "-c", "user.email=f@example.invalid", "-c", "user.name=f", "-c", "commit.gpgsign=false", ...args], dir);
function commitAll(dir: string, msg = "fixture") {
  git(dir, "add", "-A");
  return git(dir, "commit", "-q", "--allow-empty", "-m", msg);
}
function gitRepo(files: Record<string, string> = {}): string {
  const dir = tempDir("g-inga-target-");
  git(dir, "init", "-q");
  for (const [p, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), text);
  }
  commitAll(dir, "user content");
  return dir;
}

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
/** Every file and directory under `dir` (except .git) with its content hash: the whole observable target state. */
function snapshot(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (rel: string) => {
    for (const name of readdirSync(join(dir, rel))) {
      const r = rel ? `${rel}/${name}` : name;
      if (r === ".git") continue;
      if (statSync(join(dir, r)).isDirectory()) {
        out[`${r}/`] = "dir";
        walk(r);
      } else out[r] = sha(readFileSync(join(dir, r)));
    }
  };
  walk("");
  return out;
}

// ---- runtimes ----------------------------------------------------------------

const requireRuntimes = process.env.G_INGA_REQUIRE_RUNTIMES === "1";
const nodeMajor = (() => {
  const r = Bun.spawnSync(["node", "--version"], { stdout: "pipe", stderr: "pipe" });
  return r.exitCode === 0 ? Number(/^v(\d+)/.exec(r.stdout.toString())?.[1]) : undefined;
})();
const hasNode22 = nodeMajor !== undefined && nodeMajor >= 22;
/** Runs the validator with no network namespace when the platform allows it (unprivileged user namespaces). */
const offline = run(["unshare", "-rn", "true"], tmpdir()).code === 0;
const offlinePrefix = offline ? ["unshare", "-rn"] : [];

const RUNTIMES = [
  { name: "node", available: hasNode22, cmd: (root: string) => ["node", join(root, "tools/validate/validate.js")] },
  { name: "bun", available: true, cmd: (root: string) => ["bun", join(root, "tools/validate/validate.ts")] },
] as const;

function status(check: string, out: string): string | undefined {
  return new RegExp(`^\\s+${check}\\s+(pass|fail|blocked|not run)\\b`, "m").exec(out)?.[1];
}

test("Node >= 22 is available, or the runtime matrix may skip it", () => {
  if (requireRuntimes) expect(nodeMajor).toBeGreaterThanOrEqual(22);
});

// ---- the committed bundle ------------------------------------------------------

describe("committed bundle in this repository", () => {
  test("manifest.json provenance: commit holds exactly these assets and hashes (manifest.mjs --check)", () => {
    const r = checkManifest(REPO);
    expect(r.findings).toEqual([]);
    expect(r.status).toBe("pass");
  });

  test("validate.js is the current build of standalone.ts", () => {
    const out = join(tempDir(), "validate.js");
    const b = run(["bun", "build", "tools/validate/standalone.ts", "--target=node", "--outfile", out], REPO);
    expect(b.code).toBe(0);
    expect(sha(readFileSync(out))).toBe(sha(readFileSync(join(REPO, "tools/validate/validate.js"))));
  });

  test("validate.js imports only node: built-ins and no network module", () => {
    const js = readFileSync(join(REPO, "tools/validate/validate.js"), "utf8");
    const specifiers = [...js.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*|\b__require\s*\(\s*|\brequire\s*\(\s*)["']([^"']+)["']/g)].map((m) => m[1]);
    const builtins = new Set(["process", "buffer", "fs", "path", "crypto", "child_process", "module", "url", "os", "util"]);
    const external = specifiers.filter((s) => !s.startsWith("node:") && !builtins.has(s));
    expect(external).toEqual([]);
    const network = specifiers.filter((s) => /^(node:)?(http|https|http2|net|tls|dns|dgram)$/.test(s));
    expect(network).toEqual([]);
    expect(js).not.toMatch(/\bfetch\s*\(/);
  });

  test("every documented validator CLI path exists in the bundle", () => {
    for (const p of ["tools/validate/validate.js", "tools/validate/validate.ts"]) expect(bundle.assets).toContain(p);
    const docs = [".claude/skills/work/SKILL.md", ".claude/skills/work/standard.md"].map((p) => readFileSync(join(REPO, p), "utf8")).join("\n");
    for (const m of docs.matchAll(/`(?:node|bun) (tools\/validate\/[\w.]+)`/g)) expect(bundle.assets).toContain(m[1]);
  });
});

// ---- installed bundle, per runtime -----------------------------------------------

const VALID_TASK = task({ status: "active", rows: [["B1", "pass", "abc1234"]] });
const INVALID_TASK = task({ status: "verified", rows: [["B1", "pass", "abc1234"]] }); // verified without verified_at or rows at it

/** A clean Git repository with the bundle installed from this checkout and committed. */
function installedTarget(files: Record<string, string> = {}): string {
  const dir = gitRepo({ "README.md": "# Target\n", ...files });
  updateBundle(REPO, dir);
  commitAll(dir, "install G-Ingá bundle");
  return dir;
}

for (const rt of RUNTIMES) {
  describe(`installed bundle under ${rt.name}${offline ? " (no network namespace)" : ""}`, () => {
    const validate = (root: string, cwd = root) => run([...offlinePrefix, ...rt.cmd(root), "--root", root], cwd);

    test.skipIf(!rt.available)("no node_modules is reachable from the target", () => {
      const dir = installedTarget();
      for (let d = dir; d !== dirname(d); d = dirname(d)) expect(existsSync(join(d, "node_modules"))).toBe(false);
    });

    test.skipIf(!rt.available)("exit 0: clean target, manifest passes, record checks not run", () => {
      const dir = installedTarget();
      const r = validate(dir);
      expect(status("manifest-integrity", r.out)).toBe("pass");
      expect(status("artifact-records", r.out)).toBe("not run");
      expect(r.code).toBe(0);
    }, 30000);

    test.skipIf(!rt.available)("exit 0: valid committed task record, history walk passes", () => {
      const dir = installedTarget({ "tasks/2026-10-11-sample.md": VALID_TASK });
      const r = validate(dir);
      expect(status("artifact-records", r.out)).toBe("pass");
      expect(r.code).toBe(0);
    }, 30000);

    test.skipIf(!rt.available)("exit 1: contract violation in a task record", () => {
      const dir = installedTarget({ "tasks/2026-10-11-sample.md": INVALID_TASK });
      const r = validate(dir);
      expect(status("artifact-records", r.out)).toBe("fail");
      expect(r.code).toBe(1);
    }, 30000);

    test.skipIf(!rt.available)("exit 1: an altered bundle asset fails the manifest check", () => {
      const dir = installedTarget();
      appendFileSync(join(dir, ".claude/skills/work/SKILL.md"), "\nlocal edit\n");
      const r = validate(dir);
      expect(status("manifest-integrity", r.out)).toBe("fail");
      expect(r.out).toContain(".claude/skills/work/SKILL.md: hash mismatch");
      expect(r.code).toBe(1);
    }, 30000);

    test.skipIf(!rt.available)("exit 2: shallow clone with records blocks the mandatory history walk", () => {
      const dir = installedTarget({ "tasks/2026-10-11-sample.md": VALID_TASK });
      commitAll(dir, "second commit");
      const clone = join(tempDir(), "shallow");
      expect(run(["git", "clone", "-q", "--depth", "1", `file://${dir}`, clone], tmpdir()).code).toBe(0);
      const r = validate(clone);
      expect(status("artifact-records", r.out)).toBe("blocked");
      expect(r.code).toBe(2);
    }, 30000);

    test.skipIf(!rt.available)("exit 2: missing manifest.json is a missing prerequisite, never a pass", () => {
      const dir = installedTarget();
      rmSync(join(dir, "manifest.json"));
      const r = validate(dir);
      expect(status("manifest-integrity", r.out)).toBe("blocked");
      expect(r.code).toBe(2);
    }, 30000);

    test.skipIf(!rt.available)("exit 2: not a Git repository", () => {
      const dir = tempDir();
      mkdirSync(join(dir, "tools/validate"), { recursive: true });
      cpSync(join(REPO, "tools/validate/validate.js"), join(dir, "tools/validate/validate.js"));
      cpSync(join(REPO, "tools/validate/validate.ts"), join(dir, "tools/validate/validate.ts"));
      const r = validate(dir);
      expect(r.out).toContain("not a Git repository");
      expect(r.code).toBe(2);
    }, 30000);
  });
}

// ---- update procedure -------------------------------------------------------------

/** A second bundle release: every asset changed, one asset dropped, the manifest regenerated. */
function sourceV2(drop = "tools/validate/ci-template.yml"): string {
  const dir = tempDir("g-inga-source-");
  const files: Record<string, string> = {};
  for (const rel of bundle.assets) {
    if (rel === drop) continue;
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    const text = readFileSync(join(REPO, rel), "utf8") + (rel.endsWith(".md") ? "\n<!-- v2 -->\n" : "\n// v2\n");
    writeFileSync(join(dir, rel), text);
    files[rel] = sha(text);
  }
  writeFileSync(join(dir, "manifest.json"), JSON.stringify({ release: "1.1.0", commit: "0".repeat(40), files }, null, 2) + "\n");
  return dir;
}

const USER_FILES = {
  "README.md": "# Target\n",
  "CLAUDE.md": "# Target rules\n",
  "tasks/2026-10-11-user-task.md": VALID_TASK,
  "specs/user-spec.md": "# user spec\n",
  "tools/validate/user-tool.ts": "export const mine = 1;\n",
  ".claude/skills/other/SKILL.md": "---\nname: other\n---\n",
};
const userState = (dir: string) => Object.fromEntries(Object.keys(USER_FILES).map((p) => [p, sha(readFileSync(join(dir, p)))]));

describe("update procedure (SC6)", () => {
  test("clean install: every asset byte-identical to the source, manifest last, no work dir left", () => {
    const dir = gitRepo(USER_FILES);
    const r = updateBundle(REPO, dir);
    for (const rel of bundle.assets) expect(sha(readFileSync(join(dir, rel)))).toBe(sha(readFileSync(join(REPO, rel))));
    expect(readFileSync(join(dir, "manifest.json"), "utf8")).toBe(readFileSync(join(REPO, "manifest.json"), "utf8"));
    expect(r.installed.at(-1)).toBe("manifest.json");
    expect(existsSync(join(dir, WORK_DIR))).toBe(false);
  });

  test("repeated update is idempotent: nothing replaced, state identical", () => {
    const dir = gitRepo(USER_FILES);
    updateBundle(REPO, dir);
    const before = snapshot(dir);
    const r = updateBundle(REPO, dir);
    expect(r.installed).toEqual([]);
    expect(r.unchanged).toBe(bundle.assets.length);
    expect(snapshot(dir)).toEqual(before);
  });

  test("upgrade replaces the whole bundle, removes dropped assets and preserves user files", () => {
    const dir = gitRepo(USER_FILES);
    updateBundle(REPO, dir);
    const user = userState(dir);
    const v2 = sourceV2();
    const r = updateBundle(v2, dir);
    expect(r.removed).toEqual(["tools/validate/ci-template.yml"]);
    expect(existsSync(join(dir, "tools/validate/ci-template.yml"))).toBe(false);
    for (const rel of bundle.assets.filter((a) => a !== "tools/validate/ci-template.yml"))
      expect(readFileSync(join(dir, rel), "utf8")).toBe(readFileSync(join(v2, rel), "utf8"));
    expect(userState(dir)).toEqual(user);
    expect(git(dir, "status", "--porcelain", "--", "tasks", "specs").out).toBe("");
  });

  test("CLI: a source asset that doesn't match the source manifest fails (exit 1) before the target changes", () => {
    const dir = gitRepo(USER_FILES);
    updateBundle(REPO, dir);
    const before = snapshot(dir);
    const v2 = sourceV2();
    appendFileSync(join(v2, ".claude/skills/work/heavy.md"), "tampered after manifest\n");
    const runtime = hasNode22 ? "node" : "bun";
    const r = run([runtime, join(REPO, "tools/validate/update.mjs"), dir, "--source", v2], tmpdir());
    expect(r.out).toContain("heavy.md doesn't match the source manifest");
    expect(r.code).toBe(1);
    expect(snapshot(dir)).toEqual(before);
  });

  test("a manifest listing user content (tasks/) is refused before the target changes", () => {
    const dir = gitRepo(USER_FILES);
    const before = snapshot(dir);
    const v2 = sourceV2();
    const m = JSON.parse(readFileSync(join(v2, "manifest.json"), "utf8"));
    mkdirSync(join(v2, "tasks"));
    writeFileSync(join(v2, "tasks/2026-10-11-user-task.md"), "overwritten\n");
    m.files["tasks/2026-10-11-user-task.md"] = sha("overwritten\n");
    writeFileSync(join(v2, "manifest.json"), JSON.stringify(m));
    expect(() => updateBundle(v2, dir)).toThrow(/outside the bundle scope/);
    expect(snapshot(dir)).toEqual(before);
  });

  test("a failure induced at every replacement step leaves the target exactly as before", () => {
    const dir = gitRepo(USER_FILES);
    updateBundle(REPO, dir);
    const before = snapshot(dir);
    const v2 = sourceV2();
    let steps = 0;
    updateBundle(v2, gitRepo(USER_FILES), { fault: (n) => void (steps = n) }); // count the steps of a full run
    expect(steps).toBeGreaterThan(2);
    for (let k = 1; k <= steps; k++) {
      let err: unknown;
      try {
        updateBundle(v2, dir, { fault: (n, rel) => { if (n === k) throw new Error(`induced failure after ${rel}`); } });
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(UpdateError);
      expect((err as UpdateError).code).toBe(1);
      expect((err as Error).message).toContain("restored to its previous state");
      expect(snapshot(dir)).toEqual(before);
    }
  });

  test("a failure on a first install removes every file and directory it created", () => {
    const dir = gitRepo({ "README.md": "# Target\n" });
    const before = snapshot(dir);
    expect(() => updateBundle(REPO, dir, { fault: (n) => { if (n === 4) throw new Error("induced"); } })).toThrow(UpdateError);
    expect(snapshot(dir)).toEqual(before);
  });

  test("a run refuses to touch a target while another live update holds it", () => {
    const dir = gitRepo(USER_FILES);
    updateBundle(REPO, dir);
    const before = snapshot(dir);
    mkdirSync(join(dir, WORK_DIR));
    const holder = Bun.spawn(["sleep", "30"]);
    try {
      writeFileSync(join(dir, WORK_DIR, "pid"), String(holder.pid));
      expect(() => updateBundle(sourceV2(), dir)).toThrow(/another update \(pid \d+\) is running/);
    } finally {
      holder.kill();
    }
    rmSync(join(dir, WORK_DIR), { recursive: true });
    expect(snapshot(dir)).toEqual(before);
  });

  test("an update killed mid-way is reported by the validator, then rolled back and completed by the next run", () => {
    const dir = gitRepo(USER_FILES);
    updateBundle(REPO, dir);
    commitAll(dir, "bundle v1");
    const v2 = sourceV2();
    const script = `import { updateBundle } from ${JSON.stringify(join(REPO, "tools/validate/update.mjs"))};
updateBundle(${JSON.stringify(v2)}, ${JSON.stringify(dir)}, { fault: (n) => { if (n === 3) process.exit(9); } });`;
    const killed = run(["bun", "-e", script], tmpdir());
    expect(killed.code).toBe(9);
    expect(existsSync(join(dir, WORK_DIR, "journal.json"))).toBe(true);
    // Mixed state on disk: the old manifest stays until the last step, so the validator reports drift, not pass.
    const v = run(["bun", join(dir, "tools/validate/validate.ts"), "--root", dir], dir);
    expect(v.code).not.toBe(0);
    expect(status("manifest-integrity", v.out)).toBe("fail");

    const r = updateBundle(v2, dir);
    expect(r.recovered).toContain("rolled back an interrupted update");
    expect(existsSync(join(dir, WORK_DIR))).toBe(false);
    for (const rel of Object.keys(JSON.parse(readFileSync(join(v2, "manifest.json"), "utf8")).files))
      expect(readFileSync(join(dir, rel), "utf8")).toBe(readFileSync(join(v2, rel), "utf8"));
    expect(existsSync(join(dir, "tools/validate/ci-template.yml"))).toBe(false);
  });
});
