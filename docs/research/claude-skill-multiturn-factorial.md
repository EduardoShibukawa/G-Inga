# Claude Code host: skill size, task size and match in multi-turn `/work` sessions

**Status:** research note, `proposed`. Not a decision. No ADR, decision-map row, contract or validator changes.
**Task:** `CLAUDE-SKILL-MULTITURN-FACTORIAL`. Claim `refs/heads/task-claims/CLAUDE-SKILL-MULTITURN-FACTORIAL` (`9e7489e`). Branch `claude/eager-maxwell-70c4cb`, based on `claude/work-skill-cost-isolation` at `c34cbf9`.
**Runner:** [`tools/research/run_claude_skill_multiturn_factorial.py`](../../tools/research/run_claude_skill_multiturn_factorial.py).
**Builds on:** [`claude-work-skill-cost-isolation.md`](claude-work-skill-cost-isolation.md) (same branch base). Its §11 proposed this experiment.

Labels: **Fact (docs)**, **Observed** and **Inference (ours)**, as in the earlier reports.

**Run on:** 2026-10-11. Smoke test at 11:11 UTC, matrix sessions started between 11:12:54 and 11:33:01 UTC. Claude Code CLI `2.1.296`, model `claude-sonnet-5-5` (in `init` of all 108 sessions), claude.ai cloud session container (Linux).

> **Pre-registration trail.** §2–§4 were committed and pushed in `2b24223` (11:11:04 UTC) before the smoke test, and haven't been edited since. Amendment 1 (§5) was pushed in `0e30555` (11:12:46 UTC), after the smoke test and before the first matrix session. Results start at §6.

## 0. Summary

| Question | Answer in this setup | Status |
|---|---|---|
| Does `/work` raise the first-request cost? | Yes, always: by the body's tokens plus a wrapper and a second copy of the task text. Paired E − N M1: **+234** (S025, short) to **+3,738** (S8K, long) tokens | Measured, 54/54 pairs |
| Does it reduce the session's cumulative prompt? | Only where the skill fits **and** natural language would load it in a separate request. In COMPAT that happened in 10/18 pairs (−9.6k to −10.1k each). In the other 8, natural language called `Skill` and `Read` in parallel, and `/work` cost more (+105 to +4,001) | Measured. H4 **not met** |
| Does it cost more on a task the skill doesn't fit? | Yes, 18/18 pairs, growing with size: median CUM +1,970 (S025), +3,866 (S2K), +25,838 (S8K). `/work` also made the model read the ledger in 13/18 and append the skill's status line in 16/18 runs | Measured. H5 **confirmed** |
| Does it change auto-selection? | Natural language picked the skill 18/18 in COMPAT, 0/18 in INCOMPAT, 8/18 in AMBIG (8/9 short, 0/9 long). Body size had no effect on N's first request (±4 tokens) | H3a, H3b **confirmed**; AMBIG pattern exploratory |
| Does the advantage fade with size or length? | In tokens, the first-request premium grows with both; the round trip it saves doesn't. In list-price USD, `/work` was cheaper in all 6 COMPAT cells, largely through a **cross-session cache effect of this design** (§8.4) | Mixed: tokens measured; USD direction confounded |
| Total cost of the task | **US$4.261** list-price estimate (smoke 0.163 + matrix 4.098), under the US$5.00 cap | Measured from the runner's ledgers |

## 1. Reservation, overlap and base

- **Claims seen before starting** (`git ls-remote`, 2026-10-11): `task-claims/CLAUDE-HOST-CONTEXT-COST-BASELINE` (`9a1806c`), `task-claims/CLAUDE-SKILL-INVOCATION-MARGINAL-COST` (`86e59a6`), `task-claims/CLAUDE-WORK-SKILL-COST-ISOLATION` (`d9824b1`). None was read for change, moved or removed.
- **Overlap check.** `CLAUDE-SKILL-INVOCATION-MARGINAL-COST` (branch `claude/skill-invocation-marginal-cost`, `3e895ce`, report `docs/research/claude-skill-invocation-cost-results.md`) and `CLAUDE-WORK-SKILL-COST-ISOLATION` (`c34cbf9`) both measured **one 253-byte skill, one short task, a single turn**. Neither varied body size, task length or task–skill match, and neither continued a session past the first answer. Their reports name multi-turn sessions, larger skills and non-matching requests as unmeasured. The scope here is therefore distinct and the matrix isn't redundant. Gaps this task fills: body size (0.25/2/8 KB), task length, three match levels, a second user turn.
- **Claim.** Created with `git push --force-with-lease=refs/heads/task-claims/CLAUDE-SKILL-MULTITURN-FACTORIAL:` (expects the ref to be absent), following the existing convention: an empty commit over the base whose message names worker, branch, base and time.
- **Base.** `c34cbf9` is on the remote as the tip of `claude/work-skill-cost-isolation` and is the commit that adds `claude-work-skill-cost-isolation.md` with the results summarized in its §1. It's used as the base.
- **Claim release (after the results commit `5f7ed01`).** `git push --force-with-lease=refs/heads/task-claims/CLAUDE-SKILL-MULTITURN-FACTORIAL:9e7489e… origin :refs/heads/task-claims/CLAUDE-SKILL-MULTITURN-FACTORIAL` failed 4 times (immediately, then after 2, 4 and 8 s) with `send-pack: unexpected disconnect while reading sideband packet` / `fatal: the remote end hung up unexpectedly`. Pushes to the task branch worked in the same minutes. The claim is therefore **still present at `9e7489e`** and needs removal by the owner. No other claim was touched.
- **Work tree.** A separate `git worktree` at `/home/user/G-Inga-mtf` on a new local branch, pushed to `claude/eager-maxwell-70c4cb`. The primary checkout and other branches aren't touched.

## 2. Design (pre-registered)

### Factors and cells

