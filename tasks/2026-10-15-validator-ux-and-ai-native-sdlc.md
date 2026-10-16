---
schema: task/1
tier: heavy
status: active
spec: 2026-10-15-validator-ux-and-ai-native-sdlc@1
---

# Validator UX redesign and AI-native SDLC alignment

## Routing and approvals

- tier: heavy (H1, H3, H4, H5)
- confirmed: heavy by owner (2026-10-15, "inicie heavy")
- approved: spec v1 by owner (2026-10-15, "spec aprovada")- decided: Q11 heavy requires intent artifact → heavy task starts from an intent artifact created by a subagent, with the original prompt preserved verbatim by owner (2026-10-15, "sharpen 2026-10-15")
- decided: Q12 subagent rollout → phased validator-guide + researcher first, then reviewer, then verifier; one job per subagent with least tools by owner (2026-10-15, "sharpen 2026-10-15")
- decided: Q13 scope → intent artifact and subagents included in this same spec, not a separate project by owner (2026-10-15, "sharpen 2026-10-15")
- decided: Q14 authority → human authority at gates remains; agents prepare and execute by owner (2026-10-15, "sharpen 2026-10-15")
- decided: Q15 authoring vs full gate → authoring validation runs locally; full validation stays required before merge/CI; no hard F8 historical block in authoring by owner (2026-10-15, "sharpen 2026-10-15")
- decided: historical audit in authoring → authoring skips the historical walk; full validate and CI keep it by owner (2026-10-15, "Skip history in authoring, keep full gate")
- decided: spec approval protocol → keep draft-then-approved/reopen sequence; full gate keeps its allowed single-commit squashes by owner (2026-10-15, "Keep sequence")
- decided: heavy parent ## Review timing → may be `skip:` until review runs; resolved findings required before `verified` by owner (2026-10-15, "Allow skip:")
- decided: intent artifact representation → new schema `intent/1` under `intents/`, preserving the original prompt verbatim, created by a subagent by owner (2026-10-15, "New intent/1 artifact, intents/")
- decided: baseline/verified_at invariants → not relaxed; `B` rows stay strict ancestors, AC/SC/R/V stay at verified_at by owner (2026-10-15, "Do not relax")

## Objective

Implement the validator UX redesign and the AI-native SDLC alignment (intent artifact, authoring/full validation modes, phased subagent portfolio, skills) as one heavy task.

In scope: authoring vs full validation modes; intent artifact schema and storage; historical audit policy (full gate for artifact commits, authoring for working tree); phased subagent portfolio (validator-guide + researcher first, then reviewer, then verifier) and skills that explain the validator flow; validator UX fixes from the analysis (SHA canonicalization F4, error templates with next action, explain mode); decision map and proposed ADR(s) for policy changes; fixtures for new modes.

Out of scope: removing commit-order rules; relaxing baseline/verified_at invariants; migrating retired schemas.

## Acceptance criteria

SC1–SCn from spec `2026-10-15-validator-ux-and-ai-native-sdlc` once approved. Parent also tracks child verification.

## Plan

1. 2026-10-15-validator-ux-and-ai-native-sdlc-01-spec-and-intent-artifact: spec and intent artifact
2. 2026-10-15-validator-ux-and-ai-native-sdlc-02-validator-authoring-full-modes: validator authoring/full modes + messages
3. 2026-10-15-validator-ux-and-ai-native-sdlc-03-subagents-skills: subagents (validator-guide, researcher) + skills
4. 2026-10-15-validator-ux-and-ai-native-sdlc-04-history-audit-refinement: history audit refinement
5. 2026-10-15-validator-ux-and-ai-native-sdlc-05-review-fixes-integration: review fixes/integration

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | full repository validation before change | pass | cebd090 | `bun run validate` |
| B2 | validator module tests before change | pass | cebd090 | `bun test tools/validate` |
| SC1 | end-to-end spec criteria | not run |  | |
| R1 | integrated regression on merged head | not run |  | |
| V1 | integrated diff read against SCs | not run |  | |

## Review

skip: runs after children are verified

## Checkpoint

- as of: 2026-10-15, branch work/validator-ux-redesign-analysis, head cebd090, worktree clean
- done: heavy confirmed; question rounds recorded; baseline captured
- next: author spec draft in specs/2026-10-15-validator-ux-and-ai-native-sdlc.md (Opus) and run validator preflight
- open: spec approval, task decomposition, child execution
- revalidate: B1/B2 ran on cebd090; rerun before verification if main moves
