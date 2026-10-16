/**
 * State checks for the task/spec artifact contract (docs/artifact-contracts.md §3–§4, §6.1, §8).
 * They check one snapshot of `tasks/` and `specs/`. History rules are in history.ts.
 * Where the contract is ambiguous the finding is `ambiguous`, reported as `blocked`, never as pass or fail.
 */
import contract from "./contract.json" with { type: "json" };
import { bodyHash, extractRefSha, parseRecord, RESULTS, specRef, str, tierOf, type Artifact } from "./records.ts";

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

/** Resolves a short/full SHA to its canonical 40-char commit SHA, "shallow" when history is unavailable, or undefined if unknown. */
export type ShaResolver = (sha: string) => string | "shallow" | undefined;

export interface Options {
  ancestry?: Ancestry;
  resolveSha?: ShaResolver;
  /** Validation mode: "authoring" checks current tree only (skips ancestry); "full" (default) runs all checks. */
  mode?: "authoring" | "full";
  /** Current major per schema family; defaults to contract.json. Tests override it for §8. */
  currentMajor?: { task: number; spec: number; intent?: number };
}

export interface RuleExplanation {
  rule: string;
  title: string;
  rationale: string;
  repair: string;
}

export const RULE_EXPLANATIONS: Record<string, RuleExplanation> = {
  "§2.2": {
    rule: "§2.2",
    title: "Frontmatter quoting and conditional section skip reason",
    rationale: "YAML parses unquoted all-digit SHAs as numbers, corrupting commit references; `skip:` requires an explicit reason so intentional omissions stay auditable.",
    repair: "Quote `verified_at: \"<sha>\"` in frontmatter and write `skip: <reason>` with a non-empty reason in conditional sections.",
  },
  "§2.3": {
    rule: "§2.3",
    title: "Routing and approvals log grammar and current tier",
    rationale: "The append-only routing log records how a task entered its ceremony tier and tracks escalations, downgrades, and owner decisions.",
    repair: "Start `## Routing and approvals` with `- tier: <tier> (<signals>)` once and keep frontmatter `tier` aligned with the last tier-changing entry.",
  },
  "§2.4": {
    rule: "§2.4",
    title: "Deterministic verification result vocabulary",
    rationale: "Check results must use the strict four-value vocabulary (`pass`, `fail`, `blocked`, `not run`) so gates never guess completion.",
    repair: "Set each `## Verification` row `Result` cell to `pass`, `fail`, `blocked`, or `not run`.",
  },
  "§3.1": {
    rule: "§3.1",
    title: "Task record frontmatter keys",
    rationale: "Scripts rely on fixed frontmatter keys (`schema`, `tier`, `status`, `parent`, `spec`, `depends_on`, `verified_at`) to validate state and lineage.",
    repair: "Set `tier` to `standard` or `heavy`, provide `spec: <id>@<version>` on heavy tasks/children, format `depends_on` as a list, and quote `verified_at` when `verified` or `accepted`.",
  },
  "§3.2": {
    rule: "§3.2",
    title: "Task record required sections",
    rationale: "Every task needs fixed sections (`Routing and approvals`, `Objective`, `Acceptance criteria`, `Verification`), plus `Plan`/`Review` on heavy parents and `Outcome` when closed.",
    repair: "Add the missing `## <Section>` heading to the task record (`## Review` on a heavy parent may use `skip: <reason>` until review runs).",
  },
  "§3.3": {
    rule: "§3.3",
    title: "Task state machine and transition guards",
    rationale: "Separates `completed`, `verified`, and `accepted` and enforces start, completion, review, and child-alignment guards.",
    repair: "Ensure every AC/SC has a verification row before `completed`, resolve all `## Review` findings (not `skip:` or `open`) and child states before `verified`, and record `confirmed:`/`accepted:` entries when required.",
  },
  "§3.3/§4.4": {
    rule: "§3.3/§4.4",
    title: "Heavy parent verification with partial child",
    rationale: "Contract §3.3 requires every non-cancelled child to be `verified` or `accepted`, whereas §4.4 states a `partial` child does not count toward the parent.",
    repair: "Transition the `partial` child to `verified`, `accepted`, or `cancelled`, or record an explicit owner decision before marking the parent `verified`.",
  },
  "§3.4": {
    rule: "§3.4",
    title: "Verification table and commit-order evidence",
    rationale: "Proves baselines (`B` rows) ran on a strict ancestor commit before the change and `AC`, `SC`, `R`, and `V` rows ran on `verified_at`.",
    repair: "Keep `B` row `Ref` at the pre-change ancestor commit, set `AC`/`SC`/`R`/`V` row `Ref` to `verified_at`, and include at least one `B` and one `V` row.",
  },
  "§4.1": {
    rule: "§4.1",
    title: "Specification frontmatter keys",
    rationale: "Tracks spec lifecycle (`draft`, `approved`, `superseded`), integer `version`, and approval metadata (`approved_version`, `approved_hash`, `superseded_by`).",
    repair: "Provide valid `status`, integer `version >= 1`, paired `approved_version`/`approved_hash` after approval, and `superseded_by` when superseded.",
  },
  "§4.2": {
    rule: "§4.2",
    title: "Specification required sections",
    rationale: "Ensures every `heavy` spec covers problem, expected behavior, scope, acceptance criteria, interfaces, decisions, risks, verification, rollback, open questions, and revisions.",
    repair: "Add the missing `## <Section>` heading to `specs/<id>.md` (use `skip: <reason>` in `## Rollback` when no one-way door applies).",
  },
  "§4.3": {
    rule: "§4.3",
    title: "Specification approval, body hash freeze, and reopening",
    rationale: "Prevents silent edits to an approved specification by hashing its body and requiring `version + 1` plus a `## Revisions` line when reopened.",
    repair: "Recompute `approved_hash` only with a new owner `approved: spec v<N>` entry, or reopen as `status: draft` at `version: <approved_version + 1>` with a new `## Revisions` bullet.",
  },
  "§4.4": {
    rule: "§4.4",
    title: "Child task spec gate and version alignment",
    rationale: "Prevents children from executing against an unapproved or reopened draft spec without blocking and re-aligning on reapproval.",
    repair: "Approve the spec before creating children, set active children to `blocked` while the spec is `draft`, and add `spec-version: v<N> → v<N+1>; rerun/unaffected: ...` when moving to a reapproved version.",
  },
  "§4.5": {
    rule: "§4.5",
    title: "Intent artifact schema (`intent/1`)",
    rationale: "Preserves the originator's request verbatim in `intents/<id>.md` before a `heavy` task drafts its specification.",
    repair: "Set `schema: intent/1`, `status` to `draft`, `approved`, or `superseded`, and include a non-empty `## Original prompt` section.",
  },
  "§6.1": {
    rule: "§6.1",
    title: "Downgrade closure (`standard → light`) and no-deletion rule",
    rationale: "Committed task records are part of the audit trail and must be closed as `cancelled` on downgrade rather than deleted.",
    repair: "Keep `tier: standard`, set `status: cancelled`, append `downgraded: standard → light because <reason>`, add `## Outcome`, and never delete a committed record.",
  },
  "§7": {
    rule: "§7",
    title: "Cross-record reference resolution and dependency DAG",
    rationale: "Every `parent`, `spec`, and `depends_on` target must exist and `depends_on` must form a directed acyclic graph.",
    repair: "Ensure referenced `tasks/<id>.md` and `specs/<id>.md` files exist and remove any cycle in `depends_on`.",
  },
  "§7.1": {
    rule: "§7.1",
    title: "Git history walk and transition audit",
    rationale: "Audits committed transitions across `tasks/`, `specs/`, and `intents/` in full validation mode so invalid lifecycle jumps or silent rewrites are caught.",
    repair: "Use `--authoring` while iterating locally; before commit/merge, ensure committed transitions follow the state diagram and run in a full (non-shallow) Git clone.",
  },
  "§8": {
    rule: "§8",
    title: "Schema registry, versioning, and retired-major freeze",
    rationale: "Ensures every record declares a known schema version, migrations stay isolated from status/evidence changes, and retired schemas remain frozen.",
    repair: "Declare a registered `schema` (`task/1`, `spec/1`, `intent/1`) in YAML frontmatter and keep schema migrations in dedicated commits.",
  },
};

