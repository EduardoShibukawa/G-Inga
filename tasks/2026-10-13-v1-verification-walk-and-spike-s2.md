---
schema: task/1
tier: standard
status: active
---

# Run V1 Spec Verification Items 2 (R01–R17 Load Walk) and 4 (Spike S2)

## Routing and approvals

- tier: standard (S1 holds: each row is checkable against the bundle text and the frozen scenarios; S2 holds: a table-top walk plus one spike row; S3 holds: one new task record and one new research note, no bundle change; S4 holds: two-way door; S5 doesn't: no harness policy changes, only evidence about it)
- approved: follow-up task for spec Verification items 2 and 4 by owner (2026-10-13, acceptance of [ADR 0007](../docs/decisions/0007-harness-extensions-beyond-v1.md) Decision item 4 and its answered open questions)

## Objective

Close the two gaps that [ADR 0007](../docs/decisions/0007-harness-extensions-beyond-v1.md) item 4 found in the `## Verification` of the approved spec [specs/2026-10-11-minimal-v1-specification.md](../specs/2026-10-11-minimal-v1-specification.md)@1: item 2 (table-top walk of ADR 0002 scenarios R01–R17, verifying prompt loading, file reads and tier boundaries) and item 4 (spike S2, compaction re-attachment of `SKILL.md`). The accepted parent task [tasks/2026-10-11-minimal-v1-specification.md](2026-10-11-minimal-v1-specification.md) stays unchanged.

- In scope:
  - `tasks/2026-10-13-v1-verification-walk-and-spike-s2.md`
  - `docs/research/2026-10-13-r01-r17-load-walk.md`
- Out of scope:
  - The approved spec body and hash, accepted ADRs, and the accepted parent task record.
  - Any change to the `/work` bundle (`.claude/skills/work/**`, `.agents/skills/work/**`, `tools/validate/**`) or `manifest.json`; gaps the walk finds are recorded as findings only.
  - The `.agents/skills/work/**` Antigravity mirror (the spec items name Claude Code).
  - Running a nested `claude` session; spike S2 needs an interactive session.

## Acceptance criteria

- AC1 (spec Verification item 2): `docs/research/2026-10-13-r01-r17-load-walk.md` has one row per scenario R01–R17, each with the tier, the files loaded into context, the files read by the tier's flow and the tier boundary, each cited to a file and line or section of the current `/work` bundle as listed in `tools/validate/bundle.json`.
- AC2 (spec Verification item 2): the tiers in the walk agree with the EXP-01 frozen scenarios `docs/research/scenarios/r01-r17-v1.json`, reconfirmed by `tools/eval/evaluate_routing.ts` with 17/17 agreement and 0 critical misses.
- AC3 (spec Verification item 4, spike S2): in a Claude Code session that loaded `/work`, forcing compaction re-attaches `.claude/skills/work/SKILL.md` whole; the row records the `claude --version` it ran on (ADR 0007, answered open question 3).
- AC4: `mise run validate` reports Overall pass (exit 0) and `mise run test` exits 0.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline `mise install`, `mise run validate`, `mise run test` | pass | 36034be | full history (not shallow); validate Overall pass, exit 0; test 227 pass, 0 fail, exit 0 |
| AC1 | spec Verification item 2: R01–R17 load walk table | not run | | |
| AC2 | spec Verification item 2: tier reconfirmation with `tools/eval/evaluate_routing.ts` | not run | | |
| AC3 | spec Verification item 4: spike S2 compaction re-attachment | not run | | |
| AC4 | `mise run validate` and `mise run test` | not run | | |
| V1 | diff bounded to the two in-scope files | not run | | |

## Plan

1. Record B1 on 36034be before any edit.
2. Walk R01–R17 against `.claude/skills/work/**` and write the research note.
3. Rerun `tools/eval/evaluate_routing.ts` on the frozen scenarios with the walk's tiers.
4. Attempt spike S2; record `blocked` with the reason and `claude --version` if no interactive session is available.
5. Run validate and test, record results, and hand off to the owner.

## Checkpoint

- as of: 2026-10-13, branch work/adr0007-followup-B, head 36034be, worktree dirty (this record)
- done: B1 recorded
- next: write the R01–R17 load walk note
