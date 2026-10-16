/**
 * Git history rules of the task/spec artifact contract (docs/artifact-contracts.md §7.1 and §8).
 * Reads only committed states plus the working tree. Never writes to the repository.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import contract from "./contract.json" with { type: "json" };
import { bodyHash, parseRecord, specRef, str, type Artifact } from "./records.ts";
import { checkSnapshot, loadSnapshot, schemaStanding, type Ancestry, type Finding, type Options, type ShaResolver } from "./rules.ts";

export interface HistoryResult {
  findings: Finding[];
  /** Records on a retired schema that passed the freeze check (§8): reported as `frozen`, not `pass`. */
  frozen: string[];
}

const WT = "working tree";

/**
 * Git's repository-local variables (`git rev-parse --local-env-vars`). A Git hook exports some of
 * them (in a linked worktree, absolute GIT_DIR and GIT_INDEX_FILE), and a child git that inherits
 * them acts on the hook's repository instead of `root`. Dropping them makes git find the
 * repository from `cwd`, which for the validator's own root is the same repository.
 */
const LOCAL_ENV_VARS = [
  "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_CONFIG", "GIT_CONFIG_PARAMETERS", "GIT_CONFIG_COUNT",
  "GIT_OBJECT_DIRECTORY", "GIT_DIR", "GIT_WORK_TREE", "GIT_IMPLICIT_WORK_TREE", "GIT_GRAFT_FILE",
  "GIT_INDEX_FILE", "GIT_NO_REPLACE_OBJECTS", "GIT_REPLACE_REF_BASE", "GIT_PREFIX", "GIT_SHALLOW_FILE",
  "GIT_COMMON_DIR",
];

function gitEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env };
  for (const k of LOCAL_ENV_VARS) delete env[k];
  // GIT_CONFIG_COUNT pairs with GIT_CONFIG_KEY_<n> and GIT_CONFIG_VALUE_<n>.
  for (const k of Object.keys(env)) if (/^GIT_CONFIG_(KEY|VALUE)_\d+$/.test(k)) delete env[k];
  return env;
}

export function git(root: string, args: string[]): { ok: boolean; out: string } {
  if (typeof Bun !== "undefined" && Bun.spawnSync) {
    const p = Bun.spawnSync(["git", ...args], { cwd: root, env: gitEnv(), stdout: "pipe", stderr: "pipe" });
    return { ok: p.exitCode === 0, out: p.stdout.toString() };
  }
  const p = spawnSync("git", args, { cwd: root, env: gitEnv(), encoding: "utf8" });
  return { ok: p.status === 0, out: p.stdout || "" };
}

export function isGitRepo(root: string): boolean {
  return git(root, ["rev-parse", "--is-inside-work-tree"]).out.trim() === "true";
}


export type RecordHistory = { kind: "none" } | { kind: "some"; commit: string } | { kind: "unknown"; reason: "not-git" | "shallow" };

/**
 * Whether HEAD's history ever committed a task or spec record: a commit that added or removed a
 * `schema: task/N` or `schema: spec/N` line under `tasks/` or `specs/`. Needs full history.
 */
export function recordHistory(root: string): RecordHistory {
  if (!isGitRepo(root)) return { kind: "unknown", reason: "not-git" };
  if (!git(root, ["rev-parse", "--verify", "--quiet", "HEAD"]).ok) return { kind: "none" };
  if (git(root, ["rev-parse", "--is-shallow-repository"]).out.trim() === "true") return { kind: "unknown", reason: "shallow" };
  const hit = git(root, ["log", "-E", "-G", "^schema:[[:space:]]*[\"']?(task|spec|intent)/[0-9]+", "--format=%h", "-1", "HEAD", "--", "tasks", "specs", "intents"]).out.trim();
  return hit ? { kind: "some", commit: hit } : { kind: "none" };
}

export function gitResolveSha(root: string): ShaResolver {
  if (!isGitRepo(root)) return () => "shallow";
  const shallow = git(root, ["rev-parse", "--is-shallow-repository"]).out.trim() === "true";
  const cache = new Map<string, string | "shallow" | undefined>();
  return (sha: string) => {
    if (cache.has(sha)) return cache.get(sha);
    const r = git(root, ["rev-parse", "--verify", "--quiet", `${sha}^{commit}`]);
    const val = r.ok ? r.out.trim() : shallow ? "shallow" : undefined;
    cache.set(sha, val);
    return val;
  };
}

