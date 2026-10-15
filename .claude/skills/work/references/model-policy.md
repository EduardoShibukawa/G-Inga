# Subagent Model Policy (SC4 / SC5)

The single canonical role-to-model table for every subagent dispatch in `work`, `drive` and `orchestrate` (spec `2026-10-14-harness-hardening` SC4, ADR 0009 "cost policy per role"). Each dispatch sets the per-invocation `model` parameter from this table; there are no custom agent definitions (ADR 0005 item 7). The three skills reference this table rather than restating it, so a change here is picked up everywhere.

| Role | Model |
|---|---|
| Read-only search, lookup, or `Explore` spike | Haiku |
| Implementation (worker) | Sonnet |
| Spec authoring | Opus |
| Adversarial review (fresh-context) | Opus |

## Escalation

A Sonnet worker that fails verification once is retried on **Opus** (a new `Agent` dispatch with `model` set to `opus`, carrying the failure log and the same contract; continuing the Sonnet worker does not change its model). A second failure with no new information follows the existing E3 circuit breaker (ADR 0002): halt the ticket, mark it `blocked`, and escalate to the owner. There is no third attempt.

## Per-child cost note

Every child dispatched by `drive` or `orchestrate` is recorded with the model that ran it and its token totals, taken by the orchestrator from the host's `Agent` result (never from the worker's own report; fields the host doesn't provide are `not run`), in the ADR 0006 vocabulary, with no prompt content:

| Field | Meaning |
|---|---|
| `tokens_input` | input tokens |
| `tokens_output` | output tokens |
| `cache_read_tokens` | cache read tokens |
| `cache_write_tokens` | cache write tokens |
| `total_tokens` | total tokens |
| `cache_read_ratio` | cache read ratio |
