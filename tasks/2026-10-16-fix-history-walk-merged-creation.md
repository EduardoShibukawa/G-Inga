---
schema: task/1
tier: standard
status: active
---

# Keep a Record's Last State When a Merge Brings In Its Older Creation

## Routing and approvals

- tier: standard (S2 holds: extends the existing sibling-branch guard in `tools/validate/artifacts/history.ts`; S6 holds: the validator suite exists; S3, S4, S7 hold; S1 holds; S5 does not hold: no rule changes, only a false positive in the walk)

## Objective

`mise run validate` fails on `main` at `f619688`. The history walk (§7.1) reports `verified → todo is not reachable` for the five Wave 1 records `2026-10-16-omp-host-compat-01`, `-02`, `-03`, `-04` and `-08`, at merge `b00459e`. That merge (PR #83) brought the records into `main` at `todo`, after the Wave 1 branches, forked from the same commit `f678867`, had already moved them to `verified`. The linear `rev-list` places `b00459e` after those commits. The existing sibling guard compares the record only with the merge's first parent, where the record did not exist yet. Extend the guard so a record identical to its state at any parent of a non-descendant commit is read as the pre-divergence state, not a transition. Then quote `verified_at` in the `-08` record (contract §3.1). That edit is what surfaced the failure.

In scope:

- `tools/validate/artifacts/history.ts`: the sibling guard checks every parent.
- `tools/validate/artifacts/artifacts.test.ts`: a regression fixture.
- `tools/validate/validate.js` rebuilt (`bun run build:validator`), and `manifest.json` regenerated.
- `tasks/2026-10-16-omp-host-compat-08-usage-telemetry-omp-host.md`: `verified_at` quoted.
- This task record.

Out of scope:

- Any other history rule, the state machine, the contract.
- The OMP Phase 2 tasks (05, 06, 07, 09), which another session runs.

## Acceptance criteria

- AC1: a fixture reproduces the false positive. A record is created at `todo` on branch T, moved to `verified` on branch W forked from T, then `main` merges T and then W (`--no-ff`, ordered dates). Before the fix `artifact-records` fails with `verified → todo is not reachable`; after it, it passes.
- AC2: `mise run validate` passes on this branch (history includes `b00459e`).
- AC3: `bun run build:validator` output is committed, `bun run manifest` was run after the asset commit, and the bundle/manifest checks pass.
- AC4: `mise run test` passes.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | `bun tools/validate/main.ts` on `main` | fail | f619688 | artifact-records: 5 × `verified → todo is not reachable` at b00459e (Wave 1 records) |
| AC1 | `bun test tools/validate/artifacts/artifacts.test.ts -t "older creation"` | not run | - | |
| AC2 | `mise run validate` | not run | - | |
| AC3 | `bun run build:validator`, `bun run manifest`, bundle checks | not run | - | |
| AC4 | `mise run test` | not run | - | |
| V1 | diff read against AC1–AC4 and the out-of-scope list | not run | - | |

## Plan

1. Write the AC1 fixture and confirm it fails on the current walk.
2. In the sibling guard, compare `now` with the record at every parent of `rev` (`git rev-list --parents -n 1 <rev>`), not only the first.
3. Rebuild `validate.js`, commit, regenerate `manifest.json`, commit it alone.
4. Run AC2–AC4 and V1.

## Checkpoint

- as of: 2026-10-16, branch work/2026-10-16-omp-host-compat-08-quote-verified-at, head f619688, worktree dirty (this record, the -08 record)
- done: B1; cause traced to `history.ts` sibling guard using only `${rev}^`
- next: plan step 1
