---
schema: task/1
tier: heavy
status: active
spec: 2026-10-13-skill-health-evaluation@1
---

# Skill Health Evaluation

## Routing and approvals

- tier: heavy (H1: evaluation instrument and its relation to autoresearch is an owner call, H3: spans skills, evaluation tooling, ledger and D7, H5: multi-session decomposition)
- confirmed: heavy by owner (2026-10-13, "Sim, heavy (Recommended)")
- decided: relation to autoresearch → complement, ledger stays the single system of record by owner (2026-10-13, "Complementar (Recommended)")
- decided: Claude Code and Antigravity skill copies are intentionally host-specific by owner (2026-10-13, "Um é para o Claude outro para o Antigravity")
- decided: phase 1 scope → all three skills by owner (2026-10-13, "As 3 skills (Recommended)")

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

## Plan

1. Draft spec v1 and resolve its open questions with the owner.
2. Owner approves spec v1. Record `approved:` and freeze the hash.
3. Decompose into children at `@1` (created only after approval):
   - `-01-instrument-adr`: verify `claude plugin eval`, `skill-creator` and `/skill-doctor` availability; write the proposed ADR and the D7 decision-map link (SC8).
   - `-02-trigger-cases`: trigger cases for the three skills and duplicate-registration measurement (SC1, SC2).
   - `-03-conformance-cases`: behavioral cases with validator-based graders (SC1, SC3).
   - `-04-parity-inventory`: classify Claude Code vs Antigravity differences (SC4).
   - `-05-baseline-run`: single run command with cost ceiling, baseline run, ledger rows, privacy and bundle-scope checks (SC5–SC7). Depends on 02 and 03.
4. Integrated verification (SC1–SC8, R rows), fresh-context review per `.claude/skills/work/review.md`, then owner acceptance.

## Review

No findings yet.

## Checkpoint

- Date: 2026-10-13
- Branch: `docs/skill-health-evaluation` (from `origin/main` at c039980)
- Worktree: main checkout, `/home/tg/Projetos/G-Inga`
- Done: heavy confirmed, round-1 decisions recorded, spec v1 drafted, baseline B1/B2 recorded.
- Next action: owner answers the spec's open questions (cost ceiling, repetitions) and reviews spec v1 for approval.
