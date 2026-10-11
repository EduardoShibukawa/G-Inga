# G-Ingá real skill routing validation

**Status:** `proposed` (research evidence; it changes no decision). Pre-registered in `3d74c07` before any paid session, smoke recorded in `3f5cb13`, results added in §5 afterwards. §1–§3 were not edited after data were seen. There are no amendments.
**Task:** `GINGA-REAL-SKILL-ROUTING-VALIDATION`. Claim `refs/heads/task-claims/GINGA-REAL-SKILL-ROUTING-VALIDATION` (`539540d`). Branch `claude/tender-turing-48un5s`, based on `claude/dazzling-albattani-cy6uh2` at `c5fc539`.
**Runner:** [`tools/research/run_ginga_real_skill_routing_validation.py`](../../tools/research/run_ginga_real_skill_routing_validation.py). It doesn't import or change the earlier runners. It reuses their conventions: the parent-session variable stripping, the stream parser and the budget ledger.

Nothing here changes a decision, ADR, contract, validator or the skill under test.

## 1. Reservation, overlap and base

- **Protocol.** The repository's convention (earlier reports' §1): a ref `refs/heads/task-claims/<TASK>` holding an empty commit over the base, whose message names worker, branch, base and time. It is pushed with `--force-with-lease=<ref>:`, so the push fails if the ref already exists.
- **Claims on the remote before starting** (2026-10-11): `CLAUDE-HOST-CONTEXT-COST-BASELINE`, `CLAUDE-SKILL-INVOCATION-MARGINAL-COST`, `CLAUDE-WORK-SKILL-COST-ISOLATION`, `CLAUDE-SKILL-MULTITURN-FACTORIAL`, `CLAUDE-SKILL-MULTITURN-REALISTIC-CACHE-CONTROL`, `CLAUDE-SKILL-AUTO-ROUTING-FORMULATION`, `CLAUDE-SKILL-F4-F1-FORMULATION-REPLICATION`. None names this task. None was changed.
- **Previous task.** `CLAUDE-SKILL-F4-F1-FORMULATION-REPLICATION` is complete at `c5fc539` (on `claude/dazzling-albattani-cy6uh2`). It is not rerun, and its files are not changed.
- **Overlap.** Every earlier skill study used a **synthetic** `work` skill written into an empty directory (253 B to about 8 KB, with marker tokens or an inert appendix). No claim or branch covers G-Ingá's real skill. No overlap blocks this task.
- **Claim.** `539540d`, parent `c5fc539`, created with a lease that expects the ref to be absent. The push created it.
- **Work tree.** A separate `git worktree` at `/home/user/G-Inga-real-skill` holds this branch. The session's original checkout was detached (no work of its own on it). No other branch, work tree or claim is touched.

## 2. Inventory of real skills

Every remote branch was searched for `SKILL.md`, `.claude/`, `skills/` and `commands/` paths (`git ls-tree -r` on all 27 remote branch heads). Research runners and their synthetic fixtures were excluded: they are written at run time and never committed as skills.

**Exactly one operational skill exists:** `work`, in `.claude/skills/work/` on `feat/v1-work-self-hosting` at `5d38ae3`. It is the V1 deliverable of child task `2026-10-11-minimal-v1-specification-01-work-skill` (`status: verified`, `verified_at: c8067d8`) under the approved V1 spec. That branch **is not merged into `main`**, so the skill isn't active in the canonical checkout. It is the real product skill, pinned and reproducible, but not yet in daily use.

| File | Bytes | sha256 | Loaded when |
|---|---|---|---|
| `SKILL.md` | 4,280 | `ec32f68ab6f8…ed4de78` | every invocation |
| `standard.md` | 2,155 | `f559bde91812…1b8786` | `standard` tier, and `resume` |
| `heavy.md` | 2,926 | `229528b8f93e…8a8db` | `heavy` tier |
| `resume.md` | 1,410 | `f31768350cd0…b892817` | `resume <task-id>` |
| `review.md` | 1,606 | `8b5abd9e9b75…cb3214` | heavy review |

