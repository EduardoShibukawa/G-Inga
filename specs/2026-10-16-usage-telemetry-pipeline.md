---
schema: spec/1
status: approved
version: 1
approved_version: 1
approved_hash: sha256:2589481b124175f06e401c12cd65275fa12d77f577e40cc65edb93858b36a0b9
---
# Continuous usage telemetry pipeline and multi-host A/B baseline

## Problem

`tools/eval/collect_usage.ts` provides parsers and sanitization, but telemetry collection remains manual, without persistence in everyday usage, without a continuous local OpenTelemetry (OTel) pipeline, and without real, reproducible A/B baselines. ADR 0006 covered only Claude Code and Antigravity, while OpenCode remained solely a distribution surface (`packages/opencode-plugin`) without telemetry. Token savings claims in previous experiments were largely synthetic or controlled scenarios without unified multi-host continuous observability.

Furthermore, running automated evaluations across multiple hosts risks benchmark contamination (e.g., project skills leaking into the baseline `without` arm), and `mise.toml`'s global lockfile settings broke clean-clone environments.

## Expected behavior

- A continuous local usage telemetry pipeline captures token consumption (`input`, `output`, `cache_read`, `cache_write`), estimated cost, duration, model, and host across Claude Code, Antigravity, and OpenCode without remote telemetry egress.
- **Claude Code:** Captures native OpenTelemetry metrics and logs emitted via `CLAUDE_CODE_ENABLE_TELEMETRY=1`.
- **OpenCode:** Integrates with `@devtheops/opencode-plugin-otel` for background OTLP export, and provides an external CLI parser for `opencode run --format json` / `opencode session export --sanitize`.
- **Antigravity CLI:** Integrates with lifecycle hooks (`.agents/hooks.json` on `Stop` / `PostInvocation`) executing `run_usage.ts` against the session transcript (`transcript.jsonl`), extracting step tokens and emitting local metrics.
- **Aggregator (`tools/eval/aggregate_usage.ts`):** Produces human-readable Markdown comparison tables and structured JSON metrics aggregated per run, task, and epic, defaulting to `records/usage-summary.md`.
- **A/B Baseline Runner (`tools/eval/ab_runner.ts`):** Runs N iterations (default N=3) of a task comparing `with` vs `without` G-Ingá under isolated conditions.
  - Automatically asserts and guards against scaffold contamination: the `without` arm executes in a dedicated temporary worktree devoid of `.claude/skills/` and `.agents/skills/`, applying host disable flags (such as `--disable-slash-commands`).
  - Computes a deterministic `quality_score` (1.0 for all tests and ACs passing, proportional for partial passes, 0.0 for build/validation failure).
- **Persistence:**
  - Raw JSONL traces in `records/usage/` are git-ignored via `.gitignore` to keep repository history compact.
  - Consolidated run metrics are appended to `records/usage-ledger.tsv` using the ADR 0006 vocabulary (`observed`, `estimated`, `derived`, `absent`, `unsupported`).
- **Environment:**
  - `mise.toml` is adjusted so `settings.locked` does not collide with global tools in clean clones while maintaining locked dependencies for repository tools.

## Scope

In scope:

- Multi-host telemetry ingestion script (`tools/eval/run_usage.ts`).
- Aggregation script (`tools/eval/aggregate_usage.ts`) generating `records/usage-summary.md` and JSON output.
- Reproducible A/B baseline runner (`tools/eval/ab_runner.ts`) with automated contamination assertion.
- OpenCode telemetry research document in `docs/research/` and decision map updates (`docs/decision-map.md`).
- Antigravity lifecycle hook integration for transcript telemetry.
- Tabular persistence in `records/usage-ledger.tsv` and `.gitignore` rules for raw traces.
- Fix for `mise.toml` clean-clone compatibility.
- Comprehensive unit tests in `tools/eval/*.test.ts` and task definitions in `mise.toml` (`eval:usage`, `eval:ab`).

Out of scope:

- Graphical/remote cloud dashboards (local OTel / Markdown / JSON suffice).
- Remote telemetry egress or third-party tracking services.
- Refactoring legacy evaluation scripts or previous experiment ledgers.
- Weekly recursive self-improvement cron agent (cataloged for future roadmap).

## Acceptance criteria

