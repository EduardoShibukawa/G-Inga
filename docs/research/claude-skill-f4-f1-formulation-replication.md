# Claude Code host: does the "two objectives" wording (F4) make auto-selection load the skill jointly? A paired replication against F1

**Status:** research note, `proposed`. Not a decision. No ADR, decision-map row, contract or validator changes.
**Task:** `CLAUDE-SKILL-F4-F1-FORMULATION-REPLICATION`. Claim `refs/heads/task-claims/CLAUDE-SKILL-F4-F1-FORMULATION-REPLICATION` (`5cbcca0`). Branch `claude/dazzling-albattani-cy6uh2` (the branch this session was assigned), based on `claude/kind-keller-n0rb9r` at `3cbd60f`.
**Runner:** [`tools/research/run_claude_skill_f4_f1_formulation_replication.py`](../../tools/research/run_claude_skill_f4_f1_formulation_replication.py). It imports the earlier formulation runner for the F1 and F4 texts, the string checks and the Clopper–Pearson interval, and through it the realistic cache-control runner (instances, stream parser) and the factorial runner (skill file, CLI flags, fixture, session driver). None of those files is changed.
**Builds on:** [`claude-skill-auto-routing-formulation.md`](claude-skill-auto-routing-formulation.md). There, on the natural-language route, 16/18 sessions loaded the skill sequentially (`Skill` then `Read` in separate requests) and 2/18 jointly; both joint sessions were F4, all three F4 pairs ran natural-language first, and the pre-registered test gave p = 0.118. Its §13 proposed this replication.

Labels: **Fact (docs)**, **Observed** and **Inference (ours)**, as in the earlier reports.

**Run on:** 2026-10-11. Smoke test 13:06–13:07 UTC; matrix sessions started 13:07:42–13:14:25 UTC. Claude Code CLI `2.1.296`, model `claude-sonnet-5-5` (in `init` of all 22 sessions), claude.ai cloud session container (Linux).

> **Pre-registration trail.** §1–§4 were committed and pushed in `c423560` (13:06:22 UTC), before the smoke test, and their design text hasn't been edited since. Amendment 1 (§5) was pushed in `212fbd5` (13:07:36 UTC), after the smoke test and before the first matrix session. Results start at §6. The only later edits to §0–§5 are this header block and the summary below.

## 0. Summary

| Question | Answer in this setup | Status |
|---|---|---|
| Does F4 make joint `Skill(work)` + `Read` loading more likely than F1? | F1 0/10 joint, F4 0/10 joint; all 20 sessions `SEQUENTIAL`. Exact McNemar p = 1.000; difference 0.000, 95% CI [−0.278..+0.278] | **NOT REPLICATED** (pre-registered rule). Not proof of equivalence; a large effect is ruled out |
| Is execution order a confounder? | Order balanced 5/5; 0 joint calls in either stratum and in either position | No order effect to separate here |
| Does formulation change total cost? | Requests identical (7/session). Paired F4 − F1: CUM +233 tokens, USD +0.0008 (medians), p = 0.15 and 0.29 | **Not material** (below 5,000 tokens / US$0.0015) |
| Correctness | 20/20 sessions 5/5 | — |
| Coverage and cost | 10/10 pairs, 20/20 matrix sessions, no deviations; **US$1.0695** (smoke 0.0957 + matrix 0.9738), cap US$3.00 | Measured from the runner's ledgers |

## 1. Reservation, overlap and base

