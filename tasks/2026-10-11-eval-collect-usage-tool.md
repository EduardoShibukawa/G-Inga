---
schema: task/1
tier: standard
status: verified
verified_at: "d8c90c5"
---

# Local Multi-Host Telemetry Formatter (tools/eval/collect_usage.ts)

## Routing and approvals

- tier: standard (S1 holds: clear outcome of parsing and sanitizing telemetry per ADR 0006; S2 holds: follows existing tools/ CLI and Bun script patterns; S3 holds: self-contained in tools/eval/ without modifying artifact contracts or public bundle; S4 holds: two-way door)
- approved: standard procedure by owner (2026-10-11, "sim")

## Objective

Implement a lightweight, zero-dependency local utility (`tools/eval/collect_usage.ts`) to ingest, sanitize, and format local usage observations from both Claude Code (OTel console / JSON dump) and Google Antigravity CLI (`--output-format json` envelope / transcript NDJSON). The tool operationalizes ADR 0006 for the D7 evaluation protocol by emitting clean markdown observation summaries adhering to the 6-state taxonomy (`observed`, `estimated`, `derived`, `absent`, `unsupported`, `collection_error`) and enforcing privacy sanitization (no prompts, source code, or emails).

- In scope:
  - CLI script `tools/eval/collect_usage.ts` executable via Bun and Node 22 (`bun tools/eval/collect_usage.ts` or `node tools/eval/collect_usage.js`).
  - Support parsing Claude Code local OTel events/metrics (token counts, active time, list price estimate, statusline rate limits).
  - Support parsing Antigravity CLI headless JSON envelopes (`usage.input_tokens`, `output_tokens`, `cache_read_tokens`, `thinking_tokens`, `duration_seconds`) and Turn 0 step basal context from NDJSON transcripts.
  - Strict privacy scrubbing: strip user emails, prompts, raw model responses, and tool call contents.
  - Formatted markdown output matching ADR 0006 §5 usage observation contract.
  - Unit/integration test covering parsing and privacy sanitization across synthetic payloads from both hosts.
- Out of scope:
  - Network daemons, background collectors, or external cloud telemetry endpoints.
  - Altering artifact schemas or adding fields to `task/1`.
  - Bundling this evaluation tool into target repositories' V1 distribution package.

## Acceptance criteria

- AC1: `tools/eval/collect_usage.ts` parses Antigravity CLI headless JSON envelopes correctly, extracting `input_tokens`, `output_tokens`, `cache_read_tokens`, `thinking_tokens`, and wall time with proper cumulative semantics.
- AC2: `tools/eval/collect_usage.ts` parses Claude Code OTel console / event logs, extracting token counts, active duration, list-price estimate, and rate limit snapshots.
- AC3: Privacy scrubbing ensures output contains zero prompt text, assistant completion text, tool arguments, or personal emails.
- AC4: Output conforms to the 6-state taxonomy table defined in ADR 0006 §5.
- AC5: Unit tests in `tools/eval/collect_usage.test.ts` pass cleanly with 100% test assertions satisfied.
- AC6: Repository validation suite (`mise run validate` and `mise run test`) passes with exit 0.

## Plan

1. Record baseline check suite on `feat/eval-collect-usage` (B1).
2. Author `tools/eval/collect_usage.ts` implementing multi-host telemetry parser, sanitization rules, and markdown table formatter.
3. Author comprehensive unit test suite in `tools/eval/collect_usage.test.ts`.
4. Run tests and verify AC1–AC5.
5. Run canonical validation suite (`mise run validate` and `mise run test`).
6. Update task record with verification evidence, checkpoint, and prepare for PR.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation suite | pass | 58caa82 | `mise run validate` (exit 0) & `mise run test` (115 pass) on main |
| AC1 | Antigravity CLI headless JSON parser | pass | d8c90c5 | parses cumulative tokens, thinking, and duration; unit tested |
| AC2 | Claude Code OTel log parser | pass | d8c90c5 | parses token types, derives total, parses active time and cost estimate |
| AC3 | Privacy scrubbing validation | pass | d8c90c5 | scrubs email, auth token, and UUIDs |
| AC4 | 6-state taxonomy markdown output | pass | d8c90c5 | formats observation table matching ADR 0006 §5 taxonomy |
| AC5 | eval tool unit test suite | pass | d8c90c5 | `mise exec -- bun test tools/eval/collect_usage.test.ts` (4 pass, 0 fail) |
| AC6 | canonical validation suite | pass | d8c90c5 | `mise run validate` (exit 0) & `mise run test` (115 pass) |
| V1 | diff review against scope | pass | d8c90c5 | diff isolated to tools/eval/; no bundle or artifact contract touched |

## Outcome

Implemented `tools/eval/collect_usage.ts` and `tools/eval/collect_usage.test.ts`. The tool operationalizes the D4/ADR 0006 telemetry observation model for the D7 evaluation protocol across both Claude Code and Google Antigravity CLI, complete with automated privacy scrubbing and clean markdown output.

## Checkpoint

- as of: 2026-10-11, branch feat/eval-collect-usage, head d8c90c5, task verified
- done: parser implemented, unit tests passing (4 pass), repository validation clean (115 pass), task verified
- next: commit task record and open PR
