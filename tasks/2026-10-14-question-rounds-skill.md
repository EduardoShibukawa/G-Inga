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
- approved: spec v1 by owner (2026-10-14, "Sim")

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
| SC1 | layout, provenance, own text, thin `sharpen` | pass | 55f7299 | procedure once per host as `work/references/question-rounds.md` naming `grilling` and `domain-modeling` at `49dd158`; overlap gate 0/41 verbatim lines and 0.0% 8-word shingles on both copies (was 13/51 and 29.3%); both `sharpen` skills user-invoked, one-line description, no procedure |
| SC2 | whole-frontier numbered rounds with recommended answers | pass | 55f7299 | §The model, §Running a round |
| SC3 | facts by the agent, read-only subagents, decisions by the owner | pass | 55f7299 | §Facts and decisions |
| SC4 | domain discipline and glossary | pass | 55f7299 | §Keeping the vocabulary honest, entry rules, §Legacy `CONTEXT.md` |
| SC5 | ADR offers: three conditions, `proposed`, owner accepts | pass | 55f7299 | §When to offer an ADR; house layout |
| SC6 | standalone close | pass | 55f7299 | §Standalone mode: glossary entries and owner-agreed `proposed` ADR drafts only, decision summary, offer of `/work` |
| SC7 | heavy integration in both hosts, one level below `SKILL.md` | pass | 55f7299 | both `work/SKILL.md` name `references/question-rounds.md` with `heavy.md` and list every reference file; `heavy.md` step 2 runs the procedure and records `decided:` lines |
| SC8 | Antigravity copies and OpenCode registration | pass | 55f7299 | `.agents` copies byte-identical; OpenCode `sharpen` skill (`autoinvoke` false) and `/sharpen` naming the procedure the loaded skill names; `bun test packages/opencode-plugin` 2/2; live `/api/command` listed `sharpen` at 48e1949 |
| SC9 | principles §2 and ADR 0004 OQ1/OQ3 | pass | 55f7299 | `docs/principles.md` §2; ADR 0004 OQ1 and OQ3 resolved by the spec |
| SC10 | bundle, manifest, docs; validate and test | pass | 55f7299 | `bundle.json` and `manifest.json` hold both `sharpen` and both procedure copies, `docs/bundle.md` lists them; `mise run validate` exit 0; `mise run test` 264 pass, 0 fail |
| V1 | integrated read of ed82275..55f7299 against SC1–SC10 after the review fixes | pass | 55f7299 | children 01–04 verified; review findings F1–F8 resolved below |

## Plan

1. `2026-10-14-question-rounds-skill-01-procedure-and-sharpen`: procedure file, `/sharpen`, heavy route and `heavy.md` step 2 for Claude Code (SC1–SC7).
2. `2026-10-14-question-rounds-skill-02-other-hosts`: Antigravity copies and OpenCode registration (SC8), after 01.
3. `2026-10-14-question-rounds-skill-03-docs-and-bundle`: principles §2, ADR 0004 annotations, bundle, manifest and `docs/bundle.md` (SC9, SC10), after 02.
4. `2026-10-14-question-rounds-skill-04-review-fixes`: the fresh-context review's findings (SC1, SC5, SC6, SC7, SC8), after 03.
5. Parent: integrated SC rows, one live `/sharpen` run, fresh-context review.

## Review

Fresh-context adversarial review on Opus (`work/review.md`), 2026-10-15, over ed82275 to the promotions branch head (reviewed files as at a88bb0f):

- [F1, critical, SC1] the procedure was a close copy of upstream (13/51 lines verbatim, 29.3% of 8-word shingles) without the MIT notice, and claimed original text -> fixed in 7008237 (rewrite; overlap gate 0/41 lines, 0.0%); children 01 and 02 re-verified at 55f7299
- [F2, major, SC5/SC6] standalone mode persisted only `accepted` ADRs -> fixed in 7008237 (owner-agreed drafts persist as `proposed`)
- [F3, minor, SC5] ADR template not in the house layout -> fixed in 7008237 (`# NNNN — Title`, Status/Date/Deciders)
- [F4, minor, SC6] standalone mode deleted `CONTEXT.md` -> fixed in 7008237 (removal left to the owner, listed in the summary)
- [F5, minor, SC8] OpenCode `/sharpen` named a different procedure path than the loaded skill -> fixed in 7008237; the part about a global install in a project without the bundle -> rejected: the plugin documents its skills as repository-bound (`packages/opencode-plugin/index.ts` header)
- [F6, minor, SC3] Claude-specific model name in the Antigravity copy -> fixed in 7008237 (host-neutral role wording)
- [F7, minor, SC7] reference files two levels below `SKILL.md` after ADR 0010 -> fixed in 7008237 (both `SKILL.md` list every reference file)
- [F8, minor] stale parent checkpoint and unrecorded live run; `docs/bundle.md` missing `model-policy.md` -> fixed in 7008237 (`docs/bundle.md`) and in this record (checkpoint); the live `/sharpen` run stays an owner action (the skill is user-invoked)
- Gate corrections by the orchestrator on the fix: "you choose" is the owner's decision and "later" stays open (no decision on the owner's behalf); ADR heading as in `docs/decisions/`.

Review complete: no open critical or major finding.

## Checkpoint

- as of: 2026-10-15, branch `work/2026-10-15-parent-integration`, worktree clean
- done: children 01, 02, 04 (verified at 55f7299) and 03 (verified at 48e1949); integrated SC1–SC10 pass at 55f7299; fresh-context review complete (F1–F8 resolved)
- active: none
- blocked: none
- next: owner runs one live `/sharpen` on a real idea and records it here (spec Verification), then decides acceptance; the parent stays `active` until then
- revalidate: none
