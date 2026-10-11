# Claude Code host: does the first-turn wording change how auto-selection loads a skill?

**Status:** research note, `proposed`. Not a decision. No ADR, decision-map row, contract or validator changes.
**Task:** `CLAUDE-SKILL-AUTO-ROUTING-FORMULATION`. Claim `refs/heads/task-claims/CLAUDE-SKILL-AUTO-ROUTING-FORMULATION` (`48f5855`). Branch `claude/kind-keller-n0rb9r` (the branch this session was assigned), based on `claude/skill-multiturn-realistic-cache-control` at `15549de`.
**Runner:** [`tools/research/run_claude_skill_auto_routing_formulation.py`](../../tools/research/run_claude_skill_auto_routing_formulation.py). It imports the realistic cache-control runner for the task instances, the stream parser and the body summary, and through it the factorial runner for the skill file, the CLI flags and the session driver.
**Builds on:** [`claude-skill-multiturn-realistic-cache-control.md`](claude-skill-multiturn-realistic-cache-control.md). There, auto-selection needed one extra request exactly when the model called `Skill` and then `Read` in consecutive requests (20/20), and none when both came in one request (4/4). Its §14 proposed varying only the turn-1 wording.

Labels: **Fact (docs)**, **Observed** and **Inference (ours)**, as in the earlier reports.

**Run on:** 2026-10-11. Smoke test 12:40:43–12:41:47 UTC; matrix sessions started 12:42:21–12:54:03 UTC. Claude Code CLI `2.1.296`, model `claude-sonnet-5-5` (in `init` of all 40 sessions), claude.ai cloud session container (Linux).

> **Pre-registration trail.** §1–§4 were committed and pushed in `eb34310` (12:40:30 UTC), before the smoke test, and their design text hasn't been edited since. Amendment 1 (§5) was pushed in `0d496f6` (12:42:16 UTC), after the smoke test and before the first matrix session. Results start at §6. The only later edit to §0–§5 is this header block and the summary below.

## 0. Summary

