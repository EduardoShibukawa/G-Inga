# Claude Code host: `/work` against auto-selection with unique task instances and five turns

**Status:** research note, `proposed`. Not a decision. No ADR, decision-map row, contract or validator changes.
**Task:** `CLAUDE-SKILL-MULTITURN-REALISTIC-CACHE-CONTROL`. Claim `refs/heads/task-claims/CLAUDE-SKILL-MULTITURN-REALISTIC-CACHE-CONTROL` (`de5bfe4`). Branch `claude/skill-multiturn-realistic-cache-control`, based on `claude/eager-maxwell-70c4cb` at `ecc21c8`.
**Runner:** [`tools/research/run_claude_skill_multiturn_realistic_cache_control.py`](../../tools/research/run_claude_skill_multiturn_realistic_cache_control.py). It imports the factorial runner for the skill files, the CLI flags and the session driver.
**Builds on:** [`claude-skill-multiturn-factorial.md`](claude-skill-multiturn-factorial.md), which found that `/work`'s list-price advantage in compatible cells came largely from cross-session caching of the skill body, because each cell repeated an identical prompt (its §8.4).

Labels: **Fact (docs)**, **Observed** and **Inference (ours)**, as in the earlier reports.

**Run on:** 2026-10-11. Smoke test at about 12:04 UTC; matrix sessions started between 12:04:53 and 12:24:56 UTC. Claude Code CLI `2.1.296`, model `claude-sonnet-5-5` (in `init` of all 64 sessions), claude.ai cloud session container (Linux).

> **Pre-registration trail.** §2–§4 were committed and pushed in `2122749` (12:03:07 UTC) before the smoke test, and haven't been edited since. Amendment 1 (§5) was pushed in `0907963` (12:04:45 UTC), after the smoke test and before the first matrix session. Results start at §6.

## 0. Summary

| Question | Answer in this setup | Status |
|---|---|---|
| Does `/work`'s cumulative advantage persist with unique task instances? | **In tokens, yes**, whenever auto-selection loads the skill in a separate request: E − N CUM about −10.3k in 11/11 such pairs. **In USD it persists but is small**: median −US$0.0017 to −US$0.0021 per 5-turn session (−3.5% to −4.3%). The repeated-instance control gave −US$0.0131 at S8K; the difference is cache reuse of `/work`'s body | H1m confirmed; H1 not different at S025 and S2K, **inconclusive** at S8K by its range rule |
| When does auto-selection need an extra request? | Exactly when it calls `Skill` and then `Read` in consecutive requests (20/20 such pairs: −1 request for E). With both in one request it needs none (4/4) | H3 confirmed |
| How does body size change the costs? | First request: +238, +967, +3,533 tokens for E (as in the factorial run). Cumulative: the ≈ −10.3k round-trip saving is the same at all sizes; with no extra request, E − N CUM is −0.3k to +0.5k (4 pairs). Both modes carry the body into every later request | H2, H4a confirmed |
| Do more turns change the first-request/total relation? | The E − N gap is set in turn 1 and then stays constant (turn-5 requests differ by ≈ −100 tokens). With 5 turns instead of 2, the same ≈ −10k saving is 11–14% of N's CUM instead of 20–25% | H4b confirmed; comparison with the factorial run is across runs |
| Does `/work` still lose on an incompatible task? | Yes, 6/6 pairs: +3.4k (S025) and +22.6k (S8K) prompt tokens, +US$0.0058 and +US$0.0201 (+15% and +53%). E also did unrequested work in 6/6 sessions | H5 confirmed |
| Total cost | **US$3.0891** list-price estimate (smoke 0.2082 + matrix 2.8809), cap US$5.00 | Measured from the runner's ledgers |

## 1. Reservation, overlap and base

- **Claims on the remote before starting** (2026-10-11T11:59Z): `CLAUDE-HOST-CONTEXT-COST-BASELINE` (`9a1806c`), `CLAUDE-SKILL-INVOCATION-MARGINAL-COST` (`86e59a6`), `CLAUDE-WORK-SKILL-COST-ISOLATION` (`d9824b1`), `CLAUDE-SKILL-MULTITURN-FACTORIAL` (`9e7489e`). All four are older, completed tasks with published reports. The factorial claim stayed because its release failed (its report, §1). None was changed or removed here.
- **`CLAUDE-SKILL-INVOCATION-MARGINAL-COST`.** Branch `claude/skill-invocation-marginal-cost` at `3e895ce` (10:53:37Z); no push since, about 66 minutes before this task started. Its report covers one 253-byte skill, single-turn sessions and identical prompts repeated three times. It doesn't cover body size, multi-turn sessions or varying task instances. **No overlap that blocks this task**, and it doesn't look active.
- **Claim.** Created with `--force-with-lease=<ref>:` (expects the ref to be absent): an empty commit over `ecc21c8`, with worker, branch, base and time in the message.
- **Base.** `ecc21c8` is on the remote as the tip of `claude/eager-maxwell-70c4cb`, the factorial task's final commit. That branch isn't modified by this task.
- **Claim release (after the results commit `9a9421a`).** `git push --force-with-lease=refs/heads/task-claims/CLAUDE-SKILL-MULTITURN-REALISTIC-CACHE-CONTROL:de5bfe4… origin :refs/heads/task-claims/CLAUDE-SKILL-MULTITURN-REALISTIC-CACHE-CONTROL` failed 4 times (immediately, then after 2, 4 and 8 s) with `send-pack: unexpected disconnect while reading sideband packet` / `fatal: the remote end hung up unexpectedly`, as the factorial task's release did. Pushes to the task branch worked in the same minutes. The claim is **still present at `de5bfe4`** and needs removal by the owner. No other claim was touched, and no other route was tried.
- **Work tree.** A separate `git worktree` at `/home/user/G-Inga-rcc` on the new branch. Other work trees and branches are left as they are.