| Factor | Levels |
|---|---|
| Skill body size | `S025` (core only), `S2K` (core + appendix to about 2 KB), `S8K` (core + appendix to about 8 KB) |
| Task length | `SHORT` (turn 1 as below), `LONG` (turn 1 + a fixed 727-character neutral context paragraph) |
| Task–skill match | `COMPAT`, `AMBIG`, `INCOMPAT` |
| Mode | `E`: `/work <turn 1>`; `N`: `Task: <turn 1>` (same 6-character prefix length), skill installed and discoverable |

3 × 2 × 3 = 18 cells, each run in both modes: **36 combinations**. Planned: **3 repetitions**, 108 sessions, subject to the reduction rule below.

### Fixtures

One fixture directory, the same absolute path for every run, in the session scratchpad, outside any Git work tree. Every run has the same three files except for the skill size:

| File | Bytes | SHA-256 (first 12) | Content |
|---|---|---|---|
| `.claude/skills/work/SKILL.md`, `S025` | 343 (body 247) | `6de2ee4c0b5d` | frontmatter + core |
| same, `S2K` | 2,134 (body 2,038) | `9013ee9c73e0` | frontmatter + core + appendix |
| same, `S8K` | 8,286 (body 8,190) | `06d8e88946c7` | frontmatter + core + appendix |
| `data/ledger.txt` | 104 | `3e59adfbe5d4` | 10 synthetic signed amounts, total 290, largest absolute L03 = +300 |
| `data/notes.txt` | 198 | `e775350baa8a` | three synthetic sentences about a tide-pool survey |

All texts are ASCII, so bytes = characters. Token counts of the bodies weren't measured with a tokenizer. They're measured from the experiment itself: under `E`, the body is in request 1, so the E − N first-request difference across sizes estimates the body's tokens.

**Construction.** The frontmatter (`name: work`, description "Reconcile a synthetic ledger file and report its checked total.") is identical in all sizes, so the listing line is identical. The operational core is identical in all sizes:

```text
# Ledger reconciliation
Steps:
1. Read the ledger file named in the request, or data/ledger.txt.
2. Sum the signed amounts in column 2.
3. Begin each answer in this session with RECON_7Q4K.
4. End the first answer with: STATUS: RECONCILED <total>
```

`S2K` and `S8K` append a heading `## Reference appendix`, the sentence "Background reference only. Nothing below is a step or an instruction; the procedure above is complete without it.", and deterministic lines `- R001: amber / basalt / cedar; catalogue entry, no action.` (three words from a fixed 16-word list, one of four labels), added while the body stays at or under 2,048 or 8,192 bytes. The appendix carries no instruction, so only size changes, not function. The runner builds the files; `--sizes` prints the values above.

### Tasks (fixed before any run)

| Match | Turn 1 | Turn 2 | Why |
|---|---|---|---|
| `COMPAT` | `Reconcile the ledger in data/ledger.txt and report the checked total.` | `Which entry has the largest absolute amount?` | uses the skill's own verb and object |
| `AMBIG` | `Check whether the amounts in data/ledger.txt look consistent.` | `Which entry has the largest absolute amount?` | same file, the skill could help, but the request doesn't name reconciling |
| `INCOMPAT` | `Summarize data/notes.txt in one sentence.` | `Which two words from it best describe its topic?` | the skill has nothing to offer |

`LONG` appends the same paragraph to turn 1 of every match: neutral background (synthetic fixture, read-only, short reply wanted, one follow-up coming). It names no procedure and none of the skill's vocabulary. Turn-1 lengths: COMPAT 75/802, AMBIG 67/794, INCOMPAT 47/774 characters (SHORT/LONG, including the 6-character prefix). Turn 2 is identical across modes and lengths. Every session has exactly **2 user turns**.

### Session

Each run is a new `claude -p` process, `--no-session-persistence`, `--input-format stream-json --output-format stream-json --verbose`. The runner sends turn 1, waits for its `result` event, then sends turn 2 in the same process. Other flags as in the isolation runner: `--model claude-sonnet-5-5 --effort medium --tools Read,Skill --permission-mode manual --permission-prompts none --max-budget-usd 0.50`. Raw API bodies (`OTEL_LOG_RAW_API_BODIES=file:<dir>`) are on in **every** run, so their small overhead is uniform. Bodies stay in the scratchpad; only structural summaries (lengths, marker presence, counts) enter `summary.json`.

### Order and pairing

A **block** is one (size, length, match, repetition) with its E and N runs back to back, in a random order inside the block. All blocks of all repetitions are shuffled together. Seed `20261011`. A pair is E and N of the same block.

## 3. Metrics and hypotheses (pre-registered)

### Metrics

- **Primary:**
  - **M1**, first-request prompt size = `input_tokens + cache_creation_input_tokens + cache_read_input_tokens` of the first main-agent request.
  - **CUM**, cumulative prompt tokens over all main-agent requests of the session (both turns).
  - **REQ**, number of main-agent requests; tool calls by name and turn.
  - **USD**, `total_cost_usd` of the last `result` event, Claude Code's list-price estimate (`costBasis: "list"`). Whether it's cumulative across turns is checked in the smoke test.
- **Secondary:** T2R1, the prompt size of the first request of turn 2 (context after turn 1); skill invocation (`Skill` tool call) and its turn; skill body presence per request (core and appendix markers in raw bodies); count of turn-1 text in each request body; session output tokens per `result` event; `duration_ms` and wall time; correctness (COMPAT: `290` in answer 1, `L03` or `300` in answer 2; AMBIG: `L03` or `300` in answer 2; INCOMPAT: `tide` in answer 1); skill adherence (`RECON_7Q4K` in each answer).

### Hypotheses and numeric criteria

