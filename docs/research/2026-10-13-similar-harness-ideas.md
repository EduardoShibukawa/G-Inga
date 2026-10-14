# Similar Harness Ideas in the Wild — Research for G-Ingá

Date: 2026-10-13. Status: research only, no implementation.
Context: `docs/architecture/2026-10-13-handoff-harness-proposal.md` (Epic > Feature > Task via thin `ginga` CLI, 2–4k token packets, 5-layer verify gate, worktree-per-task, manual human air-gap for `agy`, cost-per-APPROVED-task).
Prior validation: `docs/research/2026-10-13-community-crosscheck.md` (already VALIDATED: subagents vs teams, hooks-as-gate, air-gap ToS, OpenCode elastic layer, token economy).

Method: every factual claim below traces to the primary source that owns it — the project's own repo README/docs or official product docs, fetched 2026-10-13. No blog rewrites used as evidence (a few are named only as pointers, marked as such).

---

## A. Skills / spec-driven SDLC harnesses

### 1. GitHub Spec Kit — constitution → specify → plan → tasks → implement → converge

What it is: an MIT-licensed open-source toolkit (141k stars) that gives coding agents structured processes via agent skills plus reusable templates. SDD flow is **constitution (once per project) → specify → plan → tasks → implement → converge per feature**, invoked as `/speckit-*` skills in the agent's chat, with artifacts under `.specify/`. Separate opt-in extensions cover bug-fixing (assess → fix → test, verdict `verified`/`partial`/`failed`) and idea assessment (intake → research → define → shape → decide, ending `go`/`needs-clarification`/`kill`).
Owning sources: <https://github.com/github/spec-kit> (README: process table, skill invocations, extension commands, `.specify/bugs/<slug>/` and `.specify/assessments/<slug>/` artifact paths).

Mirrors/challenges: mirrors our Epic-heavy/spec + SC rows and Task-AC structure almost 1:1 (spec → plan → tasks → implement, human reviews each phase before continuing). Challenges us on two points: (a) Spec Kit repeats **implement → converge until "Converged"** — a named fixpoint loop our gate lacks (we retry max 2 then block); (b) Spec Kit treats bug-fix and assessment as **first-class separate processes**, while our proposal funnels everything through Epic>Feature>Task.

