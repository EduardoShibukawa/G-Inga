---
schema: task/1
tier: standard
status: completed
---

# Align Evaluation Cases with User-Invoked Skills

## Routing and approvals

- tier: standard (follow-up of 2026-10-14-work-user-invoked, spec SC7; evaluation files only, paid runs need owner approval)

## Objective

Since ADR 0010, every G-Ingá skill is user-invoked. The model can't invoke `work`, `drive` or `orchestrate`, so cases that expect it to do so test behavior the harness forbids.

- In scope:
  - conformance prompts that say "Use the `<skill>` skill": `work-light-zero-persistence`, `work-heavy-stops-for-confirmation`, `work-standard-valid-record`, `drive-dry-run-respects-depends-on`, `drive-no-eligible-no-dispatch`, `orchestrate-collision-serializes-waves` and `orchestrate-draft-spec-no-dispatch` are rewritten to type `/<skill> …`. The `drive` and `orchestrate` cases have had this defect since ADR 0007.
  - trigger cases: `work-should-fire-new-deliverable`, `drive-should-fire-backlog-drain` and `orchestrate-should-fire-parallel-tickets` are retired, since model-initiated firing is now a defect. `work-registration-precedence` is kept with a typed `/work` prompt.
  - `evals/triggers/README.md`, `evals/conformance/README.md` and ADR 0008 consequences, where they assume model invocation.
- Out of scope: running the paid suites without owner approval.

## Acceptance criteria

- AC1: no case prompt asks the model to use a G-Ingá skill by name; conformance cases type the slash command.
- AC2: no trigger case scores a model-initiated `Skill` call to a G-Ingá skill as a pass.
- AC3: `mise run validate` and `mise run test` pass.

## Plan

1. Baseline B1/B2 at HEAD `d80069c` before edits.
2. Rewrite the seven conformance prompts to type the slash command and drop their `det-skill-fired` graders.
3. Retire the three should-fire trigger cases; retype `work-registration-precedence` to `/work`.
4. Update `evals/triggers/README.md`, `evals/conformance/README.md` and ADR 0008 consequences.
5. Verify AC1–AC3, R1 and V1, then commit the verification update.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | `mise run validate` before edits | pass | d80069c | exit 0, Overall pass (159 files, 0 issues) |
| B2 | `mise run test` before edits | pass | d80069c | exit 0, 253 pass, 0 fail |
| AC1 | grep: no case prompt names a G-Ingá skill | not run | | conformance prompts type `/work`, `/drive`, `/orchestrate` |
| AC2 | grep: no trigger case scores a model-initiated `Skill` call as pass | not run | | should-fire cases retired |
| AC3 | `mise run validate` and `mise run test` | not run | | both exit 0 |
| R1 | `bun tools/validate/validate.ts` | not run | | exit 0 |
| V1 | diff read against AC1–AC3 | not run | | |
