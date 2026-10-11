# Claude Code host: isolating the incremental cost of `/work`

**Status:** research note, `proposed`. Not a decision. No ADR, decision-map row or contract changes.
**Task:** `CLAUDE-WORK-SKILL-COST-ISOLATION`. Claim `refs/heads/task-claims/CLAUDE-WORK-SKILL-COST-ISOLATION` (`d9824b1`, 2026-10-11T10:46:34Z). Branch `claude/work-skill-cost-isolation`, based on `claude/host-context-cost-baseline` at `9283d4c`.
**Run on:** 2026-10-11. Smoke test at 10:49 UTC, matrix runs started between 10:51:15 and 10:54:24 UTC. Claude Code CLI `2.1.296`, model `claude-sonnet-5-5` (observed in `init`, `modelUsage` and every request body), in a claude.ai cloud session container (Linux).
**Runner:** [`tools/research/run_claude_work_skill_cost_isolation.py`](../../tools/research/run_claude_work_skill_cost_isolation.py).
**Builds on:** [`claude-host-context-cost-results.md`](claude-host-context-cost-results.md), the baseline report on the same branch. Its H3b left the isolated cost of `/work` **inconclusive**, because its E and D prompts differed. This note closes that gap for the same skill.

Labels: **Fact (docs)**, **Observed** and **Inference (ours)**, as in the baseline report (§2 there). Mechanism facts R1–R9 of the baseline aren't repeated here.

## 1. Summary

| Question | Answer under the observed environment | Status |
|---|---|---|
| Incremental first-request cost of `/work` against an equal-length natural-language request, skill installed in both | **+197.5 tokens** (median of 6 pairs; range +196 to +202; +2.03% of N) | **Isolated** (pre-registered criteria met, §5) |
| ... of which skill body text | +70.5 (69 to 73) | isolated by S − S_EMPTY |
| ... of which the explicit-invocation wrapper and other `/work`-path changes | +127 (126 to 129) | isolated by S_EMPTY − N |
| Passive discovery: the listing line of the installed but uninvoked skill | +26.5 (23 to 31) | isolated by N − N0 |
| Where the body is injected | `/work`: request 1, as a user text block, 6/6. Natural language: never in request 1; in request 2, after the model called `Skill(work)`, 6/6 | Observed in raw request bodies |
| Session (cumulative) cost, S − N | **−9,856 prompt tokens** (one request against two), −$0.0031 at list price (−10.7%), −2.9 s | Observed. Holds only because N auto-invoked the skill 6/6 |

The headline: in this setup, typing `/work` puts about 200 more tokens into the first request than asking in words. It also removes the round trip that the natural-language request spent on loading the skill. So the session was cheaper with `/work`, not more expensive.

## 2. Reservation, base and isolation

- **Claim check:** before starting, `git ls-remote` showed no `task-claims/CLAUDE-WORK-SKILL-COST-ISOLATION`. The claim was created with a lease that expects the ref to be absent (`--force-with-lease=<ref>:`), so a concurrent claim would have failed the push. It follows the existing convention: a commit whose message names worker, branch and time.
- **Overlap noted, not touched:** 20 seconds earlier (10:46:14Z), another worker claimed `task-claims/CLAUDE-SKILL-INVOCATION-MARGINAL-COST`, also based on `9283d4c`. Its scope sounds similar. This task didn't read, change or clean anything of it. If both ran on the same account at the same time, they shared the server's prompt cache. That changes the cache read/creation split, not the summed prompt size used here (§4).
- **Work tree:** a separate `git worktree` at `/home/user/G-Inga-work-skill-cost`, on a new branch from `9283d4c`. The primary checkout and every other branch were left as they were.
- **No global changes:** no settings file, hook or user skill was changed. The child processes inherit the session's environment except the parent-session variables (list in the runner) and, by design, the telemetry variables the runner sets itself.

### Cleanup review of the baseline runner, and fixes

The baseline runner (`run_claude_host_context_cost.py`) was read before any run. It removes exactly the files it created and stops if the fixture isn't empty. Four gaps were found and fixed in the new runner only (the baseline file is unchanged):