export function explainRule(query?: string): { ok: boolean; output: string } {
  const keys = Object.keys(RULE_EXPLANATIONS);
  if (!query || query === "list" || query === "--list") {
    const lines = [
      "G-Ingá validator rules (--explain <rule>):",
      ...keys.map((k) => `  ${k.padEnd(10)} ${RULE_EXPLANATIONS[k].title}`),
    ];
    return { ok: true, output: lines.join("\n") };
  }
  const norm = query.startsWith("§") ? query : `§${query}`;
  const item = RULE_EXPLANATIONS[norm];
  if (!item) {
    return {
      ok: false,
      output: `Unknown rule "${query}" (observed: "${query}"; expected: one of ${keys.join(", ")}; next: run with --explain list to see available rules)`,
    };
  }
  return {
    ok: true,
    output: [
      `${item.rule} — ${item.title}`,
      `  Rationale: ${item.rationale}`,
      `  Repair:    ${item.repair}`,
    ].join("\n"),
  };
}

/**
 * Compares two SHA strings, canonicalizing via `resolveSha` when available (SC4).
 * Degrades to "blocked" when history is shallow/unavailable and two different strings could be abbreviations of the same commit.
 */
export function compareShas(a: string, b: string, resolveSha?: ShaResolver): "same" | "different" | "blocked" {
  const na = extractRefSha(a);
  const nb = extractRefSha(b);
  if (!na || !nb) return "different";
  if (na === nb) return "same";
  if (resolveSha) {
    const ra = resolveSha(na);
    const rb = resolveSha(nb);
    if (ra && ra !== "shallow" && rb && rb !== "shallow") {
      return ra === rb ? "same" : "different";
    }
  }
  if ((na.startsWith(nb) || nb.startsWith(na)) && /^[0-9a-f]{4,40}$/i.test(na) && /^[0-9a-f]{4,40}$/i.test(nb)) {
    return "blocked";
  }
  return "different";
}