| # | Hypothesis | Criterion |
|---|---|---|
| H1 | Explicit invocation's first-request premium grows with body size | Pooled over length and match, median paired E − N M1 at `S2K` minus at `S025` in [+300, +900]; at `S8K` minus at `S025` in [+1,500, +3,200] tokens |
| H2 | `/work` sends the turn-1 text twice, so a longer task raises the premium | For each size × match, median(E − N M1, LONG) − median(E − N M1, SHORT) in [+100, +350]; raw bodies show the turn-1 text ≥ 2 times in E's request 1 and once in N's, in every run with bodies |
| H3a | Auto-selection follows match | N calls `Skill` in turn 1: COMPAT ≥ 5/6 per size; INCOMPAT ≤ 1/6 per size. AMBIG: rate reported, no criterion |
| H3b | Body size is invisible before invocation | N's M1 differs by ≤ 10 tokens between `S025` and `S8K` (medians, same length and match) |
| H4 | Where the skill fits, explicit invocation lowers the session cost | COMPAT: E's CUM < N's CUM in ≥ 5/6 pairs per size |
| H5 | Where it doesn't fit, explicit invocation raises the session cost, more so for larger bodies | INCOMPAT: E's CUM > N's CUM in ≥ 5/6 pairs per size, and the median paired difference at `S8K` > at `S025` |
| H6 | Once both modes carry the body, size doesn't widen the later gap | COMPAT, pairs where N invoked the skill: \|median(E − N T2R1, `S8K`) − median(E − N T2R1, `S025`)\| ≤ 300 tokens |
| H7 | Body size changes cost, not task execution | Per mode × match, correctness and tag adherence rates differ by at most 1 of 6 runs between any two sizes |
| H8 | Financial direction follows CUM | Per cell, explicit is "cheaper" if the median paired USD difference < 0 and ≥ 2/3 pairs are negative; "more expensive" if > 0 and ≥ 2/3 positive; otherwise "equivalent" |

**Classification.** *Confirmed*: the criterion is met on the planned sample. *Not met*: it's missed, reported with the value; limits aren't widened afterwards. *Exploratory*: a pattern seen outside a pre-registered criterion, or met on a reduced sample (fewer than 3 repetitions per cell). *Inconclusive*: the within-condition spread of M1 exceeds 30 tokens in the cells involved, or cells are missing.

## 4. Budget, reduction and stopping rules (pre-registered)

- **Cap:** US$5.00 list-price estimate for the whole task, smoke test included. The runner keeps a ledger in `summary.json` and won't start a run once spent + US$0.50 (the per-run cap) would pass US$5.00. So matrix spending stops at about US$4.50.
- **Smoke test first:** 4 sessions, E and N of (`S025`, SHORT, COMPAT) and (`S8K`, LONG, INCOMPAT), the cheapest and the most expensive expected cells. Smoke runs aren't pooled with matrix runs.
- **Reduction rule, fixed now:** let c = 1.25 × the mean smoke-session cost. Repetitions r = the largest of 3, 2, 1 with 36 · r · c ≤ 4.50 − smoke spend. If even r = 1 doesn't fit, run the screening design: drop `S2K` (24 combinations, 1 repetition). The chosen r is recorded before the matrix starts. No reduction after seeing matrix results without a dated amendment in §5.
- **Stop rules:** stop on 2 consecutive runs with a non-zero exit, a missing `result` event, or a fixture cleanup problem; stop at the budget limit. No expansion beyond 3 repetitions.
- **Smoke-test amendments:** if the smoke test shows a mechanism failure (for example `/work` not expanded through `stream-json` input), the fix is recorded as a dated amendment before the matrix, as in the isolation report. Tasks and fixtures aren't changed because of which conditions call the skill.

## 5. Amendments

### Amendment 1 (after the smoke test, before the matrix)

**Smoke test** (4 sessions, all exit 0, both turns completed): mean session cost US$0.0408 (0.0358, 0.0374, 0.0562, 0.0339; total US$0.1633). Mechanism checks: `/work` sent through `stream-json` input is expanded as in `-p` (command block plus skill block with the body, in request 1). The last `result` event's `total_cost_usd` is cumulative across turns (turn 2 adds a small increment); each `result` event's `usage` is per turn, so session output tokens are summed over turns.

**Reduction rule applied as registered:** c = 1.25 × 0.0408 = 0.0510. 36 · 3 · c = 5.51 and 36 · 2 · c = 3.67, against 4.50 − 0.163 = 4.337. So **r = 2** (72 sessions).

**Change, fixed before any matrix run:**

1. Repetitions 1–2 are shuffled together and run first (seed `20261011`). Then repetition 3 blocks run in their own fixed shuffled order **until the budget stop**, whatever the earlier results. This replaces "all blocks of all repetitions are shuffled together" (§2). It adds data only by a budget-based stop, never by a result-based one.
2. Thresholds written as "x/6 per size" are read as proportions of the pairs actually run (5/6 → ≥ 83%; 1/6 → ≤ 17%).
3. Classification follows §3: a hypothesis is *confirmed* only if every cell it uses has 3 repetitions. With fewer, a met criterion is *exploratory*.

## 6. Execution and coverage

Reconciled from the runner's artifacts (`summary.json` ledgers and per-session `stream-json` files), not from the progress log:

| Item | Planned | Executed |
|---|---|---|
| Smoke sessions | 4 | 4, all with 2 `result` events, exit 0 |
| Matrix combinations (size × length × match × mode) | 36 | **36** |
| Repetitions per combination | 3 (2 guaranteed, 3rd until the budget stop, Amendment 1) | **3 in every combination**. The budget stop wasn't reached |
| Matrix sessions | 108 | **108**: no duplicate (combination, repetition), every session with exactly 2 `result` events, exit 0, `is_error: false`, 0 permission denials, raw request bodies captured for every request |
| Missing cells, failures, incomplete sessions | — | **none** |
| Fixture | clean after each run | runner check passed after every session; the directory was empty at the end |

`init` reported CLI `2.1.296`, model `claude-sonnet-5-5`, 36 skills with `work` among them, and tools `Read` and `Skill`, in all 108 sessions. Wall time per session: 17.1 s at most.

Because the third repetition fit, every hypothesis below is evaluated on the full planned sample (3 repetitions per cell). The "exploratory on a reduced sample" clause of Amendment 1 didn't come into play.

## 7. Results

All values are tokens unless marked USD. M1 = first-request prompt (input + cache creation + cache read). CUM = sum of prompt tokens over all main-agent requests of both turns. REQ = main-agent requests. T2R1 = prompt of the first request of turn 2. USD = Claude Code's `total_cost_usd` (list price, cumulative over the session; Amendment 1). Output = output tokens summed over the two `result` events. "Skill turn" = turn of the first `Skill` call per repetition (0 = none). Tag = answers containing `RECON_7Q4K`. Correct = the per-match checks of §3.

