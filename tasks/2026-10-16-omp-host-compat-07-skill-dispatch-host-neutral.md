---
schema: task/1
tier: standard
status: accepted
verified_at: "7eed4c6"
depends_on:
  - 2026-10-16-omp-host-compat-05-skill-relative-paths
  - 2026-10-16-omp-host-compat-06-model-policy-host-mapping
---

# Make subagent dispatch in the skills host-neutral

## Routing and approvals

- tier: standard (S2 holds: one mechanical rewrite pattern repeated across call sites; S8 weighed: about 25 call sites in 9 files fit one session; S1, S3–S7 hold)
- accepted: by owner (2026-10-17, G-D1, owner decision in session decision message)

## Objective

The `orchestrate`, `drive` and `work` skills hardcode Claude Code dispatch primitives at each call site: the `Agent` tool, `subagent_type: "general-purpose"`/`"Explore"`, `model` set to `sonnet`/`opus`/`haiku`, and `isolation: "worktree"`. Under OMP those instructions name a tool field and agent names that do not exist, so the orchestrator has to improvise. Task 06 put the per-host primitives in one table (`../work/references/model-policy.md` § Host dispatch mapping, relative to each skill directory). Rewrite every call site to name the role (worker, read-only spike, adversarial review, spec authoring, retry) and point to that table, so one skill body serves Claude Code, Antigravity and OMP.

In scope:

- `skills/orchestrate/SKILL.md`, `skills/orchestrate/subagent-prompt.md`, `skills/orchestrate/gate.md`, `skills/orchestrate/references/ooda-cycle.md`
- `skills/drive/SKILL.md`
- `skills/work/heavy.md`, `skills/work/review.md`, `skills/work/references/procedure.md`
- `manifest.json`, regenerated because the `work` files are bundle assets
- This task record

Out of scope:

- `skills/work/references/model-policy.md` (owned by task 06; read it, do not edit it).
- Path forms (done in task 05; keep them skill-relative).
- Behavior changes: no new steps, no removed gates, and no change to the E3 circuit breaker or the per-child cost note fields.
- `.omp/`, `hooks/`, `agents/`, validator code, ADRs, specs.

## Acceptance criteria

- AC1: `grep -rnE 'subagent_type|invoke_subagent|TypeName|isolation: "worktree"|Workspace: "|model: "(haiku|sonnet|opus)"|model. set to' skills/` prints matches only in `skills/work/references/model-policy.md`.
- AC2: `grep -rnwE 'Agent' skills/orchestrate skills/drive skills/work` prints no line that instructs a tool call. A remaining match may only name the Claude Code column of the mapping or quote a historical decision; list each one in `Note`.
- AC3: every rewritten call site still states its role and its model class in words, for example "dispatch an implementation worker (Sonnet class) per the host dispatch mapping in `../work/references/model-policy.md`". The Haiku/Sonnet/Opus policy stays readable at the call site.
- AC4: the AC1 grep from task 05 (`grep -rnE '\.(claude|agents|opencode)/skills/|(^|[^./])skills/(drive|orchestrate|sharpen|validator-flow|work)/' skills/`) still prints only what task 05 recorded.
- AC5: `bun run manifest` was run after the asset commit, `mise run validate` reports the bundle/manifest checks as `pass`, and `mise run validate` and `mise run test` pass.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | `mise run validate` and `mise run test` before the first edit | pass | bc76754 | 400 pass, 0 fail; preflight and validation clean |
| B2 | AC1 and AC2 greps before the first edit | pass | bc76754 | AC1: 12 call sites (drive 2, ooda-cycle 2, orchestrate 4, gate 2, procedure 1, review 1, heavy 1; model-policy 7 out of scope). AC2: 21 matches in orchestrate (17 across 4 files), drive (2), artifact-contracts (2 notes, no tool call), model-policy (5 out of scope) |
| AC1 | AC1 grep | pass | 7eed4c6 | prints matches only in skills/work/references/model-policy.md (7 matches) |
| AC2 | AC2 grep | pass | 7eed4c6 | 0 matches instructing a tool call; remaining matches: artifact-contracts.md lines 209, 391 ("Agent judgment", actor vocabulary); model-policy.md lines 18, 24, 27, 31, 35 (host dispatch table and definitions) |
| AC3 | read each rewritten call site against AC3 | pass | 7eed4c6 | every rewritten call site names role and model class (Sonnet class, Haiku class, Opus class) and points to host dispatch mapping in model-policy.md |
| AC4 | task 05 path grep | pass | 7eed4c6 | 0 matches across skills/ |
| AC5 | `bun run manifest`, `mise run validate`, `mise run test` | pass | 7eed4c6 | manifest regenerated at 7eed4c6; validate and test pass cleanly (400 pass, 0 fail) |
| V1 | diff read against AC1–AC5 and the out-of-scope list | pass | 7eed4c6 | diff strictly confined to skill call sites, manifest.json, and task record |