- **Purpose.** The single entry point for changes to deliverables. It routes a request to a ceremony tier (`light`, `standard`, `heavy`) through signals S1–S8 and triggers H1–H6 (ADR 0002), and resumes paused tasks.
- **Instructions the agent uses.** Print a routing line `tier: <tier> (<signals>)`. **light**: inspect, make the minimal edit, run a cheap check, read the diff, report in the contract §6 format, and write nothing under `tasks/` or `specs/`. **standard**: create or read `tasks/<id>.md` (`task/1`), record `B` rows, implement, commit, run the validator, and set `verified`. **heavy**: stop and ask the owner. **resume**: read the record, reconcile `## Checkpoint` with Git, check dependencies and the spec, then continue under `standard.md`.
- **Suitable tasks.** Any change to a deliverable in a G-Ingá-managed repository: prose fixes (light), small tracked changes (standard), multi-session or one-way-door work (heavy), resuming a paused task.
- **Prerequisites and tools.** Git with history (the validator walks it). `node` 22+ or `bun` for `tools/validate/validate.js`, a 267 KB zero-install bundle. Tools: Read, Edit/Write, Bash (git, validator). In the target repository: `CLAUDE.md`'s `<!-- g-inga:pointer -->` block ("Changes to deliverables go through `/work`").
- **Side effects.** Edits files. In `standard`, `heavy` and `resume` it creates or edits task records and commits. It never pushes.
- **Feasibility checks (free).** The validator exits 0 on a full-history clone at `5d38ae3`. On a history-less export it fails (`fail` on the spec, `blocked` on three task records), so each session gets a full-history clone. `node` v22 and CLI `2.1.296` are present.

**Verdict: feasible, with one skill.** The task allows up to two skills, but there is no second real one. Inventing one, or changing `work`, is out of scope. Two classes of task instead exercise **two paths of different size and function** of the same skill. This is a limitation, not two independent skills.

## 3. Design (pre-registered)

### Question and hypotheses

**Primary question:** with the real `work` skill, real repository context and real tasks, do the synthetic findings hold? The synthetic findings were: explicit `/work` injects the body with no `Skill` call; natural language loads it through a `Skill` call in an extra request; and E saves about 10k cumulative prompt tokens but only a little money.

- **H1 (auto-selection), measured:** in N, the share of sessions that call `Skill(work)`. "Reliable" if ≥ 4/5 per class, "unreliable" if ≤ 2/5, otherwise "mixed". Reported with a Clopper–Pearson 95% interval.
- **H2 (cost direction), two-sided:** paired N − E cumulative prompt (CUM). **Replicated** if the median paired CUM > 0, ≥ 4/5 pairs are positive and the median paired USD > 0. **Not replicated** if the median CUM ≤ 0 or ≤ 2/5 pairs are positive. Otherwise **inconclusive**. Materiality as before: |median CUM| ≥ 5,000 tokens **and** |median USD| ≥ US$0.0015.
- **H3 (mechanism):** E sessions have no `Skill(work)` call (`EXPLICIT`) in ≥ 4/5 per class, and the skill body appears in E's first request body.
- **H4 (correctness):** correct outcomes per route and class, with no direction assumed.

No hypothesis assumes that fewer requests means lower cost. USD is reported separately from tokens, and cache read, cache creation and uncached input are reported separately.

### Task classes (the skill's paths)

| Class | Path | Skill text loaded | Request (E / N) |
|---|---|---|---|
| **L** (smaller) | `light` | `SKILL.md` (4.3 KB) | `/work Fix the typo "<bad>" in <file>.` / `Fix the typo "<bad>" in <file>.` |
| **R** (larger) | `resume` → `standard` | `SKILL.md` + `resume.md` + `standard.md` (7.8 KB) + a task record | `/work resume <task-id>` / `Resume task <task-id>.` |

`/work <args>` is the supported explicit interface. `disable-model-invocation: false` keeps `work` listed for auto-selection.

**Instances (fixed, data differ per pair):**

- **L**: one real word that occurs once in a real doc is replaced with a misspelling in the fixture-data commit. L1 `docs/principles.md` consensus→concensus; L2 `docs/decision-map.md` dependency→dependancy; L3 `docs/brand-and-roadmap.md` Independent→Independant; L4 `README.md` existing→exsisting; L5 `docs/development.md` deterministic→determinstic. Smoke: `docs/decision-map.md` coexistence→coexistance.
- **R**: the fixture-data commit adds one `status: active`, `tier: standard` task record (valid under the validator). Its `## Checkpoint` says `next: append <line> as the last line of <file>, then verify AC1 and AC2`. Targets: R1 `docs/friction-log.md`, R2 `docs/principles.md`, R3 `docs/development.md`, R4 `docs/decision-map.md`, R5 `README.md`, each with a different line and reference token. Smoke: `docs/friction-log.md`. The exact texts are in the runner.

### Acceptance criteria (objective, checked by the runner on the final work tree)