- SC1: `tools/eval/run_usage.ts` accepts telemetry inputs from Claude Code (OTel), Antigravity (transcripts/envelopes), and OpenCode (CLI JSON / OTel), sanitizing PII and outputting valid normalized `UsageObservation` records.
- SC2: If a host or metric cannot be measured, `tools/eval/run_usage.ts` records `absent` or `unsupported` honestly according to the ADR 0006 taxonomy without fabricating values.
- SC3: `tools/eval/aggregate_usage.ts` aggregates single or multiple usage records by run, task, and epic, generating `records/usage-summary.md` with Markdown comparison tables (tokens, cache ratio, estimated cost, duration) and structured JSON.
- SC4: `tools/eval/ab_runner.ts` executes N iterations (default N=3) across `with` and `without` arms for a designated task, enforcing physical worktree isolation and verifying zero skill presence in the `without` arm.
- SC5: `tools/eval/ab_runner.ts` calculates a deterministic `quality_score` based on unit test suite execution and task criteria verification, appending results to `records/usage-ledger.tsv`.
- SC6: Raw `.jsonl` trace outputs under `records/usage/` are ignored by Git, while `records/usage-ledger.tsv` and `records/usage-summary.md` are tracked.
- SC7: Research on OpenCode telemetry surfaces and Antigravity hook integration is documented in `docs/research/` and linked in `docs/decision-map.md`.
- SC8: `mise.toml` environment configuration allows clean-clone installation (`mise install`) without failing on global shims.
- SC9: Mise tasks `eval:usage` and `eval:ab` exist and execute within the default safety ceiling (`SHE_BUDGET_USD=5.00`).
- SC10: Unit and integration tests for `tools/eval/` pass (`bun test tools/eval`), and repository validation passes (`mise run validate` and `mise run test`).

## Interfaces and dependencies

- Pre-existing usage parsers and sanitization in `tools/eval/collect_usage.ts`.
- Repository ledger in `records/usage-ledger.tsv` extending the ADR 0006 column schema.
- Environment runner `mise` (`mise.toml`) and Bun test runner.
- Dependent on origin intent artifact `intents/2026-10-16-usage-telemetry-pipeline.md`.

## Decisions

- **Raw traces git-ignored:** Raw `.jsonl` files are stored locally under `records/usage/` and ignored by Git, preserving repository brevity while keeping consolidated summaries (`usage-summary.md`) and tabular data (`usage-ledger.tsv`) tracked. (Q1)
- **Tabular ledger format:** Telemetry uses `records/usage-ledger.tsv` instead of introducing a new formal artifact schema into the validator registry, avoiding unnecessary freeze bureaucracy for observational metrics. (Q2)
- **Default safety ceiling:** Automated paid runs enforce a default ceiling of $5.00 via `SHE_BUDGET_USD` to protect against unbounded retry loops. (Q3)
- **Integrated OpenCode support:** OpenCode telemetry is researched and supported directly in this epic via CLI parsers and OTel plugin compatibility. (Q4)
- **Hermetic A/B isolation:** The baseline `without` arm runs in a dedicated clean worktree without harness skills, coupled with host disable flags and automated pre-flight assertions. (Q5)
- **Environment fix:** `mise.toml` settings are updated to avoid blocking unmanaged global tools. (Q6)
- **Configurable benchmark task:** `ab_runner.ts` accepts `--task-id` or `--task-file`, defaulting to a reproducible reference scenario in `evals/scenarios/`. (Q7)
- **Deterministic quality metric:** `quality_score` is derived from deterministic repository tests and criteria checks rather than subjective LLM evaluators. (Q8)
- **Continuous OTel integration:** Standardizes on OpenTelemetry patterns across hosts (Claude Code native OTel, OpenCode plugin, Antigravity lifecycle hooks) for local dashboard and collector interoperability.

## Risks and constraints

- **Confirmatory bias and contamination:** Mitigated by strict worktree isolation and automated check of skill absence in the baseline arm.
- **Privacy and credential leakage:** Mitigated by mandatory invocation of `sanitizeText` scrubbing emails, tokens, and UUIDs before persistence.
- **Host CLI changes:** Mitigated by supporting standard OTel protocols and decoupling CLI parsing from internal agent state.
- **Unbounded costs during A/B:** Mitigated by `SHE_BUDGET_USD` ceiling enforcement and iteration limits.

## Verification

- Fixture tests verifying parsing of Claude Code OTel logs, Antigravity transcripts, and OpenCode JSON outputs.
- Test verifying `sanitizeText` strips sensitive credentials and emails.
- Test verifying `tools/eval/aggregate_usage.ts` correctly computes cache hit ratio and token sums.
- Contamination assertion unit test in `ab_runner.ts` ensuring detection of rogue skills.
- End-to-end execution of `mise run eval:usage` and `mise run eval:ab --iterations 1` with dummy or reference task.
- `bun test tools/eval` and repository validation `bun run validate` pass cleanly.

## Rollback

skip: No irreversible migrations or breaking changes to harness core; all scripts live under `tools/eval/` and can be reverted cleanly.

## Open questions

None (settled in sharpen rounds Q1–Q9 with owner on 2026-10-16).

## Revisions

- v1: Initial draft formulated from sharpen decisions Q1–Q9 and approved intent `intents/2026-10-16-usage-telemetry-pipeline.md`.
