---
schema: task/1
tier: standard
status: blocked
---

# Ship an OMP plugin hook for the G-Ingá startup warning

## Routing and approvals

- tier: standard (S2 fails: the plugin's first OMP lifecycle hook; S1, S3–S8 hold)

## Objective

The plugin's `SessionStart` hook in `hooks/hooks.json` (`node ${CLAUDE_PLUGIN_ROOT}/hooks/session-start.mjs`, ADR 0009 §1) never runs under OMP. OMP executes only TypeScript or JavaScript factories from `<plugin root>/hooks/pre|post/`; it never runs JSON command hooks. Add a plugin factory that reuses `runSessionStartCheck` from `hooks/session-start.mjs` and surfaces the missing-Git-pre-commit-hook warning twice: in the OMP UI, and once in model context.

In scope:

- New file `hooks/pre/g-inga-session-start.ts`.
- New test `tools/gate/omp-session-start.test.ts`.
- This task record.

Out of scope:

- `hooks/session-start.mjs` and `hooks/hooks.json` (reuse them; do not edit).
- The stale-plugin check under OMP. It reads Claude Code's plugin registry, and OMP installs this plugin as version `0.0.0` with no commit to compare. The factory disables the check (Plan step 2).
- `hooks/pre/g-inga-guard.ts` (task 02) and the README (task 09).

## Acceptance criteria

- AC1: take a temp Git repository whose `mise.toml` has `[tasks.pre-commit]` and that has no `.git/hooks/pre-commit`. Firing the factory's `session_start` handler with a fake `ctx = { cwd, ui: { notify } }` calls `notify` once, with level `"warning"` and a message containing `no Git pre-commit hook is installed`.
- AC2: in the same repository, the first `before_agent_start` call returns `{ message: { customType: "g-inga.session-start", content, display: true } }`, where `content` contains that warning. The second call returns `undefined`.
- AC3: in a temp Git repository that has `.git/hooks/pre-commit`, or has no `pre-commit` mise task, `notify` is never called and `before_agent_start` returns `undefined`.
- AC4: the factory never touches the network. It passes an `installedPluginsFile` path that does not exist and `pluginRoot: ""`, so the exported `ompStartupCheck(cwd)` returns `networkReached: false`.
- AC5: `mise run validate` and `mise run test` pass.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | `mise run validate` and `mise run test` before the first edit | fail | f678867 | `mise run validate` ran (exit not separately captured; `test` started). `mise run test` ran `typecheck` and `bun test`: 331 pass, 1 fail. The failure is `tools/validate/validate.test.ts` > "this repository > every layer applies…", which times out at 120000 ms. Re-run of that file alone: same timeout (17 pass, 1 fail, 124.9 s). Pre-existing, independent of this task. See `## Blockers`. |
| AC1 | `bun test tools/gate/omp-session-start.test.ts` (warning case, notify) | not run | - | blocked by B1 |
| AC2 | `bun test tools/gate/omp-session-start.test.ts` (warning case, model context once) | not run | - | blocked by B1 |
| AC3 | `bun test tools/gate/omp-session-start.test.ts` (no-warning cases) | not run | - | blocked by B1 |
| AC4 | `bun test tools/gate/omp-session-start.test.ts` (networkReached false) | not run | - | blocked by B1 |
| AC5 | `mise run validate` and `mise run test` | not run | - | blocked by B1 |
| V1 | diff read against AC1–AC5 and the out-of-scope list | not run | - | blocked by B1 |

## Constraints and budget

- Executor: a cheaper model running in Antigravity or OpenCode. Follow the `standard` procedure in `.agents/skills/work/standard.md` (Antigravity) or `.claude/skills/work/standard.md` (OpenCode).
- Branch `work/2026-10-16-omp-host-compat-03-session-start-warnings` from the current `main`. Deliver via PR; never commit to `main`.
- No paid model calls. Do not add npm dependencies. Do not import OMP packages; type the API as `any`.
- Copy the temp-repository pattern from `makeProjectRepo` in `tools/gate/startup-warnings.test.ts`.
- Two failed verification attempts without new information: stop, set `blocked`, fill `## Blockers` (E3).

## Plan

1. Run B1 and record it before any edit. Set `status: active`.
2. Create `hooks/pre/g-inga-session-start.ts`:

   ```ts
   import { join } from "node:path";
   import { runSessionStartCheck } from "../session-start.mjs";

   // Only the local Git-hook check applies to OMP: skip the Claude plugin staleness check and the network.
   export function ompStartupCheck(cwd: string) {
     return runSessionStartCheck({ cwd, installedPluginsFile: join(cwd, ".omp", ".no-claude-plugin-registry"), pluginRoot: "" });
   }

   export default function gIngaSessionStart(pi: any): void {
     let pending: string[] = [];
     pi.on("session_start", async (_event: any, ctx: any) => {
       pending = ompStartupCheck(ctx?.cwd ?? process.cwd()).warnings;
       for (const w of pending) ctx?.ui?.notify?.(w, "warning");
     });
     pi.on("before_agent_start", async () => {
       if (pending.length === 0) return undefined;
       const content = pending.join("\n");
       pending = [];
       return { message: { customType: "g-inga.session-start", content, display: true } };
     });
   }
   ```

   Event names and the `before_agent_start` return shape come from `omp://hooks.md` (§Agent/context events) and `omp://extensions.md`.
3. Create `tools/gate/omp-session-start.test.ts` with a fake `pi` (`{ on(name, fn) { handlers[name] = fn } }`). Call `handlers.session_start({}, ctx)`, then call `handlers.before_agent_start({})` twice.
4. Run AC1–AC5, fill the table with the commit SHA, read the diff (V1), set `completed`, then `verified` with `verified_at` once every row passes.
5. Update `## Checkpoint` and `## Outcome`.

## Blockers

- What blocks: `mise run test` fails at baseline (B1, commit f678867, before any edit). `tools/validate/validate.test.ts` test "this repository > every layer applies, no check is named after a decision ID, and git status is unchanged" exceeds its 120 s per-test timeout. It reproduced on two runs (full `mise run test`, and the file alone). AC5 and the B1 gate cannot pass while it fails.
- Why not fixed here: the failing test is outside this task's In scope (`hooks/pre/g-inga-session-start.ts`, `tools/gate/omp-session-start.test.ts`, this record). Raising the timeout or changing the test is a change to the validator test suite.
- Needed, from the owner: decide between (a) a separate task to fix the validator test (its per-test timeout or the cost of running the full-repo validation inside it), or (b) explicit approval to widen this task's scope to that test. Then re-run B1 on the resulting baseline.
- Attempts: 2 (full `mise run validate` + `mise run test`; `bun test tools/validate/validate.test.ts` alone). Both timed out identically.

## Checkpoint

- as of: 2026-10-16, branch work/2026-10-16-omp-host-compat-03-session-start-warnings, baseline HEAD f678867
- done: B1 run before any edit; `mise run test` fails at baseline (pre-existing 120 s timeout in `tools/validate/validate.test.ts`). No implementation edits made. Status set to `blocked`.
- next: owner decision on the Blockers above, then re-run B1 and continue Plan step 2.
