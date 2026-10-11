# Claude Code host: marginal cost of explicit skill invocation

**Status:** research note, `proposed`. Not a decision. Input for the owner's choice of G-Ingá's orchestration format.
**Task:** `CLAUDE-SKILL-INVOCATION-MARGINAL-COST`. Claim `refs/heads/task-claims/CLAUDE-SKILL-INVOCATION-MARGINAL-COST`. Branch `claude/skill-invocation-marginal-cost`, based on `claude/host-context-cost-baseline` at `9283d4c` (not merged into `main`).
**Run on:** 2026-10-11; matrix runs started between 10:47:27 and 10:50:12 UTC. Claude Code CLI `2.1.296`, `claude-sonnet-5-5`, the same cloud container, account background and method as the [context cost baseline](claude-host-context-cost-results.md).
**Runner:** [`tools/research/run_claude_host_context_cost.py`](../../tools/research/run_claude_host_context_cost.py) `--schedule invocation`.

## 1. Question

The baseline showed that a project skill costs a short listing line when it exists, and that `/work` makes the model follow it. It didn't isolate what the explicit invocation adds, because the `/work` prompt also differed from the control's prompt. The question here is narrower: **how much does explicit invocation cost beyond what Claude Code already loads, or would discover, without it?** It is answered against three references:

