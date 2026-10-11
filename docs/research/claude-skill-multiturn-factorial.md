# Claude Code host: skill size, task size and match in multi-turn `/work` sessions

**Status:** research note, `proposed`. Not a decision. No ADR, decision-map row, contract or validator changes.
**Task:** `CLAUDE-SKILL-MULTITURN-FACTORIAL`. Claim `refs/heads/task-claims/CLAUDE-SKILL-MULTITURN-FACTORIAL` (`9e7489e`). Branch `claude/eager-maxwell-70c4cb`, based on `claude/work-skill-cost-isolation` at `c34cbf9`.
**Runner:** [`tools/research/run_claude_skill_multiturn_factorial.py`](../../tools/research/run_claude_skill_multiturn_factorial.py).
**Builds on:** [`claude-work-skill-cost-isolation.md`](claude-work-skill-cost-isolation.md) (same branch base). Its §11 proposed this experiment.

Labels: **Fact (docs)**, **Observed** and **Inference (ours)**, as in the earlier reports.

> **This version is the pre-registration.** It was committed and pushed before the smoke test. Results, amendments and analysis are added in later commits; §2–§4 aren't edited after this commit except through a dated amendment in §5.

## 1. Reservation, overlap and base

- **Claims seen before starting** (`git ls-remote`, 2026-10-11): `task-claims/CLAUDE-HOST-CONTEXT-COST-BASELINE` (`9a1806c`), `task-claims/CLAUDE-SKILL-INVOCATION-MARGINAL-COST` (`86e59a6`), `task-claims/CLAUDE-WORK-SKILL-COST-ISOLATION` (`d9824b1`). None was read for change, moved or removed.
- **Overlap check.** `CLAUDE-SKILL-INVOCATION-MARGINAL-COST` (branch `claude/skill-invocation-marginal-cost`, `3e895ce`, report `docs/research/claude-skill-invocation-cost-results.md`) and `CLAUDE-WORK-SKILL-COST-ISOLATION` (`c34cbf9`) both measured **one 253-byte skill, one short task, a single turn**. Neither varied body size, task length or task–skill match, and neither continued a session past the first answer. Their reports name multi-turn sessions, larger skills and non-matching requests as unmeasured. The scope here is therefore distinct and the matrix isn't redundant. Gaps this task fills: body size (0.25/2/8 KB), task length, three match levels, a second user turn.
- **Claim.** Created with `git push --force-with-lease=refs/heads/task-claims/CLAUDE-SKILL-MULTITURN-FACTORIAL:` (expects the ref to be absent), following the existing convention: an empty commit over the base whose message names worker, branch, base and time.
- **Base.** `c34cbf9` is on the remote as the tip of `claude/work-skill-cost-isolation` and is the commit that adds `claude-work-skill-cost-isolation.md` with the results summarized in its §1. It's used as the base.
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

None yet.
