---
schema: task/1
tier: standard
status: completed
parent: 2026-10-13-skill-health-evaluation
spec: 2026-10-13-skill-health-evaluation@1
---

# Evaluation Instrument ADR

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-13-skill-health-evaluation after spec v1 approval)

## Objective

Verify which evaluation instruments are available in the owner's Claude Code and record the instrument choice as a proposed ADR linked from D7 (spec SC8).

- In scope: a proposed ADR in `docs/decisions/`, the D7 row and diagram in `docs/decision-map.md`, this record.
- Out of scope: editing any skill instruction file (spec SC6); changes to the approved spec or accepted ADRs.

## Acceptance criteria

- AC1 = SC8: proposed ADR records chosen runner, alternatives, relation to autoresearch, and is linked from the decision map under D7.
- AC2: availability of `claude plugin eval`, `skill-creator` and `/skill-doctor` is recorded with the observed evidence (command output or its absence).

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | c039980 | parent B1/B2: `mise run validate` exit 0, `mise run test` 227 pass |
| AC1 | `docs/decisions/0007-skill-evaluation-instrument.md` read against SC8; D7 row and diagram in `docs/decision-map.md` | pass | worktree | ADR 0007 `proposed`: runner `claude plugin eval`, alternatives (extend `tools/eval`, `skill-creator` alone), "Relation to autoresearch" (complement, ledger as single system of record). Linked under D7 from the diagram, the D7 row (text reference) and a new `## Extensions of settled decisions` section; the validator's decision-records check forbids a row linking an ADR of a different status, so D7 stays `accepted`. `mise run validate` exit 0 |
| AC2 | availability probes without paid runs: `claude --version`, `claude plugin --help`, `claude plugin eval --help`, `claude plugin details --help`, `claude plugin list`, `claude --help`, skill paths under `~/.claude` | pass | worktree | Claude Code `2.1.296`. `claude plugin eval`: available (flags incl. `--ablation`, `--max-cost-usd`, `--judge-model`, `--runs`, `--json`, `--no-publish`). `skill-creator`: synced skill present, not an installed plugin. `/skill-doctor`: absent from CLI help and session skill list; binary strings show it is feature-gated, so unverified. Recorded as E1–E4 in ADR 0007 |

## Outcome

Delivered ADR 0007 (`proposed`) recording `claude plugin eval` as the phase 1 runner, `skill-creator` as authoring aid and phase 2 candidate, and `/skill-doctor` as conditional, with the availability evidence E1–E4. Linked from D7 in the decision map without changing D7's status. Not delivered: owner acceptance of the ADR. Follow-ups: the suite must keep `evals/results/` out of version control (no ignore rule exists today) and pass `--runs 1` and `--no-publish` explicitly, since the CLI defaults are 3 runs and publishing the report.