- **L correct** = the target file is byte-identical to the pristine file at `5d38ae3` **and** no other path differs from the data commit (tracked or untracked). Also reported: anything written under `tasks/` or `specs/` (the light invariant); the `tier: light` routing line in the final answer (skill compliance); commits made.
- **R correct** = the target file's last line is the given line, present once **and** `node tools/validate/validate.js` exits 0 on the final state **and** only the target file and the task record changed **and** the task record changed. Also reported: the record's final `status` and commits made.

### Fixture and environment (constant across routes)

- One fresh clone of `5d38ae3`'s full history per session (from a local bundle, no remote, branch `feat/v1-work-self-hosting`). The five skill hashes are checked before every session. One data commit per instance, with a fixed author and date. The clone is removed after its checks.
- `claude -p --model claude-sonnet-5-5 --effort medium --no-session-persistence --tools Read,Edit,Write,Bash,Glob,Grep,Skill --permission-mode acceptEdits --permission-prompts none --allowedTools <git read/add/commit, the validator, ls/cat/head/tail/wc/grep/date/pwd> --max-budget-usd 0.50`. One user turn per session over `--input-format stream-json`. Other commands are denied without a prompt and counted.
- The model and effort match the earlier studies, so the comparison with the synthetic results is like for like. The fixture's real `CLAUDE.md` (with the pointer block) loads in both routes.
- Child environment: the earlier runners' parent-session variables are removed. In addition, `CLAUDE_ADDITIONAL_DIRECTORIES*` are removed, because the child can now write. User-level skills and plugins are left as they are, so they are constant across routes. The skill count is recorded from `init`. Raw API bodies are on in every session. Only structural markers are kept from them (skill, resume and standard headings, command tag, size).

### Measures

Per session: **M1** (request-1 prompt = input + cache creation + cache read, with its split); **REQ** (main-agent requests); **CUM** (prompt summed over requests, split three ways); **OUT**; **USD** (`total_cost_usd`, list price); tool calls by name and request; Bash calls; permission denials; hook events; subagent requests; `Skill` calls and path category; correctness; changed paths outside the allowed set ("unnecessary work"); commits; wall time.

**Path categories:** E → `EXPLICIT` (no `Skill(work)` call) or `EXPLICIT_PLUS_SKILL`. N → `SKILL_TOOL`, `READ_SKILL_FILE` (read `SKILL.md` without the tool) or `NO_SKILL`.

### Matrix, order and analysis

- 5 pairs per class, 20 sessions in total. L pairs run first, then R pairs. Within each class, the route that goes first is counterbalanced (seed `20261011`: E first in 3 pairs, N first in 2), and position is recorded.
- Per class, paired N − E for M1, REQ, CUM (and its split), OUT, USD, tool calls and Bash calls: per-pair values, median, count positive, and an exact two-sided sign-flip test. **With n = 5 the smallest possible p is 0.0625**, so no test can reach 0.05. Verdicts use the pre-registered count rules above, not p-values.
- Comparison with the synthetic results is qualitative (direction and mechanism). Absolute tokens aren't comparable: the real context and tools differ.

### Budget and stop rules

- **Cap: US$3.00** list-price estimate for the whole task, smoke included. The runner won't start a session once spent + US$0.50 would pass the cap.
- **Smoke:** 2 sessions (`SMK-L` E and `SMK-R` N), not pooled with the matrix. **Amendment trigger:** if smoke spend + 20 × (smoke mean, by class) > US$3.00, an amendment that reduces the R pairs first (never below 3 per class) is published before any matrix session.
- **Stop rules:** 2 consecutive sessions without a `result`, or with a non-zero exit; a fixture or hash problem; the budget stop. Nothing is rerun or added after the matrix.

## 4. Smoke test

Run on 2026-10-11 after the pre-registration commit `3d74c07`. Both sessions exited 0 with a `result` event and were correct. CLI `2.1.296`, model `claude-sonnet-5-5`, permission mode `acceptEdits`, the 7 tools, `work` listed among 36 skills (user-level and plugin skills included, constant across routes), 0 hook events, 0 subagent requests.

| Session | Path | REQ | M1 (input / creation / read) | CUM | USD | Correct | Notes |
|---|---|---|---|---|---|---|---|
| `SMK-L` E | `EXPLICIT` | 3 | 16,308 (2 / 16,306 / 0) | 50,379 | 0.0794 | yes | skill body and `<command-name>` in request 1; `tier: light` line; nothing under `tasks/`/`specs/`; no commit |
| `SMK-R` N | `SKILL_TOOL` | 10 | 14,519 (2 / 8,117 / 6,400) | 190,102 | 0.1149 | yes | `Skill(work)` in request 1, skill body in request 2, `resume.md` in request 3; 1 Bash denial; record left `active`, no commit |

