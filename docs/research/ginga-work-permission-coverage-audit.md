# G-Ingá `work` skill: permission coverage audit

**Status:** `proposed` (research evidence; it changes no decision, skill, permission setting, validator or contract).
**Task:** `GINGA-WORK-PERMISSION-COVERAGE-AUDIT`. Claim `refs/heads/task-claims/GINGA-WORK-PERMISSION-COVERAGE-AUDIT` (`61d3836`). Branch `claude/friendly-allen-eqj2m6`, based on `claude/tender-turing-48un5s` at `68799cb`.
**Scope:** an audit with **no paid model calls**. No session of the earlier study is rerun and no new experimental matrix is run. The only things executed are the repository checks, the earlier runner's model-free `--selftest`, and a model-free probe of the pinned validator (§5).

**Question.** In [`ginga-real-skill-routing-validation.md`](ginga-real-skill-routing-validation.md), 20/20 sessions were "correct" and the validator exited 0 on every final state, yet commands were denied in 13 of the 20 matrix sessions. Did those denials compromise the **execution** of the `work` skill, its **verification**, or only the **evidence** an agent could observe and report?

## Short answer

1. **Execution was not compromised by the denials in any observed way.** Every operation the skill prescribes for the light and resume paths, except the repository's canonical `mise` checks, was permitted by the runner's configuration. The artifacts were produced (20/20).
2. **The procedure was not completed, and the published evidence can't attribute that to denials.** In 10/10 resume sessions the record stayed `status: active` and no commit was made, although `standard.md` §5 prescribes a commit, a validator run and the `verified` transition, and `git add`, `git commit` and the validator were all on the allow-list.
3. **The final validator pass says nothing about whether the procedure ran.** A model-free probe on the same fixture (§5) shows the pinned validator exits 0 when the agent appends the line and **does not touch the record at all**. The runner's "correct" criterion is met without a commit, without `verified` and without the agent ever running the validator.
4. **Verification evidence is the weak point.** The repository's canonical checks (`mise install`, `mise run validate`, `mise run test`, required by the fixture's `CLAUDE.md`) were denied, `mise` was absent from the container, and no fallback was permitted. Whether each agent then reported those checks honestly cannot be determined: the per-session denial list, tool calls and answers were never published.

The detailed severities are in §6, and the minimum permissions per flow are in §7.

## 1. Reservation and isolation

- **Protocol.** As in the earlier reports' §1: an empty commit over the base at `refs/heads/task-claims/<TASK>`, whose message names the worker, branch, base and time. It's pushed with `--force-with-lease=<ref>:`, so the push fails if the ref already exists.
- **Claims on the remote before starting** (2026-10-11, `git ls-remote origin 'refs/heads/task-claims/*'`): `CLAUDE-HOST-CONTEXT-COST-BASELINE`, `CLAUDE-SKILL-AUTO-ROUTING-FORMULATION`, `CLAUDE-SKILL-F4-F1-FORMULATION-REPLICATION`, `CLAUDE-SKILL-INVOCATION-MARGINAL-COST`, `CLAUDE-SKILL-MULTITURN-FACTORIAL`, `CLAUDE-SKILL-MULTITURN-REALISTIC-CACHE-CONTROL`, `CLAUDE-WORK-SKILL-COST-ISOLATION`, `GINGA-REAL-SKILL-ROUTING-VALIDATION`. None names this task, and none was changed.
- **Claim.** `61d3836`, parent `68799cb`, pushed with a lease that expects the ref to be absent. The push created it (`* [new branch]`).
- **Claim release (after the audit commit `65264c5`).** `git push --force-with-lease=refs/heads/task-claims/GINGA-WORK-PERMISSION-COVERAGE-AUDIT:61d3836… origin :refs/heads/task-claims/GINGA-WORK-PERMISSION-COVERAGE-AUDIT` failed 5 times (14:06:05–14:06:38 UTC: immediately, then after 2, 4, 8 and 16 s) with `fatal: the remote end hung up unexpectedly`, as the earlier tasks' releases did. The push of the task branch worked minutes earlier. The claim is **still present at `61d3836`** and needs removal by the owner. No other claim was touched, and no other route was tried.
- **Base.** `68799cb` is the published head of `claude/tender-turing-48un5s`, the only branch that holds the earlier report and runner. `main` (`130c708`) isn't an ancestor of it.
- **Work tree.** A separate `git worktree` at `/home/user/G-Inga-perm-audit` holds this branch. The session's designated branch `claude/friendly-allen-eqj2m6` had no commits of its own (it pointed at `main`), so it was reset onto the base. The original checkout was detached. No other worker's branch, work tree or claim was touched.
- **Not modified:** `main`, ADRs, the decision map, contracts, validators, the skill, the earlier runner and report, and Antigravity or Gemini files.

