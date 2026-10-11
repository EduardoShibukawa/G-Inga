# Claude Code host: does the first-turn wording change how auto-selection loads a skill?

**Status:** research note, `proposed`. Not a decision. No ADR, decision-map row, contract or validator changes.
**Task:** `CLAUDE-SKILL-AUTO-ROUTING-FORMULATION`. Claim `refs/heads/task-claims/CLAUDE-SKILL-AUTO-ROUTING-FORMULATION` (`48f5855`). Branch `claude/kind-keller-n0rb9r` (the branch this session was assigned), based on `claude/skill-multiturn-realistic-cache-control` at `15549de`.
**Runner:** [`tools/research/run_claude_skill_auto_routing_formulation.py`](../../tools/research/run_claude_skill_auto_routing_formulation.py). It imports the realistic cache-control runner for the task instances, the stream parser and the body summary, and through it the factorial runner for the skill file, the CLI flags and the session driver.
**Builds on:** [`claude-skill-multiturn-realistic-cache-control.md`](claude-skill-multiturn-realistic-cache-control.md). There, auto-selection needed one extra request exactly when the model called `Skill` and then `Read` in consecutive requests (20/20), and none when both came in one request (4/4). Its §14 proposed varying only the turn-1 wording.

Labels: **Fact (docs)**, **Observed** and **Inference (ours)**, as in the earlier reports.

> **Pre-registration trail.** §1–§4 are committed and pushed before the smoke test. Amendments, if any, go in §5 before the first matrix session. Results start at §6.

## 1. Reservation, overlap and base

- **Protocol.** The repository's convention, as used by the five earlier claims: a ref `refs/heads/task-claims/<TASK>` holding an empty commit over the base, whose message names worker, branch, base and time, created with `--force-with-lease=<ref>:` so the push fails if the ref already exists.
- **Claims on the remote before starting** (2026-10-11T12:36Z): `CLAUDE-HOST-CONTEXT-COST-BASELINE` (`9a1806c`), `CLAUDE-SKILL-INVOCATION-MARGINAL-COST` (`86e59a6`), `CLAUDE-WORK-SKILL-COST-ISOLATION` (`d9824b1`), `CLAUDE-SKILL-MULTITURN-FACTORIAL` (`9e7489e`), `CLAUDE-SKILL-MULTITURN-REALISTIC-CACHE-CONTROL` (`de5bfe4`). All have published reports; the last two remain because their releases failed (their §1). None was changed or removed here.
- **Overlap.** `CLAUDE-SKILL-INVOCATION-MARGINAL-COST` (branch `claude/skill-invocation-marginal-cost`, last push `3e895ce` at 10:53:37Z, about 1 h 43 min before this task) covers a 253-byte skill, single-turn sessions and identical repeated prompts. No branch or claim on the remote varies the turn-1 wording. **No overlap that blocks this task.**
- **Claim.** First pushed as `bbe4918` naming the branch `claude/skill-auto-routing-formulation`. The session is bound to `claude/kind-keller-n0rb9r`, so the claim was replaced, with a lease on `bbe4918`, by `48f5855`, which names the branch actually used. Same claimed-at time (12:37Z).
- **Base and work tree.** `15549de` is on the remote as the tip of `claude/skill-multiturn-realistic-cache-control`. A separate `git worktree` at `/home/user/G-Inga-arf` holds `claude/kind-keller-n0rb9r`, reset onto `15549de`. Before that, the branch only pointed at `main`'s merge commit `130c708` and held no work of its own, so publishing it needs a force-with-lease over `130c708`. No other branch or work tree is touched.

## 2. Design (pre-registered)

### Question and hypothesis

**Primary question:** does the wording of the first user turn materially change the probability that, on the natural-language route, the model loads the skill with `Skill` and `Read` in consecutive requests ("seq") instead of in one request ("par"), and is the difference large enough to change a session's total cost?

**Hypothesis (not an established fact):** semantically equivalent formulations of the same request change the probability that Claude Code selects the skill automatically, calls `Skill` and `Read` sequentially or in parallel, and finishes turn 1 without a separate skill-loading request. Through the request count, that may change cumulative input tokens and cost. No direction is assumed for any formulation.

### Fixed fixture

The S2K skill of the earlier runs, unchanged: `.claude/skills/work/SKILL.md`, 2,134 bytes, sha256 `9013ee9c73e0…`, description "Reconcile a synthetic ledger file and report its checked total.", the same operational core and inert appendix. The same file, location and listing in every session.

### Shared task and formulations