export function gitAncestry(root: string): Ancestry {
  const resolve = gitResolveSha(root);
  const cache = new Map<string, boolean | undefined>();
  return (a, b) => {
    const key = `${a}|${b}`;
    if (cache.has(key)) return cache.get(key);
    const ra = resolve(a);
    const rb = resolve(b);
    if (!ra || ra === "shallow" || !rb || rb === "shallow") {
      cache.set(key, undefined);
      return undefined;
    }
    if (ra === rb) {
      cache.set(key, false);
      return false;
    }
    let res: boolean | undefined;
    if (typeof Bun !== "undefined" && Bun.spawnSync) {
      const p = Bun.spawnSync(["git", "merge-base", "--is-ancestor", ra, rb], { cwd: root, env: gitEnv() });
      res = p.exitCode === 0 ? true : p.exitCode === 1 ? false : undefined;
    } else {
      const p = spawnSync("git", ["merge-base", "--is-ancestor", ra, rb], { cwd: root, env: gitEnv() });
      res = p.status === 0 ? true : p.status === 1 ? false : undefined;
    }
    cache.set(key, res);
    return res;
  };
}


/** Text of `tasks/*.md` and `specs/*.md` at a commit, or in the working tree. */
function filesAt(root: string, rev: string): Map<string, string> {
  const files = new Map<string, string>();
  if (rev === WT) {
    for (const dir of ["tasks", "specs", "intents"]) {
      const abs = join(root, dir);
      if (!existsSync(abs)) continue;
      for (const name of readdirSync(abs)) if (name.endsWith(".md")) files.set(`${dir}/${name}`, readFileSync(join(abs, name), "utf8"));
    }
    return files;
  }
  const list = git(root, ["ls-tree", "-r", "--name-only", rev, "--", "tasks", "specs", "intents"]).out.split("\n").filter((p) => /^(tasks|specs|intents)\/[^/]+\.md$/.test(p));
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

/**
 * Authoring mode: checks only the current working tree snapshot, skipping Git history walk and commit-order ancestry.
 * Shares the exact same current-tree finding format (`working tree: <msg>`) as `checkHistory`.
 */
export function checkAuthoring(root: string, opts: Options = {}): HistoryResult {
  const cur = loadSnapshot(filesAt(root, WT));
  const resolveSha = opts.resolveSha ?? (isGitRepo(root) ? gitResolveSha(root) : undefined);
  const findings = checkSnapshot(cur, { ...opts, mode: "authoring", ancestry: undefined, resolveSha }).map((fd) => ({
    ...fd,
    msg: `${WT}: ${fd.msg}`,
  }));
  return { findings, frozen: [] };
}

export function checkHistory(root: string, opts: Options = {}): HistoryResult | { blocked: string } {
  if (!isGitRepo(root)) return { blocked: "not a Git repository" };
  if (git(root, ["rev-parse", "--is-shallow-repository"]).out.trim() === "true") return { blocked: "shallow clone: the history walk and deleted-record detection need full history (§7.1)" };
  const hasHead = git(root, ["rev-parse", "--verify", "--quiet", "HEAD"]).ok;
  const commits = hasHead ? git(root, ["rev-list", "--reverse", "HEAD", "--", "tasks", "specs", "intents"]).out.split("\n").filter(Boolean) : [];
  const revs = [...commits, WT];
  const findings: Finding[] = [];
  const frozen: string[] = [];
  const snapshots = new Map<string, Map<string, Artifact>>();
  const snap = (rev: string) => {
    if (!snapshots.has(rev)) snapshots.set(rev, loadSnapshot(filesAt(root, rev)));
    return snapshots.get(rev)!;
  };
  // The state just before `rev` in Git's DAG (first parent; HEAD for the working tree), so a new
  // spec's approval entry counts only if that commit added it (§7.1 squash creation).
  const parentSnap = (rev: string) => {
    const parent = rev === WT ? (hasHead ? git(root, ["rev-parse", "HEAD"]).out.trim() : "") : git(root, ["rev-parse", "--verify", "--quiet", `${rev}^`]).out.trim();
    return parent ? snap(parent) : new Map<string, Artifact>();
  };
  const ancestry = opts.ancestry ?? gitAncestry(root);
  const resolveSha = opts.resolveSha ?? gitResolveSha(root);
  const at = (rev: string) => (rev === WT ? WT : rev.slice(0, 7));

  // A record is only deleted when a commit actually removes it relative to its parent(s). The linear
  // `rev-list` below interleaves sibling branches, so a path present on one branch and absent on a
  // parallel one (before their merge) must not be read as a deletion. Git's own --diff-filter=D is the
  // DAG-aware source of truth; the working tree stays handled by the walk itself.
  const realDeletions = new Map<string, Set<string>>();
  if (hasHead) {
    const out = git(root, ["log", "--full-history", "--diff-filter=D", "--name-only", "-z", "--format=%H", "HEAD", "--", "tasks", "specs", "intents"]).out;
    let rev = "";
    for (const token of out.split("\0")) {
      const tok = token.trim();
      if (/^[0-9a-f]{40}$/.test(tok)) rev = tok;
      else if (tok && rev) (realDeletions.get(rev) ?? realDeletions.set(rev, new Set()).get(rev)!).add(tok);
    }
  }

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
      const sameRec = (a: Artifact, b: Artifact) => a.body === b.body && JSON.stringify(a.fm) === JSON.stringify(b.fm);
      if (before && now && sameRec(before.rec, now)) continue;
      if (!before && !now) continue;
      // Unchanged from its parent at a sibling-branch commit (where `before.rev` is not an ancestor) is
      // the pre-divergence state, not a transition: keep `lastState` so `verified` doesn't regress to `todo`.
      if (rev !== WT && before && now && ancestry(before.rev, rev) === false) {
        const parentRec = parentSnap(rev).get(key);
        if (parentRec && sameRec(parentRec, now)) continue;
      }
      touched.add(key);
      const file = (now ?? before!.rec).path;
      const f = (msg: string, rule = "§7.1") => findings.push({ level: "fail", rule, file, msg: `${at(rev)}: ${msg}` });
      if (!now) {
        // Absent at a sibling-branch commit is no deletion: keep the last state, or the record would
        // later "reappear" as newly created and fail its creation rules.
        if (rev === WT || realDeletions.get(rev)?.has(file)) {
          const reason = key.startsWith("spec")
            ? "a spec is never deleted (§4.3)"
            : key.startsWith("intent")
            ? "an intent artifact is never deleted (§4.5)"
            : "a committed task record is closed as cancelled, never deleted (§6.1)";
          const rule = key.startsWith("spec") || key.startsWith("intent") ? "§7.1" : "§6.1";
          f(`${file} was deleted; ${reason}`, rule);
          lastState.delete(key);
        }
        continue;
      }
      if (now.kind === "spec") checkSpecTransition(before?.rec, now, snap(rev), before ? snap(before.rev) : parentSnap(rev), f);
      else if (now.kind === "intent") checkIntentTransition(before?.rec, now, f);
      else if (before) checkTaskTransition(before.rec, now, f);
      if (!before || str(before.rec.fm.status) !== str(now.fm.status)) {
        changedStatus.add(key);
        lastStatusChange.set(key, rev);
      }
      lastState.set(key, { rev, rec: now });
    }
    // Guards of the new status hold at this revision; the spec gate holds at every revision that touched records.
    if (touched.size || rev === WT)
      for (const fd of checkSnapshot(cur, { ...opts, ancestry, resolveSha })) {
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
    const draftOk = cs === "draft" && cur.fm.version === 1 && cur.fm.approved_version === undefined && cur.fm.approved_hash === undefined;
    // A creation and an approval squashed into one commit (§7.1): the approval evidence is the same as draft → approved.
    const squashedOk = cs === "approved" && cur.fm.version === 1 && cur.fm.approved_version === 1 && cur.fm.approved_hash === h(cur) && newApproval();
    if (!draftOk && !squashedOk)
      f(`spec ${cur.id} must be created as draft, version 1, without approved_* keys, or as approved v1 with a matching approved_hash and a new "approved: spec v1" entry in the parent in the same commit`);
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

function checkIntentTransition(prev: Artifact | undefined, cur: Artifact, f: (m: string, rule?: string) => void) {
  const ps = str(prev?.fm.status);
  const cs = str(cur.fm.status);
  if (!prev) {
    if (cs !== "draft" && cs !== "approved") {
      f(`intent ${cur.id} must be created as draft or approved`, "§4.5");
    }
    return;
  }
  if (ps === "superseded") {
    f(`intent ${cur.id} changed after it was superseded`, "§4.5");
    return;
  }
  if (ps === "approved" && cs === "draft") {
    f(`intent ${cur.id}: transition approved → draft is not allowed`, "§4.5");
    return;
  }
  if (ps === "approved" && prev.sections.get("Original prompt") !== cur.sections.get("Original prompt")) {
    f(`intent ${cur.id}: ## Original prompt is immutable once approved`, "§4.5");
    return;
  }
}

