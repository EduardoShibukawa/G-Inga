import { afterAll, describe, expect, test } from "bun:test";
import { artifactChecks } from "./artifacts/checks.ts";
import { decisionChecks } from "./decisions/decisionRecords.ts";
import type { Context } from "./lib/check.ts";
import { listMarkdown } from "./lib/markdown.ts";
import { cleanupFixtures, fixtureDir, git, REPO, validate } from "./testkit.ts";
import { universalChecks } from "./universal/index.ts";

afterAll(cleanupFixtures);

const allChecks = [...universalChecks, ...decisionChecks, ...artifactChecks];

describe("repository contract", () => {
  test("G1: the seven required checks apply to this repository", () => {
    const ctx: Context = { root: REPO, files: listMarkdown(REPO), mode: "full" };
    const required = [
      "markdown-lint",
      "local-links",
      "decision-records",
      "artifact-contract-sync",
      "artifact-contract-copy",
      "artifact-contract-examples",
      "artifact-rule-fixtures",
    ];

    for (const name of required) {
      const check = allChecks.find((candidate) => candidate.name === name);
      expect(check).toBeDefined();
      expect(check!.applies(ctx)).toBe(true);
    }
  });

  test("G2: no check is named after a decision ID", () => {
    expect(allChecks.every((check) => !/^d\d+[a-z]?$/i.test(check.name))).toBe(true);
  });

  test("G3: validation does not change a Git fixture", () => {
    const dir = fixtureDir({ "docs/a.md": "# A\n\nA small fixture.\n" }, { git: true });
    const porcelain = () => git(dir, "status", "--porcelain", "--untracked-files=all").stdout.toString();
    const before = porcelain();

    validate(dir);

    expect(porcelain()).toBe(before);
  });
});
