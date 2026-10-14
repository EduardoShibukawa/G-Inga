#!/usr/bin/env node
/**
 * G-Ingá plugin SessionStart warning script (ADR 0009 §1, spec 2026-10-14-harness-hardening SC8).
 *
 * Prints at most two one-line warnings to stdout (injected by Claude Code as SessionStart context):
 *  1. Stale plugin: the installed `g-inga@g-inga` commit differs from the marketplace's `main`.
 *     Installed commit source: `~/.claude/plugins/installed_plugins.json` (`plugins["g-inga@g-inga"][0].gitCommitSha`),
 *     falling back to the trailing commit segment of `CLAUDE_PLUGIN_ROOT`.
 *     Marketplace `main` source: `git ls-remote <repo> refs/heads/main`, cached for 24 h under
 *     `${XDG_CACHE_HOME:-~/.cache}/g-inga/marketplace-main.json` so the network is reached at most once per 24 h.
 *  2. Missing Git hook: the current repository's `mise.toml` defines `[tasks.pre-commit]` (or a `pre-commit`
 *     file task), but no `.git/hooks/pre-commit` (resolved via `git rev-parse --git-path hooks/pre-commit`) exists.
 *
 * Fail-open invariant: any error, missing binary, unreadable file or network failure is swallowed and exits 0
 * within the 3-second budget.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TTL_MS = 24 * 60 * 60 * 1000;
export const NET_TIMEOUT_MS = 2500;
export const DEFAULT_MARKETPLACE_URL = "https://github.com/EduardoShibukawa/G-Inga.git";

/**
 * @param {object} [opts]
 * @param {string} [opts.cwd]
 * @param {string} [opts.installedPluginsFile]
 * @param {string} [opts.pluginRoot]
 * @param {string} [opts.cacheFile]
 * @param {string} [opts.marketplaceUrl]
 * @param {number} [opts.now]
 * @param {number} [opts.timeoutMs]
 * @returns {{ warnings: string[], networkReached: boolean }}
 */
export function runSessionStartCheck(opts = {}) {
  const warnings = [];
  let networkReached = false;
  try {
    const home = homedir();
    const cwd = resolve(opts.cwd ?? process.env.G_INGA_PROJECT_DIR ?? process.cwd());
    const installedPluginsFile =
      opts.installedPluginsFile ??
      process.env.G_INGA_INSTALLED_PLUGINS_FILE ??
      join(home, ".claude", "plugins", "installed_plugins.json");
    const pluginRoot = opts.pluginRoot ?? process.env.CLAUDE_PLUGIN_ROOT ?? "";
    const cacheBase = process.env.XDG_CACHE_HOME || join(home, ".cache");
    const cacheFile =
      opts.cacheFile ??
      process.env.G_INGA_CACHE_FILE ??
      join(cacheBase, "g-inga", "marketplace-main.json");
    const marketplaceUrl =
      opts.marketplaceUrl ?? process.env.G_INGA_MARKETPLACE_URL ?? DEFAULT_MARKETPLACE_URL;
    const now = opts.now ?? Date.now();
    const timeoutMs = opts.timeoutMs ?? NET_TIMEOUT_MS;

    // 1. Plugin staleness check.
    const installedSha = readInstalledCommit(installedPluginsFile, pluginRoot);
    if (installedSha) {
      const remoteResult = resolveMarketplaceMain(cacheFile, marketplaceUrl, now, timeoutMs);
      networkReached = remoteResult.networkReached;
      const remoteSha = remoteResult.sha;
      if (remoteSha && !commitsMatch(installedSha, remoteSha)) {
        warnings.push(
          `warning: installed g-inga plugin (${installedSha.slice(0, 7)}) differs from marketplace main (${remoteSha.slice(0, 7)}); run \`claude plugin update g-inga@g-inga\`.`
        );
      }
    }

    // 2. Missing Git pre-commit hook check.
    if (hasPreCommitMiseTask(cwd) && !hasInstalledGitPreCommitHook(cwd)) {
      warnings.push(
        "warning: repository defines a pre-commit mise task, but no Git pre-commit hook is installed; run `mise install`."
      );
    }
  } catch {
    // Fail open on any unexpected exception.
  }
  return { warnings, networkReached };
}

