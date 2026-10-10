/**
 * State checks for the D3 contract (docs/artifact-contracts.md §3–§4, §6.1, §8).
 * They check one snapshot of `tasks/` and `specs/`. History rules are in history.ts.
 * Where the contract is ambiguous the finding is `ambiguous`, reported as `blocked`, never as pass or fail.
 */
import contract from "./transitions.json" with { type: "json" };
import { bodyHash, parseRecord, RESULTS, specRef, str, tierOf, type Artifact } from "./records.ts";

export type Level = "fail" | "blocked" | "ambiguous";

export interface Finding {
  level: Level;
  /** Contract section, e.g. "§3.4". */
  rule: string;
  file: string;
  msg: string;
  /** Spec-gate findings hold at every commit (§3.3); others only where the record changed. */
  specGate?: boolean;
}

/** Answers "is `a` a strict ancestor of `b`?"; undefined when it can't tell. */
export type Ancestry = (a: string, b: string) => boolean | undefined;

export interface Options {
  ancestry?: Ancestry;
  /** Current major per schema family; defaults to transitions.json. Tests override it for §8. */
  currentMajor?: { task: number; spec: number };
}

const TASK_STATES = new Set(contract.task.states);
const SPEC_STATES = new Set(contract.spec.states);
const NOT_CURRENT = new Set(contract.task.not_current_spec_states);
const ALWAYS_TASK = ["Routing and approvals", "Objective", "Acceptance criteria", "Verification"];
const ALWAYS_SPEC = ["Problem", "Expected behavior", "Scope", "Acceptance criteria", "Interfaces and dependencies", "Decisions", "Risks and constraints", "Verification", "Rollback", "Open questions", "Revisions"];

export function loadSnapshot(files: Map<string, string>): Map<string, Artifact> {
  const out = new Map<string, Artifact>();
  for (const [path, text] of files) {
    if (!/^(tasks|specs)\/[^/]+\.md$/.test(path)) continue;
    const r = parseRecord(path, text);
    out.set(`${r.kind}:${r.id}`, r);
  }
  return out;
}

export function schemaMajor(rec: Artifact): { family: string; major: number } | undefined {
  const m = /^(task|spec)\/(\d+)$/.exec(str(rec.fm.schema) ?? "");
  return m ? { family: m[1], major: Number(m[2]) } : undefined;
}

/** "current" | "previous" (both content-checked) | "retired" (freeze check only) | "unknown". */
export function schemaStanding(rec: Artifact, opts: Options): "current" | "previous" | "retired" | "unknown" {
  const s = schemaMajor(rec);
  if (!s || s.family !== rec.kind) return "unknown";
  const cur = (opts.currentMajor ?? contract.current_major)[rec.kind];
  if (s.major === cur) return "current";
  if (s.major === cur - 1) return "previous";
  if (s.major < cur - 1 && contract.schema_registry.some((r) => r.schema === rec.fm.schema)) return "retired";
  return "unknown";
}