## 2. Design (pre-registered)

### Question and main hypothesis

The factorial run repeated identical prompts. Under `/work` the skill body sits in request 1 after the task text, so a repeated prompt let later sessions read the body from the cross-session prompt cache. Under natural language, the body arrives after the model's own turn and was written to cache every time. **Main hypothesis (H1):** with a new task instance in every pair, the paired E − N list-price difference in compatible tasks differs from the one with a repeated instance. No direction is assumed.

### Arms

| Arm | Task | Instance per pair | Sizes | Pairs per size | Sessions |
|---|---|---|---|---|---|
| **U-COMPAT** (primary) | compatible | unique | S025, S2K, S8K | 5 | 30 |
| **R-COMPAT** (cache control) | compatible | one instance, `R000`, repeated | S025, S2K, S8K | 3 | 18 |
| **U-INCOMPAT** (negative control) | incompatible | unique | S025, S8K | 3 | 12 |

Total before any reduction: 30 pairs, **60 sessions**. Task length is fixed (short turns, no long-context paragraph): the factorial run showed that length acts mainly through `/work` sending the task text twice. The ambiguous match isn't repeated here.

### Modes and pairing

- **E:** turn 1 is `/work <turn 1>`. **N:** turn 1 is `Task: <turn 1>`; same 6-character prefix length, the skill installed and listed. Turns 2–5 are identical in both.
- A **pair** is E and N on the same task instance, run back to back in a seeded random order. All pairs of all arms are shuffled together (seed `20261012`).

### Skills

The three `SKILL.md` files of the factorial run, unchanged, imported from its runner: S025 343 bytes (`6de2ee4c0b5d`), S2K 2,134 bytes (`9013ee9c73e0`), S8K 8,286 bytes (`06d8e88946c7`). Same frontmatter and operational core; the larger sizes add the inert reference appendix. The skill stays the same for all sessions of a size.

### Task instances

Each instance is generated deterministically from (seed, instance id). The runner's `--instances` prints each instance's file sizes and hashes and the turn hash.

- **Files:** `data/ledger-<tag>.txt` and `data/notes-<tag>.txt`, with a 4-character random tag. The ledger has 10 entries with a 2-letter ID prefix (for example `KF01` to `KF10`) and distinct signed amounts that are multiples of 5 in [−250, +350]. Every ledger has one largest absolute amount and 3 to 7 negative entries; ledgers are 117–121 bytes. The notes are three sentences from one of 16 fixed survey themes (title, the two things counted, a place, the next event); 187–201 bytes. Both files are present in every session.
- **Compatible turns (5):** (1) `Reconcile the ledger in <ledger file> and report the checked total.` (2) `Which entry has the largest absolute amount?` (3) `How many entries are negative, and what do they sum to?` (4) `If entry <ID> were removed, what would the new total be?` (5) `List the IDs of the entries with an amount above <threshold>.` Lengths 74/44/55/56/53 characters before the prefix. The ID and threshold vary by instance. The threshold sits just under the median positive amount.
- **Incompatible turns (5):** (1) `Summarize <notes file> in one sentence.` (2) `Which two words from it best describe its topic?` (3) `What is planned next, according to the notes?` (4) `How many kinds of things were counted?` (5) `Rewrite the first sentence in plain words.`
- **What varies and what doesn't:** file names, IDs, amounts, the removed entry, the threshold and the notes theme vary between instances. The operations, the number of entries, the turn wording and the skill don't. Every U-COMPAT and U-INCOMPAT instance has its own ledger file name and content. The six U-INCOMPAT instances also have six different notes themes.
- **Correctness checks**, computed from the instance's known answers. Compatible: total in answer 1; top ID in answer 2; negative count and sum in answer 3; new total in answer 4; every ID above the threshold in answer 5. Incompatible: the theme's first word in answer 1; non-empty answer 2; the next event's last word in answer 3; "two" or "2" in answer 4; non-empty answer 5.

### Session

Five user turns over one `claude -p` process with `--input-format stream-json` (the factorial driver). Flags: `--model claude-sonnet-5-5 --effort medium --tools Read,Skill --permission-mode manual --permission-prompts none --no-session-persistence --max-budget-usd 0.50`. Raw API bodies are on in every session, so their small overhead is uniform; only structural markers are kept from them. The fixture path is fixed. Prompt caching isn't disabled, and nothing global is changed.

### Natural against artificial cache reuse

- **Natural reuse:** the stable prefix (system prompt, tool definitions, skill listing) is the same in every session and is read from cache in every arm.
- **Artificial reuse:** content after the task text can be reused only when the task text repeats. That's R-COMPAT by design and U-COMPAT never. It's measured as request 1's `cache_creation_input_tokens` and `cache_read_input_tokens` per mode.

## 3. Metrics and hypotheses (pre-registered)

### Metrics

Per request: `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens` and their sum (prompt size), output tokens, turn. Per turn: `result` usage (per turn), `duration_ms`, cumulative `total_cost_usd`. Per session: tool calls by turn and request; the turn of the `Skill` call; whether `Skill` and `Read` came in one request ("par") or in consecutive ones ("seq"); request bodies holding the skill core and appendix markers; the count of turn-1 text in each body.

The reported quantities, kept apart:

1. **Initial context, M1:** prompt size of request 1.
2. **Cumulative input and output:** CUM, the sum of prompt sizes over all requests, and output summed over the five `result` events.
3. **Cache reuse:** cache read and cache creation, for request 1 and summed over the session.
4. **Requests:** REQ, and tool calls.
5. **USD:** the last `result`'s `total_cost_usd` (list price, cumulative).

### Hypotheses and criteria