**Total US$0.1943.** Amendment check: 0.1943 + 10 × 0.0794 + 10 × 0.1149 = **US$2.137 ≤ 3.00**, so no amendment. The matrix keeps 5 pairs per class.

Observed, not a protocol change: `acceptEdits` also let `sed -i` (not in the allow-list) run inside the fixture. The edit stayed inside the clone. The R session answered in Portuguese, because the fixture's `CLAUDE.md` says to.

## 5. Results

### Summary

| Question | Measured | Verdict (pre-registered rule) |
|---|---|---|
| H1: does natural language select the real skill? | `Skill(work)` in **5/5 L and 5/5 R** N sessions, always in request 1 (95% CI 0.478–1.0 each). No `READ_SKILL_FILE`, no `NO_SKILL` | **reliable** in both classes |
| H3: does `/work` skip the `Skill` call? | **5/5 L and 5/5 R** `EXPLICIT`. The skill body and `<command-name>` are in request 1 of every E session, and in request 2 of every N session | **holds**, the same mechanism as the synthetic skill |
| H2: does N cost more than E in cumulative prompt? | L: N − E CUM median **+15,671** (3/5 positive), USD median **+US$0.0065** (3/5). R: CUM median **+16,095** (4/5 positive), USD median **+US$0.0030** (4/5) | L **inconclusive**, R **replicated**; median-based materiality: **material** in both |
| H4: correctness | **20/20** correct (L 5/5 + 5/5, R 5/5 + 5/5) | no difference |
| Coverage and cost | 10/10 pairs, 20/20 sessions, no failures, no stop rule, no amendment; **US$2.0363** (smoke 0.1943 + matrix 1.8420), cap US$3.00 | measured from the runner's ledger |

### Per session (matrix)

M1 = request-1 prompt (uncached input / cache creation / cache read). CUM read and CUM creation split CUM. "Den." = permission denials. "Light" = `tier: light` line in the answer. No session changed a path outside the allowed set, made a commit, ran a hook or started a subagent. Every session listed 36 skills.

