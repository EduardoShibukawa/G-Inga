# Gemini CLI and Antigravity Host Decision Review (Post-Spike G-S1)

**Status:** audit and architectural decision preparation note. Not a decision.  
**Date:** 2026-10-10.  
**Audited commit:** `a5f39eb0fad1dda2210ae9993b003835d45215ce` on branch `gemini/spike-g-s1-context-pointer`.  
**Repository working branch:** `claude/kind-pasteur-bd8bq3`.  
**Deciders:** project owner (pending).

---

## 1. Executive summary

This review audits the experimental results of Spike G-S1 (`GEMINI-GS1-CONTEXT-POINTER`, recorded in `gemini-cli-gs1-results.md` on branch `gemini/spike-g-s1-context-pointer`) and evaluates the architectural host options for Google developer tools in G-Ingá.

### 1.1 Qualitative confidence assessment

- **Legacy Gemini CLI eligibility failure (High):** High confidence in the reproducibility of the access failure. All 6 headless runs of `@google/gemini-cli@0.63.0` (3 in Condition A, 3 in Condition B) failed deterministically during authentication/onboarding with `IneligibleTierError` / `UNSUPPORTED_CLIENT` (or onboarding HTTP 429), directly corroborating Google's official announcement (May 19, 2026) that sunsetted individual free/Pro tiers on June 18, 2026.
- **Antigravity CLI context pointer behavior (Moderate):** Moderate confidence. In the single run evaluated per condition ($N=1$), the model quoted the pointer targets (`/work`, `tasks/`, `specs/`, four-state verification vocabulary). However, this single-turn observation does not provide statistical proof of robustness across diverse prompts, multi-turn conversations, context compaction, or autonomous tool executions.
- **Architectural recommendation to defer a second host in V1 (High):** High confidence. Grounded firmly in [ADR 0001](../decisions/0001-product-boundary.md) (personal SDLC harness scoped to Claude Code first), avoiding the premature complexity, maintenance burden, and security risks of adapting to an evolving upstream platform without a logged friction.

### 1.2 Key findings

1. **Observed behavioral response on Antigravity CLI ($N=1$):** When executed in Google Antigravity CLI (`agy@1.3.2`), a concise 9-line `GEMINI.md` guided the model in a single evaluated turn to the authoritative entry point (`/work`), artifact paths (`tasks/`, `specs/`), the 4-state verification vocabulary (`pass`, `fail`, `blocked`, `not run`), and the working principles in [docs/principles.md](../principles.md). Without `GEMINI.md`, the model fell back to `CLAUDE.md` and omitted `/work`. However, an $N=1$ sample demonstrates single-turn instructional adherence under controlled conditions, not statistical proof of agentic robustness.
2. **Upstream deprecation of legacy Gemini CLI for individual subscriptions:** All 6 runs attempted on `@google/gemini-cli@0.63.0` (3 in Condition A without pointer, 3 in Condition B with pointer) aborted during client onboarding prior to model invocation with `IneligibleTierError` / `UNSUPPORTED_CLIENT` or HTTP 429 during onboarding. On May 19, 2026, Google announced that Gemini CLI and Gemini Code Assist for individuals would stop serving requests on June 18, 2026, transitioning individual users to Antigravity CLI. Gemini CLI access remains available only for enterprise licenses (Standard/Enterprise) and paid API keys.
3. **The 100-token marginal cost hypothesis was NOT validated:** The spike could not isolate a marginal delta of $\le 100$ tokens in `agy`. With base input tokens exceeding 130,000, prompt caching exceeding 290,000 tokens, and stochastic thinking tokens (~6,000–7,000 tokens), small token deltas cannot be measured with an $N=1$ sample.
4. **Validation pass does not constitute architectural validation:** The passing results of `mise run validate` and `mise run test` confirm only repository syntax, markdownlint compliance, contract JSON schema integrity, and internal link consistency. They do not validate the host runtime hypothesis or operational viability.
5. **Architectural options compared:** Three options are evaluated: Option A (Antigravity CLI as host for individual subscriptions), Option B (dual adapters for legacy Gemini CLI enterprise and Antigravity CLI individual), and Option C (postpone all Gemini/Google adapter work, keeping G-Ingá scoped exclusively to Claude Code in V1 as defined in [ADR 0001](../decisions/0001-product-boundary.md)).
6. **Provisional recommendation:** **Option C** is recommended for V1 to maintain project focus, avoid dual-host maintenance drag, and adhere to [ADR 0001](../decisions/0001-product-boundary.md). Deferring the Google host in V1 does not constitute a permanent rejection of Antigravity CLI for future milestones if justified by logged frictions.

