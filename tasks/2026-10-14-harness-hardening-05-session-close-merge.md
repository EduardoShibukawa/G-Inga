---
schema: task/1
tier: standard
status: verified
verified_at: "e083e6c"
parent: 2026-10-14-harness-hardening
spec: 2026-10-14-harness-hardening@1
depends_on:
  - 2026-10-14-harness-hardening-04-checkpoint-resume
---

# Session Close Report and Merge Rule

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-14-harness-hardening after spec v1 approval)

## Objective

Every delivering session ends with a remote-state report, and the agent merges only after required checks pass, then verifies `origin/main` contains the merge.

- In scope: handoff and merge steps in `work`, `drive` and `orchestrate`.
- Out of scope: enabling branch protection (owner action).

## Acceptance criteria

- AC1 = SC7.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | 2edf21e | parent B1/B2: `mise run validate` exit 0, `mise run test` 242 pass |
| B2 | repository validation and test suites before change | pass | 55f7299 | `mise run validate` exit 0 (Overall: pass); `mise run test` exit 0 (264 pass, 0 fail) |
| AC1 | SC7: handoff report (fetch, `origin/main`, local-only, worktrees), merge rule (required checks, no `--admin`), post-merge verification | pass | e083e6c | one section in `work/references/procedure.md`, referenced from `/drive` Step 6, `/orchestrate` SEAL and `work/standard.md`; table-top in `## Notes` |
| R1 | repository validation and test suites after change | pass | e083e6c | `mise run validate` exit 0 (Overall: pass); `mise run test` exit 0 (264 pass, 0 fail), after the manifest regeneration in e083e6c |
| V1 | self-review of 01fec5a..HEAD against AC1 | pass | e083e6c | one shared section in `procedure.md` (bundle asset), referenced from `/drive` Step 6, `/orchestrate` SEAL and `standard.md` step 5; covers fetch, `origin/main`, local-only commits, unmerged pushed branches, worktrees, required checks via `gh pr checks`, no `--admin`, no reliance on `--auto` without required checks, merge commit, post-merge `merge-base --is-ancestor`; table-top in `## Notes` |

## Plan

1. Add the handoff report steps (fetch, `origin/main`, local-only, worktrees).
2. Add the merge rule: required checks green, no `--admin`, post-merge verification.

## Notes

Table-top: handoff report applied to this repository at 2026-10-15 (read-only commands).

```text
handoff (fetched 2026-10-15, base 55f7299)
origin/main: none beyond worktree base (git log HEAD..origin/main empty) -> pass
local-only commits: fail (7+ commits on local branches not on any remote, e.g. 1d9bcc4 on work/prompt-audit-remediation, plus old e3-envelopes-hygiene commits)
pushed, not merged: fail (many origin/agy/* and origin/archive/* branches not in origin/main; archive/agy branches are likely intentional and would be named)
worktrees: fail (8 listed; scratchpad wt04, wt06, wt07, wtp, wtq hold task branches; /tmp/opencode/g-inga-merge detached at 04bfd98)
merge: not run (no PR in this session)
```

The report surfaces the E4 failure mode: work sitting on local branches and worktrees while the owner assumes it is on `main`.

Dispatch cost (SC5): implementation worker on model `sonnet`, one attempt; `total_tokens` 51207 as reported by the host for the subagent run; `tokens_input`, `tokens_output`, `cache_read_tokens`, `cache_write_tokens` and `cache_read_ratio` not run (the host reports only the total). No prompt content recorded.

## Outcome

Delivered: one "Session Close and Merge" section in `work/references/procedure.md` (handoff report with a short block format, merge rule with required checks, no `--admin`, no reliance on `--auto`, merge commit, post-merge `merge-base --is-ancestor` check), referenced from `/drive` Step 6, `/orchestrate` SEAL and `work/standard.md`, plus a parity note. Not delivered: mirroring to other hosts; enabling branch protection (owner action). `procedure.md` is a bundle asset: `manifest.json` needs regeneration by the orchestrator, then R1.
