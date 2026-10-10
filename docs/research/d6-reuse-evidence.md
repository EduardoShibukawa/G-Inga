# D6 evidence: reusing Matt Pocock's skills

**Status:** research note (input to [ADR 0004](../decisions/0004-reuse-strategy-for-existing-skills.md)). Not a decision.
**Read on:** 2026-10-10. Claude Code CLI `2.1.296` in a cloud session. Revised twice the same day:

- After the owner described their setup: the cloud-availability evidence is split into what the docs guarantee and what wasn't verified (§4, §7), and the owner's install route is added (§0).
- After a final audit: claim scopes narrowed (M5, M9, P23, C21), a confidence class for each claim the ADR rests on (§9), and observable replacement criteria for the four skills the owner uses (§10).

Labels follow the [D2 note](d2-routing-evidence.md): **Fact (verified)**, **Author recommendation** (or author policy), **Inference (ours)**, plus **Owner statement** for what the owner reported and nobody inspected. Codes continue that note's series: `C10`+ for Claude Code, `P6`+ for Pocock. `M` codes compare upstream output with the [artifact contracts](../artifact-contracts.md).

## 0. The owner's current setup and goal

| # | Label | Claim |
|---|---|---|
| S1 | Owner statement | Pocock's skills are installed by adding the upstream repository as a plugin marketplace in Claude Code, that is the `mattpocock` marketplace and the plugin `mattpocock-skills@mattpocock`, not `claude-plugins-official`. |
| S2 | Owner statement | The current flow uses `wayfinder`, `grill-with-docs`, `to-spec` and `to-tickets`. |
| S3 | Owner statement | The end goal is to use G-Ingá exclusively as the development harness: no two competing workflows, no permanent dependency on the plugin to orchestrate the cycle. The marketplace setup is the existing flow during the transition. G-Ingá should still reuse useful knowledge and approaches selectively. |

The installed version, the install date and whether auto-update was turned on for that marketplace weren't reported or inspected.

## Sources and pinned revisions

