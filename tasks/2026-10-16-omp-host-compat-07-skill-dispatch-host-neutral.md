---
schema: task/1
tier: standard
status: todo
depends_on:
  - 2026-10-16-omp-host-compat-05-skill-relative-paths
  - 2026-10-16-omp-host-compat-06-model-policy-host-mapping
---

# Make subagent dispatch in the skills host-neutral

## Routing and approvals

- tier: standard (S2 holds: one mechanical rewrite pattern repeated across call sites; S8 weighed: about 25 call sites in 9 files fit one session; S1, S3–S7 hold)

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
| B1 | `mise run validate` and `mise run test` before the first edit | not run | - | record the commit SHA you ran on |
| B2 | AC1 and AC2 greps before the first edit | not run | - | match count per file; this is the work list |
| AC1 | AC1 grep | not run | - | |
| AC2 | AC2 grep | not run | - | |
| AC3 | read each rewritten call site against AC3 | not run | - | |
| AC4 | task 05 path grep | not run | - | |
| AC5 | `bun run manifest`, `mise run validate`, `mise run test` | not run | - | |
| V1 | diff read against AC1–AC5 and the out-of-scope list | not run | - | |

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

## Checkpoint

- as of: 2026-10-16, branch work/omp-host-compat-tasks, head 47e8c69, task recorded, no edits
- done: call sites mapped before the layout move (under `.claude/skills/`): `orchestrate/SKILL.md` 83–96, 117, 122; `orchestrate/subagent-prompt.md` 1, 3, 9, 11, 44, 49, 57, 95; `orchestrate/gate.md` 16, 136, 176; `orchestrate/references/ooda-cycle.md` 55–57; `drive/SKILL.md` 129, 145, 151; `work/heavy.md` 22, 42; `work/review.md` 7; `work/references/procedure.md` 58. Line numbers will shift; trust B2, not these numbers
- next: check the start guard
