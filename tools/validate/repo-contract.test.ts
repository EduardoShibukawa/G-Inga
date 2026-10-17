/**
 * Lightweight contracts for the repository's full validation gate.
 *
 * The full validator still runs in CI through `mise run pre-commit`; these tests
 * protect applicability, check naming and read-only behavior without recursively
 * running the repository's whole history walk inside `bun test`.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { artifactChecks } from "./artifacts/checks.ts";
import { decisionChecks } from "./decisions/decisionRecords.ts";
import { listMarkdown } from "./lib/markdown.ts";
import { cleanupFixtures, fixtureDir, git, REPO, validate } from "./testkit.ts";
import { universalChecks } from "./universal/index.ts";

const REQUIRED_REPO_CHECKS = [
  "markdown-lint",
  "local-links",
  "decision-records",
  "artifact-contract-sync",
  "artifact-contract-copy",
  "artifact-contract-examples",
  "artifact-rule-fixtures",
] as const;

const REQUIRED_REPO_CHECK_SET = new Set<string>(REQUIRED_REPO_CHECKS);
const ALL_CHECKS = [...universalChecks, ...decisionChecks, ...artifactChecks];

function hasDecisionIdPrefix(name: string): boolean {
  return /^d\d-/i.test(name);
}

function porcelain(root: string): string {
  return git(root, "status", "--porcelain", "--untracked-files=all").stdout.toString();
}

afterAll(cleanupFixtures);

describe("repository validator contract", () => {
  test("the seven required repository checks remain applicable in full mode", () => {
    const checks = ALL_CHECKS.filter((check) => REQUIRED_REPO_CHECK_SET.has(check.name));
    expect(checks.map((check) => check.name).sort()).toEqual([...REQUIRED_REPO_CHECKS].sort());

    const ctx = { root: REPO, files: listMarkdown(REPO), mode: "full" as const };
    for (const check of checks) {
      expect(check.applies(ctx), `${check.name} should apply to this repository in full mode`).toBe(true);
    }
  }, 5000);

  test("check names do not use decision-ID prefixes", () => {
    const names = ALL_CHECKS.map((check) => check.name);
    expect(hasDecisionIdPrefix("d1-custom-check")).toBe(true);
    expect(names.filter(hasDecisionIdPrefix)).toEqual([]);
  });

  test("running the validator on a committed Git fixture leaves the tree unchanged", () => {
    const root = fixtureDir({ "README.md": "# Fixture\n\nA read-only validation fixture.\n" }, { git: true });
    const before = porcelain(root);
    const run = validate(root);
    expect(run.code).toBe(0);
    expect(porcelain(root)).toBe(before);
  }, 5000);
});