| Inst. | Route | Pos. | Path | REQ | M1 | CUM | CUM read | CUM creation | OUT | USD | Tools | Bash | Den. | Correct | Light | Record status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L1 | E | 1 | EXPLICIT | 3 | 16,292 (2/9,890/6,400) | 50,395 | 39,402 | 10,987 | 822 | 0.0561 | 4 | 2 | 0 | yes | yes | – |
| L1 | N | 2 | SKILL_TOOL | 4 | 14,509 (2/8,107/6,400) | 66,066 | 54,606 | 11,452 | 1,248 | 0.0638 | 5 | 2 | 1 | yes | yes | – |
| L2 | E | 1 | EXPLICIT | 7 | 16,297 (2/9,895/6,400) | 123,820 | 111,173 | 12,633 | 1,754 | 0.0792 | 8 | 5 | 1 | yes | yes | – |
| L2 | N | 2 | SKILL_TOOL | 7 | 14,510 (2/8,108/6,400) | 118,193 | 106,537 | 11,642 | 1,242 | 0.0697 | 7 | 3 | 1 | yes | yes | – |
| L3 | E | 1 | EXPLICIT | 4 | 16,302 (2/9,900/6,400) | 67,289 | 56,369 | 10,912 | 658 | 0.0559 | 4 | 2 | 0 | yes | yes | – |
| L3 | N | 2 | SKILL_TOOL | 5 | 14,513 (2/8,111/6,400) | 83,098 | 71,853 | 11,235 | 1,025 | 0.0624 | 5 | 2 | 0 | yes | yes | – |
| L4 | N | 1 | SKILL_TOOL | 5 | 14,504 (2/8,102/6,400) | 83,423 | 71,807 | 11,606 | 1,328 | 0.0669 | 6 | 3 | 0 | yes | yes | – |
| L4 | E | 2 | EXPLICIT | 5 | 16,283 (2/9,881/6,400) | 85,587 | 73,933 | 11,644 | 1,335 | 0.0673 | 6 | 4 | 0 | yes | yes | – |
| L5 | N | 1 | SKILL_TOOL | 5 | 14,507 (2/8,105/6,400) | 83,827 | 72,149 | 11,668 | 1,394 | 0.0678 | 6 | 2 | 1 | yes | yes | – |
| L5 | E | 2 | EXPLICIT | 4 | 16,292 (2/9,890/6,400) | 67,788 | 56,665 | 11,115 | 888 | 0.0590 | 4 | 2 | 0 | yes | yes | – |
| R1 | E | 1 | EXPLICIT | 7 | 16,286 (2/9,884/6,400) | 137,051 | 121,467 | 15,570 | 2,898 | 0.1034 | 8 | 2 | 1 | yes | – | active |
| R1 | N | 2 | SKILL_TOOL | 8 | 14,509 (2/8,107/6,400) | 148,739 | 133,232 | 15,491 | 3,107 | 0.1064 | 11 | 4 | 1 | yes | – | active |
| R2 | E | 1 | EXPLICIT | 9 | 16,290 (2/9,888/6,400) | 185,154 | 167,702 | 17,434 | 3,483 | 0.1214 | 13 | 6 | 2 | yes | – | active |
| R2 | N | 2 | SKILL_TOOL | 11 | 14,509 (2/8,107/6,400) | 221,543 | 203,996 | 17,525 | 3,429 | 0.1248 | 16 | 9 | 2 | yes | – | active |
| R3 | N | 1 | SKILL_TOOL | 8 | 14,510 (2/8,108/6,400) | 160,211 | 141,142 | 19,053 | 2,686 | 0.1172 | 8 | 2 | 1 | yes | – | active |
| R3 | E | 2 | EXPLICIT | 8 | 16,282 (2/9,880/6,400) | 174,593 | 153,777 | 20,800 | 3,762 | 0.1362 | 12 | 6 | 2 | yes | – | active |
| R4 | E | 1 | EXPLICIT | 8 | 16,289 (2/9,887/6,400) | 161,195 | 143,770 | 17,409 | 3,229 | 0.1163 | 11 | 5 | 2 | yes | – | active |
| R4 | N | 2 | SKILL_TOOL | 9 | 14,509 (2/8,107/6,400) | 177,290 | 159,914 | 17,358 | 3,309 | 0.1185 | 12 | 4 | 2 | yes | – | active |
| R5 | N | 1 | SKILL_TOOL | 10 | 14,511 (2/8,109/6,400) | 204,731 | 185,737 | 18,974 | 3,888 | 0.1334 | 13 | 5 | 2 | yes | – | active |
| R5 | E | 2 | EXPLICIT | 7 | 16,287 (2/9,885/6,400) | 139,600 | 122,195 | 17,391 | 3,429 | 0.1161 | 12 | 4 | 2 | yes | – | active |

Support files (from request bodies): every R session loaded `resume.md` (E in request 2, N in request 3). `standard.md` was loaded only in R1-E and R5-N.

### Paired N − E

Per pair, in the order of instances 1–5. The sign-flip p is exact and two-sided; with n = 5 its floor is 0.0625.

| Measure | L per pair | L median (pos.) | R per pair | R median (pos.) |
|---|---|---|---|---|
| M1 | −1,783 −1,787 −1,789 −1,779 −1,785 | −1,785 (0/5), p 0.0625 | −1,777 −1,781 −1,772 −1,780 −1,776 | −1,777 (0/5), p 0.0625 |
| REQ | +1 0 +1 0 +1 | +1 (3/5) | +1 +2 0 +1 +3 | +1 (4/5) |
| CUM | +15,671 −5,627 +15,809 −2,164 +16,039 | **+15,671** (3/5), p 0.25 | +11,688 +36,389 −14,382 +16,095 +65,131 | **+16,095** (4/5), p 0.19 |
| CUM cache read | +15,204 −4,636 +15,484 −2,126 +15,484 | +15,204 | +11,765 +36,294 −12,635 +16,144 +63,542 | +16,144 |
| CUM cache creation | +465 −991 +323 −38 +553 | +323 | −79 +91 −1,747 −51 +1,583 | −51 |
| CUM uncached input | +2 0 +2 0 +2 | +2 | +2 +4 0 +2 +6 | +2 |
| OUT | +426 −512 +367 −7 +506 | +367 | +209 −54 −1,076 +80 +459 | +80 |
| USD | +0.0076 −0.0096 +0.0065 −0.0004 +0.0088 | **+0.0065** (3/5), p 0.63 | +0.0030 +0.0035 −0.0190 +0.0022 +0.0173 | **+0.0030** (4/5), p 0.63 |
| Tool calls | +1 −1 +1 0 +2 | +1 | +3 +3 −4 +1 +1 | +1 |

