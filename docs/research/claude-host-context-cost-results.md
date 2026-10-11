# Claude Code host: context cost baseline for instructions and skills

**Status:** research note, `proposed`. Not a decision. The owner integrates any conclusion shared with other hosts.
**Task:** `CLAUDE-HOST-CONTEXT-COST-BASELINE`. Claim `refs/heads/task-claims/CLAUDE-HOST-CONTEXT-COST-BASELINE`. Branch `claude/host-context-cost-baseline`, based on `origin/main` at `049b5d6`.
**Run on:** 2026-10-11; matrix runs started between 10:27:37 and 10:31:33 UTC. Claude Code CLI `2.1.296`, in a claude.ai cloud session container (Linux).
**Runner:** [`tools/research/run_claude_host_context_cost.py`](../../tools/research/run_claude_host_context_cost.py).

This note measures what Claude Code adds to the context when a project has a minimal `CLAUDE.md` pointer, when the model reads the referenced document, and when a project skill exists or is invoked. It is the Claude-side counterpart of the Antigravity CLI (`agy`) AGY-S1 experiment. The AGY-S1 audit lives at `docs/research/agy-s1-context-cost-audit.md` on branch `agy/audit-agy-s1-context-cost` (`d969d6c`). That branch isn't merged into `main`, so this note cites it by branch and path and doesn't link it.

Labels used below:

- **Fact (docs):** read in the official Claude Code page named, on 2026-10-11.
- **Observed:** measured in this container in the runs listed here. One environment, one day, one model.
- **Inference (ours):** our reading of the observations, for the owner to check.

## 1. Summary

| # | Hypothesis (pre-registered) | Result | Classification |
|---|---|---|---|
| H1 | A minimal pointer `CLAUDE.md` adds 30–250 tokens to the first request, and the linked document isn't loaded at launch | median +248 tokens (+2.56%), paired 252 / 244 / 247; document token absent 5/5 | **Confirmed** (median inside the range; one paired value, 252, is 2 tokens above it) |
| H1b | An `@path` import loads the document at launch (≥ +30 tokens over the plain pointer) | +145 tokens over the pointer, +393 over the control | **Confirmed** |
| H2a | An explicit "read this file" prompt makes exactly one `Read` call, emits the token, and costs a separate, later increment | 1 `Read` per run, token 3/3, second request +263 to +268 tokens | **Confirmed** |
| H2b | With the pointer, an open prompt ("Verify the test instructions.") leads the model to read the document; without it, it can't | with pointer: read and token 3/3; without: token 0/3 | **Confirmed** |
| H3a | A project skill that isn't invoked adds 10–120 tokens (its listing line) and is not executed | median +31 (paired 28 / 27 / 31); `work` listed 3/3; 0 `Skill` calls; skill token 0/3 | **Confirmed** |
| H3b | `/work` expands the skill and the model follows it | skill token and `COMPLETED` 3/3, in one request, no tool call | **Confirmed** (behavior). The isolated cost of the expanded body is **inconclusive**: the prompt also changed |
| H3c | `--disable-slash-commands` stops the expansion | skill token 0/3 | **Confirmed**, but this isn't a narrow control: it also removed every other skill (35 → 0 in `init`; −6,456 tokens) |
| H4 | First-request size is stable across fresh sessions (spread ≤ 20 tokens) | spread 2–7 tokens per condition | **Confirmed** |

The main comparison, B against A, gave a clear signal at three pairs: the spread within each condition (≤ 7 tokens) is small next to the effect (≈ 250 tokens). So the matrix wasn't extended to five pairs.

## 2. Runtime and documented mechanisms