### 7.1 Per condition (median, with range where shown; n = 3 each)

| Size | Length | Match | Mode | n | M1 | M1 range | REQ | CUM | CUM range | T2R1 | Tools | Skill turn | Tag t1/t2 | Correct t1/t2 | Output | USD | USD range | duration_ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S025 | SHORT | COMPAT | E | 3 | 9967 | 9967..9967 | 3 | 30682 | 30648..30777 | 10479 | 1 | 0,0,0 | 3/3 | 3/3 | 404 | 0.0339 | 0.0337..0.0346 | 9575 |
| S025 | SHORT | COMPAT | N | 3 | 9733 | 9733..9735 | 4 | 40701 | 30672..40731 | 10600 | 2 | 1,1,1 | 3/3 | 3/3 | 404 | 0.0362 | 0.0358..0.0364 | 9418 |
| S025 | SHORT | AMBIG | E | 3 | 9961 | 9961..9963 | 3 | 30741 | 30698..30768 | 10546 | 1 | 0,0,0 | 3/3 | 3/3 | 440 | 0.0347 | 0.0344..0.0363 | 10014 |
| S025 | SHORT | AMBIG | N | 3 | 9726 | 9726..9731 | 3 | 30812 | 30139..30830 | 10768 | 2 | 0,1,1 | 2/2 | 3/3 | 590 | 0.0379 | 0.0358..0.038 | 10705 |
| S025 | SHORT | INCOMPAT | E | 3 | 9953 | 9951..9953 | 3 | 31439 | 31350..31474 | 10853 | 2 | 0,0,0 | 3/3 | 3/3 | 595 | 0.0379 | 0.0374..0.0387 | 10516 |
| S025 | SHORT | INCOMPAT | N | 3 | 9725 | 9721..9726 | 3 | 29812 | 29794..29813 | 10104 | 1 | 0,0,0 | 0/0 | 3/3 | 202 | 0.0314 | 0.0313..0.0325 | 7787 |
| S025 | LONG | COMPAT | E | 3 | 10384 | 10383..10388 | 3 | 31936 | 31898..31946 | 10899 | 1 | 0,0,0 | 3/3 | 3/3 | 337 | 0.0339 | 0.0328..0.0371 | 8949 |
| S025 | LONG | COMPAT | N | 3 | 9938 | 9938..9947 | 4 | 41509 | 31283..41546 | 10805 | 2 | 1,1,1 | 3/3 | 3/3 | 413 | 0.0362 | 0.0355..0.0366 | 10099 |
| S025 | LONG | AMBIG | E | 3 | 10378 | 10376..10378 | 3 | 31965 | 31949..31974 | 10937 | 1 | 0,0,0 | 3/3 | 3/3 | 432 | 0.0345 | 0.0339..0.0385 | 9145 |
| S025 | LONG | AMBIG | N | 3 | 9941 | 9938..9942 | 3 | 30624 | 30617..30664 | 10471 | 1 | 0,0,0 | 0/0 | 3/3 | 376 | 0.0338 | 0.0337..0.0341 | 9248 |
| S025 | LONG | INCOMPAT | E | 3 | 10370 | 10366..10371 | 3 | 32749 | 32710..32844 | 11325 | 2 | 0,0,0 | 3/3 | 3/3 | 651 | 0.0383 | 0.0381..0.0427 | 11468 |
| S025 | LONG | INCOMPAT | N | 3 | 9934 | 9931..9935 | 3 | 30451 | 30448..30461 | 10336 | 1 | 0,0,0 | 0/0 | 3/3 | 241 | 0.0319 | 0.0318..0.0319 | 6951 |
| S2K | SHORT | COMPAT | E | 3 | 10695 | 10694..10697 | 3 | 32870 | 32829..32974 | 11207 | 1 | 0,0,0 | 3/3 | 3/3 | 339 | 0.0354 | 0.033..0.0384 | 9430 |
| S2K | SHORT | COMPAT | N | 3 | 9733 | 9730..9734 | 4 | 42900 | 42884..43000 | 11327 | 2 | 1,1,1 | 3/3 | 3/3 | 419 | 0.0396 | 0.0391..0.0408 | 9800 |
| S2K | SHORT | AMBIG | E | 3 | 10692 | 10690..10692 | 3 | 32993 | 32945..33181 | 11340 | 1 | 0,0,0 | 3/3 | 3/3 | 474 | 0.0381 | 0.0354..0.0401 | 10102 |
| S2K | SHORT | AMBIG | N | 3 | 9729 | 9726..9731 | 3 | 32408 | 32229..43116 | 11463 | 2 | 1,1,1 | 3/3 | 3/3 | 615 | 0.0416 | 0.0403..0.0421 | 10711 |
| S2K | SHORT | INCOMPAT | E | 3 | 10682 | 10681..10684 | 3 | 33640 | 33083..33748 | 11614 | 2 | 0,0,0 | 3/3 | 3/3 | 639 | 0.0387 | 0.0352..0.0431 | 11609 |
| S2K | SHORT | INCOMPAT | N | 3 | 9727 | 9721..9727 | 3 | 29828 | 29794..29828 | 10118 | 1 | 0,0,0 | 0/0 | 3/3 | 221 | 0.0316 | 0.0314..0.0318 | 8599 |
| S2K | LONG | COMPAT | E | 3 | 11119 | 11118..11120 | 3 | 34153 | 34133..34153 | 11641 | 1 | 0,0,0 | 3/3 | 3/3 | 343 | 0.0337 | 0.0337..0.0403 | 9403 |
| S2K | LONG | COMPAT | N | 3 | 9941 | 9938..9944 | 3 | 32718 | 32703..32732 | 11528 | 2 | 1,1,1 | 3/3 | 3/3 | 416 | 0.0385 | 0.0382..0.0386 | 10450 |
| S2K | LONG | AMBIG | E | 3 | 11110 | 11107..11112 | 3 | 34155 | 34133..34177 | 11669 | 1 | 0,0,0 | 3/3 | 3/3 | 394 | 0.0345 | 0.034..0.0409 | 9896 |
| S2K | LONG | AMBIG | N | 3 | 9938 | 9938..9943 | 3 | 30612 | 30603..30664 | 10467 | 1 | 0,0,0 | 0/0 | 3/3 | 371 | 0.0336 | 0.0333..0.0341 | 8914 |
| S2K | LONG | INCOMPAT | E | 3 | 11098 | 11097..11099 | 3 | 34383 | 34241..46521 | 11933 | 1 | 0,0,0 | 3/3 | 3/3 | 700 | 0.0415 | 0.0362..0.045 | 12353 |
| S2K | LONG | INCOMPAT | N | 3 | 9937 | 9933..9938 | 3 | 30449 | 30446..30470 | 10330 | 1 | 0,0,0 | 0/0 | 3/3 | 245 | 0.0319 | 0.0315..0.032 | 7979 |
| S8K | SHORT | COMPAT | E | 3 | 13263 | 13260..13265 | 3 | 40715 | 40576..40742 | 13920 | 1 | 0,0,0 | 3/3 | 3/3 | 481 | 0.0362 | 0.0344..0.0515 | 8939 |
| S8K | SHORT | COMPAT | N | 3 | 9735 | 9730..9735 | 4 | 50664 | 50590..50753 | 13961 | 2 | 1,1,1 | 3/3 | 3/3 | 489 | 0.0513 | 0.0499..0.0522 | 9905 |
| S8K | SHORT | AMBIG | E | 3 | 13257 | 13255..13258 | 3 | 40706 | 40685..40761 | 13923 | 1 | 0,0,0 | 3/3 | 3/3 | 518 | 0.0372 | 0.0364..0.0515 | 10387 |
| S8K | SHORT | AMBIG | N | 3 | 9730 | 9725..9732 | 3 | 37422 | 37367..50845 | 14033 | 2 | 1,1,1 | 3/3 | 3/3 | 602 | 0.0522 | 0.0514..0.053 | 10389 |
| S8K | SHORT | INCOMPAT | E | 3 | 13245 | 13244..13247 | 3 | 40890 | 40823..55222 | 13982 | 1 | 0,0,0 | 3/3 | 3/3 | 568 | 0.0374 | 0.037..0.056 | 11573 |
| S8K | SHORT | INCOMPAT | N | 3 | 9721 | 9721..9729 | 3 | 29806 | 29794..29834 | 10108 | 1 | 0,0,0 | 0/0 | 3/3 | 208 | 0.0314 | 0.0314..0.0316 | 8242 |
| S8K | LONG | COMPAT | E | 3 | 13679 | 13676..13680 | 3 | 41821 | 41811..41825 | 14192 | 1 | 0,0,0 | 3/3 | 3/3 | 349 | 0.0345 | 0.0343..0.0515 | 8695 |
| S8K | LONG | COMPAT | N | 3 | 9942 | 9939..9943 | 3 | 37848 | 37824..37855 | 14081 | 2 | 1,1,1 | 3/3 | 3/3 | 461 | 0.0499 | 0.0495..0.0509 | 9860 |
| S8K | LONG | AMBIG | E | 3 | 13671 | 13671..13676 | 3 | 41855 | 41838..41860 | 14236 | 1 | 0,0,0 | 3/3 | 3/3 | 427 | 0.0355 | 0.0352..0.052 | 9513 |
| S8K | LONG | AMBIG | N | 3 | 9939 | 9938..9940 | 3 | 30588 | 30538..30600 | 10441 | 1 | 0,0,0 | 0/0 | 3/3 | 305 | 0.033 | 0.0323..0.0355 | 8388 |
| S8K | LONG | INCOMPAT | E | 3 | 13664 | 13663..13665 | 4 | 56756 | 56710..56846 | 14719 | 2 | 0,0,0 | 3/3 | 3/3 | 760 | 0.0422 | 0.0418..0.0428 | 13124 |
| S8K | LONG | INCOMPAT | N | 3 | 9932 | 9931..9938 | 3 | 30451 | 30441..30462 | 10333 | 1 | 0,0,0 | 0/0 | 3/3 | 224 | 0.0317 | 0.0317..0.0319 | 7064 |