Adopt: (1) the **converge-until-clean loop vocabulary** — add a `converge` step to `seal` semantics (retry-with-log already exists; name the fixpoint and its exit word like Spec Kit's `verified/partial/failed` verdicts); (2) the **constitution-once-per-project** artifact — our Epic spec currently re-derives principles per epic; a single repo-level constitution file that packets cite by pointer would cut packet tokens. Reject: the heavyweight phase-gate rigidity OpenSpec explicitly contrasts itself with (see §2) — our tier system (light skips spec) already handles this, keep it.

### 2. OpenSpec — delta-specs + propose → apply → archive, built for brownfield

What it is: an MIT-licensed spec framework (71.8k stars, `npm install -g @fission-ai/openspec`) organized around `openspec/` change folders (`proposal.md`, `specs/` delta-requirements, `design.md`, `tasks.md`). Default workflow is `/opsx:explore` → `/opsx:propose` → `/opsx:apply` (+`/opsx:verify`) → `/opsx:archive` (date-prefixed archive dir, prompts to sync deltas into main specs). Philosophy is explicit: "fluid not rigid, iterative not waterfall", "built for brownfield not just greenfield", no rigid phase gates; works with 30+ assistants; recommends high-reasoning models (Codex/Opus-class) and clean-context hygiene before implementation.
Owning sources: <https://github.com/Fission-AI/OpenSpec> (README: philosophy block, change-folder artifact list, archive path, model/context guidance); workflow detail <https://openspec.dev>.

Mirrors/challenges: mirrors our task-record + archive instinct (our `verified→accepted` resembles their sync+archive). Challenges us hardest on **delta-vs-full specs**: OpenSpec never rewrites the whole spec — each change is a scoped diff against a source-of-truth spec, merged (sync) only at the end. Our Epic spec + SC rows risk becoming a rewritten monolith per epic. Also challenges our phase rigidity: OpenSpec lets you "update any artifact anytime, no rigid phase gates".

Adopt: (1) **delta-spec discipline** — Task/Feature records should carry only their delta (what changes + why), with the Epic spec as the merge target at `accepted`, not copy-pasted context; this directly shrinks packets and matches the to-tickets "no file paths in tickets" rule (§6). (2) **`/opsx:verify`-style separate verify command** as a named gate step distinct from apply — we already have this (`seal`), so align vocabulary. Reject: "update any artifact anytime" fluidity for the gate path — our L3 ancestry check (`merge-base`) *requires* a pinned fixed point, which is incompatible with mid-flight spec edits; keep fluidity for explore/plan tiers, rigidity for seal.

### 3. BMAD-Method + BMAD Loop — agile-native agents with gateable unattended epics

What it is: MIT-licensed multi-agent framework (54.1k stars, `npx bmad-method install`): right-sized process (direct-to-build for clear changes, deeper planning for large initiatives), durable file-based context (`_bmad-output/` planning artifacts, epics, `sprint-status.yaml`), specialized role perspectives, guided collaboration without handing over judgment. Its **BMAD Loop** submodule "builds, verifies, and retros a whole epic unattended", with a `gates.mode` setting deciding leash length: `none` (whole epic, no stops), `per-epic` (default, pause between epics), `per-story-spec-approval` (checkpoint before every story); unresolvable items (flaky test, ambiguous requirement, human-owned calls) get caught and surfaced rather than auto-resolved.
Owning sources: <https://github.com/bmad-code-org/BMAD-METHOD> (README: module table incl. BMAD Loop, right-sized/durable-context bullets, install commands); loop gate modes + unattended semantics per dedicated BMAD Loop research (repo `bmad-code-org/bmad-loop`, docs `docs.bmad-method.org/build/autonomous-development-loops`).

Mirrors/challenges: mirrors our tier system (light/standard/heavy ≈ their right-sized paths) and our E3/blocked escalation. Challenges us on **gate granularity**: our breaker is binary (2 fails → blocked + owner escalate), theirs is a 3-position dial the owner sets *per epic based on trust in that epic*. Also challenges our "human merges" stance: their loop squashes story commits and merges unattended *within* the leash, escalating only at gates.

Adopt: **leash-per-epic dial** — add a per-Epic `gates.mode`-equivalent (`unattended | per-feature | per-task-approval`, default `per-feature`) so low-risk epics flow without a human per task while auth/payment epics keep per-task approval. This is strictly more expressive than our current single global policy and composes with L1–L5. Reject: fully unattended merging to main — our L5 atomic-commit + human-merge rule stays; the dial controls *human review points*, never whether the gate runs.

### 4. Aider architect/editor split — cheap-draft/strong-review, two-model pattern with measured wins

What it is: Aider's experimental `--architect` chat mode splits each coding task into two inference steps: an **Architect** model describes how to solve the problem (free-form), an **Editor** model turns that into well-formed file edits. Motivation: strong reasoning models (o1-class) often fail at edit-format conformance; chaining got practical only once frontier speed/cost allowed it. Measured result on Aider's own code-editing benchmark: o1-preview Architect + o1-mini/DeepSeek Editor hit 85% SOTA; Sonnet/GPT-4o/GPT-4o-mini all scored higher as Architect/Editor pairs than solo.
Owning source: <https://aider.chat/2024/09/26/architect.html> (motivation, two-step mechanism, full benchmark table); modes doc <https://aider.chat/docs/usage/modes.html>.

Mirrors/challenges: mirrors our "cheap default, expensive only on signal + review by a different model" router (§9.1) and gives it the empirical backbone our H1–H3 hypotheses lack. Challenges our routing axis: we route mostly by *task category*, Aider routes by *cognitive role* (reason vs edit-conformance) — orthogonal and combinable.

Adopt: make the router **two-dimensional** (task category × role): planning/architecture goes to the strongest reasoner, edit execution to the cheapest competent editor, final validation to a *different* model than the author. This is exactly our §9.3 calibration experiment's direction; Aider's table is the prior to beat. Reject: nothing — but note the cost caveat in the source itself (whole-file edit format steps are "probably not practical for interactive use"): keep diff-scoped edits so the editor step stays cheap.

---

## B. Multi-agent orchestration: task graphs, frontiers, worktrees

### 5. implement-spec skill — task graph + frontier + worktree-per-implementer + merger + final review

What it is: a community skill defining spec implementation as: tickets form **a task graph with blocking relationships** exposing a **frontier** of grabbable tickets; **implementer subagents run in the background, each in its own worktree on its own branch** (confirming/resetting onto the integration branch first, merging integration tip before reporting done); a **merger subagent** integrates each finished branch; when the frontier advances, more implementers spawn; at the end a **code-review pass** runs on the integration branch and all its issues are fixed by a single implementer; worktrees are cleaned up. Communication is **sparse, via context pointers** (spec, tickets, notes, commits), never duplicated prose.
Owning source: <https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/implement-spec/SKILL.md> (full 9-step process, fetched verbatim 2026-10-13).

Mirrors/challenges: this is the closest existing match to our §6.2 session pattern (two Task dispatches + gate + seal). It challenges us with **three roles we skipped**: (a) *merger* subagent (we have workers commit directly — collision-prone); (b) *integration branch + draft PR after first merge* (we gate per-task but never define where approved tasks land or how they compose); (c) *exploration subagent saving notes outside the repo* (we do explore inline, polluting the worktree).

Adopt: all three, in order: integration branch per Feature (`w/` draft PR after first sealed task), merger role in `seal` (worker branches never touch the integration branch directly; seal merges only on L1–L5 pass), exploration notes to a scratch dir outside the repo that packets cite by pointer. Reject: nothing — this skill is the field's best-validated shape of our own design; divergence here would be risk, not advantage.

### 6. to-tickets skill — tracer-bullet slices, blocking edges, frontier discipline, no paths in tickets

What it is: a companion skill that breaks a plan/spec into **tracer-bullet vertical slices** — each a narrow but complete path through every layer, **sized to fit in a single fresh context window** — each declaring its **blocking edges**; execution works the **frontier** (any ticket whose blockers are all done). Wide refactors are the named exception, sequenced as **expand–contract** (add new form → migrate in batches → delete old), not tracer bullets. Ticket bodies carry *behavior + acceptance criteria only*; **no file paths or code snippets** (they go stale) — paths live in the execution packet, not the ticket.
Owning source: <https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/to-tickets/SKILL.md> (slice rules, expand–contract exception, frontier rule, no-paths rule, local-ticket template — fetched verbatim 2026-10-13).

Mirrors/challenges: mirrors our `depends_on` edges and atomic-Task sizing, and sharpens both: our "atomic (one worktree, one PR)" is vaguer than "fits in a single fresh context window", and our records currently mix ticket content with scope paths. The no-paths rule directly challenges our `task show --json` shape if it embeds paths.

Adopt: (1) **size rule = one fresh window** as the Task atomicity test (operationalizes our 2–4k packet budget); (2) **paths in packets, never in tickets** — `task show` should emit behavior+ACs+edges; `handoff create` injects the In-Scope paths; stale-`Ref` reruns then only invalidate packets, never the record. (3) **expand–contract** as the mandated shape for wide refactors (our proposal has no refactor pattern). Reject: nothing.

### 7. Gas Town — Mayor + convoys + git-backed hooks + Bors-style refinery + seance (the maximalist counterpoint)

What it is: Steve Yegge's open-source (MIT, 18.4k stars) multi-agent workspace manager for Claude Code/Copilot/Codex/Gemini: a **Mayor** coordinator, **polecat** worker agents with persistent identity but ephemeral sessions, **git-worktree hooks** as persistent storage, **convoys** bundling tracked work items (beads), a three-tier watchdog (Witness per-rig, Deacon cross-rig, Dogs maintenance), a **Refinery** Bors-style bisecting merge queue (workers never push to main; failed MRs isolated or re-dispatched), a **Scheduler** capacity governor against API rate limits, **escalation** routing by severity, **seance** (spin up a predecessor's session via `/resume` and interrogate it), and OTel telemetry for all agent ops. Explicitly targets 20–30 parallel agents; reported costs (~$100/hr heavy use) and chaos (duplicate fixes, lost designs) are documented in the wild.
Owning sources: <https://github.com/gastownhall/gastown> (README: roles, hooks, convoys, refinery, scheduler, seance, telemetry); <https://steve-yegge.medium.com/welcome-to-gas-town-4f25ee16dd04> (MEOW stack, stages framing).