| Source | Revision read | Files read |
|---|---|---|
| Matt Pocock, `skills` | [`49dd158`](https://github.com/mattpocock/skills/tree/49dd158d1076134a641b33efb035946536778336) (2026-10-09), still `main` HEAD on 2026-10-10. Same revision as the D2 and D3 notes, so their `P1`–`P5` and `A1`–`A4` line references still hold | `LICENSE`, `SCOPE.md`, `CLAUDE.md`, `CHANGELOG.md`, `.claude-plugin/plugin.json`, `.agents/adr/0001-*`, `.agents/adr/0002-*`, `.agents/install-block.md`, `.agents/invocation.md`, `.out-of-scope/*`; skills `wayfinder`, `grill-with-docs`, `to-spec`, `to-tickets`, `setup-matt-pocock-skills` (with `issue-tracker-local.md`, `domain.md`), `implement`, `implement-spec`, `research`, `ask-matt`, `domain-modeling` (with `ADR-FORMAT.md`), `productivity/grilling` |
| Matt Pocock, `skills`, as the official marketplace installs it | [`c55ee46`](https://github.com/mattpocock/skills/tree/c55ee46073ed923f86ce59a5eb3b6d895095d1b7) (2026-09-18, plugin `version` 1.2.3) | diff against `49dd158` for the skills above |
| Anthropic, `claude-plugins-official` | [`b8e53f1`](https://github.com/anthropics/claude-plugins-official/tree/b8e53f1c05dff3b6d751297f6527990ffc81c2f4) (2026-10-09) | `.claude-plugin/marketplace.json`, entry `mattpocock-skills` (L2339) |
| Claude Code docs | live pages, 2026-10-10 | [skills](https://code.claude.com/docs/en/skills), [install plugins](https://code.claude.com/docs/en/discover-plugins), [plugin loading](https://code.claude.com/docs/en/plugins/loading), [plugin security](https://code.claude.com/docs/en/plugins/security), [cloud environments](https://code.claude.com/docs/en/cloud-environments), [marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |

`wayfinder` calls `grilling`, `domain-modeling`, `research` and `prototype` through the Skill tool, and `grill-with-docs` is a wrapper over `grilling` and `domain-modeling`. That's why the set grew beyond the four skills named in the decision map. `tdd`, `code-review` and `prototype` were not read in full.

Naming note: the [Wayfinder brief](../briefs/wayfinder-context-map-brief.md) describes a system-context map that [ADR 0001](../decisions/0001-product-boundary.md) deferred. Pocock's `/wayfinder` is an unrelated planning skill. This note means the skill.

## 1. Pocock's packaging, license and policy

| # | Label | Claim | Where |
|---|---|---|---|
| P6 | Fact | MIT license, copyright 2026 Matt Pocock. The notice "shall be included in all copies or substantial portions of the Software". | `LICENSE` L1–13 |
| P23 | Fact | Not all upstream text is Pocock's own: `pr/CREDITS.md` says part of the `pr` skill is reproduced "almost word for word" from another project's skill. A future copy has to check each file's provenance, not only `LICENSE`. That project's license wasn't checked. | `skills/engineering/pr/CREDITS.md` L3 |
| P7 | Fact | The Claude Code plugin ships 27 skills as one bundle. 11 are model-invoked, so their descriptions sit in context every turn. Those 11 descriptions total 2,152 characters (measured). The other 16 set `disable-model-invocation: true`, so they add nothing to context until invoked (C12). The same counts hold at `v1.3.1`. | `.claude-plugin/plugin.json` L21–49; frontmatter of each `SKILL.md` at `49dd158` and `v1.3.1` |
| P8 | Fact | The plugin carries instructions only: no hooks, MCP servers, `bin/`, `` !`command` `` injection or `allowed-tools`, at both `49dd158` and `c55ee46`. | `git ls-tree` and `git grep` at both revisions |
| P9 | Fact | Upstream's documented Claude Code route is `claude-plugins-official`. That listing pins commit `c55ee46`, 73 commits behind `main`. Upstream notes that a release reaches users "when that pin moves, not the moment we tag". This isn't the owner's route (S1). | marketplace entry above; upstream `.agents/adr/0002-*` L31–40 |
| P22 | Fact | The owner's route, the repository as its own marketplace, takes the plugin from `.claude-plugin/plugin.json`, whose `version` wins over the marketplace entry's. Upstream says such routes "reinstall only when the `version` in `plugin.json` changes". That field reads `1.3.1` at the `v1.3.1` tag (2026-10-04) and still at `main`, although 8 commits since the tag changed 7 files in the skills of S2 and their dependencies. This is documented behavior. The owner's machine, and whether they pinned the marketplace to a ref with `#ref`, weren't inspected. | `.agents/install-block.md` L9; `git diff v1.3.1 49dd158`; marketplace reference, "Plugin entries" |
| P10 | Fact | Upstream changes fast: 545 commits since 2026-02-03. In the 90 days to 2026-10-10, commits touching each skill directory: `setup-matt-pocock-skills` 12, `wayfinder` 11, `grilling` 11, `to-tickets` 9, `to-spec` 8, `domain-modeling` 6, `grill-with-docs` 4. Breaking renames hit exactly these skills: `to-prd` → `to-spec`, `to-issues` merged into `to-tickets`, `decision-mapping` → `wayfinder`, `CONTEXT.md` → `GLOSSARY.md`. | `git log`; `CHANGELOG.md` L31, L241, L253 |
| P11 | Author policy | Config options, harness-specific branches and tweaks for one person's workflow are out of scope upstream. They belong "in your own `CLAUDE.md` / `AGENTS.md`, or in a fork". New skills aren't accepted. | `SCOPE.md` L10; `.out-of-scope/new-skills.md` L3–9 |
| P12 | Fact | The two install routes are exclusive: the plugin is a managed read-only bundle, skills.sh writes editable copies the user owns. Installing both duplicates every skill. | `.agents/install-block.md` L119–121 |
| P13 | Fact | `to-spec`, `to-tickets` and `triage` are hard-dependent on per-repo config from `/setup-matt-pocock-skills`. `wayfinder` falls back to a local-Markdown tracker. Setup writes an `## Agent skills` block into `CLAUDE.md` (or `AGENTS.md`) and files under `docs/agents/`, and expects ADRs in `docs/adr/`. | upstream `.agents/adr/0001-*` L7; `wayfinder` L25; `setup-matt-pocock-skills/SKILL.md` L49, L74–100; `domain.md` L5–11 |
| P14 | Fact | Skills depend on each other by bare name ("Call the Skill tool with …"). A user-invoked skill can't be reached by another skill. | `.agents/invocation.md` L16, L22 |

## 2. The skills in scope

| # | Label | Claim | Where |
|---|---|---|---|
| P15 | Fact | `grill-with-docs` is one line: call the Skill tool for `grilling` and `domain-modeling`. | `grill-with-docs/SKILL.md` L7 |
| P16 | Fact | `grilling` dispatches a sub-agent for any fact it needs, instead of asking the user. It writes no files. | `grilling/SKILL.md` L28 |
| P17 | Fact | `domain-modeling` updates `GLOSSARY.md` inline as terms resolve, without asking first. It offers an ADR only when a decision is hard to reverse, surprising without context and the result of a real trade-off, and writes it to `docs/adr/` with a sequential number. The template is one to three sentences, and a Status field is optional. | `domain-modeling/SKILL.md` L40, L60–64, L66–74; `ADR-FORMAT.md` L3–23 |
| P18 | Fact | `to-spec` does "NOT interview the user". It checks test seams with the user, then publishes the spec to the tracker with the `ready-for-agent` label, "no need for additional triage". | `to-spec/SKILL.md` L7, L15–19 |
| P19 | Fact | `to-tickets` iterates "until the user approves the breakdown", then publishes. The approval covers the slicing, not a spec. | `to-tickets/SKILL.md` L42–56 |
| P20 | Fact | `wayfinder` plans instead of doing: tickets resolve decisions, one per session. Research tickets run in sub-agents that push a throwaway `research/<name>` branch. | `wayfinder/SKILL.md` L11–13, L77, L105, L114–115 |
| P21 | Fact | `implement` ends with "Commit your work to the current branch". `implement-spec` creates an integration branch, can open a draft PR, and runs implementers as background sub-agents. | `implement/SKILL.md` L17; `implement-spec/SKILL.md` L17–27 |

Text quoted here is from `main`. An installed copy can differ: the official pin (P9) still names the domain docs file `CONTEXT.md` instead of `GLOSSARY.md`, and a copy installed through the owner's route is whatever was current when `1.3.1` (or an earlier version) was fetched (P22).

## 3. Upstream output against the accepted contracts

Verified from source, not from the decision-map note. "Contract" means [artifact contracts](../artifact-contracts.md), accepted with [ADR 0003](../decisions/0003-minimum-artifact-schemas.md). The `to-spec` and `to-tickets` templates are identical at `v1.3.1` and `49dd158`. Versions older than `v1.3.1` weren't compared.

| # | Contract requirement | Upstream behavior | Fits? |
|---|---|---|---|
| M1 | Spec frontmatter: `schema`, `status` (`draft`/`approved`/`superseded`), `version`, `approved_version`, `approved_hash` (§4.1) | `to-spec` writes none of these (A1) | no |
| M2 | Owner approves the spec before any child exists (§4.3) | `to-spec` publishes with `ready-for-agent` and no review step (P18) | no |
| M3 | Spec sections, including `SC` criteria, Interfaces, Risks, Rollback, Open questions, Revisions (§4.2) | Problem, Solution, User Stories, Implementation and Testing Decisions, Out of Scope, Further Notes (A1) | partly: Problem and Out of Scope overlap |
| M4 | Task frontmatter: `schema`, `tier`, `status`, `parent`, `spec: id@N`, `depends_on`, `verified_at` (§3.1) | Local ticket: `Status: ready-for-agent`, "Blocked by" as text (A3) | no |
| M5 | Eight task states with guards (§3.3) | `to-tickets` sets one triage role, `ready-for-agent`. The triage vocabulary has five roles, about intake, not progress (`triage-labels.md` L5–11). `wayfinder` adds `claimed` and `resolved` for decision tickets (`issue-tracker-local.md` L26–30). None separates completed, verified and accepted | no |
| M6 | Verification table with `B`, `AC`, `R`, `V` rows, each with a result and a commit (§3.4) | Acceptance criteria as checkboxes, no results or commits (A3) | no |
| M7 | Routing and approvals log (§2.3) | None | no |
| M8 | Files and ids: `tasks/<date>-<slug>.md`, `specs/<id>.md`, children `<parent>-<NN>-<slug>` (§2.1) | `.scratch/<feature>/spec.md` and `.scratch/<feature>/issues/<NN>-<slug>.md`, or tracker issues (P13) | no; G-Ingá already took the `NN` dependency order |
| M9 | ADRs in `docs/decisions/` with Status, Date and Deciders; only the owner accepts (contract §1, [CLAUDE.md](../../CLAUDE.md)) | `domain-modeling` offers an ADR under three criteria and writes it to `docs/adr/`. Status, Date and Deciders aren't required, and nothing reserves acceptance for the owner (P17) | no |
| M10 | Subagents default to 0, guideline (§3.5) | `grilling`, `wayfinder` and `implement-spec` dispatch sub-agents (P16, P20, P21) | conflicts with the default |
| M11 | Push and other protected actions need owner approval ([ADR 0002](../decisions/0002-ceremony-tiers-and-routing.md) §3) | `wayfinder` research pushes branches; on GitHub, `to-spec` and `to-tickets` create issues and labels (P20, P13) | needs a gate upstream doesn't have |
| M12 | Heavy question rounds before the spec (ADR 0002 §4, citing P4) | `grilling` rounds: the whole frontier, a recommended answer each (P4) | yes, apart from M10 and the open question style ([principles](../principles.md) §2) |
| M13 | Decomposition into dependency-ordered children; expand–contract for consumed contracts (§9.3) | `to-tickets` vertical slices and expand–contract (A4) | yes as technique; the output format doesn't fit (M4–M6) |

**Inference:** M1–M9 cover every artifact the contract defines, so none of the skills read here can write a G-Ingá artifact without being rewritten. The other upstream skills, for example `triage`, which edits tracker issues, weren't checked against the contract. What fits is technique: question rounds (M12), slicing and expand–contract (M13), and the "no file paths in specs" rule ADR 0003 already adopted (A2).

## 4. Claude Code mechanics that bound each strategy

| # | Label | Claim | Where |
|---|---|---|---|
| C10 | Fact | Plugin skills load as `/plugin-name:skill-name`. When a plugin skill shares a name with a project or personal skill, "Both load". The bare `/name` reaches the plugin skill unless another command already uses it. | skills, "Resolve skills that share a name" and plugin namespacing |
| C11 | Fact | `skillOverrides` can hide individual skills, but "Plugin skills are not affected by `skillOverrides`". A plugin is enabled or disabled as a whole. Permission rules such as `Skill(name)` can deny skills; whether they match a namespaced plugin skill wasn't tested. | skills, "Disabling or hiding skills" |
| C12 | Fact | A default skill's description is always in context. With `disable-model-invocation: true` it isn't. Either way the body loads only when invoked. Extends C6. | skills, "Control who invokes a skill" |
| C13 | Fact | Install scope is user (`~/.claude/settings.json`), project (`.claude/settings.json`, committed) or local. A committed project entry enables a plugin "but doesn't download it": on a machine without it, the session runs and `/plugin` shows `is enabled in project settings but isn't installed here`. | install plugins, "Choose an install scope"; plugin loading |
| C14 | Fact | Auto-update is on by default for `claude-plugins-official` and off by default for every other marketplace, which includes the owner's `mattpocock` marketplace (S1). A running session keeps what it loaded, and the next launch loads the new version. `DISABLE_AUTOUPDATER=1` and similar variables turn the pass off. | install plugins, "Keep plugins updated"; plugin loading, "When auto-update runs" |
| C19 | Fact | Claude Code computes a plugin's version from the manifest's `version` first. A manifest that pins a version keeps every user on the cached copy until the string changes, "however many commits they push". With P22, an update of the owner's install can report "already at the latest version" while upstream text has moved. | plugin loading, "How Claude Code computes the version" |
| C15 | Fact | A cloud session gets the repository's `CLAUDE.md` and `.claude/skills/` as part of the clone. It doesn't install plugins enabled in user settings, nor plugins a repository enables in `.claude/settings.json`, including those from marketplaces it lists under `extraKnownMarketplaces`. | cloud environments, "What carries over from your setup" |
| C20 | Fact | The same table says cloud sessions "automatically load skills you enable on claude.ai". Separately, plugins turned on for a claude.ai account sync into Cowork sessions and into terminal sessions signed in with that account. The docs read here don't say whether account-synced plugins load in a cloud session. | cloud environments, same table; plugin loading, "Plugins synced from claude.ai" |
| C21 | Fact | A repository can carry a plugin in two ways: list it under `enabledPlugins`, or commit the plugin's files under `.claude/skills/` as a skills-directory plugin. Only the first is excluded from cloud sessions by C15. A project skills-directory plugin loads only after the workspace trust dialog is accepted, and the docs say a cloud session never shows that dialog (stated for `extraKnownMarketplaces`). Whether a committed skills-directory plugin loads in a cloud session wasn't verified. Committing upstream files that way is vendoring (strategy 2). | plugin loading, "Plugins shared through a repository" |
| C16 | Fact | Skills and commands "enter Claude's context as instructions". With auto-update on, "the files you reviewed can change on disk". Anthropic "does not control" plugin contents and "cannot verify … that they won't change". | plugin security, "Understand what a plugin can do" and trust warning |
| C17 | Fact (observed) | In this cloud session, `claude plugin list` prints `No plugins installed`, and the directory for account-synced plugins exists but is empty. No Pocock skill is available here. This shows one session, not every cloud session the owner could start. | local CLI `2.1.296`; `~/.claude/plugins/synced/` |
| C18 | Not run | `claude plugin details mattpocock-skills` reports the plugin's every-turn token cost. Not run, because the plugin isn't installed here. D4 can measure it. | install plugins, "See what an installed plugin adds" |

## 5. The three strategies

| | 1. Depend on the installed plugin | 2. Vendor copies of selected skills | 3. Write our own |
|---|---|---|---|
| Contract fit | `to-spec` and `to-tickets` can't produce contract artifacts (M1–M9). Customizing requires a fork, which upstream says is the way (P11) | Copies are just as incompatible until edited. An edited copy is a fork | Can match the contract exactly. Required for every artifact writer anyway |
| Upstream evolution | Depends on the route. Official: text changes on auto-update (C14, C16) from a pin that lags `main` (P9). The owner's marketplace: no auto-update by default, and a version string that can stay put while text changes (P22, C19). Either way, the installed text is neither pinned by G-Ingá nor visible in the repository | Frozen at a commit. Pulling updates means merging into a high-churn source with renames (P10) | No upstream to follow. Improvements arrive only when someone rereads upstream |
| Maintenance cost | None for G-Ingá; the cost is unannounced behavior change | Highest: track, merge and re-license each skill plus its Skill-tool dependencies (`wayfinder` pulls in four) | Own text to maintain; small for the conversational parts (`grilling` is about 1,800 characters) |
| Token and context | Enabled or disabled as one plugin (C11), so all 27 skills are reachable whenever it's on. 11 descriptions, 2,152 characters, every turn (P7). Setup adds a `CLAUDE.md` block every turn (P13) | Only what is copied. Descriptions are under our control | Only what G-Ingá needs, and user-invoked where possible (C12) |
| Customize without silent drift | Not possible: the plugin is a read-only bundle (P12), and its text changes when it updates, on upstream's schedule | Possible, but every edit diverges from the copy's source | Native: the text is the spec |
| Unavailable or failing | Present only where someone installed it: on a machine (C13), or possibly through a claude.ai account (C20). A repository's plugin settings don't bring it into a cloud session (C15), and committing its files would be vendoring (C21). Where it's missing, its skills just aren't there | Present wherever G-Ingá's own files are | Same as 2 |
| Portability and reproducibility | Version depends on route, install date and update setting; not pinned per repository | Pinned and reproducible | Pinned and reproducible |
| License and attribution | None needed (nothing copied) | MIT notice with each copy (P6), plus any third-party notice for files upstream itself copied (P23) | None while only techniques are adapted in our own words (inference, not legal advice). Close copies of upstream text bring the MIT notice back |
| Security and trust | Third-party instructions that can change on update (C16). Content is instructions only (P8), which push, commit and publish to a tracker (M11) | Reviewed once at a pinned commit; changes only through our own commits | Our own instructions |
| Unique G-Ingá behavior needed | Still all of it: routing, records, approvals, verification (M1–M9) | Same | Same; this is the real work in every option |

## 6. What this means for D6

- **Fact:** G-Ingá has to write its own instructions for every artifact and gate in ADR 0002 and ADR 0003. No strategy avoids that (M1–M9), so the choice only concerns the conversational and planning skills around them.
- **Fact:** the accepted contract already reuses upstream technique without upstream text: `NN` dependency order (M8), expand–contract (M13), no file paths in specs (A2).
- **Inference:** depending on the plugin makes G-Ingá's behavior vary with each machine's install and each session's type. A repository can't guarantee the plugin is present without vendoring it (C13, C15, C21). The strongest reasons don't depend on availability, though: contract fit (M1–M9), all-or-nothing loading (C11) and text that G-Ingá doesn't pin (P22, C19).
- **Inference:** vendoring buys reproducibility but pays upstream's churn (P10) for skills that need edits anyway (M10, M11, M12's open style question). An edited copy is our own skill with a license notice, so "vendor and modify" collapses into option 3.
- **Inference:** the owner's goal (S3) rules out any option that leaves the plugin orchestrating part of the cycle for good, so option 1 fails on product grounds before any technical one. What remains is how much G-Ingá rewrites: own the contract path, adapt upstream technique with provenance, vendor nothing without a demonstrated need. The plugin stays in the owner's existing flow only while G-Ingá doesn't yet cover its role. [ADR 0004](../decisions/0004-reuse-strategy-for-existing-skills.md), accepted on 2026-10-10, decides that.

## 7. Cloud availability: guaranteed and not verified

| Question | What the docs guarantee | Verified in the owner's setup? |
|---|---|---|
| Does a plugin installed from a marketplace on the owner's machine reach a cloud session? | No: plugins enabled in user settings don't carry over (C15) | not verified: no cloud session was started from the owner's account with that install; only this session was inspected (C17) |
| Can a repository bring the plugin into a cloud session? | Not through its settings: plugins a repository enables in `.claude/settings.json` aren't installed (C15). Committing the plugin's files under `.claude/skills/` is a separate route the docs don't settle for cloud sessions, and it's vendoring (C21) | not verified by a test; docs only |
| Can skills reach a cloud session through the owner's claude.ai account? | Skills enabled on claude.ai load (C20). For account-synced plugins in cloud sessions the docs read here are silent | not verified: the owner hasn't said whether anything is enabled on the account |
| Do G-Ingá's own files reach a cloud session? | Yes, when they're in the repository's `CLAUDE.md` or `.claude/skills/` (C15) | consistent with this session, where the repository's files were present; where G-Ingá's files live is D5's call |

## 8. Not verified

- The owner's installed plugin version, install date, update setting and any `#ref` pin (S1, P22), and any edits to the installed copy. The owner reported none.
- Which capabilities of each skill the owner actually relies on. §10 infers them from the skills' own text.
- Whether `Skill(...)` permission rules match namespaced plugin skills (C11).
- Whether a committed skills-directory plugin loads in a cloud session (C21), and whether account-synced plugins do (C20).
- The plugin's measured every-turn token cost (C18). The 2,152-character figure (P7) is description text only.
- The license of the third-party text inside upstream's `pr` skill (P23).

## 9. Audit of the claims ADR 0004 rests on

Classes: **verified** (primary source or reproducible local check), **partially verified** (verified with a stated scope limit), **unverified** (not demonstrated here).

| Claim | Evidence | Class |
|---|---|---|
| The upstream skills read here can't write contract artifacts | M1–M9 from source at `49dd158` and `v1.3.1` | verified, for those skills and versions |
| Upstream technique fits G-Ingá's needs | M12, M13: text comparison | partially verified: fit on paper, untested in use |
| The plugin's skills are enabled together | C11 (docs), P7 (manifest) | partially verified: `Skill(...)` deny rules untested; 16 of 27 add no context until invoked |
| 11 descriptions in context every turn, 2,152 characters | P7 (measured), C12 (docs) | partially verified: characters measured, tokens not (C18) |
| On the owner's route, no auto-update by default and a version string that can lag the text | P22 (upstream source), C14, C19 (docs) | partially verified: documented behavior, the owner's machine not inspected |
| The official marketplace pins `c55ee46`, 73 commits behind | P9 (`marketplace.json` at `b8e53f1`) | verified on 2026-10-10; the pin can move |
| Plugins from user or repository settings don't reach a cloud session | C15 (docs) | verified as documented; not tested with the owner's account |
| Committed plugin files under `.claude/skills/` in a cloud session | C21 | unverified |
| Skills enabled on claude.ai load in cloud sessions | C20 (docs) | verified as documented; account-synced plugins there unverified |
| No Pocock skill in this session | C17 | verified for this session only |
| Upstream changes fast and renames these skills | P10 (`git log`, `CHANGELOG.md`) | verified |
| Upstream won't take per-person options | P11 (`SCOPE.md`) | verified (author policy) |
| Copies need the MIT notice; adapted technique doesn't | P6 (`LICENSE`), P23 | partially verified: the first half is the license text; the second is our reading of it, not legal advice |
| The plugin carries instructions only | P8 at two revisions | verified |
| Upstream flows push, commit and publish | M11, P20, P21 (skill text) | verified as instructions; whether each asks first depends on the session's permissions |
| The owner's setup, flow and goal | S1–S3 | owner statement, not inspected. S3 is a requirement, not a claim to verify |

## 10. Capabilities to replace, and how to tell

Every row is **not covered today**. A same-named G-Ingá skill wouldn't prove coverage: a row counts as covered only when its evidence column holds on real tasks. The capability column comes from the skills' own text (§2), not from the owner's description of how they use them (§8). How many tasks are enough is D7's call. The mechanism column is the intended one; which native mechanism implements it is D5's call.

| Skill | Capability the owner may rely on | Expected outcome | Intended G-Ingá mechanism | Evidence of sufficient replacement | Gap or open question |
|---|---|---|---|---|---|
| `grill-with-docs` | Rounds of questions with a recommended answer each; facts looked up, not asked (P4, P16). Side records: glossary terms, ADRs offered for hard-to-reverse decisions (P17) | Shared understanding before building, nothing silently assumed, decisions written down | `heavy` question rounds before the spec draft (ADR 0002 §4). Decisions go to `decided:` entries, the spec's `## Decisions`, and ADRs in `docs/decisions/` when architectural | Approved specs have an empty `## Open questions` or only `deferred:` items. No friction-log entry of the kind "fell back to `/grill-with-docs`", and no spec reopened because rounds missed a question | Question style ([principles](../principles.md) §2). No glossary in G-Ingá. Fact-finding sub-agents against the default of 0 (M10) |
| `to-spec` | Turn an already-discussed thread into a spec without re-interviewing; agree on test seams (P18) | A written spec the work can be sliced from | `spec/1` drafted from the rounds, approved by the owner, body frozen by hash ([contract](../artifact-contracts.md) §4) | Spec records pass the repository validator and carry an `approved: spec vN` entry. No friction-log entry saying the spec lacked something `to-spec` would have given | `to-spec`'s User Stories and Testing Decisions have no `spec/1` section. Whether the owner relies on them is unknown |
| `to-tickets` | Vertical, independently verifiable slices with blocking edges; expand–contract for wide refactors; the owner approves the breakdown before it's published (P19, A4) | A dependency-ordered set of tasks, each startable when its blockers are done | `heavy` parent `## Plan` listing `task/1` children with `depends_on` and `spec: id@N` ([contract](../artifact-contracts.md) §3, §9.3) | Children pass the validator's start guards and spec gate. Each child reaches `verified` on its own. No friction-log entry about re-slicing after work started | ADR 0002 gates the spec, not the breakdown. If the owner relies on approving the breakdown, that's an amendment to ADR 0002, outside D6. Publishing to GitHub Issues isn't in V1 |
| `wayfinder` | A persistent map of decision tickets (research, prototype, grilling, task) for an effort too big for one session, resolved one per session until a spec can be written (P20) | Decisions, not code; a route that survives across sessions | None dedicated. Nearest: `heavy` through H1 or H5 (ADR 0002 §2), which assumes one parent and one spec, plus the manual decision-map, ADR and research-note process this repository uses | The owner takes a real multi-session effort from fog to an approved spec without opening `/wayfinder`, and logs no friction about losing the map or the frontier between sessions | The largest gap: multi-decision discovery across sessions isn't modeled by ADR 0002 or ADR 0003. Until it's resolved, `wayfinder` stays in the transition flow |
