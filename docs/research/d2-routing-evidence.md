# D2 evidence: how the references route ceremony

**Status:** research note (input to [ADR 0002](../decisions/0002-ceremony-tiers-and-routing.md)). Not a decision.
**Read on:** 2026-10-10. Local Claude Code CLI: `2.1.296`.

Each claim below carries one of three labels:

- **Fact (verified):** read in the primary source at the pinned revision or page listed.
- **Author recommendation:** what the source's author advises. It's their opinion or their own measurement, not something we reproduced.
- **Inference (ours):** our reading, to be validated by the owner and by scenarios.

## Sources and pinned revisions

| Source | Revision read | Files read |
|---|---|---|
| Claude Code docs | live pages, 2026-10-10 | [best practices](https://code.claude.com/docs/en/best-practices), [permission modes](https://code.claude.com/docs/en/permission-modes), [skills](https://code.claude.com/docs/en/skills), [model config / effort](https://code.claude.com/docs/en/model-config), [costs](https://code.claude.com/docs/en/costs) |
| Matt Pocock, `skills` | [`49dd158`](https://github.com/mattpocock/skills/tree/49dd158d1076134a641b33efb035946536778336) (2026-10-09) | `skills/engineering/ask-matt`, `implement`, `wayfinder`, `triage`, `pr`; `skills/productivity/grilling` |
| Addy Osmani, `agent-skills` | [`1be8e34`](https://github.com/addyosmani/agent-skills/tree/1be8e34187e34647bb83adc3a1323b26ae6f6abe) (2026-10-10) | `README.md`, `evals/README.md`, `skills/using-agent-skills`, `spec-driven-development`, `planning-and-task-breakdown`, `doubt-driven-development`, `interview-me` |
| Cursor `pstack` | `cursor/plugins` main, HEAD [`d73344b`](https://github.com/cursor/plugins/tree/d73344bee8cf22e53b9d5f4cf5749d38ba38c174/pstack) | `pstack/README.md`, `skills/poteto-mode/SKILL.md`, `skills/blast-radius/SKILL.md` |

Not read: the Rob Shocks video cited in [principles](../principles.md). The pack claims it summarizes were checked directly against the packs instead (see "Corrections to earlier attributions").

## 1. Claude Code (official docs)

| # | Label | Claim | Where |
|---|---|---|---|
| C1 | Fact | Plan mode "adds overhead". Skip it for clear, small fixes: "If you could describe the diff in one sentence, skip the plan." Planning helps most "when you're uncertain about the approach, when the change modifies multiple files, or when you're unfamiliar with the code being modified." | best practices, "Explore first, then plan, then code" |
| C2 | Fact | Verification can gate the stop at four strengths: in the prompt, a `/goal` condition, a Stop hook (deterministic), or a verification subagent / second opinion. "Each step trades setup for attention." | best practices, "Give Claude a way to verify its work" |
| C3 | Fact + author recommendation | A fresh-context review subagent is recommended before calling unattended work done. A reviewer asked to find gaps "will usually report some, even when the work is sound", so the docs say to flag only correctness or requirements gaps. | best practices, "Add an adversarial review step" |
| C4 | Fact | For larger features, have Claude interview you and write a spec, then implement in a fresh session. | best practices, "Let Claude interview you" |
| C5 | Fact | Permission modes control **actions**, not process. In auto mode a classifier blocks, by default, irreversible or external actions such as force push, production deploys and migrations, destroying pre-existing files and `git reset --hard`. User-stated boundaries ("don't push") are also enforced. | permission modes, "What the classifier blocks by default" |
| C6 | Fact | A skill's description sits in context every turn, and the body loads only on invocation. Once invoked, the body "stays there across later turns". The listing truncates `description` + `when_to_use` at 1,536 characters. `disable-model-invocation: true` takes the description out of context. | skills |
| C7 | Fact | Skills and subagents can set `effort` in frontmatter. Opus 5.5 defaults to `medium`. The docs suggest `high` for "work where verification matters or edge cases are likely, such as fixing a bug in an existing codebase". Changing effort mid-session may show a prompt-cache warning. | model config, "Adjusting effort level" |
| C8 | Fact | `/usage` shows per-session tokens (input, output, cache read/write) and, on subscription plans, usage attributed to skills, subagents and MCP servers. Subagents' requests "still draw on your usage". CLAUDE.md is loaded every session, and the docs advise moving workflow instructions into skills. | costs |
| C9 | Fact | `claude plugin eval` exists in the installed CLI (`2.1.296`, checked with `--help`). It runs eval cases against a plugin with a no-plugin baseline arm. | local CLI |

## 2. Matt Pocock, `skills`

| # | Label | Claim | Where |
|---|---|---|---|
| P1 | Fact | The router (`ask-matt`) branches on **scale and uncertainty**, not on risk. Settle the idea by grilling. If a question needs a runnable answer, detour through `/prototype`. If the build is multi-session, use `/to-spec` → `/to-tickets` → `/implement` per ticket. Otherwise, use `/implement` "right here, in the same context window". A "huge, foggy effort ... too big for one session" goes to `/wayfinder`, and it's "never a well-scoped feature". | `ask-matt/SKILL.md` L24–28, L52 |
| P2 | Fact | Every path ends in `/tdd` plus `/code-review`. Verification doesn't scale down with the path. | `ask-matt/SKILL.md` L30 |
| P3 | Fact | Reversibility appears as a PR label: a "one-way or two-way door". "A PR that is cheap to roll back is lower risk." | `pr/SKILL.md` L168 |
| P4 | Fact | `grilling` asks the **whole frontier** of answerable questions per round, each with a recommended answer, and says that "finding facts is your job, never the user's". | `grilling/SKILL.md` L8 |
| P5 | Author recommendation | Keep grill → spec → tickets in one context window. Treat ~150k tokens as the "smart zone" limit. | `ask-matt/SKILL.md` L40 |

## 3. Addy Osmani, `agent-skills`

| # | Label | Claim | Where |
|---|---|---|---|
| O1 | Fact | Routing is by **lifecycle phase** (a decision tree in `using-agent-skills`). Each skill states its own "When NOT to use". For example, spec-driven development is skipped for "single-line fixes, typo corrections, or changes where requirements are unambiguous and self-contained". | `using-agent-skills`, `spec-driven-development` L20 |
| O2 | Fact | `doubt-driven-development` defines **non-trivial** with an observable any-of list: new or changed branching logic, crossing a module or service boundary, a property the compiler can't verify, correctness that depends on context the reader can't see, or an irreversible blast radius. It also has an explicit not-for list: mechanical edits, one-line obvious changes, and running tests. | `doubt-driven-development` L16–40 |
| O3 | Fact | Task sizing runs XS–XL by file count. XL (8+ files) is "too large, break it down". A task should also be split when it needs more than one focused session, needs more than three acceptance bullets, or touches two or more independent subsystems. | `planning-and-task-breakdown` L125–140 |
| O4 | Fact | Every skill has a "Common Rationalizations" table. | `README.md` L344 |
| O5 | Fact + author measurement | Skill evals run in three tiers: structural, trigger/routing, and behavioral. The author reports that skill invocation "is stochastic" (5 of 7 runs fired on one phrasing). They advise pinning the model and recording the CLI version when reporting numbers. | `evals/README.md` L14, L53 |
| O6 | Fact | `interview-me` asks "one question at a time, with your best guess attached". | `interview-me` L14, L53 |

## 4. Cursor `pstack`

| # | Label | Claim | Where |
|---|---|---|---|
| X1 | Fact | Routing is by **task type**: 23 playbooks (bug fix, feature, refactor, investigation, prototype, ...). A "large or cross-cutting effort" escalates to `figure-it-out` "even when a narrower playbook like Feature fits". | `poteto-mode/SKILL.md` L123 |
| X2 | Fact | The mode turns itself off for casual turns: "Playbook match or rigor needed -> apply /poteto-mode. Casual turn or user opts out -> don't." | `poteto-mode/SKILL.md` L8 |
| X3 | Fact | Before asking the human, classify the fork. If the answer is a fact you could observe by running something, it isn't the human's to answer. Prototype instead. Reserve questions for product or preference calls. | `poteto-mode/SKILL.md` L20 |
| X4 | Fact | Autonomy depends on reversibility: "Just do it" for reversible work. "Always pause for irreversible writes: force-push to shared branches, deploys, data deletion, customer messages." | `poteto-mode/SKILL.md` L85 |
| X5 | Fact | "Prove it works" means verifying against the real artifact, "not a proxy, self-report, or 'it compiles'". | `poteto-mode/SKILL.md` L66 |
| X6 | Author recommendation | "i don't believe in planning. the best spec is code." Planning isn't a default. | `README.md` L245 |
| X7 | Fact | `blast-radius` ranks how sure you are on five steps, from "you said so" up to "reproduced in the running app". It asks you to prove the one fact a change's safety depends on. | `blast-radius/SKILL.md` |

## 5. What the evidence says about our three tiers

- **Fact:** none of the four sources defines named ceremony tiers or a numeric risk score. Each routes on a different primary axis: Claude Code on approach clarity and size, Pocock on scale and uncertainty, Osmani on phase plus per-skill exclusions, pstack on task type.
- **Fact:** every source keeps a verification floor that doesn't drop for small work (C2, P2, O4, X5).
- **Fact:** where sources talk about risk, they mean **reversibility** and **crossing boundaries** (C5, P3, O2, X4).
- **Inference:** our `light` / `standard` / `heavy` split is a synthesis, not something adopted from a reference. It holds up only if each boundary tracks a discrete change in **human involvement and persisted artifacts**: none, exception-only, gated. Size or task type alone doesn't justify it. [ADR 0002](../decisions/0002-ceremony-tiers-and-routing.md) builds the proposal on that inference.
- **Inference:** permission and action risk is already enforced by Claude Code (C5). Tiers shouldn't duplicate it. They decide process (artifacts, verification depth, review), and the platform decides which actions need approval.

## 6. Corrections to earlier attributions

[principles.md](../principles.md) took some attributions from the video summary. Checked against source:

| Principle | Earlier attribution | What the source shows |
|---|---|---|
| §1 Ceremony matches stakes | video "ceremony balance" | No pack defines tiers (see §5). The tiers are our synthesis. |
| §2 Ask one question at a time | Pocock `grilling` | Current `grilling` asks the whole frontier per round with recommended answers (P4). "One question at a time" is Osmani's `interview-me` (O6). |
| §3 Build passed is not proof | pstack (per video) | Confirmed: `principle-prove-it-works` (X5). |
| §4 Anti-rationalization tables | Osmani (per video) | Confirmed (O4). |
| §5 Doubt-driven development | "per video" | Confirmed: an Osmani skill (O2), not pstack. |