- **Protocol.** The repository's convention (earlier reports' §1): a ref `refs/heads/task-claims/<TASK>` holding an empty commit over the base, whose message names worker, branch, base and time, pushed with `--force-with-lease=<ref>:` so the push fails if the ref already exists.
- **Claims on the remote before starting** (2026-10-11T13:02Z): `CLAUDE-HOST-CONTEXT-COST-BASELINE` (`9a1806c`), `CLAUDE-SKILL-INVOCATION-MARGINAL-COST` (`86e59a6`), `CLAUDE-WORK-SKILL-COST-ISOLATION` (`d9824b1`), `CLAUDE-SKILL-MULTITURN-FACTORIAL` (`9e7489e`), `CLAUDE-SKILL-MULTITURN-REALISTIC-CACHE-CONTROL` (`de5bfe4`), `CLAUDE-SKILL-AUTO-ROUTING-FORMULATION` (`48f5855`). All have published reports; their claims remain because their releases failed. None was changed.
- **Overlap.** No claim or branch on the remote covers an F1/F4 replication. The only related work is the earlier formulation study itself (completed, 3 F4 and 3 F1 natural-language sessions, unbalanced order). Remaining evidence gap: a larger, paired, order-balanced F1/F4 comparison. **No overlap that blocks this task.**
- **Claim.** `5cbcca0` (`claimed-at: 2026-10-11T13:02:38Z`), parent `3cbd60f`, created with a lease expecting the ref to be absent; the push created it.
- **Claim release (after the results commit `d0f6fd0`).** `git push --force-with-lease=refs/heads/task-claims/CLAUDE-SKILL-F4-F1-FORMULATION-REPLICATION:5cbcca0… origin :refs/heads/task-claims/CLAUDE-SKILL-F4-F1-FORMULATION-REPLICATION` failed 6 times (about 13:16–13:17 UTC: immediately, after 2, 4, 8 and 16 s, and once more) with `error: RPC failed; HTTP 403` / `send-pack: unexpected disconnect while reading sideband packet`, as the three earlier tasks' releases did. Pushes to the task branch worked in the same minutes. The claim is **still present at `5cbcca0`** and needs removal by the owner. No other claim was touched, and no other route was tried.
- **Base and work tree.** `3cbd60f` is on the remote as the tip of `claude/kind-keller-n0rb9r`. A separate `git worktree` at `/home/user/G-Inga-f4f1` holds `claude/dazzling-albattani-cy6uh2`, reset onto `3cbd60f`. The branch didn't exist on the remote (`git ls-remote`); the local ref pointed at `main`'s `130c708` with no work of its own. No other branch, work tree or claim is touched.

## 2. Design (pre-registered)

### Question and hypothesis

**Primary question:** on the natural-language route, does F4 (a turn-1 request organized as two explicit objectives) change the probability that Claude Code issues `Skill(work)` and the first data `Read` in the same request, rather than in consecutive requests, compared with F1 (the direct, goal-oriented request)?

**Hypothesis (not an established fact; direction from the earlier run):** F4 raises the share of joint loading. The test is two-sided.

**Not in the comparison:** `/work`. Explicit invocation changes the path (the skill body is injected, no `Skill` call), so every session here is natural-language.

### Fixed fixture and environment

The S2K skill of the earlier runs, unchanged: `.claude/skills/work/SKILL.md`, 2,134 bytes, sha256 `9013ee9c73e0…`. Same CLI flags as the earlier run: one `claude -p` process per session with `--input-format stream-json`, five user turns, `--model claude-sonnet-5-5 --effort medium --tools Read,Skill --permission-mode manual --permission-prompts none --no-session-persistence --max-budget-usd 0.50`. Raw API bodies are recorded in every session (uniform overhead, as before); only structural markers are kept. Fixture created and removed per session, with hash checks. CLI found in the container: `2.1.296`, the version of the earlier run. Prompt caching is left as is.

### Formulations (exact texts, byte-identical to the earlier run)

`{L}` is replaced by the instance's ledger path. Neither names `/work`, a skill, a tool or an order of tool calls.

| ID | Turn 1 | sha256 (template) |
|---|---|---|
| F1 | `Reconcile the ledger in {L} and report the checked total.` | `1b62c0d5a639` |
| F4 | `Two objectives for the ledger in {L}: first, reconcile it; second, report its checked total.` | `ff97c19152c3` |

### Shared task specification

Reconcile the instance's ledger (`data/ledger-<tag>.txt`, 10 signed entries; a notes file sits beside it, as before) and report its checked total, then answer four follow-ups. **Turns 2–5,** identical for F1 and F4 (instance data aside): (2) `Which entry has the largest absolute amount?` (3) `How many entries are negative, and what do they sum to?` (4) `If entry <ID> were removed, what would the new total be?` (5) `List the IDs of the entries with an amount above <threshold>.`