| Gap in the baseline runner | Fix in this runner |
|---|---|
| A failure halfway through fixture creation (second file) left the first files behind, because the `try` started after creation | `Fixture` context manager records each file and directory as it's created and cleans up on any exception, `KeyboardInterrupt` included |
| A file the session modified or deleted was removed or crashed without saying so | each file's SHA-256 is checked before deletion; a missing or modified file stops the runner with a message |
| No cumulative budget: only the per-run `--max-budget-usd` | `summary.json` is the ledger across invocations; a run doesn't start if spent + the per-run cap would pass `--budget-usd` |
| Output and fixture locations weren't checked against Git work trees | both must sit outside any Git work tree and must not contain each other, so raw events and bodies can't be committed by accident |

The model had only `Read` and `Skill` (`--tools Read,Skill`), so it couldn't write files. After the last run the fixture directory was empty. It was then removed by hand.

## 3. Pre-registration

Written to a timestamped scratch file before the smoke test (10:48:56Z), and amended once after the smoke test and before the matrix (10:50:44Z). The text below repeats both unchanged in substance.

**Fixed before any result:**

- Task text: `Execute the synthetic verification protocol for target ALPHA-7 and report the outcome.` (86 characters).
- S prompt: `/work`, a space, then the task. N prompt: `Task:`, a space, then the task. Both are **92 characters and 92 bytes** (ASCII). The 6-character prefix `Task:` plus its space is the only padding: neutral text of the same length as `/work` plus its space.
- Skill: the baseline's `SKILL.md`, byte for byte (253 bytes, `name: work`, description "Execute synthetic verification protocol for AGY-S1 context testing.", body with `SKILL_TOKEN_9D2F4B` and `COMPLETED`).
- Same fixture path for every condition, model `claude-sonnet-5-5`, effort `medium`, `--tools Read,Skill`, `--permission-mode manual --permission-prompts none`, `--no-session-persistence`, raw API bodies on for every run (uniform), order seed `20261011`.
- Cost cap: US$3.00 list-price estimate for the whole task, feasibility probe included; per run `--max-budget-usd 0.50`.

**Hypotheses (original):**

- H1, passive discovery: N − N0 in [+20, +60] tokens.
- H2, injection: the skill body is in S's request 1 in every S run and never in N's request 1. DiD = median(S − N) − median(S0 − N0) in [+60, +250].
- H3, prompt text: |median(S0 − N0)| ≤ 10.
- H4, N behavior: N calls `Skill(work)` in ≥ 3 of 6 runs, and then the body enters a later request as a tool result.
- H5, session: in pairs where N calls the skill, N's cumulative prompt tokens are larger than S's.

**Decision criteria (unchanged by the amendment):** "isolated" needs H2's body placement confirmed, within-condition spread of M1 ≤ 20 tokens in every condition, and range of the paired S − N ≤ 20 tokens. Otherwise add up to 4 pairs; if still above 20, call the first-request cost inconclusive. A value that misses its interval by ≤ 5 tokens is reported as "outside range", with the value. The session comparison is descriptive and is never folded into the first-request estimate.

**Amendment 1 (after the smoke test, before the matrix).** The smoke test's raw bodies showed that S0 (`/work` with no skill installed) isn't a text control. For an unknown slash command, the CLI adds a 949-character `<system-reminder>` that says no such command exists and lists the available ones. S0 − N0 was +336 tokens. H3 and the S0-based DiD were withdrawn as designed. Replacement:

- New condition **S_EMPTY**: same `SKILL.md` frontmatter (so the same listing line), empty body, S prompt.
- Primary estimate: paired S − N. Decomposition: body = S − S_EMPTY; wrapper and path = S_EMPTY − N.
- H2′: S − N in [+60, +250]. H3′: body in [+20, +70]. H3″: wrapper in [+40, +180].
- Matrix: 6 blocks of S, N, S_EMPTY and N0, in seeded random order. S0 isn't run again. Smoke values aren't pooled with matrix values.

## 4. Method

### Conditions