## Constraints and budget

- Start guard: tasks 05 and 06 are `verified` or `accepted` on `main`, and `skills/work/references/model-policy.md` contains `## Host dispatch mapping`. Otherwise set `status: blocked`, write `## Blockers`, and stop.
- Executor: a cheaper model running in Antigravity or OpenCode. Follow `skills/work/standard.md`.
- Branch `work/2026-10-16-omp-host-compat-07-skill-dispatch-host-neutral` from the current `main`. Deliver via PR; never commit to `main`.
- Edit one file at a time and re-run the B2 greps after each file. Do not rewrite paragraphs that have no match.
- Bundle order (docs/development.md): commit the skill edits first, then run `bun run manifest` and commit `manifest.json` alone.
- No paid model calls. Two failed verification attempts without new information: stop, set `blocked`, fill `## Blockers` (E3).

## Plan

1. Check the start guard. Run B1 and B2 and record them before any edit. Set `status: active`.
2. Rewrite each B2 match using these rules. Inside `skills/work/` the table path is `references/model-policy.md`; in the other skills it is `../work/references/model-policy.md`.
   - Tool call wording (``multiple `Agent` tool calls in a single message``) → `dispatch the workers in parallel with the host's subagent tool (see "Host dispatch mapping" in ../work/references/model-policy.md)`.
   - `subagent_type: "general-purpose"` + `model: "sonnet"` → `an implementation worker (Sonnet class)`.
   - `subagent_type: "Explore"` + `model: "haiku"` → `a read-only spike (Haiku class)`.
   - `model` set to `opus` for a review → `an adversarial reviewer (Opus class)`. For spec authoring → `spec authoring (Opus class; delegate only where the mapping allows it)`.
   - The Opus retry → `retry once per the "Retry after one failed verification" row of the host dispatch mapping`.
   - `isolation: "worktree"` → `isolate the worker per the "Worktree isolation" row`. Keep the `tools/gate/worktree-runner.ts` fallback sentence.
   - "the host's `Agent` result" in cost-note sentences → `the host's subagent result (see the "Token totals for the cost note" row)`.
   - "the harness notifies" / "asynchronous wakeup messages" → `results arrive per the "Completion" row; do not poll`.
3. Re-run AC1 and AC2 until both are clean. Commit. Run `bun run manifest`, then commit `manifest.json` alone.
4. Run AC3–AC5, fill the table, read the diff (V1), set `completed`, then `verified` with `verified_at` once every row passes.
5. Update `## Checkpoint` and `## Outcome`.

## Outcome

All subagent dispatch call sites across `orchestrate`, `drive`, and `work` skills have been made host-neutral. Each call site now specifies its semantic role and model class (Sonnet class, Haiku class, Opus class) while directing the host orchestrator to `references/model-policy.md` (or `../work/references/model-policy.md`) § Host dispatch mapping. All 5 acceptance criteria (AC1–AC5) and verification checks passed cleanly.

## Checkpoint

- as of: 2026-10-16, branch work/2026-10-16-omp-host-compat-07-skill-dispatch-host-neutral, head 7eed4c6, status verified
- done: start guard verified; baselines B1 and B2 recorded; all 8 in-scope skill files rewritten to host-neutral dispatch; AC1-AC4 verified; skill edits committed in 73f8b31; manifest.json regenerated and committed in 7eed4c6; AC5 verified with 400 tests passing; task record updated to verified
- next: push branch and open pull request