**Completion criteria** (the earlier run's string checks, unchanged, same for F1 and F4): the total in answer 1; the top ID in answer 2; the negative count (digit or English word) and the negative sum in answer 3; the new total in answer 4; every ID above the threshold in answer 5.

### Pairs, instances and order

- **Instances:** 10, ids `RP01` … `RP10`, generated by the earlier generator from (seed `20261015`, id). Each has its own ledger file name, ID prefix, amounts, removed entry and threshold; same structure and difficulty. New ids and seed, so no instance repeats the earlier run's.
- **Pair:** one F1 session and one F4 session on the same instance (same files, same turns 2–5, same instance hash), back to back.
- **Order randomization:** from `random.Random(20261015)`: first a shuffle of `[F1]×5 + [F4]×5` assigned to `RP01..RP10` decides which formulation runs first in each pair; then a shuffle of the pairs decides their execution order. Fixed by the seed; printed by `--dry-run`:

| Run | Pair | Order | Instance hash | Ledger |
|---|---|---|---|---|
| 1 | RP03 | F1-first | `44e6df2de609` | `data/ledger-r73a.txt` |
| 2 | RP01 | F1-first | `4da09bde1a81` | `data/ledger-mq3a.txt` |
| 3 | RP08 | F4-first | `26d328cb5d6f` | `data/ledger-2xjv.txt` |
| 4 | RP02 | F4-first | `705bee9f7a3a` | `data/ledger-u6fk.txt` |
| 5 | RP04 | F1-first | `d99e90d79c66` | `data/ledger-8e8r.txt` |
| 6 | RP06 | F1-first | `2c25b7d6df98` | `data/ledger-khre.txt` |
| 7 | RP05 | F4-first | `ed20a2eff108` | `data/ledger-qmzr.txt` |
| 8 | RP10 | F1-first | `880ec18c18a4` | `data/ledger-96zx.txt` |
| 9 | RP07 | F4-first | `e66e36ebed52` | `data/ledger-tgan.txt` |
| 10 | RP09 | F4-first | `04a5ce88ca15` | `data/ledger-btpb.txt` |

The instance hash covers the files and turns 2–5 (turn 1 differs by formulation by design).

**Matrix:** 10 pairs × 2 formulations = **20 sessions** of 5 turns.

## 3. Measurements, classification and analysis (pre-registered)

### Per session

Formulation, pair ID, instance hash, order stratum and position; CLI version and model (from `init`); whether `work` is listed; every main-agent request with its turn, message id (and API request id when the stream carries one; ids stay local) and usage (input, cache creation, cache read); every tool call with its turn, the skill named and the request it came in; five `result` events (per-turn usage, `duration_ms`, cumulative `total_cost_usd`, errors, permission denials); exit code; the five string checks; protocol deviations.

Derived: **M1** (request-1 prompt = input + cache creation + cache read, with its split); **REQ** and requests in turn 1; **CUM** (prompt summed over all requests, also split into input, cache read and cache creation); output; **USD** (last `result`'s `total_cost_usd`, list price); correct turns out of 5.

### Primary categories (mutually exclusive, from request and tool-call events only)

1. **`INCONCLUSIVE`** (checked first): non-zero exit, fewer than 5 `result` events, an error result, no requests, or a turn-1 `Skill(work)` call with no data `Read` in turn 1.
2. **`NO_SKILL`:** no `Skill` call of any kind and no `Read` of `SKILL.md`.
3. **`OTHER`:** any other observed path: a `Skill` call for another skill, `Skill(work)` only after turn 1, a `Read` of `SKILL.md`, or a data `Read` in an earlier request than `Skill(work)`.
4. **`JOINT_OR_PARALLEL`:** in turn 1, `Skill(work)` and the first data `Read` in the same request.
5. **`SEQUENTIAL`:** in turn 1, `Skill(work)`, then the first data `Read` in a later request.

The runner's `--selftest` checks the classifier on synthetic records of each category.

### Primary comparison

Binary outcome per session: J = 1 if `JOINT_OR_PARALLEL`, 0 for any other category. Paired 2×2 table over complete pairs: a = both joint, b = F4 joint only, c = F1 joint only, d = neither.

- **Test:** exact McNemar, two-sided: binomial(b + c, ½) on the discordant pairs, doubled smaller tail. Statistic reported: b out of b + c, and p.
- **Effect:** p(F4) − p(F1) with a 95% Newcombe paired interval (method 10, Wilson components); per-formulation shares with exact Clopper–Pearson intervals.
- **Power note (inference, ours):** with 10 pairs, p < 0.05 needs at least 6 discordant pairs all in one direction, or 8 vs 1, 9 vs 1, … A non-significant result is not evidence of equivalence.
- **Order:** by design formulation and position are orthogonal (5/5). Reported: b and c within each order stratum (F1-first, F4-first), and a position test (joint in position 1 only vs position 2 only, exact McNemar).
- **Sensitivity (not decisive):** unpaired two-sided Fisher exact test; McNemar restricted to pairs where both sessions are `SEQUENTIAL` or `JOINT_OR_PARALLEL`.

**Verdict rules (fixed now):**

| Verdict | Condition |
|---|---|
| **INCONCLUSIVE (data)** | more than 2 `INCONCLUSIVE` sessions, or fewer than 6 complete pairs |
| **REPLICATED** | McNemar p < 0.05, b > c, **and** b > c within **each** order stratum |
| **INCONCLUSIVE (order)** | McNemar p < 0.05 and b > c, but some order stratum has b ≤ c |
| **REVERSED** | McNemar p < 0.05 and c > b |
| **NOT REPLICATED** | McNemar p ≥ 0.05 (reported with the effect and interval; not proof of no effect) |

Exploratory only: the earlier run's 3 F1 and 3 F4 natural-language sessions are shown beside the new data, never pooled into the test.

### Secondary outcomes (cost)

Per pair F4 − F1, reported separately: M1 (and its cache split), REQ, CUM, CUM input, CUM cache read, CUM cache creation, output, USD. Median [min..max], mean, and an exact paired sign-flip randomization test on the mean (all 2^n sign assignments, two-sided) for each. Also by path combination (for example F4 joint / F1 sequential), so that cache-read variation from an extra request is separated from the behavioral outcome. **Materiality** (the earlier H3 thresholds): |median paired CUM| ≥ 5,000 tokens **and** |median paired USD| ≥ US$0.0015 → material; else not material. Correctness reported per formulation.

## 4. Budget, smoke test, reduction and stopping rules (pre-registered)

- **Cap:** US$3.00 list-price estimate for the whole task, smoke included. The runner won't start a session once spent + US$0.50 (the per-session `--max-budget-usd`) would pass the budget it's given; the matrix gets 3.00 − smoke spend.
- **Smoke test,** run after this pre-registration is pushed: 1 pair, instance `SMK-R1`, F4 first then F1, 5 turns. Used for the cost estimate and a pipeline check only; never pooled.
- **Fit rule.** c = 1.25 × mean smoke session cost. If 20 · c > 2.50 − smoke spend, reduce to 8 pairs, then 6 (`--pairs`), keeping, in execution order, the first half of each order stratum, so the design stays balanced. If 6 pairs don't fit, the matrix isn't run. Any reduction is published as an amendment before the first matrix session.
- **Stop rules:** 2 consecutive sessions with a non-zero exit or fewer than 5 `result` events; a fixture cleanup problem; the budget stop. Nothing is added or rerun after the matrix; definitions and thresholds aren't changed after the data are seen.
- **Privacy:** raw `stream-json`, raw request bodies and `summary.json` (answers, request ids, session metadata) stay outside the repository. The report holds only prompts written for these tasks, aggregates and structural counts.

## 5. Amendments

### Amendment 1 (after the smoke test, before the matrix)

**Smoke test** (2026-10-11, about 13:06–13:07 UTC): 2 sessions on `SMK-R1`, both exit 0 with 5 `result` events, 5/5 correct turns, CLI `2.1.296`, model `claude-sonnet-5-5`, `work` listed, tools `Read` and `Skill`. F4 (position 1): `JOINT_OR_PARALLEL`, 6 requests, US$0.0484. F1 (position 2): `SEQUENTIAL`, 7 requests, US$0.0473. Total **US$0.0957**, mean US$0.04786. Every request carried a message id and an API request id in the stream. The smoke categories are not pooled with the matrix.

**Fit rule applied as registered:** c = 1.25 × 0.04786 = 0.05982; 20 · c = US$1.20 ≤ 2.50 − 0.0957 = US$2.40. **No reduction.** The full 20-session matrix runs with a runner budget of US$2.9043 (3.00 − smoke spend). Nothing else changes.

## 6. Execution and coverage

Reconciled from the runner's `summary.json` ledgers and per-session `stream-json` files:

| Item | Planned | Executed |
|---|---|---|
| Smoke sessions | 2 | 2, each with 5 `result` events, exit 0 |
| Matrix pairs | 10 (5 F1-first, 5 F4-first) | **10**, `RP01`–`RP10`, in the pre-registered order and with the drawn within-pair orders |
| Matrix sessions | 20 | **20**, started 13:07:42–13:14:25 UTC; each exit 0, exactly 5 `result` events, `is_error: false`, 0 permission denials, a raw body for every request |
| Request identifiers | every main-agent request | 140 requests, each with a message id and an API request id (kept local) |
| Missing cells, failures, protocol deviations | — | **none**. No reduction, no stop rule. Fixture clean after every session and empty at the end |

`init` showed CLI `2.1.296`, model `claude-sonnet-5-5`, tools `Read` and `Skill`, and `work` in the skill listing, in all 20 sessions: the same CLI version, model, flags, skill file and task generator as the earlier run.

## 7. Results

M1 = request-1 prompt (input + cache creation + cache read). CUM = prompt summed over all main-agent requests of the 5 turns. REQ = main-agent requests. USD = last `result`'s cumulative `total_cost_usd` (list price). Values are medians with [min..max].

### 7.1 Primary outcome: category by formulation

| Formulation | n | SEQUENTIAL | JOINT_OR_PARALLEL | OTHER | NO_SKILL | INCONCLUSIVE | Joint share [95% Clopper–Pearson] |
|---|---|---|---|---|---|---|---|
| F1 | 10 | 10 | 0 | 0 | 0 | 0 | 0/10 [0.00..0.31] |
| F4 | 10 | 10 | 0 | 0 | 0 | 0 | 0/10 [0.00..0.31] |

Every one of the 20 sessions had the same turn-1 shape: request 1 `Skill(work)`, request 2 `Read` of the ledger, request 3 the answer (3 requests in turn 1, 7 in the session). No session called a tool after turn 1.

### 7.2 Paired table, test and effect

| | F1 joint | F1 not joint |
|---|---|---|
| **F4 joint** | a = 0 | b = 0 |
| **F4 not joint** | c = 0 | d = 10 |

- **Exact McNemar (two-sided):** 0 discordant pairs, b = 0 of 0, **p = 1.000**.
- **Effect:** p(F4) − p(F1) = **0.000**, 95% Newcombe paired interval **[−0.278..+0.278]**.
- **Sensitivity:** unpaired Fisher exact 0/10 vs 0/10, p = 1.000; restricted to pairs with both sessions `SEQUENTIAL`/`JOINT_OR_PARALLEL` (10 pairs), p = 1.000.

### 7.3 Order and position

| Stratum | Pairs | F4 joint | F1 joint | b | c | McNemar p |
|---|---|---|---|---|---|---|
| F1-first | 5 | 0 | 0 | 0 | 0 | 1.000 |
| F4-first | 5 | 0 | 0 | 0 | 0 | 1.000 |

Position: joint in position 1, 0/10; in position 2, 0/10; p = 1.000. With no joint session there is no order effect to separate from formulation in this sample. F4 ran in position 1 in five pairs, the position in which both of the earlier run's F4 joint sessions occurred, and was sequential in all five.

### 7.4 Secondary outcomes: tokens and USD

| Form | M1 | M1 cache read | M1 cache creation | REQ | CUM | CUM cache read | CUM cache creation | CUM uncached input | Output | USD |
|---|---|---|---|---|---|---|---|---|---|---|
| F1 | 9720 [9714..9725] | 3075 [3075..3075] | 6643 [6637..6648] | 7 [7..7] | 77822 [77539..78179] | 69101 [68903..69336] | 8696 [8622..8842] | 14 [14..14] | 662 [569..790] | 0.0483 [0.0471..0.0502] |
| F4 | 9731 [9727..9733] | 3075 [3075..3075] | 6654 [6650..6656] | 7 [7..7] | 78087 [77626..78447] | 69309 [68980..69560] | 8764 [8632..8873] | 14 [14..14] | 699 [583..840] | 0.0490 [0.0473..0.0507] |

**Paired F4 − F1** (10 pairs; median [min..max]; mean; exact sign-flip p):

| Metric | Median [min..max] | Mean | p |
|---|---|---|---|
| M1 | +10.5 [+6..+19] | +11.0 | 0.002 |
| M1 cache read | 0 [0..0] | 0 | 1.000 |
| M1 cache creation | +10.5 [+6..+19] | +11.0 | 0.002 |
| REQ | 0 [0..0] | 0 | 1.000 |
| CUM | +233 [−498..+824] | +201 | 0.150 |
| CUM cache read | +190 [−324..+611] | +156 | 0.125 |
| CUM cache creation | +56 [−174..+213] | +45 | 0.229 |
| CUM uncached input | 0 [0..0] | 0 | 1.000 |
| Output | +51 [−170..+179] | +34 | 0.324 |
| USD | +0.0008 [−0.0024..+0.0027] | +0.0005 | 0.285 |

**Cost materiality (pre-registered):** |median CUM| = 233 < 5,000 and |median USD| = 0.0008 < 0.0015 → **not material**.

How to read it (inference, ours): with the path identical in all 20 sessions, the only systematic token difference is F4's longer turn-1 text (35 more characters): +6 to +19 tokens of cache creation in request 1, which is written to cache and re-read in every later request, consistent with the small positive CUM cache-read difference. Cache *read* in request 1 was 3,075 tokens in all 20 sessions (the shared stable prefix), so there is no cache-hit variation between the arms. The USD spread (±US$0.0027) tracks answer length (output spread ≈ 270 tokens), not the formulation or the path.

### 7.5 Correctness

20/20 sessions passed all five checks (5/5) under both formulations. No check failed.

### 7.6 Exploratory: beside the earlier observations (post hoc, not part of the verdict)

| Source | F1 joint | F4 joint |
|---|---|---|
| Earlier run, N route (3 per formulation) | 0/3 | 2/3 |
| This task's smoke (not pooled) | 0/1 | 1/1 (position 1) |
| This task's matrix | 0/10 | 0/10 |

The earlier F4 cells (2/3) and this matrix (0/10) differ more than chance would usually give (post hoc Fisher p ≈ 0.04, uncorrected). F4 was chosen for replication *because* it was the extreme cell among six, so some regression toward the common rate is expected. Joint loading under F4 did happen again once, in the smoke test, so its rate isn't zero; but across the 14 F4 sessions observed in both tasks it was 3/14, and 0 of the 10 pre-registered ones. Run-to-run variation in the model's tool-call batching (time, serving state) is a possible source; these data can't separate it from chance.

## 8. Verdict against the pre-registered rules

| Rule (§3, unchanged) | Observed | Result |
|---|---|---|
| INCONCLUSIVE (data): > 2 inconclusive sessions or < 6 complete pairs | 0 inconclusive, 10 complete pairs | not triggered |
| REPLICATED / INCONCLUSIVE (order) / REVERSED: McNemar p < 0.05 | p = 1.000 | not met |
| NOT REPLICATED: McNemar p ≥ 0.05 | p = 1.000, effect 0.000 [−0.278..+0.278] | **NOT REPLICATED** |
| Cost materiality | median CUM +233, USD +0.0008 | **not material** |

## 9. Answers

Restricted to this setup (CLI `2.1.296`, `claude-sonnet-5-5`, effort `medium`, the 2 KB synthetic skill).

1. **Did the F1/F4 difference replicate?** No. In 10 matched, order-balanced pairs, F1 and F4 both loaded the skill sequentially every time (0/10 joint each; McNemar p = 1.000). The interval rules out a large effect: an F4 − F1 difference above about +28 percentage points is incompatible with these data at 95%. Smaller effects can't be excluded; this is not proof of equivalence.
2. **Is execution order still a confounder?** Not for this result. The design balanced order (5/5), and neither order produced a joint call (0/5 in each stratum; position 1 vs 2: 0/10 vs 0/10). The earlier run's order confound (all F4 pairs ran natural-language first) can't explain a difference that is absent; equally, these data can't say whether order matters when joint calls do occur.
3. **Does the formulation change total execution cost?** No, not materially. Requests were identical (7 per session). F4 − F1: +233 cumulative prompt tokens (median), +US$0.0008 per 5-turn session, both below the pre-registered thresholds and within the spread from answer length. The one consistent difference is F4's longer turn-1 text (+11 tokens of request-1 cache creation, p = 0.002), which is a property of the wording, not of the tool path.

## 10. Limitations

- One environment, about 7 minutes of runs, one container and account. Not to be generalized to other models, CLI versions, efforts, hosts or real skills.
- One synthetic skill whose description closely matches both wordings.
- 10 pairs: enough to detect a large paired effect (≥ 6 one-directional discordant pairs), not a small one.
- Model sampling isn't controlled; F4 went joint in the smoke test (1/1) and in the earlier run (2/3), and not in the matrix. The rate is low but not zero, and may vary between runs.
- Cache behavior is observed, not controlled; other sessions on the account may share the stable-prefix cache.
- Costs are Claude Code's list-price estimates, not the subscription's charge. String checks only.

## 11. Cost of the experiment

| Phase | Sessions | List-price estimate (USD) |
|---|---|---|
| Smoke | 2 | 0.0957 |
| Matrix | 20 | 0.9738 (F1 0.4842, F4 0.4896) |
| **Total** | **22** | **1.0695** |

Cap US$3.00. Highest session cost US$0.0507. No other paid call was made for this task.

## 12. Validation

Commands actually run, on the final tree, in the work tree:

| Command | Result |
|---|---|
| `mise install`, `mise run validate`, `mise run test` | **not run**: `mise` isn't installed in this container |
| `bun install --frozen-lockfile` | pass |
| `bun run validate` | **pass**: markdown-lint 27 files, 0 issues; local links; mermaid 13 diagrams; decision records 6 ADRs, 8 map rows; artifact checks pass. `external-links` and `artifact-records` not run, by the validator's design |
| `bun run typecheck` | pass (exit 0) |
| `bun run test` | pass: 77 tests, 0 failures |
| `python3 -m py_compile` on the runner | pass (`__pycache__` deleted, not committed) |
| runner `--selftest` | pass (statistics and the five-category classifier on synthetic records) |
| runner `--dry-run`, `--plan smoke --dry-run`, `--analyze` | pass; §2's schedule and hashes and §6–§7's tables come from them |
| fixture clean after every session | pass (runner check, 22/22) |
| no raw data in the repository | pass: raw `stream-json`, request bodies, request ids and `summary.json` stay in the session scratchpad |

## 13. Recommendation and next step (restricted to these data)

- Treat the earlier F4 observation as not replicated. Rewording the request as ordered objectives does not reliably make Claude Code load the skill and read the data in one request; on this fixture the sequential path is the norm under both wordings (sequential in F1 14/14 and F4 11/14 across both tasks, smoke included).
- The extra skill-loading request is a property of auto-selection, not of wording. Where it matters (request count, latency), the earlier reports' finding stands: `/work` removes it reliably.

**Justified next step:** close the wording question for this fixture; no further formulation matrix is warranted by these data. If the low-rate joint path matters, the more informative experiment is a repeated-measures run of a single wording spread over time (several batches), to estimate the base rate of joint loading and its between-batch variation, rather than another formulation comparison.

## 14. Reproducing

```sh
mkdir <empty-fixture-dir-outside-any-repo> <smoke-out> <matrix-out>
python3 tools/research/run_claude_skill_f4_f1_formulation_replication.py --selftest
python3 tools/research/run_claude_skill_f4_f1_formulation_replication.py --dry-run
python3 tools/research/run_claude_skill_f4_f1_formulation_replication.py <fixture> <smoke-out> --plan smoke --raw-bodies
python3 tools/research/run_claude_skill_f4_f1_formulation_replication.py <fixture> <matrix-out> --plan matrix --raw-bodies --budget-usd 2.9043
python3 tools/research/run_claude_skill_f4_f1_formulation_replication.py <fixture> <matrix-out> --analyze
```

Paid calls and a working `claude` login are needed. The output directories hold raw events, request bodies, request ids and answer texts. Keep them local; never commit or publish them.