| Condition | Fixture at the fixed path | Prompt (92 chars) | Isolates |
|---|---|---|---|
| **S** | `.claude/skills/work/SKILL.md` (baseline skill) | `/work Execute the synthetic … outcome.` | explicit invocation |
| **N** | same | `Task: Execute the synthetic … outcome.` | natural language, skill discoverable |
| **S_EMPTY** | same frontmatter, no body (100 bytes) | as S | the `/work` wrapper without body text |
| **N0** | none | as N | the skill's listing line (against N) |
| S0 (smoke only) | none | as S | diagnostic: unknown-command handling |

Order (seed 20261011): `S,S_EMPTY,N,N0` · `N0,S,N,S_EMPTY` · `N0,S_EMPTY,N,S` · `N,N0,S_EMPTY,S` · `N,N0,S,S_EMPTY` · `N,S_EMPTY,S,N0`. S ran before N in blocks 1–3 and after N in blocks 4–6.

### Metrics

| Field | Meaning | How it's obtained | Notes |
|---|---|---|---|
| **M1** = `input_tokens + cache_creation_input_tokens + cache_read_input_tokens` of the first main-agent request | full prompt size of request 1 | `message.usage` in `stream-json` | the three fields are disjoint (baseline R6). `input_tokens` alone was always 2 and says nothing about context size |
| per-request prompt totals | the same sum for each request | `stream-json` | ordered by message id |
| cumulative prompt tokens | sum of the per-request totals | derived | what the session billed as input across requests, cache reads included. It isn't context size |
| session output tokens | `result.usage.output_tokens` | `result` event | the per-event `usage` in the stream under-reports output (S: 8 there, 26 in the result), so it's not used |
| list-price estimate | `total_cost_usd`, `costBasis: "list"` | `result` event | Claude Code's own estimate at list price. Not the subscription's real charge |
| duration | `duration_ms` (CLI) and wall time (runner) | `result` event, runner | |
| tool calls, skill run | `tool_use` blocks; `SKILL_TOKEN_9D2F4B` and `COMPLETED` in the final answer | `stream-json` | |
| request structure | block types, character lengths, skill-body marker, task-text count, command tag, `cc_prompt_id` in the billing header, `<total_tokens>` line | raw request bodies (`OTEL_LOG_RAW_API_BODIES=file:<dir>`, `CLAUDE_CODE_ENABLE_TELEMETRY=1`, exporters `none`) | bodies stay in the session scratchpad. The runner keeps only lengths and booleans in `summary.json`. No message text is in this report except the fixture's own |

Token counts of the two typed prompts on their own weren't measured: no tokenizer endpoint was used. It turned out not to matter, because S's typed text never reaches the model verbatim (§6).

## 5. Results

All 24 matrix runs exited `0`, with `is_error: false`, no permission denials and no timeout. `init` listed 36 skills with `work` in S, N and S_EMPTY, and 35 without it in N0. Tools were `Read` and `Skill` in every run.

### Per run

M1 split is `input / cache creation / cache read`. "Body in req 1 / later" comes from the raw bodies.