**Common task:** reconcile the instance's ledger (`data/ledger-<tag>.txt`, 10 signed entries) and report its checked total, then answer four follow-up questions about it. The turn-1 request is the only part that varies.

The six formulations, final. `{L}` is replaced by the instance's ledger path. None names `/work`, a skill, a tool or an order of tool calls.

| ID | Kind | Turn 1 |
|---|---|---|
| F1 | direct, goal-oriented (the earlier run's wording, without its `Task:` prefix) | `Reconcile the ledger in {L} and report the checked total.` |
| F2 | deliverable first | `What I need back is a single figure: the checked total of the ledger in {L}, once it has been reconciled.` |
| F3 | problem statement with constraints | `The ledger in {L} has not been reconciled yet. Reconcile it and report the checked total. Constraints: this is read-only, so do not change any file, and keep the reply to a few sentences.` |
| F4 | sequence of objectives | `Two objectives for the ledger in {L}: first, reconcile it; second, report its checked total.` |
| F5 | workflow described, no skill or tool named | `Our routine for a ledger is to add up the signed amounts of all its entries and confirm the result as the checked total. Please do that for {L}.` |
| F6 | natural, less structured | `hey, could you go over {L} and tell me what the ledger comes to once it's reconciled? just need the checked total` |

**Turns 2–5,** identical in every formulation and route (instance data aside), as in the earlier run: (2) `Which entry has the largest absolute amount?` (3) `How many entries are negative, and what do they sum to?` (4) `If entry <ID> were removed, what would the new total be?` (5) `List the IDs of the entries with an amount above <threshold>.`

**Acceptance criteria** (string checks against the instance's known answers, the same for every formulation and route): the total in answer 1; the top ID in answer 2; the negative count (digit or English word) and the negative sum in answer 3; the new total in answer 4; every ID above the threshold in answer 5. The count may now be a word: the earlier run's digit-only check failed correct answers ("Three entries", its §7.5). This is fixed before any run here.

### Routes

- **E (explicit):** turn 1 is `/work <formulation>`.
- **N (natural language):** turn 1 is the formulation exactly as written, with no prefix. The skill is installed and listed, so auto-selection is possible.

### Instances, pairing and order

- **Instances:** 3 per formulation, 18 in all, ids `F1-1` … `F6-3`, each generated deterministically by the earlier runner's generator from (seed `20261013`, id): its own ledger file name, ID prefix, amounts, removed entry and threshold; same structure and difficulty. No instance repeats, so no task-specific content can be reused from cache across pairs.
- **Pair:** E and N on the same instance, back to back.
- **Order:** the 18 pairs run in a seeded random order (seed `20261013`). Which route runs first is balanced: 9 pairs E-first and 9 N-first, assigned at random. The full schedule is printed by `--dry-run` and fixed by the seed.
- **Matrix:** 6 formulations × 3 instances × 2 routes = **36 sessions** of 5 turns.

### Session

As in the earlier run: one `claude -p` process per session with `--input-format stream-json`, five user turns, flags `--model claude-sonnet-5-5 --effort medium --tools Read,Skill --permission-mode manual --permission-prompts none --no-session-persistence --max-budget-usd 0.50`. Raw API bodies are recorded in every session (uniform overhead), and only structural markers from them are kept. Fixture created and removed per session, with hash checks. Prompt caching is left as is.

## 3. Measurements, classification and criteria (pre-registered)

### Per session

Formulation, route, instance id, pair order and position; CLI version and model (from `init`); whether `work` is listed; every main-agent request with its turn and usage (input, cache creation, cache read); every tool call with its turn and the request it came in; five `result` events (per-turn usage, `duration_ms`, cumulative `total_cost_usd`, errors, permission denials); exit code; the five string checks.

Derived: **M1** (request-1 prompt = input + cache creation + cache read, with its cache split); **REQ** (main-agent requests) and requests in turn 1; **CUM** (prompt summed over all requests); output summed over the `result` events; **USD** (last `result`'s `total_cost_usd`, list price); duration; correct turns out of 5.

### Execution path (both routes; primary for N)

From the request and tool events, never from the answers:

1. **seq:** in turn 1, a `Skill` call, and the first `Read` of a data file in a later request.
2. **par:** in turn 1, a `Skill` call and a `Read` in the same request.
3. **other:** the skill reached another way: a `Read` before the `Skill` call, a `Skill` call only after turn 1, or a `Read` of `SKILL.md`.
4. **none:** no `Skill` call and no read of `SKILL.md` in any turn.
5. **inconclusive / failed:** non-zero exit, fewer than 5 `result` events, an error result, or a turn-1 `Skill` call with no `Read` in turn 1.

On the E route the skill is injected by `/work`; E sessions are expected in path 4 (no `Skill` call), and are classified the same way for the record.

### Hypotheses and criteria

| # | Hypothesis | Criterion |
|---|---|---|
| H1 (primary) | The N route's seq share differs between formulations | 6 × 2 table (seq vs. any other path, N sessions). Exact conditional test with fixed margins, chi-square statistic. **Supported** if p < 0.05 and the range of per-formulation seq shares ≥ 2/3. **Supported, depends on one formulation** if that holds but leaving out some single formulation gives p ≥ 0.05. **Not supported** if p ≥ 0.05. **Inconclusive** if more than 2 N sessions are path 5 or any planned pair is missing |
| H1c | Any difference is consistent across instances | Descriptive: path of every N session by formulation and instance index; a formulation counts as consistent if its three instances share a path |
| H2 | The extra request comes with the seq path (replication) | Pairs where N is seq: E − N REQ = −1 and E − N CUM < 0 in ≥ 80%. Pairs where N is par: E − N REQ = 0 in ≥ 80%. Each part evaluated only with ≥ 2 such pairs |
| H3 | Wording changes total cost through the path | Between the formulations with the highest and the lowest N seq share (ties pooled): median N CUM differs by ≥ 5,000 tokens **and** median N USD by ≥ US$0.0015 → **material**; else **not material**. If H1 isn't supported, H3 is reported as descriptive only |
| H4 | Auto-selection happens under every wording | N route, per formulation: paths 1–3 in ≥ 2 of 3 sessions. Descriptive; reported per formulation |
| H5 | Route doesn't change correctness | Per formulation, median correct turns of E and N differ by ≤ 1 |

**Reporting rules.** Counts and shares with exact (Clopper–Pearson) 95% intervals; medians with [min..max]; paired E − N differences per formulation and pooled. First-request overhead (M1) and cumulative impact (CUM, USD) are reported separately; fewer requests isn't treated as lower cost by itself. Thresholds aren't changed after the data are seen.

## 4. Budget, smoke test, reduction and stopping rules (pre-registered)

- **Cap:** US$5.00 list-price estimate for the whole task, smoke included. The runner won't start a session once spent + US$0.50 would pass the budget it's given; the matrix gets 5.00 − smoke spend.
- **Smoke test:** 2 pairs, 5 turns: `F3` on instance `SMK1` (E first) and `F6` on `SMK2` (N first). Used only for the estimate and a pipeline check; not pooled.
- **Reduction rule, fixed now.** c = 1.25 × mean smoke session cost. If 36 · c > 4.50 − smoke spend, apply in order until it fits:
  1. 2 instances per formulation (24 sessions);
  2. formulations F1, F3, F5 and F6 only, with 2 instances (16 sessions).

  If it still doesn't fit, the matrix isn't run and the smoke result is reported. The schedule is drawn in full first and then cut, so a reduction keeps the seeds, ids and orders of the pairs it keeps. Any reduction is recorded as an amendment before the first matrix session.
- **Stop rules:** 2 consecutive sessions with a non-zero exit or fewer than 5 `result` events; a fixture cleanup problem; the budget stop. Nothing is added after the matrix.

## 5. Amendments

### Amendment 1 (after the smoke test, before the matrix)

**Smoke test** (2026-10-11, about 12:41 UTC): 4 sessions, all exit 0 with 5 `result` events, 5/5 correct turns each, CLI `2.1.296`, model `claude-sonnet-5-5`. Session costs: F3/SMK1 E US$0.0454, N US$0.0456; F6/SMK2 N US$0.0501, E US$0.0458. Total **US$0.1870**, mean US$0.04675. Paths: F3 N par (6 requests), F6 N seq (7 requests); both E sessions made no `Skill` call and one `Read`. The pipeline and the classifier produced the expected records.

**Reduction rule applied as registered:** c = 1.25 × 0.04675 = 0.05844. 36 · c = US$2.10 ≤ 4.50 − 0.1870 = US$4.31. **No reduction step applies.** The full 36-session matrix runs with a runner budget of US$4.8130 (5.00 − smoke spend). Nothing else changes. The smoke paths are not pooled with the matrix.

**Correction to §1 (fact, not design).** At push time `claude/kind-keller-n0rb9r` didn't exist on the remote (the `130c708` seen locally was a stale tracking ref). It was created with a lease expecting the ref to be absent; nothing was overwritten.