| # | Hypothesis | Criterion |
|---|---|---|
| H1 | The paired E − N USD in compatible tasks differs between unique and repeated instances | Per size: "different" if \|median ΔUSD(U) − median ΔUSD(R)\| ≥ US$0.003 **and** the per-pair ΔUSD ranges of U and R don't overlap; "not different" if the gap is < US$0.003; otherwise "inconclusive". No direction is assumed |
| H1m | Mechanism: in U, E pays cache creation for the body in request 1; in R, after its first session, it doesn't | At S2K and S8K: median E request-1 cache creation in U minus that in R (R's first E session excluded) ≥ 0.5 × median E − N M1 in U |
| H2 | The first-request premium of `/work` is the factorial run's | median E − N M1 (U) within ±40 tokens of the factorial short COMPAT values: +234 (S025), +963 (S2K), +3,530 (S8K) |
| H3 | N needs an extra request exactly when it calls `Skill` and `Read` in sequence | In COMPAT pairs (U and R): where N is "seq", E − N REQ = −1 and E − N CUM < 0 in ≥ 80%; where N is "par", E − N REQ = 0 in ≥ 80%. Also N calls `Skill` in turn 1 in ≥ 80% of COMPAT sessions |
| H4a | The extra request's cost doesn't grow with the number of turns | U-COMPAT "seq" pairs: median E − N CUM in [−12,000, −8,000] per size with at least 2 such pairs; with fewer, not evaluated |
| H4b | Once both carry the body, later turns don't widen the gap | U-COMPAT pairs where N called `Skill` in turn 1: \|median E − N prompt of the first request of turn 5\| ≤ 300 tokens per size |
| H5 | Explicit invocation still loses on an incompatible task | U-INCOMPAT, per size: E's CUM > N's in ≥ 80% of pairs; E's USD > N's in ≥ 80%; E did unrequested work (read the ledger, or wrote `STATUS: RECONCILED`) in ≥ 50% of E sessions |
| H6 | Mode doesn't change correctness | Per arm × size: median correct turns (out of 5) differ by ≤ 1 between E and N |

**Classification:** *confirmed* if the criterion is met on the planned sample; *not met* if missed, reported with the value, and limits aren't widened; *exploratory* if met only after a reduction step that cut that arm, or if the pattern is outside any criterion; *inconclusive* if within-condition M1 spread exceeds 30 tokens in the cells involved, or if cells are missing.

## 4. Budget, reduction and stopping rules (pre-registered)

- **Cap:** US$5.00 list-price estimate for the whole task, smoke included. The runner won't start a session once spent + US$0.50 would pass the budget it's given. The matrix gets 5.00 − smoke spend, so it stops at about 4.50 in total.
- **Smoke test:** 2 pairs, 5 turns, instances `SMK1` (S025) and `SMK2` (S8K), both compatible. They're used only for the estimate and aren't pooled.
- **Reduction rule, fixed now.** c = 1.25 × the mean smoke-session cost. If 60 · c > 4.50 − smoke spend, apply these steps in order until the projected cost fits:
  1. U-INCOMPAT to S8K only (−6 sessions);
  2. U-COMPAT to 4 pairs per size (−6);
  3. R-COMPAT to 2 pairs per size (−6);
  4. U-COMPAT to 3 pairs per size (−6).

  If it still doesn't fit, the matrix isn't run and the smoke result is reported. The chosen steps are recorded as an amendment before the first matrix session.
- **Stop rules:** 2 consecutive sessions with a non-zero exit or fewer than 5 `result` events; a fixture cleanup problem; the budget stop. Nothing is added after the matrix.

## 5. Amendments

### Amendment 1 (after the smoke test, before the matrix)

