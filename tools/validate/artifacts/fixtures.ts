/**
 * Isolated fixtures for the task/spec artifact contract (docs/artifact-contracts.md): the §7.2 test table (T1–T19) plus review cases.
 * State fixtures live in memory; history fixtures build a throwaway Git repository in the OS temp dir.
 * Nothing here reads or writes the canonical project files.
 */
import { mkdtempSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { bodyHash } from "./records.ts";
import { checkHistory, git } from "./history.ts";
import { checkSnapshot, loadSnapshot, type Ancestry, type Finding, type Options } from "./rules.ts";

export type Outcome = "pass" | "fail" | "blocked" | "frozen";

export interface Case {
  id: string;
  title: string;
  expect: Outcome;
  run: () => { outcome: Outcome; findings: Finding[] };
}

const P = "2026-10-14-owner-phone-field";
const C1 = `${P}-01-expand`;
const C2 = `${P}-02-client`;

// ---- builders --------------------------------------------------------------

type RowSpec = [id: string, result: string, ref: string, note?: string];

export interface TaskSpec {
  schema?: string;
  tier?: "standard" | "heavy";
  status: string;
  parent?: string;
  spec?: string;
  verifiedAt?: string | number;
  log?: string[];
  ac?: string[];
  rows?: RowSpec[];
  extra?: string;
}

export function task(t: TaskSpec): string {
  const tier = t.tier ?? "standard";
  const isParent = tier === "heavy" && !t.parent;
  const fm = [`schema: ${t.schema ?? "task/1"}`, `tier: ${tier}`, `status: ${t.status}`];
  if (t.parent) fm.push(`parent: ${t.parent}`);
  if (t.spec) fm.push(`spec: ${t.spec}`);
  if (t.verifiedAt !== undefined) fm.push(typeof t.verifiedAt === "number" ? `verified_at: ${t.verifiedAt}` : `verified_at: "${t.verifiedAt}"`);
  const log = t.log ?? [isParent ? "tier: heavy (H3)" : t.parent ? "tier: standard (decomposed from heavy parent)" : "tier: standard (S2 fails)"];
  const rows = (t.rows ?? []).map(([id, r, ref, note = ""]) => `| ${id} | check | ${r} | ${ref} | ${note} |`);
  const s = [
    "---",
    ...fm,
    "---",
    "",
    "# Fixture task",
    "",
    "## Routing and approvals",
    "",
    ...log.map((l) => `- ${l}`),
    "",
    "## Objective",
    "",
    "Fixture objective.",
    "",
    "In scope: fixture.",
    "Out of scope: everything else.",
    "",
    "## Acceptance criteria",
    "",
    ...(t.ac ?? (isParent ? ["SC1 from the spec."] : ["1. AC1: the fixture behaves."])),
    "",
    "## Verification",
    "",
    "| ID | Check | Result | Ref | Note |",
    "|---|---|---|---|---|",
    ...rows,
    "",
  ];
  if (isParent) s.push("## Plan", "", "1. children", "", "## Review", "", "- no findings: fixed in a000001", "");
  if (["blocked", "partial"].includes(t.status)) s.push("## Blockers", "", "- spec v2 awaiting approval", "");
  if (["verified", "accepted", "partial", "cancelled"].includes(t.status)) s.push("## Outcome", "", "Fixture outcome.", "");
  if (t.extra) s.push(t.extra);
  return s.join("\n");
}

export interface SpecSpec {
  status: "draft" | "approved" | "superseded";
  version: number;
  approvedVersion?: number;
  /** "auto" = hash of this body; any other string is written verbatim. */
  hash?: string;
  revisions?: string[];
  expected?: string;
}

export function spec(s: SpecSpec): string {
  const body = [
    "",
    "# Fixture spec",
    "",
    ...["Problem", "Scope", "Interfaces and dependencies", "Decisions", "Risks and constraints", "Verification", "Open questions"].flatMap((h) => [`## ${h}`, "", "Fixture.", ""]),
    "## Expected behavior",
    "",
    s.expected ?? "Responses use phone.",
    "",
    "## Acceptance criteria",
    "",
    "- SC1: the fixture works end to end.",
    "",
    "## Rollback",
    "",
    "skip: nothing to roll back",
    "",
    "## Revisions",
    "",
    ...(s.revisions ?? ["- v1: initial."]),
    "",
  ].join("\n");
  const fm = ["schema: spec/1", `status: ${s.status}`, `version: ${s.version}`];
  if (s.approvedVersion !== undefined) {
    fm.push(`approved_version: ${s.approvedVersion}`);
    const text = `---\n---\n${body}`;
    fm.push(`approved_hash: ${s.hash === undefined || s.hash === "auto" ? bodyHash(text) : s.hash}`);
  }
  return ["---", ...fm, "---", body].join("\n");
}

const parentLog = (...extra: string[]) => ["tier: heavy (H3)", "confirmed: heavy by owner (2026-10-14, \"ok\")", ...extra];
const verifiedRows = (at: string, base = "1111111"): RowSpec[] => [
  ["B1", "pass", base],
  ["AC1", "pass", at],
  ["R1", "pass", at],
  ["V1", "pass", at],
];
const parentVerifiedRows = (at: string): RowSpec[] => [
  ["B1", "pass", "1111111"],
  ["SC1", "pass", at],
  ["R1", "pass", at],
  ["V1", "pass", at],
];

/** 1111111 → 2222222 is the only history the in-memory fixtures know; 9999999 is on another branch. */
const fakeAncestry: Ancestry = (a, b) => {
  const line = ["1111111", "2222222"];
  if (a === "9999999" || b === "9999999") return false;
  if (!line.includes(a) || !line.includes(b)) return undefined;
  return line.indexOf(a) < line.indexOf(b);
};

// ---- outcome ----------------------------------------------------------------

export function outcomeOf(findings: Finding[], frozen: string[] = []): Outcome {
  if (findings.some((f) => f.level === "fail")) return "fail";
  if (findings.length) return "blocked";
  return frozen.length ? "frozen" : "pass";
}

function stateCase(id: string, title: string, expect: Outcome, files: Record<string, string>, opts: Options = {}): Case {
  return {
    id,
    title,
    expect,
    run: () => {
      const findings = checkSnapshot(loadSnapshot(new Map(Object.entries(files))), { ancestry: fakeAncestry, ...opts });
      return { outcome: outcomeOf(findings), findings };
    },
  };
}

type Step = (shas: string[]) => Record<string, string | null>;

/** Applies each step as a commit (the last one may stay uncommitted), then runs the history walk. */
function historyCase(id: string, title: string, expect: Outcome, steps: Step[], opts: Options & { uncommittedLast?: boolean; shallow?: boolean } = {}): Case {
  return {
    id,
    title,
    expect,
    run: () => {
      const dir = mkdtempSync(join(tmpdir(), "g-inga-artifacts-"));
      try {
        const g = (...args: string[]) => {
          const r = git(dir, args);
          if (!r.ok) throw new Error(`git ${args.join(" ")} failed in fixture ${id}`);
          return r.out.trim();
        };
        g("init", "-q", "-b", "main");
        g("config", "user.email", "fixture@example.invalid");
        g("config", "user.name", "fixture");
        g("config", "commit.gpgsign", "false");
        const shas: string[] = [];
        steps.forEach((step, i) => {
          for (const [path, text] of Object.entries(step(shas))) {
            const abs = join(dir, path);
            if (text === null) unlinkSync(abs);
            else {
              mkdirSync(dirname(abs), { recursive: true });
              writeFileSync(abs, text);
            }
          }
          if (opts.uncommittedLast && i === steps.length - 1) return;
          g("add", "-A");
          g("commit", "-q", "--allow-empty", "-m", `step ${i + 1}`);
          shas.push(g("rev-parse", "--short=7", "HEAD"));
        });
        let root = dir;
        if (opts.shallow) {
          root = join(dir, "shallow");
          git(dir, ["clone", "-q", "--depth", "1", `file://${dir}`, root]);
        }
        const res = checkHistory(root, opts);
        if ("blocked" in res) return { outcome: "blocked", findings: [{ level: "blocked", rule: "§7.1", file: "", msg: res.blocked }] };
        return { outcome: outcomeOf(res.findings, res.frozen), findings: res.findings };
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  };
}

// ---- cases --------------------------------------------------------------------

const t = (id: string) => `tasks/${id}.md`;
const sp = `specs/${P}.md`;
const child = (status: string, at: number, more: Partial<TaskSpec> = {}) => task({ status, parent: P, spec: `${P}@${at}`, ...more });
const verifiedChild = (at: number, more: Partial<TaskSpec> = {}) => child("verified", at, { verifiedAt: "2222222", rows: verifiedRows("2222222"), ...more });
const parent = (status: string, at: number, more: Partial<TaskSpec> = {}) => task({ tier: "heavy", status, spec: `${P}@${at}`, log: parentLog(), ...more });

export const stateCases: Case[] = [
  stateCase("T1", "heavy parent active, confirmed, spec draft v1, no children", "pass", {
    [t(P)]: parent("active", 1),
    [sp]: spec({ status: "draft", version: 1 }),
  }),
  stateCase("T2", "heavy parent active without confirmed:", "fail", {
    [t(P)]: parent("active", 1, { log: ["tier: heavy (H3)"] }),
    [sp]: spec({ status: "draft", version: 1 }),
  }),
  stateCase("T3", "child exists while the spec was never approved", "fail", {
    [t(P)]: parent("active", 1),
    [sp]: spec({ status: "draft", version: 1 }),
    [t(C1)]: child("blocked", 1),
  }),
  stateCase("T4", "spec reopened (draft v2); child active at @1", "fail", {
    [t(P)]: parent("active", 2, { log: parentLog("approved: spec v1 by owner (2026-10-14, \"ok\")") }),
    [sp]: spec({ status: "draft", version: 2, approvedVersion: 1, revisions: ["- v1: initial.", "- v2: reopened."] }),
    [t(C1)]: child("active", 1),
  }),
  stateCase("T5", "spec reopened; one child blocked at @1, another verified at @1", "pass", {
    [t(P)]: parent("active", 2, { log: parentLog("approved: spec v1 by owner (2026-10-14, \"ok\")") }),
    [sp]: spec({ status: "draft", version: 2, approvedVersion: 1, revisions: ["- v1: initial.", "- v2: reopened."] }),
    [t(C1)]: verifiedChild(1),
    [t(C2)]: child("blocked", 1),
  }),
  stateCase("T6", "spec approved v2; child active at @1", "fail", {
    [t(P)]: parent("active", 2),
    [sp]: spec({ status: "approved", version: 2, approvedVersion: 2 }),
    [t(C1)]: child("active", 1),
  }),
  stateCase("T7a", "spec approved v2; child verified at @1; parent active", "pass", {
    [t(P)]: parent("active", 2),
    [sp]: spec({ status: "approved", version: 2, approvedVersion: 2 }),
    [t(C1)]: verifiedChild(1),
  }),
  stateCase("T7b", "spec approved v2; child verified at @1; parent verified", "fail", {
    [t(P)]: parent("verified", 2, { verifiedAt: "2222222", rows: parentVerifiedRows("2222222") }),
    [sp]: spec({ status: "approved", version: 2, approvedVersion: 2 }),
    [t(C1)]: verifiedChild(1),
  }),
  stateCase("T8", "child moved to @2 with spec-version unaffected entry; parent verified", "pass", {
    [t(P)]: parent("verified", 2, { verifiedAt: "2222222", rows: parentVerifiedRows("2222222") }),
    [sp]: spec({ status: "approved", version: 2, approvedVersion: 2 }),
    [t(C1)]: verifiedChild(2, { log: ["tier: standard (decomposed from heavy parent)", "spec-version: v1 → v2; unaffected: only the error text changed"] }),
  }),
  stateCase("T9", "approved spec body edited, approved_hash unchanged", "fail", {
    [t(P)]: parent("active", 1),
    [sp]: spec({ status: "approved", version: 1, approvedVersion: 1 }).replace("Responses use phone.", "Responses use mobile."),
  }),
  stateCase("T13", "verified; R1 fail attributed to failing B1", "pass", {
    [t("2026-10-12-x")]: task({ status: "verified", verifiedAt: "2222222", rows: [["B1", "fail", "1111111"], ["AC1", "pass", "2222222"], ["R1", "fail", "2222222", "baseline: B1"], ["V1", "pass", "2222222"]] }),
  }),
  stateCase("T14a", "verified; R1 attributed to B1, but B1 passed", "fail", {
    [t("2026-10-12-x")]: task({ status: "verified", verifiedAt: "2222222", rows: [["B1", "pass", "1111111"], ["AC1", "pass", "2222222"], ["R1", "fail", "2222222", "baseline: B1"], ["V1", "pass", "2222222"]] }),
  }),
  stateCase("T14b", "verified; an AC row attributed to a baseline", "fail", {
    [t("2026-10-12-x")]: task({ status: "verified", verifiedAt: "2222222", rows: [["B1", "fail", "1111111"], ["AC1", "fail", "2222222", "baseline: B1"], ["R1", "pass", "2222222"], ["V1", "pass", "2222222"]] }),
  }),
  stateCase("T15a", "verified; B row Ref equals verified_at", "fail", {
    [t("2026-10-12-x")]: task({ status: "verified", verifiedAt: "2222222", rows: verifiedRows("2222222", "2222222") }),
  }),
  stateCase("T15b", "verified; B row commit isn't an ancestor of verified_at", "fail", {
    [t("2026-10-12-x")]: task({ status: "verified", verifiedAt: "2222222", rows: verifiedRows("2222222", "9999999") }),
  }),
  stateCase("T16", "verified; AC row ran on another commit", "fail", {
    [t("2026-10-12-x")]: task({ status: "verified", verifiedAt: "2222222", rows: [["B1", "pass", "1111111"], ["AC1", "pass", "1111111"], ["R1", "pass", "2222222"], ["V1", "pass", "2222222"]] }),
  }),
  stateCase("T17", "cancelled standard record closed by a downgrade to light", "pass", {
    [t("2026-10-12-x")]: task({ status: "cancelled", log: ["tier: standard (S2 fails)", "downgraded: standard → light because the cause was a typo"] }),
  }),
  stateCase("X1", "child at @2 while v2 is still a draft (never approved)", "fail", {
    [t(P)]: parent("active", 2),
    [sp]: spec({ status: "draft", version: 2, approvedVersion: 1, revisions: ["- v1: initial.", "- v2: reopened."] }),
    [t(C1)]: child("blocked", 2),
  }),
  stateCase("X2", "verified without a V row", "fail", {
    [t("2026-10-12-x")]: task({ status: "verified", verifiedAt: "2222222", rows: verifiedRows("2222222").filter((r) => r[0] !== "V1") }),
  }),
  stateCase("X3", "verified with an AC row not run", "fail", {
    [t("2026-10-12-x")]: task({ status: "verified", verifiedAt: "2222222", rows: verifiedRows("2222222").map((r) => (r[0] === "AC1" ? ["AC1", "not run", "2222222"] : r)) }),
  }),
  stateCase("X4", "last entry downgrades to light but the record stays active", "fail", {
    [t("2026-10-12-x")]: task({ status: "active", log: ["tier: standard (S2 fails)", "downgraded: standard → light because the cause was a typo"] }),
  }),
  stateCase("X5", "verified_at written as an unquoted number", "fail", {
    [t("2026-10-12-x")]: task({ status: "verified", verifiedAt: 1234567, rows: verifiedRows("1234567") }),
  }),
  stateCase("X6", "parent verified while a child is partial (§3.3 vs §4.4)", "blocked", {
    [t(P)]: parent("verified", 1, { verifiedAt: "2222222", rows: parentVerifiedRows("2222222") }),
    [sp]: spec({ status: "approved", version: 1, approvedVersion: 1 }),
    [t(C1)]: verifiedChild(1),
    [t(C2)]: child("partial", 1),
  }),
  stateCase("X7", "B row commit unknown without Git history", "blocked", {
    [t("2026-10-12-x")]: task({ status: "verified", verifiedAt: "2222222", rows: verifiedRows("2222222", "abcdef0") }),
  }),
  stateCase("X8", "verified, but AC2 has no verification row", "fail", {
    [t("2026-10-12-x")]: task({ status: "verified", verifiedAt: "2222222", ac: ["1. AC1: works.", "2. AC2: also works."], rows: verifiedRows("2222222") }),
  }),
  stateCase("X9", "unknown schema is blocked, not guessed", "blocked", {
    [t("2026-10-12-x")]: task({ status: "active", schema: "task/9" }),
  }),
];

export const draftV1: Step = () => ({ [t(P)]: parent("active", 1), [sp]: spec({ status: "draft", version: 1 }) });
export const approvedV1: Step = () => ({ [t(P)]: parent("active", 1, { log: parentLog("approved: spec v1 by owner (2026-10-14, \"ok\")") }), [sp]: spec({ status: "approved", version: 1, approvedVersion: 1 }) });
const v1Hash = /approved_hash: (\S+)/.exec(spec({ status: "approved", version: 1, approvedVersion: 1 }))![1];
const accepted = (schema: string) => task({ schema, status: "accepted", verifiedAt: "2222222", log: ["tier: standard (S2 fails)", "accepted: by owner (2026-10-12, \"ok\")"], rows: [] });

export const historyCases: Case[] = [
  historyCase("H-T1", "draft → approved with a new approved: entry (positive history)", "pass", [draftV1, approvedV1]),
  historyCase("T10", "approved spec: body and approved_hash changed together, same version", "fail", [
    draftV1,
    approvedV1,
    () => ({ [sp]: spec({ status: "approved", version: 1, approvedVersion: 1, expected: "Responses use mobile." }) }),
  ]),
  historyCase("T11", "same edit with version + 1, a ## Revisions line and approved: spec v2", "pass", [
    draftV1,
    approvedV1,
    () => ({
      [sp]: spec({ status: "approved", version: 2, approvedVersion: 2, expected: "Responses use mobile.", revisions: ["- v1: initial.", "- v2: rename to mobile."] }),
      [t(P)]: parent("active", 2, { log: parentLog("approved: spec v1 by owner (2026-10-14, \"ok\")", "approved: spec v2 by owner (2026-10-15, \"ok\")") }),
    }),
  ]),
  historyCase("T12", "history walk in a shallow clone", "blocked", [draftV1, approvedV1], { shallow: true }),
  historyCase("T18a", "retired task/1 record (task/3 current), accepted, unchanged since", "frozen", [
    () => ({ [t("2026-01-01-old")]: accepted("task/1") }),
    () => ({ "README.md": "unrelated\n" }),
  ], { currentMajor: { task: 3, spec: 1 } }),
  historyCase("T18b", "retired task/1 record changed after its status last changed", "fail", [
    () => ({ [t("2026-01-01-old")]: accepted("task/1") }),
    () => ({ [t("2026-01-01-old")]: accepted("task/1") + "\nlate edit\n" }),
  ], { currentMajor: { task: 3, spec: 1 } }),
  historyCase("T18c", "retired task/1 record still active", "fail", [
    () => ({ [t("2026-01-01-old")]: task({ schema: "task/1", status: "active" }) }),
  ], { currentMajor: { task: 3, spec: 1 } }),
  historyCase("T19", "migration commit changes schema and status together", "fail", [
    () => ({ [t("2026-10-12-x")]: task({ status: "active" }) }),
    () => ({ [t("2026-10-12-x")]: task({ schema: "task/2", status: "blocked" }) }),
  ], { currentMajor: { task: 2, spec: 1 } }),
  historyCase("H-del", "committed task record deleted (downgrade must close it, not delete it)", "fail", [
    () => ({ [t("2026-10-12-x")]: task({ status: "active" }) }),
    () => ({ [t("2026-10-12-x")]: null }),
  ]),
  historyCase("H-forbidden", "cancelled record reopened (cancelled → active)", "fail", [
    () => ({ [t("2026-10-12-x")]: task({ status: "cancelled", log: ["tier: standard (S2 fails)", "downgraded: standard → light because typo"] }) }),
    () => ({ [t("2026-10-12-x")]: task({ status: "active" }) }),
  ]),
  historyCase("H-baseline", "B row keeps its pre-change commit; other rows at verified_at (real Git)", "pass", [
    () => ({ [t("2026-10-12-x")]: task({ status: "active" }) }),
    () => ({ "src.txt": "fix\n" }),
    (s) => ({ [t("2026-10-12-x")]: task({ status: "verified", verifiedAt: s[1], rows: verifiedRows(s[1], s[0]) }) }),
  ]),
  historyCase("H-baseline-refreshed", "B row refreshed to verified_at", "fail", [
    () => ({ [t("2026-10-12-x")]: task({ status: "active" }) }),
    () => ({ "src.txt": "fix\n" }),
    (s) => ({ [t("2026-10-12-x")]: task({ status: "verified", verifiedAt: s[1], rows: verifiedRows(s[1], s[1]) }) }),
  ]),
  historyCase("H-spec-version", "child moves @1 → @2 without a spec-version: entry", "fail", [
    draftV1,
    () => ({ ...approvedV1([]), [t(C1)]: child("active", 1) }),
    () => ({
      [sp]: spec({ status: "draft", version: 2, approvedVersion: 1, hash: v1Hash, revisions: ["- v1: initial.", "- v2: reopened."] }),
      [t(P)]: parent("active", 2, { log: parentLog("approved: spec v1 by owner (2026-10-14, \"ok\")") }),
      [t(C1)]: child("blocked", 1),
    }),
    () => ({
      [sp]: spec({ status: "approved", version: 2, approvedVersion: 2, revisions: ["- v1: initial.", "- v2: reopened."] }),
      [t(P)]: parent("active", 2, { log: parentLog("approved: spec v1 by owner (2026-10-14, \"ok\")", "approved: spec v2 by owner (2026-10-15, \"ok\")") }),
      [t(C1)]: child("active", 2),
    }),
  ]),
  historyCase("H-reopen", "reopen blocks the child in the same commit; after reapproval it moves @1 → @2 with spec-version:", "pass", [
    draftV1,
    () => ({ ...approvedV1([]), [t(C1)]: child("active", 1) }),
    () => ({
      [sp]: spec({ status: "draft", version: 2, approvedVersion: 1, hash: v1Hash, revisions: ["- v1: initial.", "- v2: reopened."] }),
      [t(P)]: parent("active", 2, { log: parentLog("approved: spec v1 by owner (2026-10-14, \"ok\")") }),
      [t(C1)]: child("blocked", 1),
    }),
    () => ({
      [sp]: spec({ status: "approved", version: 2, approvedVersion: 2, revisions: ["- v1: initial.", "- v2: reopened."] }),
      [t(P)]: parent("active", 2, { log: parentLog("approved: spec v1 by owner (2026-10-14, \"ok\")", "approved: spec v2 by owner (2026-10-15, \"ok\")") }),
      [t(C1)]: child("active", 2, { log: ["tier: standard (decomposed from heavy parent)", "spec-version: v1 → v2; rerun: AC1"] }),
    }),
  ]),
];

export const allCases = [...stateCases, ...historyCases];
