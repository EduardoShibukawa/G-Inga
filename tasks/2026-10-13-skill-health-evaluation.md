---
schema: task/1
tier: heavy
status: completed
spec: 2026-10-13-skill-health-evaluation@1
---

# Skill Health Evaluation

## Routing and approvals

- tier: heavy (H1: evaluation instrument and its relation to autoresearch is an owner call, H3: spans skills, evaluation tooling, ledger and D7, H5: multi-session decomposition)
- confirmed: heavy by owner (2026-10-13, "Sim, heavy (Recommended)")
- decided: relation to autoresearch → complement, ledger stays the single system of record by owner (2026-10-13, "Complementar (Recommended)")
- decided: Claude Code and Antigravity skill copies are intentionally host-specific by owner (2026-10-13, "Um é para o Claude outro para o Antigravity")
- decided: phase 1 scope → all three skills by owner (2026-10-13, "As 3 skills (Recommended)")
- decided: cost ceiling per baseline run → USD 5 by owner (2026-10-13, "US$ 5 (Recommended)")
- decided: repetitions → 1× in phase 1, 3× in phase 2 by owner (2026-10-13, "1× agora, 3× na fase 2 (Recommended)")
- approved: spec v1 by owner (2026-10-13, "Aprovo spec v1")
- decided: finish the epic with `/orchestrate` and subagents by owner (2026-10-13, "bora usar o /orchestrate em subagents para finalizar")

- approved: exception SC2 registration part (which registration fires when project `work` and plugin `g-inga:work` both exist) deferred to phase 2 (3× runs with `--keep-temp` after fixing scaffold contamination) by owner (2026-10-13, "Exceção → fase 2 (Recommended)")
- approved: ADR 0007 accepted by owner (2026-10-13, "Aceitar (Recommended)")

## Objective

Establish a repeatable, measured health baseline for the `work`, `drive` and `orchestrate` skills, covering trigger accuracy, behavioral conformance and cross-host parity, recorded in the autoresearch ledger.

- In scope: evaluation suite on Claude Code, parity inventory, baseline run, ledger rows, proposed ADR for the instrument.
- Out of scope: editing skill text, Antigravity runtime evaluation, CI merge gate, description optimization loops.

## Acceptance criteria

SC1–SC8 from `specs/2026-10-13-skill-health-evaluation.md`.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation suite before change | pass | c039980 | `mise run validate` exit 0 (Overall: pass) |
| B2 | repository test suite before change | pass | c039980 | `mise run test`: 227 pass, 0 fail |
| SC1 | suite coverage | pass | ffe90d2 | 10 trigger cases (3 categories × 3 skills + registration), 7 conformance cases; grader types labeled; fresh-context review confirmed counts |
| SC2 | trigger baseline with ablation and registration record | blocked | ffe90d2 | per-skill accuracy recorded (work 4 pass; drive 1 pass, 2 blocked by max_turns; orchestrate 2 pass, 1 fail); registration part blocked: no trace proves both registrations were listed (child 05 AC6) |
| SC3 | conformance baseline | pass | ffe90d2 | 6 pass, 1 blocked in-run (work-standard: git denied in eval sandbox); post-run `check-workspace.sh` pass recorded separately |
| SC4 | parity inventory | pass | f21e3d9 | 30/30 differences classified (27 host adaptation, 3 drift); review reran `diff -r` and agreed |
| SC5 | single system of record | pass | ffe90d2 | SHE-BASE-TRIGGER and SHE-BASE-CONFORMANCE, 27 fields, ADR 0006 vocabulary, no prompts; raw results git-ignored |
| SC6 | measurement only | pass | ffe90d2 | `git diff --stat c039980 -- .claude/skills .agents/skills manifest.json` empty |
| SC7 | reproducible and bounded | pass | ffe90d2 | `mise run eval:skills` with USD 5 ceiling; deterministic classifier maps errored or partial runs to blocked/not run (12 tests); judge cost outside the CLI ceiling documented ($0.0232) |
| SC8 | instrument decision | pass | f21e3d9 | ADR 0007 `proposed`, linked from D7 |
| R1 | repository suites at the integrated head | pass | ffe90d2 | `mise run validate` Overall: pass; `mise run test` 239 pass, 0 fail |
| V1 | fresh-context adversarial review | pass | 311732f | 6 findings (3 major, 3 minor), all resolved below |

## Plan

1. Draft spec v1 and resolve its open questions with the owner.
2. Owner approves spec v1. Record `approved:` and freeze the hash.
3. Decompose into children at `@1` (done after approval). Wave 1 runs 01–04 in parallel; wave 2 runs 05:
   - `-01-instrument-adr`: verify `claude plugin eval`, `skill-creator` and `/skill-doctor` availability; write the proposed ADR and the D7 decision-map link (SC8).
   - `-02-trigger-cases`: trigger cases for the three skills and duplicate-registration measurement (SC1, SC2).
   - `-03-conformance-cases`: behavioral cases with validator-based graders (SC1, SC3).
   - `-04-parity-inventory`: classify Claude Code vs Antigravity differences (SC4).
   - `-05-baseline-run`: single run command with cost ceiling, baseline run, ledger rows, privacy and bundle-scope checks (SC5–SC7). Depends on 02 and 03.
4. Integrated verification (SC1–SC8, R rows), fresh-context review per `.claude/skills/work/review.md`, then owner acceptance.

## Review

Fresh-context adversarial review of c039980..311732f (2026-10-13).

- [F1] major, SC7: errored runs (max_turns) recorded as pass -> fixed in ffe90d2 (deterministic classifier, baseline reclassified)
- [F2] major, SC7/SC5: standard case passed only via a manual post-run check while in-run grader was blocked -> fixed in ffe90d2 (in-run grader blocked, post-run check automated and reported separately)
- [F3] major, SC2: registration result claimed without evidence both registrations existed -> fixed in ffe90d2 (SC2 registration part recorded blocked; scaffold contamination listed as follow-up)
- [F4] minor, SC5: trigger tokens discarded; non-ADR-0006 vocabulary -> fixed in ffe90d2
- [F5] minor, SC7: ceiling fallback could overspend; judge cost outside ceiling -> fixed in ffe90d2 (conformance skipped when trigger result missing; judge cost documented)
- [F6] minor, scope: duplicate-listing cost not measured -> fixed in ffe90d2 (~242 tok always-on per registration set, listed twice when both active)

## Checkpoint

- Date: 2026-10-13
- Branch: `docs/skill-health-evaluation`, HEAD ffe90d2 (worktree `/home/tg/Projetos/G-Inga-she`; main checkout is used by another session)
- Done: all five children delivered (01–04 verified at f21e3d9; 05 completed with AC6 blocked), baseline recorded (USD 2.75), fresh-context review findings F1–F6 resolved.
- Next action: owner decides on the SC2 blocker and on ADR 0007; then merge `origin/main`, push and open the PR.
