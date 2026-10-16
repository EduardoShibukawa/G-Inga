---
schema: task/1
tier: standard
status: verified
verified_at: "ce66e82"
depends_on:
  - 2026-10-16-omp-host-compat-01-plugin-channel
  - 2026-10-16-omp-host-compat-05-skill-relative-paths
---

# Map the subagent model policy to each host, OMP included

## Routing and approvals

- tier: standard (S2 fails: the policy table gains a per-host dimension; S3 holds: one reference file plus keys in the OMP project config, and no consumed contract changes; S1, S4–S8 hold)

## Objective

`work/references/model-policy.md` assumes Claude Code. Every dispatch there sets a per-call `model` (`haiku`/`sonnet`/`opus`) on the `Agent` tool, with `subagent_type` set to `general-purpose` or `Explore`. OMP's `task` tool has neither a `model` field nor those agents. Its built-ins are `task`, `scout`, `reviewer`, `security-reviewer` and `sonic`, and any other name fails with `Unknown agent`. The Antigravity wording (`invoke_subagent`, `TypeName`) lived only in the old `.agents/skills` copy, which the canonical skills root layout replaced. Add a host dispatch mapping to the single policy file, and pin OMP's built-in agents to the policy's model classes in `.omp/config.yml`.

In scope:

- `skills/work/references/model-policy.md`: a new `## Host dispatch mapping` section (text in Plan step 3), and one host-neutral sentence in the first paragraph.
- `.omp/config.yml`: add `task.agentModelOverrides`. Keep the keys task 01 added.
- `manifest.json`, regenerated because the policy file is a bundle asset.
- This task record.

Out of scope:

- Every other skill file. Task `2026-10-16-omp-host-compat-07-skill-dispatch-host-neutral` rewrites the call sites.
- `tools/validate/bundle.json` (the asset list does not change), validator code, ADRs, specs.
- Custom OMP agents for model escalation. Rejected: ADR 0005 item 7 forbids custom agent definitions for dispatch, and the ADR 0013 agents are a separate, named exception.

## Acceptance criteria

- AC1: `skills/work/references/model-policy.md` contains the `## Host dispatch mapping` table from Plan step 3, with the columns Claude Code, Antigravity and OMP. The role table above it is unchanged.
- AC2: run from the repository root, `omp config get task.agentModelOverrides` prints `scout: anthropic/claude-haiku-5-5`, `task: anthropic/claude-sonnet-5-5` and `reviewer: anthropic/claude-opus-5-5`, and `omp config get skills.enableClaudeProject` still prints `false`.
- AC3: `omp models ls anthropic` lists each of the three model IDs. If one is missing, use the newest listed model of the same class and record the substitution in `Note`.
- AC4: `bun run manifest` was run after the asset commit, and `mise run validate` reports the bundle/manifest checks as `pass`.
- AC5: `mise run validate` and `mise run test` pass.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | `mise run validate` and `mise run test` before the first edit | pass | 15ddab5 | clean baseline on main (15ddab525eb5523c1446d2ab7d4e1a789d489905) |
| AC1 | read `skills/work/references/model-policy.md` against Plan step 3 | pass | ce66e82 | read against Plan step 3, table and wording match verbatim |
| AC2 | `omp config get task.agentModelOverrides` and `skills.enableClaudeProject` | pass | ce66e82 | scout: claude-haiku-5-5, task: claude-sonnet-5-5, reviewer: claude-opus-5-5; enableClaudeProject: false |
| AC3 | `omp models ls anthropic` | pass | ce66e82 | lists claude-haiku-5-5, claude-sonnet-5-5, and claude-opus-5-5 without substitutions |
| AC4 | `bun run manifest` then `mise run validate` | pass | ce66e82 | manifest regenerated in ce66e82; bundle.test.ts and validator pass |
| AC5 | `mise run validate` and `mise run test` | pass | ce66e82 | mise run validate and mise run test pass (400 pass across 25 files) |
| V1 | diff read against AC1–AC5 and the out-of-scope list | pass | ce66e82 | diff strictly confined to model-policy.md, .omp/config.yml, and manifest.json |

## Constraints and budget