export function checkSnapshot(records: Map<string, Artifact>, opts: Options = {}): Finding[] {
  const out: Finding[] = [];
  const add = (level: Level, rule: string, rec: Artifact, msg: string, specGate = false) => out.push({ level, rule, file: rec.path, msg, specGate });
  const tasks = [...records.values()].filter((r) => r.kind === "task");
  const spec = (id: string) => records.get(`spec:${id}`);
  const task = (id: string) => records.get(`task:${id}`);

  for (const rec of records.values()) {
    if (rec.unreadable) {
      add("blocked", "§8", rec, `${rec.unreadable}; treated as unstructured prose`);
      continue;
    }
    const standing = schemaStanding(rec, opts);
    if (standing === "unknown") add("blocked", "§8", rec, `unknown or missing schema "${str(rec.fm.schema) ?? ""}"; treated as unstructured prose`);
    if (standing === "unknown" || standing === "retired") continue;
    if (rec.kind === "spec") checkSpec(rec, records, add);
  }

  for (const rec of tasks) {
    if (rec.unreadable || !["current", "previous"].includes(schemaStanding(rec, opts))) continue;
    const status = str(rec.fm.status) ?? "";
    const tier = str(rec.fm.tier) ?? "";
    if (!TASK_STATES.has(status)) add("fail", "§3.3", rec, `status "${status}" is not a task state`);
    if (tier !== "standard" && tier !== "heavy") add("fail", "§3.1", rec, `tier "${tier}" must be standard or heavy`);
    for (const s of ALWAYS_TASK) if (!rec.sections.has(s)) add("fail", "§3.2", rec, `missing section "## ${s}"`);
    checkSkips(rec, add);

    // Routing log (§2.3) and the downgrade closure (§6.1).
    const tierEntries = rec.log.filter((e) => e.keyword === "tier");
    if (rec.log[0]?.keyword !== "tier" || tierEntries.length !== 1) add("fail", "§2.3", rec, "the log must start with exactly one tier: entry");
    const setters = rec.log.filter((e) => tierOf(e));
    const last = setters.at(-1);
    const closedByDowngrade = last?.keyword === "downgraded" && tierOf(last) === "light";
    if (closedByDowngrade) {
      if (status !== "cancelled") add("fail", "§6.1", rec, `last routing entry is a downgrade to light, so status must be cancelled (is "${status}")`);
      if (tier !== "standard") add("fail", "§6.1", rec, "a record closed by a downgrade keeps tier: standard");
      if (!section(rec, "Outcome")) add("fail", "§6.1", rec, "a record closed by a downgrade needs ## Outcome pointing to the light report");
    } else if (last && tierOf(last) !== tier) add("fail", "§2.3", rec, `frontmatter tier "${tier}" differs from the log's current tier "${tierOf(last)}"`);

    for (const r of rec.rows) if (!RESULTS.has(r.result)) add("fail", "§2.4", rec, `row ${r.id} result "${r.result}" is not pass, fail, blocked or not run`);
    if (["blocked", "partial"].includes(status) && !section(rec, "Blockers")) add("fail", "§3.3", rec, `${status} needs a non-empty ## Blockers`);
    if (["verified", "accepted", "partial", "cancelled"].includes(status) && !section(rec, "Outcome")) add("fail", "§3.2", rec, `${status} needs ## Outcome`);

    const parentId = str(rec.fm.parent);
    const isHeavyParent = tier === "heavy" && !parentId;
    if (isHeavyParent) {
      for (const s of ["Plan", "Review"]) if (!rec.sections.has(s)) add("fail", "§3.2", rec, `heavy parent needs ## ${s}`);
      if (!["todo", "cancelled"].includes(status) && !rec.log.some((e) => e.keyword === "confirmed")) add("fail", "§3.3", rec, `heavy parent is ${status} without a confirmed: entry`);
    }

    // depends_on resolves (cycles are checked once below).
    const deps = rec.fm.depends_on;
    if (deps !== undefined && !Array.isArray(deps)) add("fail", "§3.1", rec, "depends_on must be a list");
    for (const d of Array.isArray(deps) ? deps : []) if (!task(String(d))) add("fail", "§7", rec, `depends_on "${d}" does not resolve`);

    // Spec references and the spec gate (§3.3, §4.4).
    const ref = specRef(rec);
    if ((isHeavyParent || parentId) && !ref) add("fail", "§3.1", rec, "heavy parent and children need spec: <spec-id>@<version>");
    if (parentId) {
      const parent = task(parentId);
      if (!parent) add("fail", "§7", rec, `parent "${parentId}" does not resolve`);
      if (tier !== "standard") add("fail", "§3.3", rec, "a child task is always tier: standard");
      const pref = parent && specRef(parent);
      if (ref && pref && pref.id !== ref.id) add("fail", "§3.1", rec, `child implements spec ${ref.id}, parent implements ${pref.id}`);
    }
    const sp = ref && spec(ref.id);
    if (ref && !sp) add("fail", "§7", rec, `spec "${ref.id}" does not resolve`);
    if (ref && sp && !sp.unreadable) {
      const version = Number(sp.fm.version);
      const approvedVersion = sp.fm.approved_version === undefined ? undefined : Number(sp.fm.approved_version);
      const sstatus = str(sp.fm.status);
      if (isHeavyParent && ref.version !== version) add("fail", "§3.3", rec, `parent is at @${ref.version} but the spec is at version ${version}`, true);
      if (parentId) {
        const g = (msg: string) => add("fail", "§4.4", rec, msg, true);
        if (approvedVersion === undefined) g("child exists but the spec was never approved");
        else if (ref.version > version) g(`child is at @${ref.version}, above the spec's version ${version}`);
        else if (ref.version > approvedVersion) g(`child is at @${ref.version}, which was never approved (approved_version ${approvedVersion}); children move only after reapproval`);
        else if (!(sstatus === "approved" && ref.version === version) && !NOT_CURRENT.has(status))
          g(`spec is ${sstatus} v${version}; a child at @${ref.version} can't be ${status} (allowed: ${[...NOT_CURRENT].join(", ")})`);
      }
    }

    // Criteria coverage (§3.3 active → completed) and the verification rule (§3.4).
    if (["completed", "verified", "accepted"].includes(status)) {
      const ids = new Set(rec.rows.map((r) => r.id));
      for (const ac of criteria(rec, "AC")) if (!ids.has(ac)) add("fail", "§3.3", rec, `${ac} has no verification row`);
      if (isHeavyParent && sp) for (const sc of criteria(sp, "SC")) if (!ids.has(sc)) add("fail", "§3.3", rec, `spec criterion ${sc} has no verification row`);
    }
    if (status === "verified" || status === "accepted") checkVerified(rec, isHeavyParent || tier === "standard", opts.ancestry, add);
    if (status === "accepted" && !rec.log.some((e) => e.keyword === "accepted")) add("fail", "§3.3", rec, "accepted without an accepted: entry");

    if (isHeavyParent && (status === "verified" || status === "accepted") && ref && sp) {
      if (str(sp.fm.status) !== "approved") add("fail", "§3.3", rec, `parent is ${status} but the spec is ${str(sp.fm.status)}`);
      const v = Number(sp.fm.version);
      for (const c of tasks.filter((t) => str(t.fm.parent) === rec.id)) {
        const cs = str(c.fm.status) ?? "";
        const cv = specRef(c)?.version;
        if (cs === "cancelled") continue;
        if (cs === "partial")
          add("ambiguous", "§3.3/§4.4", rec, `child ${c.id} is partial: §3.3 requires every non-cancelled child to be verified or accepted, §4.4 says a partial child doesn't count toward the parent`);
        else if (!["verified", "accepted"].includes(cs) || cv !== v) add("fail", "§3.3", rec, `parent is ${status} but child ${c.id} is ${cs} at @${cv} (needs verified or accepted at @${v})`);
      }
      if (/^\s*[-*].*(?:[:—–-]\s*|\b)open\s*$/m.test(section(rec, "Review"))) add("fail", "§3.3", rec, "a ## Review finding is still open");
      rec.log.forEach((e, i) => {
        if (e.keyword === "divergence" && !rec.log.slice(i + 1).some((x) => x.keyword === "approved")) add("fail", "§3.3", rec, `divergence "${e.text}" has no later approved: entry`);
      });
    }
  }

  // depends_on cycles.
  const color = new Map<string, number>();
  const visit = (id: string, stack: string[]): void => {
    color.set(id, 1);
    const t = task(id)!;
    for (const d of Array.isArray(t.fm.depends_on) ? t.fm.depends_on.map(String) : []) {
      if (!task(d)) continue;
      if (color.get(d) === 1) add("fail", "§7", t, `dependency cycle: ${[...stack, id, d].join(" → ")}`);
      else if (!color.get(d)) visit(d, [...stack, id]);
    }
    color.set(id, 2);
  };
  for (const t of tasks) if (!color.get(t.id)) visit(t.id, []);
  return out;
}

