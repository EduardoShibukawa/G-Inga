---
schema: task/1
tier: heavy
status: verified
verified_at: "f332da836e249dcce1e6b9d4fa8f8cd766d9147a"
spec: 2026-10-15-validator-ux-and-ai-native-sdlc@1
---

# Validator UX redesign and AI-native SDLC alignment

## Routing and approvals

- tier: heavy (H1, H3, H4, H5)
- confirmed: heavy by owner (2026-10-15, "inicie heavy")
- approved: spec v1 by owner (2026-10-15, "spec aprovada")
- decided: Q11 heavy requires intent artifact → heavy task starts from an intent artifact created by a subagent, with the original prompt preserved verbatim by owner (2026-10-15, "sharpen 2026-10-15")
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
| SC1 | validate --authoring runs only current-state checks | pass | f332da836e249dcce1e6b9d4fa8f8cd766d9147a | verified in child 02 and test suite |
| SC2 | full validate keeps history and ancestry checks | pass | f332da836e249dcce1e6b9d4fa8f8cd766d9147a | verified in child 02 and test suite |
| SC3 | authoring and full mode share one finding/rule vocabulary | pass | f332da836e249dcce1e6b9d4fa8f8cd766d9147a | verified in child 02 and test suite |
| SC4 | SHA canonicalization prevents abbreviation/log mismatches | pass | f332da836e249dcce1e6b9d4fa8f8cd766d9147a | verified in child 02 and test suite |
| SC5 | validator findings include observed/expected/next and explain mode | pass | f332da836e249dcce1e6b9d4fa8f8cd766d9147a | verified in child 02 and test suite |
| SC6 | heavy parents may keep review skip: until verified | pass | f332da836e249dcce1e6b9d4fa8f8cd766d9147a | verified in child 02 and test suite |
| SC7 | intent/1 artifact round-trips through validator with history walk | pass | f332da836e249dcce1e6b9d4fa8f8cd766d9147a | verified in child 01, 04 and test suite |
| SC8 | validator-guide and researcher subagents exist with minimal tools | pass | f332da836e249dcce1e6b9d4fa8f8cd766d9147a | verified in child 03 |
| SC9 | skills explaining validator flow exist and linked in docs | pass | f332da836e249dcce1e6b9d4fa8f8cd766d9147a | verified in child 03 |
| SC10 | decision map records policy changes and proposed ADRs 0012, 0013 | pass | f332da836e249dcce1e6b9d4fa8f8cd766d9147a | verified in child 05 |
| SC11 | baseline and verification test suites pass cleanly | pass | f332da836e249dcce1e6b9d4fa8f8cd766d9147a | `bun run validate && bun test tools/validate` (136 pass, 8 skip, 0 fail) |
| R1 | integrated regression on merged head | pass | f332da836e249dcce1e6b9d4fa8f8cd766d9147a | `mise run validate && bun test tools/validate` |
| V1 | integrated diff read against SCs | pass | f332da836e249dcce1e6b9d4fa8f8cd766d9147a | diff read across children 01–05 commits against SC1–SC11 |

## Review

- finding: missing X10–X15 fixtures in contract §7.2 table: fixed in 19f94fd
- finding: full gate history applicability coverage for intents/ records: fixed in c3536a2
- review: fresh-context review against spec SC1–SC11 confirmed all 11 criteria delivered across child tasks 01–05 with zero regressions: resolved

## Outcome

Delivered the complete validator UX redesign and AI-native SDLC alignment across five decomposed standard child tasks (01–05):

- Schema `intent/1` registered under `intents/` preserving original prompts verbatim (`intents/2026-10-15-validator-ux-and-ai-native-sdlc.md`).
- Validation authoring mode (`bun run validate:authoring` / `--authoring`) skipping history/ancestry while retaining current-tree checks.
- SHA canonicalization, error templates (`observed`, `expected`, `next`), and `--explain <rule>` explain mode.
- Phased subagents (`validator-guide`, `researcher`) and `validator-flow` skill linked in documentation.
- History audit refinement for `intents/`, F4/F8 documentation in `docs/research/artifact-contract-validator-findings.md`.
- Synchronized contract fixture tables and proposed ADRs 0012 and 0013.
- Integrated test suite and full validation pass cleanly (136 passed, 8 skipped, 0 failed).

## Checkpoint

- as of: 2026-10-16, branch work/validator-ux-redesign-analysis, head f332da8, worktree clean
- done: all child tasks 01–05 verified; parent review and end-to-end verification (SC1–SC11, R1, V1) passed
- next: deliver PR and request owner acceptance (verified → accepted)
- open: owner review and acceptance
- resume prompt: /drive --tag 2026-10-15-validator-ux-and-ai-native-sdlc
