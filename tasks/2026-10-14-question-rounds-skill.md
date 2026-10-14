---
schema: task/1
tier: heavy
status: todo
spec: 2026-10-14-question-rounds-skill@1
---

# G-Ingá Question-Rounds Skill to Replace `grilling` and `domain-modeling`

## Routing and approvals

- tier: heavy (H1: ADR 0004 open questions 1 and 3 are owner calls, H4: changes harness policy text in `work/heavy.md` and `docs/principles.md` §2)
- approved: owner request to record the gap and open this task (2026-10-14, "sim")

## Objective

Close friction F-001 and F-002 (`docs/friction-log.md`): after the owner retired the Pocock plugin (ADR 0007), G-Ingá has no standalone interview primitive and no domain-modeling discipline.

- In scope (candidate, settled in question rounds):
  - a user-invoked G-Ingá skill for question rounds, with a name distinct from upstream (ADR 0004, D5 item 3), usable standalone and referenced by `work/heavy.md` step 2;
  - technique adapted under ADR 0004 item 5 from `grilling` and `domain-modeling` at `49dd158`, with provenance: design tree and frontier, numbered questions each with a recommended answer, facts looked up by the agent and decisions put to the owner, done when the frontier is empty and the owner confirms shared understanding;
  - fact-finding rule consistent with the subagent default of 0 (ADR 0004 D5 item 6) and the ADR 0009 model policy;
  - term challenge, edge-case scenarios, claim-vs-code cross-check, and the three-condition rule for offering an ADR in `docs/decisions/`;
  - resolve the `docs/principles.md` §2 contradiction and its stale "(installed)" note;
  - the `.agents/skills/work/**` mirror and bundle manifest, if the skill ships in the bundle.
- Out of scope: vendoring upstream text (ADR 0004 item 6); a `wayfinder` replacement (ADR 0004 OQ5).

## Open decisions (owner)

1. ADR 0004 OQ1: whole frontier per round with recommended answers, or one question at a time? Recommended: whole frontier, matching the owner's 35 prior `grilling` uses.
2. ADR 0004 OQ3: glossary as a plain repository doc (e.g. `CONTEXT.md`, not a contract artifact), or no glossary yet? Recommended: plain doc, created lazily on the first resolved term.
3. Ships in the plugin bundle for target projects, or repository-only? Recommended: bundle, since `heavy.md` will reference it.

## Acceptance criteria

To be fixed by the spec after the question rounds.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation suite before change | pass | ed82275 | `mise run validate` exit 0 (Overall: pass) |

## Plan

skip: heavy parent awaiting owner confirmation; plan follows spec approval.

## Review

None yet: the fresh-context review runs after integration (`work/review.md`).

## Checkpoint

- date: 2026-10-14
- branch: claude/matpock-desativacao-verificacao-7c26eb
- HEAD: ed82275
- worktree: .claude/worktrees/backlog-seed-tasks-e38dc9
- done: friction F-001 and F-002 logged; task recorded as `todo`
- next: owner confirms heavy (`confirmed: heavy by owner ...`), then question rounds on the open decisions and spec draft