function checkSpec(rec: Artifact, records: Map<string, Artifact>, add: (l: Level, rule: string, r: Artifact, m: string) => void) {
  const status = str(rec.fm.status) ?? "";
  const version = rec.fm.version;
  if (!SPEC_STATES.has(status)) add("fail", "§4.1", rec, `status "${status}" is not draft, approved or superseded`);
  if (!Number.isInteger(version) || (version as number) < 1) add("fail", "§4.1", rec, "version must be an integer ≥ 1");
  for (const s of ALWAYS_SPEC) if (!rec.sections.has(s)) add("fail", "§4.2", rec, `missing section "## ${s}"`);
  checkSkips(rec, add);
  const av = rec.fm.approved_version;
  const hash = str(rec.fm.approved_hash);
  if ((av === undefined) !== (hash === undefined)) add("fail", "§4.1", rec, "approved_version and approved_hash come together");
  if (av !== undefined && (!Number.isInteger(av) || (av as number) > (version as number))) add("fail", "§4.1", rec, "approved_version must be an integer ≤ version");
  if (status === "approved") {
    if (av !== version) add("fail", "§4.3", rec, `approved spec needs approved_version = version (${av} ≠ ${version})`);
    if (!hash) add("fail", "§4.3", rec, "approved spec needs approved_hash");
    else if (!hash.startsWith("sha256:<") && hash !== bodyHash("---\n---\n" + rec.body))
      add("fail", "§4.3", rec, `body doesn't match approved_hash (body is ${bodyHash("---\n---\n" + rec.body)})`);
  }
  if (status === "draft" && av !== undefined && version !== (av as number) + 1) add("fail", "§4.3", rec, `reopened draft must be at approved_version + 1 (${av} + 1 ≠ ${version})`);
  if (status === "superseded") {
    const by = str(rec.fm.superseded_by);
    if (!by) add("fail", "§4.1", rec, "superseded needs superseded_by");
    else if (!records.has(`spec:${by}`)) add("fail", "§4.3", rec, `superseded_by "${by}" does not resolve`);
  }
}