function attachTemplate(rule: string, rec: Artifact, msg: string): string {
  if (/\(observed: .+;\s*expected: .+;\s*next: .+\)/.test(msg)) return msg;
  const exp = RULE_EXPLANATIONS[rule];
  const observed = `${rec.path} (${str(rec.fm.status) ?? "no-status"})`;
  const expected = exp ? exp.title.toLowerCase() : `compliance with ${rule}`;
  const next = exp ? exp.repair : `inspect ${rec.path} against contract ${rule}`;
  return `${msg} (observed: ${observed}; expected: ${expected}; next: ${next})`;
}

const TASK_STATES = new Set(contract.task.states);
const SPEC_STATES = new Set(contract.spec.states);
const NOT_CURRENT = new Set(contract.task.not_current_spec_states);
const ALWAYS_TASK = ["Routing and approvals", "Objective", "Acceptance criteria", "Verification"];
const ALWAYS_SPEC = ["Problem", "Expected behavior", "Scope", "Acceptance criteria", "Interfaces and dependencies", "Decisions", "Risks and constraints", "Verification", "Rollback", "Open questions", "Revisions"];
const INTENT_STATES = new Set(["draft", "approved", "superseded"]);
const ALWAYS_INTENT = ["Original prompt"];

export function loadSnapshot(files: Map<string, string>): Map<string, Artifact> {
  const out = new Map<string, Artifact>();
  for (const [path, text] of files) {
    if (!/^(tasks|specs|intents)\/[^/]+\.md$/.test(path)) continue;
    const r = parseRecord(path, text);
    out.set(`${r.kind}:${r.id}`, r);
  }
  return out;
}

export function schemaMajor(rec: Artifact): { family: string; major: number } | undefined {
  const m = /^(task|spec|intent)\/(\d+)$/.exec(str(rec.fm.schema) ?? "");
  return m ? { family: m[1], major: Number(m[2]) } : undefined;
}