## 2. Sources examined

| Source | Version | sha256 (prefix) | Read |
|---|---|---|---|
| `.claude/skills/work/SKILL.md` | `5d38ae3` | `ec32f68ab6f8` (4,280 B) | in full |
| `.claude/skills/work/standard.md` | `5d38ae3` | `f559bde91812` (2,155 B) | in full |
| `.claude/skills/work/resume.md` | `5d38ae3` | `f31768350cd0` (1,410 B) | in full |
| `.claude/skills/work/heavy.md` | `5d38ae3` | `229528b8f93e` (2,926 B) | in full |
| `.claude/skills/work/review.md` | `5d38ae3` | `8b5abd9e9b75` (1,606 B) | in full |
| fixture `CLAUDE.md` (with the `g-inga:pointer` block) | `5d38ae3` | `06392839f2e6` | in full |
| `docs/artifact-contracts.md` | `5d38ae3` | `fa887d00904f` | §1, §2.4, §3.1–§3.6, §5–§7.2 |
| `specs/2026-10-11-minimal-v1-specification.md` | `5d38ae3` | – | SC1–SC8 and environment assumptions |
| `tools/validate/validate.js` (bundle) and `standalone.ts`, `artifacts/history.ts` | `5d38ae3` | `4796be0db109` (bundle) | exit-code logic, the Git calls it makes |
| `package.json`, `mise.toml` | `5d38ae3` | – | the canonical check commands |
| [`ginga-real-skill-routing-validation.md`](ginga-real-skill-routing-validation.md) | `68799cb` | `da5ddd087fd4` | in full, plus its diff history `3d74c07..68799cb` |
| [`run_ginga_real_skill_routing_validation.py`](../../tools/research/run_ginga_real_skill_routing_validation.py) | last changed `3d74c07` | `692c3c218112` | in full |
| `claude --help` | CLI `2.1.296` (same version as the earlier runs) | – | `--permission-mode`, `--permission-prompts`, `--allowedTools` |

The five skill hashes match the ones pinned in the runner.

### What the published evidence does and doesn't contain

- **Published:** per-session **counts** of denials, Bash calls and tool calls; the record's final `status`; commits; changed paths; the runner's post-hoc checks; and a one-line summary of denied **categories**: "compound commands, `mise`, `xxd`, `echo` outside the allow-list" (report §5, fact 5). Also: "Several R answers said they couldn't run a check, even though the validator then exits 0 on their final state".
- **Collected but not published:** the runner records each denial's tool and the first 120 characters of its command (`result.permission_denials`), every Bash command (`tool_calls[].bash`) and the first 300 characters of each answer (`answer_head`) in `WORK_DIR/summary.json`. Its docstring says those files "hold account context: never commit them". They aren't in the repository, and they aren't in this container (searched for `summary.json` and `pinned.bundle`, nothing found).
- **Consequence.** This audit **can't name any single denied command**, map a denial to a session or a skill step, tell whether an agent ran the validator itself, or read what each answer claimed. Where the matrix below needs that, the entry says `unknown`. Nothing is reconstructed.

## 3. Permissions as configured

From the runner's `cli_args()` and the CLI's own help at the same version (`2.1.296`):

| Setting | Value | Effect (from `claude --help` or observed) |
|---|---|---|
| `--tools` | `Read,Edit,Write,Bash,Glob,Grep,Skill` | No `Agent`/`Task`, no web tools |
| `--permission-mode` | `acceptEdits` | File edits are accepted without a prompt |
| `--permission-prompts` | `none` | "anything that would prompt is denied automatically; the permission mode still decides everything else" |
| `--allowedTools` (Bash) | `git status`, `git diff`, `git log`, `git show`, `git branch`, `git rev-parse`, `git add`, `git commit`, `git merge-base`, `node tools/validate/validate.js`, `bun tools/validate/validate.ts`, `ls`, `cat`, `head`, `tail`, `wc`, `grep`, `date` (all `:*` prefix rules), `pwd` (exact) | Anything else that prompts is denied |
| Environment | full-history clone of `5d38ae3` plus one data commit; no remote; no `node_modules`; `node` 22 present; `mise` not installed (earlier report §5, verification table) | |

