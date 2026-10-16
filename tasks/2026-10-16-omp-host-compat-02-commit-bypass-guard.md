---
schema: task/1
tier: standard
status: todo
---

# Ship an OMP plugin hook that enforces the commit-gate bypass deny list

## Routing and approvals

- tier: standard (S2 fails: the plugin's first OMP hook; S5 weighed: applies the already-accepted ADR 0009 deny list on one more host and adds, removes or relaxes no rule; S1, S3, S4, S6, S7, S8 hold)

## Objective

OMP ignores Claude permission rules, so the 12 `permissions.deny` entries in `.claude/settings.json` do nothing under OMP. Those entries block commit-gate bypasses: `git commit --no-verify`, `git commit -n`, `HK=0` and `core.hooksPath`. When the `g-inga@g-inga` plugin is installed, OMP loads TypeScript hook factories from `<plugin root>/hooks/pre/*.ts` (a probe on 2026-10-16 confirmed a plugin `tool_call` hook can block a `bash` call). Add a plugin hook that reads the deny list from the session's project `.claude/settings.json`, the same project-level policy Claude Code applies, and blocks matching `bash` and `eval` tool calls.

In scope:

- New file `hooks/pre/g-inga-guard.ts` (OMP hook factory plus exported pure functions). Claude Code reads only `hooks/hooks.json` and ignores this folder.
- New test `tools/gate/omp-guard.test.ts`.
- This task record.

Out of scope:

- `.claude/settings.json` (read it; do not add or change rules). `hooks/hooks.json`, `hooks/session-start.mjs`.
- `.omp/config.yml` `bash.patterns`. Rejected: it would duplicate the deny list, would not cover `eval`, and would not travel with the plugin.
- Skills, `manifest.json`, `tools/validate/`, README (task 09).

## Acceptance criteria

- AC1: `parseDenyRules(settingsJson)` returns one matcher per `Bash(<glob>)` entry of `permissions.deny` and ignores every other entry. For the current `.claude/settings.json` it returns exactly 12 rules.
- AC2: the factory's `tool_call` handler returns `{ block: true, reason }` for each of these `bash` commands, and `reason` contains the matched `Bash(...)` rule text and `ADR 0009`: `git commit --no-verify -m x`, `git commit -m x --no-verify`, `git commit -n -m x`, `git commit -nm x`, `HK=0 git commit -m x`, `echo ok && HK=0 git commit -m x`, `git -c core.hooksPath=/dev/null commit -m x`, `git config core.hooksPath /tmp/h`.
- AC3: the handler returns `undefined` (does not block) for `git commit -m "fix: thing"`, `git status`, `git log -n 3` and `bun test`.
- AC4: for the `eval` tool, the handler blocks when any line of `input.code` matches a rule after it is trimmed and one leading `!` is removed (example: `!git commit --no-verify -m x`). It does not block `print("hello")`.
- AC5: rules are read from `<ctx.cwd>/.claude/settings.json` (falling back to `process.cwd()` when `ctx.cwd` is absent) and cached per directory. A directory with no settings file or with invalid JSON yields zero rules, and the handler never throws.
- AC6: `mise run validate` and `mise run test` pass.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | `mise run validate` and `mise run test` before the first edit | not run | - | record the commit SHA you ran on |
| AC1 | `bun test tools/gate/omp-guard.test.ts` (parse cases) | not run | - | |
| AC2 | `bun test tools/gate/omp-guard.test.ts` (block cases) | not run | - | |
| AC3 | `bun test tools/gate/omp-guard.test.ts` (allow cases) | not run | - | |
| AC4 | `bun test tools/gate/omp-guard.test.ts` (eval cases) | not run | - | |
| AC5 | `bun test tools/gate/omp-guard.test.ts` (temp dir without settings, invalid JSON) | not run | - | |
| AC6 | `mise run validate` and `mise run test` | not run | - | |
| V1 | diff read against AC1–AC6 and the out-of-scope list | not run | - | |

## Constraints and budget

- Executor: a cheaper model running in Antigravity or OpenCode. Follow the `standard` procedure in `.agents/skills/work/standard.md` (Antigravity) or `.claude/skills/work/standard.md` (OpenCode).
- Branch `work/2026-10-16-omp-host-compat-02-commit-bypass-guard` from the current `main`. Deliver via PR; never commit to `main`.
- No paid model calls. Do not add npm dependencies. `bun run typecheck` covers only `tools/validate`, so `hooks/pre/*.ts` is not type-checked. Do not import OMP packages; type the API as `any`.
- Two failed verification attempts without new information: stop, set `blocked`, fill `## Blockers` (E3).

## Plan

1. Run B1 and record it before any edit. Set `status: active`.
2. Create `hooks/pre/g-inga-guard.ts`:

   ```ts
   import { readFileSync } from "node:fs";
   import { join } from "node:path";

   export interface DenyRule { source: string; regex: RegExp }

   // "Bash(git commit -n *)" -> { source: "Bash(git commit -n *)", regex: /^git commit -n .*$/s }
   export function parseDenyRules(settingsJson: string): DenyRule[] { /* JSON.parse inside try; [] on error */ }

   // Collapse whitespace; split on &&, ||, ;, |, newline; test every trimmed segment AND the whole normalized command.
   export function matchBash(command: string, rules: DenyRule[]): DenyRule | undefined { /* ... */ }

   // Each line: trim, drop one leading "!", then matchBash.
   export function matchEval(code: string, rules: DenyRule[]): DenyRule | undefined { /* ... */ }

   const cache = new Map<string, DenyRule[]>();
   export function loadRules(cwd: string): DenyRule[] {
     let rules = cache.get(cwd);
     if (!rules) {
       try { rules = parseDenyRules(readFileSync(join(cwd, ".claude", "settings.json"), "utf8")); } catch { rules = []; }
       cache.set(cwd, rules);
     }
     return rules;
   }

   export default function gIngaGuard(pi: any): void {
     pi.on("tool_call", async (event: any, ctx: any) => {
       const rules = loadRules(ctx?.cwd ?? process.cwd());
       const input = event?.input ?? {};
       const hit =
         event?.toolName === "bash" && typeof input.command === "string" ? matchBash(input.command, rules)
         : event?.toolName === "eval" && typeof input.code === "string" ? matchEval(input.code, rules)
         : undefined;
       if (hit) return { block: true, reason: `G-Ingá: blocked by .claude/settings.json deny rule ${hit.source} (ADR 0009 commit gate)` };
       return undefined;
     });
   }
   ```

   To turn a glob into a regex: take the text inside `Bash(` … `)`, escape every regex metacharacter except `*`, replace each `*` with `.*`, and anchor with `^` and `$`.
3. Create `tools/gate/omp-guard.test.ts` (Bun test, same style as the other `tools/gate/*.test.ts`), importing from `../../hooks/pre/g-inga-guard.ts`. Use the real `.claude/settings.json` content. Exercise the default factory through a minimal fake `pi` (`{ on(name, fn) { handlers[name] = fn } }`) by calling `handlers.tool_call({ toolName, input }, { cwd })`. For AC5, use temp directories built with `mkdtempSync`.
4. Run AC1–AC6, fill the table with the commit SHA, read the diff (V1), set `completed`, then `verified` with `verified_at` once every row passes.
5. Update `## Checkpoint` and `## Outcome`.

## Checkpoint

- as of: 2026-10-16, branch work/omp-host-compat-tasks, head 47e8c69, task recorded, no edits
- done: probe on OMP 18.11.2. A throwaway marketplace plugin with `hooks/pre/marker.ts` was loaded at session start, and its `tool_call` handler blocked a `bash` command. The Git pre-commit hook itself still runs under any host
- next: step 1 of the plan
