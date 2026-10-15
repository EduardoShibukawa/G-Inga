---
schema: task/1
tier: standard
status: verified
verified_at: "f7839c3"
parent: 2026-10-14-harness-hardening
spec: 2026-10-14-harness-hardening@1
depends_on:
  - 2026-10-14-harness-hardening-05-session-close-merge
---

# Harness Hardening Review Fixes

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-14-harness-hardening to resolve its fresh-context review findings within spec v1; no spec change)

## Objective

Resolve the parent's review findings (2026-10-15) that sit inside spec v1, so SC2, SC4, SC5 and SC8 hold as written.

- In scope:
  - F1 (SC2): `tools/validate/bundle-validate-step.test.ts` installs a Git pre-commit hook running `mise run pre-commit` in the fixture target and proves an invalid record commit is rejected and a valid one accepted; `docs/bundle.md` tells a target how to install that hook; the SC8 missing-hook warning in `hooks/session-start.mjs` names an action that works in a target repository.
  - F2, F3 (SC4): `.claude/skills/orchestrate/SKILL.md`, `.claude/skills/orchestrate/gate.md`, `.claude/skills/orchestrate/references/ooda-cycle.md`: the Opus retry is a new dispatch with `model: "opus"` carrying the failure log, not `SendMessage` to the Sonnet worker; every dispatch names a model.
  - F6: `hk.pkl` comment on the stash (shared `refs/stash`, not per worktree).
  - F7, F8 (SC8): `hooks/session-start.mjs` caches a failed or timed-out lookup for 24 h too, runs the local hook check before the network check, and finds a `pre-commit` task in every mise config location; tests in `tools/gate/startup-warnings.test.ts`.
  - F9 (SC5): `.claude/skills/orchestrate/subagent-prompt.md` (and the `drive`/`orchestrate` seal text if needed): the orchestrator records model and token totals from the host's agent result, not the worker's own report.
- Out of scope: `.claude/settings.json` deny rules (F4, owner decision), gating merge/rebase/cherry-pick commits (F5, follow-up), the spec, ADRs, `.agents/**`.

## Acceptance criteria

- AC1 = F1/SC2: the fixture target commit test rejects an invalid record commit and accepts a valid one through a real Git hook.
- AC2 = F2, F3/SC4: no `SendMessage`-based retry and no model-less dispatch remains in `orchestrate` (SKILL, gate, ooda-cycle, subagent-prompt).
- AC3 = F7, F8/SC8: after a failed lookup, the next session within 24 h doesn't reach the network; the missing-hook check runs first; a `pre-commit` task in `.mise.toml`, `.config/mise.toml`, `mise/config.toml` or `.config/mise/config.toml` triggers the warning.
- AC4 = F6, F9: `hk.pkl` comment corrected; the cost note's source is the host's agent result.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | e083e6c | `mise run validate` exit 0 (Overall: pass); `mise run test` exit 0 (264 pass, 0 fail) |
| AC1 | fixture target commit test rejects an invalid record and accepts a valid one through a real Git hook | pass | f7839c3 | `bun test tools/validate/bundle-validate-step.test.ts`: 5 pass, 0 fail; target path and `sh()` confined to the temp root |
| AC2 | no `SendMessage` retry and no model-less dispatch remains in `orchestrate` | pass | f7839c3 | grep over `.claude/skills/{work,drive,orchestrate}`: retry is a new `Agent` with `model: "opus"`; every dispatch names a model |
| AC3 | failed lookup cached 24 h, hook check first, every mise config location and inline `[tasks]` form | pass | f7839c3 | `bun test tools/gate/startup-warnings.test.ts`: new cases for cached failure, hook-before-network, four config paths, inline form |
| AC4 | `hk.pkl` comment corrected; cost note source is the host's agent result | pass | f7839c3 | `hk.pkl` comment only; `subagent-prompt.md`, orchestrate SEAL, drive Step 6 and `model-policy.md` updated |
| R1 | repository validation and test suites after change | pass | f7839c3 | `mise run validate` exit 0 (Overall: pass); `mise run test` exit 0 (274 pass, 0 fail), after the manifest regeneration in f7839c3 |
| V1 | self-review of the diff against AC1-AC4 and the allowed files | pass | f7839c3 | diff limited to the in-scope files |

## Plan

1. SC2 commit test and target hook docs; actionable warning text.
2. Orchestrate retry and dispatch text; cost-note source.
3. Startup hook cache, order and config locations, with tests.

## Notes

Dispatch cost (SC5): implementation worker on model `sonnet`, one attempt; `total_tokens` 91556 from the host's agent result; `tokens_input`, `tokens_output`, `cache_read_tokens`, `cache_write_tokens` and `cache_read_ratio` not run (the host reports only the total). No prompt content recorded.

## Outcome

F1, F2, F3, F6, F7, F8 and F9 are resolved within spec v1. The bundle step test now installs a Git `pre-commit` hook in a fixture target confined to the temp root and proves a rejected invalid commit (HEAD unchanged, finding named) and an accepted valid commit. The Opus retry is a new `Agent` dispatch carrying the failure log. The startup hook checks locally first, caches failed lookups for 24 h and reads every mise config location. Token totals come from the host's agent result, not the worker.

`model-policy.md` is a bundle asset; `manifest.json` was regenerated alone in f7839c3.