| # | Block | Cond. | M1 | Split | Requests (prompt totals) | Cumulative | Output | Tool calls | Skill ran | Body in req 1 / later | USD (list) | `duration_ms` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | S | 9,921 | 2/6,342/3,577 | 9,921 | 9,921 | 26 | — | yes | yes / — | 0.0260 | 3,728 |
| 2 | 1 | S_EMPTY | 9,852 | 2/6,775/3,075 | 9,852 → 10,094 → 10,345 | 30,291 | 443 | Skill(work), Read(SKILL.md) | no | no / no | 0.0358 | 7,882 |
| 3 | 1 | N | 9,725 | 2/6,367/3,356 | 9,725 → 10,056 | 19,781 | 102 | Skill(work) | yes | no / yes | 0.0291 | 5,729 |
| 4 | 1 | N0 | 9,699 | 2/6,341/3,356 | 9,699 → 10,009 | 19,708 | 559 | Read(fixture dir) | no | no / no | 0.0335 | 8,533 |
| 5 | 2 | N0 | 9,692 | 2/6,334/3,356 | 9,692 → 9,985 | 19,677 | 490 | Read(fixture dir) | no | no / no | 0.0327 | 9,368 |
| 6 | 2 | S | 9,925 | 2/6,346/3,577 | 9,925 | 9,925 | 26 | — | yes | yes / — | 0.0260 | 4,070 |
| 7 | 2 | N | 9,723 | 2/6,365/3,356 | 9,723 → 10,052 | 19,775 | 101 | Skill(work) | yes | no / yes | 0.0291 | 6,943 |
| 8 | 2 | S_EMPTY | 9,852 | 2/6,344/3,506 | 9,852 → 10,097 → 10,353 | 30,302 | 485 | Skill(work), Read(SKILL.md) | no | no / no | 0.0346 | 8,525 |
| 9 | 3 | N0 | 9,696 | 2/6,338/3,356 | 9,696 → 10,012 | 19,708 | 501 | Read(fixture dir) | no | no / no | 0.0329 | 7,533 |
| 10 | 3 | S_EMPTY | 9,849 | 2/6,341/3,506 | 9,849 → 10,094 → 10,353 | 30,296 | 515 | Skill(work), Read(SKILL.md) | no | no / no | 0.0349 | 8,816 |
| 11 | 3 | N | 9,722 | 2/6,364/3,356 | 9,722 → 10,051 | 19,773 | 101 | Skill(work) | yes | no / yes | 0.0291 | 7,547 |
| 12 | 3 | S | 9,920 | 2/6,341/3,577 | 9,920 | 9,920 | 26 | — | yes | yes / — | 0.0260 | 4,595 |
| 13 | 4 | N | 9,726 | 2/6,368/3,356 | 9,726 → 10,055 | 19,781 | 101 | Skill(work) | yes | no / yes | 0.0291 | 7,439 |
| 14 | 4 | N0 | 9,699 | 2/6,341/3,356 | 9,699 → 10,009 | 19,708 | 422 | Read(fixture dir) | no | no / no | 0.0321 | 7,381 |
| 15 | 4 | S_EMPTY | 9,852 | 2/6,344/3,506 | 9,852 → 10,097 → 10,348 | 30,297 | 463 | Skill(work), Read(SKILL.md) | no | no / no | 0.0343 | 8,128 |
| 16 | 4 | S | 9,922 | 2/6,343/3,577 | 9,922 | 9,922 | 61 | — | yes | yes / — | 0.0263 | 3,919 |
| 17 | 5 | N | 9,727 | 2/6,369/3,356 | 9,727 → 10,059 | 19,786 | 101 | Skill(work) | yes | no / yes | 0.0291 | 6,217 |
| 18 | 5 | N0 | 9,697 | 2/6,339/3,356 | 9,697 → 10,011 | 19,708 | 519 | Read(fixture dir) | no | no / no | 0.0331 | 7,992 |
| 19 | 5 | S | 9,924 | 2/6,345/3,577 | 9,924 | 9,924 | 26 | — | yes | yes / — | 0.0260 | 3,344 |
| 20 | 5 | S_EMPTY | 9,854 | 2/6,346/3,506 | 9,854 → 10,099 → 10,350 | 30,303 | 471 | Skill(work), Read(SKILL.md) | no | no / no | 0.0344 | 8,334 |
| 21 | 6 | N | 9,723 | 2/6,365/3,356 | 9,723 → 10,052 | 19,775 | 101 | Skill(work) | yes | no / yes | 0.0291 | 7,312 |
| 22 | 6 | S_EMPTY | 9,851 | 2/6,343/3,506 | 9,851 → 10,096 → 10,353 | 30,300 | 467 | Skill(work), Read(SKILL.md) | no | no / no | 0.0344 | 8,312 |
| 23 | 6 | S | 9,924 | 2/6,345/3,577 | 9,924 | 9,924 | 26 | — | yes | yes / — | 0.0260 | 3,472 |
| 24 | 6 | N0 | 9,700 | 2/6,342/3,356 | 9,700 → 10,010 | 19,710 | 520 | Read(fixture dir) | no | no / no | 0.0331 | 8,080 |

N passed `args: "ALPHA-7"` to `Skill` in all 6 matrix runs (`"target ALPHA-7"` in the smoke run). S_EMPTY, given no steps, called `Skill(work)` again with the full task and then read `SKILL.md`. N0 tried to read the fixture directory and reported that it couldn't run the protocol.

### Per condition