**The effective set is wider than the allow-list.** The earlier smoke test observed that `acceptEdits` also let `sed -i` run without being on the list. So "configured" can't be read as "only these commands ran". The exact set of Bash commands that `acceptEdits` auto-approves wasn't measured and isn't listed here.

Read, Glob, Grep and Skill weren't reported among the denials. The four reported categories are all Bash.

## 4. Coverage matrix

Classification: **covered** (permitted, and the operation's purpose was observably achieved), **partial** (permitted or achieved only in part, or permitted but not evidenced), **blocked** (denied or impossible in the environment), **unknown** (not determinable from published evidence). Kinds: R = read, E = edit, X = command execution, G = Git.

### Light path (L, 10 sessions)

| # | Operation | Kind | Required by | Permission expected | Configured | Evidence | Fallback | Impact | Class |
|---|---|---|---|---|---|---|---|---|---|
| L1 | Print the routing line `tier: light (…)` | – | SKILL.md invariant 1; contract §6 | none | n/a | routing line in 10/10 answers (runner) | – | none | covered |
| L2 | Read the target file | R | SKILL.md light step 2 | Read, or `cat`/`grep` | allowed | 10/10 targets fixed | – | none | covered |
| L3 | "Check relevant baseline tests or linters" (the repo's markdown lint is `bun run validate`, wrapped by `mise run validate`) | X | SKILL.md light step 2; fixture `CLAUDE.md` §6 | `Bash(mise run validate)` or `Bash(bun run validate)`, plus installed deps | **not allowed**; `mise` absent; no `node_modules`, and `bun install` would need the network | `mise` is among the denied categories; per-session attribution unknown | report the check `not run` or `blocked` (contract §6 example V2) | baseline and lint evidence are impossible; the report must say so | **blocked** |
| L4 | Minimal edit | E | SKILL.md light step 3 | Edit | `acceptEdits` | 10/10 byte-identical to pristine | `sed -i` also ran (smoke) | none | covered |
| L5 | Read the diff (`git diff`) | G (read) | SKILL.md light step 4 | `Bash(git diff:*)` | allowed | 2–5 Bash calls per L session; which ones is unknown | Read the file | none | partial (allowed; execution not evidenced) |
| L6 | Write nothing under `tasks/` or `specs/` | E (restraint) | SKILL.md invariant 2; SC2 | none needed | n/a | 0/10 wrote there (runner) | – | none | covered |
| L7 | Report in contract §6 format, checks in the four-value vocabulary | – | SKILL.md light step 5 | none | n/a | the runner checked only the routing line; answers unpublished | – | honest reporting of L3 can't be audited | unknown |

### Resume path (R, 10 sessions: `resume.md`, then `standard.md`)

| # | Operation | Kind | Required by | Permission expected | Configured | Evidence | Fallback | Impact | Class |
|---|---|---|---|---|---|---|---|---|---|
| R1 | Read `resume.md` and `tasks/<id>.md` | R | SKILL.md resume; resume.md step 1 | Read | allowed | `resume.md` body in 10/10 request bodies | – | none | covered |
| R2 | Compare the checkpoint with `git status`, `git log -n 1` and the branch | G (read) | resume.md step 2; contract §3.6; fixture `CLAUDE.md` §3 | `git status`, `git log`, `git branch`/`git rev-parse` | allowed | not evidenced per session | – | none expected | partial |
| R3 | Flag stale rows (`git merge-base --is-ancestor`) | G (read) | resume.md step 2; contract §3.4 rule 4 | `Bash(git merge-base:*)` | allowed | not evidenced | – | none expected | partial |
| R4 | Check `depends_on` and `spec` | R | resume.md steps 3–4 | Read | allowed | not applicable to the fixture (neither key set) | – | none | covered (n/a) |
| R5 | Read `standard.md` and continue under it | R | resume.md step 5 | Read | allowed | `standard.md` in **2/10** request bodies (R1-E, R5-N) | – | 8/10 sessions didn't load the procedure they were told to continue under; not a permission issue | covered (permission); procedure gap |
| R6 | Edit the target and the record | E | standard.md step 4 | Edit | `acceptEdits` | 10/10 line appended; 10/10 record changed | – | none | covered |
| R7 | AC1 check (last line of the target) | X | fixture record AC1 | `tail`, `grep`, or Read | allowed | not evidenced per session | Read | none expected | partial |
| R8 | AC2 check: run the validator | X | fixture record AC2; SKILL.md invariant 4; standard.md step 5 | `Bash(node tools/validate/validate.js:*)` | allowed for the plain command; a compound form (`…; echo $?`, `… && echo …`) is denied | runner's own post-hoc run exits 0 in 10/10; **whether any agent ran it, and in which form, is unknown** | the Bash tool reports the exit status itself; `echo` isn't needed | if the agent used a denied form, AC2 went unobserved | **unknown** |
| R9 | Commit the code change | G (write) | standard.md step 5 | `git add`, `git commit` | allowed | **0/10 commits** | – | `verified_at` impossible without a commit | partial (permitted, not exercised; cause unknown) |
| R10 | Record the SHA in `Ref` and set `verified`, `verified_at` | E, G (read) | standard.md step 5; contract §3.4 | Edit; `git rev-parse` | allowed | **0/10 `verified`**, 10/10 `active` | `completed` with AC rows (contract §3.3) | the guarded transition never happened | partial (permitted, not exercised) |
| R11 | Run the validator after the record update and commit the record | X, G | standard.md step 5 | as R8, R9 | allowed | 0/10 commits | – | as R9 | partial |
| R12 | Canonical repo checks `mise install`, `mise run validate`, `mise run test` | X | fixture `CLAUDE.md` §6 | `Bash(mise …)` and `mise` installed | **not allowed**; `mise` absent | `mise` among the denied categories | `bun run validate` / `bun run test`: also not allowed, and no `node_modules` | repository-level checks impossible; the correct report is `blocked` | **blocked** |
| R13 | Work on a dedicated branch (`git switch -c` or `git checkout -b`) | G (write) | fixture `CLAUDE.md` §7 | `git switch`/`git checkout` | **not allowed** (`git branch <name>` creates but can't switch) | no denial named; attempts unknown | – | not needed by the skill; the fixture was already off `main` | blocked (config); unknown (attempted?) |
| R14 | Byte-level inspection (`xxd`) | X | **not** required by the skill, contract or validator | – | not allowed | `xxd` among the denied categories | `tail`, `wc -c`, `git diff`, Read | redundant | blocked, redundant |
| R15 | `echo` and compound commands | X | not required | – | not allowed | both among the denied categories | separate calls; the tool's own exit status | redundant, adds requests | blocked, redundant |

### Paths the earlier study didn't exercise

| # | Operation | Kind | Required by | Configured | Class |
|---|---|---|---|---|---|
| S1 | Create a new `tasks/<id>.md`, record `B` rows before editing | E, X | standard.md steps 2–3 | Write and the validator allowed | unknown (never exercised: no fresh-standard class) |
| H1 | Owner confirmation before heavy work | – | SKILL.md H1–H6; heavy.md step 1 | one-turn `-p` session: no owner turn | blocked by design (stopping is the correct behavior) |
| H2 | Fresh-context review subagent | X | heavy.md step 5; review.md | `Agent`/`Task` not in `--tools` | blocked (config); never exercised |
| N1 | Natural-language route loads the skill | – | `disable-model-invocation: false` | `Skill` allowed | covered (10/10 `Skill(work)`) |

### Produce, run the validator, observe the evidence

| Flow | 1. Produce the artifact | 2. Run the validator | 3. Observe and report sufficient evidence |
|---|---|---|---|
| light | **yes**: 10/10 correct fixes, 0/10 writes under `tasks/`/`specs/` | not required by the skill (no record, no transition) | **partial**: `git diff` allowed; the lint/baseline check (L3) blocked; whether the report said so is unknown |
| resume → standard | **partly**: the line was appended and the record edited in 10/10, but the procedure stopped short of the commit and the `verified` transition in 10/10 | **permitted, not evidenced**: the allow-list covers the plain command; no published data shows an agent ran it; the 10/10 exit 0 is the **runner's** post-hoc run | **partial**: R12 is blocked; "several" answers said they couldn't run a check, but which check, and whether the statement was accurate, is unknown |

## 5. What the final validator pass proves

To separate "validator passes" from "procedure executed", the pinned validator and the runner's own `check_outcome` were run on the R1 fixture in five scripted states. The runner's `make_fixture` and `check_outcome` functions were imported unchanged. No model was called. The fixture was a scratch clone with `origin/feat/v1-work-self-hosting` pointed at `5d38ae3`, removed afterwards.

| State | Validator exit | Runner "correct" | Record status | Commits |
|---|---|---|---|---|
| A. line appended, record untouched | **0** | no (C4: record unchanged) | `active` | 0 |
| B. line appended, one checkpoint bullet edited | **0** | **yes** | `active` | 0 |
| C. as B, `status: verified` without `verified_at` or commit | 1 (`verified and accepted need verified_at`) | no | `verified` | 0 |
| D. as B, `status: completed` without AC rows | 1 (`AC2 has no verification row`) | no | `completed` | 0 |
| E. full standard flow: commit, AC1/AC2/V1 rows at the SHA, `verified_at`, Outcome, commit | **0** | **yes** | `verified` | 2 |

The fixture before any change also exits 0 (the runner's `make_fixture` requires it).

**Facts from the probe:**

- The validator **rejects false claims** (C, D): an agent can't mark `verified` or `completed` without the evidence the contract requires and still pass.
- The validator **can't tell B from E**. "Nothing was verified and the record says so" and "everything was verified" both exit 0. So does A, where the agent did nothing to the record.
- The runner's R criterion is met by B, which needs no commit, no validator run by the agent and no transition. The earlier study's final states (10/10 `active`, 0 commits) are consistent with B.

**Consequence.** "20/20 correct, validator exit 0" in the earlier study establishes that the **artifacts are right and no false status was written**. It doesn't establish that the agent ran the validator, observed AC2, committed, or completed `standard.md` step 5. The earlier report doesn't claim otherwise: it records 0 commits and 10/10 `active`. The risk is in reading "correct" as "procedure complete".

## 6. Risks

| ID | Severity | Risk | Evidence | Kind |
|---|---|---|---|---|
| K1 | **high** | **False impression of success.** "Correct" plus "validator exit 0" can be read as "the skill's standard flow completed". In 10/10 resume sessions it didn't: no commit, no `verified`. §5 shows exit 0 is reachable without any verification. | report §5 table; probe A, B, E | fact (probe, published counts) |
| K2 | **high** | **Canonical checks unreachable with no permitted fallback.** The fixture's `CLAUDE.md` requires `mise install`, `mise run validate`, `mise run test`. `mise` was denied and absent, and `bun run …` wasn't allowed, with no `node_modules`. Any "pass" claim for these checks would have been false; the only honest result is `blocked`. | runner allow-list; earlier report §5 (verification table, "denied categories") | fact (config); per-session claims unknown |
| K3 | **medium** | **Evidence not auditable.** The per-command denials, the agents' Bash commands and their answers were collected but not published. Whether denials hit a required step (R8), and whether agents reported blocked checks accurately, can't be checked from the repository. | runner docstring; §2 | fact |
| K4 | **medium** | **Procedure gap not attributable.** 0/10 commits and 0/10 `verified` even though `git add`, `git commit` and the validator were allowed. The denials may have contributed (a denied check leading the agent to stop short of `verified`), or the agent may have stopped for another reason: 8/10 sessions never loaded `standard.md`. Neither is shown by the evidence. | report §5 (support files, record status) | fact (counts); cause unknown |
| K5 | **medium** | **Effective permissions wider than configured.** `acceptEdits` let `sed -i` run outside the allow-list. Edits through Bash bypass the Edit tool and its record in the stream. They stayed inside the clone in the observed case. | earlier smoke observation | fact (one case); full extent unknown |
| K6 | **low** | **Light lint/baseline check impossible.** L3 was blocked. The skill's own cheap check (diff read) was permitted, and the contract's example shows `not run` as the expected report. Honest reporting is unverified (L7). | config; `mise` denials | fact (config) |
| K7 | **low** | **Redundant denials cost requests.** `xxd`, `echo` and compound commands aren't required by the skill. Each denial costs a request and a retry, and it shapes the answer. | denied categories; denials 0–2 per session | fact (categories); per-command mapping unknown |
| K8 | **low** (not exercised) | **Heavy review can't run.** `review.md` needs a subagent, and `Agent`/`Task` were excluded. Owner confirmation can't happen in one turn. | `--tools`; heavy.md, review.md | fact (config) |

**On the four questions in the task:**

- **Did denials prevent essential steps?** Not essential **skill** steps, as far as the configuration shows: R1–R11 and L1–L6 were all permitted. They did prevent the **repository's** canonical checks (R12, L3), which the fixture's `CLAUDE.md` makes mandatory. Whether a denial blocked a required step in any specific session (R8 in a compound form, for example) is unknown.
- **Did they only prevent redundant checks?** Partly. `xxd`, `echo` and compound commands are redundant (R14, R15). `mise` isn't redundant (R12): nothing permitted replaces it.
- **Did agents correctly declare that they couldn't verify?** "Several R answers said they couldn't run a check" is consistent with honest reporting, but the check isn't named and the answers aren't published. Not verifiable.
- **Can the final validator pass give a false impression of success?** Yes (K1, §5). Exit 0 holds with no verification work at all.

## 7. Recommended minimum permissions (proposal, not applied)

This is a proposal for a future runner or a target repository's settings. Nothing was changed. Each line is the smallest grant that makes the skill's prescribed steps possible. No blanket Bash, no network.

### Light

| Kind | Permissions |
|---|---|
| Indispensable | Read, Glob, Grep; Edit (scoped to the working tree, as `acceptEdits` does); `Bash(git diff:*)`, `Bash(git status:*)` |
| Conditional | The repository's lint command, **only** if it runs offline with its dependencies already present (for example `Bash(bun run validate)` with `node_modules` installed). Otherwise the report must say `not run` or `blocked`. Write and Edit under `tasks/` stay possible only because a light task may escalate (contract §6) |
| Keep denied | `git commit`, `git push`; any network; `rm`; history rewriting; `Bash` file writes (`sed -i` and similar) if the harness needs every edit visible as an Edit call |

### Resume and standard

| Kind | Permissions |
|---|---|
| Indispensable | Read, Glob, Grep, Edit, Write; `Bash(git status:*)`, `Bash(git log:*)`, `Bash(git show:*)`, `Bash(git diff:*)`, `Bash(git rev-parse:*)`, `Bash(git branch:*)`, `Bash(git merge-base:*)`; `Bash(node tools/validate/validate.js)` (the plain command; the current `:*` rule covers it); `Bash(git add:*)`, `Bash(git commit:*)` |
| Conditional | `Bash(bun tools/validate/validate.ts:*)` where `bun` exists. `Bash(git switch -c:*)` only where the repository's `CLAUDE.md` requires a dedicated branch and the session starts on a protected one. `Bash(mise run validate)`, `Bash(mise run test)` only where `mise` and locked dependencies are installed; otherwise those checks are `blocked` by design and the report must say so |
| Keep denied | `git push`, `git reset --hard`, `git rebase`, `git commit --amend`, any `--force` (the contract's history walk depends on unrewritten history, §7.1); network commands; `rm -rf`; `echo`, `xxd` and compound commands (not needed; the Bash tool reports exit status itself) |

### Heavy (not exercised)

| Kind | Permissions |
|---|---|
| Conditional | `Agent` for the fresh-context review in `review.md`, only after owner confirmation |
| Keep denied | Publishing, release, deploy and migration commands: protected actions (contract §5) need their own `approved:` entry |

**No current denial needs to be lifted for the skill's own steps.** The gap is `mise` (R12, an environment and repository-protocol gap) and the evidence (§8), not a missing skill permission.

## 8. Checks to require before declaring success

For a future run or a report that says a `work` session succeeded:

1. **Status, not just exit code.** For standard or resume: the validator exits 0 **and** the record's `status` is the claimed one (`verified` needs `verified_at`, and every AC and V row has `Ref = verified_at`). Exit 0 alone is state B in §5.
2. **Commit exists.** `verified_at` resolves to a commit after the base (`git rev-list <base>..HEAD` is non-empty, and `git cat-file -e <verified_at>` succeeds).
3. **Agent-side evidence.** The stream holds the agent's own validator call, with its result, after its last edit. The runner's post-hoc run is a separate, independent check, not a substitute.
4. **No denial on a required operation.** Any denial matching L2–L6 or R1–R11 makes the session's result `blocked` for that step, not "correct".
5. **Report matches observations.** Every check the answer calls `pass` matches an observed successful tool call. A check that couldn't run (L3, R12) is reported `blocked` or `not run`.
6. **Light specifics.** Routing line present, no `tasks/` or `specs/` paths, a `git diff` call observed, and the lint status stated.
7. **Publish auditable evidence.** Per session, a redacted list of denied commands, each denial's skill step, and whether the agent ran the validator. Without them, K3 stays open.

Artifact correctness ("the file is right") and procedure completion ("the skill's steps ran and were observed") should be reported as two separate results.

## 9. Missing information and the smallest further checks (not started)

| Gap | Smallest check that would close it | Cost |
|---|---|---|
| Which commands were denied, in which session, at which skill step (K3, R8) | Read `WORK_DIR/summary.json` from the earlier task's environment, if it still exists: `result.permission_denials[].cmd` and `tool_calls[].bash` per session. Publish a redacted table | no model calls; needs that environment, which isn't in this container |
| Whether answers reported blocked checks honestly (L7, K2) | From the same file: `answer_head` (first 300 chars) for the 10 R and 10 L sessions | no model calls; same dependency |
| Why 0/10 resume sessions committed or reached `verified` (K4) | Same file: the last tool calls and denials in each R session. If the file is gone: **one** paid R session with the stream kept, no other change | free / one session (about US$0.12 at the earlier median) |
| The full set of Bash commands `acceptEdits` auto-approves in CLI `2.1.296` (K5) | Read the CLI's permission documentation for that version, or one paid session with `--permission-mode default` against the same allow-list | free / one session |
| Whether `Bash(node tools/validate/validate.js:*)` matches the argument-less command | One paid session that issues exactly that command | one session |

None of these was started.

## 10. Observed facts and inferences

**Observed (this audit):**

- The five skill files at `5d38ae3` match the runner's pinned hashes (§2).
- The runner's configuration is as in §3, and CLI `2.1.296`'s help gives the meaning of `--permission-prompts none` quoted there.
- The runner's `--selftest` passes on a scratch clone at `5d38ae3`.
- The probe results in §5.
- The raw session data (`summary.json`, stream-json) is not in the repository or in this container.

**Observed (earlier report, cited, not re-measured):** denial counts per session; the four denied categories; 10/10 `active`, 0/20 commits; `standard.md` loaded in 2/10 R sessions; `resume.md` in 10/10; `sed -i` ran under `acceptEdits`; `mise` not installed in the container; "several R answers said they couldn't run a check".

**Inferred (not measured):**

- `mise` denials came from agents following the fixture's `CLAUDE.md` §6. The command is named nowhere in the skill.
- `echo` and compound denials were attempts to print exit codes or chain checks. That's the usual pattern, but no command text is published.
- The "check" agents said they couldn't run was one of the `mise` checks, rather than the validator. This is plausible, because the validator's plain form was allowed, but unverified.
- The procedure gap (K4) is behavioral rather than permission-driven, because every step it needed was permitted. A denial-triggered stop isn't ruled out.

## 11. Verification of this task

All commands were run in `/home/user/G-Inga-perm-audit`. `bun install --frozen-lockfile` was run first to obtain the dev dependencies; it didn't change any tracked file.

| Check | Base `68799cb` (before editing) | Final (with this report) |
|---|---|---|
| `mise install` / `mise run validate` / `mise run test` | blocked (`which mise` finds nothing) | blocked (`mise install`: `mise: command not found`, exit 127) |
| `bun run validate` | pass (`Overall: pass`) | pass (`Overall: pass`; external links `not run`, network) |
| `bun run typecheck` | pass (exit 0) | pass (exit 0) |
| `bun run test` | pass (77 pass, 0 fail) | pass (77 pass, 0 fail) |
| runner `--selftest` (model-free) | pass | – |
| validator probe, §5 (model-free) | as tabulated | – |