Relative to the E medians (L US$0.0590, R US$0.1163), the median USD differences are about **+11%** (L) and **+2.5%** (R).

### Measured facts

1. **The routing mechanism is identical to the synthetic skill's.** N always called `Skill(work)` in request 1 and received the body in request 2. E never called `Skill`, and its body was in request 1 (10/10 each way). Request 1 is 1,777–1,789 tokens *larger* in E, all as cache creation: that is the injected body plus the command wrapper.
2. **N's extra cost comes from cache reads.** Where N cost more, almost all of the CUM difference is cache read (a whole re-sent prompt per extra request). Cache creation and uncached input barely differ.
3. **Behavior varies more than the routing overhead.** In 2/5 L pairs (L2, L4) and 1/5 R pair (R3), E took as many or more requests than N, with more Bash calls, so N was cheaper. Leaving out N's loading request, the work requests were L E [3, 7, 4, 5, 4] against N [3, 6, 4, 4, 4], and R E [7, 9, 8, 8, 7] against N [7, 10, 7, 8, 9].
4. **No unnecessary changes.** 0/20 sessions touched a path outside the allowed set. 0/10 L sessions wrote under `tasks/` or `specs/`. 0/20 committed. 10/10 L sessions printed the `tier: light` routing line. 10/10 R records stayed `status: active` (no `verified` transition in either route).
5. **Denied commands** (compound commands, `mise`, `xxd`, `echo` outside the allow-list): L E 1, L N 3; R E 9, R N 8. Several R answers said they couldn't run a check, even though the validator then exits 0 on their final state (runner check C2).

### Inferences (not measured directly)

- **The synthetic effect appears with the real skill, in mechanism and in direction, but it is weaker relative to total cost.** Per session, the routing overhead is one extra request carrying a cached prompt of about 14–20k tokens: about +US$0.005 to +US$0.008 when the rest of the session is equal (L1, L3, L5). The synthetic studies found about 10k tokens and US$0.002–0.003, for sessions an order of magnitude cheaper. In real sessions (US$0.06–0.14), the behavioral variance between sessions (±1–3 requests, ±US$0.01–0.02) is as large as or larger than the routing overhead. That is why L is only "inconclusive" under the count rule, even though its median is positive and material.
- **On the larger resume path the overhead is proportionally smaller** (+2.5% median), because the fixed loading request is amortized over 7–11 requests.
- **Choosing between `/work` and natural language is not a correctness question here.** Both routes selected the skill 10/10 and finished 20/20. The saving from `/work` is real but small, and it's dominated by run-to-run variance in how much checking the agent does.

### Limitations

- **One real skill.** The repository has only `work`. The two classes are two paths of the same skill, not two skills. `work` isn't merged into `main`, so this is the pinned deliverable, not a skill in daily use.
- n = 5 pairs per class; no p-value can go below 0.0625. The verdicts rest on the pre-registered count rules.
- The permission allow-list (chosen for isolation) denied some verification commands in both routes. That raised the denials and shaped the R answers. It didn't affect the objective checks, which the runner ran itself.
- R tasks are single-line resumptions written for this test. They exercise `resume.md`, but rarely `standard.md` (2/10), and never `heavy.md`.
- One model (`claude-sonnet-5-5`, effort `medium`), one CLI version (`2.1.296`), one container and account, about 15 minutes of runs. The prompt cache was shared between sessions: request 1 always read 6,400 cached tokens. 36 skills were listed (user-level and plugin skills, constant across routes). USD is Claude Code's list-price estimate, not the real charge.
- The fixture's `CLAUDE.md` asks for Portuguese with the owner, so the R answers were in Portuguese. This was constant across routes.

### Verification of this task

| Check | Result |
|---|---|
| `mise install` | blocked (`mise` not installed in the container; `command not found`) |
| `mise run validate` / `mise run test` | blocked (same reason); the bun equivalents were run instead |
| baseline `bun run validate` / `bun run typecheck` / `bun run test` at `c5fc539` | pass / pass / pass (77 pass, 0 fail) |
| runner `--selftest` (statistics, classifier, plan balance, fixture round trip on 12 instances) | pass |
| final `bun run validate` / `bun run typecheck` / `bun run test` (with this section) | pass / pass / pass (77 pass, 0 fail) |
| runner `--selftest` after the matrix | pass |
| skill hashes checked before every session; fixture clone removed after every session | pass (22/22) |

## 6. Amendments

None.