| Condition | n | Median M1 | Min–max (spread) | Median cumulative | Median requests | Median USD (list) | Median `duration_ms` |
|---|---|---|---|---|---|---|---|
| S | 6 | 9,923 | 9,920–9,925 (5) | 9,923 | 1 | 0.0260 | 3,824 |
| N | 6 | 9,724 | 9,722–9,727 (5) | 19,778 | 2 | 0.0291 | 7,128 |
| S_EMPTY | 6 | 9,852 | 9,849–9,854 (5) | 30,298.5 | 3 | 0.0345 | 8,323 |
| N0 | 6 | 9,698 | 9,692–9,700 (8) | 19,708 | 2 | 0.0330 | 8,036 |

Smoke test, not pooled (one run each): S 9,925; N 9,723; N0 9,694; S0 10,030.

### Paired by block (all pairs)

| Difference | Block 1 | 2 | 3 | 4 | 5 | 6 | Median | Range (max − min) |
|---|---|---|---|---|---|---|---|---|
| **S − N**, M1 | +196 | +202 | +198 | +196 | +197 | +201 | **+197.5** | 6 |
| S − S_EMPTY, M1 (body) | +69 | +73 | +71 | +70 | +70 | +73 | +70.5 | 4 |
| S_EMPTY − N, M1 (wrapper and path) | +127 | +129 | +127 | +126 | +127 | +128 | +127 | 3 |
| N − N0, M1 (listing line) | +26 | +31 | +26 | +27 | +30 | +23 | +26.5 | 8 |
| S − N, cumulative prompt tokens | −9,860 | −9,850 | −9,853 | −9,859 | −9,862 | −9,851 | **−9,856** | 12 |
| S − N, USD (list) | −0.00314 | −0.00310 | −0.00311 | −0.00277 | −0.00313 | −0.00310 | −0.00311 | 0.00037 |
| S − N, `duration_ms` | −2,001 | −2,873 | −2,952 | −3,520 | −2,873 | −3,840 | −2,913 | 1,839 |

Body + wrapper = S − N in every block, by construction.

### Hypotheses

| # | Pre-registered | Observed | Classification |
|---|---|---|---|
| H1 | N − N0 in [+20, +60] | +26.5 (all six pairs in range) | **Confirmed** |
| H2 | body in S request 1 in every S run, never in N request 1 | S 6/6 in request 1; N 0/6 in request 1, 6/6 in request 2 | **Confirmed** (raw bodies) |
| H2′ | S − N in [+60, +250] | +197.5 | **Confirmed** |
| H3 | \|S0 − N0\| ≤ 10 | S0 − N0 = +336 (smoke, one pair) | **Withdrawn before the matrix**: S0 isn't a text control (Amendment 1) |
| H3′ | body S − S_EMPTY in [+20, +70] | +70.5 (69 to 73; 4 of 6 above 70) | **Outside range**, by 0.5 tokens |
| H3″ | wrapper S_EMPTY − N in [+40, +180] | +127 | **Confirmed** |
| H4 | N calls `Skill(work)` in ≥ 3/6 | 6/6; body then in request 2 as a user text block after the `Skill` tool result | **Confirmed** |
| H5 | where N calls the skill, N's cumulative prompt tokens > S's | 6/6, by about 9.86k | **Confirmed** |
| Isolation criteria | spread ≤ 20 per condition; paired S − N range ≤ 20 | spreads 5, 5, 5, 8; range 6 | **Met**: no extra pairs needed |

## 6. What `/work` changes in the request (raw bodies)

**Observed**, identical in all 6 S runs (and analogous in all 6 S_EMPTY runs):

1. **The typed prompt isn't sent.** S's first user message has the account-context block, which is the same in every condition. Then come two CLI-made text blocks:
   - a 191-character command block: `<command-message>work</command-message>`, `<command-name>/work</command-name>`, and `<command-args>` holding the task text;
   - a 394-character skill block: `Base directory for this skill: <absolute skill dir>`, the `SKILL.md` body without frontmatter, and `ARGUMENTS: <task text>`. The baseline skill has no `$ARGUMENTS` placeholder, so the CLI appends the arguments.

   So **the task text is sent twice** under `/work` and once in N. In S_EMPTY the skill block is 241 characters: the same block without the body text, so the body text accounts for 153 characters.