Mirrors/challenges: mirrors our worktree isolation, merger/refinery instinct, and resume needs — at 10× our scale. Challenges us on every axis of **scale vs control**: Gas Town proves the graph+worktree pattern works at 20–30 agents *and* proves the failure modes (cost blowup, conflicting agents, review bottleneck) our proposal avoids by staying at 2 parallel worktrees with disjoint scopes.

Adopt (selectively): (1) **Bors-style merge discipline** — the Refinery's batch-verify + bisect-on-red is the grown-up version of our merger role; adopt the rule "never push to integration branch directly; batch-verify, bisect on red" even at our scale. (2) **`seance` interrogation** — fresh-window resume via *questioning the predecessor session* beats our static Checkpoint when the diff is ambiguous; add `ginga handoff resume --ask` semantics. (3) **Scheduler capacity governor** — our P4 parallel step needs its `max_polecats`-equivalent before it needs a third worktree. Reject: the Mayor/polecat/convoy/beads superstructure, the 20–30-agent target, and tmux-backed long-lived agents — for a personal harness this is cost and complexity without measured return (our §9.3 stop rules: throughput <1.6× or cost >1.4× kills parallelism; Gas Town's own field reports validate that caution).

### 8. Native subagents + isolation:worktree (Claude) / build-plan-general-explore-scout (OpenCode)