/** "current" | "previous" (both content-checked) | "retired" (freeze check only) | "unknown". */
export function schemaStanding(rec: Artifact, opts: Options): "current" | "previous" | "retired" | "unknown" {
  const s = schemaMajor(rec);
  if (!s || s.family !== rec.kind) return "unknown";
  const cur = (opts.currentMajor ?? contract.current_major)[rec.kind];
  if (cur === undefined) return "unknown";
  if (s.major === cur) return "current";
  if (s.major === cur - 1) return "previous";
  if (s.major < cur - 1 && contract.schema_registry.some((r) => r.schema === rec.fm.schema)) return "retired";
  return "unknown";
}

export function checkSnapshot(records: Map<string, Artifact>, opts: Options = {}): Finding[] {
  const out: Finding[] = [];
  const add = (level: Level, rule: string, rec: Artifact, msg: string, specGate = false) =>
    out.push({ level, rule, file: rec.path, msg: attachTemplate(rule, rec, msg), specGate });
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
    if (rec.kind === "intent") checkIntent(rec, add);
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
    if (status === "verified" || status === "accepted") checkVerified(rec, isHeavyParent || tier === "standard", opts, add);
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
      const reviewText = section(rec, "Review");
      if (!reviewText || /^\s*skip:/m.test(reviewText))
        add("fail", "§3.3", rec, "heavy parent cannot be verified while ## Review is skip: or empty");
      else if (/^\s*[-*].*(?:[:—–-]\s*|\b)open\s*$/m.test(reviewText))
        add("fail", "§3.3", rec, "a ## Review finding is still open");
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

function checkVerified(rec: Artifact, needsBaselineAndReview: boolean, opts: Options, add: (l: Level, rule: string, r: Artifact, m: string) => void) {
  const at = rec.fm.verified_at;
  if (at === undefined) return add("fail", "§3.1", rec, "verified and accepted need verified_at");
  if (typeof at !== "string") return add("fail", "§2.2", rec, "verified_at must be a quoted string (YAML would read an all-digit SHA as a number)");
  const byId = new Map(rec.rows.map((r) => [r.id, r]));
  for (const r of rec.rows) {
    if (r.kind === "B") {
      if (!r.sha) add("fail", "§3.4", rec, `${r.id} has no Ref commit`);
      else {
        const cmp = compareShas(r.sha, at, opts.resolveSha);
        if (cmp === "same") add("fail", "§3.4", rec, `${r.id} ran on verified_at ${at}; a baseline must run before the change`);
        else if (cmp === "blocked") add("blocked", "§3.4", rec, `can't canonicalize ${r.id} commit ${r.sha} against ${at} (no Git history)`);
        else if (opts.mode !== "authoring") {
          const anc = opts.ancestry?.(r.sha, at);
          if (anc === false) add("fail", "§3.4", rec, `${r.id} commit ${r.sha} is not a strict ancestor of verified_at ${at}`);
          else if (anc === undefined) add("blocked", "§3.4", rec, `can't tell whether ${r.id} commit ${r.sha} is an ancestor of ${at} (no Git history)`);
        }
      }
      continue;
    }
    const cmp = compareShas(r.sha, at, opts.resolveSha);
    if (cmp === "blocked") add("blocked", "§3.4", rec, `can't canonicalize ${r.id} commit "${r.sha}" against verified_at ${at} (no Git history)`);
    else if (cmp === "different") add("fail", "§3.4", rec, `${r.id} ran on "${r.sha}", not verified_at ${at}`);
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

function checkIntent(rec: Artifact, add: (l: Level, rule: string, r: Artifact, m: string) => void) {
  const status = str(rec.fm.status) ?? "";
  if (!INTENT_STATES.has(status)) add("fail", "§4.5", rec, `status "${status}" is not draft, approved or superseded`);
  for (const s of ALWAYS_INTENT) if (!rec.sections.has(s)) add("fail", "§4.5", rec, `missing section "## ${s}"`);
  else if (!section(rec, "Original prompt")) add("fail", "§4.5", rec, `## Original prompt must not be empty`);
  checkSkips(rec, add);
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
