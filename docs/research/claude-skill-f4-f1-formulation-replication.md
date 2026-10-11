# Claude Code host: does the "two objectives" wording (F4) make auto-selection load the skill jointly? A paired replication against F1

**Status:** research note, `proposed`. Not a decision. No ADR, decision-map row, contract or validator changes.
**Task:** `CLAUDE-SKILL-F4-F1-FORMULATION-REPLICATION`. Claim `refs/heads/task-claims/CLAUDE-SKILL-F4-F1-FORMULATION-REPLICATION` (`5cbcca0`). Branch `claude/dazzling-albattani-cy6uh2` (the branch this session was assigned), based on `claude/kind-keller-n0rb9r` at `3cbd60f`.
**Runner:** [`tools/research/run_claude_skill_f4_f1_formulation_replication.py`](../../tools/research/run_claude_skill_f4_f1_formulation_replication.py). It imports the earlier formulation runner for the F1 and F4 texts, the string checks and the Clopper–Pearson interval, and through it the realistic cache-control runner (instances, stream parser) and the factorial runner (skill file, CLI flags, fixture, session driver). None of those files is changed.
**Builds on:** [`claude-skill-auto-routing-formulation.md`](claude-skill-auto-routing-formulation.md). There, on the natural-language route, 16/18 sessions loaded the skill sequentially (`Skill` then `Read` in separate requests) and 2/18 jointly; both joint sessions were F4, all three F4 pairs ran natural-language first, and the pre-registered test gave p = 0.118. Its §13 proposed this replication.

Labels: **Fact (docs)**, **Observed** and **Inference (ours)**, as in the earlier reports.

## 1. Reservation, overlap and base

- **Protocol.** The repository's convention (earlier reports' §1): a ref `refs/heads/task-claims/<TASK>` holding an empty commit over the base, whose message names worker, branch, base and time, pushed with `--force-with-lease=<ref>:` so the push fails if the ref already exists.
- **Claims on the remote before starting** (2026-10-11T13:02Z): `CLAUDE-HOST-CONTEXT-COST-BASELINE` (`9a1806c`), `CLAUDE-SKILL-INVOCATION-MARGINAL-COST` (`86e59a6`), `CLAUDE-WORK-SKILL-COST-ISOLATION` (`d9824b1`), `CLAUDE-SKILL-MULTITURN-FACTORIAL` (`9e7489e`), `CLAUDE-SKILL-MULTITURN-REALISTIC-CACHE-CONTROL` (`de5bfe4`), `CLAUDE-SKILL-AUTO-ROUTING-FORMULATION` (`48f5855`). All have published reports; their claims remain because their releases failed. None was changed.
- **Overlap.** No claim or branch on the remote covers an F1/F4 replication. The only related work is the earlier formulation study itself (completed, 3 F4 and 3 F1 natural-language sessions, unbalanced order). Remaining evidence gap: a larger, paired, order-balanced F1/F4 comparison. **No overlap that blocks this task.**
- **Claim.** `5cbcca0` (`claimed-at: 2026-10-11T13:02:38Z`), parent `3cbd60f`, created with a lease expecting the ref to be absent; the push created it.
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
