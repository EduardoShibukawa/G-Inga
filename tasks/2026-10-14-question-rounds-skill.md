---
schema: task/1
tier: heavy
status: active
spec: 2026-10-14-question-rounds-skill@1
---

# G-Ingá Question-Rounds Skill to Replace `grilling` and `domain-modeling`

## Routing and approvals

- tier: heavy (H1: ADR 0004 open questions 1 and 3 are owner calls, H4: changes harness policy text in `work/heavy.md` and `docs/principles.md` §2)
- approved: owner request to record the gap and open this task (2026-10-14, "sim")
- confirmed: heavy by owner (2026-10-14, "Confirmo tudo")
- decided: question format → whole frontier per round, numbered, each with a recommended answer; `docs/principles.md` §2 aligned to it by owner (2026-10-14, "Confirmo tudo")
- decided: glossary → plain repository doc, not a contract artifact, created lazily on the first resolved term; the skill challenges fuzzy terms and offers an ADR only when hard to reverse, surprising and a real trade-off by owner (2026-10-14, "Confirmo tudo")
- decided: distribution → ships in the plugin bundle, referenced by `work/heavy.md` step 2 by owner (2026-10-14, "Confirmo tudo")
- decided: name → `/sharpen` by owner (2026-10-14, "Q4. OK")
- decided: fact-finding → the skill dispatches read-only subagents for facts, without blocking questions that don't depend on them by owner (2026-10-14, "Podemos usar subagents, nao vejo motivo de nao melhorar o que temos")
- decided: invocation → `disable-model-invocation: true`; the agent runs it only when the owner asks or a skill that uses it says so by owner (2026-10-14, "todas skills deveriam ser disable-model-invocation: true")
- decided: glossary location → `docs/glossary.md`; an existing `CONTEXT.md` is migrated there by owner (2026-10-14, "poderiamos só migrar para docs/gloassary.md")
- decided: hosts → Claude Code, Antigravity (`.agents/skills/`) and OpenCode by owner (2026-10-14, "Sim e no opencvode tambem")
- decided: standalone persistence → only glossary entries and owner-accepted ADRs; the session ends with a decision summary and an offer to open `/work` by owner (2026-10-14, "Q9. ok")
- decided: layout → procedure once as `work/references/question-rounds.md`; `/sharpen` is a thin user-invoked entry that reads it; the heavy route reads it directly, one level from `SKILL.md` by owner (2026-10-14, "Ok. concordo.")
- decided: invocation rule → owner-typed entry points `disable-model-invocation: true`; anything another skill or subagent reaches is a reference file; `/work` stays model-invocable until its workers stop invoking it, in a separate task by owner (2026-10-14, "Ok. concordo.")

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

SC1–SC10 from `specs/2026-10-14-question-rounds-skill.md`.

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
- done: friction F-001 and F-002 logged; heavy confirmed; rounds 1–2 decided; spec v1 drafted
- next: owner approves spec v1, then decompose into children
