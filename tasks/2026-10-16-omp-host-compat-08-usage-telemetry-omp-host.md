---
schema: task/1
tier: standard
status: verified
verified_at: "97404df176fbe0faeaa1f8f4ef84a1a3b58b558d"
---

# Ingest OMP session usage into the local telemetry pipeline

## Routing and approvals

- tier: standard (S2 holds: a fourth parser beside the existing three, same `UsageObservation` shape; S3 weighed: widens the `host` union additively, no consumed field changes; S1, S4–S8 hold)

## Objective

`tools/eval/run_usage.ts` accepts only `--host claude-code|antigravity|opencode`, and no parser in `tools/eval/collect_usage.ts` reads OMP session files, so "tokens per verified task" cannot be measured for work done in OMP. OMP persists every session as JSONL under `~/.omp/agent/sessions/<encoded-cwd>/<timestamp>_<sessionId>.jsonl`; assistant entries carry token usage and cost. Add a `parseOmpSession` parser and the `omp` host to the CLI.

In scope:

- `tools/eval/collect_usage.ts`: `"omp"` added to `UsageObservation.host`; new exported `parseOmpSession(raw: string): UsageObservation`.
- `tools/eval/run_usage.ts`: `"omp"` added to the host type, `parseCliArgs`, the dispatch branch, the error messages and the `--help` text.
- `tools/eval/collect_usage.test.ts` and `tools/eval/run_usage.test.ts`: new cases.
- This task record.

Out of scope:

- `tools/eval/ab_runner.ts` and `tools/eval/token_budget_guard.ts` host lists (A/B runs and budget guards under OMP are separate work).
- A continuous OMP capture hook (rejected for now: OMP keeps session files on disk, so ingestion on demand with `--in <session file>` loses nothing; the Antigravity `Stop` hook exists because its transcript is not otherwise kept).
- Subagent session files (OMP writes them separately in the session artifacts directory); the parser reads one file.
- ADR 0006, the telemetry pipeline tasks, `records/usage-ledger.tsv`.

## Acceptance criteria

- AC1: for this fixture (one JSON object per line), `parseOmpSession` returns `host: "omp"`, `cli_version: "18.11.2"`, `input_tokens` 6, `output_tokens` 922, `cache_read_tokens` 14107, `cache_write_tokens` 19643, `total_tokens` 34678 (all `state: "observed"`), `cost_usd_estimate` 0.1784294 with `state: "estimated"` (compare with `toBeCloseTo(…, 6)`), `wall_duration_seconds` 8.235 with `state: "derived"`, `thinking_tokens` with `state: "unsupported"`, and a non-empty `scope_id`:

  ```jsonl
  {"type":"session","version":3,"id":"01a145f4-758a-7748-b62f-9120a5c936bc","timestamp":"2026-10-16T18:24:31.210Z","cwd":"/tmp/x"}
  {"type":"model_change","id":"m1","parentId":null,"timestamp":"2026-10-16T18:24:31.269Z","runtime":{"version":"18.11.2"},"model":"anthropic/claude-opus-5-5"}
  {"type":"message","id":"a1","parentId":"m1","timestamp":"2026-10-16T18:24:31.260Z","message":{"role":"assistant","model":"claude-opus-5-5","usage":{"input":4,"output":288,"cacheRead":0,"cacheWrite":14107,"totalTokens":14399,"cost":{"total":0.118632}}}}
  {"type":"message","id":"u1","parentId":"a1","timestamp":"2026-10-16T18:24:35.000Z","message":{"role":"user","content":"secret prompt text"}}
  {"type":"message","id":"a2","parentId":"u1","timestamp":"2026-10-16T18:24:39.445Z","message":{"role":"assistant","model":"claude-opus-5-5","usage":{"input":2,"output":634,"cacheRead":14107,"cacheWrite":5536,"totalTokens":20279,"cost":{"total":0.0597974}}}}
  not json
  ```

  Duration is last timestamp minus first timestamp across all entries with a `timestamp` (here 18:24:31.210 → 18:24:39.445).
