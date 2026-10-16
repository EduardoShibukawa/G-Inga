---
schema: task/1
tier: standard
status: completed
parent: 2026-10-16-usage-telemetry-pipeline
spec: 2026-10-16-usage-telemetry-pipeline@1
depends_on:
  - 2026-10-16-usage-telemetry-pipeline-01-environment-and-research
---

# Multi-host telemetry ingestion and Antigravity hook integration

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-16-usage-telemetry-pipeline)

## Objective

Implement child 02 of the continuous usage telemetry pipeline:

1. Build `tools/eval/run_usage.ts` accepting telemetry from Claude Code, Antigravity, and OpenCode, parsing tokens and costs into normalized `UsageObservation` structures while sanitizing PII (SC1).
2. Record unmeasured signals honestly as `absent` or `unsupported` (SC2).
3. Configure Antigravity lifecycle hooks in `.agents/hooks.json` to invoke `run_usage.ts` automatically on session `Stop`.

In scope:

- Multi-host CLI `tools/eval/run_usage.ts`.
- Parser extensions in `tools/eval/collect_usage.ts` (OpenCode JSON support).
- Hook configuration in `.agents/hooks.json`.
- Unit tests in `tools/eval/run_usage.test.ts`.

Out of scope:

- Aggregation tables (child 03).
- A/B benchmark runner (child 04).

## Acceptance criteria

1. AC1: `tools/eval/run_usage.ts` provides CLI `--host <claude-code|antigravity|opencode> --in <file|-stdin> --task-id <id> --condition <with|without> --out <path>` outputting normalized JSONL observations.
2. AC2: Claude Code OTel logs, Antigravity transcripts (`transcript.jsonl`), and OpenCode JSON outputs parse into `UsageObservation` with PII scrubbed via `sanitizeText`.
3. AC3: Unobservable metrics or unsupported hosts record `absent` or `unsupported` honestly without fabrication.
4. AC4: Antigravity lifecycle hook in `.agents/hooks.json` configures `Stop` handler invoking `run_usage.ts`.
5. AC5: Unit tests in `tools/eval/run_usage.test.ts` pass, and `bun run validate` passes.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | evaluation test suite before change | pass | e1b407a | `bun test tools/eval` |
| AC1 | run_usage CLI parses multi-host inputs | pass | tools/eval/run_usage.ts | CLI flags, stdin streaming, and JSONL appending verified |
| AC2 | PII sanitized and token structures extracted | pass | tools/eval/collect_usage.ts | scrubbed emails/tokens/UUIDs, OpenCode/Antigravity/Claude parsed |
| AC3 | absent and unsupported states assigned honestly | pass | tools/eval/run_usage.test.ts | ADR 0006 honest reporting, zero fabrication |
| AC4 | .agents/hooks.json Stop event configured | pass | .agents/hooks.json | Stop lifecycle hook invoking run_usage.ts configured |
| AC5 | eval tests and repository validation green | pass | tools/eval/run_usage.test.ts | bun test tools/eval (73 pass) && bun run validate pass |
| R1 | regression check on verified_at | not run | - | on verified_at |
| V1 | diff read against AC1–AC5 | pass | - | changes verified against AC1–AC5 |

## Plan

1. Extend `tools/eval/collect_usage.ts` with OpenCode observation parsing.
2. Implement `tools/eval/run_usage.ts` CLI.
3. Configure `.agents/hooks.json` for Antigravity automated session parsing.
4. Add unit test suite `tools/eval/run_usage.test.ts`.
5. Validate and verify.

## Outcome

Delivered child 02 multi-host telemetry ingestion:

- Extended `tools/eval/collect_usage.ts`:
  - Added `"opencode"` to `UsageObservation.host`.
  - Implemented `parseOpencodeJson` handling OpenCode `run --format json`, `session export [--sanitize]`, and `stats --json` structures.
  - Implemented `parseAntigravityTranscript` handling Antigravity `transcript.jsonl` step accumulations and timestamp-derived durations.
  - Extended `parseClaudeCodeOtel` to accept single string or string array inputs.
- Implemented `tools/eval/run_usage.ts`:
  - Provided CLI flags `--host <claude-code|antigravity|opencode>`, `--in <file|-stdin>`, `--task-id <id>`, `--condition <with|without>`, `--out <path>`, and `--stdin-hook`.
  - Supported Antigravity hook context JSON payload on stdin with automatic `transcriptPath` file reading and transcript parsing.
  - Sanitized PII using `sanitizeText` across all scope identifiers and text metadata.
  - Enforced ADR 0006 honest reporting with `absent` and `unsupported` states.
- Configured `.agents/hooks.json`:
  - Registered Antigravity `Stop` lifecycle command hook invoking `run_usage.ts` into `records/usage/continuous-antigravity.jsonl`.
- Authored comprehensive test suite `tools/eval/run_usage.test.ts` (13 test cases covering multi-host ingestion, hook payload dispatch, PII scrubbing, honest metric states, and CLI flags/files).
- Verified full test suite (`bun test tools/eval` 73 tests pass) and repository validation (`bun run validate` passes cleanly).

## Checkpoint

- as of: 2026-10-16, branch `work/usage-telemetry-pipeline`, HEAD 7961285
- done: child 02 implemented, tested, and verified locally (AC1–AC5 pass)
- active: completed, awaiting parent commit and verified_at transition
- blocked: none
- next: commit child 02 changes, transition to verified_at, and proceed to child 03 (aggregator and ledger persistence)
- revalidate: none
