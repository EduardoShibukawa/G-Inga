/**
 * Tests of the entry point, the universal layer, the decision-record layer and check applicability.
 * Every case runs on a throwaway directory; the canonical project documents are only read.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { listMarkdown } from "./lib/markdown.ts";
import { preflight } from "./preflight.ts";
import { cleanupFixtures, DECISION_MAP, fixtureDir, hasBrowser, NO_BROWSER, status, validate } from "./testkit.ts";
import { externalLinks } from "./universal/externalLinks.ts";

afterAll(cleanupFixtures);

const ARTIFACT_CHECKS = ["artifact-contract-sync", "artifact-contract-copy", "artifact-contract-examples", "artifact-rule-fixtures", "artifact-records"];

describe("universal checks on general Markdown", () => {
  test("documents with and without frontmatter pass; type-specific checks are not run (exit 0)", () => {
    const r = validate(
      fixtureDir({
        "README.md": "# Notes\n\nSee [guide](docs/guide.md#setup) and [page](docs/page.md).\n",
        "docs/guide.md": "---\nowner: docs\ntags: [a, b]\n---\n\n# Guide\n\n## Setup\n\nText.\n",
        "docs/page.md": "# Page\n\nNo frontmatter here.\n",
      }),
    );
    for (const c of ["markdown-lint", "local-links"]) expect(status(c, r.out)).toBe("pass");
    expect(status("mermaid", r.out)).toBe("not run");
    expect(status("decision-records", r.out)).toBe("not run");
    for (const c of ARTIFACT_CHECKS) expect(status(c, r.out)).toBe("not run");
    expect(r.code).toBe(0);
  }, 60000);

  test.skipIf(!hasBrowser)("valid Mermaid renders (exit 0)", () => {
    const r = validate(fixtureDir({ "docs/a.md": "# A\n\n```mermaid\nflowchart TD\n    A --> B\n```\n" }));
    expect(status("mermaid", r.out)).toBe("pass");
    expect(r.code).toBe(0);
  }, 60000);

  test.skipIf(!hasBrowser)("malformed Mermaid fails with exit 1 (real render)", () => {
    const r = validate(fixtureDir({ "docs/a.md": "# A\n\n```mermaid\nstateDiagram-v2\n    a -> b\n```\n" }));
    expect(status("mermaid", r.out)).toBe("fail");
    expect(r.code).toBe(1);
  }, 60000);

  test("no browser makes Mermaid blocked (exit 2), never pass", () => {
    const r = validate(fixtureDir({ "docs/a.md": "# A\n\n```mermaid\nflowchart TD\n    A --> B\n```\n" }), NO_BROWSER);
    expect(status("mermaid", r.out)).toBe("blocked");
    expect(r.code).toBe(2);
  }, 60000);

  test("missing relative link fails with exit 1", () => {
    const r = validate(fixtureDir({ "docs/a.md": "# A\n\nSee [nothing](missing.md).\n" }));
    expect(r.out).toContain('broken link: "missing.md"');
    expect(status("local-links", r.out)).toBe("fail");
    expect(r.code).toBe(1);
  }, 60000);

  test("missing anchor and unknown numbered section fail", () => {
    const r = validate(fixtureDir({ "docs/a.md": "# A\n\n## Real\n\nSee [x](#not-there) and [b](b.md) §4.\n", "docs/b.md": "# B\n\n## 1. One\n" }));
    expect(r.out).toContain('missing anchor "#not-there"');
    expect(r.out).toContain("docs/b.md has no section §4");
    expect(r.code).toBe(1);
  }, 60000);

  test("links inside code are ignored; external URLs are not checked by validate", () => {
    const r = validate(fixtureDir({ "docs/a.md": "# A\n\n`[x](nope.md)`\n\n```md\n[y](nope.md)\n```\n\n<https://nonexistent.invalid/>\n" }));
    expect(status("local-links", r.out)).toBe("pass");
    expect(status("external-links", r.out)).toBe("not run");
  }, 60000);

  test("markdown lint failure gives exit 1", () => {
    const r = validate(fixtureDir({ "docs/a.md": "# A\n## B\n" }));
    expect(r.out).toContain("MD022");
    expect(r.code).toBe(1);
  }, 60000);
});

describe("decision-record checks apply to decision records", () => {
  test("a decision map alone is checked", () => {
    const r = validate(fixtureDir({ "docs/decision-map.md": DECISION_MAP }));
    expect(status("decision-records", r.out)).toBe("pass");
    expect(r.code).toBe(0);
  }, 60000);

  test("ADR missing its Deciders line fails", () => {
    const r = validate(
      fixtureDir({
        "docs/decision-map.md": DECISION_MAP.replace("| open | none | none |", "| open | none | [ADR 0001](decisions/0001-one.md) |"),
        "docs/decisions/0001-one.md": "# 0001 — One\n\n- **Status:** open\n- **Date:** 2026-10-10\n",
      }),
    );
    expect(r.out).toContain('missing "- **Deciders:**" line');
    expect(status("decision-records", r.out)).toBe("fail");
    expect(r.code).toBe(1);
  }, 60000);

  test("status mismatch between map and ADR fails", () => {
    const r = validate(
      fixtureDir({
        "docs/decision-map.md": DECISION_MAP.replace("| open | none | none |", "| accepted | none | [ADR 0001](decisions/0001-one.md) |"),
        "docs/decisions/0001-one.md": "# 0001 — One\n\n- **Status:** proposed (2026-10-10)\n- **Date:** 2026-10-10\n- **Deciders:** owner\n",
      }),
    );
    expect(r.out).toContain('map says "accepted" but docs/decisions/0001-one.md says "proposed"');
    expect(r.code).toBe(1);
  }, 60000);

  test("two ADRs sharing a number fail", () => {
    const adr = (t: string) => `# 0001 — ${t}\n\n- **Status:** open\n- **Date:** 2026-10-10\n- **Deciders:** owner\n`;
    const r = validate(
      fixtureDir({
        "docs/decision-map.md": DECISION_MAP.replace("| open | none | none |", "| open | none | [ADR 0001](decisions/0001-one.md), [ADR 0001](decisions/0001-two.md) |"),
        "docs/decisions/0001-one.md": adr("One"),
        "docs/decisions/0001-two.md": adr("Two"),
      }),
    );
    expect(r.out).toContain("ADR number 0001 is already used by");
    expect(status("decision-records", r.out)).toBe("fail");
    expect(r.code).toBe(1);
  }, 60000);

  test("ADRs without a decision map are blocked, not passed", () => {
    const r = validate(fixtureDir({ "docs/decisions/0001-one.md": "# 0001 — One\n\n- **Status:** open\n- **Date:** 2026-10-10\n- **Deciders:** owner\n" }));
    expect(status("decision-records", r.out)).toBe("blocked");
    expect(r.code).toBe(2);
  }, 60000);
});

describe("task-state rules stay off unrelated Markdown", () => {
  test("a tasks/ folder of notes without a task schema is not treated as records", () => {
    const dir = fixtureDir(
      {
        "tasks/todo.md": "# Todo\n\n- [ ] buy milk\n",
        "tasks/meeting.md": "---\ndate: 2026-10-10\nstatus: done\n---\n\n# Meeting\n\nNotes.\n",
        "specs/ideas.md": "# Ideas\n\nSome ideas.\n",
      },
      { git: true },
    );
    const r = validate(dir);
    expect(status("artifact-records", r.out)).toBe("not run");
    expect(r.out).not.toContain("is not a task state");
    expect(r.code).toBe(0);
  }, 60000);
});

describe("external links stay separate from local links", () => {
  test("network failure is blocked, 404 is fail", async () => {
    const server = Bun.serve({ port: 0, fetch: (req) => new Response("x", { status: new URL(req.url).pathname === "/gone" ? 404 : 200 }) });
    try {
      const dir = fixtureDir({ "docs/a.md": `# A\n\n[ok](http://127.0.0.1:${server.port}/ok) [gone](http://127.0.0.1:${server.port}/gone) [down](http://127.0.0.1:9/x)\n` });
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

describe("preflight", () => {
  const PKG = JSON.stringify({ devDependencies: { yaml: "^2.9.1" } });
  const MISE = '[tools]\nbun = "1.4.2"\n';

  test("missing dependencies are reported with the setup command", () => {
    const r = preflight(fixtureDir({ "package.json": PKG, "mise.toml": MISE }), "1.4.2");
    expect(r.missing.join()).toContain("bun install --frozen-lockfile");
    expect(r.warnings).toEqual([]);
  });

  test("installed dependencies and the pinned Bun pass; another Bun only warns", () => {
    const dir = fixtureDir({ "package.json": PKG, "mise.toml": MISE, "node_modules/yaml/package.json": "{}" });
    expect(preflight(dir, "1.4.2")).toEqual({ missing: [], warnings: [] });
    const r = preflight(dir, "1.3.0");
    expect(r.missing).toEqual([]);
    expect(r.warnings.join()).toContain("mise.toml pins 1.4.2");
  });
});