**Smoke test** (2026-10-11, about 12:04 UTC): 4 sessions, all exit 0 with 5 `result` events, 5/5 correct turns each. Session costs: S8K N US$0.0585, S8K E US$0.0576, S025 E US$0.0442, S025 N US$0.0480; total **US$0.2082**, mean US$0.05205. N called `Skill` and then `Read` in consecutive requests in both pairs (7 requests against E's 6).

**Reduction rule applied as registered:** c = 1.25 × 0.05205 = 0.0651. 60 · c = US$3.90 ≤ 4.50 − 0.2082 = US$4.29. **No reduction step applies.** The full 60-session matrix runs with a runner budget of US$4.7918 (5.00 − smoke spend). Nothing else changes.

## 6. Execution and coverage

Reconciled from the runner's `summary.json` ledgers and per-session `stream-json` files:

| Item | Planned | Executed |
|---|---|---|
| Smoke sessions | 4 | 4, each with 5 `result` events, exit 0 |
| U-COMPAT pairs (S025, S2K, S8K) | 5 + 5 + 5 | 5 + 5 + 5 |
| R-COMPAT pairs | 3 + 3 + 3 | 3 + 3 + 3 |
| U-INCOMPAT pairs (S025, S8K) | 3 + 3 | 3 + 3 |
| Matrix sessions | 60 | **60**, every one with exactly 5 `result` events, exit 0, `is_error: false`, 0 permission denials, a raw body for every request |
| Missing cells, failures, protocol deviations | — | **none**. No reduction step, no stop rule triggered. The fixture was clean after every session and empty at the end |

`init` showed CLI `2.1.296`, model `claude-sonnet-5-5`, tools `Read` and `Skill`, and `work` in the skill listing, in all 60 sessions. Every pre-registered criterion is evaluated on the full planned sample.

## 7. Results

M1 = request-1 prompt (input + cache creation + cache read). CUM = prompt summed over all requests of the 5 turns. REQ = main-agent requests. Output = summed over the 5 `result` events. USD = last `result`'s cumulative `total_cost_usd` (list price). "Skill turn" = turn of the first `Skill` call per session (0 = none). "Correct" = string checks passed, out of 5 per session (§7.5 on their limits). All values are medians with [min..max].

### 7.1 Per condition

| Arm | Size | Mode | n | M1 | M1 cache read | M1 cache creation | REQ | Tools | CUM | CUM cache read | CUM cache creation | Output | USD | duration_ms | Skill turn | Correct (of 5 per session) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R-COMPAT | S025 | E | 3 | 9975 [9974..9976] | 3617 [3075..3617] | 6357 [6355..6898] | 6 [6..6] | 1 [1..1] | 63271 [63118..63633] | 55918 [55256..56174] | 7447 [7341..7850] | 586 [548..678] | 0.0422 [0.0408..0.0424] | 17811 [17414..18503] | 0,0,0 | 5 [5..5] |
| R-COMPAT | S025 | N | 3 | 9737 [9733..9739] | 3355 [3075..3355] | 6382 [6380..6656] | 7 [7..7] | 2 [2..2] | 73390 [73342..73758] | 65723 [65394..66018] | 7726 [7653..7934] | 601 [585..670] | 0.0442 [0.0431..0.0443] | 21314 [18662..21642] | 1,1,1 | 5 [5..5] |
| R-COMPAT | S2K | E | 3 | 10705 [10701..10707] | 4347 [3075..4347] | 6358 [6356..7624] | 6 [6..6] | 1 [1..1] | 67964 [67178..67979] | 60518 [58524..60525] | 7449 [7427..8642] | 671 [463..704] | 0.0429 [0.0425..0.0451] | 17510 [15555..17605] | 0,0,0 | 5 [5..5] |
| R-COMPAT | S2K | N | 3 | 9734 [9732..9735] | 3355 [3355..3355] | 6377 [6375..6378] | 7 [7..7] | 2 [2..2] | 77760 [77710..77990] | 69378 [69323..69550] | 8373 [8368..8426] | 586 [584..646] | 0.0463 [0.0463..0.0471] | 17849 [17779..20682] | 1,1,1 | 5 [5..5] |
| R-COMPAT | S8K | E | 3 | 13271 [13270..13273] | 6912 [3075..6912] | 6357 [6356..10196] | 6 [6..6] | 1 [1..1] | 83365 [82572..83496] | 75200 [72087..76039] | 7445 [7360..11266] | 677 [463..693] | 0.0443 [0.0416..0.0591] | 18452 [17131..19106] | 0,0,0 | 5 [5..5] |
| R-COMPAT | S8K | N | 3 | 9737 [9733..9739] | 3355 [3355..3355] | 6380 [6376..6382] | 7 [7..7] | 2 [2..2] | 93391 [93029..93841] | 82375 [82112..82684] | 11002 [10903..11143] | 642 [554..798] | 0.0587 [0.0574..0.0608] | 19643 [19419..23076] | 1,1,1 | 5 [5..5] |
| U-COMPAT | S025 | E | 5 | 9975 [9971..9978] | 3075 [3075..3075] | 6898 [6894..6901] | 6 [6..6] | 1 [1..1] | 63289 [62908..63930] | 55386 [54947..55825] | 7920 [7844..8093] | 579 [489..789] | 0.0429 [0.0422..0.0459] | 19291 [16299..27742] | 0,0,0,0,0 | 5 [5..5] |
| U-COMPAT | S025 | N | 5 | 9738 [9737..9741] | 3075 [3075..3075] | 6661 [6660..6664] | 6 [6..7] | 2 [2..2] | 63548 [63387..73442] | 55489 [55431..65497] | 7944 [7931..8047] | 601 [587..738] | 0.0442 [0.0434..0.0451] | 17741 [17439..19258] | 1,1,1,1,1 | 5 [5..5] |
| U-COMPAT | S2K | E | 5 | 10704 [10703..10704] | 3075 [3075..3075] | 7627 [7626..7627] | 6 [6..6] | 1 [1..1] | 67571 [67247..68041] | 58978 [58738..59336] | 8606 [8497..8701] | 554 [470..670] | 0.046 [0.0446..0.0474] | 17610 [16104..24206] | 0,0,0,0,0 | 5 [4..5] |
| U-COMPAT | S2K | N | 5 | 9737 [9733..9741] | 3075 [3075..3075] | 6660 [6656..6664] | 7 [6..7] | 2 [2..2] | 77760 [67448..77929] | 69107 [58489..69231] | 8665 [8639..8947] | 588 [568..879] | 0.0475 [0.0472..0.0505] | 20067 [19174..23802] | 1,1,1,1,1 | 5 [4..5] |
| U-COMPAT | S8K | E | 5 | 13271 [13268..13273] | 3075 [3075..3075] | 10194 [10191..10196] | 6 [6..6] | 1 [1..1] | 82911 [82550..83050] | 71766 [71350..71856] | 11168 [11133..11188] | 556 [454..609] | 0.0573 [0.0565..0.058] | 17538 [16470..18966] | 0,0,0,0,0 | 5 [5..5] |
| U-COMPAT | S8K | N | 5 | 9737 [9734..9739] | 3075 [3075..3075] | 6660 [6657..6662] | 7 [7..7] | 2 [2..2] | 93258 [92980..93448] | 82003 [81800..82144] | 11241 [11166..11290] | 608 [542..684] | 0.0593 [0.0583..0.0601] | 20521 [18266..23516] | 1,1,1,1,1 | 5 [5..5] |
| U-INCOMPAT | S025 | E | 3 | 9958 [9957..9961] | 3075 [3075..3075] | 6881 [6880..6884] | 6 [6..7] | 2 [1..2] | 64235 [63472..74723] | 56212 [55573..66644] | 8011 [7887..8065] | 702 [665..705] | 0.0447 [0.0438..0.046] | 22725 [21176..24321] | 0,0,0 | 4 [4..4] |
| U-INCOMPAT | S025 | N | 3 | 9732 [9727..9732] | 3075 [3075..3075] | 6655 [6650..6655] | 6 [6..6] | 1 [1..1] | 60743 [60702..60786] | 53248 [53223..53291] | 7483 [7467..7483] | 345 [330..370] | 0.0387 [0.0385..0.039] | 15951 [15135..17298] | 0,0,0 | 4 [4..4] |
| U-INCOMPAT | S8K | E | 3 | 13253 [13253..13256] | 3075 [3075..3075] | 10176 [10176..10179] | 6 [6..6] | 1 [1..2] | 83290 [82288..84218] | 72112 [71158..72869] | 11166 [11118..11337] | 646 [432..737] | 0.0584 [0.0559..0.06] | 19831 [18317..19853] | 0,0,0 | 4 [4..5] |
| U-INCOMPAT | S8K | N | 3 | 9729 [9726..9730] | 3075 [3075..3075] | 6652 [6649..6653] | 6 [6..6] | 1 [1..1] | 60678 [60675..60692] | 53207 [53206..53219] | 7460 [7456..7461] | 303 [289..366] | 0.0382 [0.0381..0.0388] | 15929 [15325..17446] | 0,0,0 | 4 [4..4] |

M1 spread within a condition: 1 to 8 tokens in all 16 conditions (criterion for "inconclusive": > 30).

### 7.2 Paired E − N per arm and size

"N shape": N's turn-1 `Skill` and `Read` calls in consecutive requests (seq), in one request (par), or no `Skill` call (-).

| Arm | Size | n | M1 | M1 cache creation | REQ | Tools | CUM | CUM cache creation | Turn-5 first request | Output | USD | N shape (seq/par/-) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R-COMPAT | S025 | 3 | 239 [235..242] | -23 [-27..242] | -1 [-1..-1] | -1 [-1..-1] | -10125 [-10224..-10119] | -279 [-312..-84] | -50 [-84..-17] | 1 [-53..8] | -0.002 [-0.0022..-0.0019] | 3/0/0 |
| R-COMPAT | S2K | 3 | 970 [969..973] | -19 [-22..1249] | -1 [-1..-1] | -1 [-1..-1] | -9781 [-10812..-9746] | -919 [-946..216] | 46 [-223..73] | 87 [-183..118] | -0.0034 [-0.0038..-0.0021] | 3/0/0 |
| R-COMPAT | S8K | 3 | 3534 [3533..3538] | -19 [-24..3814] | -1 [-1..-1] | -1 [-1..-1] | -10026 [-11269..-9533] | -3458 [-3783..264] | -16 [-383..99] | 35 [-335..139] | -0.0131 [-0.0192..0.0004] | 3/0/0 |
| U-COMPAT | S025 | 5 | 238 [233..239] | 238 [233..239] | 0 [-1..0] | -1 [-1..-1] | -259 [-10534..543] | -51 [-156..149] | -91 [-156..149] | -65 [-159..188] | -0.0019 [-0.0022..0.0025] | 2/3/0 |
| U-COMPAT | S2K | 5 | 967 [962..971] | 967 [962..971] | -1 [-1..0] | -1 [-1..-1] | -10248 [-10419..198] | -84 [-341..62] | -98 [-341..9] | -62 [-312..53] | -0.0017 [-0.0044..-0.0004] | 4/1/0 |
| U-COMPAT | S8K | 5 | 3533 [3532..3539] | 3533 [3532..3539] | -1 [-1..-1] | -1 [-1..-1] | -10326 [-10580..-10208] | -81 [-156..22] | -104 [-156..-59] | -75 [-91..-16] | -0.0021 [-0.0026..-0.0014] | 5/0/0 |
| U-INCOMPAT | S025 | 3 | 229 [226..230] | 229 [226..230] | 0 [0..1] | 1 [0..1] | 3449 [2729..14021] | 528 [404..598] | 688 [572..757] | 335 [320..372] | 0.0058 [0.005..0.0075] | 0/0/3 |
| U-INCOMPAT | S8K | 3 | 3524 [3523..3530] | 3524 [3523..3530] | 0 [0..0] | 0 [0..1] | 22598 [21610..23543] | 3705 [3658..3881] | 3864 [3655..4040] | 343 [66..448] | 0.0201 [0.0171..0.022] | 0/0/3 |

### 7.3 Every pair (none excluded)

"E M1 cache creation" is the cache written in E's request 1; it shows when E's body was read from the cross-session cache (≈ 6,356 tokens: the stable part only) and when it was written (≈ 6,898 / 7,626 / 10,194 by size).

| Arm | Size | Rep | Instance | Order | E−N M1 | E−N CUM | E−N REQ | E−N USD | E M1 cache creation | N shape | E correct | N correct |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R-COMPAT | S025 | 1 | R000 | N first | 242 | -10224 | -1 | -0.0019 | 6898 | seq | 5/5 | 5/5 |
| R-COMPAT | S025 | 2 | R000 | N first | 235 | -10125 | -1 | -0.002 | 6355 | seq | 5/5 | 5/5 |
| R-COMPAT | S025 | 3 | R000 | N first | 239 | -10119 | -1 | -0.0022 | 6357 | seq | 5/5 | 5/5 |
| R-COMPAT | S2K | 1 | R000 | E first | 970 | -9781 | -1 | -0.0034 | 6356 | seq | 5/5 | 5/5 |
| R-COMPAT | S2K | 2 | R000 | E first | 973 | -9746 | -1 | -0.0038 | 6358 | seq | 5/5 | 5/5 |
| R-COMPAT | S2K | 3 | R000 | E first | 969 | -10812 | -1 | -0.0021 | 7624 | seq | 5/5 | 5/5 |
| R-COMPAT | S8K | 1 | R000 | N first | 3533 | -11269 | -1 | -0.0192 | 6356 | seq | 5/5 | 5/5 |
| R-COMPAT | S8K | 2 | R000 | E first | 3534 | -10026 | -1 | 0.0004 | 10196 | seq | 5/5 | 5/5 |
| R-COMPAT | S8K | 3 | R000 | N first | 3538 | -9533 | -1 | -0.0131 | 6357 | seq | 5/5 | 5/5 |
| U-COMPAT | S025 | 1 | C-S025-1 | E first | 237 | -10217 | -1 | -0.0019 | 6901 | seq | 5/5 | 5/5 |
| U-COMPAT | S025 | 2 | C-S025-2 | N first | 239 | 543 | 0 | 0.0025 | 6900 | par | 5/5 | 5/5 |
| U-COMPAT | S025 | 3 | C-S025-3 | N first | 238 | -19 | 0 | -0.0009 | 6898 | par | 5/5 | 5/5 |
| U-COMPAT | S025 | 4 | C-S025-4 | N first | 233 | -10534 | -1 | -0.002 | 6894 | seq | 5/5 | 5/5 |
| U-COMPAT | S025 | 5 | C-S025-5 | N first | 238 | -259 | 0 | -0.0022 | 6898 | par | 5/5 | 5/5 |
| U-COMPAT | S2K | 1 | C-S2K-1 | N first | 962 | -10248 | -1 | -0.0017 | 7626 | seq | 5/5 | 5/5 |
| U-COMPAT | S2K | 2 | C-S2K-2 | N first | 971 | -10419 | -1 | -0.0026 | 7627 | seq | 5/5 | 5/5 |
| U-COMPAT | S2K | 3 | C-S2K-3 | E first | 966 | -10305 | -1 | -0.0014 | 7626 | seq | 5/5 | 5/5 |
| U-COMPAT | S2K | 4 | C-S2K-4 | N first | 967 | -9888 | -1 | -0.0004 | 7627 | seq | 4/5 | 4/5 |
| U-COMPAT | S2K | 5 | C-S2K-5 | N first | 968 | 198 | 0 | -0.0044 | 7627 | par | 5/5 | 5/5 |
| U-COMPAT | S8K | 1 | C-S8K-1 | N first | 3539 | -10326 | -1 | -0.0022 | 10196 | seq | 5/5 | 5/5 |
| U-COMPAT | S8K | 2 | C-S8K-2 | N first | 3534 | -10208 | -1 | -0.0014 | 10194 | seq | 5/5 | 5/5 |
| U-COMPAT | S8K | 3 | C-S8K-3 | N first | 3532 | -10264 | -1 | -0.0021 | 10192 | seq | 5/5 | 5/5 |
| U-COMPAT | S8K | 4 | C-S8K-4 | E first | 3532 | -10580 | -1 | -0.0026 | 10194 | seq | 5/5 | 5/5 |
| U-COMPAT | S8K | 5 | C-S8K-5 | E first | 3533 | -10430 | -1 | -0.0018 | 10191 | seq | 5/5 | 5/5 |
| U-INCOMPAT | S025 | 1 | I-S025-1 | N first | 226 | 3449 | 0 | 0.0058 | 6881 | - | 4/5 | 4/5 |
| U-INCOMPAT | S025 | 2 | I-S025-2 | E first | 230 | 14021 | 1 | 0.0075 | 6880 | - | 4/5 | 4/5 |
| U-INCOMPAT | S025 | 3 | I-S025-3 | E first | 229 | 2729 | 0 | 0.005 | 6884 | - | 4/5 | 4/5 |
| U-INCOMPAT | S8K | 1 | I-S8K-1 | E first | 3523 | 22598 | 0 | 0.0201 | 10176 | - | 4/5 | 4/5 |
| U-INCOMPAT | S8K | 2 | I-S8K-2 | N first | 3524 | 23543 | 0 | 0.022 | 10176 | - | 5/5 | 4/5 |
| U-INCOMPAT | S8K | 3 | I-S8K-3 | E first | 3530 | 21610 | 0 | 0.0171 | 10179 | - | 4/5 | 4/5 |

### 7.4 By turn (U-COMPAT, medians)

| Size | Mode | Prompt of each turn's first request, turns 1–5 | Cumulative prompt through turn 1 / 5 | USD through turn 1 / 5 |
|---|---|---|---|---|
| S025 | E | 9,975 · 10,535 · 10,706 · 10,858 · 10,968 | 20,238 / 63,289 | 0.0334 / 0.0429 |
| S025 | N | 9,738 · 10,616 · 10,746 · 10,904 · 11,021 | 20,087 / 63,548 | 0.0342 / 0.0442 |
| S2K | E | 10,704 · 11,269 · 11,409 · 11,545 · 11,658 | 21,702 / 67,571 | 0.0364 / 0.0460 |
| S2K | N | 9,737 · 11,334 · 11,493 · 11,629 · 11,742 | 31,607 / 77,760 | 0.0380 / 0.0475 |
| S8K | E | 13,271 · 13,821 · 13,949 · 14,104 · 14,211 | 26,825 / 82,911 | 0.0468 / 0.0573 |
| S8K | N | 9,737 · 13,938 · 14,056 · 14,210 · 14,318 | 36,736 / 93,258 | 0.0489 / 0.0593 |

Turns 2–5 each took 1 request in every session. Every difference between modes is created in turn 1 and then carried unchanged: the E − N USD gap at S8K is −0.0021 after turn 1 and −0.0020 after turn 5.

### 7.5 Correctness

All E and N sessions of U-COMPAT and R-COMPAT passed 5/5 checks, except pair `C-S2K-4`. There both modes failed check 3 the same way: they wrote "Three entries" and the check looks for the digit. The answers were correct. All 12 U-INCOMPAT sessions failed check 1 except one E session: the check looks for the theme's first word (for example "moorland"), and the summaries paraphrased it. The summaries were correct on reading. These are limits of the string checks, the same for both modes. The checks aren't changed after the fact.

## 8. Hypotheses against the pre-registered criteria

| # | Criterion (§3, unchanged) | Observed | Classification |
|---|---|---|---|
| H1 | per size, "different" if \|median ΔUSD(U) − median ΔUSD(R)\| ≥ US$0.003 and the per-pair ranges don't overlap | S025: −0.0019 vs −0.0020 (gap 0.0001). S2K: −0.0017 vs −0.0034 (gap 0.0017). S8K: −0.0021 vs −0.0131 (gap 0.0110), ranges overlap | S025 and S2K **not different**. S8K **inconclusive**: the gap passes, the range rule fails |
| H1m | at S2K and S8K, median E request-1 cache creation U − R (R's first E session excluded) ≥ 0.5 × median E − N M1 (U) | S2K: 7,627 − 6,357 = **1,270** ≥ 483.5. S8K: 10,194 − 6,356.5 = **3,837.5** ≥ 1,766.5 | **Confirmed** |
| H2 | median E − N M1 (U) within ±40 of +234 / +963 / +3,530 | +238 / +967 / +3,533 | **Confirmed** |
| H3 | COMPAT, seq pairs: E − N REQ = −1 and CUM < 0 in ≥ 80%; par pairs: REQ = 0 in ≥ 80%; N `Skill` in turn 1 ≥ 80% | seq 20/20; par 4/4; `Skill` in turn 1 24/24 | **Confirmed** |
| H4a | U-COMPAT seq pairs: median E − N CUM in [−12,000, −8,000] per size | −10,375.5 (2 pairs), −10,276.5 (4), −10,326 (5) | **Confirmed** |
| H4b | U-COMPAT, N `Skill` in turn 1: \|median E − N turn-5 first request\| ≤ 300 | −91, −98, −104 | **Confirmed** |
| H5 | U-INCOMPAT per size: E CUM > N ≥ 80%; E USD > N ≥ 80%; E unrequested work ≥ 50% | 3/3, 3/3, 3/3 at both sizes | **Confirmed** |
| H6 | per arm × size, median correct turns differ by ≤ 1 between E and N | identical medians in all 8 arm × size cells (5/5, or 4/5 in U-INCOMPAT from the check limit) | **Confirmed** |

**Why H1 is inconclusive at S8K (from the records, exploratory).** The R arm's first E session of each size wrote the body to cache as U's sessions do (E request-1 cache creation 6,898 at S025, 7,624 at S2K, 10,196 at S8K). At S8K that session was in pair 2, and its ΔUSD (+0.0004) is the one value inside U's range. The other two R pairs at S8K, with the body read from cache, gave −0.0192 and −0.0131. U's five pairs gave −0.0026 to −0.0014. So the separation exists only once the cache is warm. The registered rule counts every pair, so the classification stays inconclusive.

## 9. Cache: natural against artificial reuse

**Observed** in request 1 (per-condition table, M1 cache read and creation):

- **Natural reuse** of the stable prefix: request 1's cache read was 3,075 tokens in every U session of both modes, so the system prompt, tools and skill listing were reused across all sessions. The rest of request 1 (≈ 6,650–6,900 tokens, including the account-context block) was written every time in U.
- **Artificial reuse, E only.** In R, after the first E session of a size, E's request-1 cache read rose to 3,617 / 4,347 / 6,912 and cache creation fell to ≈ 6,357 at every size. So the body and the task text that precedes it were read from cache. In U this never happened: E paid 6,898 / 7,627 / 10,194 tokens of cache creation in request 1.
- **N got no artificial reuse in request 1** in either arm: its request 1 holds only the task, and the body comes later. Over the whole session, N's cache creation was about the same in U and R at each size (for example S8K 11,241 vs 11,002), because the body arrives after the model's own variable turn.
- **Effect on USD:** at S8K, E's median session cost was US$0.0573 in U and US$0.0443 in R; N's was 0.0593 and 0.0587. The repeated instance made E about 23% cheaper and left N almost unchanged.

**Inference (ours):** the factorial run's large `/work` USD advantage at 8 KB (−US$0.0159 per 2-turn session) was mostly this artificial reuse. With a new task each time, `/work`'s remaining USD advantage comes from the round trip it avoids, not from caching.

## 10. Answers

Restricted to this setup.

1. **Does the cumulative advantage of `/work` persist on unique tasks?** In tokens, yes, when auto-selection spends a separate request on loading the skill (11 of 15 U-COMPAT pairs; 9 of 9 in R-COMPAT): ≈ −10.3k prompt tokens per session at every size. When it doesn't (4 of 15 U pairs, all at S025 and S2K), the modes are close (−0.3k to +0.5k). In USD it persists but small: −US$0.0017 to −US$0.0021 median per 5-turn session in U (3.5–4.3%), against −US$0.0131 at S8K with the repeated instance.
2. **When does auto-selection need an extra request?** When the model calls `Skill` and `Read` in consecutive requests, 20/20. Here that was 11/15 U-COMPAT pairs and 9/9 R-COMPAT pairs, and 5/5 at S8K. With the factorial run's turn-1 wording, the parallel shape was rarer in short tasks (1/9) than in long ones (7/9). It doesn't depend on body size in a way the model can see before loading.
3. **How does body size change costs?** First request: E pays the body (+238, +967, +3,533 over N). Cumulative: the body enters every later request in both modes once loaded, so CUM grows with size for both (E 63k / 68k / 83k; N seq 73k / 78k / 93k). The round-trip saving doesn't grow with size: the extra request is N's request 1, sent before the body is loaded, so its size (≈ 9.7k) is the same at every size. USD gap in U: about −US$0.002 at every size.
4. **Do turns change the relation?** Yes, proportionally. The E − N gap is created in turn 1 and carried unchanged; later turns add about the same tokens to both. With 5 turns, M1 is ≈ 16% of E's CUM; the ≈ −10k saving is 11–14% of N's CUM, against 20–25% in the factorial run's 2-turn sessions (comparison across runs). The incompatible penalty grows with turns instead, because E carries a body N doesn't: at S8K +22.6k over 5 turns here against +11.0k over 2 turns in the factorial run.
5. **Does `/work` still lose on an incompatible task?** Yes: 6/6 pairs higher in CUM and USD (+15% at S025, +53% at S8K). E sessions put `RECON_7Q4K` in every answer (30/30 turns), wrote `STATUS: RECONCILED` once per session (6/6), and in 3/6 tried to read the skill's default `data/ledger.txt`, which doesn't exist in these instances (tool error). N never called the skill (0/6).
6. **Robust and dependent conclusions.** Robust within this CLI version, model and fixture: the first-request premium (body + duplicated task, spread ≤ 8 tokens), the round-trip mechanism (20/20, 4/4), constant gaps after turn 1, the incompatible penalty. Cache-dependent: the size of any USD advantage (H1, §9). Version-dependent: the request structure behind all of this (command block, duplicated arguments, body placement), seen only in CLI `2.1.296`. Task-dependent: how often the model chooses the sequential shape. That rate moved between this run (11/15) and the factorial run (10/18) with different wording, so it isn't a constant.

## 11. Limitations

- One environment: CLI `2.1.296`, `claude-sonnet-5-5`, effort `medium`, thinking on (inherited budget), `--tools Read,Skill`, one container and account, about 20 minutes. Not to be generalized to other hosts, models or environments.
- One synthetic skill with an inert appendix, and one family of synthetic ledger tasks. Real skills with more instructions may change behavior.
- Cache behavior is observed, not controlled. Unique instances remove the reuse of task-specific content; the stable prefix is still shared, and the provider's cache lifetime and scope are not documented here. Other sessions on the same account may share that cache.
- The R arm's first E session per size is a cold-cache session. That's part of the design (it's how a repeated prompt starts) and makes H1's range rule strict.
- Small samples: 5 pairs per size in U, 3 in R and U-INCOMPAT. The parallel/sequential split in U rests on 4 parallel pairs.
- String checks undercounted correct answers in two places (§7.5).
- Costs are Claude Code's list-price estimates (`costBasis: "list"`), not the subscription's charge.
- Comparisons with the factorial run (§10, items 2 and 4) are across runs, with different wording and turn counts. They're descriptive.

## 12. Cost of the experiment

| Phase | Sessions | List-price estimate (USD) |
|---|---|---|
| Smoke | 4 | 0.2082 |
| Matrix | 60 | 2.8809 |
| **Total** | **64** | **3.0891** |

The cap was US$5.00. The runner checked spent + US$0.50 against US$4.7918 before each matrix session; the highest session cost was US$0.0608. No other paid call was made for this task.

## 13. Validation

Commands actually run, on the final tree, in the work tree:

| Command | Result |
|---|---|
| `mise run validate`, `mise run test` | **not run**: `mise` isn't installed in this container |
| `bun install --frozen-lockfile` | pass (245 packages) |
| `bun run validate` | **pass**: markdown-lint 25 files, 0 issues; local links 337 references in 27 files; mermaid 13 diagrams; decision records 6 ADRs, 8 map rows; artifact checks pass. `external-links` and `artifact-records` not run, by the validator's design |
| `bun run typecheck` | **pass** (exit 0) |
| `bun run test` | **pass**: 77 tests, 0 failures |
| `python3 -m py_compile` on the runner | pass (its `__pycache__` was deleted, not committed) |
| runner `--instances`, `--dry-run`, `--analyze` | pass; §2's sizes and hashes and §7's tables come from them |
| fixture clean after every session | pass (runner check, 64/64) |
| no raw data in the repository | pass: raw `stream-json`, raw bodies and `summary.json` (which holds the answer texts) stay in the session scratchpad. The report holds only fixture texts written for this task, aggregates and structural counts |

## 14. Recommendation (restricted to these data)

- For a compatible task, `/work` was never worse in tokens and was cheaper whenever auto-selection used a separate loading request. In USD with unique tasks, the advantage is about US$0.002 per session, about 4%. That's much smaller than a repeated-prompt benchmark suggests.
- Don't use `/work` for a task the skill doesn't fit. The penalty grows with body size and with the number of turns, and the skill's instructions leak into the work (tags, status lines, reads of its default path).
- To measure skill-invocation costs, use varied task instances. Identical prompts flatter the explicit route through cache reuse.

Not supported: claims about other models, hosts, CLI versions, real skills or G-Ingá's architecture. Nothing here changes a decision.

**Next experiment:** fix the N tool-call shape question directly. With unique instances, vary only the turn-1 wording (short, long, file-first, procedure-first) and count sequential against parallel `Skill`/`Read` calls, since that shape decides the round trip. Also try a skill whose body is real instructions of 2 and 8 KB, not an inert appendix.

## 15. Reproducing

```sh
mkdir <empty-dir-outside-any-repo>
python3 tools/research/run_claude_skill_multiturn_realistic_cache_control.py <fixture> <out> --instances
python3 tools/research/run_claude_skill_multiturn_realistic_cache_control.py <fixture> <smoke-out> --plan smoke --raw-bodies
python3 tools/research/run_claude_skill_multiturn_realistic_cache_control.py <fixture> <out> --plan matrix --raw-bodies --budget-usd 4.7918
python3 tools/research/run_claude_skill_multiturn_realistic_cache_control.py <fixture> <out> --analyze
```

Paid calls, and a working `claude` login, are needed. The output directories hold raw events, request bodies with session metadata and the account-context block, and answer texts. Keep them local; never commit or publish them.
