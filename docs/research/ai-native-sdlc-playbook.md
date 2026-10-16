# The AI-native SDLC Playbook (Anthropic) — research note

Date: 2026-10-15. Status: research only, no implementation, no product-code changes.
Primary source: <https://claude.com/resources/articles/the-ai-native-sdlc-playbook> (fetched 2026-10-15).
Companion PDF: <https://cdn.prod.website-files.com/6889473510b50328dbb70ae6/6aba736348bdf4f08183f463_AI%20Native%20SDLC%20Playbook_designv2%20\(1\).pdf>

## Metadata

- **Title:** The AI-native SDLC playbook — *How to transform your software development lifecycle with AI—stage by stage*
- **Author:** Louis Claxton (Anthropic Applied AI team; contributors Jim Blackhurst, Will Steuk, Jamal Arif)
- **Org/type:** Anthropic, official article (Best practices category)
- **Product scope:** Claude Enterprise, Claude Code, Claude Tag
- **Published:** August 21, 2026. Reading time ~40 min. The playbook is also distributed as a PDF.
- **Inspection method:** full live page read from the rendered HTML (saved fetch, ~1,530 lines); navigation chrome excluded. No secondary summaries used as evidence.

## Executive summary

The playbook argues that once code is no longer the bottleneck, the SDLC must be rebuilt around AI at every stage: a **linear process becomes a loop**, each stage ends by committing one artifact that the next stage reads, and humans stay in the loop at the gates rather than at every step. Most of its concrete machinery (intent.md, spec.md, plan.md, hooks, subagents, worktrees, CLAUDE.md, skills, PR review, evals, control bands) is *already described in G-Ingá's own docs*; the article's value here is as a **cross-check and vocabulary source** for our artifact-chain, governance and validator trade-offs, not as a new dependency. State: **inspected (live page)**, not verified against a pinned revision (the page is unversioned HTML).

## What the article is

1. **Premise.** Build is no longer the constraint; plan/review/test/deploy still run at human speed, line-by-line review cannot keep up once agents write most of the diff, and governance-by-meeting gets intractable. Security example: reviewers sized for human output either build a queue or ship under-reviewed.
2. **Definition.** "AI-native SDLC" = the same six stages (Plan, Design, Build, Test, Deploy, Maintain) reimagined as a non-linear loop with automated handover between plays; AI embedded at each point; humans accountable for judgement.
3. **Committed-artifact chain (the audit trail).** Each stage ends by writing one artifact to version control and the next begins by reading it: `intent.md` → `spec.md` → `plan.md` → diff + tests → PR with review findings → incident record. Early stages are `.md` because both product owner and agent can read/act on them; from Build onward the artifact is code and its records. The chain of commits is the audit trail (who asked, what the agent produced, who approved). Humans remain accountable for every judgement decision.
4. **Plays.** Modular steps grouped into six stages; adoptable in any order; each play lists prerequisites (dependency graph) and leading/lagging metrics.
5. **Traditional vs AI-native table** (six stages) — reproduced in §"Traditional vs AI-native" below.
6. **Close the loop.** A breached control band in production writes the next `intent.md`; a merged PR triggers the pipeline; an accepted `intent.md` triggers the requirements/design pass.

## Stages, plays and artifacts (compact)

| # | Stage | Play (headline) | Key artifact written | Triggers next |
|---|---|---|---|---|
| 01 | Plan | Capture as `intent.md` | `intent.md` (problem, outcome, affected users/systems, constraints, open questions) | product owner accept → Design |
| 02 | Design | Requirements and design in one session, policy applied via skills | `spec.md` (alongside `intent.md`) | spec accept → Build/plan mode |
| 03 | Build | Plan mode default; auto mode once guardrails mature; CLAUDE.md, skills, hooks guardrails, parallel sessions + subagents | `plan.md` (+ CLAUDE.md, skills, hooks, agent defs) | implementation complete |
| 04 | Test | Feedback loop (Claude verifies own work); continuous evals in CI | test/build/screenshot evidence in session + PR checks | green checks |
| 05 | Deploy | AI in PR review loop (REVIEW.md passes); hooks as approval gates; managed settings; CI/CD integration | PR + review findings | merge → Maintain hooks |
| 06 | Maintain | Closing the loop (control bands → `intent.md`); recurring scans (Claude Security); Claude Tag on-call | incident record / `intent.md` | back to Plan |

## The traditional vs AI-native table (verbatim summary)