function checkVerified(rec: Artifact, needsBaselineAndReview: boolean, ancestry: Ancestry | undefined, add: (l: Level, rule: string, r: Artifact, m: string) => void) {
  const at = rec.fm.verified_at;
  if (at === undefined) return add("fail", "§3.1", rec, "verified and accepted need verified_at");
  if (typeof at !== "string") return add("fail", "§2.2", rec, "verified_at must be a quoted string (YAML would read an all-digit SHA as a number)");
  const byId = new Map(rec.rows.map((r) => [r.id, r]));
  for (const r of rec.rows) {
    if (r.kind === "B") {
      if (!r.sha) add("fail", "§3.4", rec, `${r.id} has no Ref commit`);
      else if (r.sha === at) add("fail", "§3.4", rec, `${r.id} ran on verified_at ${at}; a baseline must run before the change`);
      else {
        const anc = ancestry?.(r.sha, at);
        if (anc === false) add("fail", "§3.4", rec, `${r.id} commit ${r.sha} is not a strict ancestor of verified_at ${at}`);
        else if (anc === undefined) add("blocked", "§3.4", rec, `can't tell whether ${r.id} commit ${r.sha} is an ancestor of ${at} (no Git history)`);
      }
      continue;
    }
    if (r.sha !== at) add("fail", "§3.4", rec, `${r.id} ran on "${r.sha}", not verified_at ${at}`);
    if (r.result === "pass") continue;
    if (r.kind !== "R") {
      add("fail", "§3.4", rec, `${r.id} is ${r.result}; ${r.kind} rows must pass${/baseline:/.test(r.note) ? " (only R rows can be attributed)" : ""}`);
      continue;
    }
    const cite = /baseline:\s*(B\d+)/.exec(r.note)?.[1];
    if (r.result !== "fail" || !cite) add("fail", "§3.4", rec, `${r.id} is ${r.result} without a baseline attribution`);
    else if (byId.get(cite)?.result !== "fail") add("fail", "§3.4", rec, `${r.id} cites ${cite}, which ${byId.has(cite) ? `is ${byId.get(cite)!.result}` : "doesn't exist"}; attribution needs a failing baseline`);
  }
  if (needsBaselineAndReview) {
    if (!rec.rows.some((r) => r.kind === "B")) add("fail", "§3.4", rec, "needs at least one B row");
    if (!rec.rows.some((r) => r.kind === "V")) add("fail", "§3.4", rec, "needs at least one V row");
  }
}

function checkSkips(rec: Artifact, add: (l: Level, rule: string, r: Artifact, m: string) => void) {
  for (const [name, body] of rec.sections) if (/^\s*skip:\s*$/m.test(body)) add("fail", "§2.2", rec, `## ${name} has skip: without a reason`);
}

function section(rec: Artifact, name: string): string {
  return (rec.sections.get(name) ?? "").trim();
}

function criteria(rec: Artifact, prefix: "AC" | "SC"): string[] {
  const text = rec.sections.get("Acceptance criteria") ?? "";
  // Only definitions at the start of an item ("AC1:" / "1. AC1 [inferred]:"), not citations like "AC1 = SC2".
  const ids = [...text.matchAll(new RegExp(`^\\s*(?:[-*]|\\d+\\.)?\\s*(${prefix}\\d+)\\b`, "gm"))].map((m) => m[1]);
  return [...new Set(ids)];
}
