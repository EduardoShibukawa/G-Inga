---
schema: task/1
tier: standard
status: verified
verified_at: "010b85a"
---

# Close the Antigravity Orchestrate Drift Items

## Routing and approvals

- tier: standard (S1, S2, S3, S4 hold: port two host-neutral rules already stated in the Claude Code copy into the Antigravity copy, inside `.agents/skills/orchestrate/`; `light` is excluded because the edit changes skill procedure text rather than formatting, and S7 is weak: no check reads skill prose)
- approved: owner request (2026-10-13, `/drive --limit 4` backlog item c "orchestrate-antigravity-drift")

## Objective

Fix the three `drift` rows of `docs/research/2026-10-13-skill-parity-inventory.md` in the Antigravity `/orchestrate` copy, keeping every host adaptation (`invoke_subagent`, `TypeName`, `Workspace`, asynchronous wakeups).

- In scope:
  - `.agents/skills/orchestrate/SKILL.md`
  - `.agents/skills/orchestrate/references/ooda-cycle.md`
  - `tasks/2026-10-13-orchestrate-antigravity-drift.md`
- Out of scope:
  - `.claude/skills/orchestrate/**` and every other skill.
  - Updating the parity inventory itself (it records the state at its commit).

## Acceptance criteria

- AC1 (O5): the Antigravity `SKILL.md` ACT step allows the shared working tree only when the pre-dispatch collision check passes, isolates otherwise, and requires worktree results merged back into the orchestrator branch before Gate Layer 1.
- AC2 (C4): Phase 4 of the Antigravity `ooda-cycle.md` states the same condition and merge-back rule.
- AC3 (C1): the `gating --> claimed` label says the failure log is sent to the existing subagent, matching the Antigravity `gate.md` ("Send failure log to worker").
- AC4: host adaptations stay: `invoke_subagent`, `TypeName`, `Workspace`, no `Agent`/`isolation`/`SendMessage` terms introduced.
- AC5: `mise run validate` passes (markdown lint, mermaid render).
- AC6: `mise run test` passes (0 fail).

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validate | pass | 43ca06a | Overall pass |
| B2 | baseline test | pass | 43ca06a | 240 pass, 0 fail |
| AC1 | O5 worktree selection in `SKILL.md` | pass | 010b85a | new "Working Tree Selection" block in ACT: shared tree (`Workspace: "inherit"`) only on a passing collision check, isolation otherwise, merge-back before Gate Layer 1 |
| AC2 | C4 Phase 4 rule in `ooda-cycle.md` | pass | 010b85a | Phase 4 `Workspace` line now carries the condition and merge-back rule |
| AC3 | C1 retry label | pass | 010b85a | `gating --> claimed`: "Failure log sent to the existing subagent" |
| AC4 | host adaptations kept | pass | 010b85a | added lines contain 0 `Agent`/`isolation:`/`SendMessage` terms; `invoke_subagent`, `TypeName`, `Workspace` unchanged |
| AC5 | validate | pass | 010b85a | Overall pass; markdown-lint 0 issues; mermaid 54 rendered, 0 failed |
| AC6 | test | pass | 010b85a | 240 pass, 0 fail |
| V1 | diff read against AC1-AC6 and the out-of-scope list | pass | 010b85a | 3 files; 0 files under `.claude/skills/` |

## Plan

skip: two-file text port; the acceptance criteria are the plan.

## Outcome

The Antigravity `/orchestrate` copy now states the host-neutral worktree rule (shared tree only after a passing collision check, merge-back before Gate Layer 1) in both `SKILL.md` and Phase 4 of `ooda-cycle.md`, and its retry transition sends the failure log to the existing subagent, matching its own `gate.md`. Parity drift O5, C4 and C1 are closed; host adaptations are unchanged.

## Checkpoint

- as of: 2026-10-13, branch work/orchestrate-antigravity-drift, head 010b85a plus the commit recording this status, worktree clean after it, task verified; next: owner review of the PR