What it is: both hosts now ship first-party the primitives our proposal hand-rolls. Claude: subagents run in **their own context window, return only the summary**, bill to the same quota, route cheap tasks to Haiku; **`isolation: worktree`** frontmatter gives a subagent an isolated repo copy auto-cleaned when changeless; **agent teams** are experimental, ~7× tokens in plan mode, roughly proportional to team size. OpenCode: primary (`build` full-access, `plan` restricted) vs subagents (`general`, `explore` read-only, `scout` dependency research), per-agent `model`, `permission`, `steps` caps.
Owning sources: <https://code.claude.com/docs/en/sub-agents> ; <https://code.claude.com/docs/en/agent-teams> ; <https://code.claude.com/docs/en/costs> ; <https://opencode.ai/docs/agents/> (all fetched; details already tabulated in community-crosscheck §1/§4/§5).

Mirrors/challenges: validates our Task-subagents-not-teams + disjoint-scopes + cheap-explore choices exactly (see crosscheck). Challenges our hand-rolled `git worktree add` in `handoff create`: native `isolation: worktree` does provision + cleanup, but only inside that host's sessions — it cannot cover the manual `agy` leg.

Adopt: use **native isolation + native subagent types** wherever the worker runs inside Claude/OpenCode (less code, auto-cleanup), keeping hand-rolled worktrees only for the human-bridged `agy` leg; set OpenCode `steps` caps as the E3 early-stop actuator. Reject: agent teams for G-Ingá scope (docs: experimental, 7× cost, no nested teams, no resume with in-process teammates).

---

## C. File-based handoffs and checkpoint-resume

### 9. LangGraph checkpointers + interrupts — the formal theory of our Checkpoint + gate

What it is: LangGraph's persistence layer: **checkpointers** save per-thread graph-state snapshots at every super-step (short-term, thread-scoped: continuity, HITL, time-travel, fault tolerance) with `thread_id` as the persistent cursor; **stores** hold cross-thread facts. **`interrupt()`** pauses a node, persists exact state, surfaces a JSON-serializable payload, waits indefinitely, and resumes via `Command(resume=…)`; documented patterns include approve/reject routing, review-and-edit-state, interrupts inside tools, multi-interrupt resume maps, and static `interrupt_before/after` breakpoints for debugging. Sharp rules: nodes re-run from the top on resume (side effects before `interrupt` must be idempotent; never wrap `interrupt` in bare try/except; keep interrupt order deterministic).
Owning sources: <https://docs.langchain.com/oss/python/langgraph/persistence> ; <https://docs.langchain.com/oss/python/langgraph/checkpointers> ; <https://docs.langchain.com/oss/python/langgraph/human-in-the-loop> (interrupts page, fetched verbatim 2026-10-13).

Mirrors/challenges: this is the formal version of our Checkpoint + `ready_for_gate` + seal: our `## Checkpoint (branch/HEAD/done/next)` ≈ their checkpointer snapshot + `thread_id` cursor; our seal gate ≈ their approve/reject interrupt node; our "reconcile via git status vs as-of" ≈ their resume-from-top semantics. It challenges us with correctness rules we haven't written: **idempotency of pre-gate side effects** (a resumed worker re-runs its node — our workers must not double-apply migrations/sends), **JSON-serializable return schema** (our `ready_for_gate` block should be schema-validated, not free prose), **static breakpoints** (our `--pre-dispatch` check is one; add post-edit `interrupt_after`-equivalents via hooks).

Adopt: (1) **typed `ready_for_gate` schema** with validation in `seal` (reject malformed returns before running L1–L5); (2) **idempotency rule** for worker packets ("steps before Checkpoint must be re-runnable; side-effecting steps go after the gate"); (3) **approve/reject/edit routing** in seal outcomes (currently pass/fail/blocked; add `edit` = human-amended-then-pass, matching their review-and-edit pattern). Reject: adopting LangGraph itself — our persistence is git + Markdown (durable, diffable, tool-agnostic); a framework checkpointer would tie the harness to one runtime and break the human-bridged leg.

### 10. Claude sessions: transcript persistence, --resume/--continue, /compact, resume-from-summary

What it is: Claude sessions persist continuously as local JSONL transcripts; resume via `claude --continue` / `claude --resume [id|name]` / `/resume` picker / `--fork-session` branches; `/clear` starts fresh (old session stays resumable); `/compact` summarizes history in place; on Pro/Max, resuming a >100k-token session idle >~1h offers **resume-from-summary vs full-session-as-is** (cache expired, full history costs full reprocessing either way); `claude -p --resume <id>` enables scripted follow-ups with structured JSON output; resumed sessions restore model/agent/permission-mode/goal but *not* all launch flags (`--settings`, `--add-dir` must be re-passed).
Owning source: <https://code.claude.com/docs/en/sessions> (all mechanics above, fetched verbatim 2026-10-13).

