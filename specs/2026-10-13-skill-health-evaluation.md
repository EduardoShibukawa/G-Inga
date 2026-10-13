---
schema: spec/1
status: draft
version: 1
---

# Skill Health Evaluation

## Problem

G-Ingá ships three model-invoked skills (`work`, `drive`, `orchestrate`) in two host-specific copies: one for Claude Code and one for Antigravity. Their health today is asserted, not measured:

1. **Trigger accuracy is unknown.** No check shows that a skill's `description` makes the host invoke it when it should and leave it alone when it shouldn't. A Claude Code session that has both the project skills and the installed `g-inga` plugin lists every skill twice (`work` and `g-inga:work`), and nothing measures which copy fires or what the duplicate listing costs per turn.
2. **Behavioral conformance is only checked after the fact.** The validator checks the artifacts a session leaves behind, but no repeatable scenario drives a skill and checks the outcome. An example is a `light` request that must persist zero files.
3. **Cross-host parity isn't tracked.** The Claude Code and Antigravity copies differ in all three skills. The owner states the copies are intentionally host-specific, but no inventory separates host adaptation from accidental drift.
4. **The existing autoresearch program measures routing and policies, not skills end to end.** EXP-01 to EXP-07 use deterministic evaluators over scenario sets, and their ledger lacks a skill-level health baseline.

Who is affected: the owner, who can't tell whether a skill edit improved or regressed the harness, and every target repository that consumes the bundle.

Heavy triggers: H1 (choice of evaluation instrument and its relation to autoresearch is an owner call), H3 (spans skills, evaluation tooling, the ledger and decision D7), H5 (multi-session, decomposed into children).

## Expected behavior

1. A repeatable evaluation suite exercises each of the three skills on Claude Code, covering trigger accuracy and behavioral conformance. One documented command runs it, under a hard cost ceiling.
2. Each run reports per-skill results in the canonical vocabulary (`pass`, `fail`, `blocked`, `not run`), with a no-plugin baseline arm so the skill's contribution is visible.
3. Run results are summarized as rows in the existing autoresearch ledger, carrying token and cost metrics, so skill health and prior experiments share one system of record.
4. A parity inventory classifies every difference between the Claude Code and Antigravity copies as either *host adaptation* or *drift*.
5. Phase 1 only measures. Improvements to skill text are proposed later as autoresearch experiments against this baseline.

## Scope

### In scope

- Evaluation cases for `work`, `drive` and `orchestrate` on Claude Code: trigger cases (should fire, should not fire, near miss) and behavioral cases.
- Deterministic graders wherever the outcome is checkable by a script (validator exit codes, file presence under `tasks/` and `specs/`, routing line). Model-graded checks are used only where no deterministic check exists, and are labeled as such.
- Measuring the duplicate-listing effect (project skill and plugin skill both registered).
- A static parity inventory of the two host copies.
- Ledger rows for the baseline run, and a proposed ADR for the instrument choice.

### Out of scope

- Editing any skill instruction file (phase 2, through autoresearch experiments).
- Running behavioral evaluations on Antigravity. Parity there is static inventory only in phase 1.
- Making the suite a required CI merge gate.
- Automated description-optimization loops.

### Non-goals

- Replacing the existing deterministic evaluators or the autoresearch ledger.
- Distributing the evaluation suite to target repositories.

## Acceptance criteria

- **SC1 (Suite coverage):** Each of the three skills has at least one should-fire, one should-not-fire and one near-miss trigger case, and at least two behavioral cases. Every case states its expected outcome and its grader type: deterministic or model-graded.
- **SC2 (Trigger baseline):** One baseline run records per-skill trigger accuracy, with a with-plugin/without-plugin comparison. Where both registrations exist, it also records which registration (project or plugin) was invoked.
- **SC3 (Conformance baseline):** Behavioral cases include at least: a `light` request persists zero files under `tasks/` and `specs/`; a `standard` request yields a record the validator accepts; a `heavy` request stops for owner confirmation before creating children. Each case's result is recorded.
- **SC4 (Parity inventory):** Every textual difference between the Claude Code and Antigravity copies of the three skills is listed and classified as host adaptation or drift, with a one-line reason. Drift items become follow-up candidates, not fixes.
- **SC5 (Single system of record):** The baseline run appends rows to the autoresearch ledger using its existing columns, including tokens and cost. Prompts, transcripts and secrets are not persisted in the repository (ADR 0006 privacy rules).
- **SC6 (Measurement only):** The skill instruction files and their manifest hashes are byte-identical before and after phase 1.
- **SC7 (Reproducible and bounded):** A single documented command reruns the suite with a hard cost ceiling. A run that hits the ceiling or cannot execute a case reports `blocked` or `not run` for it, never `pass`.
- **SC8 (Instrument decision):** A proposed ADR records the chosen instrument, the alternatives and how it complements the autoresearch program. It is linked from the decision map under D7.

