/**
 * Startup warnings and single skill listing (ADR 0009 §1, spec 2026-10-14-harness-hardening SC8, SC9):
 *  - SC8: SessionStart hook warns when installed plugin commit differs from marketplace `main`
 *    (cached 24 h, <= 3 s cap, fail open) and when `mise.toml` has a `pre-commit` task without
 *    an installed Git `pre-commit` hook.
 *  - SC9: `.claude/settings.json` disables `g-inga@g-inga` in this repository so `work`, `drive`
 *    and `orchestrate` are each listed once.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runSessionStartCheck, TTL_MS } from "../../hooks/session-start.mjs";
import { REPO } from "../validate/testkit.ts";

const temps: string[] = [];
afterAll(() => temps.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

function makeMarketplaceRepo(): { dir: string; head: string } {
  const dir = mkdtempSync(join(tmpdir(), "g-inga-mkt-"));
  temps.push(dir);
  spawnSync(
    "sh",
    [
      "-c",
      "git init -q -b main && git config commit.gpgsign false && git commit -q --allow-empty -m main-commit",
    ],
    {
      cwd: dir,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "f",
        GIT_AUTHOR_EMAIL: "f@example.invalid",
        GIT_COMMITTER_NAME: "f",
        GIT_COMMITTER_EMAIL: "f@example.invalid",
      },
    }
  );
  const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).stdout.trim();
  return { dir, head };
}

function makeProjectRepo(opts: { withPreCommitTask: boolean; withGitHook: boolean }): string {
  const dir = mkdtempSync(join(tmpdir(), "g-inga-proj-"));
  temps.push(dir);
  spawnSync("git", ["init", "-q"], { cwd: dir });
  if (opts.withPreCommitTask) {
    writeFileSync(join(dir, "mise.toml"), '[tasks.pre-commit]\ndepends = ["validate"]\n');
  }
  if (opts.withGitHook) {
    const hookDir = join(dir, ".git", "hooks");
    mkdirSync(hookDir, { recursive: true });
    writeFileSync(join(hookDir, "pre-commit"), "#!/bin/sh\nexit 0\n");
  }
  return dir;
}

function writeInstalledPlugins(sha: string): string {
  const dir = mkdtempSync(join(tmpdir(), "g-inga-plg-"));
  temps.push(dir);
  const file = join(dir, "installed_plugins.json");
  writeFileSync(
    file,
    JSON.stringify({
      version: 2,
      plugins: {
        "g-inga@g-inga": [
          {
            scope: "user",
            installPath: `/tmp/cache/g-inga/${sha.slice(0, 12)}`,
            version: sha.slice(0, 12),
            gitCommitSha: sha,
          },
        ],
      },
    })
  );
  return file;
}

describe("startup warnings (SC8) and single skill listing (SC9)", () => {
  test("stale plugin prints one staleness warning and caches marketplace main for 24 h", () => {
    const mkt = makeMarketplaceRepo();
    const proj = makeProjectRepo({ withPreCommitTask: true, withGitHook: true });
    const installedFile = writeInstalledPlugins("1111111111111111111111111111111111111111");
    const cacheDir = mkdtempSync(join(tmpdir(), "g-inga-cache-"));
    temps.push(cacheDir);
    const cacheFile = join(cacheDir, "marketplace-main.json");
    const now = 1_700_000_000_000;

    const first = runSessionStartCheck({
      cwd: proj,
      installedPluginsFile: installedFile,
      cacheFile,
      marketplaceUrl: mkt.dir,
      now,
    });
    expect(first.networkReached).toBe(true);
    expect(first.warnings).toHaveLength(1);
    expect(first.warnings[0]).toContain("1111111");
    expect(first.warnings[0]).toContain(mkt.head.slice(0, 7));

    // Within 24 h: reads cache, does not reach network even if URL is unreachable.
    const second = runSessionStartCheck({
      cwd: proj,
      installedPluginsFile: installedFile,
      cacheFile,
      marketplaceUrl: "/nonexistent/repo.git",
      now: now + TTL_MS - 1000,
    });
    expect(second.networkReached).toBe(false);
    expect(second.warnings).toEqual(first.warnings);
  });

  test("current plugin matching marketplace main prints no staleness warning", () => {
    const mkt = makeMarketplaceRepo();
    const proj = makeProjectRepo({ withPreCommitTask: true, withGitHook: true });
    const installedFile = writeInstalledPlugins(mkt.head);
    const cacheFile = join(mkdtempSync(join(tmpdir(), "g-inga-cache-")), "marketplace-main.json");
    temps.push(join(cacheFile, ".."));

    const res = runSessionStartCheck({
      cwd: proj,
      installedPluginsFile: installedFile,
      cacheFile,
      marketplaceUrl: mkt.dir,
    });
    expect(res.warnings).toEqual([]);
  });

  test("missing Git pre-commit hook when mise.toml has pre-commit task prints one warning", () => {
    const mkt = makeMarketplaceRepo();
    const proj = makeProjectRepo({ withPreCommitTask: true, withGitHook: false });
    const installedFile = writeInstalledPlugins(mkt.head);
    const cacheFile = join(mkdtempSync(join(tmpdir(), "g-inga-cache-")), "marketplace-main.json");
    temps.push(join(cacheFile, ".."));

    const res = runSessionStartCheck({
      cwd: proj,
      installedPluginsFile: installedFile,
      cacheFile,
      marketplaceUrl: mkt.dir,
    });
    expect(res.warnings).toHaveLength(1);
    expect(res.warnings[0]).toContain("pre-commit");
    expect(res.warnings[0]).toContain("mise install");
  });

  test("network down fails open within 3 seconds and exits 0 without false staleness warning", () => {
    const proj = makeProjectRepo({ withPreCommitTask: false, withGitHook: false });
    const installedFile = writeInstalledPlugins("2222222222222222222222222222222222222222");
    const cacheFile = join(mkdtempSync(join(tmpdir(), "g-inga-cache-")), "marketplace-main.json");
    temps.push(join(cacheFile, ".."));

    const t0 = Date.now();
    const cli = spawnSync("node", [join(REPO, "hooks", "session-start.mjs")], {
      cwd: proj,
      env: {
        ...process.env,
        G_INGA_PROJECT_DIR: proj,
        G_INGA_INSTALLED_PLUGINS_FILE: installedFile,
        G_INGA_CACHE_FILE: cacheFile,
        G_INGA_MARKETPLACE_URL: "http://127.0.0.1:9/unreachable.git",
      },
      encoding: "utf8",
      timeout: 3000,
    });
    const elapsed = Date.now() - t0;
    expect(cli.status).toBe(0);
    expect(elapsed).toBeLessThan(3000);
    expect(cli.stdout.trim()).toBe("");
  });

  test("SC9: hooks/hooks.json registers SessionStart and .claude/settings.json disables g-inga@g-inga here", () => {
    const hooksPath = join(REPO, "hooks", "hooks.json");
    expect(existsSync(hooksPath)).toBe(true);
    const hooks = JSON.parse(readFileSync(hooksPath, "utf8"));
    const cmd = hooks?.hooks?.SessionStart?.[0]?.hooks?.[0];
    expect(cmd?.type).toBe("command");
    expect(cmd?.command).toContain("session-start.mjs");
    expect(cmd?.timeout).toBeLessThanOrEqual(3);

    const settings = JSON.parse(readFileSync(join(REPO, ".claude", "settings.json"), "utf8"));
    expect(settings?.enabledPlugins?.["g-inga@g-inga"]).toBe(false);
    for (const skill of ["work", "drive", "orchestrate"]) {
      expect(existsSync(join(REPO, ".claude", "skills", skill, "SKILL.md"))).toBe(true);
    }
  });
});
