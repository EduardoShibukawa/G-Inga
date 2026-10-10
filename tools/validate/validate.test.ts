/**
 * Tests of the validator itself. Every negative case runs on a throwaway directory under the OS
 * temp dir; the canonical project documents are only read.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { externalLinks } from "./checks/externalLinks.ts";
import { findBrowser } from "./checks/mermaid.ts";
import { allCases } from "./d3/fixtures.ts";
import { bodyHash } from "./d3/records.ts";
import { reachable } from "./d3/history.ts";
import { listMarkdown } from "./lib/markdown.ts";

const REPO = resolve(import.meta.dir, "../..");
const MAIN = join(import.meta.dir, "main.ts");
const temps: string[] = [];
afterAll(() => temps.forEach((d) => rmSync(d, { recursive: true, force: true })));

function fixtureRepo(files: Record<string, string>, opts: { git?: boolean } = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "g-inga-validate-"));
  temps.push(dir);
  const base: Record<string, string> = {
    ".markdownlint.jsonc": readFileSync(join(REPO, ".markdownlint.jsonc"), "utf8"),
    "docs/decision-map.md": "# Decision map\n\nStatus values are `proposed`, `accepted` and `open`.\n\n| ID | Decision | Status | Depends on | Record |\n|---|---|---|---|---|\n| D1 | One | open | none | none |\n",
    "README.md": "# Fixture\n\nSee [the map](docs/decision-map.md).\n",
  };
  for (const [p, text] of Object.entries({ ...base, ...files })) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), text);
  }
  if (opts.git) {
    for (const args of [["init", "-q"], ["add", "-A"], ["-c", "user.email=f@example.invalid", "-c", "user.name=f", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "fixture"]])
      Bun.spawnSync(["git", ...args], { cwd: dir });
  }
  return dir;
}

function validate(root: string, env: Record<string, string> = {}) {
  const p = Bun.spawnSync(["bun", MAIN, "--root", root], { env: { ...process.env, ...env }, stdout: "pipe", stderr: "pipe" });
  return { code: p.exitCode, out: p.stdout.toString() + p.stderr.toString() };
}

const hasBrowser = findBrowser() !== undefined;

describe("entry point exit codes", () => {
  test("clean fixture passes with exit 0", () => {
    const r = validate(fixtureRepo({ "docs/a.md": "# A\n\n```mermaid\nflowchart TD\n    A --> B\n```\n" }), hasBrowser ? {} : { MERMAID_BROWSER: "/nonexistent" });
    expect(r.out).toContain("local-links       pass");
    expect(r.code).toBe(hasBrowser ? 0 : 2);
  }, 60000);

  test("missing relative link fails with exit 1", () => {
    const r = validate(fixtureRepo({ "docs/a.md": "# A\n\nSee [nothing](missing.md).\n" }), { MERMAID_BROWSER: "/nonexistent" });
    expect(r.out).toContain('broken link: "missing.md"');
    expect(r.out).toMatch(/local-links\s+fail/);
    expect(r.code).toBe(1);
  }, 60000);

  test("missing anchor and unknown ADR section fail", () => {
    const r = validate(
      fixtureRepo({ "docs/a.md": "# A\n\n## Real\n\nSee [x](#not-there) and [b](b.md) §4.\n", "docs/b.md": "# B\n\n## 1. One\n" }),
      { MERMAID_BROWSER: "/nonexistent" },
    );
    expect(r.out).toContain('missing anchor "#not-there"');
    expect(r.out).toContain("docs/b.md has no section §4");
    expect(r.code).toBe(1);
  }, 60000);

  test("links inside code are ignored; external URLs are not checked by validate", () => {
    const r = validate(fixtureRepo({ "docs/a.md": "# A\n\n`[x](nope.md)`\n\n```md\n[y](nope.md)\n```\n\n<https://nonexistent.invalid/>\n" }), { MERMAID_BROWSER: "/nonexistent" });
    expect(r.out).toMatch(/local-links\s+pass/);
    expect(r.out).toMatch(/external-links\s+not run/);
  }, 60000);

  test.skipIf(!hasBrowser)("malformed Mermaid fails with exit 1 (real render)", () => {
    const r = validate(fixtureRepo({ "docs/a.md": "# A\n\n```mermaid\nstateDiagram-v2\n    a -> b\n```\n" }));
    expect(r.out).toMatch(/mermaid\s+fail/);
    expect(r.code).toBe(1);
  }, 60000);

  test("no browser makes Mermaid blocked (exit 2), never pass", () => {
    const r = validate(fixtureRepo({ "docs/a.md": "# A\n\n```mermaid\nflowchart TD\n    A --> B\n```\n" }), { MERMAID_BROWSER: "/nonexistent" });
    expect(r.out).toMatch(/mermaid\s+blocked/);
    expect(r.code).toBe(2);
  }, 60000);

  test("markdown lint failure gives exit 1", () => {
    const r = validate(fixtureRepo({ "docs/a.md": "# A\n## B\n" }), { MERMAID_BROWSER: "/nonexistent" });
    expect(r.out).toContain("MD022");
    expect(r.code).toBe(1);
  }, 60000);

  test("decision status mismatch between map and ADR fails", () => {
    const r = validate(
      fixtureRepo({
        "docs/decision-map.md": "# Decision map\n\nStatus values are `proposed`, `accepted` and `open`.\n\n| ID | Decision | Status | Depends on | Record |\n|---|---|---|---|---|\n| D1 | One | accepted | none | [ADR 0001](decisions/0001-one.md) |\n",
        "docs/decisions/0001-one.md": "# 0001 — One\n\n- **Status:** proposed (2026-10-10)\n- **Date:** 2026-10-10\n- **Deciders:** owner\n",
      }),
      { MERMAID_BROWSER: "/nonexistent" },
    );
    expect(r.out).toContain('map says "accepted" but docs/decisions/0001-one.md says "proposed"');
    expect(r.code).toBe(1);
  }, 60000);

  test("forbidden state transition in a repository's tasks/ fails with exit 1", () => {
    const dir = fixtureRepo(
      {
        "tasks/2026-10-12-x.md":
          "---\nschema: task/1\ntier: standard\nstatus: cancelled\n---\n\n# X\n\n## Routing and approvals\n\n- tier: standard (S2 fails)\n- downgraded: standard → light because typo\n\n## Objective\n\nX.\n\n## Acceptance criteria\n\n1. AC1: x.\n\n## Verification\n\n| ID | Check | Result | Ref | Note |\n|---|---|---|---|---|\n\n## Outcome\n\nContinued as light.\n",
      },
      { git: true },
    );
    writeFileSync(join(dir, "tasks/2026-10-12-x.md"), "---\nschema: task/1\ntier: standard\nstatus: active\n---\n\n# X\n\n## Routing and approvals\n\n- tier: standard (S2 fails)\n\n## Objective\n\nX.\n\n## Acceptance criteria\n\n1. AC1: x.\n\n## Verification\n\n| ID | Check | Result | Ref | Note |\n|---|---|---|---|---|\n");
    const r = validate(dir, { MERMAID_BROWSER: "/nonexistent" });
    expect(r.out).toContain("cancelled → active is not reachable");
    expect(r.code).toBe(1);
  }, 60000);
});

describe("D3 contract fixtures (§7.2 table and review cases)", () => {
  const expectedRule: Record<string, string> = {
    T2: "§3.3", T3: "§4.4", T4: "§4.4", T6: "§4.4", T7b: "§3.3", T9: "§4.3", T10: "§7.1", T12: "§7.1",
    T14a: "§3.4", T14b: "§3.4", T15a: "§3.4", T15b: "§3.4", T16: "§3.4", T18b: "§8", T18c: "§8", T19: "§8",
    X1: "§4.4", X2: "§3.4", X3: "§3.4", X4: "§6.1", X5: "§2.2", X6: "§3.3/§4.4", X7: "§3.4", X8: "§3.3", X9: "§8",
    "H-del": "§6.1", "H-forbidden": "§3.3", "H-baseline-refreshed": "§3.4", "H-spec-version": "§4.4",
  };
  for (const c of allCases) {
    test(`${c.id}: ${c.title} → ${c.expect}`, () => {
      const { outcome, findings } = c.run();
      expect(outcome).toBe(c.expect);
      if (c.expect === "fail" || c.expect === "blocked") expect(findings.map((f) => f.rule)).toContain(expectedRule[c.id]);
    });
  }
  test("every negative fixture has an expected rule", () => {
    for (const c of allCases) if (c.expect === "fail" || c.expect === "blocked") expect(expectedRule[c.id]).toBeDefined();
  });
});

describe("D3 helpers", () => {
  test("body hash equals the §4.3 awk definition", () => {
    const dir = fixtureRepo({});
    const text = "---\nschema: spec/1\nstatus: draft\n---\n\n# S\n\nbody --- not a fence\n---\nafter a rule\n";
    writeFileSync(join(dir, "s.md"), text);
    const awk = Bun.spawnSync(["sh", "-c", "awk 'n >= 2 { print } /^---$/ { n++ }' s.md | sha256sum"], { cwd: dir }).stdout.toString().split(" ")[0];
    expect(bodyHash(text)).toBe(`sha256:${awk}`);
  });

  test("reachability follows the diagram plus the prose edge", () => {
    expect(reachable("todo", "verified")).toBe(true);
    expect(reachable("completed", "cancelled")).toBe(true);
    expect(reachable("accepted", "active")).toBe(false);
    expect(reachable("cancelled", "todo")).toBe(false);
  });
});

describe("external links stay separate from local links", () => {
  test("network failure is blocked, 404 is fail", async () => {
    const server = Bun.serve({ port: 0, fetch: (req) => new Response("x", { status: new URL(req.url).pathname === "/gone" ? 404 : 200 }) });
    try {
      const dir = fixtureRepo({
        "docs/a.md": `# A\n\n[ok](http://127.0.0.1:${server.port}/ok) [gone](http://127.0.0.1:${server.port}/gone) [down](http://127.0.0.1:9/x)\n`,
      });
      const r = await externalLinks(listMarkdown(dir), 3000);
      expect(r.status).toBe("fail");
      expect(r.findings.some((f) => f.includes("/gone") && f.includes("HTTP 404"))).toBe(true);
      expect(r.findings.some((f) => f.startsWith("blocked:") && f.includes("127.0.0.1:9"))).toBe(true);
      expect(r.findings.some((f) => !f.startsWith("blocked:") && f.includes("127.0.0.1:9"))).toBe(false);
    } finally {
      server.stop(true);
    }
  });
});

describe("read-only", () => {
  test("validating the real repository leaves git status unchanged", () => {
    const status = () => Bun.spawnSync(["git", "status", "--porcelain", "--untracked-files=all"], { cwd: REPO }).stdout.toString();
    const before = status();
    const r = validate(REPO);
    expect([0, 2]).toContain(r.code ?? -1);
    expect(status()).toBe(before);
  }, 120000);
});
