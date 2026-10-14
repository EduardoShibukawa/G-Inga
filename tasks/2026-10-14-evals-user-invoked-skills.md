---
schema: task/1
tier: standard
status: todo
---

# Align Evaluation Cases with User-Invoked Skills

## Routing and approvals

- tier: standard (follow-up of 2026-10-14-work-user-invoked, spec SC7; evaluation files only, paid runs need owner approval)

## Objective

Since ADR 0010, every G-Ingá skill is user-invoked. The model can't invoke `work`, `drive` or `orchestrate`, so cases that expect it to do so test behavior the harness forbids.

- In scope:
  - conformance prompts that say "Use the `<skill>` skill": `work-light-zero-persistence`, `work-heavy-stops-for-confirmation`, `work-standard-valid-record`, `drive-dry-run-respects-depends-on`, `drive-no-eligible-no-dispatch`, `orchestrate-collision-serializes-waves` and `orchestrate-draft-spec-no-dispatch` are rewritten to type `/<skill> …`. The `drive` and `orchestrate` cases have had this defect since ADR 0007.
  - trigger cases: `work-should-fire-new-deliverable`, `drive-should-fire-backlog-drain` and `orchestrate-should-fire-parallel-tickets` are reclassified or retired, since model-initiated firing is now a defect. `work-registration-precedence` is kept only if a typed `/work` still shows which registration wins.
  - `evals/triggers/README.md`, `evals/conformance/README.md` and ADR 0008 consequences, where they assume model invocation.
- Out of scope: running the paid suites without owner approval.

## Acceptance criteria

- AC1: no case prompt asks the model to use a G-Ingá skill by name; conformance cases type the slash command.
- AC2: no trigger case scores a model-initiated `Skill` call to a G-Ingá skill as a pass.
- AC3: `mise run validate` and `mise run test` pass.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
