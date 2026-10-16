/**
 * OMP commit-gate guard (ADR 0009 §2, task 2026-10-16-omp-host-compat-02): the plugin hook enforces
 * the project's `permissions.deny` Bash rules on `bash` and `eval` tool calls, because OMP ignores
 * Claude permission rules. Uses the real `.claude/settings.json` of this repository.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import gIngaGuard, { type ToolCallBlock, matchBash, matchEval, parseDenyRules } from "../../hooks/pre/g-inga-guard.ts";

const REPO = join(import.meta.dir, "..", "..");
const settingsJson = readFileSync(join(REPO, ".claude", "settings.json"), "utf8");
const rules = parseDenyRules(settingsJson);

const temps: string[] = [];
afterAll(() => temps.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

// Fake OMP host: captures the `tool_call` handler registered by the default factory.
function loadHandler(): (event: unknown, ctx: unknown) => Promise<ToolCallBlock | undefined> {
  const handlers: Record<string, (event: unknown, ctx: unknown) => Promise<ToolCallBlock | undefined>> = {};
  gIngaGuard({ on(name, fn) { handlers[name] = fn; } });
  return handlers.tool_call;
}

const handler = loadHandler();
const cwd = REPO;

describe("AC1: parseDenyRules", () => {
  test("the real settings file yields one rule per Bash(...) entry, 12 in total", () => {
    expect(rules).toHaveLength(12);
    expect(rules.every((r) => r.source.startsWith("Bash(") && r.source.endsWith(")"))).toBe(true);
  });

  test("non-Bash entries are ignored", () => {
    const parsed = parseDenyRules(JSON.stringify({ permissions: { deny: ["Read(./.env)", "Bash(git push *)", 7] } }));
    expect(parsed.map((r) => r.source)).toEqual(["Bash(git push *)"]);
  });

  test("invalid JSON, missing permissions and non-array deny yield no rules", () => {
    expect(parseDenyRules("{not json")).toEqual([]);
    expect(parseDenyRules("{}")).toEqual([]);
    expect(parseDenyRules('{"permissions":{"deny":"Bash(git commit *)"}}')).toEqual([]);
  });
});

describe("AC2: bash block cases", () => {
  const cases: [string, string][] = [
    ["git commit --no-verify -m x", "Bash(git commit --no-verify*)"],
    ["git commit -m x --no-verify", "Bash(git commit * --no-verify*)"],
    ["git commit -n -m x", "Bash(git commit -n *)"],
    ["git commit -nm x", "Bash(git commit -nm*)"],
    ["HK=0 git commit -m x", "Bash(HK=0 *)"],
    ["echo ok && HK=0 git commit -m x", "Bash(HK=0 *)"],
    ["git -c core.hooksPath=/dev/null commit -m x", "Bash(git -c core.hooksPath*)"],
    ["git config core.hooksPath /tmp/h", "Bash(git config *core.hooksPath*)"],
  ];
  for (const [command, rule] of cases) {
    test(`blocks: ${command}`, async () => {
      const out = await handler({ toolName: "bash", input: { command } }, { cwd });
      expect(out?.block).toBe(true);
      expect(out?.reason).toContain(rule);
      expect(out?.reason).toContain("ADR 0009");
    });
  }
});

describe("AC3: bash allow cases", () => {
  for (const command of ['git commit -m "fix: thing"', "git status", "git log -n 3", "bun test"]) {
    test(`allows: ${command}`, async () => {
      expect(await handler({ toolName: "bash", input: { command } }, { cwd })).toBeUndefined();
    });
  }
  test("matchBash on a bare command reports the rule it hit", () => {
    expect(matchBash("git commit -nm x", rules)?.source).toBe("Bash(git commit -nm*)");
    expect(matchBash("git log -n 3", rules)).toBeUndefined();
  });
});

describe("AC4: eval cases", () => {
  test("blocks a line that is a denied command after trim and one leading !", async () => {
    const out = await handler({ toolName: "eval", input: { code: "!git commit --no-verify -m x" } }, { cwd });
    expect(out?.block).toBe(true);
    expect(out?.reason).toContain("Bash(git commit --no-verify*)");
  });

  test("blocks a denied line in a multi-line snippet", async () => {
    expect(matchEval('print("hi")\n   ! git commit -n -m x  \n', rules)?.source).toBe("Bash(git commit -n *)");
  });

  test("does not block print(\"hello\")", async () => {
    expect(await handler({ toolName: "eval", input: { code: 'print("hello")' } }, { cwd })).toBeUndefined();
    expect(matchEval('print("hello")', rules)).toBeUndefined();
  });

  test("ignores tools other than bash and eval, and non-string input", async () => {
    expect(await handler({ toolName: "read", input: { command: "git commit --no-verify" } }, { cwd })).toBeUndefined();
    expect(await handler({ toolName: "bash", input: { command: 1 } }, { cwd })).toBeUndefined();
    expect(await handler({ toolName: "eval", input: {} }, { cwd })).toBeUndefined();
  });
});

describe("AC5: rule source and fail-safety", () => {
  test("a directory without settings yields no rules", async () => {
    const dir = mkdtempSync(join(tmpdir(), "g-inga-guard-none-"));
    temps.push(dir);
    expect(await handler({ toolName: "bash", input: { command: "git commit --no-verify -m x" } }, { cwd: dir })).toBeUndefined();
  });

  test("invalid JSON in the project settings yields no rules and does not throw", async () => {
    const dir = mkdtempSync(join(tmpdir(), "g-inga-guard-bad-"));
    temps.push(dir);
    mkdirSync(join(dir, ".claude"));
    writeFileSync(join(dir, ".claude", "settings.json"), "{ broken");
    expect(await handler({ toolName: "bash", input: { command: "git commit --no-verify -m x" } }, { cwd: dir })).toBeUndefined();
  });

  test("a directory with the real settings file blocks, and a missing ctx falls back to process.cwd()", async () => {
    const dir = mkdtempSync(join(tmpdir(), "g-inga-guard-ok-"));
    temps.push(dir);
    mkdirSync(join(dir, ".claude"));
    writeFileSync(join(dir, ".claude", "settings.json"), settingsJson);
    const command = "git commit --no-verify -m x";
    expect((await handler({ toolName: "bash", input: { command } }, { cwd: dir }))?.block).toBe(true);
    // process.cwd() under `bun test` is the repository root, which has the real settings file.
    expect((await handler({ toolName: "bash", input: { command } }, undefined))?.block).toBe(true);
  });

  test("the handler never throws on malformed events or contexts", async () => {
    expect(await handler(null, null)).toBeUndefined();
    expect(await handler(undefined, { cwd: 42 })).toBeUndefined();
    expect(await handler({ toolName: "bash", input: null }, { cwd })).toBeUndefined();
  });
});