M1 spread within a condition was 0 to 9 tokens in all 36 conditions (criterion for "inconclusive": > 30).

### 7.2 Paired E − N per cell (the three pairs, then the median)

| Size | Length | Match | n | M1 | CUM | REQ | Tools | T2R1 | USD |
|---|---|---|---|---|---|---|---|---|---|
| S025 | SHORT | COMPAT | 3 | [234, 234, 232]: 234 | [-10019, 105, -10083]: -10019 | [-1, 0, -1]: -1 | [-1, -1, -1]: -1 | [-100, -46, -155]: -100 | [-0.0023, -0.0013, -0.0027]: -0.0023 |
| S025 | SHORT | AMBIG | 3 | [237, 235, 230]: 235 | [602, -44, -132]: -44 | [0, 0, 0]: 0 | [0, -1, -1]: -1 | [128, -191, -263]: -191 | [0.0006, -0.0033, -0.0035]: -0.0033 |
| S025 | SHORT | INCOMPAT | 3 | [227, 232, 226]: 227 | [1538, 1680, 1626]: 1626 | [0, 0, 0]: 0 | [1, 1, 1]: 1 | [694, 794, 743]: 743 | [0.0062, 0.0066, 0.006]: 0.0062 |
| S025 | LONG | COMPAT | 3 | [446, 450, 436]: 446 | [-9610, -9563, 615]: -9563 | [-1, -1, 0]: -1 | [-1, -1, -1]: -1 | [89, 128, 55]: 89 | [0.0005, -0.0024, -0.0027]: -0.0024 |
| S025 | LONG | AMBIG | 3 | [437, 440, 434]: 437 | [1357, 1301, 1325]: 1325 | [0, 0, 0]: 0 | [0, 0, 0]: 0 | [483, 418, 454]: 454 | [0.0048, 0.0004, 0.0002]: 0.0004 |
| S025 | LONG | INCOMPAT | 3 | [436, 436, 435]: 436 | [2383, 2301, 2259]: 2301 | [0, 0, 0]: 0 | [1, 1, 1]: 1 | [1040, 998, 970]: 998 | [0.0108, 0.0065, 0.0061]: 0.0065 |
| S2K | SHORT | COMPAT | 3 | [963, 962, 964]: 963 | [-10014, -10026, -10071]: -10026 | [-1, -1, -1]: -1 | [-1, -1, -1]: -1 | [-92, -103, -155]: -103 | [-0.0007, -0.0055, -0.0066]: -0.0055 |
| S2K | SHORT | AMBIG | 3 | [959, 966, 963]: 963 | [716, -10123, 773]: 716 | [0, -1, 0]: 0 | [-1, -1, -1]: -1 | [-152, -123, -11]: -123 | [-0.0002, -0.0067, -0.0035]: -0.0035 |
| S2K | SHORT | INCOMPAT | 3 | [955, 957, 960]: 957 | [3812, 3920, 3289]: 3812 | [0, 0, 0]: 0 | [1, 1, 0]: 1 | [1496, 1547, 1216]: 1496 | [0.0113, 0.0071, 0.0038]: 0.0071 |
| S2K | LONG | COMPAT | 3 | [1180, 1179, 1175]: 1179 | [1415, 1450, 1421]: 1421 | [0, 0, 0]: 0 | [-1, -1, -1]: -1 | [100, 134, 113]: 113 | [0.0018, -0.0045, -0.0049]: -0.0045 |
| S2K | LONG | AMBIG | 3 | [1169, 1172, 1169]: 1169 | [3491, 3521, 3574]: 3521 | [0, 0, 0]: 0 | [0, 0, 0]: 0 | [1150, 1177, 1233]: 1177 | [0.0067, 0.0007, 0.0008]: 0.0008 |
| S2K | LONG | INCOMPAT | 3 | [1160, 1160, 1166]: 1160 | [3937, 3771, 16072]: 3937 | [0, 0, 1]: 0 | [0, 0, 1]: 0 | [1614, 1448, 1843]: 1614 | [0.0135, 0.0042, 0.0096]: 0.0096 |
| S8K | SHORT | COMPAT | 3 | [3530, 3528, 3530]: 3530 | [-9848, -10038, -10088]: -10038 | [-1, -1, -1]: -1 | [-1, -1, -1]: -1 | [74, -112, -174]: -112 | [0.0016, -0.0159, -0.0169]: -0.0159 |
| S8K | SHORT | AMBIG | 3 | [3528, 3530, 3525]: 3528 | [3318, -10084, 3284]: 3284 | [0, -1, 0]: 0 | [-1, -1, -1]: -1 | [-123, -84, -110]: -110 | [-0.0007, -0.0159, -0.015]: -0.015 |
| S8K | SHORT | INCOMPAT | 3 | [3526, 3524, 3515]: 3524 | [25428, 11017, 11056]: 11056 | [1, 0, 0]: 0 | [1, 0, 0]: 0 | [4138, 3827, 3862]: 3862 | [0.0246, 0.0054, 0.006]: 0.006 |
| S8K | LONG | COMPAT | 3 | [3740, 3733, 3738]: 3738 | [4001, 3956, 3973]: 3973 | [0, 0, 0]: 0 | [-1, -1, -1]: -1 | [133, 100, 111]: 111 | [0.0006, -0.0151, -0.0154]: -0.0151 |
| S8K | LONG | AMBIG | 3 | [3738, 3732, 3731]: 3732 | [11260, 11267, 11300]: 11267 | [0, 0, 0]: 0 | [0, 0, 0]: 0 | [3781, 3800, 3835]: 3800 | [0.0164, 0.0023, 0.0032]: 0.0032 |
| S8K | LONG | INCOMPAT | 3 | [3733, 3725, 3733]: 3733 | [26395, 26248, 26315]: 26315 | [1, 1, 1]: 1 | [1, 1, 1]: 1 | [4427, 4361, 4395]: 4395 | [0.011, 0.0101, 0.0105]: 0.0105 |