| Stage | Traditional SDLC | AI-native SDLC |
|---|---|---|
| Plan | Requirements by committee, workshops, sign-offs, handoffs | Claude synthesizes pain points from sources into `intent.md` — human-readable, machine-actionable |
| Design | Spec by analysts, then designers parse it | Requirements + design compressed into one agent session, guided by skills (brand, security, compliance, UX), versioned in git |
| Build | Code/tests/docs hand-written; docs after | Tests and code generated by AI; institutional knowledge as versioned `CLAUDE.md` and skills |
| Test | QA gates at stage boundaries | Continuous evals woven through implementation |
| Deploy | Humans review every line; governance in inconsistent review cycles | Layers of agentic review; human review reserved for regulated/critical code; governance enforced as AI acts, **hooks as approval gates** |
| Maintain | Humans watch production | Agents monitor live deployments; breached control band is diagnosed and written back as new `intent.md` |

## Dependency graph (prerequisites / adoption order)

Plays are **not** adopted in stage order. The article separates (a) stage membership from (b) adoption order via a dependency graph: "Start with any clay play — nothing points into it, so it needs nothing first. For any other play, the arrows pointing into it are the plays to adopt before it."

- **No prerequisites:** Capture as `intent.md` (Plan); CLAUDE.md; Skills (none required; CLAUDE.md helps); feedback loop (Test); hooks as approval gates (Deploy, none); parallel sessions/subagents (Build) only really needs CLAUDE.md + feedback loop.
- **Build guardrails chain:** hooks-as-build-guardrails (fast/scoped) + permission tuning; plan mode → `plan.md`.
- **Design** needs `intent.md` writers + skills encoding brand/security/compliance/UX policies.
- **CI/CD integration and deployment** requires: AI in PR review loop + hooks as approval gates ("gates must exist before automation accelerates anything through them").
- **Closing the loop / maintenance** requires: `intent.md` format, accelerated PR reviews, hooks as action boundary, rollback path.
- **Continuous evals in CI** requires: CLAUDE.md + feedback loop + CI that can run Claude non-interactively + budget.

Adoption discipline stated: start with one play ("capture as intent.md" is the seed), then add gates; human attention concentrates at gates reviewing what the agent flagged.

## Subagents and parallel sessions (Build)

- **Parallel sessions** = full Claude Code instances per task, each in its own **git worktree** on its own branch; independent sessions share nothing except the steering engineer. Escalate from 2–3 to ceiling of reviewable concurrent streams.
- **Subagents** = scoped helpers inside one session with their own context window and tool limits (`.claude/agents/<name>.md` with name, description, tools). Examples: code simplifier (post-finish), verifier (runs app, reports only, no fixes), researcher.
- Configuration in repo applies to all sessions (hooks/permissions); activity attributed to the engineer running it.
- Metrics: concurrent sessions per engineer while review quality holds; changes merged/engineer/week alongside rework rate.

## Hooks as guardrails and approval gates