1. **Nothing invoked:** the skill exists, and only its listing line is paid.
2. **Natural invocation:** the user asks for the task in words. The model finds the skill in the listing and calls the `Skill` tool.
3. **Manual-only skill:** `disable-model-invocation: true` keeps the skill out of the listing, so only `/work` can load it (Fact (docs): [skills](https://code.claude.com/docs/en/skills), "The description is kept out of context, and the full skill loads only when you invoke it").

The method relies on one property: the first request's prompt size (M1) is fixed by the input before the model acts. A control whose prompt is the same text **without the slash** (`work execute test` against `/work execute test`) therefore isolates the expansion. That holds even when the model then behaves differently.

## 2. Summary

| # | Hypothesis (pre-registered at 10:47:05 UTC, before the smoke test and the matrix) | Result | Classification |
|---|---|---|---|
| H5 | Explicit expansion: M1(`/work execute test`) − M1(`work execute test`) is 40–250 tokens; one request; skill followed 3/3 | **+166** (paired 166 / 168 / 167); 1 request; 3/3 | **Confirmed** |
| H6 | Natural invocation calls `Skill(work)` ≥ 2/3, follows it ≥ 2/3, needs ≥ 2 requests, and the round trip adds 60–400 tokens | `Skill(work)` 3/3; followed 3/3; 2 requests; **+281 / +284 / +287** | **Confirmed** |
| H7 | End to end, natural invocation sends ≥ 1.8× the cumulative prompt tokens of explicit invocation | 19,704 vs 9,854 (median): **2.00×** | **Confirmed** |
| H8 | A manual-only skill has no listing cost (\|ΔA\| ≤ 10), still runs with `/work` 3/3, is never invoked from a natural prompt (0/3), and costs the same expansion | −3 vs control; `/work` 3/3; natural 0/3 with failure; expansion within 2 tokens of the prediction | **Confirmed** |
| H9 | First-request spread ≤ 20 tokens in each arm | 1–7 | **Confirmed** |

**Answer.** Here, explicit invocation adds **166 tokens to the request that invokes the skill**, and nothing to the requests before it. Natural invocation of the same skill costs an extra API request: the cumulative prompt doubles (+9.85k tokens, mostly cache reads), the output grows from 8 to 43 tokens, and the context grows by about **+284** instead of +166. Keeping the skill discoverable costs a listing line of **about +24 tokens** (paired +22 / +24 / +35) on every request of every session, used or not. Making the skill manual-only removes that line, at the price of losing natural discovery: the model then failed the natural prompt 3/3.

## 3. Arms

All arms use one fresh fixture directory (the same path throughout) and the same 253-byte `SKILL.md` as the baseline. The manual-only arms add one frontmatter line, `disable-model-invocation: true`.

| Arm | Skill | Prompt | Role |
|---|---|---|---|
| I_A | none | neutral (`Respond with exactly the word READY …`) | background |
| I_D | default | neutral | listing cost (I_D − I_A) |
| I_DM | manual-only | neutral | listing removed? (I_DM − I_A) |
| I_Q | default | `work execute test` | prompt-matched control for I_X |
| I_X | default | `/work execute test` | explicit invocation |
| I_XM | manual-only | `/work execute test` | explicit invocation, no listing |
| I_N | default | `Execute the synthetic verification protocol for AGY-S1 context testing.` (the skill's own description, as a request) | natural invocation |
| I_NM | manual-only | same as I_N | natural request, skill not discoverable |

Three rounds of eight runs. Rounds 1 and 3 rotate the order; round 2 reverses it, so I_Q/I_X, I_A/I_D and I_N/I_NM each swap order at least once. That makes 24 matrix runs. The session settings are unchanged from the baseline (§4 there): `--tools Read,Skill`, `--permission-mode manual --permission-prompts none`, no permission denial in any run.

## 4. Results

### Per run

M1 is the first request's prompt size, the sum of input, cache creation and cache read. "Cumulative" sums the prompt size over all requests in the session.

| # | Round | Arm | M1 | Requests | Round trip | Cumulative prompt | Output | Tool calls | Skill followed | List-price estimate (USD) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | I_A | 9,684 | 1 | — | 9,684 | 4 | — | — | 0.0257 |
| 2 | 1 | I_D | 9,706 | 1 | — | 9,706 | 4 | — | — | 0.0258 |
| 3 | 1 | I_DM | 9,683 | 1 | — | 9,683 | 4 | — | — | 0.0257 |
| 4 | 1 | I_Q | 9,688 | 2 | +281 | 19,657 | 43 | `Skill(work)` | yes | 0.0296 |
| 5 | 1 | I_X | 9,854 | 1 | — | 9,854 | 8 | — | yes | 0.0277 |
| 6 | 1 | I_XM | 9,828 | 1 | — | 9,828 | 8 | — | yes | 0.0258 |
| 7 | 1 | I_N | 9,707 | 2 | +281 | 19,695 | 43 | `Skill(work)` | yes | 0.0286 |
| 8 | 1 | I_NM | 9,681 | 2 | +341 | 19,703 | 269 | `Read` of the fixture directory | no | 0.0327 |
| 9 | 2 | I_DM | 9,679 | 1 | — | 9,679 | 4 | — | — | 0.0257 |
| 10 | 2 | I_D | 9,707 | 1 | — | 9,707 | 4 | — | — | 0.0258 |
| 11 | 2 | I_A | 9,683 | 1 | — | 9,683 | 4 | — | — | 0.0257 |
| 12 | 2 | I_NM | 9,680 | 2 | +356 | 19,716 | 218 | `Read` of the fixture directory | no | 0.0324 |
| 13 | 2 | I_N | 9,710 | 2 | +284 | 19,704 | 43 | `Skill(work)` | yes | 0.0286 |
| 14 | 2 | I_XM | 9,828 | 1 | — | 9,828 | 8 | — | yes | 0.0258 |
| 15 | 2 | I_X | 9,856 | 1 | — | 9,856 | 9 | — | yes | 0.0263 |
| 16 | 2 | I_Q | 9,688 | 2 | +281 | 19,657 | 43 | `Skill(work)` | yes | 0.0286 |
| 17 | 3 | I_N | 9,711 | 2 | +287 | 19,709 | 43 | `Skill(work)` | yes | 0.0286 |
| 18 | 3 | I_NM | 9,678 | 2 | +342 | 19,698 | 201 | `Read` of the fixture directory | no | 0.0320 |
| 19 | 3 | I_A | 9,677 | 1 | — | 9,677 | 4 | — | — | 0.0257 |
| 20 | 3 | I_D | 9,712 | 1 | — | 9,712 | 4 | — | — | 0.0258 |
| 21 | 3 | I_DM | 9,680 | 1 | — | 9,680 | 4 | — | — | 0.0257 |
| 22 | 3 | I_Q | 9,687 | 2 | +281 | 19,655 | 43 | `Skill(work)` | yes | 0.0286 |
| 23 | 3 | I_X | 9,854 | 1 | — | 9,854 | 8 | — | yes | 0.0259 |
| 24 | 3 | I_XM | 9,827 | 1 | — | 9,827 | 8 | — | yes | 0.0258 |

"Skill followed" means the reply contained both `SKILL_TOKEN_9D2F4B` and `COMPLETED`. Every I_NM reply said no definition of the protocol could be found.

### Aggregates

| Comparison | Medians (M1) | Δ | % | Paired by round | What it measures |
|---|---|---|---|---|---|
| I_D − I_A | 9,707 − 9,683 | **+24** | +0.25% | +22, +24, +35 | listing line, paid on every request |
| I_DM − I_A | 9,680 − 9,683 | −3 | −0.03% | −1, −4, +3 | manual-only removes the listing |
| I_X − I_Q | 9,854 − 9,688 | **+166** | +1.71% | +166, +168, +167 | explicit expansion, over a skill already listed |
| I_XM − I_DM | 9,828 − 9,680 | +148 | +1.53% | — | the same, with a different prompt in the control |
| I_XM − I_A | 9,828 − 9,683 | +145 | +1.50% | — | everything a manual-only skill costs when used, prompt included |
| I_N − I_D | 9,710 − 9,707 | +3 | +0.03% | — | natural prompt, before the model acts |

| Session totals (median) | Requests | Cumulative prompt | Output | List-price estimate (USD) |
|---|---|---|---|---|
| I_X, explicit | 1 | **9,854** | 8 | 0.0263 |
| I_XM, explicit, manual-only | 1 | 9,828 | 8 | 0.0258 |
| I_N, natural | 2 | **19,704** (2.00×) | 43 | 0.0286 |
| I_Q, bare name without slash | 2 | 19,657 | 43 | 0.0286 |
| I_NM, natural, not discoverable | 2 | 19,703 | 218 | 0.0324 (task failed) |

Within-arm spread of M1: 1–7 tokens.

**Unplanned observation.** The bare-name control I_Q (`work execute test`) also led the model to call `Skill(work)` 3/3. That doesn't affect H5, because M1 is fixed before the model acts. It does show that naming the skill in plain words is enough for natural invocation when the skill is listed.

## 5. What is injected (raw request bodies)

One diagnostic run each of I_Q, I_X and I_N was repeated with `OTEL_LOG_RAW_API_BODIES=file:<dir>` (method as in the baseline, §6). The bodies stay in the session scratchpad. **Observed:**

- **Explicit (`/work execute test`).** The first user message carries two extra blocks in place of the plain prompt text:
  - command tags: `<command-message>work</command-message>`, `<command-name>/work</command-name>`, `<command-args>execute test</command-args>` (117 characters);
  - `Base directory for this skill: <absolute path>/.claude/skills/work`, the skill body **without its frontmatter**, and `ARGUMENTS: execute test` (314 characters).
- **Natural.** The first request is the plain prompt. After the model's `Skill` call, the next request carries a `tool_result` with the text `Launching skill: work`, plus a text block with the same base directory line and frontmatter-less body (289 characters, no `ARGUMENTS`).
- **Continuation requests aren't self-contained.** From the second request on, the body has only the new user turn, plus `thread: {type, previous_message_id}`. The earlier turns, including the assistant's `Skill` tool call, are carried server-side. `usage` still reports the full prompt: cache read on request 2 equals about the whole of request 1. So, past the first request, the context must be measured from `usage`, not reconstructed from request bodies.

**Inference (ours).** The +166 is the command tags, the base-directory line and the body. It grows with the skill body and with the absolute project path, as the `CLAUDE.md` wrapper did in the baseline. The natural round trip's ≈ +284 is the assistant's tool call (thinking included), the tool result, and the same body block. It costs about 120 tokens more than the explicit form for the same body. Both stay in the context for later turns.

## 6. Reading for orchestration design

**Inference (ours).** These points are for the owner to weigh; none is a decision.

- **Explicit invocation is the cheapest way to load a known procedure.** It adds the body once, in the request where it's needed, with no extra round trip. Over a skill that is already listed, the marginal cost was +166 tokens and 0 extra requests.
- **Natural invocation costs a whole extra request.** In a one-step task, that doubled the cumulative prompt and multiplied output by about 5. On a subscription the extra request is mostly cache reads, but it still uses a turn, latency and quota. In a long session the relative cost is smaller, because the prefix is resent on every request anyway. The fixed cost per invocation, ≈ +284 tokens of context, remains.
- **Being discoverable has a standing price.** The listing line, about 24 tokens here, is paid on every request of every session, whether the skill is used or not. It scales with the description's length. The account in this test already carries about 5.6k tokens of listings (baseline §3).
- **Manual-only skills are an option for steps that are always triggered by the harness or the user.** They cost zero until invoked and then the same as explicit invocation. They can't be found by the model: a natural request for the procedure failed 3/3, after an extra exploratory request.

## 7. Limitations

- One skill (253 bytes), one model, one CLI version, one container and one day; three runs per arm. The +166 and ≈ +284 will scale with body size and project path length. The listing cost scales with the description.
- One-step tasks only. The share of the extra natural request in a multi-turn session wasn't measured.
- I_D − I_A was +24 here, against +28 to +31 in the baseline at a different fixture path. The paired values range from +22 to +35. Treat the listing cost as about 20–35 tokens for this description.
- Thinking was on (inherited budget). It affects output and the round-trip size, not M1.
- `--permission-prompts none` didn't block the `Skill` tool. Whether other permission setups prompt for it wasn't checked.
- List-price estimates aren't the subscription's charge. Prompt caching shared across sessions shifts them by run order, as in run 5 (0.0277) against runs 15 and 23 (0.0263, 0.0259).

## 8. Cost of the experiment

28 paid runs: 1 smoke test (I_N), 24 matrix runs and 3 raw-body diagnostics. Plus 25 local `/context` calls, which cost nothing. Claude Code's list-price estimate totals about **US$0.77** (matrix 0.659). No quota limit was hit.

## 9. Reproducing

```sh
mkdir <empty-dir-outside-any-repo>
python3 tools/research/run_claude_host_context_cost.py <empty-dir> <output-dir-outside-the-repo> --schedule invocation
```

Same requirements and cautions as the baseline (§11 there). The raw-body check in §5 isn't part of the runner.
