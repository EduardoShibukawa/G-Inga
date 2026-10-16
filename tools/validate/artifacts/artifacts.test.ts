/**
 * Task/spec artifact layer: the contract's rule fixtures, its helpers, and when the layer applies.
 * Contract-document tests run on copies under the OS temp dir; the canonical files are only read.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cleanupFixtures, commitAll, fixtureDir, git, NO_BROWSER, REPO, status, validate } from "../testkit.ts";
import { allCases, approvedV1, draftV1, task } from "./fixtures.ts";
import { CONTRACT_COPY, HEADER, LINK_PREFIX, renderContractCopy } from "../contract-copy.mjs";
import { contractCopy } from "./checks.ts";
import { reachable, recordHistory } from "./history.ts";
import { bodyHash } from "./records.ts";

afterAll(cleanupFixtures);

describe("contract rule fixtures (§7.2 table and review cases)", () => {
  const expectedRule: Record<string, string> = {
    T2: "§3.3", T3: "§4.4", T4: "§4.4", T6: "§4.4", T7b: "§3.3", T9: "§4.3", T10: "§7.1", T12: "§7.1",
    T14a: "§3.4", T14b: "§3.4", T15a: "§3.4", T15b: "§3.4", T16: "§3.4", T18b: "§8", T18c: "§8", T19: "§8",
    X1: "§4.4", X2: "§3.4", X3: "§3.4", X4: "§6.1", X5: "§2.2", X6: "§3.3/§4.4", X7: "§3.4", X8: "§3.3", X9: "§8",
    X11: "§3.3", X12: "§3.3", X14: "§3.4",
    "H-del": "§6.1", "H-squash-no-entry": "§7.1", "H-squash-bad-hash": "§7.1", "H-squash-v2": "§7.1", "H-squash-old-entry": "§7.1", "H-forbidden": "§3.3", "H-baseline-refreshed": "§3.4", "H-spec-version": "§4.4",
    "H-intent-del": "§7.1", "H-intent-reopen": "§4.5",
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

describe("contract helpers", () => {
  test("body hash equals the §4.3 awk definition", () => {
    const dir = fixtureDir({});
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

const ROW = (id: string, r: string, ref: string): [string, string, string] => [id, r, ref];

describe("record rules apply when task or spec records are present", () => {
  test("a verified record missing its V row fails (§3.4)", () => {
    const dir = fixtureDir({ "README.md": "# R\n" }, { git: true });
    const base = Bun.spawnSync(["git", "rev-parse", "--short=7", "HEAD"], { cwd: dir }).stdout.toString().trim();
    writeFileSync(join(dir, "src.txt"), "change\n");
    commitAll(dir);
    const head = Bun.spawnSync(["git", "rev-parse", "--short=7", "HEAD"], { cwd: dir }).stdout.toString().trim();
    const rec = task({ status: "verified", verifiedAt: head, rows: [ROW("B1", "pass", base), ROW("AC1", "pass", head), ROW("R1", "pass", head)] });
    mkdirSync(join(dir, "tasks"));
    writeFileSync(join(dir, "tasks/2026-10-12-x.md"), rec);
    const r = validate(dir, NO_BROWSER);
    expect(status("artifact-records", r.out)).toBe("fail");
    expect(r.out).toContain("needs at least one V row");
    expect(r.code).toBe(1);
  }, 60000);

  test("the same record with its V row passes", () => {
    const dir = fixtureDir({ "README.md": "# R\n" }, { git: true });
    const base = Bun.spawnSync(["git", "rev-parse", "--short=7", "HEAD"], { cwd: dir }).stdout.toString().trim();
    writeFileSync(join(dir, "src.txt"), "change\n");
    commitAll(dir);
    const head = Bun.spawnSync(["git", "rev-parse", "--short=7", "HEAD"], { cwd: dir }).stdout.toString().trim();
    const rec = task({ status: "verified", verifiedAt: head, rows: [ROW("B1", "pass", base), ROW("AC1", "pass", head), ROW("R1", "pass", head), ROW("V1", "pass", head)] });
    mkdirSync(join(dir, "tasks"));
    writeFileSync(join(dir, "tasks/2026-10-12-x.md"), rec);
    const r = validate(dir, NO_BROWSER);
    expect(status("artifact-records", r.out)).toBe("pass");
    expect(r.code).toBe(0);
  }, 60000);

  test("a forbidden committed transition fails (cancelled → active)", () => {
    const dir = fixtureDir(
      { "tasks/2026-10-12-x.md": task({ status: "cancelled", log: ["tier: standard (S2 fails)", "downgraded: standard → light because typo"] }) },
      { git: true },
    );
    writeFileSync(join(dir, "tasks/2026-10-12-x.md"), task({ status: "active" }));
    const r = validate(dir, NO_BROWSER);
    expect(r.out).toContain("cancelled → active is not reachable");
    expect(r.code).toBe(1);
  }, 60000);

  test("next to real records, a schema-less file keeps the §8 blocked rule", () => {
    const dir = fixtureDir({ "tasks/2026-10-12-x.md": task({ status: "active" }), "tasks/notes.md": "# Notes\n\nScratch.\n" }, { git: true });
    const r = validate(dir, NO_BROWSER);
    expect(status("artifact-records", r.out)).toBe("blocked");
    expect(r.out).toContain("tasks/notes.md §8");
    expect(r.code).toBe(2);
  }, 60000);

  test("records outside a Git repository are blocked, not passed", () => {
    const r = validate(fixtureDir({ "tasks/2026-10-12-x.md": task({ status: "active" }) }), NO_BROWSER);
    expect(status("artifact-records", r.out)).toBe("blocked");
    expect(r.code).toBe(2);
  }, 60000);
});

describe("contract checks apply where the contract document is", () => {
  const copyDocs = () => {
    const dir = fixtureDir({});
    cpSync(join(REPO, "docs"), join(dir, "docs"), { recursive: true });
    return dir;
  };

  test("a copy of this repository's docs gets the contract checks, and they pass", () => {
    const r = validate(copyDocs(), NO_BROWSER);
    for (const c of ["artifact-contract-sync", "artifact-contract-examples", "artifact-rule-fixtures"]) expect(status(c, r.out)).toBe("pass");
  }, 60000);

  test("a state-diagram edge removed from the copied contract is detected", () => {
    const dir = copyDocs();
    const path = join(dir, "docs/artifact-contracts.md");
    const text = readFileSync(path, "utf8");
    expect(text).toContain("    completed --> verified: verification rule holds at verified_at\n");
    writeFileSync(path, text.replace("    completed --> verified: verification rule holds at verified_at\n", ""));
    const r = validate(dir, NO_BROWSER);
    expect(status("artifact-contract-sync", r.out)).toBe("fail");
    expect(r.out).toContain("contract.json edge completed → verified not in the docs/artifact-contracts.md state diagram");
    expect(r.code).toBe(1);
  }, 60000);

  test("a status change in the copied defining ADR is detected", () => {
    const dir = copyDocs();
    const path = join(dir, "docs/decisions/0003-minimum-artifact-schemas.md");
    writeFileSync(path, readFileSync(path, "utf8").replace("- **Status:** accepted", "- **Status:** superseded"));
    const r = validate(dir, NO_BROWSER);
    expect(status("artifact-contract-sync", r.out)).toBe("fail");
    expect(r.code).toBe(1);
  }, 60000);
});

describe("the bundle's contract copy matches the canonical contract (task 04, AC1, AC2)", () => {
  /** docs/ and .claude/skills/work/ of this repository, copied: the layout where the copy check applies. */
  const copyBundleSource = () => {
    const dir = fixtureDir({});
    cpSync(join(REPO, "docs"), join(dir, "docs"), { recursive: true });
    cpSync(join(REPO, ".claude/skills/work"), join(dir, ".claude/skills/work"), { recursive: true });
    return dir;
  };

  test("the committed copy is the transform of the canonical contract", () => {
    const canonical = readFileSync(join(REPO, "docs/artifact-contracts.md"), "utf8");
    expect(readFileSync(join(REPO, CONTRACT_COPY), "utf8")).toBe(renderContractCopy(canonical));
    expect(contractCopy(REPO).status).toBe("pass");
  });

  test("the transform adds only the header and the link prefix, and states its source", () => {
    const canonical = readFileSync(join(REPO, "docs/artifact-contracts.md"), "utf8");
    const copy = renderContractCopy(canonical);
    expect(copy.startsWith(HEADER)).toBe(true);
    expect(HEADER).toContain("Generated copy of docs/artifact-contracts.md");
    expect(copy.slice(HEADER.length).split(LINK_PREFIX).join("")).toBe(canonical);
    expect(renderContractCopy("[a](x.md) [b](https://e.example/x) [c](#y) [d](/z)\n")).toBe(
      `${HEADER}[a](${LINK_PREFIX}x.md) [b](https://e.example/x) [c](#y) [d](/z)\n`,
    );
  });

  test("an edit to the canonical contract without regenerating the copy fails validation (exit 1)", () => {
    const dir = copyBundleSource();
    const path = join(dir, "docs/artifact-contracts.md");
    writeFileSync(path, readFileSync(path, "utf8").replace("## 2. Shared conventions", "## 2. Shared conventions\n\nA drifted sentence."));
    const r = validate(dir, NO_BROWSER);
    expect(status("artifact-contract-copy", r.out)).toBe("fail");
    expect(r.out).toContain(`${CONTRACT_COPY}:`);
    expect(r.code).toBe(1);
  }, 60000);

  test("an edit to the copy alone fails, a deleted copy fails, and the regenerated copy passes", () => {
    const dir = copyBundleSource();
    const copy = join(dir, CONTRACT_COPY);
    writeFileSync(copy, readFileSync(copy, "utf8") + " ");
    expect(contractCopy(dir).status).toBe("fail");
    rmSync(copy);
    expect(contractCopy(dir).findings.join()).toContain("is missing");
    writeFileSync(copy, renderContractCopy(readFileSync(join(dir, "docs/artifact-contracts.md"), "utf8")));
    expect(contractCopy(dir).status).toBe("pass");
  });

  test("without .claude/skills/work/ there is no copy to check: not run", () => {
    const dir = fixtureDir({});
    cpSync(join(REPO, "docs"), join(dir, "docs"), { recursive: true });
    const r = validate(dir, NO_BROWSER);
    expect(status("artifact-contract-copy", r.out)).toBe("not run");
  }, 60000);
});

