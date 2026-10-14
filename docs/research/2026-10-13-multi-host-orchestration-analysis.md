# Multi-Host Orchestration Analysis

Date: 2026-10-13. Status: analysis only, no implementation.
Sources consulted: `antigravity.google/docs/faq/`, `antigravity.google/docs/plans/`, `antigravity.google/docs/models/`, `opencode.ai/docs/*`, `opencode.ai/v2/docs/console/*`, `code.claude.com/docs/*`, `platform.claude.com/docs/en/about-claude/pricing`, `claude.com/pricing`, local `agy --help` and `agy models` output. All web sources fetched 2026-10-13.

## 1. Context

Owner runs three islands:

- Claude Pro + Claude Code for autonomous coding, architecture, hard debugging.
- Google AI Pro (consumer, not Enterprise) + Antigravity for scaffolds and mid-size tasks. Local `agy models` shows `gemini-3.8-flash-{low,medium,high}`, `claude-sonnet-5-5-*`, `claude-opus-5-5-*`, `gpt-oss-120b-medium`.
- OpenCode as elastic layer with own billing (Zen pay-per-token, Go subscription, direct API keys, OpenRouter, local Ollama).

Quotas for Claude Code and Antigravity exhaust in 1-2 days of heavy use. Goal is not autocomplete. Goal is agents that edit files, run commands, implement features, run tests, and fix failures with minimal manual intervention.

Cost function: maximize verified tasks completed per month within a fixed extra budget, with minimal human intervention. Cost per approved task matters, not cost per token.

## 2. Verified facts

### 2.1 Claude Pro

- Pro $20/mo, Max 5x $100/mo, Max 20x $200/mo. Two windows: rolling 5h session + fixed weekly. Web + Claude Code share the same quota.
- Subscription != API. `ANTHROPIC_API_KEY` set switches billing to API. Max includes $100/$200 API credits/month but they do not cover interactive terminal/IDE.
- Subagents (`Task`/`Agent` tool, `Explore`/`Plan`/`general-purpose`, custom `.claude/agents/*.md`) and Agent Teams all bill to the same quota. Teams cost scales ~linearly, docs cite ~7x tokens vs single session in plan mode.
- `claude -p` for scripting is intended use. Spawning `claude -p` from a shell orchestrator stays first-party (Claude Code talking to Anthropic).
- No published message/token counts per window. Third-party numbers are not usable for planning.

### 2.2 Antigravity consumer (AI Pro)

- AI Pro is a consumer plan (4x limits, shared Flash+Pro weighted quota, 5h refresh until weekly cap). It is not Enterprise and not an API key.
- FAQ, verbatim: "Using third-party software, tools, or services to access Antigravity is a violation of our Terms of Service ... can result in suspension or termination. To use a third-party coding agent with Gemini, we recommend using a Gemini Enterprise or Google AI Studio API key."
- FAQ, verbatim: "Antigravity CLI headless mode (`agy -p`) is intended for direct scripting and CI workflows. Wrapping `agy` inside third-party coding agents or applications, or automating account rotation, is not supported under consumer plans."
- Local CLI confirms headless flags: `-p/--print`, `--model`, `--effort low|medium|high|xhigh|max`, `--mode accept-edits|plan`, `--output-format text|json|stream-json`, `--add-dir`, `--continue/--conversation`, `--sandbox`.
- Consequence: `agy` is a manual island. Orchestrated Gemini must use `GEMINI_API_KEY` (AI Studio pay-per-token), Vertex, or Enterprise — separate billing, allowed to wrap.

### 2.3 OpenCode

- `opencode -p` / `opencode run` is built for orchestration. No policy issue spawning it from a shell CLI.
- No `antigravity-oauth` or `claude-pro-oauth` provider exists. Pro/Max OAuth in third-party tools was removed in 1.3.0. Valid providers: Anthropic API key, `opencode/<id>` Zen pay-per-request (no markup, +4.4%+$0.30 reload fee), `opencode-go/<id>` Go $10/$40 single-member open-models only, OpenRouter, any OpenAI-compatible baseURL (Ollama/vLLM), `google` via `GEMINI_API_KEY`.
- No automatic cross-provider failover in core. Only OpenRouter `order/allow_fallbacks` and Go balance fallback.
- This repository's harness already has the right primitives: `/drive` L1 backlog driver, `/orchestrate` L2 OODA + 5-layer gate + `verify-gate.ts --pre-dispatch` + `partitionWaves` + `worktree-runner.ts`, `/work` L3 scoped execution, `tasks/*.md` + `specs/*.md` as canonical truth, `## Checkpoint` + `resume.md`, token ceilings light 5k / standard 25k / heavy 60k.

### 2.4 Repository truth (checked 2026-10-13)

- Remote `origin git@github.com:EduardoShibukawa/G-Inga.git`, `visibility PUBLIC`, `isPrivate false`.
- Third-party in Google ToS means anything that is not Google Antigravity itself. Owner-written harness still counts as third-party application when it pilots `agy` as a backend. Public visibility does not change the legal reading but increases detection and secret-leak surface.

## 3. Inferences and hypotheses

- Biggest invisible cost is context re-send: long sessions re-transmit history every request. Thin handoff packets (2-4k tokens) beat session resume via transcript dump.
- Parallelism multiplies throughput only when scopes are disjoint. Same-repo parallel workers without worktree isolation collide on `.git/index.lock` and merge conflicts.
- Cheapest per-token model is not cheapest per approved task. Weak tool-calling loops burn retries and hit the E3 circuit breaker (2 fails without new evidence).
- Review by a different model than the author catches contract and security misses cheaper than a second pass by the same model.

## 4. What must not be built

- No `ginga run --host agy` auto-spawn consuming consumer quota.
- No account rotation, no parallel `agy` farm to multiply weekly quota.
- No secrets, transcripts, or full-repo dumps in handoff files or logs (ADR 0006).
- No new `epics/` top-level store that bypasses `schema: task/1` validation. Epic/Feature must map to heavy parent / standard child or go through an explicit schema-major migration.

## 5. Open questions for the proposal

- Is Gemini-orchestrated work allowed to bill to a separate `GEMINI_API_KEY`, or must Gemini stay 100% manual via `agy`?
- What is the hard monthly extra budget (R$50/100/200/400 scenarios already modeled)?
- Is local GPU available for private Qwen 30B review tasks?
