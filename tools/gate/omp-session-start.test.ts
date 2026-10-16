/**
 * OMP session-start factory (hooks/pre/g-inga-session-start.ts): surfaces the missing Git pre-commit
 * hook warning once in the OMP UI (`ui.notify`) and once in model context (`before_agent_start`).
 * Pattern for temp repositories follows `makeProjectRepo` in tools/gate/startup-warnings.test.ts.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import gIngaSessionStart, { ompStartupCheck } from "../../hooks/pre/g-inga-session-start.ts";

const temps: string[] = [];
afterAll(() => temps.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

function makeProjectRepo(opts: { withPreCommitTask: boolean; withGitHook: boolean }): string {
  const dir = mkdtempSync(join(tmpdir(), "g-inga-omp-proj-"));
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

type Result = { message: { customType: string; content: string; display: boolean } } | undefined;
type Ctx = { cwd?: string; ui?: { notify?: (message: string, level: string) => void } };
type Handler = (event: unknown, ctx?: Ctx) => Promise<Result>;

// Fake OMP extension API: records handlers by event name.
function fakePi(): { handlers: Record<string, Handler> } {
  const handlers: Record<string, Handler> = {};
  const pi = {
    on(name: "session_start" | "before_agent_start", fn: Handler) {
      handlers[name] = fn;
    },
  };
  gIngaSessionStart(pi);
  return { handlers };
}

describe("OMP session-start factory", () => {
  test("AC1: session_start notifies the missing Git pre-commit hook once, as a warning", async () => {
    const cwd = makeProjectRepo({ withPreCommitTask: true, withGitHook: false });
    const { handlers } = fakePi();
    const calls: [string, string][] = [];
    const ctx = { cwd, ui: { notify: (msg: string, level: string) => void calls.push([msg, level]) } };
    await handlers.session_start({}, ctx);
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toBe("warning");
    expect(calls[0][0]).toContain("no Git pre-commit hook is installed");
  });

  test("AC2: first before_agent_start returns the warning as model context, second returns undefined", async () => {
    const cwd = makeProjectRepo({ withPreCommitTask: true, withGitHook: false });
    const { handlers } = fakePi();
    await handlers.session_start({}, { cwd, ui: { notify: () => undefined } });
    const first = await handlers.before_agent_start({});
    expect(first?.message.customType).toBe("g-inga.session-start");
    expect(first?.message.display).toBe(true);
    expect(first?.message.content).toContain("no Git pre-commit hook is installed");
    expect(await handlers.before_agent_start({})).toBeUndefined();
  });

  test("AC3: no warning when the Git pre-commit hook is installed", async () => {
    const cwd = makeProjectRepo({ withPreCommitTask: true, withGitHook: true });
    const { handlers } = fakePi();
    let notified = false;
    await handlers.session_start({}, { cwd, ui: { notify: () => { notified = true; } } });
    expect(notified).toBe(false);
    expect(await handlers.before_agent_start({})).toBeUndefined();
  });

  test("AC3: no warning when the repository has no pre-commit mise task", async () => {
    const cwd = makeProjectRepo({ withPreCommitTask: false, withGitHook: false });
    const { handlers } = fakePi();
    let notified = false;
    await handlers.session_start({}, { cwd, ui: { notify: () => { notified = true; } } });
    expect(notified).toBe(false);
    expect(await handlers.before_agent_start({})).toBeUndefined();
  });

  test("AC4: ompStartupCheck never reaches the network", () => {
    const cwd = makeProjectRepo({ withPreCommitTask: true, withGitHook: false });
    const result = ompStartupCheck(cwd);
    expect(result.networkReached).toBe(false);
    expect(result.warnings.length).toBe(1);
  });
});