- AC2: an entry `{"type":"model_usage","timestamp":"…","usage":{"input":10,"output":5,"cacheRead":0,"cacheWrite":0,"totalTokens":15,"cost":{"total":0.001}}}` adds to the sums (OMP records model calls outside the transcript this way).
- AC3: a file with no assistant usage entries returns every token field and `cost_usd_estimate` with `state: "absent"`, and never throws.
- AC4: no prompt text from the input appears anywhere in the returned object (`JSON.stringify(result)` does not contain `secret prompt text`).
- AC5: `parseCliArgs(["--host","omp","--in","f.jsonl"])` returns `host: "omp"`; `runUsage({ host: "omp", inputContent: <AC1 fixture> })` returns a record whose `total_tokens.value` is 34678; the `--help` text lists `omp`.
- AC6: smoke on a real session: `bun tools/eval/run_usage.ts --host omp --in "$(ls -t ~/.omp/agent/sessions/*G-Inga*/*.jsonl | head -1)" --task-id smoke --out /tmp/omp-usage-smoke.jsonl` exits 0 and the appended line has `input_tokens.state: "observed"`. If no OMP session exists on the machine, record `blocked` with the `ls` output.
- AC7: `mise run validate` and `mise run test` pass.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | `mise run validate` and `mise run test` before the first edit | fail | f678867 | validate pass; test fail: in the full `mise run test` run, `tools/validate/validate.test.ts` "this repository" failed under CPU contention with sibling workers (run 1: timed out at 120 s limit, earlier run: failed at 120 s). Rerun alone (`bun test tools/validate/validate.test.ts -t "this repository"`): pass, 1 pass / 0 fail. Pre-existing, outside scope. |
| AC1 | `bun test tools/eval/collect_usage.test.ts` (fixture sums) | pass | 97404df176fbe0faeaa1f8f4ef84a1a3b58b558d | collect_usage.test.ts: 8 pass / 0 fail (74 expects), fixture sums and states as AC1 |
| AC2 | `bun test tools/eval/collect_usage.test.ts` (model_usage) | pass | 97404df176fbe0faeaa1f8f4ef84a1a3b58b558d | same run: model_usage adds 10/5/0/0/15/0.001 |
| AC3 | `bun test tools/eval/collect_usage.test.ts` (no usage) | pass | 97404df176fbe0faeaa1f8f4ef84a1a3b58b558d | same run: absent states, no throw |
| AC4 | `bun test tools/eval/collect_usage.test.ts` (no prompt text) | pass | 97404df176fbe0faeaa1f8f4ef84a1a3b58b558d | same run: JSON.stringify does not contain prompt text |
| AC5 | `bun test tools/eval/run_usage.test.ts` | pass | 97404df176fbe0faeaa1f8f4ef84a1a3b58b558d | run_usage.test.ts: 16 pass / 0 fail (includes omp parseCliArgs, runUsage total 34678, --help lists omp) |
| AC6 | real-session smoke command | pass | 97404df176fbe0faeaa1f8f4ef84a1a3b58b558d | session 2026-10-16T19-04-15-265Z_01a14619…; exit 0; input_tokens observed; /tmp output deleted |
| AC7 | `mise run validate` and `mise run test` | pass | 97404df176fbe0faeaa1f8f4ef84a1a3b58b558d | validate exit 0; test exit 0, 339 pass / 0 fail (worktree, after B1 vocabulary fix) |
| V1 | diff read against AC1–AC7 and the out-of-scope list | pass | 97404df176fbe0faeaa1f8f4ef84a1a3b58b558d | 5 files in scope only; no `any` or `isRecord` in new code; no ab_runner/token_budget_guard/ADR/ledger changes |

## Constraints and budget

- Executor: a cheaper model running in Antigravity or OpenCode. Follow the `standard` procedure in `.agents/skills/work/standard.md` (Antigravity) or `.claude/skills/work/standard.md` (OpenCode).
- Branch `work/2026-10-16-omp-host-compat-08-usage-telemetry-omp-host` from the current `main`; deliver via PR, never commit to `main`.
- Privacy (ADR 0006): never copy message content into the observation; raw traces stay out of Git (`records/usage/*.jsonl` is ignored).
- No paid model calls. Two failed verification attempts without new information: stop, set `blocked`, fill `## Blockers` (E3).

## Plan

1. Run B1 and record it before any edit. Set `status: active`.
2. In `collect_usage.ts`, add `"omp"` to the `host` union and write `parseOmpSession` next to `parseOpencodeJson`, following its style:
   - split on newlines, `JSON.parse` each line inside `try`, skip failures;
   - `type === "session"`: `scope_id = sanitizeText(entry.id)`;
   - `type === "model_change"` with `entry.runtime?.version`: `cli_version` (first one wins);
   - `type === "message"` with `entry.message?.role === "assistant"` and `entry.message.usage`, and `type === "model_usage"` with `entry.usage`: add `input`, `output`, `cacheRead`, `cacheWrite`, `totalTokens`, `cost.total` (missing numbers count as 0);
   - track min and max `Date.parse(entry.timestamp)` over every entry;
   - states: tokens `observed` when at least one usage entry was seen, else `absent`; cost `estimated` (OMP prices from its model catalog) or `absent`; duration `derived` when two timestamps exist, else `absent`; `thinking_tokens` `unsupported` with note `OMP folds reasoning into output`; `rate_limit_5h_used_pct` and `rate_limit_7d_used_pct` `unsupported`.
3. In `run_usage.ts`, widen the host type in `RunUsageOptions` and `parseCliArgs`, accept `omp`, add `else if (host === "omp") { obs = parseOmpSession(content); }` before the final `else`, and update both error messages and the `--help` text.
4. Add the tests from AC1–AC5. Run AC6 once.
5. Run AC7, fill the table, read the diff (V1), set `completed`, then `verified` with `verified_at` when every row passes.
6. Update `## Checkpoint` and `## Outcome`.

## Checkpoint

- as of: 2026-10-16, branch work/2026-10-16-omp-host-compat-08-usage-telemetry-omp-host, head 97404df (implementation commit; this record commit follows)
- done: `parseOmpSession` and the `omp` host implemented and tested; AC1–AC7 and V1 pass; B1 recorded as fail (validate pass, validate.test.ts timeout under contention, pass when rerun alone)
- next: none; PR delivery by owner

## Outcome

- `parseOmpSession` added to `tools/eval/collect_usage.ts`; `omp` accepted by `tools/eval/run_usage.ts` (parseCliArgs, dispatch, errors, help).
- Tests: `collect_usage.test.ts` 8 pass; `run_usage.test.ts` 16 pass; full `mise run test` 339 pass; `mise run validate` pass.
- Real-session smoke (AC6): exit 0, `input_tokens` observed; temporary output deleted.
- Caveat (pre-existing, outside scope): `tools/validate/validate.test.ts` "this repository" has a hard-coded 120 s timeout and fails under CPU contention; it passes alone.
