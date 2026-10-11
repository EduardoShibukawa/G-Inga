# Claude Code host: `/work` against auto-selection with unique task instances and five turns

**Status:** research note, `proposed`. Not a decision. No ADR, decision-map row, contract or validator changes.
**Task:** `CLAUDE-SKILL-MULTITURN-REALISTIC-CACHE-CONTROL`. Claim `refs/heads/task-claims/CLAUDE-SKILL-MULTITURN-REALISTIC-CACHE-CONTROL` (`de5bfe4`). Branch `claude/skill-multiturn-realistic-cache-control`, based on `claude/eager-maxwell-70c4cb` at `ecc21c8`.
**Runner:** [`tools/research/run_claude_skill_multiturn_realistic_cache_control.py`](../../tools/research/run_claude_skill_multiturn_realistic_cache_control.py). It imports the factorial runner for the skill files, the CLI flags and the session driver.
**Builds on:** [`claude-skill-multiturn-factorial.md`](claude-skill-multiturn-factorial.md), which found that `/work`'s list-price advantage in compatible cells came largely from cross-session caching of the skill body, because each cell repeated an identical prompt (its §8.4).

Labels: **Fact (docs)**, **Observed** and **Inference (ours)**, as in the earlier reports.

> **This version is the pre-registration.** It was committed and pushed before the smoke test. §2–§4 aren't edited afterwards except through a dated amendment in §5. Results follow in later commits.

## 1. Reservation, overlap and base

- **Claims on the remote before starting** (2026-10-11T11:59Z): `CLAUDE-HOST-CONTEXT-COST-BASELINE` (`9a1806c`), `CLAUDE-SKILL-INVOCATION-MARGINAL-COST` (`86e59a6`), `CLAUDE-WORK-SKILL-COST-ISOLATION` (`d9824b1`), `CLAUDE-SKILL-MULTITURN-FACTORIAL` (`9e7489e`). All four are older, completed tasks with published reports. The factorial claim stayed because its release failed (its report, §1). None was changed or removed here.
- **`CLAUDE-SKILL-INVOCATION-MARGINAL-COST`.** Branch `claude/skill-invocation-marginal-cost` at `3e895ce` (10:53:37Z); no push since, about 66 minutes before this task started. Its report covers one 253-byte skill, single-turn sessions and identical prompts repeated three times. It doesn't cover body size, multi-turn sessions or varying task instances. **No overlap that blocks this task**, and it doesn't look active.
- **Claim.** Created with `--force-with-lease=<ref>:` (expects the ref to be absent): an empty commit over `ecc21c8`, with worker, branch, base and time in the message.
- **Base.** `ecc21c8` is on the remote as the tip of `claude/eager-maxwell-70c4cb`, the factorial task's final commit. That branch isn't modified by this task.
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