Mirrors/challenges: validates our "idle >60min or context ≥80% → discard + Checkpoint resume" rule (their 1h cache TTL + resume-from-summary dialog is the same physics) and our `--output-format json` totals-import trick (their scripted `-p --resume` + JSON interface). Challenges our Checkpoint minimalism: their resume restores *full history + model + permission mode + goal*, ours only branch/HEAD/done/next — we should consciously decide what else a packet needs (permission mode and model deserve explicit fields; see §12).

Adopt: (1) **packet fields for model + permission-mode**, mirroring what native resume restores; (2) **resume-from-summary as the named pattern** for our fresh-window resume (our Checkpoint *is* the summary — say so); (3) **`--fork-session` semantics** for "try a different approach without losing the path" (our retry packets should fork the worktree branch, not reuse it). Reject: full-transcript resume as a mechanism — our 2–4k budget forbids it; summary-only is the point.

### 11. Ralph pattern + snarktank/ralph — file-memory autonomous loop, one task per fresh context

What it is (pattern, Huntley): software built as **a loop, not a Jenga stack** — "allocate the array with the required backing specifications, give it a goal, loop the goal"; **monolithic single-process, one task per loop** (explicitly anti-microservices-agents: non-deterministic agents multiplexed = "red hot mess"); watch the loop, fix failure domains as engineering. What it is (implementation, snarktank/ralph, 21.9k stars): a bash loop spawning **fresh AI instances** (Amp/Claude) until all `prd.json` stories pass: per iteration pick highest-priority `passes:false` story → implement → run quality checks → commit iff green → mark `passes:true` → append learnings to `progress.txt`; memory *between* iterations is only **git history + `progress.txt` + `prd.json`**, plus **AGENTS.md updates** (learnings written where tools auto-read them); stop condition `<promise>COMPLETE</promise>`; small-tasks-only and green-CI-or-it-compounds rules.
Owning sources: <https://ghuntley.com/loop> (monolithic-loop doctrine, one-task-per-loop, watch-the-loop); <https://github.com/snarktank/ralph> (README: loop steps, file-memory trio, AGENTS.md updates, stop condition, sizing/feedback rules).

Mirrors/challenges: the file-memory trio is our Checkpoint's elder sibling (our Checkpoint ≈ their `progress.txt` +/story-status, our packet ≈ their prompt template, our 5-layer gate ≈ their typecheck+tests+green-CI rule). Challenges us twice: (a) **AGENTS.md-as-memory** — learnings written back to auto-read files compound across runs; our proposal has no learning loop (every retry starts equally ignorant); (b) **fresh instance per iteration** — they restart the agent *every* story; we resume windows. Their small-tasks + green-CI rules are stricter versions of our atomicity + L2/L4.

Adopt: (1) **learnings log** — `seal` failures append one line to a per-epic `learnings.md` (or AGENTS.md-scoped file) that future packets cite; this is the cheapest compounding improvement available. (2) **fresh-window-per-retry default** (fits our packet economics: retries are cheap *because* packets are small). (3) **green-CI-or-it-compounds** as an explicit L4 corollary. Reject: the fully-unattended overnight loop *for the agy leg* — Ralph assumes the loop can legally spawn the agent; our ToS air-gap (§F) forbids that for consumer `agy`, so our loop pauses at the human bridge by design (a load-bearing divergence, not a gap).

---

## D. Human-in-the-loop approval gates

### 12. Claude permission system + hooks — enforcement the model cannot talk its way out of

What it is: tiered permissions enforced **by Claude Code, not the model** (prompt/CLAUDE.md text cannot grant access): `deny > ask > allow` evaluation, `Bash(...)`/`Read(...)`/`WebFetch(domain:...)`/`Agent(...)` rule syntax, six modes (`default/manual`, `acceptEdits`, `plan`, `auto` classifier-reviewed, `dontAsk` auto-deny, `bypassPermissions` container-only) with critical-path circuit breakers even allow-rules can't override (`rm -rf /` denied regardless). Hooks (`PreToolUse`/`PostToolUse` incl. failure/batch, `SubagentStop`, `TaskCreated/TaskCompleted`, `TeammateIdle` exit-2-to-block, `WorktreeCreate/WorktreeRemove` overrides, `PreCompact`, `SessionStart/End`) run shell/HTTP/MCP/prompt/agent handlers with JSON decisions — the deterministic-gate actuator our proposal currently only sketches as manual Bash calls.
Owning sources: <https://code.claude.com/docs/en/permissions> ; <https://code.claude.com/docs/en/permission-modes> ; <https://code.claude.com/docs/en/hooks> (lifecycle + event table + `if`-filtering + exit-code protocol, fetched verbatim 2026-10-13).