- Start guard: tasks 01 and 05 are `verified` or `accepted` on `main` (checked by the validator through `depends_on`), and `skills/work/` is a real directory.
- Executor: a cheaper model running in Antigravity or OpenCode. Follow `skills/work/standard.md`.
- Branch `work/2026-10-16-omp-host-compat-06-model-policy-host-mapping` from the current `main`. Deliver via PR; never commit to `main`.
- Bundle order (docs/development.md): commit the edited files first, then run `bun run manifest` and commit `manifest.json` alone.
- No paid model calls: `omp config get` and `omp models ls` do not call a model.
- Two failed verification attempts without new information: stop, set `blocked`, fill `## Blockers` (E3).

## Plan

1. Check the start guard. Run B1 and record it before any edit. Set `status: active`.
2. In `skills/work/references/model-policy.md`, find the sentence that begins ``Each dispatch sets the per-invocation `model` parameter`` and ends with `(ADR 0005 item 7).` Replace it with `Each dispatch selects its model from this table through the host mechanism in "Host dispatch mapping" below; there are no custom agent definitions for dispatch (ADR 0005 item 7).`
3. Insert this section verbatim after the role table and before `## Escalation`:

   ```markdown
   ## Host dispatch mapping

   The roles above are host-neutral. Each host expresses them with its own subagent primitive:

   | Concept | Claude Code | Antigravity | OMP |
   |---|---|---|---|
   | Subagent tool | `Agent`; parallel work is several calls in one message | `invoke_subagent`; one batch call | `task`; one call with a `tasks[]` batch |
   | Implementation worker | `subagent_type: "general-purpose"`, `model: "sonnet"` | `TypeName: "self"` | `agent: "task"` |
   | Read-only search or spike | `subagent_type: "Explore"`, `model: "haiku"` | `TypeName: "research"` | `agent: "scout"` |
   | Adversarial review | `subagent_type: "general-purpose"`, `model: "opus"` | `TypeName: "self"` | `agent: "reviewer"` |
   | Spec authoring, when delegated | `subagent_type: "general-purpose"`, `model: "opus"` | not delegated: main session | not delegated: main session |
   | Model selection | per-call `model` parameter | session model; not selectable per call | no per-call field; `task.agentModelOverrides` maps `scout` to Haiku, `task` to Sonnet, `reviewer` to Opus (set in G-Ingá's `.omp/config.yml`; other repositories need the same keys in their `.omp/config.yml` or in the user config, since a plugin cannot ship settings) |
   | Retry after one failed verification | new `Agent` call with `model: "opus"` | continue the same worker with the failure log | new `task` call with the failure log; the model cannot be raised per call, so the cost note records the `resolvedModel` the `task` result reports |
   | Worktree isolation | `isolation: "worktree"` | `Workspace: "share"` | `isolated: true` when `task.isolation.enabled` is set; otherwise `tools/gate/worktree-runner.ts` |
   | Completion | background; the harness notifies | asynchronous wakeup messages | results are delivered automatically; call `wait` only when blocked |
   | Token totals for the cost note | the `Agent` result | not provided: `not run` | the `task` result `usage` |
   ```

4. Append this to `.omp/config.yml`:

   ```yaml
   # G-Ingá subagent model policy for OMP (skills/work/references/model-policy.md, "Host dispatch mapping").
   task:
     agentModelOverrides:
       scout: anthropic/claude-haiku-5-5
       task: anthropic/claude-sonnet-5-5
       reviewer: anthropic/claude-opus-5-5
   ```

5. Run AC2 and AC3. Commit the two files. Run `bun run manifest`, then commit `manifest.json` alone. Run AC4 and AC5, read the diff (V1), set `completed`, then `verified` with `verified_at` once every row passes.
6. Update `## Checkpoint` and `## Outcome`.

## Outcome

- Updated `skills/work/references/model-policy.md` introductory sentence and added the `## Host dispatch mapping` section mapping Claude Code, Antigravity, and OMP primitives.
- Added `task.agentModelOverrides` to `.omp/config.yml` mapping `scout`, `task`, and `reviewer` to their respective Anthropic model classes.
- Verified configuration with `omp config get task.agentModelOverrides` and `omp config get skills.enableClaudeProject`.
- Confirmed availability of all three model IDs via `omp models ls anthropic`.
- Regenerated `manifest.json` via `bun run manifest`.
- Full verification passed (`mise run validate` and `mise run test`, 400 tests passing).

## Checkpoint

- as of: 2026-10-16, branch work/2026-10-16-omp-host-compat-06-model-policy-host-mapping, head ce66e82, worktree clean except task record
- done: host dispatch mapping added, OMP agentModelOverrides configured, bundle manifest regenerated, all checks passing, task verified
- next: commit verified task record, push branch, open PR against main
