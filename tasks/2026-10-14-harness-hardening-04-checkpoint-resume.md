---
schema: task/1
tier: standard
status: verified
verified_at: "41a830b"
parent: 2026-10-14-harness-hardening
spec: 2026-10-14-harness-hardening@1
depends_on:
  - 2026-10-14-harness-hardening-03-model-policy
---

# Checkpoint and Resume in Drive and Orchestrate

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-14-harness-hardening after spec v1 approval)

## Objective

After each verified child, `drive` and `orchestrate` update the parent checkpoint with a resume prompt; on start they reconcile the checkpoint with Git and stop on a mismatch.

- In scope: `drive` and `orchestrate` procedures, `work`'s resume reference where shared, a table-top walk.
- Out of scope: an unattended headless driver.

## Acceptance criteria

- AC1 = SC6.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | 2edf21e | parent B1/B2: `mise run validate` exit 0, `mise run test` 242 pass |
| B2 | repository validation and test suites before change | pass | 24bec60 | `mise run validate` exit 0 (Overall: pass); `mise run test` exit 0 (264 pass, 0 fail) |
| AC1 | SC6: per-child checkpoint with resume prompt, reconciliation on start, stop on mismatch, table-top walk | pass | 41a830b | `/drive` Step 1 and Step 6 and `/orchestrate` OBSERVE and SEAL reference the shared template and reconciliation in `work/resume.md`; walk in `## Notes` |
| R1 | repository validation and test suites after change | pass | 41a830b | `mise run validate` exit 0 (Overall: pass); `mise run test` exit 0 (264 pass, 0 fail), after the manifest regeneration in 41a830b (first verified at 08c1f58 on the superseded base 64e193c) |
| V1 | self-review of 64e193c..HEAD against AC1 | pass | 41a830b | changed files all in scope; checkpoint template follows `docs/artifact-contracts.md` §3.6 (`as of`, `done`, `next`, `revalidate`) plus active, blocked and the resume prompt SC6 asks for; one shared copy in `work/resume.md`, referenced from `/drive` and `/orchestrate` |

## Plan

1. Write the per-child checkpoint step and the resume prompt template.
2. Write the start-time reconciliation and its stop condition.
3. Table-top walk: cut-off after child N resumes at N+1; mismatch stops dispatch.

## Notes

Table-top walk on epic `2026-10-14-harness-hardening` (children 01 to 07), using the template and "Reconcile on start" in `.claude/skills/work/resume.md`.

Scenario 1, cut-off after child 03. After sealing 03 at head `H3`, the parent checkpoint reads: done 01, 02, 03 (with sealing SHAs); active none; blocked none; next child 04; resume prompt "Resume 2026-10-14-harness-hardening on branch main. Expected head H3 ... continue with child 04. Done: 01, 02, 03." The session is cut. A new session pastes the prompt. `/drive` Step 1 reconciles: branch matches, HEAD equals `H3`, children 01 to 03 are `verified` and 04 to 07 are `todo`, worktree clean. Result `pass`. Eligible children are those with `depends_on` verified: 04 (depends on 03) qualifies and 05 to 07 follow in order. The resume starts at child 04, which is N+1. The same holds for `/orchestrate` OBSERVE.

Scenario 2, HEAD mismatch. The checkpoint records head `H3`, but `main` moved to `H9` with a commit that is not a child seal (or the branch differs). Reconciliation finds the recorded head is not HEAD and the commits between them do not seal the children in `done`. The start reports "checkpoint head H3, actual H9" and stops. No child is dispatched until the checkpoint is corrected or the difference is explained and recorded. The same stop applies if child 02 is `todo` in its record while `done` names it.

Dispatch cost (SC5): implementation worker on model `sonnet`, one attempt; `total_tokens` 57909 as reported by the host for the subagent run; `tokens_input`, `tokens_output`, `cache_read_tokens`, `cache_write_tokens` and `cache_read_ratio` not run (the host's agent result reports only the total). No prompt content recorded.

## Outcome

Delivered: the per-child parent checkpoint step and resume prompt template and the start-time reconciliation (one copy, in `work/resume.md`), referenced from `/drive` Step 1 and Step 6 and `/orchestrate` OBSERVE and SEAL, plus a parity note for the `.agents/` and `.opencode/` copies. Not delivered: mirroring to other hosts, and an unattended headless driver (out of scope). `work/resume.md` is a bundle asset: `manifest.json` needs regeneration by the orchestrator.