- **Build-time guardrails (advisory vs deterministic):** skills are advisory; hooks are the deterministic layer behind them. Build hooks: block edits to protected paths (generated classes, frozen packages); run formatter/linter after edits; keep credentials out of the diff. Must be fast and file-scoped. Heavier checks belong at commit/PR. Approval prompts during build put a human back on the critical path → reserve approval hooks for Deploy.
- Concrete numbers: exit 2 blocks an action; hook block explains itself (reason + route to approval) in Claude's output.
- **Approval gates (Deploy):** engineering leadership + change management lists surviving approval gates (change-management sign-off, release authorization, protected-path edits). Each gate becomes a hook (allow/ask/block) in `.claude/settings.json` (team) or **managed settings** (non-negotiable, engineers can't switch off). Block includes reason and approval route.
- **Managed settings for regulated enterprises:** deny secrets/network egress, allow safe inner loop, disable bypass permissions, OS-level sandbox with fail-if-unavailable, credentials deny reads, `allowManagedHooksOnly`, `strictKnownMarketplaces`, `allowManagedMcpServersOnly`, `requiredMinimumVersion`. Each deny trades capability; tailor to data classification.

## Governance / accountability

- Humans remain accountable for every decision requiring judgement; human attention shifts along with artifacts.
- Separation of duties: the agent that writes code cannot approve it. Branch protection still requires code-owner approval; findings inform but do not (by default) approve/block.
- Every stage's artifact + prompt that produced it + skill versions in force are logged in version control. Hooks' allow/block decisions logged with timestamp. PRs are the audit record.
- Deterministic controls: skills (advisory) → hooks (deterministic) → review passes (agentic, ranked by severity) → human code-owner approval via branch protection → managed settings for non-negotiables.
- Regulated path: production deploys require named release authorization (`RELEASE_APPROVAL`); per-environment permission tiers (dev free, production gated by release manager, staging middle).
- Evaluation/feedback: evals per production incident written by owning team and retained as regression tests; incidents generate evals; scan findings (Claude Security) go through PR gate.
- Audit posture: "committed artifact chain … is also the audit trail"; all artifacts note linkage IDs/commit SHAs where legacy systems are source of truth (legacy vs repo source-of-truth discussion).
- Analytics: Compliance API, OpenTelemetry export, status line, `/usage`.

## Metrics (playbook lists leading/lagging per play)

- **Plan (capture as intent.md):** leading = time from first conversation to committed `intent.md` (hours vs multi-week). Lagging = survival rate (share accepted into Design); number of `intent.md` edits after first `spec.md` commit.
- **Design:** leading = elapsed `intent.md` commit → `spec.md` commit vs old cycle. Lagging = requirements rework after build starts (spec commits after first `plan.md`).
- **Build (plan mode):** leading = share of changes merged from first implementation pass + time plan-approval → merged PR (required PR metadata). Lagging = rework cycles/change; how often merged diff still matches `plan.md`.
- **Build (subagents/parallel):** leading = concurrent sessions while review quality holds; share of day spent steering. Lagging = changes merged/engineer/week alongside rework rate.
- **Feedback loop (Test):** leading = first-pass CI success for agent-written changes. Lagging = review time per PR; change failure rate.
- **Continuous evals:** leading = eval pass rate over time; time for a production incident → permanent eval. Lagging = regressions caught in CI vs found in production.
- **PR review (Deploy):** leading = time to first review (minutes); share of comments resolved without human touching branch. Lagging = defects/vulns caught pre-merge vs escaping to production.
- **Hooks:** leading = time waiting per approval gate (OTel timestamp+verdict). Lagging = gate violations reaching production before/after hooks.
- **CI/CD:** leading = share of pipeline failures triaged without paging human. Lagging = DORA measures.
- **Maintenance/control bands:** leading = time breach → `intent.md` in triage queue vs old incident→post-mortem. Lagging = share of findings becoming merged fixes; repeat incidents of same class.
- **Scans:** leading = share of repos on schedule; time finding → patch in PR gate. Lagging = vulnerabilities found by scan vs found in prod/external; trend of findings per scan.
- **CLAUDE.md:** leading = how often Claude repeats a mistake CLAUDE.md should have caught. Lagging = time to first merged PR for new team member.
- **Skills:** leading = policy-approval → updated skill merging. Lagging = PR review findings citing the policy (should fall toward zero).

## Prerequisites / infrastructure (selected)

- `intent.md` home: an `intent/` folder (or dedicated intent repo spanning many repos / monorepo directory); VCS connector so non-git contributors can commit via claude.ai/Cowork.
- An agreed `intent.md` template (encodable as a skill signed off by a lead).
- Product owner with Claude access (no engineering skill required for Design).
- CLAUDE.md at repo root under 200 lines; skills under `.claude/skills/<name>/` with SKILL.md; subagents under `.claude/agents/<name>.md`.
- Test/build/lint each a single command exiting non-zero on failure; `CLAUDE.md` Commands section lists commands with healthy output; visual check tooling for UI work.
- Repo with Claude integration (Code Review service or `claude-code-action`), branch protection requiring code owner approval; MCP servers for deploy targets; sandbox profile; managed settings for regulated orgs.
- For maintenance: metrics store queryable by detection script; deterministically written bands config (`bands.yaml`); version-controlled unit-tested detection; rollback path proven in staging.

## Governance/accountability (condensed)

- **Human stays accountable; attention shifts.** Originator approves `intent.md`; product owner reviews spec; engineer approves plan; routine approval by engineer, higher-risk by tech lead/architect; code owner approves PR; service owner triages maintenance findings.
- **Controls match enforcement strength:** skill (advisory) → hook (deterministic) → agentic review passes (REVIEW.md) → human code-owner approval (branch protection) → managed settings (non-negotiable) → sandbox (OS-level).
- **Audit trail:** committed artifact chain (intent/spec/plan/diff/tests/PR findings/incident record) + git history (author, timestamp, revisions) + hook decisions with timestamps + session transcripts via OpenTelemetry + compliance API for enterprise.
- **Legacy coexistence:** for each artifact, name one source of truth — (a) repo markdown authoritative with legacy referencing commits, (b) legacy authoritative with markdown as working copies via MCP, (c) minimum bar = linkage (IDs + commit SHAs). Never silently two sources.
- **Negative guardrails:** block test-file edits during fix tasks; deny prod access; sandbox refuses to start if unavailable; rollback is the most-rehearsed path.

## How it may inform G-Ingá (mapping)

G-Ingá already implements much of this (artifact contracts, task records, validation, hooks, subagents, worktree isolation). The playbook's deltas for our open questions:

1. **Intent artifact.** Our docs and contracts use Epic/Feature/Task records; the playbook's `intent.md` (originator-authored proto-spec with problem/outcome/affected users/constraints/open questions, signed off by product owner, stored in an `intent/` home) is a cleaner *pre-task* artifact than our current "approval entry in a heavy parent task." Adopting a lightweight `intent.md`-style stub as the seed for a `heavy` parent's `## Plan` could remove choreography the validator-ux redesign flags (sessions E6 had to commit draft then approval). Maps to: open decisions 3 and 5 in `validator-ux-redesign.md` (whether `## Review`/`## Plan` must exist from authoring; spec approval single-commit vs draft-then-approved).
2. **Subagent portfolio.** We already run verifier-like checks; the playbook's named set (code simplifier post-finish, verifier read-only reports only, researcher) plus the community *implement-spec* trio (merger, integration branch, exploration notes outside repo) matches our worktree-per-task pattern and argues we should formalise a *merger* role in `seal` rather than workers committing directly. Maps to `docs/research/2026-10-13-similar-harness-ideas.md` §5 and our E5 concurrency work.
3. **Authoring gate.** The playbook's split ("authoring mode checks current-state structure; full gate incl. history/commit-order in CI/pre-commit") is exactly option 6.3 in validator-ux-redesign and its §7 recommendation point 2. The playbook provides external support for adding an explicit authoring validation mode without downgrading the `verified` invariant. (It does not resolve F8 — whether historical commits must remain valid; that remains an owner policy decision.)
4. **Historical audit trade-off.** Playbook's audit-trail framing (committed artifact chain == audit trail) and "governance costs increase because exceptions route through meetings" argue for **keeping** the historical/commit-order gate as the audit mechanism — i.e. favour option 6.2/keep + 6.4 (repayable proof) over removing commit-order checks, and deferring the F8 decision as our analysis already recommends. Tie-in: open decision 1 in validator-ux-redesign (`history walk stays hard gate?`).
5. **Provider-neutrality note (limits).** The playbook is Claude-specific (Code Review service, `claude-code-action`, `CLAUDE.md`, `.claude/`, managed settings, Claude Security, Claude Tag) and conflicts with G-Ingá's multi-host scope — in particular its "managed settings owned by platform/IT" and "agent cannot pass production gate" line up with our F2-F5/E3 findings and our Antigravity manual air-gap rule (per `community-crosscheck.md`), but its environment setup assumes Anthropic hosting. We should treat it as a *pattern source*, not a port. Our eval tiers (Osmani O5) and deterministic-verification principle (G-Ingá principle) remain the override for "trust the agent's pass."
6. **Control-band maintenance loop.** Stage 6 (deterministic detection script, Western Electric-style bands, `bands.yaml` tiers (1σ log / 2σ diagnose / 3σ propose PR or pre-approved runbook), stateless non-interactive Claude, `intent.md` output, eval added for each fix) maps to our EXP-03 circuit-breaker and autoresearch loop; candidate for a future `ginga` maintenance command but out of V1 and beyond the scope of the current validator-ux redesign decisions.
7. **Subagent descriptions budget.** Cross-check with our context-map concerns: article implies constraints? Actually external community-crosscheck notes the 15k token combined-description warning; useful cap for our `.claude/agents` portfolio (already listed there).

## Limits / pending checks

- **No pinned revision.** The page is live HTML dated 2026-08-21 but no version identifier was found; it changes without notice. Quotes re-read before citing in an ADR; re-fetch before relying on any detail. Analogous to the index's "live page, no revision pin" note for Claude Code best-practices.
- **Single source.** No independent corroboration; applies Anthropic's commercial framing. Claims such as token-economy ratios or metrics expectations are vendor experience, not measurements.
- **Not read in depth:** the linked "securing an AI-native SDLC at Anthropic" article, the downloadable PDF (assumed same content), related articles list. Only the HTML playbook body was read.
- **Products named (Claude Enterprise/Code/Tag)** are out of G-Ingá's adoptable runtime (we target multi-host; consumer-plan ToS constraints per `community-crosscheck.md`). Managed settings/pricing/seat models not transferable.
- **No evaluation against our harness.** This note does not run any check or change any validator; it is research input only.
- **Potential overlap risk:** several of our own docs (`artifact-contracts.md`, `validator-ux-redesign.md`, `d3/d5 evidence notes`) already contain the same control points; this note should be treated as a pointer/cross-check, not a replacement, to avoid drift.

## See also

- `docs/research/reference-index.md` (row added under section 14 (additions), sibling index entry).
- `docs/research/validator-ux-redesign.md` (open decisions 1–5 referenced above).
- `docs/research/2026-10-13-community-crosscheck.md`, `docs/research/2026-10-13-similar-harness-ideas.md` (similar themes; nothing here contradicts them).
- `docs/research/d3-artifact-evidence.md`, `docs/research/d5-native-primitive-evidence.md` (artifact and hook/primitive evidence).
