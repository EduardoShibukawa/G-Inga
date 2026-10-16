---
schema: task/1
tier: standard
status: completed
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
| B1 | `mise run validate` and `mise run test` before the first edit | pass | 4c7021b | Run 2 (quiet machine, serialized with `flock /tmp/g-inga-test.lock`): `mise run test` at 4c7021b: 332 pass, 0 fail, 1982 expect() calls, exit 0 (103.7 s). `mise run validate` at 4c7021b: Overall pass, exit 0 (77.8 s). History, Run 1 (commit f678867, 5 sibling workers contending for CPU): `mise run test` 331 pass, 1 fail; `tools/validate/validate.test.ts` > "this repository > every layer applies…" timed out at 120000 ms; `bun test` of that file alone timed out again (124.9 s). Run 1 was load-caused, not reproduced on Run 2. |
| AC1 | `bun test tools/gate/omp-session-start.test.ts` (warning case, notify) | pass | 94b4fe9 | "AC1" test: `session_start` calls `notify` once with level `warning` and text containing `no Git pre-commit hook is installed`. 5 pass, 0 fail (34 ms). |
| AC2 | `bun test tools/gate/omp-session-start.test.ts` (warning case, model context once) | pass | 94b4fe9 | "AC2" test: first `before_agent_start` returns `{ message: { customType: "g-inga.session-start", content, display: true } }` with the warning in `content`; second returns `undefined`. 5 pass, 0 fail. |
| AC3 | `bun test tools/gate/omp-session-start.test.ts` (no-warning cases) | pass | 94b4fe9 | Two "AC3" tests: hook present, and no pre-commit mise task. `notify` never called; `before_agent_start` returns `undefined`. 5 pass, 0 fail. |
| AC4 | `bun test tools/gate/omp-session-start.test.ts` (networkReached false) | pass | 94b4fe9 | "AC4" test: `ompStartupCheck(cwd).networkReached === false` with a missing `installedPluginsFile` and `pluginRoot: ""` (no installed SHA, so `resolveMarketplaceMain` is never called). 5 pass, 0 fail. |
| AC5 | `mise run validate` and `mise run test` | pass | 94b4fe9 | Under `flock /tmp/g-inga-test.lock` on the same tree as 94b4fe9 (pre-commit then ran `mise run pre-commit` on the commit, Overall pass): `mise run validate` exit 0; `mise run test` exit 0, 337 pass, 0 fail, 1995 expect() calls (83.6 s). |
| V1 | diff read against AC1–AC5 and the out-of-scope list | pass | 94b4fe9 | `git show --stat HEAD`: 3 files (`hooks/pre/g-inga-session-start.ts` new, `tools/gate/omp-session-start.test.ts` new, this record). `hooks/session-start.mjs` and `hooks/hooks.json` untouched; no `any` in the new files; the factory matches AC1–AC4 (warning once via notify, model context once, cleared after use, no-warning paths return `undefined`). |

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

- Resolved: the B1 timeout was CPU contention from parallel sibling workers, not a defect in the suite. Run 2 on a quiet machine passed both commands (see B1). Record kept as history.
- Earlier blocker (history): `mise run test` timed out at 120 s in `tools/validate/validate.test.ts` at f678867 under contention. Two attempts (full run; file alone) were made before the owner's lift. The E3 stop was lifted by Main on new information.

## Checkpoint

- as of: 2026-10-16, branch work/2026-10-16-omp-host-compat-03-session-start-warnings, baseline HEAD f678867
- done: B1 run before any edit; `mise run test` fails at baseline (pre-existing 120 s timeout in `tools/validate/validate.test.ts`). No implementation edits made. Status set to `blocked`.
- next: owner decision on the Blockers above, then re-run B1 and continue Plan step 2.