---

## 2. Git state and exact provenance

The experimental work of Spike G-S1 was conducted in an isolated Git worktree and has not been merged to `main`.

- **Base commit of the spike branch:** `c318d41` (branch `gemini/GEMINI-HOST-EVIDENCE-REVIEW`, which branched from `b98c169` and `ca42673`).
- **Spike commit:** `a5f39eb0fad1dda2210ae9993b003835d45215ce` (`docs(research): record Spike G-S1 experimental results (GEMINI-GS1-CONTEXT-POINTER)`).
- **Spike worktree location:** `/home/tg/Projetos/G-Inga-spike-g-s1` on local branch `gemini/spike-g-s1-context-pointer`.
- **Remote tracking:** `origin/gemini/spike-g-s1-context-pointer`.
- **Divergence from `origin/main`:**
  - `origin/main` is at `c850689` (Merge PR #7, introducing ADR 0006 for D4 observability).
  - The working repository (`/home/tg/Projetos/G-Inga`) is on branch `claude/kind-pasteur-bd8bq3` (`7f830e4`), containing uncommitted local evidence from the D4 spike.
  - The spike commit `a5f39eb` does not include PR #7 or subsequent D4 documentation.
- **Independence preserved:** The spike branch remains completely unmerged. No git merge, rebase, commit, or push was performed during this audit.

---

## 3. Critical verification of spike evidence and limitations

### 3.1 Separation of measurements, interpretations, and conclusions

| Category | Finding / Statement | Critical Assessment |
|---|---|---|
| **Observed measurement** | `@google/gemini-cli@0.63.0` exited with code `1` in 6 out of 6 runs (3 in Condition A, 3 in Condition B) with `IneligibleTierError` / `UNSUPPORTED_CLIENT` (or onboarding HTTP 429). | **Confirmed fact for individual accounts.** Verified locally across 6 runs and corroborated by Google's public sunset announcement. The CLI reported zero tokens in its exit payload because the process aborted during authentication/onboarding before model invocation; client-side HTTP attempts occurred, while any upstream quota or backend tracking remained unobservable from the client. |
| **Observed measurement** | In `agy@1.3.2`, Condition A (no `GEMINI.md`, $N=1$) recorded 146,239 input tokens, 293,906 cache read tokens; Condition B (with `GEMINI.md`, $N=1$) recorded 130,786 input tokens, 361,259 cache read tokens. | **Confirmed fact for single runs.** Raw values observed in the single run executed per condition. |
| **Observed measurement** | In `agy@1.3.2`, Condition B ($N=1$) quoted `/work`, `tasks/`, `specs/`, and `pass/fail/blocked/not run` verbatim and navigated to `docs/principles.md`. | **Confirmed fact for that single run.** Model output verified verbatim for that isolated execution. |
| **Interpretation** | The token delta $(B - A = -15,453\text{ input}, +67,353\text{ cache read})$ reflects caching and prompt assembly noise rather than pointer size. | **Plausible interpretation, but methodologically weak.** A single comparison ($N=1$) cannot establish causality when prompt caching and thinking token generation fluctuate by tens of thousands of tokens. |
| **Interpretation** | The pointer mechanism received a "10/10" score in active runtime. | **Subjective interpretation.** Instructional adherence was high in that single turn, but robustness across diverse prompts, multi-turn conversations, tool executions, and compactions remains unmeasured. |
| **Conclusion** | Gemini CLI v0.63.0 is "REPROVADO". | **Confirmed for individual personal accounts.** The client cannot invoke models under individual Google AI Pro OAuth. It is not an agent instruction failure, but an upstream access block. Enterprise and paid API tiers remain supported upstream. |
| **Conclusion** | Antigravity CLI context pointer is "APROVADO COM RESSALVAS". | **Partially supported.** Supported in single-turn instructional behavior; unsupported regarding the quantitative $\le 100$ token ceiling criterion. |

### 3.2 Sample size and comparability limitations

1. **Six failures on legacy Gemini CLI under reported conditions:** Across 3 runs without `GEMINI.md` and 3 runs with `GEMINI.md`, `@google/gemini-cli@0.63.0` failed consistently during onboarding, preventing any evaluation of its prompt handling or token usage under individual Google AI Pro authentication.
2. **Extreme sample limitation on Antigravity CLI ($N=1$ per condition):** Evaluating complex agentic behavior and token consumption from a single execution per condition provides an initial behavioral signal, but is statistically insufficient to prove instructional robustness or context stability.
3. **Asymmetric comparison across runtimes:** Condition A and Condition B in `gemini-cli` failed at auth, while Condition A and Condition B in `agy` succeeded. Comparing `gemini-cli` with `agy` is not an A/B test of the same host; it compares a discontinued Node.js CLI against an active Go-based multi-agent runtime.
4. **Token semantics and caching dynamics:** In `agy`, input tokens, cache read tokens, and thinking tokens interact non-linearly. The reported difference of $-15,453$ raw input tokens was offset by $+67,353$ cache read tokens. Neither number represents the true marginal cost of a 9-line file (~40 tokens).
5. **The 100-token limit was NOT validated:** Acceptance criterion 1.2 of Spike G-S1 explicitly specified: $\Delta \text{Tokens} \le 100 \text{ tokens}$. Because this delta could not be measured against the background context noise, the quantitative threshold remains **unvalidated**.
6. **Experimental evidence vs. deterministic repository validation:** Passing `mise run validate` and `mise run test` verifies Markdown syntax, JSON schema constraints, and link validity in repository documentation. It does not provide empirical evidence that an external CLI runtime satisfies G-Ingá's operational requirements.

### 3.3 Root cause of failure: access eligibility vs. functional capability

It is critical to distinguish between:

- **Upstream authentication/eligibility gate:** `@google/gemini-cli@0.63.0` failed because Google's Cloud Code endpoint (`cloudcode-pa.googleapis.com/v1internal:onboardUser`) returned `UNSUPPORTED_CLIENT` for the `oauth-personal` tier (`free-tier` / individual Google AI Pro).
- **Agent functional capability:** The CLI did not fail due to a bug in parsing `GEMINI.md`, a tool dispatch error, or an inability to follow instructions. For enterprise customers with a Google Cloud project license or developers with paid Gemini API keys, `@google/gemini-cli` remains operational upstream.

---

## 4. Primary documentation of Antigravity CLI

Authoritative documentation and specifications for Google Antigravity CLI (`agy`) were verified:

### 4.1 Google Developers Blog (May 19, 2026)

- **Source:** [An important update: Transitioning Gemini CLI to Antigravity CLI](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/)
- **Authors:** Dmitry Lyalin (Group Product Manager) and Taylor Mullen (Principal Engineer).
- **Verified claims:**
  - Gemini CLI transitioned to Antigravity CLI (`agy`), built in Go with asynchronous multi-agent orchestration.
  - On June 18, 2026, Gemini CLI and Gemini Code Assist IDE extensions ceased serving requests for Google AI Pro, Google AI Ultra, and individual free accounts.
  - Enterprise customers with Gemini Code Assist Standard/Enterprise or paid API keys maintain unchanged access to Gemini CLI.
  - Core features preserved: Agent Skills, Hooks, Subagents, and Extensions (rebranded as Antigravity plugins).

### 4.2 Antigravity CLI binary and permissions model (`agy@1.3.2`)

- **Binary:** `/usr/bin/agy`, version `1.3.2`.
- **Non-interactive execution:** Flags `-p`, `--print`, or `--prompt` execute a single turn without TUI.
- **Output formatting:** `--output-format text|json|stream-json`.
- **Permissions and security implications of `--dangerously-skip-permissions`:**
  - In headless mode, tool invocations require `--dangerously-skip-permissions` to bypass interactive confirmation prompts.
  - This is an architectural security and governance concern, not a resolved operational detail: passing `--dangerously-skip-permissions` circumvents human approval boundaries required by [ADR 0001](../decisions/0001-product-boundary.md) and [contract](../artifact-contracts.md) §7. Without this flag, non-interactive execution cannot run tools.
- **Modes:** `--mode accept-edits|plan`.
- **Configuration path:** `~/.gemini/antigravity-cli/settings.json`.

### 4.3 Workspace rules and context hierarchy

- **Sources:** `antigravity.google/docs/rules-workflows` and offline reference in `agy-customizations/docs/rules.md`.
- **Rule discovery:** Automatically loads `GEMINI.md` and `AGENTS.md` by walking upward from the working directory to the repository root.
- **Per-file limit:** 24 KB (24,000 bytes).
- **Aggregate budget:** 20,000 tokens (`defaultRulesBudget`). Over-budget rules are demoted from inline text to file path pointers.
- **Workspace customizations:** Discovered in `.agents/` at repository root.

---

## 5. Architectural options comparison

| Dimension | Option A: Antigravity CLI (`agy`) as host | Option B: Dual paths (Antigravity + legacy Gemini CLI) | Option C: Postpone Gemini adapter (Claude Code only for V1) |
|---|---|---|---|
| **Concept** | Target `agy` as the sole Google host for G-Ingá, replacing `gemini-cli` across the board. | Support `agy` for individual subscriptions and `gemini-cli` for enterprise GCP / API keys. | Defer all Google/Gemini host implementation. Keep G-Ingá strictly scoped to Claude Code in V1. |
| **G-Ingá contract compatibility** | Partial / unverified at scale. While `GEMINI.md` conveyed the pointer in a single turn, multi-turn state preservation and validator execution were not tested. | Divergent and risky. Both CLIs require separate driver logic, different config paths, and divergent execution models, increasing contract drift risk. | Scoped to Claude Code as defined in [ADR 0001](../decisions/0001-product-boundary.md). Concentrates effort on native Claude Code primitives where tooling is verified. |
| **Context and token budget** | Base context >130k tokens; heavy caching. Micro-budgets ($\le 100$ tokens) cannot be isolated or governed. | Heterogeneous and unpredictable across two different runtimes. Incompatible context baselines. | Single baseline: Claude Code per-turn footprint (~40–60 tokens for pointer) under observable token accounting. |
| **Maintenance cost** | High. Requires developing, testing, and continuously updating an adapter for a rapidly moving multi-agent platform (`agy@1.3.2` in 2026). | Prohibitive. Requires maintaining two separate drivers, permission flags, configuration structures, and telemetry parsers simultaneously. | Zero additional host maintenance during V1. Avoids splitting engineering focus and prevents maintenance overhead for a secondary host. |
| **Security and permissions** | Unresolved permission model in headless mode: requires `--dangerously-skip-permissions` to execute tools without prompts, conflicting with human approval boundaries ([contract](../artifact-contracts.md) §7). | Fragmented permission models: `gemini-cli` uses `--approval-mode yolo`; `agy` uses `--dangerously-skip-permissions`. Both bypass human-in-the-loop controls. | Governed natively by Claude Code permission modes, tool pre-approvals, and auto-mode classifier with human confirmation intact. |
| **Vendor lock-in** | Coupled to Google Antigravity desktop/CLI platform and Go runtime harness. | Coupled simultaneously to two separate Google developer platforms. | Confined to Claude Code native primitives as accepted in ADR 0001; no secondary vendor dependency. |
| **Distribution impact** | Customizations go to `.agents/` and `GEMINI.md`. | Requires dual bundle structure (`.agents/` and `.gemini/`). | Pinned bundle in target repository for Claude Code as proposed in [ADR 0005](../decisions/0005-native-primitive-mapping.md). |
| **Missing evidence** | Extensive: Telemetry schema in `agy` unverified; multi-turn context compaction unmeasured; subagent delegation semantics unverified; permission automation without bypass unverified. | Extensive across both hosts: all Option A gaps plus enterprise GCP ADC execution, API key quota tracking, and dual-driver stability. | No secondary host evidence required for V1. Research remains archived and available for future evaluation. |

---

## 6. Review of the context cost hypothesis in ADR 0005

In [ADR 0005](../decisions/0005-native-primitive-mapping.md) §Decision item 3, the context pointer is specified as:

> "One pointer in the instructions loaded every session, with no routing rules in it. It says three things:
>
> - changes to a deliverable go through `/work`;
> - open work is in `tasks/`;
> - results use `pass`, `fail`, `blocked` and `not run`.
>
> The routing rule exists only in the skill. Whether the pointer goes in the target repository's `CLAUDE.md` or somewhere else follows FU1."

### Evaluation

1. **ADR 0005 sets no numerical token ceiling:** The $\le 100$ tokens per turn limit was introduced solely in the Gemini spike specification (`gemini-cli-host-review.md` §9 on branch `gemini/GEMINI-HOST-EVIDENCE-REVIEW`). ADR 0005 deliberately avoids premature numeric limits, keeping token limits as `guideline` per [ADR 0003](../decisions/0003-minimum-artifact-schemas.md).
2. **Pointer brevity is already achieved:** The prototype `GEMINI.md` is only 9 lines (321 bytes, ~45 tokens). In any tokenization scheme, the static file content is well under 100 tokens.
3. **Conclusion for ADR 0005:** **No amendment to ADR 0005 is required or justified.** ADR 0005 remains in `proposed` status. Attempting to encode host-specific token overheads or Antigravity runtime caching characteristics into ADR 0005 would violate separation of concerns and product boundary constraints ([ADR 0001](../decisions/0001-product-boundary.md)).

---

## 7. Provisional recommendation and pending owner decisions

### Provisional recommendation

1. **Adopt Option C for the V1 milestone:**
   - Keep G-Ingá's product boundary strictly focused on Claude Code, as accepted in [ADR 0001](../decisions/0001-product-boundary.md).
   - Do not implement host adapters, hooks, or multi-host routing in V1.
   - Archive the research on Gemini CLI and Antigravity CLI as exploratory evidence without merging it to `main`.
   - Clarify that choosing Option C is not a permanent rejection of Google Antigravity CLI for future milestones; it preserves project focus until a logged friction justifies multi-host complexity.
2. **If and when a Google host is pursued (Post-V1 or by explicit owner directive):**
   - Consider **Option A (Antigravity CLI `agy`)** as the plausible technical target for Google AI Pro, while abandoning `@google/gemini-cli` due to upstream deprecation for individual accounts.
   - Any future adoption of `agy` must first address the open security implications of `--dangerously-skip-permissions` and establish an empirical token baseline appropriate for its multi-agent context footprint.

### Pending owner decisions

The project owner must decide:

1. **Scope boundary (D1 confirmation):** Does the owner confirm that G-Ingá V1 remains exclusively hosted on Claude Code, deferring Google Antigravity CLI to a post-V1 milestone (Option C)?
2. **Google host strategy (if Option C is rejected):** If the owner requires running G-Ingá on their Google AI Pro subscription now, does the owner approve pivoting the research target from `@google/gemini-cli` to Google Antigravity CLI `agy` (Option A)?
3. **Enterprise Gemini CLI relevance:** Does the owner have any requirement for paid API keys or enterprise Google Cloud project licenses that would warrant maintaining legacy `gemini-cli` support (Option B)?
4. **Disposal of spike worktree:** Does the owner approve deleting the experimental worktree `/home/tg/Projetos/G-Inga-spike-g-s1` and keeping the research notes archived on branch `gemini/spike-g-s1-context-pointer` without merging to `main`?

---

## 8. Primary references verified

| Reference | Source / URL | Revision / Date | State | What was learned |
|---|---|---|---|---|
| Google Developers Blog: CLI Transition | <https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/> | 2026-05-19, live page fetched 2026-10-10 | verified (read in full) | Sunset of `gemini-cli` for individual accounts on June 18, 2026; transition to Antigravity CLI; enterprise access preserved. |
| Antigravity CLI Reference | `https://antigravity.google/docs/cli/reference`, `references/cli.md` | 2026-10-10 | verified (local docs & CLI help) | Headless flags (`-p`, `--output-format`), permission bypass (`--dangerously-skip-permissions`), config path `~/.gemini/antigravity-cli/settings.json`. |
| Antigravity Customizations & Rules | `https://antigravity.google/docs/rules-workflows`, `agy-customizations/docs/rules.md` | 2026-10-10 | verified | `GEMINI.md` / `AGENTS.md` directory rules, 24 KB file limit, 20,000-token rules budget (`defaultRulesBudget`). |
| Spike G-S1 Results | `gemini-cli-gs1-results.md` | commit `a5f39eb`, 2026-10-10 | verified | Experimental runs on `gemini-cli` (6 auth failures) and `agy` (2 runs, behavioral adherence observed). |
| Gemini CLI Host Review | `gemini-cli-host-review.md` | commit `c318d41`, 2026-10-10 | verified | Original specification and acceptance criteria for Spike G-S1. |

---

## 9. Validations executed and not executed

### Executed validations

- `mise run validate`: **`pass`**
  - `markdown-lint`: pass (22 files, 0 issues)
  - `local-links`: pass (348 local references in 24 files)
  - `mermaid`: pass (13 diagrams rendered)
  - `decision-records`: pass (6 ADRs, 8 map rows)
  - `artifact-contract-sync`: pass
  - `artifact-contract-examples`: pass
  - `artifact-rule-fixtures`: pass (40 fixtures checked)
- `mise run test`: **`pass`** (77 tests passed, 0 failures)
- `claude --version`: `2.1.296 (Claude Code)`
- `gemini --version`: `0.63.0`
- `agy --version`: `1.3.2`

### Not executed validations

- `mise run validate:external`: **`not run`** (network check skipped per repository convention).
- Live execution on `gemini-cli` under enterprise GCP ADC: **`not run`** (no enterprise credentials available in environment).
- Production task execution: **`not run`** (M0 specification phase; no production code implementation).
