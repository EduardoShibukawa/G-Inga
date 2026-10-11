# G-Ingá real skill routing validation

**Status:** `proposed`, pre-registered before any paid session. Results are added below the design in a later commit; the design isn't edited after data are seen (amendments go in §6).
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

*Pending.*

## 6. Amendments

*None yet.*