describe("applicability uses Git history, so deleting every record can't turn the check off", () => {
  const RECORD = "tasks/2026-10-12-x.md";
  const shallowClone = (dir: string) => {
    const clone = `${dir}-shallow`;
    git(dir, "clone", "-q", "--depth", "1", `file://${dir}`, clone);
    return clone;
  };
  /** A repository whose only record was committed, then deleted and the deletion committed. */
  const allDeleted = () => {
    const dir = fixtureDir({ "README.md": "# R\n", [RECORD]: task({ status: "active" }) }, { git: true });
    rmSync(join(dir, RECORD));
    commitAll(dir);
    return dir;
  };

  test("never contained records: not run, with Git history as the evidence", () => {
    const dir = fixtureDir({ "README.md": "# R\n", "tasks/todo.md": "# Todo\n\n- [ ] x\n" }, { git: true });
    expect(recordHistory(dir).kind).toBe("none");
    const r = validate(dir, NO_BROWSER);
    expect(status("artifact-records", r.out)).toBe("not run");
    expect(r.out).toContain("no task or spec records, now or in Git history");
    expect(r.code).toBe(0);
  }, 60000);

  test("current records: the walk runs and passes", () => {
    const dir = fixtureDir({ [RECORD]: task({ status: "active" }) }, { git: true });
    const r = validate(dir, NO_BROWSER);
    expect(status("artifact-records", r.out)).toBe("pass");
    expect(r.code).toBe(0);
  }, 60000);

  test("every tracked record deleted and committed: the walk runs and fails the deletion (§6.1)", () => {
    const dir = allDeleted();
    expect(recordHistory(dir).kind).toBe("some");
    const r = validate(dir, NO_BROWSER);
    expect(status("artifact-records", r.out)).toBe("fail");
    expect(r.out).toContain(`${RECORD} was deleted; a committed task record is closed as cancelled, never deleted (§6.1)`);
    expect(r.code).toBe(1);
  }, 60000);

  test("a record present on one branch and absent on a parallel one is not a deletion (§6.1)", () => {
    const X = "tasks/2026-10-12-x.md";
    const Y = "tasks/2026-10-12-y.md";
    const dir = fixtureDir({ "README.md": "# R\n" }, { git: true });
    const g = (...args: string[]) => {
      const r = git(dir, ...args);
      if (r.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr.toString()}`);
      return r.stdout.toString().trim();
    };
    const base = g("rev-parse", "--abbrev-ref", "HEAD");
    mkdirSync(join(dir, "tasks"), { recursive: true });
    // X lands on its own branch; the base branch advances with Y from the same commit; the two merge later.
    // The linear history walk then sees X absent on the sibling branch, which git's DAG says is no deletion.
    g("checkout", "-q", "-b", "feature-x");
    writeFileSync(join(dir, X), task({ status: "active" }));
    commitAll(dir);
    const x = g("rev-parse", "HEAD");
    g("checkout", "-q", base);
    mkdirSync(join(dir, "tasks"), { recursive: true });
    writeFileSync(join(dir, Y), task({ status: "active" }));
    commitAll(dir);
    g("merge", "-q", "--no-ff", "-m", "merge feature-x", x);
    const r = validate(dir, NO_BROWSER);
    expect(status("artifact-records", r.out)).toBe("pass");
    expect(r.code).toBe(0);
  }, 60000);

  test("a record absent at a sibling-branch commit doesn't reappear as newly created after the merge (§4.3)", () => {
    const dir = fixtureDir({ "README.md": "# R\n" }, { git: true });
    const g = (...args: string[]) => {
      const r = git(dir, ...args);
      if (r.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr.toString()}`);
      return r.stdout.toString().trim();
    };
    // Fixed dates order the linear walk: feature draft, feature approval, then the base commit without the spec.
    const commitAt = (date: string) => {
      g("add", "-A");
      const env = { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date };
      const r = Bun.spawnSync(["git", "-c", "user.email=f@example.invalid", "-c", "user.name=f", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "fixture"], { cwd: dir, env, stderr: "pipe" });
      if (r.exitCode !== 0) throw new Error(r.stderr.toString());
    };
    const write = (files: Record<string, string | null>) => {
      for (const [path, body] of Object.entries(files)) {
        mkdirSync(join(dir, path, ".."), { recursive: true });
        writeFileSync(join(dir, path), body!);
      }
    };
    const base = g("rev-parse", "--abbrev-ref", "HEAD");
    g("checkout", "-q", "-b", "feature-spec");
    write(draftV1([]));
    commitAt("2026-10-14T10:00:00Z");
    write(approvedV1([]));
    commitAt("2026-10-14T11:00:00Z");
    const feature = g("rev-parse", "HEAD");
    g("checkout", "-q", base);
    write({ "tasks/2026-10-12-y.md": task({ status: "active" }) });
    commitAt("2026-10-14T12:00:00Z");
    const env = { ...process.env, GIT_AUTHOR_DATE: "2026-10-14T13:00:00Z", GIT_COMMITTER_DATE: "2026-10-14T13:00:00Z" };
    const m = Bun.spawnSync(["git", "-c", "user.email=f@example.invalid", "-c", "user.name=f", "merge", "-q", "--no-ff", "-m", "merge feature-spec", feature], { cwd: dir, env, stderr: "pipe" });
    if (m.exitCode !== 0) throw new Error(m.stderr.toString());
    const r = validate(dir, NO_BROWSER);
    expect(r.out).not.toContain("must be created as draft");
    expect(status("artifact-records", r.out)).toBe("pass");
    expect(r.code).toBe(0);
  }, 60000);

  test("a record modified on one branch and unchanged on a later sibling-branch commit doesn't regress (§3.3)", () => {
    const X = "tasks/2026-10-12-x.md";
    const Y = "tasks/2026-10-12-y.md";
    const closed = task({ status: "cancelled", log: ["tier: standard (S2 fails)", "downgraded: standard → light because typo"] });
    const dir = fixtureDir({ "README.md": "# R\n" }, { git: true });
    const g = (...args: string[]) => {
      const r = git(dir, ...args);
      if (r.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr.toString()}`);
      return r.stdout.toString().trim();
    };
    const commitAt = (date: string) => {
      g("add", "-A");
      const env = { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date };
      const r = Bun.spawnSync(["git", "-c", "user.email=f@example.invalid", "-c", "user.name=f", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "fixture"], { cwd: dir, env, stderr: "pipe" });
      if (r.exitCode !== 0) throw new Error(r.stderr.toString());
    };
    const base = g("rev-parse", "--abbrev-ref", "HEAD");
    mkdirSync(join(dir, "tasks"), { recursive: true });
    // Both X and Y exist as active at the fork point.
    writeFileSync(join(dir, X), task({ status: "active" }));
    writeFileSync(join(dir, Y), task({ status: "active" }));
    commitAt("2026-10-14T10:00:00Z");
    // Branch A closes X as cancelled at 11:00.
    g("checkout", "-q", "-b", "branch-x");
    writeFileSync(join(dir, X), closed);
    commitAt("2026-10-14T11:00:00Z");
    const branchX = g("rev-parse", "HEAD");
    // Sibling branch (base) modifies only Y at 12:00; X is still active in its tree.
    g("checkout", "-q", base);
    writeFileSync(join(dir, Y), closed);
    commitAt("2026-10-14T12:00:00Z");
    const env = { ...process.env, GIT_AUTHOR_DATE: "2026-10-14T13:00:00Z", GIT_COMMITTER_DATE: "2026-10-14T13:00:00Z" };
    const m = Bun.spawnSync(["git", "-c", "user.email=f@example.invalid", "-c", "user.name=f", "merge", "-q", "--no-ff", "-m", "merge branch-x", branchX], { cwd: dir, env, stderr: "pipe" });
    if (m.exitCode !== 0) throw new Error(m.stderr.toString());
    const r = validate(dir, NO_BROWSER);
    expect(r.out).not.toContain("cancelled → active is not reachable");
    expect(status("artifact-records", r.out)).toBe("pass");
    expect(r.code).toBe(0);
  }, 60000);

  test("every tracked record deleted but not committed yet: still fails", () => {
    const dir = fixtureDir({ [RECORD]: task({ status: "active" }) }, { git: true });
    rmSync(join(dir, "tasks"), { recursive: true });
    const r = validate(dir, NO_BROWSER);
    expect(status("artifact-records", r.out)).toBe("fail");
    expect(r.out).toContain("working tree: tasks/2026-10-12-x.md was deleted");
    expect(r.code).toBe(1);
  }, 60000);

  test("a deleted committed spec also fails", () => {
    const dir = fixtureDir({ "specs/2026-10-14-s.md": "---\nschema: spec/1\nstatus: draft\nversion: 1\n---\n\n# S\n" }, { git: true });
    rmSync(join(dir, "specs/2026-10-14-s.md"));
    commitAll(dir);
    const r = validate(dir, NO_BROWSER);
    expect(status("artifact-records", r.out)).toBe("fail");
    expect(r.out).toContain("a spec is never deleted");
  }, 60000);

  test("shallow clone after every record was deleted: blocked, not not-run", () => {
    const clone = shallowClone(allDeleted());
    expect(git(clone, "rev-parse", "--is-shallow-repository").stdout.toString().trim()).toBe("true");
    expect(recordHistory(clone)).toEqual({ kind: "unknown", reason: "shallow" });
    const r = validate(clone, NO_BROWSER);
    expect(status("artifact-records", r.out)).toBe("blocked");
    expect(r.out).toContain("deleted-record detection need full history");
    expect(r.code).toBe(2);
    rmSync(clone, { recursive: true, force: true });
  }, 60000);

  test("shallow clone of a repository that never had records: blocked, because history can't prove it", () => {
    const clone = shallowClone(fixtureDir({ "README.md": "# R\n" }, { git: true }));
    const r = validate(clone, NO_BROWSER);
    expect(status("artifact-records", r.out)).toBe("blocked");
    expect(r.code).toBe(2);
    rmSync(clone, { recursive: true, force: true });
  }, 60000);

  test("not a Git repository and no records: not run (nothing was ever tracked)", () => {
    const r = validate(fixtureDir({ "README.md": "# R\n" }), NO_BROWSER);
    expect(status("artifact-records", r.out)).toBe("not run");
    expect(r.out).toContain("not a Git repository");
    expect(r.code).toBe(0);
  }, 60000);

  test("a repository with no commits yet: not run", () => {
    const dir = fixtureDir({ "README.md": "# R\n" });
    git(dir, "init", "-q");
    expect(recordHistory(dir).kind).toBe("none");
    expect(status("artifact-records", validate(dir, NO_BROWSER).out)).toBe("not run");
  }, 60000);
});

describe("Git hook environment (spec 2026-10-14-harness-hardening SC1)", () => {
  // A pre-commit hook in a linked worktree exports absolute GIT_DIR and GIT_INDEX_FILE. The
  // validator's history fixtures run git in their own temp repositories, so they must not follow
  // those variables into the repository being committed to. The fixtures run in a child process
  // started with that environment, as the hook starts the validator.
  test("history fixtures ignore an inherited GIT_DIR and GIT_INDEX_FILE", () => {
    const decoy = fixtureDir({});
    expect(git(decoy, "init", "-q").exitCode).toBe(0);
    const config = () => readFileSync(join(decoy, ".git", "config"), "utf8");
    const before = config();
    const script = `import { allCases } from ${JSON.stringify(join(import.meta.dir, "fixtures.ts"))};
for (const c of allCases.filter((x) => x.id.startsWith("H-"))) {
  const got = c.run().outcome;
  if (got !== c.expect) { console.log(c.id + ": " + got + " (expected " + c.expect + ")"); process.exitCode = 1; }
}`;
    const env = { ...process.env, GIT_DIR: join(decoy, ".git"), GIT_INDEX_FILE: join(decoy, ".git", "index") };
    const p = Bun.spawnSync(["bun", "-e", script], { env, stdout: "pipe", stderr: "pipe" });
    expect(p.stdout.toString() + p.stderr.toString()).toBe("");
    expect(p.exitCode).toBe(0);
    expect(config()).toBe(before);
  }, 60_000);
});

describe("validator UX and AI-native SDLC (spec 2026-10-15-validator-ux-and-ai-native-sdlc SC1–SC6)", () => {
  test("SC1 & SC2: --authoring ignores historical commit violations while reporting identical current-tree findings", () => {
    const dir = fixtureDir(
      { "tasks/2026-10-12-x.md": task({ status: "cancelled", log: ["tier: standard (S2 fails)", "downgraded: standard → light because typo"] }) },
      { git: true },
    );
    // Commit a forbidden transition (cancelled → active) in history, then keep current tree valid.
    writeFileSync(join(dir, "tasks/2026-10-12-x.md"), task({ status: "active" }));
    commitAll(dir);
    const full = validate(dir, NO_BROWSER);
    const auth = validate(dir, NO_BROWSER, ["--authoring"]);
    expect(status("artifact-records", full.out)).toBe("fail");
    expect(full.out).toContain("cancelled → active is not reachable");
    expect(status("artifact-records", auth.out)).toBe("pass");
    expect(auth.code).toBe(0);

    // Introduce a current-tree violation (verified missing V row): both modes report the exact same current-tree finding.
    const head = Bun.spawnSync(["git", "rev-parse", "--short=7", "HEAD"], { cwd: dir }).stdout.toString().trim();
    writeFileSync(
      join(dir, "tasks/2026-10-12-x.md"),
      task({ status: "verified", verifiedAt: head, rows: [ROW("B1", "pass", "1111111"), ROW("AC1", "pass", head), ROW("R1", "pass", head)] }),
    );
    const fullCurr = validate(dir, NO_BROWSER);
    const authCurr = validate(dir, NO_BROWSER, ["--authoring"]);
    const currFinding = "tasks/2026-10-12-x.md §3.4 working tree: needs at least one V row";
    expect(fullCurr.out).toContain(currFinding);
    expect(authCurr.out).toContain(currFinding);
  }, 60_000);

  test("SC3: every current-tree finding includes rule id, file path, observed, expected, and next action", () => {
    for (const c of allCases.filter((x) => !x.id.startsWith("H-") && !x.id.startsWith("T10") && !x.id.startsWith("T12") && !x.id.startsWith("T18") && !x.id.startsWith("T19") && (x.expect === "fail" || x.expect === "blocked"))) {
      const { findings } = c.run();
      expect(findings.length).toBeGreaterThan(0);
      for (const f of findings) {
        expect(f.rule).toMatch(/^§/);
        expect(f.file.length).toBeGreaterThan(0);
        expect(f.msg).toContain("(observed: ");
        expect(f.msg).toContain("; expected: ");
        expect(f.msg).toContain("; next: ");
      }
    }
  });

  test("SC4: SHA canonicalization resolves 7-char vs 40-char SHAs and extracts SHAs with trailing log paths", () => {
    const dir = fixtureDir({ "README.md": "# R\n" }, { git: true });
    const base7 = Bun.spawnSync(["git", "rev-parse", "--short=7", "HEAD"], { cwd: dir }).stdout.toString().trim();
    const base40 = Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: dir }).stdout.toString().trim();
    writeFileSync(join(dir, "src.txt"), "change\n");
    commitAll(dir);
    const head7 = Bun.spawnSync(["git", "rev-parse", "--short=7", "HEAD"], { cwd: dir }).stdout.toString().trim();
    const head40 = Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: dir }).stdout.toString().trim();

    // Same commit as 7-char in B1 and 40-char in verified_at fails B != verified_at.
    mkdirSync(join(dir, "tasks"), { recursive: true });
    writeFileSync(
      join(dir, "tasks/2026-10-12-x.md"),
      task({ status: "verified", verifiedAt: head40, rows: [ROW("B1", "pass", `${head7} logs/b1.log`), ROW("AC1", "pass", `${head7} (logs/ac1.log)`), ROW("R1", "pass", head7), ROW("V1", "pass", head7)] }),
    );
    const sameCommit = validate(dir, NO_BROWSER, ["--authoring"]);
    expect(status("artifact-records", sameCommit.out)).toBe("fail");
    expect(sameCommit.out).toContain("B1 ran on verified_at");

    // Distinct commits with mixed 7-char/40-char and trailing log paths pass.
    writeFileSync(
      join(dir, "tasks/2026-10-12-x.md"),
      task({ status: "verified", verifiedAt: head40, rows: [ROW("B1", "pass", `${base40.slice(0, 7)} logs/b1.log`), ROW("AC1", "pass", `${head7} (logs/ac1.log)`), ROW("R1", "pass", `${head7}:logs/r1.log`), ROW("V1", "pass", head7)] }),
    );
    const distinctCommit = validate(dir, NO_BROWSER, ["--authoring"]);
    expect(status("artifact-records", distinctCommit.out)).toBe("pass");
    expect(distinctCommit.code).toBe(0);
    void base7;
  }, 60_000);

  test("SC5: --explain prints rule explanations without running repo checks", () => {
    const allExplain = validate(REPO, NO_BROWSER, ["--explain"]);
    expect(allExplain.code).toBe(0);
    expect(allExplain.out).toContain("§3.4");
    expect(allExplain.out).toContain("§4.5");
    expect(allExplain.out).not.toContain("artifact-records");

    const oneRule = validate(REPO, NO_BROWSER, ["--explain", "3.4"]);
    expect(oneRule.code).toBe(0);
    expect(oneRule.out).toContain("§3.4 — Verification table");

    const unknownRule = validate(REPO, NO_BROWSER, ["--explain", "99.9"]);
    expect(unknownRule.code).toBe(1);
    expect(unknownRule.out).toContain("Unknown rule");
  });

  test("SC6: heavy parent allows ## Review: skip: <reason> while active and rejects it at verified/accepted", () => {
    const activeCase = allCases.find((c) => c.id === "X10")!;
    const verifiedCase = allCases.find((c) => c.id === "X11")!;
    expect(activeCase.run().outcome).toBe("pass");
    const verRes = verifiedCase.run();
    expect(verRes.outcome).toBe("fail");
    expect(verRes.findings.some((f) => f.msg.includes("heavy parent cannot be verified while ## Review is skip: or empty"))).toBe(true);
  });
});

