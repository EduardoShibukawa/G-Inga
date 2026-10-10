/**
 * Git history rules of the D3 contract (docs/artifact-contracts.md §7.1 and §8).
 * Reads only committed states plus the working tree. Never writes to the repository.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import contract from "./transitions.json" with { type: "json" };
import { bodyHash, parseRecord, specRef, str, type Artifact } from "./records.ts";
import { checkSnapshot, loadSnapshot, schemaStanding, type Ancestry, type Finding, type Options } from "./rules.ts";

export interface HistoryResult {
  findings: Finding[];
  /** Records on a retired schema that passed the freeze check (§8): reported as `frozen`, not `pass`. */
  frozen: string[];
}

const WT = "working tree";

export function git(root: string, args: string[]): { ok: boolean; out: string } {
  const p = Bun.spawnSync(["git", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  return { ok: p.exitCode === 0, out: p.stdout.toString() };
}

export function isGitRepo(root: string): boolean {
  return git(root, ["rev-parse", "--is-inside-work-tree"]).out.trim() === "true";
}

export function gitAncestry(root: string): Ancestry {
  return (a, b) => {
    const ra = git(root, ["rev-parse", "--verify", "--quiet", `${a}^{commit}`]);
    const rb = git(root, ["rev-parse", "--verify", "--quiet", `${b}^{commit}`]);
    if (!ra.ok || !rb.ok) return undefined;
    if (ra.out.trim() === rb.out.trim()) return false;
    const p = Bun.spawnSync(["git", "merge-base", "--is-ancestor", a, b], { cwd: root });
    return p.exitCode === 0 ? true : p.exitCode === 1 ? false : undefined;
  };
}

/** Text of `tasks/*.md` and `specs/*.md` at a commit, or in the working tree. */
function filesAt(root: string, rev: string): Map<string, string> {
  const files = new Map<string, string>();
  if (rev === WT) {
    for (const dir of ["tasks", "specs"]) {
      const abs = join(root, dir);
      if (!existsSync(abs)) continue;
      for (const name of readdirSync(abs)) if (name.endsWith(".md")) files.set(`${dir}/${name}`, readFileSync(join(abs, name), "utf8"));
    }
    return files;
  }
  const list = git(root, ["ls-tree", "-r", "--name-only", rev, "--", "tasks", "specs"]).out.split("\n").filter((p) => /^(tasks|specs)\/[^/]+\.md$/.test(p));
  for (const p of list) files.set(p, git(root, ["show", `${rev}:${p}`]).out);
  return files;
}

const TRANSITIONS = [...contract.task.transitions, ...contract.task.transitions_from_prose.map((t) => t.edge)];
export function reachable(from: string, to: string): boolean {
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const s = queue.shift()!;
    if (s === to) return true;
    for (const [a, b] of TRANSITIONS) if (a === s && !seen.has(b)) seen.add(b), queue.push(b);
  }
  return false;
}

export function checkHistory(root: string, opts: Options = {}): HistoryResult | { blocked: string } {
  if (!isGitRepo(root)) return { blocked: "not a Git repository" };
  if (git(root, ["rev-parse", "--is-shallow-repository"]).out.trim() === "true") return { blocked: "shallow clone: the history walk needs full history (§7.1)" };
  const hasHead = git(root, ["rev-parse", "--verify", "--quiet", "HEAD"]).ok;
  const commits = hasHead ? git(root, ["rev-list", "--reverse", "HEAD", "--", "tasks", "specs"]).out.split("\n").filter(Boolean) : [];
  const revs = [...commits, WT];
  const findings: Finding[] = [];
  const frozen: string[] = [];
  const snapshots = new Map<string, Map<string, Artifact>>();
  const snap = (rev: string) => {
    if (!snapshots.has(rev)) snapshots.set(rev, loadSnapshot(filesAt(root, rev)));
    return snapshots.get(rev)!;
  };
  const ancestry = opts.ancestry ?? gitAncestry(root);
  const at = (rev: string) => (rev === WT ? WT : rev.slice(0, 7));

  // Every path that was ever a record, with its state at each revision that touched it.
  const lastState = new Map<string, { rev: string; rec: Artifact }>();
  const lastStatusChange = new Map<string, string>();
  const reported = new Set<string>();
  for (const rev of revs) {
    const cur = snap(rev);
    const changedStatus = new Set<string>();
    const touched = new Set<string>();
    const keys = new Set([...cur.keys(), ...lastState.keys()]);
    for (const key of keys) {
      const now = cur.get(key);
      const before = lastState.get(key);
      if (before && now && before.rec.body === now.body && JSON.stringify(before.rec.fm) === JSON.stringify(now.fm)) continue;
      if (!before && !now) continue;
      touched.add(key);
      const file = (now ?? before!.rec).path;
      const f = (msg: string, rule = "§7.1") => findings.push({ level: "fail", rule, file, msg: `${at(rev)}: ${msg}` });
      if (!now) {
        f(`${file} was deleted; ${key.startsWith("spec") ? "a spec is never deleted (§4.3)" : "a committed task record is closed as cancelled, never deleted (§6.1)"}`, key.startsWith("spec") ? "§7.1" : "§6.1");
        lastState.delete(key);
        continue;
      }
      if (now.kind === "spec") checkSpecTransition(before?.rec, now, snap(rev), before ? snap(before.rev) : new Map(), f);
      else if (before) checkTaskTransition(before.rec, now, f);
      if (!before || str(before.rec.fm.status) !== str(now.fm.status)) {
        changedStatus.add(key);
        lastStatusChange.set(key, rev);
      }
      lastState.set(key, { rev, rec: now });
    }
    // Guards of the new status hold at this revision; the spec gate holds at every revision that touched records.
    if (touched.size || rev === WT)
      for (const fd of checkSnapshot(cur, { ...opts, ancestry })) {
        const key = [...cur.entries()].find(([, r]) => r.path === fd.file)?.[0];
        const dedupe = `${fd.file}|${fd.rule}|${fd.msg}`;
        if ((rev === WT || fd.specGate || (key && changedStatus.has(key))) && !reported.has(dedupe)) {
          reported.add(dedupe);
          findings.push({ ...fd, msg: `${at(rev)}: ${fd.msg}` });
        }
      }
  }

  // Freeze check for retired majors (§8).
  for (const [key, { rec, rev: lastRev }] of lastState) {
    if (schemaStanding(rec, opts) !== "retired") continue;
    const entry = contract.schema_registry.find((r) => r.schema === rec.fm.schema)!;
    const status = str(rec.fm.status) ?? "";
    const fail = (msg: string) => findings.push({ level: "fail", rule: "§8", file: rec.path, msg });
    if (!entry.terminal.includes(status)) fail(`retired schema ${entry.schema} with non-terminal status "${status}"; migrate it before resuming work`);
    else {
      const since = lastStatusChange.get(key)!;
      const later = git(root, ["rev-list", "HEAD", "--", rec.path]).out.split("\n").filter(Boolean);
      const changedAfter = lastRev === WT || later[0] !== since;
      if (changedAfter) fail(`retired schema ${entry.schema}: changed after its status last changed (${at(since)}); it is no longer frozen`);
      else frozen.push(`${rec.path} (${entry.schema}, ${status}, unchanged since ${at(since)})`);
    }
  }
  return { findings, frozen };
}

function checkSpecTransition(prev: Artifact | undefined, cur: Artifact, curSnap: Map<string, Artifact>, prevSnap: Map<string, Artifact>, f: (m: string) => void) {
  const ps = str(prev?.fm.status);
  const cs = str(cur.fm.status);
  const h = (r: Artifact) => bodyHash("---\n---\n" + r.body);
  const same = (k: string) => JSON.stringify(prev!.fm[k]) === JSON.stringify(cur.fm[k]);
  const approvals = (snapshot: Map<string, Artifact>, v: unknown) =>
    [...snapshot.values()]
      .filter((t) => t.kind === "task" && str(t.fm.tier) === "heavy" && !t.fm.parent && specRef(t)?.id === cur.id)
      .flatMap((t) => t.log)
      .filter((e) => e.keyword === "approved" && new RegExp(`^spec v${v}\\b`).test(e.text)).length;
  const newApproval = () => approvals(curSnap, cur.fm.version) > approvals(prevSnap, cur.fm.version);
  const revisions = (r: Artifact) => (r.sections.get("Revisions") ?? "").split("\n").filter((l) => /^\s*[-*]/.test(l)).length;

  if (!prev) {
    if (cs !== "draft" || cur.fm.version !== 1 || cur.fm.approved_version !== undefined || cur.fm.approved_hash !== undefined)
      f(`spec ${cur.id} must be created as draft, version 1, without approved_* keys`);
    return;
  }
  if (ps === "superseded") return f(`spec ${cur.id} changed after it was superseded`);
  if (cs === "superseded") {
    if (h(prev) !== h(cur)) f(`spec ${cur.id}: body changed in the commit that supersedes it`);
    return;
  }
  const reopenOk = () => cur.fm.version === (prev.fm.version as number) + 1 && same("approved_version") && same("approved_hash") && revisions(cur) > revisions(prev);
  const approveOk = () => cur.fm.approved_version === cur.fm.version && cur.fm.approved_hash === h(cur) && newApproval();
  if (ps === "draft" && cs === "draft") {
    if (!same("version") || !same("approved_version") || !same("approved_hash")) f(`spec ${cur.id}: version or approval keys changed while staying draft`);
  } else if (ps === "draft" && cs === "approved") {
    if (!approveOk()) f(`spec ${cur.id}: approval needs approved_version = version, approved_hash = body hash, and a new "approved: spec v${cur.fm.version}" entry in the parent`);
  } else if (ps === "approved" && cs === "draft") {
    if (!reopenOk()) f(`spec ${cur.id}: a reopen needs version + 1, unchanged approved_version/approved_hash and a new ## Revisions line`);
  } else if (ps === "approved" && cs === "approved") {
    if (cur.fm.version === prev.fm.version) {
      if (!same("approved_version") || !same("approved_hash") || h(prev) !== h(cur))
        f(`spec ${cur.id}: approved body or hash changed without a new version and a new approved: entry (only frontmatter may change)`);
    } else if (!(cur.fm.version === (prev.fm.version as number) + 1 && revisions(cur) > revisions(prev) && approveOk()))
      f(`spec ${cur.id}: a squashed reopen + reapproval needs version + 1, a new ## Revisions line, a matching approved_hash and a new approved: entry`);
  } else f(`spec ${cur.id}: transition ${ps} → ${cs} is not allowed`);
}

function checkTaskTransition(prev: Artifact, cur: Artifact, f: (m: string, rule?: string) => void) {
  const ps = str(prev.fm.status) ?? "";
  const cs = str(cur.fm.status) ?? "";
  if (ps !== cs && !reachable(ps, cs)) f(`task ${cur.id}: ${ps} → ${cs} is not reachable in the §3.3 state machine`, "§3.3");
  if (prev.fm.schema !== cur.fm.schema) {
    if (ps !== cs) f(`task ${cur.id}: a migration commit (${prev.fm.schema} → ${cur.fm.schema}) must not change status`, "§8");
    if (JSON.stringify(prev.rows) !== JSON.stringify(cur.rows)) f(`task ${cur.id}: a migration commit must not change ## Verification rows`, "§8");
  }
  const pv = specRef(prev)?.version;
  const cv = specRef(cur)?.version;
  if (cur.fm.parent && pv !== undefined && cv !== undefined && pv !== cv) {
    const added = cur.log.filter((e) => e.keyword === "spec-version").length > prev.log.filter((e) => e.keyword === "spec-version").length;
    const entry = cur.log.filter((e) => e.keyword === "spec-version").at(-1);
    if (!added || !new RegExp(`^v${pv}\\s*(?:→|->)\\s*v${cv};\\s*(rerun|unaffected):`).test(entry?.text ?? ""))
      f(`task ${cur.id}: moved @${pv} → @${cv} without a "spec-version: v${pv} → v${cv}; rerun: …" or "…; unaffected: …" entry`, "§4.4");
  }
}