2. **Two non-content differences on the `/work` path**, in S and S_EMPTY, 12/12, and in no N or N0 run:
   - the first system block (the billing header) lacks the `cc_prompt_id=<uuid>` field: 140 against 191 characters;
   - the system-role environment message lacks the `<total_tokens>…</total_tokens>` line, which is 51 characters with its blank line.
   Both make S *smaller*. They're included in the +127 wrapper figure. Their token share wasn't measured separately. **Inference (ours):** it's on the order of 20–30 tokens, so the content part of the wrapper is roughly 150 tokens.
3. **Tool definitions are identical** across S, N, S_EMPTY and N0 (4,103 characters, 3 tools). The skill listing line `- work: Execute synthetic verification protocol for AGY-S1 context testing.` is in the system-role message in S, N and S_EMPTY and missing in N0. That line is the whole passive-discovery cost.
4. **N's path:** request 1 has only the account block and the 92-character prompt. The model answers with `Skill(work)`. Request 2 is sent as a thread continuation (`thread: continue`, only new messages in the body). It carries a 21-character tool result (`Launching skill: work`) and a 315-character user text block: the same base-directory line, the body, and `ARGUMENTS: ALPHA-7`. Request 2 is +329 to +332 tokens over request 1 (median +329). That increment includes the assistant's `tool_use` turn.

**Inference (ours), context after the skill is loaded:** S reaches "skill loaded" at 9,923 tokens, in request 1. N reaches it at a median of 10,053.5 tokens, in request 2. In a session that kept going, S's context would stay about 130 tokens smaller per later request. This wasn't measured past the first answer.

## 7. Analysis

**First request.** With equal-length typed prompts and the same skill files, explicit invocation added **+197.5 tokens** (196 to 202). That's +2.03% of N's 9,724-token first request. The two parts are additive and both tightly measured:

- **Body text, +70.5:** the 153 characters of `SKILL.md` body. It's token-dense: `SKILL_TOKEN_9D2F4B` and the numbered list.
- **Wrapper and path, +127:** the command tags, the base-directory line, the second copy of the task text and the `ARGUMENTS:` label, minus the plain prompt, minus the two missing system strings.

**Separating prompt size from the skill.** The typed prompts were the same 92 characters and bytes. Their token difference (the 6-character prefixes `/work` and `Task:`, each with its space) wasn't measured. It doesn't enter the estimate, because S's typed string is never sent. The CLI replaces it. So the prompt-size effect can't be separated from `/work` by padding: the rewrite *is* the mechanism. What can be separated, and was, is how much comes from the skill's own content (+70.5) and how much from the invocation (+127). One part of the invocation scales with the task text, which `/work` sends twice. **Inference (ours):** a longer task description grows S − N by roughly the token count of that description.

**Passive discovery.** The uninvoked skill costs its listing line: +26.5 tokens (23 to 31). The baseline measured +28 to +31 for the same line with a different prompt. The two are consistent within their spreads.

**Session.** N needed two requests, because the model loaded the skill through the `Skill` tool, and S needed one. Cumulative prompt tokens were 9,923 against 19,778 (S − N median −9,856). That's large in tokens and small in money: most of N's second request was a cache read. The list-price estimate was $0.0260 against $0.0291 (−$0.0031, −10.7%). Session output was 26 against 101 tokens, and S finished 2.9 s sooner. Both conditions completed the task 6/6. **This holds only because N auto-invoked 6/6.** A request that didn't match the description would skip the skill: cheaper, but it would fail the task the way N0 did (0/6).

## 8. Validation