### 7.3 Hypotheses against the pre-registered criteria

| # | Criterion (§3, unchanged) | Observed | Classification |
|---|---|---|---|
| H1 | median E − N M1 at S2K minus S025 in [+300, +900]; S8K minus S025 in [+1,500, +3,200] | S2K: 1,063 − 335.5 = **+727.5**. S8K: 3,627.5 − 335.5 = **+3,292** | S2K **confirmed**. S8K **not met** (92 tokens above the upper limit). The direction holds; the 8 KB appendix is denser in tokens than assumed (≈ 2.4 bytes per token) |
| H2 | for every size × match, median(E − N M1, LONG) − median(SHORT) in [+100, +350]; turn-1 text ≥ 2× in E's request 1 and 1× in N's | 9/9 cells in range: **+202 to +216**. Raw bodies: E request 1 holds the turn-1 text exactly 2× in 54/54 sessions; N 1× in 54/54 | **Confirmed** |
| H3a | N calls `Skill` in turn 1: COMPAT ≥ 83% per size; INCOMPAT ≤ 17% per size | COMPAT 6/6, 6/6, 6/6. INCOMPAT 0/6, 0/6, 0/6. AMBIG (no criterion): 2/6, 3/6, 3/6 | **Confirmed** |
| H3b | N's M1, S8K − S025, \|Δ\| ≤ 10 in each length × match | −4 to +4 in 6/6 | **Confirmed** |
| H4 | COMPAT: E's CUM < N's CUM in ≥ 83% of pairs per size | 4/6, 3/6, 3/6 | **Not met** (§8.2 gives the mechanism) |
| H5 | INCOMPAT: E's CUM > N's in ≥ 83% of pairs per size, and median at S8K > at S025 | 6/6 per size; medians +1,969.5 / +3,866 / +25,838 | **Confirmed** |
| H6 | COMPAT, N invoked: \|median(E − N T2R1, S8K) − median(S025)\| ≤ 300 | +87 − (+4.5) = **82.5** | **Confirmed** |
| H7 | per mode × match, correctness and tag rates differ by ≤ 1 of 6 between sizes | correctness 6/6 in every mode × match × size. Tag: E 6/6 everywhere; N COMPAT 6/6, N INCOMPAT 0/6, N AMBIG 2/6, 3/6, 3/6 | **Confirmed**. Caveat: INCOMPAT's check (`tide` in answer 1) doesn't capture the side effects in §8.3 |
| H8 | per cell, "cheaper" / "more expensive" / "equivalent" by the median and sign of paired USD | E cheaper in all 6 COMPAT cells and in the 3 short AMBIG cells. More expensive in all 6 INCOMPAT cells and in the 3 long AMBIG cells. No "equivalent" | Applied as registered. **Confounded** by cross-session caching (§8.4) |

