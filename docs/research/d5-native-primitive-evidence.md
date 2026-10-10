# D5 evidence: Claude Code primitives for the harness

**Status:** research note (input to [ADR 0005](../decisions/0005-native-primitive-mapping.md)). Revised 2026-10-10: the cloud channels are separated (N12, N16, §4) and the wayfinder availability row is corrected (§5). Not a decision.
**Read on:** 2026-10-10. Claude Code CLI in the session container: `2.1.296`.

Codes: `N` for Claude Code docs, `W` for Matt Pocock's `wayfinder` and the files it depends on, `L` for local observations. Codes `C1`–`C9`, `P1`–`P5` and `O1`–`O6` refer to the [D2 evidence](d2-routing-evidence.md).

Each claim carries one label:

- **Fact (docs):** read in the official page listed, on the date above. Docs change, so re-read before M1 relies on a detail.
- **Fact (source):** read in the source file at the pinned revision.
- **Observed:** seen in this checkout or this cloud container, with the command that shows it. One environment, one time.
- **Author recommendation:** the source author's advice, not something we measured.
- **Inference (ours):** our reading, for the owner to check.
- **Assumption:** not verified. M1 mustn't depend on it before a spike checks it (ADR 0005, "How to test this without implementing it").

## Sources

| Source | Revision | Read |
|---|---|---|
| Claude Code docs | live pages, 2026-10-10 | [skills](https://code.claude.com/docs/en/skills), [hooks](https://code.claude.com/docs/en/hooks) (first 200k of 267k characters), [subagents](https://code.claude.com/docs/en/sub-agents), [memory](https://code.claude.com/docs/en/memory), [features overview](https://code.claude.com/docs/en/features-overview), [settings](https://code.claude.com/docs/en/settings), [cloud sessions](https://code.claude.com/docs/en/claude-code-on-the-web), [cloud environments](https://code.claude.com/docs/en/cloud-environments) |
| Matt Pocock, `skills` | [`49dd158`](https://github.com/mattpocock/skills/tree/49dd158d1076134a641b33efb035946536778336), the same pin as D2 and D3 | `skills/engineering/wayfinder/SKILL.md`, `ask-matt/SKILL.md`, `setup-matt-pocock-skills/SKILL.md`, `setup-matt-pocock-skills/issue-tracker-local.md`, `.claude-plugin/plugin.json` |
| This repository | `e4decfd`, then `4604ff3` | ADRs 0001–0004, the [D6 evidence](d6-reuse-evidence.md), the decision map, the artifact contracts, the validator findings, `docs/development.md` |

Not read: the part of the hooks page after character 200,000. It covers later events and may include a security section. Nothing below depends on it.

## 1. Claude Code primitives

| # | Label | Claim | Where |
|---|---|---|---|
| N1 | Fact (docs) | `CLAUDE.md` loads in full at session start and costs context on every request. Claude treats it "as context, not enforced configuration"; "to block an action regardless of what Claude decides, use a PreToolUse hook". Target: under 200 lines. Imports don't reduce the cost, because they also load at launch. The project-root file is re-read and re-injected after `/compact`. Block-level HTML comments are stripped before injection | memory: "CLAUDE.md vs auto memory", "Write effective instructions", "Instructions seem lost after /compact"; features overview: "Context cost by feature" |
| N2 | Fact (docs) | A skill's description is in context on every request. The combined `description` and `when_to_use` are truncated at 1,536 characters. The body loads only on invocation, "stays there across later turns", and isn't re-read. After auto-compaction, the latest invocation of each skill is re-attached, keeping its first 5,000 tokens, within a shared 25,000-token budget filled from the most recent skill; older skills can be dropped | skills: "Control who invokes a skill", "Skill content lifecycle" |
| N3 | Fact (docs) | `disable-model-invocation: true` takes the description out of context and stops Claude from loading the skill by itself. Only the user can invoke it | skills: "Control who invokes a skill"; features overview: "Skills" tab |
| N4 | Fact (docs) | Supporting files in a skill directory load only when read. Scripts are "executed, not loaded". `${CLAUDE_SKILL_DIR}` points at the skill directory. `allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/x *)` lets a skill run a bundled script without a prompt. `allowed-tools` pre-approves and doesn't restrict. Tip: keep `SKILL.md` under 500 lines | skills: "Add supporting files", "Available string substitutions", "Pre-approve tools for a skill" |
| N5 | Fact (docs) | `` !`command` `` runs before the skill content reaches Claude. "A failed command aborts the entire skill invocation." `disableSkillShellExecution` turns it off | skills: "Inject dynamic context" |
| N6 | Fact (docs) | Skill locations: enterprise, personal (`~/.claude/skills/`, "not Cowork or cloud sessions"), project (`.claude/skills/`), plugin (namespaced `/plugin:skill`). On a name clash, enterprise beats personal and personal beats project. `.claude/commands/` files are now skills | skills: "Choose where skills load", "Resolve skills that share a name" |
| N7 | Fact (docs) | Hook handlers: `command`, `http`, `mcp_tool`, `prompt`, `agent` (experimental). Configured in user, project (`.claude/settings.json`), local, managed and plugin settings and in skill or subagent frontmatter. They merge across levels. Exit 2 is a blocking error (`PreToolUse` blocks the call). Any other non-zero code is non-blocking: "use exit 2 for policy enforcement". A timed-out `PreToolUse` hook doesn't block the call. `onFailure: "block"` (v2.1.295+) makes failures block, except on `Stop`, `SubagentStop`, `TaskCompleted` and `TeammateIdle`. The `if` field takes permission-rule syntax such as `Bash(git *)`. Project hooks follow workspace-trust rules | hooks: "Exit code output", timeouts, common fields |
| N8 | Fact (docs) | `Stop` runs whenever the main agent finishes responding. `stop_hook_active` marks a continuation caused by a stop hook. After 8 consecutive continuations Claude Code overrides the block and ends the turn | hooks: "Stop" |
| N9 | Fact (docs) | A subagent runs in its own context window, without the conversation history, and returns a summary. It loads `CLAUDE.md` unless it's Explore, Plan or sets `omitClaudeMd`. Its requests "count toward the same usage limits". A `tools` list enforces tool restrictions. Custom subagent descriptions cost context every turn (warning above 15,000 tokens). Defined in `.claude/agents/`, `~/.claude/agents/` or a plugin | subagents: "What loads at startup", "Frontmatter reference", "Choose between subagents and main conversation" |
| N10 | Fact (docs) | Context cost by feature: `CLAUDE.md` every request; skills "low (descriptions every request)", zero for user-only skills; subagents isolated; hooks "zero, unless hook returns additional context" | features overview: "Context cost by feature" |
| N11 | Author recommendation | "Put guardrails in hooks. An instruction like 'never edit .env' in CLAUDE.md or a skill is a request, not a guarantee." Add features "as specific triggers come up", for example a hook when "you want something to happen every time without asking" | features overview: "Hook vs Skill", "Build your setup over time" |
| N12 | Fact (docs) | A cloud session starts from a fresh clone. Available there: the repo's `CLAUDE.md`, `.claude/rules/`, `.claude/skills/`, `.claude/agents/`, `.claude/commands/`, and the hooks and permission rules in `.claude/settings.json` (single-repository sessions only). Not available: `~/.claude/CLAUDE.md`, `~/.claude/skills/` and `agents/`, user-enabled plugins, `.claude/settings.local.json`, and plugins a repo enables through `enabledPlugins`: "A cloud session doesn't install the plugins a repository turns on". Skills enabled on claude.ai do load | cloud environments: "What carries over from your setup"; settings: "Settings in cloud sessions" |
| N13 | Fact (docs) | Setup scripts run before Claude Code, cloud only, skipped when the environment is cached. `SessionStart` hooks run on every session, local and cloud. `CLAUDE_CODE_REMOTE=true` only in the cloud. Bun is preinstalled but has "known proxy compatibility issues" for package fetching | cloud environments: "Setup scripts vs. SessionStart hooks", "Installed tools" |
| N14 | Fact (docs) | `claude --cloud` clones the remote branch, not the local checkout ("push first if you have local commits"). Teleport needs the branch pushed. When a cloud VM expires, the conversation is restored, but running background work isn't | cloud sessions: "Start a cloud session from your terminal", "Teleport requirements", "Environment expired" |
| N16 | Fact (docs) | Skills enabled on claude.ai sync into a separate `~/.claude/skills/synced/` folder. Claude Code doesn't move or delete the skill folders the user creates there | skills: "Personal skills disappeared"; cloud environments: "What carries over from your setup" |
| N17 | Fact (docs) | `enabledPlugins` maps `plugin@marketplace` to a Boolean in any settings file. "Project settings take precedence over user settings". To opt out of a project-enabled plugin on one machine, set it to `false` in `.claude/settings.local.json`. Managed settings override both | [settings reference](https://code.claude.com/docs/en/settings-reference): `enabledPlugins` |
| N15 | Fact (docs) | Settings precedence, highest first: managed, command line, `.claude/settings.local.json`, `.claude/settings.json`, `~/.claude/settings.json`. Only `.claude/settings.json` is meant to be shared | settings |

## 2. Matt Pocock's `wayfinder`

| # | Label | Claim | Where |
|---|---|---|---|
| W1 | Fact (source) | `wayfinder` plans "a huge chunk of work (more than one agent session can hold) as a shared map of decision tickets on your issue tracker". It's user-only (`disable-model-invocation: true`) | `wayfinder/SKILL.md` L1–5 |
| W2 | Fact (source) | The map is one issue labelled `wayfinder:map`, "an index, not a store", with Destination, Notes, Decisions so far, Not yet specified and Out of scope sections | `wayfinder/SKILL.md` L19–53 |
| W3 | Fact (source) | Each ticket is a child issue holding one question "sized to one 100K token agent session", typed `research`, `prototype`, `grilling` or `task`, and marked HITL or AFK. A session claims a ticket by assigning it before work. Blocking uses the tracker's native dependency links. The frontier is "the open, unblocked, unclaimed children" | `wayfinder/SKILL.md` L55–80 |
| W4 | Fact (source) | It produces "decisions, not deliverables", and it resolves at most one ticket per session (research tickets excepted) | `wayfinder/SKILL.md` L11–13, L105 |
| W5 | Fact (source) | It calls other skills from the same pack (`grilling`, `domain-modeling`, `research`, `prototype`) and fires research subagents that push a throwaway `research/<name>` branch | `wayfinder/SKILL.md` L77–79, L111–116 |
| W6 | Fact (source) | Where the map lives is tracker-specific and configured by `/setup-matt-pocock-skills`. The local fallback is `.scratch/<effort>/map.md` plus `issues/NN-<slug>.md` with `Type:`, `Status: claimed` or `resolved`, and `Blocked by:` lines | `wayfinder/SKILL.md` L25; `issue-tracker-local.md` L21–30 |
| W7 | Fact (source) | When the map clears it "hands off, it doesn't build", merging into `/to-spec`. Wayfinder is "never a well-scoped feature" | `ask-matt/SKILL.md` L52–54 |
| W8 | Fact (source) | The pack ships as plugin `mattpocock-skills` `1.3.1`, which lists `wayfinder`, `grilling`, `research`, `prototype` and `implement` | `.claude-plugin/plugin.json` |

## 3. Local observations

| # | Label | Claim | How to check |
|---|---|---|---|
| L1 | Observed | Written on branch `claude/cool-wright-gz3f02` from `e4decfd`. Reconciled onto `main` at `4604ff3` in a separate worktree. The working tree was clean before this note | `git rev-parse HEAD origin/main` |
| L2 | Observed | At `4604ff3`, D1–D3 and D6 are `accepted`. D6 is [ADR 0004](../decisions/0004-reuse-strategy-for-existing-skills.md), merged through `a228652`. D4 is `open` | `ls docs/decisions/`, [decision map](../decision-map.md) |
| L3 | Observed | In this cloud container, `~/.claude/skills/` holds no Pocock skill and no plugin is installed. The only skills are the account's claude.ai-synced ones. A container-level `Stop` hook comes from the environment's launcher settings, not from the repository | `ls ~/.claude/skills ~/.claude/plugins`, `cat ~/.claude/launcher-settings.json` |
| L4 | Observed | The clone isn't shallow (13 commits). Node `v22.22.0` and Bun `1.4.2` are present, `mise` isn't. `bun install --frozen-lockfile` fetched 245 packages through the proxy without error | `git rev-parse --is-shallow-repository`, `node --version`, `bun --version` |
| L5 | Observed | The repository has no `.claude/` directory. `CLAUDE.md` is 765 bytes | `ls -a`, `wc -c CLAUDE.md` |
| L6 | Observed | This repository runs M0 as a decision map: [decision map](../decision-map.md) has a destination ("Minimal V1 spec ready for approval"), decisions D1–D7 with dependencies and statuses, and a deferred list. Each settled decision has an ADR that went through its own pull request, and the `decision-records` check keeps map and ADRs consistent | `git log --oneline`, `docs/development.md` |

## 4. What the evidence implies

- **Fact (docs):** availability depends on the channel, not on whether a file is "personal" or "plugin" in general (N6, N12, N16):
  - personal skills in `~/.claude/skills/` don't load in cloud sessions;
  - project skills committed under `.claude/skills/` do;
  - plugins enabled in user settings, or through a repository's `enabledPlugins`, aren't installed in cloud sessions;
  - skills enabled on the user's claude.ai account do load there.
- **Inference:** committed project files are the only channel versioned with the target repository. Committing them is a reproducibility choice, not something the cloud forces: account-enabled skills also reach cloud sessions. Which channel G-Ingá uses is an open D5 follow-up (ADR 0005, FU1).
- **Inference:** only hooks, scripts gated on exit codes, platform permissions and CI can enforce anything. `CLAUDE.md` and skills are guidance (N1, N11). Claude Code's docs say the same.
- **Fact (docs):** the fixed per-turn cost is the full `CLAUDE.md`, plus each model-invocable skill's name and description, plus each custom subagent's description (N1, N2, N9). Hooks and scripts add nothing until they print (N10).
- **Inference:** a skill body over 5,000 tokens loses its tail after auto-compaction (N2). An entry skill that must keep its rules for the whole task should stay under that size, with the rest in files read on demand (N4).
- **Fact (docs):** a `PreToolUse` command hook fails open on timeout or on any exit code other than 2, unless `onFailure: "block"` is set (N7). A gate that has to hold needs both.
- **Scope note:** the hook facts above (N7, N8) are inputs to ADR 0005's open follow-up H-1. They aren't part of its V1 path. In V1 the validator runs only as a skill step, which is guidance, and in target-repository CI where the owner enables it, which is enforcement at merge (ADR 0005, decision item 5).
- **Inference:** a `Stop` hook isn't a good verification gate here. It fires after every response, chat included, and its continuations are capped at 8 (N8).
- **Observed vs assumed:** that Node and Bun exist and the clone isn't shallow (L4) is true of this one container. It isn't a guarantee for every cloud environment or for the owner's machine.

## 5. The Wayfinder gap

Pocock's `ask-matt` sends a "huge, foggy effort ... too big for one session" to `/wayfinder` (P1, W7). G-Ingá's routing sends multi-session work (H5) and unresolved preference calls (H1) to `heavy` (ADR 0002 §2). `heavy` assumes the question rounds and a spec draft fit inside one parent task, and its children exist only after the spec is approved ([contract](../artifact-contracts.md) §3.3).

| Capability | `/wayfinder` (W1–W7) | G-Ingá today | Gap |
|---|---|---|---|
| Decision work spread over many sessions before any spec exists | the map and its tickets | the `heavy` parent stays `active` with a `draft` spec. Its question rounds aren't persisted as separate units | **yes** |
| A named destination | `## Destination`, set first | the spec's Problem and Expected behavior, which exist only once a spec is drafted | partial |
| Decision units with dependencies and a frontier | typed tickets, native blocking, claims | `depends_on` exists only between task records, after spec approval | **yes** |
| One decision per session | enforced by the procedure (W4) | none | **yes** |
| Visible fog and scope cuts | Not yet specified, Out of scope | a spec's `## Open questions` with `deferred:` | partial |
| Owner-only acceptance, states, versions, evidence | none: `Status: claimed` or `resolved` (W6) | ADR 0002 gates, ADR 0003 states and hashes | G-Ingá has more |
| Available in cloud sessions | as a plugin enabled in user or repository settings, not installed (N12, W8). As a personal skill, not loaded (N6). Through skills enabled on the claude.ai account, loaded (N12), but not verified for this pack | depends on the channel G-Ingá's files use (ADR 0005, FU1) | not the gap itself |

Findings:

- **Inference:** the gap is real. G-Ingá has no artifact for "many sessions of decisions before a spec". Calling a skill `/wayfinder` wouldn't close it in G-Ingá terms: Pocock's tickets aren't task records, they carry no owner-acceptance state, and the validator can't see them. The name matches, the capability doesn't. [ADR 0004](../decisions/0004-reuse-strategy-for-existing-skills.md), which accepted D6, also rules out depending on Pocock's skill (ADR 0004 §3), and keeps `wayfinder` in the owner's flow until its replacement criteria hold (ADR 0004 §7).
- **Observed (L6):** this repository already does wayfinding by hand with the decision map, one ADR per decision, owner-only acceptance and the `decision-records` check. That's one occurrence, inside the harness's own repository. It hasn't been needed in a target repository yet.
- **Inference:** what that occurrence shows a map needs, at minimum:
  1. a named destination;
  2. decision units with the status vocabulary and owner-only acceptance;
  3. dependency edges, so the next takeable decision can be seen;
  4. detail kept in each decision's record, with the map as an index;
  5. a deferred list for fog and scope cuts;
  6. a deterministic check that the map and the records agree.

  Claims for concurrent sessions (W3), ticket types (W3) and research branches (W5) aren't in that list: this repository hasn't needed them.