| # | Label | Claim | Where |
|---|---|---|---|
| R1 | Observed | `claude --version` prints `2.1.296 (Claude Code)`. `claude --help` lists `-p/--print`, `--output-format text\|json\|stream-json` (with `--verbose` for stream-json), `--no-session-persistence`, `--tools`, `--permission-mode` (`manual` among the choices), `--permission-prompts host\|none`, `--disable-slash-commands` ("Disable all skills"), `--max-budget-usd`, `--bare`, `--safe-mode` and `--setting-sources` | local CLI |
| R2 | Fact (docs) | "CLAUDE.md and CLAUDE.local.md files in the directory hierarchy above the working directory are loaded at launch. Files in subdirectories load on demand." | [memory](https://code.claude.com/docs/en/memory) |
| R3 | Fact (docs) | "Imported files are expanded and loaded into context at launch alongside the CLAUDE.md that references them." Imports "don't reduce its context cost". A `CLAUDE.md` "that tells Claude in words to read" another file means "Claude sees [it] only if it decides to open the file" | memory |
| R4 | Fact (docs) | "CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself." `/context` lists loaded files under **Memory files** | memory |
| R5 | Fact (docs) | Project skills live at `.claude/skills/<name>/SKILL.md`. "skill descriptions are loaded into context so Claude knows what's available, but full skill content only loads when invoked." Users invoke one with `/skill-name`; Claude can also load one when the request matches its `description`. `disable-model-invocation: true` keeps the description out of context | [skills](https://code.claude.com/docs/en/skills) |
| R6 | Fact (docs) | OpenTelemetry: `claude_code.token.usage` is a counter "incremented after each API request", with `type` `input`, `output`, `cacheRead`, `cacheCreation`, and "`input` excludes tokens read from or written to the prompt cache". `claude_code.api_request` is one event per API request with the same four token fields. `cost_usd` is "Estimated cost in USD" | [monitoring usage](https://code.claude.com/docs/en/monitoring-usage) |
| R7 | Fact (docs) | `OTEL_LOG_RAW_API_BODIES=file:<dir>` writes untruncated request and response bodies to `.request.json` and `.response.json` files. It's off by default and ignored in project settings | monitoring usage |
| R8 | Observed | In `-p` mode, the prompt `/context` returns the local context breakdown as the `result` with `total_cost_usd: 0` and `num_turns: 0`: no model call | run in the fixture |
| R9 | Observed | In `--output-format stream-json --verbose`, each main-agent `assistant` event carries `message.usage` for that API request (`input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `output_tokens`). The final `result` event carries session totals, `modelUsage[model].costBasis: "list"` and `total_cost_usd` | feasibility run |

OpenTelemetry wasn't needed for the matrix: per-request usage in `stream-json` carries the same four token fields as the `api_request` event (R6, R9). OTel was used once, for the raw request bodies in §6, because it's the documented way to see the context actually sent.

## 3. Background context that couldn't be neutralized

No global setting was changed. The runs inherit this session's account and environment, so every condition shares the following background. **Observed** from `/context`, the `init` event and two raw request bodies (§6):

- **System prompt:** about 1.5k tokens (`/context` estimate), plus an environment block. That block includes the working directory, a per-session scratchpad path with a fresh UUID, the model name and the date.
- **Skill listing:** about 5.6k tokens (`/context` estimate). `/context` shows 30 skill rows: 1 user skill (`~/.claude/skills`), 16 built-in, 13 synced from claude.ai. The `init` event lists 35 skills; the 5 extra entries weren't identified. This listing is about 58% of the control's first request. It isn't the experiment's variable, and it can't be removed without removing all skills (H3c).
- **Account context:** the cloud environment injects an account-context reminder into the first user message. It holds personal data and isn't reproduced here. It's the same in every condition.
- **No user or ancestor instruction files:** no `~/.claude/CLAUDE.md`, no `~/.claude/settings.json`, and no `CLAUDE.md`, `CLAUDE.local.md`, `AGENTS.md` or `.claude` in the fixture directory or any ancestor. The runner checks this before starting.
- **Environment variables:** the child inherits the session's environment, including `CLAUDE_EFFORT=medium`, `MAX_THINKING_TOKENS=31999` and `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` with `CLAUDE_ADDITIONAL_DIRECTORIES=/mnt/user-data`. That directory holds no instruction file; `/context` showed no memory file in the control. The runner removes only the variables that would couple the child to the parent session (session id, SDK URL, messaging socket, stdout tee and similar; list in the runner). It does this in the child's environment only.
- **Not checked:** whether the cloud launcher's own settings file (hooks and permission allow rules) applies to a child `claude -p`. No run had a permission denial, and no hook output appeared in the stream.

## 4. Method

### Fixture and isolation

- **Fixture:** a fresh, empty directory in the session scratchpad, outside any Git repository. All conditions used the **same path**, because the working directory appears in the system prompt. The fixture texts and prompts copy the AGY-S1 runner (`tools/research/run_agy_s1_context_cost.py` on `agy/run-agy-s1-context-cost`); only file names change (`GEMINI.md` → `CLAUDE.md`, `.agents/skills` → `.claude/skills`, `agy-s1-test-instructions.md` → `claude-host-test-instructions.md`).
- **Files:** `CLAUDE.md` (pointer, 237 bytes, plain Markdown link), `CLAUDE.md` (import variant, 178 bytes, `@path` instead of the link), `docs/research/fixtures/claude-host-test-instructions.md` (191 bytes, holds `VERIFICATION_TOKEN_8E3A1C`), `.claude/skills/work/SKILL.md` (253 bytes, body holds `SKILL_TOKEN_9D2F4B`).
- **Per run:** the runner refuses to overwrite, creates only the condition's files, runs `/context` (free), runs the prompt, then deletes exactly the files and directories it created. It stops if anything else is left behind. Nothing was left behind; the empty fixture directory was removed at the end.
- **Session:** each run is a new `claude -p` process with `--no-session-persistence`, `--model claude-sonnet-5-5`, `--effort medium`, `--tools Read,Skill` in every condition (so the tool definitions are constant), `--permission-mode manual --permission-prompts none` (anything that would prompt is denied, nothing is pre-approved), and `--max-budget-usd 0.50` as a guard.
- **Pre-registration:** hypotheses, metric and thresholds were written to a timestamped file (10:27:18Z) before the first matrix run. The table in §1 repeats them unchanged.

### Conditions

| Condition | Fixture | Prompt | Isolates |
|---|---|---|---|
| A, control | none | `Respond with exactly the word READY and do not invoke any tools or inspect files.` | background |
| B, pointer | pointer `CLAUDE.md` + document | same as A | pointer file at launch |
| B_IMPORT, supplementary | `@path` `CLAUDE.md` + document | same as A | eager import, against B |
| C_READ, explicit read | as B | `Read the file docs/research/fixtures/claude-host-test-instructions.md and output its verification token.` | read cost, as a later request |
| C_VERIFY_B / C_VERIFY_A | as B / none | `Verify the test instructions.` | whether the pointer causes the read |
| D, passive skill | skill | same as A | skill listing at launch |
| E, explicit skill | skill | `/work execute test` | expansion and compliance |
| E_NOSLASH, negative control | skill + `--disable-slash-commands` | same as E | the mechanism behind E |

**Order.** Rounds 1–3 alternate the main pairs: A,B,D / D,B,A / A,D,B (A before B twice, after once; the same for A and D). Round 4: B_IMPORT,B,B_IMPORT,B,B_IMPORT. Rounds 5–7 rotate C_READ, C_VERIFY_A and C_VERIFY_B. Rounds 8–10 alternate E and E_NOSLASH. That makes 29 matrix runs, 3 per condition and 5 for B.

### Metrics

| Field | Meaning | Scope | Unit, how obtained | Kind | Comparison limits |
|---|---|---|---|---|---|
| **M1** = `input_tokens + cache_creation_input_tokens + cache_read_input_tokens` of the first main-agent `assistant` event | full prompt size of the first API request | first request | tokens, `stream-json` | official API usage, summed. The three fields are disjoint (R6) | Claude tokenizer and this model only. Includes all background (§3) |
| `input_tokens` | uncached part of the prompt after the last cache breakpoint | per request | tokens | official | always 2 here; meaningless alone, because caching moves the rest |
| `cache_read_input_tokens`, `cache_creation_input_tokens` | prompt tokens served from, or written to, the prompt cache | per request | tokens | official | the split varied across runs (cache read 3,075–3,739 on the first request), because cached prefixes are reused across sessions. Compare only the sum (M1) |
| **M2** = M1 of request *n+1* − M1 of request *n* | context added by one tool round trip: the assistant's `tool_use` turn plus the `tool_result` | per round trip | tokens, derived | derived from official fields | includes what Claude Code carries back from the assistant turn |
| `output_tokens` | generated tokens, thinking included | per request or session | tokens | official | thinking is on (inherited budget), so it varies with reasoning, not context |
| session totals in `result.usage` | sums over all requests of the session | session | tokens | official | cumulative: a two-request session counts the shared prefix twice. It isn't context size |
| `/context` table | Claude Code's own breakdown (System prompt, Memory files, Skills, Messages) | before the first request | tokens, rounded "k" | **estimate** (the page says "Estimated usage by category") | excludes the wrapper text around memory files (§6) |
| `total_cost_usd`, `costBasis: "list"` | dollar figure at list price | session | USD | **estimate** | not the subscription's real charge (D4 evidence, T14) |

## 5. Results

### Per run

`M1` is the first-request prompt size. `Requests` lists the prompt size of each main-agent request in order. Paths are shown relative to the fixture.

| # | Round | Condition | M1 | input / cache creation / cache read | Requests | Tool calls | Markers in reply | Session output | List-price estimate (USD) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | A | 9,676 | 2 / 6,599 / 3,075 | 9,676 | — | READY | 4 | 0.0267 |
| 2 | 1 | B | 9,928 | 2 / 6,851 / 3,075 | 9,928 | — | READY | 3 | 0.0278 |
| 3 | 1 | D | 9,704 | 2 / 6,353 / 3,349 | 9,704 | — | READY | 4 | 0.0258 |
| 4 | 2 | D | 9,708 | 2 / 6,357 / 3,349 | 9,708 | — | READY | 4 | 0.0258 |
| 5 | 2 | B | 9,925 | 2 / 6,330 / 3,593 | 9,925 | — | READY | 4 | 0.0257 |
| 6 | 2 | A | 9,681 | 2 / 6,330 / 3,349 | 9,681 | — | READY | 4 | 0.0257 |
| 7 | 3 | A | 9,677 | 2 / 6,326 / 3,349 | 9,677 | — | READY | 4 | 0.0257 |
| 8 | 3 | D | 9,708 | 2 / 6,357 / 3,349 | 9,708 | — | READY | 4 | 0.0258 |
| 9 | 3 | B | 9,924 | 2 / 6,329 / 3,593 | 9,924 | — | READY | 4 | 0.0257 |
| 10 | 4 | B_IMPORT | 10,070 | 2 / 6,993 / 3,075 | 10,070 | — | READY | 4 | 0.0283 |
| 11 | 4 | B | 9,921 | 2 / 6,326 / 3,593 | 9,921 | — | READY | 4 | 0.0257 |
| 12 | 4 | B_IMPORT | 10,071 | 2 / 6,330 / 3,739 | 10,071 | — | READY | 4 | 0.0257 |
| 13 | 4 | B | 9,926 | 2 / 6,331 / 3,593 | 9,926 | — | READY | 4 | 0.0257 |
| 14 | 4 | B_IMPORT | 10,065 | 2 / 6,324 / 3,739 | 10,065 | — | READY | 4 | 0.0257 |
| 15 | 5 | C_READ | 9,934 | 2 / 6,857 / 3,075 | 9,934 → 10,202 | Read `docs/…/claude-host-test-instructions.md` | VERIFICATION | 548 | 0.0353 |
| 16 | 5 | C_VERIFY_A | 9,664 | 2 / 6,587 / 3,075 | 9,664 → 9,950 | Read `.` (a directory) | — | 427 | 0.0330 |
| 17 | 5 | C_VERIFY_B | 9,906 | 2 / 6,829 / 3,075 | 9,906 → 10,171 | Read `docs/…/claude-host-test-instructions.md` | VERIFICATION | 847 | 0.0382 |
| 18 | 6 | C_VERIFY_B | 9,907 | 2 / 6,329 / 3,576 | 9,907 → 10,175 | Read `docs/…/claude-host-test-instructions.md` | VERIFICATION | 959 | 0.0373 |
| 19 | 6 | C_READ | 9,927 | 2 / 6,325 / 3,600 | 9,927 → 10,190 | Read `docs/…/claude-host-test-instructions.md` | VERIFICATION | 180 | 0.0295 |
| 20 | 6 | C_VERIFY_A | 9,664 | 2 / 6,330 / 3,332 | 9,664 → 9,951 → 10,458 | Read `.`, then `README.md` and `CLAUDE.md` (both absent) | — | 603 | 0.0368 |
| 21 | 7 | C_VERIFY_A | 9,661 | 2 / 6,327 / 3,332 | 9,661 → 9,946 → 10,460 | Read `.`, then `README.md` and `CLAUDE.md` (both absent) | — | 635 | 0.0372 |
| 22 | 7 | C_VERIFY_B | 9,903 | 2 / 6,325 / 3,576 | 9,903 → 10,168 | Read `docs/…/claude-host-test-instructions.md` | VERIFICATION | 1,013 | 0.0378 |
| 23 | 7 | C_READ | 9,928 | 2 / 6,326 / 3,600 | 9,928 → 10,191 | Read `docs/…/claude-host-test-instructions.md` | VERIFICATION | 380 | 0.0315 |
| 24 | 8 | E | 9,853 | 2 / 6,333 / 3,518 | 9,853 | — | SKILL, COMPLETED | 26 | 0.0259 |
| 25 | 8 | E_NOSLASH | 3,397 | 2 / 1,839 / 1,556 | 3,397 | — | — | 206 | 0.0096 |
| 26 | 9 | E_NOSLASH | 3,399 | 2 / 599 / 2,798 | 3,399 | — | — | 109 | 0.0038 |
| 27 | 9 | E | 9,852 | 2 / 6,332 / 3,518 | 9,852 | — | SKILL, COMPLETED | 58 | 0.0263 |
| 28 | 10 | E | 9,854 | 2 / 6,334 / 3,518 | 9,854 | — | SKILL, COMPLETED | 26 | 0.0260 |
| 29 | 10 | E_NOSLASH | 3,393 | 2 / 593 / 2,798 | 3,393 | — | — | 339 | 0.0060 |

Every run exited `0` with `is_error: false` and `permission_denials: 0`. The `init` event listed the `work` skill in D and E (36 skills) and not in the others (35, or 0 under `--disable-slash-commands`).

### Aggregates

| Comparison | Medians | Absolute difference | % of the reference | Paired by round |
|---|---|---|---|---|
| B − A | 9,925 − 9,677 | **+248** | +2.56% | +252, +244, +247 (median +247) |
| B_IMPORT − B | 10,070 − 9,925 | **+145** | +1.46% | — |
| B_IMPORT − A | 10,070 − 9,677 | +393 | +4.06% | — |
| D − A | 9,708 − 9,677 | **+31** | +0.32% | +28, +27, +31 (median +28) |
| C_READ − B (first request only) | 9,928 − 9,925 | +3 | +0.03% | — |
| C_VERIFY_B − C_VERIFY_A (first request only) | 9,906 − 9,664 | +242 | +2.50% | — |
| E − D (first request; prompt also differs) | 9,853 − 9,708 | +145 | +1.49% | — |
| E_NOSLASH − E | 3,397 − 9,853 | −6,456 | −65.5% | — |

| Within-run increment (M2) | Values | Median |
|---|---|---|
| C_READ, one `Read` of the 4-line document | +268, +263, +263 | **+263** |
| C_VERIFY_B, one `Read` of the same document | +265, +268, +265 | +265 |
| C_VERIFY_A, failed `Read` of the directory | +286, +287, +285 | +286 |
| C_VERIFY_A, two failed reads of absent files (2 of 3 runs) | +507, +514 | — |

Spread (max − min) of M1 within each condition: A 5, B 7, B_IMPORT 6, C_READ 7, C_VERIFY_A 3, C_VERIFY_B 4, D 4, E 2, E_NOSLASH 6.

**Cumulative against initial.** A one-read session (C_READ) sums 20,117–20,136 prompt tokens over its two requests. C_VERIFY_A runs that explored without success summed 19,614 and about 30,070. Those sums are what the session billed as input across requests, cache reads included. They aren't context size: the context at the end of C_READ is about 10,190 tokens.

## 6. What the pointer actually adds (raw request bodies)

Two diagnostic runs, A and B, were repeated with `CLAUDE_CODE_ENABLE_TELEMETRY=1` and `OTEL_LOG_RAW_API_BODIES=file:<dir>` (R7). This changes the background slightly: M1 was 9,660 and 9,905, Δ = 245. The bodies stayed in the session scratchpad and aren't published, because they include the account-context block. **Observed:**

- The system blocks, the tool definitions and the system-role environment message are identical between A and B, except for two per-session strings: the `cc_prompt_id` in the billing header block, and the scratchpad UUID in the environment block. Those two strings are the likely source of the 2–7 token spread within a condition.
- B has exactly **one extra content block** at the start of the first user message: 595 characters, wrapped in `<system-reminder>`. It contains:
  1. a fixed preamble: "Codebase and user instructions are shown below. Be sure to adhere to these instructions. IMPORTANT: These instructions OVERRIDE any default behavior and you MUST follow them exactly as written."
  2. `Contents of <absolute path>/CLAUDE.md (project instructions, checked into the codebase):`. The absolute fixture path is 86 characters here.
  3. the file's text, **with the HTML comment `<!-- g-inga:host-pointer -->` removed**.
- The linked document doesn't appear anywhere in B's request. That confirms H1 by direct inspection, not only by marker absence.

**Inference (ours):** `/context` puts the file itself at 88 tokens. The remaining ≈ 160 tokens of the +248 come from the preamble and the absolute path. That split is a subtraction, not a separate measurement. A practical consequence: the fixed cost of having *any* project `CLAUDE.md` is roughly 150+ tokens of wrapper, and it grows with the length of the project path. An HTML comment marker in `CLAUDE.md` costs nothing and isn't visible to the model.

## 7. Findings by mechanism

| Mechanism | Finding | Evidence |
|---|---|---|
| File loading at launch | The pointer `CLAUDE.md` is loaded every session, in a wrapper, as a user-message block. The plain-link target is not loaded | B − A +248; §6; document token 0/5 in B |
| Eager import | `@path` loads the target at launch. `/context` lists it as a second memory file (81 tokens, next to 64 for the `CLAUDE.md`) | B_IMPORT − B +145 |
| Actual read of the document | Happens only as a tool call, in a later request, at about +263 tokens for this 4-line file | C_READ, C_VERIFY_B (M2) |
| Pointer causing the read | With an open prompt, the pointer was enough for the model to find and read the document 3/3. Without it, the model probed the directory and guessed `README.md` and `CLAUDE.md` 3/3, never found the token, and in 2 of 3 runs spent an extra request | C_VERIFY_B vs C_VERIFY_A |
| Skill discovery | An uninvoked project skill adds only its listing line (`/context`: ~30 tokens; measured +28 to +31). No `Skill` call; body not executed | D |
| Skill invocation | `/work` is expanded by the CLI before the request: the skill ran in one request, with no `Skill` tool round trip, and the model emitted both instructed outputs 3/3 | E |
| Instruction compliance | The document's token was emitted whenever the document was read (6/6), and the skill's steps whenever it was expanded (3/3). The "do not invoke any tools" prompt was obeyed in all 14 neutral-prompt runs | markers; tool calls |
| Slash-command disabling | `--disable-slash-commands` removes the whole skill listing (35 → 0 skills, −6,456 tokens), not just the `/work` expansion. The model then answered that `/work` "isn't installed" | E_NOSLASH |

## 8. Comparability with the Antigravity CLI (AGY-S1)

The AGY-S1 audit reports, for `agy` 1.3.2: pointer +128 tokens in its turn 0; skill catalog entry +51; `/work` skill block +115; a `view_file` read that put about 434 tokens into the history; and a `--disable-slash-commands` control 127 tokens below the `/work` condition. This note used the same fixture texts and prompts. **The two sets of numbers are not directly comparable**, for these reasons:

- **Different tokenizers and models.** The same bytes give different token counts. Claude runs used `claude-sonnet-5-5`; the AGY runs used a Gemini model.
- **Different instruments.** Here, M1 is the API's own per-request usage, summed over three disjoint fields, plus raw request bodies. AGY-S1 used counters in `agy`'s internal transcript (`transcript_full.jsonl`), whose semantics were reconstructed by its audit. The two fields have the same name ("input") but aren't known to measure the same thing.
- **Different wrappers.** Claude wraps `CLAUDE.md` in a preamble with the absolute path (§6), and that accounts for most of the +248. Whatever `agy` wraps `GEMINI.md` in wasn't measured the same way. A pointer-cost comparison across hosts is mostly a wrapper comparison.
- **Different negative control.** In `agy`, `--disable-slash-commands` removed only the skill block (−127). In Claude Code it removes every skill (−6,456), so E_NOSLASH isn't a like-for-like counterpart of AGY's C3c.
- **Different skill invocation.** Claude expands `/work` client-side into the first request. AGY-S1's C3b sessions ran 10 to 21 steps, so the per-session totals aren't comparable either.

What *is* comparable, qualitatively: in both hosts a plain-link pointer is loaded at launch while its target isn't, and the target is read only through a separate tool step. In both, an uninvoked skill costs a short listing line. Claude Code also offers `@path` for eager loading, which the AGY-S1 fixtures didn't test.

## 9. Limitations

- One container, one CLI version (`2.1.296`), one model, one day. Three runs per condition (five for B).
- The background (§3) includes about 5.6k tokens of synced and built-in skills and an account-context block. Absolute numbers (M1 ≈ 9.7k) are specific to this account and environment. The deltas are the transferable part.
- The CLAUDE.md wrapper cost depends on the absolute path length. Repeating the runs at another path will shift B − A.
- H3b's isolated token cost wasn't measured: the E prompt differs from D's. Measuring it would need a prompt-matched pair, such as `/work` against a plain prompt of the same length. The whole `SKILL.md` was 253 bytes.
- Thinking was on (inherited `MAX_THINKING_TOKENS`), so `output_tokens` and the cumulative totals of multi-request sessions vary with reasoning. M1 doesn't depend on it.
- Prompt caching was shared across sessions (cache reads on the first request). That changes the input/cache split, not M1.
- The diagnostic raw-body runs had telemetry on, which moved M1 by about 16 tokens. They support §6 only, not the aggregates.

## 10. Cost of the experiment

33 paid runs: 1 feasibility, 1 runner smoke test, 29 matrix runs and 2 raw-body diagnostics. Plus 31 local `/context` calls, which cost nothing. Claude Code's list-price estimate totals about **US$0.90** (`costBasis: "list"`): matrix 0.780, others 0.118. That's an estimate, not the subscription's charge. No quota limit was hit.

## 11. Reproducing

```sh
mkdir <empty-dir-outside-any-repo>
python3 tools/research/run_claude_host_context_cost.py <empty-dir> <output-dir-outside-the-repo>
```

The runner needs a working `claude` login and makes paid calls. It writes raw `stream-json` files and `summary.json` to the output directory. Those files contain session metadata, and the `Read` paths are absolute, so don't commit them. `--only COND ...` runs single conditions, and `--dry-run` prints the schedule. The raw-body check in §6 isn't part of the runner. To repeat it, set `CLAUDE_CODE_ENABLE_TELEMETRY=1`, `OTEL_LOGS_EXPORTER=console` and `OTEL_LOG_RAW_API_BODIES=file:<dir>` for one A and one B run, then diff the first user message.
