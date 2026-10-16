# Subagent Model Policy (SC4 / SC5)

The single canonical role-to-model table for every subagent dispatch in `work`, `drive` and `orchestrate` (spec `2026-10-14-harness-hardening` SC4, ADR 0009 "cost policy per role"). Each dispatch selects its model from this table through the host mechanism in "Host dispatch mapping" below; there are no custom agent definitions for dispatch (ADR 0005 item 7). The three skills reference this table rather than restating it, so a change here is picked up everywhere.

| Role | Model |
|---|---|
| Read-only search, lookup, or `Explore` spike | Haiku |
| Implementation (worker) | Sonnet |
| Spec authoring | Opus |
| Adversarial review (fresh-context) | Opus |

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
