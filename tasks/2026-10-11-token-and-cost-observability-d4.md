---
schema: task/1
tier: standard
status: active
---

# Usage, Token and Cost Observability (D4) Reconciled for Multi-Host

## Routing and approvals

- tier: standard (S1 holds: clear outcome of reconciling D4/ADR 0006 with multi-host evidence; S2 holds: follow existing ADR and research note pattern; S5 holds: sensitive behavior regarding telemetry privacy and sanitization rules)
- approved: standard procedure by owner (2026-10-11)

## Objective

Reconcile Decision D4 and ADR 0006 (`docs/decisions/0006-usage-observability.md`) with the approved multi-host SDLC harness architecture, incorporating concrete empirical evidence from Google Antigravity CLI (`agy`) alongside Claude Code. Establish a clean, privacy-preserving local observability contract for measuring tokens per verified task.

- In scope:
  - Synthesis of Antigravity token usage semantics (`input_tokens`, `cache_read_tokens`, `output_tokens`, transcript locations, session envelope) based on AGY-S1 empirical results and independent audits.
  - Reconciliation of ADR 0006 to cover both supported V1 hosts (Claude Code via OpenTelemetry / statusline and Antigravity CLI via transcript / envelope usage).
  - Clarification of the 6-state taxonomy (`observed`, `estimated`, `derived`, `absent`, `unsupported`, `collection_error`) across both hosts.
  - Task attribution mechanism guidelines (session-level correlation, commit/ref linkage).
  - Update `docs/decision-map.md` to reflect current D4 status and dependencies.
- Out of scope:
  - Building external background daemons or cloud collectors.
  - Modifying approved V1 specification or approved specification hash.
  - Altering raw git worktrees or branches of concurrent research tasks.

## Acceptance criteria

- AC1: Empirical token usage semantics for Antigravity CLI (`agy`) documented and verified against AGY-S1 audit artifacts.
- AC2: ADR 0006 updated to provide an accurate, multi-host observability model covering Claude Code and Antigravity CLI with strict privacy boundaries (no prompt/code logging).
- AC3: The 6-state taxonomy formalized with concrete mapping for each host's native metrics.
- AC4: Decision map (`docs/decision-map.md`) updated with clear next steps and owner review readiness for D4.
- AC5: Repository validation suite (`mise run validate` and `mise run test`) passes with exit 0.

## Plan

1. Capture baseline checks on `feat/d4-token-cost-observability` (B1).
2. Gather synthesis from observability research subagent across AGY-S1 worktrees and ADR 0006.
3. Update `docs/decisions/0006-usage-observability.md` with multi-host evidence, host comparison table, and privacy boundaries.
4. Update `docs/decision-map.md`.
5. Run canonical validation suite and test suite.
6. Record verification results and prepare checkpoint for owner review.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation suite | pass | fbb53f5 | `mise run validate` (exit 0) & `mise run test` (115 pass) on main |
| AC1 | Antigravity token semantics documented | pass | ff6fab5 | cumulative vs basal turn 0 semantics, cache excludes in total_tokens documented in ADR 0006 §9 |
| AC2 | ADR 0006 multi-host update | pass | ff6fab5 | ADR 0006 covers Claude Code (OTel) and Antigravity (headless JSON / transcripts) with privacy gates |
| AC3 | 6-state taxonomy formalization | pass | ff6fab5 | formal mapping in ADR 0006 §5 table and §Measurement criteria |
| AC4 | decision map reconciliation | pass | ff6fab5 | row D4 in docs/decision-map.md updated with accurate multi-host scope |
| AC5 | repository validation and test suite | pass | ff6fab5 | `mise run validate` (exit 0) & `mise run test` (115 pass) |
| V1 | diff review against V1 governance | pass | ff6fab5 | documentation/decision changes only; spec hash unchanged; no product code drift |

## Outcome

Decision D4 and ADR 0006 (`docs/decisions/0006-usage-observability.md`) have been reconciled with multi-host empirical evidence. The record now accurately covers both supported V1 hosts (Claude Code via local OpenTelemetry console export and Antigravity CLI via headless JSON envelopes and sanitized transcripts), establishes clear privacy boundaries, and formalizes the 6-state taxonomy without premature or unverified cross-host token comparisons.

## Checkpoint

- as of: 2026-10-11, branch feat/d4-token-cost-observability, head 70ba791, worktree clean; Draft PR #13 opened
- done: subagent research synthesis incorporated; ADR 0006 updated; docs/decision-map.md updated; validation and test suites passing (115 pass, exit 0); branch pushed to remote; Draft PR #13 created
- next: owner review of PR #13 and formal decision on accepting ADR 0006
