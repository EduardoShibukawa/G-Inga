---
schema: task/1
tier: standard
status: todo
parent: 2026-10-16-usage-telemetry-pipeline
spec: 2026-10-16-usage-telemetry-pipeline@1
depends_on: []
---

# Environment clean-clone fix and multi-host telemetry research

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-16-usage-telemetry-pipeline)

## Objective

Implement child 01 of the continuous usage telemetry pipeline:

1. Fix `mise.toml` settings so `mise install` executes cleanly in new/clean clones without colliding with unpinned global shims in user configuration, while keeping repository dev tools (`bun`, `hk`, `pkl`) strictly locked to `mise.lock` (SC8).
2. Author the research document `docs/research/2026-10-16-multi-host-telemetry-and-opencode-pipeline.md` covering OpenCode surfaces (CLI JSON / `@devtheops/opencode-plugin-otel`), Antigravity lifecycle hooks (`.agents/hooks.json`), and Claude Code OTel (SC7).
3. Update `docs/decision-map.md` linking D4/D7 to this research and new telemetry architecture.

In scope:

- `mise.toml` adjustment and verification.
- Research document `docs/research/2026-10-16-multi-host-telemetry-and-opencode-pipeline.md`.
- `docs/decision-map.md` updates.
- Validation checks.

Out of scope:

- Implementing `run_usage.ts` parser logic (child 02).
- Aggregator and ledger (child 03).
- A/B runner (child 04).

## Acceptance criteria

1. AC1: `mise.toml` allows `mise install` in a clean clone without error on global developer shims while keeping repository tools (`bun`, `hk`, `pkl`) pinned by checksum in `mise.lock`.
2. AC2: Research document `docs/research/2026-10-16-multi-host-telemetry-and-opencode-pipeline.md` documents OpenCode CLI surfaces (`--format json`, `session export`, `stats`), `@devtheops/opencode-plugin-otel` OTLP architecture, and Antigravity `.agents/hooks.json` lifecycle hook integration.
3. AC3: `docs/decision-map.md` is updated linking D4/D7 observability to the research and new telemetry pipeline.
4. AC4: Repository validation and tests remain green (`bun run validate`, `bun run test`).

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation before change | pass | e1b407a | `bun run validate` |
| AC1 | clean clone mise install succeeds | not run | - | verify with mise install |
| AC2 | research document exists and passes markdown/local-link lint | not run | - | verify docs/research/ file |
| AC3 | decision map updated and valid | not run | - | verify decision-records check |
| AC4 | test and validate green | not run | - | bun run test && bun run validate |
| R1 | regression check on verified_at | not run | - | on verified_at |
| V1 | diff read against AC1–AC4 | not run | - | on verified_at |

## Plan

1. Inspect `mise.toml` lockfile settings and adjust `settings.locked = false` or tool isolation so global tools don't fail `mise install`.
2. Author `docs/research/2026-10-16-multi-host-telemetry-and-opencode-pipeline.md` with complete architecture findings.
3. Update `docs/decision-map.md` rows for D4/D7.
4. Run repository validation and tests.

## Outcome

Pending execution.

## Checkpoint

- as of: 2026-10-16, branch `work/usage-telemetry-pipeline`, worktree clean
- done: child 01 initialized
- active: executing child 01
- blocked: none
- next: adjust mise.toml and draft research document
- revalidate: none