Mirrors/challenges: mirrors our destructive/prod/creds `ask` policy and `permission.bash` deny list, and hardens them from convention to mechanism. Challenges our "main remembers to run the gate" design: docs prescribe `TeammateIdle`/`TaskCompleted` exit-2 blocks and `PostToolUse` lint/scope checks — enforcement that fires *whether or not the orchestrator remembers*.

Adopt: wire the gate as **real hooks** (`PostToolUse` on Edit|Write → L1-scope/L4-lint fast path; `SubagentStop`/`TaskCompleted` → full L1–L5 with exit-2 block; `PreToolUse` deny rules for `rm *`/push/deploy/creds; `WorktreeCreate/Remove` overrides for provision/cleanup), keeping manual `Bash` gate calls as the fallback for the human-bridged leg where hooks can't run. Reject: `bypassPermissions` anywhere outside throwaway containers (docs warning is explicit); `auto` mode only behind the per-epic leash dial (§3).

### 13. OpenCode permissions + steps + doom_loop — per-agent least privilege with iteration caps

What it is: `permission` config (`allow/ask/deny`, granular per-command objects, **last-match-wins**, `external_directory` guard, `.env` denied by default) overridable **per agent** (agent rules take precedence; Markdown frontmatter supported); `task`-permission scoping of which subagents an agent may spawn; **`steps` caps** forcing text-only summary at the limit (cost control); **`doom_loop`** guard (default `ask`) firing on 3 identical repeats; `--auto` mode approves only non-denied requests.
Owning sources: <https://opencode.ai/docs/permissions> ; <https://opencode.ai/docs/agents> (max-steps, task permissions, per-agent permission blocks — fetched verbatim 2026-10-13).