## 8. Mechanisms seen in the data

### 8.1 Where the skill content appears (raw bodies, structural summary only)

- **E:** request 1, every session. It holds a command block (with the turn-1 text) and a skill block (base directory, body, `ARGUMENTS:` and the turn-1 text again). The core marker was in request 1 in 54/54 E sessions; the appendix marker too in all 36 S2K and S8K E sessions. So under `/work`, a LONG task's extra 727 characters are sent twice. That's the +202 to +216 of H2, about the token count of the paragraph.
- **N:** never in request 1 (0/54). In the 26 sessions where the model called `Skill`, the body arrived in the next request after the tool call (26/26), as a user text block, as in the isolation report. It appeared in none of the 28 sessions without a `Skill` call.
- **No resend:** the core marker appears in no request body after the one that introduced it, in either mode.
- **Later turns:** continuation requests carry only the new user turn (`thread: continue`). The body stays in the server-side context. So T2R1 grows with body size in both modes (E COMPAT short: 10,479 / 11,207 / 13,920) and the E − N gap at turn 2 stays near zero whenever both loaded the skill (H6).

### 8.2 Why H4 failed: parallel tool calls

**Observed** from the per-message tool calls in the `stream-json` files. In COMPAT, N always called `Skill(work)` and `Read(data/ledger.txt)`, in one of two shapes:

- **Sequential** (`Skill`, then `Read` in the next request): turn 1 takes 3 requests against E's 2. N's CUM is ≈ 10k higher (one full context resend). 10/18 pairs, E − N CUM −9,563 to −10,088.
- **Parallel** (`Skill` and `Read` in the same assistant message): turn 1 takes 2 requests, as E. N's CUM is then lower than E's, because N's early requests don't carry the body. 8/18 pairs, E − N CUM +105 to +4,001, growing with size.

The shape was linked to task length: parallel in 1/9 SHORT pairs and 7/9 LONG pairs (**exploratory**: not pre-registered). It wasn't linked to body size, which the model can't see before invoking.

**Inference (ours):** the session-level saving of `/work` is the saving of one round trip, so it exists only when natural language would spend that round trip. The model's tool-call shape decides that, not the skill.

### 8.3 Explicit invocation on a task the skill doesn't fit

In INCOMPAT, `/work` loaded the reconciliation procedure for a "summarize the notes" task. The model still answered the notes question correctly 18/18. It also:

- included `RECON_7Q4K` in every answer (18/18 in both turns), as the core asks;
- read `data/ledger.txt` too in 13/18 sessions (+1 tool call; +1 request in 5 of them when the reads were sequential);
- ended answer 1 with `STATUS: RECONCILED <total>` in 16/18.

So in this setup a mismatched `/work` changed the work done, not only the token count: unrequested reads and output. N never called the skill on INCOMPAT (0/18).

### 8.4 Cross-session prompt cache and the USD direction

**Observed** from the per-request split. In E, the body sits in request 1 after a stable prefix. Repeated sessions of the same cell read it from cache: E's cache creation per session was 7,345 / 8,340.5 / 10,993.5 (S025 / S2K / S8K, median) in the first session of each COMPAT cell, and 6,853 / 6,883 / 6,874.5 in later ones. In N, the body arrives after the model's own turn, whose text and thinking vary, so it's written to cache every time: 7,245 / 7,971 / 10,568 in later sessions too.

That's why E looked cheaper in USD in COMPAT cells even where its CUM was higher, and why the first pair of each cell often has the opposite sign (§7.2, USD column). Across all cells, E's median session cost was US$0.0418 in the first session of a combination against US$0.0353 later; N's was US$0.0357 against US$0.0348.

**Inference (ours):** in normal use, task text differs between sessions. Under `/work`, the task text comes before the body in request 1, so the body's cached prefix would rarely be reused. H8's direction for E is optimistic for a realistic workload. The token results (M1, CUM, REQ) don't depend on caching.

### 8.5 Other observations

- Session output, median of all sessions: E 463, N 385.5 tokens. `duration_ms` summed over turns: E 10,108, N 9,333 ms. Output in E is higher mainly in INCOMPAT (the extra status line and ledger work).
- AMBIG: N picked the skill in 8/9 SHORT sessions and 0/9 LONG ones. **Exploratory:** the neutral context paragraph seems to steer the model away from the skill, but the paragraph also says "a read-only look is enough". It wasn't designed to test that.
- In AMBIG, when N didn't call the skill, it still read the ledger and answered both turns (correctness 6/6 per size). The AMBIG turn-1 check is weak (non-empty answer); turn 2 checked the largest entry.

## 9. Answers to the completion criteria

Restricted to this setup (one CLI version, one model, one synthetic fixture, two turns).