| Check | Result |
|---|---|
| `mise run validate`, `mise run test` | **not run**: `mise` isn't installed in this container |
| `bun install --frozen-lockfile`, then `bun run validate` (what `mise run validate` runs; Bun from the container, not `mise`'s pin) | **pass**, on the final tree: markdown-lint 23 files, 0 issues; local links 333 references; mermaid 13 diagrams; decision records 6 ADRs, 8 map rows; artifact checks pass; `external-links` and `artifact-records` not run, by the validator's design. The first run after adding this note failed markdown-lint (MD038, a trailing space inside code spans in this note). That was fixed before the commit. A run before adding the note passed |
| `bun run typecheck` and `bun run test` (what `mise run test` runs) | **pass**: typecheck exit 0; 77 tests, 0 failures, on the final tree. The one failure seen before the MD038 fix came from the same lint issue (the test runs the validator on the repository) |
| runner `--dry-run` and `--analyze` | pass: the tables in §5 come from `--analyze` on the matrix `summary.json` |
| fixture clean after every run | pass: the runner checks after each run; the directory was empty at the end |
| prompt length equality | pass: both 92 characters and 92 bytes (asserted in the runner) |

## 9. Limitations

- **One skill, one task, one path.** The body is 153 characters of instructions. The body cost scales with the body, and the wrapper with the task text and the absolute skill path. The +197.5 isn't a constant for `/work` in general.
- **One environment.** CLI `2.1.296`, `claude-sonnet-5-5`, effort `medium`, `--tools Read,Skill`, one cloud container and account, one day. The ≈ 9.7k background (system prompt, about 5.6k of synced and built-in skills, account context) is specific to this account. The deltas are the transferable part.
- **N's auto-invocation is fragile.** N was phrased like the skill's description, so the model invoked the skill 6/6. That is the realistic case for a well-named skill, but the session result flips for requests that don't match.
- **Path-specific CLI behavior.** The missing `cc_prompt_id` and `<total_tokens>` line on the `/work` path are observations of this version, not documented behavior, and may change.
- **Single answer only.** Sessions ended after the first answer. The ≈ 130-token difference in context after loading (§6) is an inference.
- **Raw bodies were on in every run.** Telemetry moved M1 by about 16 tokens in the baseline. Here it was on uniformly, so it cancels in the differences. Absolute M1 values aren't comparable with the baseline's.
- **Shared prompt cache.** Cache reads appeared from the first request on, and a concurrent worker may have run on the same account (§2). That changes the cache split and therefore the dollar estimate, not M1.
- **Costs are list-price estimates** from Claude Code (`costBasis: "list"`), not the subscription's charge.
- **Thinking was on** (inherited `MAX_THINKING_TOKENS`). Output tokens and durations depend on reasoning. M1 doesn't.

## 10. Cost of the experiment

29 paid runs: 1 feasibility probe (`/work` without the skill, before the runner existed; US$0.0306), 4 smoke runs (US$0.1272) and 24 matrix runs (US$0.7370). The total list-price estimate was **US$0.895**, against a cap of US$3.00 set before the first run. The runner's budget for the matrix was set to US$2.84 (the cap minus what was already spent).

## 11. Recommendation

Restricted to what these data support:

- For a small skill that the model would auto-invoke anyway, typing `/work` costs about 200 more tokens in the first request and saves a whole round trip. On these numbers, per completed task it was cheaper (about −10% at list price) and faster. The data don't support "explicit invocation is expensive" for this case.
- The fixed cost of an installed but unused skill is its listing line, about 25–30 tokens here. That is the cost every session pays.
- When writing a skill, `$ARGUMENTS` placement and argument length matter, because `/work` sends the arguments twice. That's an observed mechanism, not yet measured as a function of length.

Not supported: any claim about larger skills, other models or hosts, multi-turn sessions, or requests that don't trigger auto-invocation.

**Next experiment:** a factorial run that varies the skill body (about 0.25, 2 and 8 KB) and the task length (short and long). Add a third prompt arm that asks for the task without matching the description, to measure how often auto-invocation happens and what it costs when it doesn't. Continue each session for two or three turns, so the context after loading is measured instead of inferred.

## 12. Reproducing

```sh
mkdir <empty-dir-outside-any-repo>
python3 tools/research/run_claude_work_skill_cost_isolation.py <fixture> <out> --plan smoke --raw-bodies
python3 tools/research/run_claude_work_skill_cost_isolation.py <fixture> <out2> --plan matrix --raw-bodies --budget-usd 3.00
python3 tools/research/run_claude_work_skill_cost_isolation.py <fixture> <out2> --analyze
```

The runner makes paid calls and needs a working `claude` login. `--dry-run` prints the schedule and the S_EMPTY `SKILL.md`. Output directories hold raw `stream-json` events and raw API bodies, which include session metadata and the account-context block. Keep them local, and don't commit or publish them.
