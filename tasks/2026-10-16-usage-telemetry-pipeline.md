---
schema: task/1
tier: heavy
status: active
spec: 2026-10-16-usage-telemetry-pipeline@1
---

# Continuous usage telemetry pipeline and multi-host A/B baseline

## Routing and approvals

- tier: heavy (H1, H3, H4)
- confirmed: heavy by owner (2026-10-16, "iniciando uma nova demanda no G-Ingá")
- approved: spec v1 by owner (2026-10-16, "sim")
- decided: Q1 [storage] → raw traces (.jsonl) git-ignored with .gitignore, retaining samples/fixtures for tests and consolidating in usage-ledger.tsv and usage-summary.md by owner (2026-10-16, "Q1. a")
- decided: Q2 [schema] → tabular records/usage-ledger.tsv + records/usage-summary.md following ADR 0006 without creating new formal artifact schema in validator by owner (2026-10-16, "Q2. ok")
- decided: Q3 [budget] → simple default cap ($5.00) via env/flag (SHE_BUDGET_USD) focused on telemetry utility without overengineering by owner (2026-10-16, "Q3. a, porem...")
- decided: Q4 [opencode] → research OpenCode surface in docs/research/ and implement external parser in run_usage.ts if viable, otherwise record honest absent by owner (2026-10-16, "Q4. a")
- decided: Q5 [contamination] → physical workspace/worktree isolation with automated check + pass host CLI disable flags when available by owner (2026-10-16, "Q5. a, mas...")
- decided: Q6 [environment] → fix root cause of mise install failure in clean clone (lockfile/shims) by owner (2026-10-16, "Q6. a")
- decided: Q7 [runner-task] → ab_runner.ts accepts any task via `--task-id <id>` or `--task-file <path>`, with default in evals/scenarios/ by owner (2026-10-16, "Q7. ok")
- decided: Q8 [quality-metric] → deterministic quality_score (test suite + task ACs) in ledger; weekly LLM-as-a-judge improvement loop flagged for roadmap by owner (2026-10-16, "Q8. ok, mas...")
- decided: Q9 [mise-fix] → adjust mise.toml to prevent locked=true colliding with global developer tools in clean clone by owner (2026-10-16, "Q9.a")
- decided: continuous-otel → day-to-day continuous telemetry across all three hosts (Claude Code native OTel, OpenCode via plugin, Antigravity via lifecycle hook on Stop/PostInvocation parsing transcript.jsonl) by owner (2026-10-16, "sim")

## Objective

Implement a local, continuous multi-host usage telemetry pipeline (Claude Code, Antigravity, OpenCode) with an honest aggregator and a reproducible, contamination-isolated A/B baseline runner.

In scope:

- Multi-host telemetry ingestion script (`tools/eval/run_usage.ts`) parsing Claude Code OTel, Antigravity transcripts/envelopes, and OpenCode JSON/OTel.
- Aggregator script (`tools/eval/aggregate_usage.ts`) writing Markdown tables to `records/usage-summary.md` and machine-readable JSON.
- A/B baseline runner (`tools/eval/ab_runner.ts`) with automated contamination checking and deterministic `quality_score`.
- Research documentation in `docs/research/` and decision map updates (`docs/decision-map.md`).
- Antigravity lifecycle hook integration for continuous transcript collection.
- Tabular persistence in `records/usage-ledger.tsv` and `.gitignore` rules for raw traces.
- `mise.toml` environment clean-clone fix and mise tasks `eval:usage` and `eval:ab`.
- Verification and tests (`bun test tools/eval`, `mise run test`, `mise run validate`).

Out of scope:

- Remote telemetry egress or third-party cloud dashboards.
- Refactoring legacy evaluation scripts.
- Weekly recursive self-improvement cron agent.

## Acceptance criteria

SC1–SC10 from spec `2026-10-16-usage-telemetry-pipeline` once approved. Parent also tracks child verification.

## Plan

1. 2026-10-16-usage-telemetry-pipeline-01-environment-and-research: mise clean-clone fix and OpenCode/Antigravity research documentation
2. 2026-10-16-usage-telemetry-pipeline-02-multi-host-ingestion: `tools/eval/run_usage.ts` and Antigravity hook integration
3. 2026-10-16-usage-telemetry-pipeline-03-aggregator-and-ledger: `tools/eval/aggregate_usage.ts` and `records/usage-ledger.tsv`
4. 2026-10-16-usage-telemetry-pipeline-04-ab-runner-and-contamination-guard: `tools/eval/ab_runner.ts` and mise tasks
5. 2026-10-16-usage-telemetry-pipeline-05-review-and-integration: end-to-end live runs, documentation, and review

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | full repository validation before change | pass | e1b407a | `bun run validate` |
| B2 | evaluation test suite before change | pass | e1b407a | `bun test tools/eval` (60 pass, 0 fail) |
| SC1 | multi-host ingestion parses Claude Code, Antigravity, OpenCode | pass | c76f884 | child 02 verified |
| SC2 | honest absent/unsupported recording without fabrication | pass | c76f884 | child 02 verified |
| SC3 | aggregate_usage produces Markdown summary tables and JSON | pass | e51f617 | child 03 verified |
| SC4 | ab_runner executes N=3 runs with worktree isolation and zero skill contamination | not run | - | pending child 04 |
| SC5 | deterministic quality_score and ledger updates | not run | - | pending child 04 |
| SC6 | raw jsonl traces git-ignored and ledger/summary tracked | pass | e51f617 | child 03 verified |
| SC7 | research documentation and decision-map updates | pass | 1c8dbc6 | child 01 verified |
| SC8 | mise.toml allows clean-clone installation | pass | 1c8dbc6 | child 01 verified |
| SC9 | mise tasks eval:usage and eval:ab execute within safety ceiling | not run | - | pending child 04 |
| SC10 | evaluation tests and repository validation pass cleanly | not run | - | pending child 05 |
| R1 | integrated regression run | not run | - | on verified_at |
| V1 | self-review diff against spec SC1–SC10 | not run | - | on verified_at |

## Review

skip: parent task is active; review runs before verified.

## Outcome

Pending execution of decomposed child tasks.

## Checkpoint

- as of: 2026-10-16, branch `work/usage-telemetry-pipeline`, HEAD 9f24730
- done: spec approved; child 01, child 02, and child 03 verified and committed
- active: executing epic children under /drive
- blocked: none
- next: execute child 04 (ab-runner-and-contamination-guard) and child 05 (review-and-integration)
- revalidate: none