| `/work` against natural language… | Where | Evidence level |
|---|---|---|
| **raises the first-request cost** | always: by body tokens + wrapper + a second copy of the task text. +234 at 0.25 KB short up to +3,738 at 8 KB long | Confirmed (H1 S2K, H2; H1 S8K above its range) |
| **reduces the cumulative cost** | only where the skill fits and N loaded it in a separate request (10/18 COMPAT pairs, ≈ −10k tokens each). Not otherwise | Measured; H4 not met as a general claim |
| **avoids extra requests** | the same 10/18 COMPAT pairs and 2/18 AMBIG pairs (−1 request) | Measured |
| **provokes extra requests and calls** | INCOMPAT: +1 tool call in 13/18 and +1 request in 5/18 (ledger read prompted by the skill); 8 KB long INCOMPAT 3/3 | Measured |
| **changes selection** | it bypasses selection: the body is loaded 54/54, including the 18 INCOMPAT and the 10 AMBIG sessions where N didn't pick the skill | Confirmed (H3a gives the N side) |
| **loses its advantage as size grows** | in tokens, yes where N's tool calls are parallel: the E − N CUM goes from ≈ +0.1–0.6k (S025) to +1.4k (S2K) to +4.0k (S8K). Where N is sequential, the ≈ −10k saving is about the same at all sizes. In INCOMPAT, the penalty grows from ≈ +2k to ≈ +26k | Measured |
| **loses its advantage as the task grows** | the premium grows by ≈ +210 tokens per 727 characters of task (sent twice). The long task also shifted N to parallel calls (7/9 vs 1/9), which removed N's extra request more often | First part confirmed; second exploratory |

Inconclusive: the financial direction in a realistic workload (§8.4); whether the AMBIG length effect is the paragraph's wording or its length; anything beyond two turns.

## 10. Limitations

- **One environment:** CLI `2.1.296`, `claude-sonnet-5-5`, effort `medium`, thinking on (inherited `MAX_THINKING_TOKENS`), `--tools Read,Skill`, one cloud container and account, one day (about 20 minutes). The ≈ 9.7k-token background (system prompt, skill listing, account context) is specific to this account.
- **One synthetic skill and fixture.** Body size was varied by an inert appendix. A real 8 KB skill has 8 KB of instructions, which may change behavior; this design only shows that inert size doesn't.
- **Two turns only**, with a fixed short follow-up. Longer sessions resend the context more often, which makes a body loaded early more expensive for both modes.
- **Cross-session caching** (§8.4) depends on running identical prompts back to back within the cache lifetime. It biases USD, not token counts.
- **Correctness checks are string checks.** They don't judge answer quality; INCOMPAT's side effects were found by separate counts.
- **Costs are list-price estimates** by Claude Code (`costBasis: "list"`), not the subscription's real charge.
- **Raw request bodies were on in every session** (uniform). Absolute M1 values aren't comparable with runs without them.
- **Other workers** may have used the same account around this time; that only affects cache splits.

## 11. Cost of the experiment

| Phase | Sessions | List-price estimate (USD) |
|---|---|---|
| Smoke | 4 | 0.1633 |
| Matrix | 108 | 4.0977 |
| **Total** | **112** | **4.2610** |

The cap was US$5.00. Before each session, the runner checked spent + US$0.50 against the remaining budget (US$4.8367 for the matrix). Before the last session, spent was US$4.2265 (smoke + matrix), so even a session at the per-run cap couldn't pass US$5.00. No other paid call was made for this task.

## 12. Validation

Commands actually run, on the final tree, in the work tree:

| Command | Result |
|---|---|
| `mise run validate`, `mise run test` | **not run**: `mise` isn't installed in this container |
| `bun install --frozen-lockfile` | pass |
| `bun run validate` | **pass**: markdown-lint 24 files, 0 issues; local links 335 references in 26 files; mermaid 13 diagrams; decision records 6 ADRs, 8 map rows; artifact checks pass. `external-links` and `artifact-records` not run, by the validator's design |
| `bun run typecheck` | **pass** (exit 0) |
| `bun run test` | **pass**: 77 tests, 0 failures |
| `python3 -m py_compile tools/research/run_claude_skill_multiturn_factorial.py` | pass. A `__pycache__/*.pyc` it produced was committed by mistake in `2b24223` and is removed in the results commit |
| runner `--sizes`, `--dry-run`, `--analyze` | pass; §2's sizes and §7's tables come from them |
| fixture clean after every session | pass (runner check, 112/112) |
| no raw data in the repository | pass: raw `stream-json`, raw bodies and `summary.json` stay in the session scratchpad. The report holds only fixture texts written for this task, aggregates and structural counts |

## 13. Recommendation (restricted to these data)

- Use `/work` when the skill clearly fits the task. In this setup it never lost on correctness. It saved a ≈ 10k-token round trip about half the time and cost up to ≈ 4k tokens more the rest of the time, at 8 KB.
- Don't use `/work` on a task the skill doesn't fit. It cost more in every pair (up to ≈ 26k tokens at 8 KB over two turns) and made the model do the skill's work as well: extra reads and an unrequested status line.
- Body size drives both the first-request premium and the context carried into later turns, for both modes, once loaded. Inert reference text in a skill body isn't free. In this setup it cost about 1 token per 2.4 bytes, on every later request.
- Don't read the USD direction of this run as general (§8.4).

Not supported: claims about other models, hosts, real-world skills, longer sessions or G-Ingá's architecture. Nothing here changes a decision.

**Next experiment:** vary the task text between repetitions (paraphrases of the same COMPAT task), so cross-session caching of `/work`'s body is removed, and extend to 4–6 turns. That would measure the financial direction realistically and whether the parallel vs sequential tool-call shape persists.

## 14. Reproducing

```sh
mkdir <empty-dir-outside-any-repo>
python3 tools/research/run_claude_skill_multiturn_factorial.py <fixture> <out> --sizes
python3 tools/research/run_claude_skill_multiturn_factorial.py <fixture> <smoke-out> --plan smoke --raw-bodies
python3 tools/research/run_claude_skill_multiturn_factorial.py <fixture> <out> --plan matrix --reps 2 --top-up-to 3 --raw-bodies --budget-usd 4.8367
python3 tools/research/run_claude_skill_multiturn_factorial.py <fixture> <out> --analyze
```

Paid calls, and a working `claude` login, are needed. The output directories hold raw events and request bodies with session metadata and the account-context block. Keep them local; never commit or publish them.