| Question | Answer in this setup | Status |
|---|---|---|
| Does the first-turn wording change how often auto-selection loads the skill in a separate request (seq)? | Five of six wordings gave seq in 3/3 sessions. Only F4 ("Two objectives …: first, …; second, …") differed: par 2/3, seq 1/3. Exact test p = 0.118; without F4 there is no variation at all (p = 1) | H1 **not supported** (p ≥ 0.05). What variation there is rests entirely on one formulation |
| Does auto-selection happen under every wording? | Yes: 18/18 natural-language sessions called `Skill` in turn 1, then read the ledger. No "other", "none" or failed path | H4 met in 6/6 formulations |
| Does seq cost an extra request? | Yes, always: seq pairs E − N REQ = −1 and CUM < 0 in 16/16; par pairs REQ = 0 in 2/2 | H2 confirmed (replicates the earlier run's 20/20 and 4/4) |
| Does the wording change total cost? | In tokens, through the path: N CUM median 78,147 (five all-seq wordings) vs 67,821 (F4), +10,326. In USD, no: +US$0.0004 median (0.0484 vs 0.0480), within output-length variation. The extra request is ≈ 10.7k cache-read tokens, which are cheap | H3 **not material** (descriptive only, since H1 isn't supported) |
| `/work` against auto-selection | E − N per pair, all 18: M1 +977 [+960..+1,003], REQ −1 [−1..0], CUM −10,282 [−11,048..+738], USD −US$0.0025 [−0.0043..+0.0036] | Descriptive |
| Correctness | 36/36 sessions 5/5 | H5 confirmed |
| Total cost | **US$1.9020** list-price estimate (smoke 0.1870 + matrix 1.7150), cap US$5.00 | Measured from the runner's ledgers |

## 1. Reservation, overlap and base

- **Protocol.** The repository's convention, as used by the five earlier claims: a ref `refs/heads/task-claims/<TASK>` holding an empty commit over the base, whose message names worker, branch, base and time, created with `--force-with-lease=<ref>:` so the push fails if the ref already exists.
- **Claims on the remote before starting** (2026-10-11T12:36Z): `CLAUDE-HOST-CONTEXT-COST-BASELINE` (`9a1806c`), `CLAUDE-SKILL-INVOCATION-MARGINAL-COST` (`86e59a6`), `CLAUDE-WORK-SKILL-COST-ISOLATION` (`d9824b1`), `CLAUDE-SKILL-MULTITURN-FACTORIAL` (`9e7489e`), `CLAUDE-SKILL-MULTITURN-REALISTIC-CACHE-CONTROL` (`de5bfe4`). All have published reports; the last two remain because their releases failed (their §1). None was changed or removed here.
- **Overlap.** `CLAUDE-SKILL-INVOCATION-MARGINAL-COST` (branch `claude/skill-invocation-marginal-cost`, last push `3e895ce` at 10:53:37Z, about 1 h 43 min before this task) covers a 253-byte skill, single-turn sessions and identical repeated prompts. No branch or claim on the remote varies the turn-1 wording. **No overlap that blocks this task.**
- **Claim.** First pushed as `bbe4918` naming the branch `claude/skill-auto-routing-formulation`. The session is bound to `claude/kind-keller-n0rb9r`, so the claim was replaced, with a lease on `bbe4918`, by `48f5855`, which names the branch actually used. Same claimed-at time (12:37Z).
- **Claim release (after the results commit `6d25794`).** `git push --force-with-lease=refs/heads/task-claims/CLAUDE-SKILL-AUTO-ROUTING-FORMULATION:48f5855… origin :refs/heads/task-claims/CLAUDE-SKILL-AUTO-ROUTING-FORMULATION` failed 5 times (immediately, then after 2, 4, 8 and 16 s) with `error: RPC failed; HTTP 403` / `send-pack: unexpected disconnect while reading sideband packet`. The two earlier tasks' releases failed the same way. Pushes to the task branch worked in the same minutes. The claim is **still present at `48f5855`** and needs removal by the owner. No other claim was touched, and no other route was tried.
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

## 6. Execution and coverage

Reconciled from the runner's `summary.json` ledgers and per-session `stream-json` files:

| Item | Planned | Executed |
|---|---|---|
| Smoke sessions | 4 | 4, each with 5 `result` events, exit 0 |
| Matrix pairs (6 formulations × 3 instances) | 18 | **18**, coverage F1–F6 × instances 1, 2, 3 |
| Matrix sessions | 36 | **36**, every one with exactly 5 `result` events, exit 0, `is_error: false`, 0 permission denials, a raw body for every request |
| Pair order | 9 E-first, 9 N-first | 9 and 9, as drawn by seed `20261013` |
| Missing cells, failures, protocol deviations | — | **none**. No reduction step, no stop rule. The fixture was clean after every session and empty at the end |

`init` showed CLI `2.1.296`, model `claude-sonnet-5-5`, tools `Read` and `Skill`, and `work` in the skill listing, in all 36 sessions. Every pre-registered criterion is evaluated on the full planned sample.

## 7. Results

M1 = request-1 prompt (input + cache creation + cache read). CUM = prompt summed over all main-agent requests of the 5 turns. REQ = main-agent requests. Output = summed over the 5 `result` events. USD = last `result`'s cumulative `total_cost_usd` (list price). Values are medians with [min..max]. Intervals on shares are exact 95% (Clopper–Pearson).

### 7.1 Execution path by formulation and route

| Formulation | Route | n | seq | par | other | none | inconclusive | seq share [95% CI] |
|---|---|---|---|---|---|---|---|---|
| F1 direct | N | 3 | 3 | 0 | 0 | 0 | 0 | 3/3 [0.29..1.00] |
| F2 deliverable | N | 3 | 3 | 0 | 0 | 0 | 0 | 3/3 [0.29..1.00] |
| F3 constraints | N | 3 | 3 | 0 | 0 | 0 | 0 | 3/3 [0.29..1.00] |
| F4 objectives | N | 3 | 1 | 2 | 0 | 0 | 0 | 1/3 [0.01..0.91] |
| F5 workflow | N | 3 | 3 | 0 | 0 | 0 | 0 | 3/3 [0.29..1.00] |
| F6 casual | N | 3 | 3 | 0 | 0 | 0 | 0 | 3/3 [0.29..1.00] |
| **All** | N | 18 | 16 | 2 | 0 | 0 | 0 | 16/18 [0.65..0.99] |
| **All** | E | 18 | 0 | 0 | 0 | 18 | 0 | 0/18 [0.00..0.19] |

Every N session's turn 1 was either request 1 `Skill` → request 2 `Read` → request 3 answer (seq), or request 1 `Skill` + `Read` → request 2 answer (par). Every E session's turn 1 was request 1 `Read` → request 2 answer, with no `Skill` call: `/work` had already put the body in request 1. No session called a tool after turn 1.

**By instance index (H1c):**

| Instance | F1 | F2 | F3 | F4 | F5 | F6 |
|---|---|---|---|---|---|---|
| 1 | seq | seq | seq | seq | seq | seq |
| 2 | seq | seq | seq | par | seq | seq |
| 3 | seq | seq | seq | par | seq | seq |

F1, F2, F3, F5 and F6 were consistent across their three instances (all seq). F4 wasn't.

### 7.2 Per formulation and route

| Form | Route | M1 | M1 cache creation | REQ | CUM | Output | USD | duration_ms |
|---|---|---|---|---|---|---|---|---|
| F1 | E | 10675 [10672..10679] | 7598 [7595..7602] | 6 [6..6] | 67580 [67328..67857] | 628 [547..709] | 0.0467 [0.0455..0.0478] | 17458 [16851..20257] |
| F1 | N | 9710 [9709..9715] | 6633 [6632..6638] | 7 [7..7] | 78252 [77532..78324] | 823 [588..838] | 0.0505 [0.0473..0.0508] | 20814 [18415..21645] |
| F2 | E | 10699 [10698..10700] | 7622 [7621..7623] | 6 [6..6] | 67255 [67183..67356] | 534 [481..586] | 0.0452 [0.0447..0.0460] | 16824 [16187..18360] |
| F2 | N | 9723 [9723..9726] | 6646 [6646..6649] | 7 [7..7] | 77484 [77460..77642] | 559 [550..659] | 0.0469 [0.0469..0.0482] | 18163 [17608..18801] |
| F3 | E | 10759 [10756..10760] | 7682 [7679..7683] | 6 [6..6] | 67528 [67472..67615] | 500 [459..510] | 0.0452 [0.0446..0.0452] | 18135 [16839..18136] |
| F3 | N | 9756 [9753..9758] | 6679 [6676..6681] | 7 [7..7] | 77595 [77520..77662] | 545 [529..588] | 0.0467 [0.0467..0.0475] | 20033 [19873..21362] |
| F4 | E | 10697 [10695..10697] | 7620 [7618..7620] | 6 [6..6] | 67702 [67673..68743] | 612 [605..962] | 0.0465 [0.0465..0.0516] | 17618 [17394..20619] |
| F4 | N | 9723 [9720..9725] | 6646 [6643..6648] | 6 [6..7] | 67821 [66964..77827] | 643 [634..910] | 0.0480 [0.0470..0.0507] | 18840 [18453..19934] |
| F5 | E | 10724 [10721..10728] | 7647 [7644..7651] | 6 [6..6] | 68135 [67372..68337] | 733 [471..827] | 0.0483 [0.0447..0.0497] | 19223 [16643..19738] |
| F5 | N | 9738 [9732..9740] | 6661 [6655..6663] | 7 [7..7] | 78987 [78147..78993] | 907 [653..983] | 0.0520 [0.0484..0.0531] | 21327 [18408..22568] |
| F6 | E | 10705 [10704..10706] | 7628 [7627..7629] | 6 [6..6] | 67520 [67502..67617] | 560 [558..567] | 0.0458 [0.0458..0.0459] | 16904 [16701..17788] |
| F6 | N | 9725 [9721..9729] | 6648 [6644..6652] | 7 [7..7] | 78296 [78269..78665] | 732 [698..780] | 0.0495 [0.0490..0.0502] | 18910 [18318..22097] |

M1 cache read was 3,075 tokens in all 36 sessions (the shared stable prefix). M1 spread within a cell: 2 to 8 tokens.

### 7.3 Paired E − N

| Form | n | M1 | REQ | CUM | Output | USD | N paths |
|---|---|---|---|---|---|---|---|
| F1 | 3 | 962 [960..970] | −1 [−1..−1] | −10395 [−10744..−10204] | −114 [−210..−41] | −0.0027 [−0.0041..−0.0017] | seq, seq, seq |
| F2 | 3 | 976 [972..977] | −1 [−1..−1] | −10277 [−10286..−10229] | −69 [−73..−25] | −0.0022 [−0.0022..−0.0016] | seq, seq, seq |
| F3 | 3 | 1003 [1002..1003] | −1 [−1..−1] | −10048 [−10134..−9980] | −86 [−88..−19] | −0.0021 [−0.0022..−0.0015] | seq, seq, seq |
| F4 | 3 | 974 [970..977] | 0 [−1..0] | −148 [−9084..738] | −38 [−298..328] | −0.0005 [−0.0041..0.0036] | par, seq, par |
| F5 | 3 | 988 [986..989] | −1 [−1..−1] | −10775 [−10852..−10656] | −174 [−182..−156] | −0.0037 [−0.0038..−0.0033] | seq, seq, seq |
| F6 | 3 | 979 [976..985] | −1 [−1..−1] | −10776 [−11048..−10767] | −172 [−213..−140] | −0.0037 [−0.0043..−0.0032] | seq, seq, seq |
| **All** | 18 | 977 [960..1003] | −1 [−1..0] | −10282 [−11048..738] | −101 [−298..328] | −0.0025 [−0.0043..0.0036] | 16 seq, 2 par |

**By N path:** seq pairs (16): REQ −1 in 16/16, CUM −10,341 [−11,048..−9,084], USD −0.0025 [−0.0043..+0.0036]. Par pairs (2): REQ 0 in 2/2, CUM −148 and +738, USD −0.0005 and −0.0041.

M1's E − N gap is the body plus the turn-1 text that `/work` sends twice, so it grows with the formulation's length (F1, 57 characters before the path: +962; F3, 187: +1,003).

### 7.4 Where the USD goes (exploratory, from the same records)

| Path | n | USD after turn 1 | USD in turns 2–5 | Output, all turns | Output, turn 1 |
|---|---|---|---|---|---|
| E | 18 | 0.0362 [0.0354..0.0381] | 0.0096 [0.0088..0.0135] | 564 [459..962] | 329 [249..514] |
| N seq | 16 | 0.0386 [0.0373..0.0402] | 0.0100 [0.0090..0.0133] | 656 [529..983] | 420 [292..551] |
| N par | 2 | 0.0379 [0.0370..0.0388] | 0.0109 [0.0099..0.0119] | 777 [643..910] | 478 [394..561] |

In seq sessions the extra request costs about 10.7k prompt tokens, almost all cache read (request 3 of turn 1: ≈ 10,800 cache read, ≈ 273 cache creation, ≈ 8 output). At list price that is well under US$0.001 of the session; the turn-1 USD of seq and par differs by about US$0.0007. Answer length moves session USD by more than that: the range of N output across sessions is ≈ 450 tokens.

### 7.5 Correctness

36/36 sessions passed all five checks (5/5), in both routes and every formulation. No check failed.

### 7.6 Order

E-first pairs (9): E − N USD −0.0022 [−0.0041..−0.0015]. N-first pairs (9): −0.0027 [−0.0043..+0.0036]. Both par sessions were N-first (position 1 of their pair), as were all three F4 pairs, by the seeded draw. In the smoke test, F3's N session ran second and was par too. Position and formulation can't be separated for F4 in this sample.

## 8. Hypotheses against the pre-registered criteria

| # | Criterion (§3, unchanged) | Observed | Classification |
|---|---|---|---|
| H1 | Exact conditional test of 6 × 2 (seq vs. not, N sessions): supported if p < 0.05 and share range ≥ 2/3 | seq 3, 3, 3, 1, 3, 3 of 3; χ² 11.25; **p = 0.1176**; range 2/3. Leaving out F4: χ² 0, p = 1, range 0. Leaving out any other: p = 0.1429 | **Not supported**. The variation present depends entirely on F4 |
| H1c | Consistency across instances (descriptive) | 5 formulations consistent (all seq); F4 inconsistent (seq, par, par) | Descriptive |
| H2 | seq pairs: REQ = −1 and CUM < 0 in ≥ 80%; par pairs: REQ = 0 in ≥ 80% (each with ≥ 2 pairs) | 16/16; 2/2 | **Confirmed** |
| H3 | Highest vs lowest seq share (ties pooled): median N CUM ≥ 5,000 **and** median N USD ≥ US$0.0015 | F1+F2+F3+F5+F6 (n = 15) vs F4 (n = 3): CUM +10,326; USD +0.0004 | **Not material** (USD part fails). Descriptive only, because H1 isn't supported |
| H4 | Per formulation, N paths 1–3 in ≥ 2 of 3 | 3/3 in every formulation | **Met** in 6/6 |
| H5 | Per formulation, median correct turns of E and N differ by ≤ 1 | 5 vs 5 everywhere | **Confirmed** |

**Note on H1's power (inference, ours).** With 3 sessions per formulation, the test reaches p < 0.05 only when the shares split sharply across several formulations (for example three at 3/3 and three at 0/3 gives p ≈ 0.0004). A single formulation departing from the rest, as F4 did, can't reach it. So "not supported" here means no evidence of a broad wording effect, not evidence of no effect.

## 9. Answers

Restricted to this setup.

1. **Does the first-turn wording change the call ordering?** Not in a way this sample supports. Five of six semantically equivalent wordings (direct, deliverable-first, constraints, workflow-described, casual) produced the sequential `Skill` → `Read` shape in every instance. Only F4, which framed the request as two ordered objectives, produced the parallel shape, in 2 of 3 instances. The pooled sequential share was 16/18 (89%, 95% CI 65–99%). The earlier run, with the F1 wording behind a `Task:` prefix at the same skill size, gave seq in 4/5 U-COMPAT pairs: the same picture.
2. **Is the F4 difference real?** Unknown. It is the only source of variation, it wasn't consistent across F4's own instances, all three F4 pairs ran N-first, and F3 also went parallel once in the smoke test while going sequential 3/3 in the matrix. Parallel loading happens under several wordings at a low rate; whether F4 raises that rate needs more sessions of F4 and of a reference wording.
3. **Does the path change cost?** It always changes the request count (seq +1 request, 16/16; par none, 2/2) and the cumulative prompt (≈ +10.3k tokens). It barely changes list-price USD: the extra request is almost all cache read, so the formulation groups differed by US$0.0004 in median session cost, below the pre-registered US$0.0015 and below the spread from answer length.
4. **First-request overhead against cumulative impact of `/work`.** `/work` adds 960–1,003 tokens to request 1 (body plus the duplicated turn-1 text, longer wordings add more) and removes one request whenever auto-selection would have been sequential. Over 5 turns that nets about −10.3k prompt tokens and −US$0.0025 (median) per session. When auto-selection goes parallel, `/work` is roughly neutral (−0.1k / +0.7k tokens).
5. **How reliable is this?** For the mechanism (seq ⇒ one extra request; `/work` ⇒ never a `Skill` call): high, within this CLI version, model and fixture (16/16, 2/2, 18/18, and 20/20 + 4/4 in the earlier run). For the wording effect: low. Three sessions per formulation, one formulation carrying all the variation, and an order confound for F4.

## 10. Limitations

- One environment: CLI `2.1.296`, `claude-sonnet-5-5`, effort `medium`, `--tools Read,Skill`, one container and account, about 14 minutes of runs. Not to be generalized to other hosts, models, versions or efforts.
- One synthetic 2 KB skill whose description closely matches every wording ("reconcile … ledger … checked total"). Wordings that match the description less closely, or real skills, may route differently.
- Six wordings, 3 instances each. The test can detect only large, broad effects; the F4 result is a single-cell observation.
- Pair order wasn't balanced within formulation (random assignment balanced it only overall); all F4 pairs ran N-first.
- Cache behavior is observed, not controlled. Unique instances prevent reuse of task content; the stable prefix (3,075 tokens) was read from cache in every session. Other sessions on the account may share that cache.
- Model sampling isn't controlled; the shapes may vary between runs of the same prompt (F3: par in the smoke test, seq 3/3 in the matrix).
- Costs are Claude Code's list-price estimates (`costBasis: "list"`), not the subscription's charge.
- String checks only; all passed, so they may be lenient rather than the answers perfect. Answers weren't reviewed by hand.

## 11. Cost of the experiment

| Phase | Sessions | List-price estimate (USD) |
|---|---|---|
| Smoke | 4 | 0.1870 |
| Matrix | 36 | 1.7150 (E 0.8358, N 0.8792) |
| **Total** | **40** | **1.9020** |

The cap was US$5.00. The runner checked spent + US$0.50 against US$4.8130 before each matrix session; the highest session cost was US$0.0531. No other paid call was made for this task.

## 12. Validation

Commands actually run, on the final tree, in the work tree:

| Command | Result |
|---|---|
| `mise install`, `mise run validate`, `mise run test` | **not run**: `mise` isn't installed in this container |
| `bun install --frozen-lockfile` | pass |
| `bun run validate` | **pass**: markdown-lint 26 files, 0 issues; local links 339 references in 28 files; mermaid 13 diagrams; decision records 6 ADRs, 8 map rows; artifact checks pass. `external-links` and `artifact-records` not run, by the validator's design |
| `bun run typecheck` | pass (exit 0) |
| `bun run test` | pass: 77 tests, 0 failures |
| `python3 -m py_compile` on the runner | pass (its `__pycache__` was deleted, not committed) |
| runner `--instances`, `--dry-run`, `--analyze` | pass; §2's hashes and schedule and §7's tables come from them |
| fixture clean after every session | pass (runner check, 40/40) |
| no raw data in the repository | pass: raw `stream-json`, raw bodies and `summary.json` (which hold answer texts and session metadata) stay in the session scratchpad. The report holds only prompts written for this task, aggregates and structural counts |

## 13. Recommendation (restricted to these data)

- Don't rely on rewording a request to avoid the extra skill-loading request: five of six wordings loaded sequentially every time.
- The extra request matters in tokens (≈ 10k per session, ≈ 13% of N's CUM) but little in list-price USD (≈ US$0.002–0.003 per 5-turn session), because it is mostly cache read. Where request count or latency matters more than USD, `/work` removes it reliably; where only USD matters, the choice of route is a small effect.

Not supported: claims about other models, hosts, CLI versions, real skills or G-Ingá's architecture. Nothing here changes a decision.

**Next experiment justified by these data:** a targeted replication of F4 against F1, about 10 natural-language sessions each, with the route order fixed (or N only, since E never varies) and unique instances, to test whether the "ordered objectives" framing raises the parallel rate. A positive result would justify varying the structural element (enumerated steps) separately from the wording; a negative one would close the wording question for this fixture.

## 14. Reproducing

```sh
mkdir <empty-fixture-dir-outside-any-repo> <smoke-out> <matrix-out>
python3 tools/research/run_claude_skill_auto_routing_formulation.py <fixture> <out> --instances --dry-run
python3 tools/research/run_claude_skill_auto_routing_formulation.py <fixture> <smoke-out> --plan smoke --raw-bodies
python3 tools/research/run_claude_skill_auto_routing_formulation.py <fixture> <matrix-out> --plan matrix --raw-bodies --budget-usd 4.8130
python3 tools/research/run_claude_skill_auto_routing_formulation.py <fixture> <matrix-out> --analyze
```

Paid calls and a working `claude` login are needed. The output directories hold raw events, request bodies with session metadata and the account-context block, and answer texts. Keep them local; never commit or publish them.