## Interfaces and dependencies

- **Claude Code plugin evaluation (`claude plugin eval`):** native runner for case files with graders. It provides a no-plugin ablation arm, a cost ceiling, a choice of judge model, and JSON output. It runs on the owner's credential and incurs API cost.
- **`skill-creator` skill:** an authoring aid for drafting cases, and the candidate tool for phase 2 description optimization. It is not the phase 1 runner.
- **`/skill-doctor`:** its availability in the owner's Claude Code version is unverified. Child 01 checks it, and it is used only if present.
- **Autoresearch ledger:** consumed as-is. No column changes in phase 1.
- **Validator:** used as a deterministic grader. Its interface is unchanged.
- **Plugin manifest:** the suite lives in the plugin's evaluation directory. It must stay outside the distributed bundle scope.
- **Antigravity:** not exercised at runtime in phase 1.

## Decisions

- decided: relation to autoresearch → complement, one system of record (the ledger) by owner (2026-10-13, "Complementar (Recommended)")
- decided: Claude Code and Antigravity copies are intentionally host-specific; evaluation checks behavioral equivalence, not byte equality, by owner (2026-10-13, "Um é para o Claude outro para o Antigravity")
- decided: phase 1 covers all three skills by owner (2026-10-13, "As 3 skills (Recommended)")
- Runner: `claude plugin eval` over `skill-creator` scripts and custom harnesses. It is native to the host, has built-in ablation and cost ceilings, and is case-based, which matches the scenario-set style of autoresearch. Alternatives: extend `tools/eval` with live model runs, which duplicates the runner; or use `skill-creator` benchmarking alone, which is description-centric and has no conformance grading. The choice is recorded as a proposed ADR (SC8); the owner accepts or rejects it.
- This epic extends decision D7 (evaluation approach) and doesn't reopen it.

## Risks and constraints

- **Cost:** every case is a full agent run on the owner's credential. Mitigation: a hard cost ceiling per run, low concurrency, and a cheap judge model by default.
- **Non-determinism:** model behavior varies between runs. Mitigation: deterministic graders first, and repeated runs where variance matters, with the variance reported. A single run is never treated as proof of a regression.
- **Privacy:** raw run output contains prompts and transcripts. It stays out of version control, and only aggregated ledger rows are committed (ADR 0006).
- **Bundle scope:** the evaluation directory must not enter the distributed bundle or the manifest scope.
- **Trust prompt:** the first evaluation run asks for plugin-trust confirmation. The owner runs or approves that step.
- Protected actions: none planned.

## Verification

- Integrated regression: `mise run validate` and `mise run test` pass at the final head.
- End-to-end: the SC1–SC8 rows run on the parent task at `verified_at`. SC2, SC3 and SC7 need one live baseline run.
- SC6: compare the skill bundle hashes in the manifest against the base commit.
- Review focus: grader honesty (no model-graded check posing as deterministic, no `pass` on a skipped case), privacy of persisted results, and bundle-scope leakage.

## Rollback

skip: no one-way door. The suite, the inventory and the ledger rows are additive and can be removed by reverting the commits. Skill files are untouched (SC6).

## Open questions

1. What cost ceiling applies per baseline run, in USD? Proposed default: 5.
2. Should the baseline run repeat each case (for example 3×) to report variance, or run once in phase 1?

## Revisions

- v1: initial draft.