function readInstalledCommit(installedPluginsFile, pluginRoot) {
  try {
    if (existsSync(installedPluginsFile)) {
      const data = JSON.parse(readFileSync(installedPluginsFile, "utf8"));
      const entries = data?.plugins?.["g-inga@g-inga"];
      if (Array.isArray(entries) && entries.length > 0) {
        const sha = entries[0]?.gitCommitSha || entries[0]?.version;
        if (typeof sha === "string" && /^[0-9a-f]{7,40}$/i.test(sha.trim())) {
          return sha.trim().toLowerCase();
        }
      }
    }
  } catch {
    // Fall through to pluginRoot fallback.
  }
  if (pluginRoot) {
    const base = pluginRoot.replace(/[/\\]+$/, "").split(/[/\\]/).pop() ?? "";
    if (/^[0-9a-f]{7,40}$/i.test(base)) return base.toLowerCase();
  }
  return null;
}

function resolveMarketplaceMain(cacheFile, marketplaceUrl, now, timeoutMs) {
  try {
    if (existsSync(cacheFile)) {
      const cached = JSON.parse(readFileSync(cacheFile, "utf8"));
      if (
        typeof cached?.sha === "string" &&
        /^[0-9a-f]{7,40}$/i.test(cached.sha) &&
        typeof cached?.checkedAt === "number" &&
        now - cached.checkedAt < TTL_MS
      ) {
        return { sha: cached.sha.toLowerCase(), networkReached: false };
      }
    }
  } catch {
    // Ignore malformed cache and refresh from remote.
  }

  let sha = null;
  try {
    const p = spawnSync("git", ["ls-remote", marketplaceUrl, "refs/heads/main"], {
      timeout: timeoutMs,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      encoding: "utf8",
    });
    if (p.status === 0 && typeof p.stdout === "string") {
      const m = p.stdout.match(/^([0-9a-f]{40})\s+refs\/heads\/main/m);
      if (m) sha = m[1].toLowerCase();
    }
  } catch {
    // Fail open on network/spawn failure.
  }

  if (sha) {
    try {
      mkdirSync(dirname(cacheFile), { recursive: true });
      writeFileSync(cacheFile, JSON.stringify({ sha, checkedAt: now }) + "\n");
    } catch {
      // Cache write failure is non-fatal.
    }
  }
  return { sha, networkReached: true };
}

function commitsMatch(a, b) {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x.startsWith(y) || y.startsWith(x);
}

function hasPreCommitMiseTask(cwd) {
  try {
    const miseToml = join(cwd, "mise.toml");
    if (existsSync(miseToml)) {
      const text = readFileSync(miseToml, "utf8");
      if (/^\s*\[tasks\.(?:"pre-commit"|'pre-commit'|pre-commit)\]/m.test(text)) return true;
    }
    for (const rel of [".mise/tasks/pre-commit", "mise-tasks/pre-commit"]) {
      if (existsSync(join(cwd, rel))) return true;
    }
  } catch {
    return false;
  }
  return false;
}

function hasInstalledGitPreCommitHook(cwd) {
  try {
    const p = spawnSync("git", ["rev-parse", "--git-path", "hooks/pre-commit"], {
      cwd,
      timeout: 500,
      encoding: "utf8",
    });
    if (p.status !== 0 || typeof p.stdout !== "string") return true; // Not a Git repo: do not warn.
    const raw = p.stdout.trim();
    if (!raw) return true;
    const hookPath = isAbsolute(raw) ? raw : resolve(cwd, raw);
    return existsSync(hookPath);
  } catch {
    return true;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { warnings } = runSessionStartCheck();
  for (const w of warnings) console.log(w);
  process.exit(0);
}