Mirrors/challenges: mirrors our per-task least-privilege + early-stop thesis with native actuators we should use instead of re-implementing. One caution from the field (OpenCode issue tracker): subagent/task permissions are reportedly **non-transitive** (a denied agent can delegate to an allowed subagent) — treat permissions as speed-bumps plus audit trail, with the L1 scope/diff check in `seal` as the real enforcement (defense in depth, consistent with §12's sandboxing note).

Adopt: `steps` caps on every cheap OpenCode worker (the E3 early-stop made automatic), `doom_loop: ask` everywhere, per-agent `bash` deny for push/deploy/creds, `task`-scoping so reviewers can't spawn builders. Reject: relying on permission denial *alone* for destructive-action safety (non-transitivity + Bash-rule bypassability per Claude docs §"what a Bash rule doesn't match" — the gate's L1 + secret scan remains authoritative).

### 14. LangGraph interrupts as the approval-gate pattern language (dynamic, typed, resumable)

What it is: `interrupt(payload)` pauses anywhere, conditionally, with any JSON-serializable payload; resume with `Command(resume=…)`; typed `response_schema` (Pydantic/TypedDict) validates resume values and renders typed UI forms; multi-interrupt resume maps; interrupts composable inside tools (approval lives with the tool, reusable across graphs).
Owning source: <https://docs.langchain.com/oss/python/langgraph/human-in-the-loop> (patterns: approve-or-reject, review-and-edit, in-tool interrupts, validation loops — fetched verbatim).

Mirrors/challenges: gives our seal outcomes a vocabulary upgrade — our pass/fail/blocked is poorer than approve/reject/**edit**-and-continue. Challenges us to type the human's resume input (currently free-form paste-back).

Adopt: seal outcome `amended-pass` (human edited the diff, gate re-ran green) + a tiny response schema for the human bridge (verdict enum + note), so `ginga budget` can distinguish clean passes from amended ones in cost-per-approved-task stats. Reject: in-process indefinite waits — our interrupts resolve via files + human paste (async, durable), never a blocking prompt inside an agent turn (quota-burning and ToS-risky).

---

## E. Autonomous loops, circuit breakers, cost control

### 15. Ralph loop discipline — fresh context + feedback loops + stop conditions (adopt the discipline, note the scope difference)

Covered in §11; loop-specific takeaways: same-prompt re-fired on a fresh instance until a machine-checkable stop condition; exactly one task per iteration; feedback loops (typecheck/tests/browser-verify) are **load-bearing, not optional** ("Ralph only works if there are feedback loops"); stop on `<promise>COMPLETE</promise>` or max iterations (default 10).

Adopt: our E3 breaker (2 fails → blocked) is Ralph's max-iterations with a smaller fuse — appropriate for a human-bridged loop where each iteration costs human attention, not just tokens. Add their **"too big, split it"** sizing veto to `handoff create` (refuse to emit packets for tasks that can't fit one window — matches §6's size rule). Reject: same-prompt blind refire — our retries must carry the gate log (Ralph implementations do carry `progress.txt`; a same-prompt retry without new evidence is exactly what E3 exists to kill).

### 16. Claude cost mechanics — /usage, attribution, OTel, 7× teams, cache TTL, CLAUDE.md <200 lines

What it is: per-session `/usage` (session cost, prompt-cache line with warm/cold + TTL, plan-usage attribution by skill/subagent/MCP/loops, behavior flags at ≥10%); org controls (workspace spend limits, per-user analytics API, OTel export as the only near-real-time cross-setup option); reduction playbook: `/clear` between tasks, Haiku subagents, hooks that grep instead of reading, skills over CLAUDE.md bulk (aim <200 lines), plan mode before implement, stop/rewind early; team costs (~$13/dev/active-day pilota baseline; **agent teams ≈7× in plan mode**); long-session physics (full history re-sent per request; cache 1h subscription → 5min on credits/API).
Owning source: <https://code.claude.com/docs/en/costs> (every figure above, fetched verbatim 2026-10-13).

Mirrors/challenges: this doc is the empirical base of our whole §10 (no re-send, isolation, early stop, right-model-first-time, resume-without-replay) — already traced in crosscheck §5. Challenges our budget math: **prompt-cache TTL asymmetry** (1h vs 5min) must enter `ginga budget` or window-burn estimates will be wrong after breaks; and the 7× figure is the quantitative bound behind our no-teams rule.

Adopt: TTL-aware budgeting (record cache state at seal; never assume warm cache after >60min idle), `/usage` + OTel as the `ginga budget import` sources for the Claude leg, CLAUDE.md <200-lines discipline for the harness's own agent-facing files. Reject: nothing — but keep subscription windows as burn metrics, never MTok equivalents (proposal §9.1 already does; the costs doc confirms why: plan usage isn't token-metered).

### 17. BMAD Loop gates + Gas Town scheduler/refinery as circuit-breaker precedents

What they are: BMAD Loop's `gates.mode` dial + unresolvable-item surfacing (§3); Gas Town's Scheduler (config-governed concurrency cap preventing API rate-limit exhaustion; default direct dispatch, deferred dispatch when capped) and Refinery batch-verify/bisect (§7); OpenCode `steps` + `doom_loop` (§13); Ralph max-iterations (§15).
Owning sources: as in §§3/7/13/15.

Mirrors/challenges: our L5 (record + breaker) + kill rules (3 retries, 15min no-green-diff, cost >2× estimate) sit squarely in this family but are currently *global constants*. Every precedent here parameterizes the breaker per-scope (per-epic leash, per-rig scheduler cap, per-agent steps).

Adopt: parameterize E3/kill rules per Epic tier (heavy epics get more retries + longer green-diff windows; light tasks get fewer), and add a **concurrency cap** (max 2 worktrees — already de facto; make it a config the scheduler enforces, Gas Town style). Reject: automatic rate-limit-driven dispatch (we have no daemon; a static cap + human dispatch is the right scale).

---

## F. Cross-tool routing and human-bridge air-gaps

### 18. Cross-model routing precedents — Aider (§4) + OpenCode provider mesh + OpenRouter fallbacks

What they are: Aider routes by cognitive role across providers (o1 Architect + Sonnet/DeepSeek Editor, §4). OpenCode supports 75+ providers (API keys, Zen pay-per-request, Go subscription, OpenRouter with `order`/`allow_fallbacks`, any OpenAI-compatible baseURL incl. Ollama/vLLM, `google` via `GEMINI_API_KEY`); **only OpenRouter ordering and Go balance fallback give failover — no automatic cross-provider failover in core**. Asymmetry: ChatGPT Plus/Pro OAuth and Copilot subscription login remain supported; the ban is Anthropic-specific.
Owning source: <https://opencode.ai/docs/providers/> (Zen/Go/OpenRouter/fallback semantics, full directory — fetched verbatim 2026-10-13).

Mirrors/challenges: validates our router + "orchestrated Gemini via `GEMINI_API_KEY`, never consumer login" + "never Claude Pro inside OpenCode" rules (crosscheck §4). Challenges us to state the failover limit honestly: our P5 "fallback order" can only be *ordered retry* (OpenRouter order lists, Go balance), not transparent failover.

Adopt: router fallback = ordered provider/model list executed by `ginga` (deterministic, logged per attempt for `budget`), with OpenRouter `allow_fallbacks:false` + explicit order for reproducibility. Reject: implicit cross-provider failover expectations; and any future "Pro/Max OAuth plugin" for OpenCode (docs: prohibited as of 1.3.0, Anthropic-explicit).

### 19. The manual air-gap — Antigravity ToS + wizard pattern (load-bearing, non-optional)

What they are: (a) Antigravity FAQ verbatim: third-party access with an Antigravity login violates ToS and "can result in suspension or termination"; `agy -p` headless is "intended for direct scripting and CI workflows" and "wrapping `agy` inside third-party coding agents or applications, or automating account rotation, is not supported under consumer plans"; worktrees *are* supported in the app. (b) The wizard pattern: "a bash script that walks a human, step by step, through a manual procedure… Don't run it end-to-end yourself: it opens browsers and blocks on human input" — agent authors exact command text + file, human executes, agent never runs it.
Owning sources: <https://antigravity.google/docs/faq/> (both quotes verbatim, fetched 2026-10-13); <https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/wizard/SKILL.md> (scope→map→author→verify-and-hand-off, `bash -n` + shellcheck, ephemeral-by-default).

Mirrors/challenges: this is our §6/§10.1 design in the field's own words — packet-print + human-paste is the compliant shape; Opus-5.5-main-spawns-`agy` is both violations at once. The wizard's stage discipline (per-value: where the human gets it → where it's written → secret or not; `confirm` before irreversible actions) is stricter than our current packet format and worth copying for the creds-adjacent fields.

Adopt: wizard stage-discipline for packet section 4 (Out-of-scope/forbidden) and section 8 (return block): every path/command the human must paste gets exact-text + worktree + irreversibility flag; packets stay ephemeral by default (delete on `accepted`, like wizards). Keep tracking the two quota bars separately + Nov-2026 model removals + overages-Never (crosscheck §3 — still current per docs sidebar Plans/Models pages). Reject: any automation that spans the air-gap (no OpenCode-to-`agy` tool, no `ginga --host agy` spawn, no rotation) — suspension risk makes this the one constraint that is never relaxed for throughput.

---

## Ranked lists

### 3 most adoptable techniques for G-Ingá (highest value, lowest cost)

1. **Typed packets + typed returns + delta-only records** (§§2, 6, 9, 14). No file paths in ticket bodies; paths injected at `handoff create`; `ready_for_gate` validated against a schema in `seal` (reject malformed before L1); Task records carry behavior + ACs + edges only (OpenSpec-delta discipline). Cost: a schema file + a validation step. Pays for itself the first time a stale path stops invalidating a record, and it shrinks every packet.
2. **Learnings log + AGENTS.md-style memory** (§11). `seal` failures append one line to a per-epic learnings file that future packets cite by pointer. Cost: near-zero. This is the only compounding improvement in the entire survey — everything else is linear.
3. **Real hook wiring for the gate + per-agent steps/doom_loop caps** (§§12, 13). `PostToolUse` fast-path (scope/lint), `SubagentStop`/`TaskCompleted` full L1–L5 with exit-2 block, `PreToolUse` denies; OpenCode `steps` + `doom_loop: ask` on cheap workers; per-epic leash dial (§3) controlling review points. Cost: settings files, no harness code. Converts the gate from "main remembers" to "system enforces" on the automated legs.

### 3 biggest divergences from the field (and verdict: advantage or risk?)

1. **Manual human air-gap for one host while others are auto-spawned** (§19). Nobody else does this — because nobody else is bridging a consumer-ToS boundary inside an orchestrated harness. Verdict: **advantage-under-constraint** (it is the only compliant shape; the wizard pattern shows it's a recognized design), but it caps `agy`-leg throughput at human attention and makes the `agy` leg un-Ralph-able. Mitigation: route by economics (cheap/auto legs default; `agy` only where its models win per §9.3 calibration), never by habit.
2. **Deterministic local 5-layer gate as the single commit authority** (§§9, 12). The field gates via review agents, hooks-that-advise, or CI-after-merge; almost nobody makes a *local deterministic* judge the sole commit authority with ancestry + thresholds + breaker. Verdict: **advantage if kept fast** (<500ms fast-path or workers will route around it), **risk if slow or flaky** (a flaky L2/L4 blocks the very throughput parallelism is buying). Mitigation: gate fast-path vs full-gate split (§12 adopt-3) and the §9.3 stop rules.
3. **Cost-per-APPROVED-task as the sole economic metric, with subscription windows tracked as burn, never tokens** (§16). The field tracks tokens, session cost estimates, or seat-day averages; Ralph-world tracks wall-clock; nobody else refuses to convert subscription windows to tokens. Verdict: **advantage** — it is the only metric that survives mixing API billing with Pro/AGY/Go subscriptions, and the refusal-to-convert is exactly what the vendors' own docs imply (plan usage isn't token-metered). Risk is cosmetic (finance teams like dollars): mitigate by reporting *both* — API dollars where metered, window-burn where subscribed, approved-tasks as the denominator — never a blended fiction.
