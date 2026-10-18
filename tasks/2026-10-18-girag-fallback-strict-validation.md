---
schema: task/1
tier: standard
status: blocked
---

# Strict Gira-G Macro Map validation in the slicing evaluator fallback

## Routing and approvals

- tier: standard (S1 holds: the observable compatibility rules can be expressed as a bounded acceptance matrix; S2 fails: inspect both CLI-error handling and direct JSON traversal before choosing the smallest safe change; S3 holds: source and tests are confined to the Gira-G slicing evaluator; S4 holds: the change is reversible and does not publish artifacts)
- approved: standard planning record by owner (2026-10-17, this task-preparation request)

## Objective

Make the direct-index fallback in `tools/eval/evaluate_girag_slicing.ts` accept only a schema version and Macro Map structure that the evaluator has explicitly verified it can consume. Preserve current `schema_version: "1.0.0"` behavior when valid, reject unsupported or malformed input rather than treating it as a usable graph, and apply the same validation when the CLI is unavailable or a CLI attempt fails.

In scope:

- `tools/eval/evaluate_girag_slicing.ts`
- `tools/eval/evaluate_girag_slicing.test.ts`
- Temporary fixtures and test helpers required by those tests, kept local to the existing evaluator test conventions.

Out of scope:

- Supporting integer `schema_version: 2` or changing Gira-G's schema/publication contract.
- Editing Gira-G production code, the versioned-publication specification, ADRs, or its heavy parent task.
- Reworking the evaluator's benchmark methodology, scenario data, metrics, or unrelated CLI behavior.
- Running tests, builds, validators, or other project commands as part of this task record's creation.
- Merging a PR or changing any protected repository settings.

## Blockers

- This record does not itself authorize implementation. The owner must start the task explicitly through the repository workflow before source edits begin.
- Keep integer schema `2` unsupported unless and until the Gira-G producer contract is approved and implemented, and a separately reviewed consumer change explicitly adds and verifies support. The current Gira-G publication spec is `draft`; do not infer approval from its documented decisions or open PRs.
- If inspection shows that existing evaluator result/error types cannot represent malformed JSON, unsupported schema, invalid structure, and absent node distinctly without a consequential public-contract choice, stop and request owner direction rather than silently inventing a new public API.

## Acceptance criteria

1. AC1: A valid Macro Map with `schema_version: "1.0.0"`, array-valued `nodes` and `relationships`, string node `id` values needed by traversal, and string relationship `source_id`/`target_id` values is accepted and the requested focal node/relationships are returned correctly.
2. AC2: Missing, `null`, empty, wrong-type, unknown, and wrong-representation `schema_version` values fail closed. No coercion is used. Integer schema `2` and unknown integer/string versions are rejected.
3. AC3: Malformed JSON, invalid top-level graph structure, invalid traversed node shape, unsupported schema, and a valid supported map with an absent requested node are distinguishable in the evaluator's outcome; malformed/unsupported input is not reported as merely “node not found”.
4. AC4: The schema and structure gate applies identically to direct fallback traversal when the `gira` CLI is unavailable and when an attempted CLI call fails. Neither condition can turn an unsupported or malformed index into success.
5. AC5: Tests for the new matrix use deterministic temporary JSON fixtures and do not require a real external `gira` executable for each unit case. The existing live integration test remains a separate integration check.
6. AC6: Existing benchmark/evaluator behavior unrelated to the fallback remains covered; acceptance tests and self-review show no unrelated scenario-data, metric, or approved-spec changes.

## Plan

1. Re-read the task, the accepted routing/artifact contracts, the current G-Ingá instructions and the linked compatibility proposal on the exact starting SHA.
2. Record baseline rows for the relevant test and repository validation commands before editing, following current repository practice. Capture each command and actual result; do not claim a run that did not occur.
3. Inspect all consumers/callers of `queryGiragSlice` and the current error/result shape. Implement only the minimal schema/structure guard and deterministic test seam required by AC1–AC5.
4. Add the regression matrix for success; missing/null/empty/wrong-type/unknown/wrong-representation schema; malformed JSON; invalid arrays/node/relationship shapes; absent node; CLI unavailable; CLI failure followed by fallback.
5. Run the confirmed canonical test and repository validation commands in the local checkout, record the exact commands, exit codes, logs and tested commit SHA in the verification table.
6. Review the diff strictly against AC1–AC6. Stop for owner direction if any necessary change would alter the external evaluator contract or imply schema-2 support.
7. Prepare a PR for review; do not merge it.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | Relevant evaluator test baseline before edits | not run | | Executor records exact command, SHA, exit status and output before the first edit |
| B2 | Canonical G-Ingá validation baseline before edits | not run | | Executor confirms the current command in `docs/development.md`; do not use results from another SHA |
| AC1 | Valid supported-schema fixture traverses focal node and relationships | not run | | Map to AC1 after implementation |
| AC2 | Schema-version rejection table, including integer schema 2 | not run | | Assert rejection category, not only nonzero exit |
| AC3 | Malformed JSON / invalid shape / unsupported schema / absent node distinctions | not run | | Assert the evaluator outcome and do not conflate categories |
| AC4 | CLI unavailable and CLI attempt failing both reach the same fallback schema gate | not run | | Stub/inject CLI availability/failure deterministically |
| AC5 | Unit regression matrix runs with temporary fixtures without external Gira-G binary | not run | | Keep real CLI integration separate |
| R1 | Canonical evaluator test suite | not run | | Exact command, exit code and logs to be recorded by executor |
| R2 | Canonical repository validation | not run | | Confirm command in current instructions; record exact SHA and result |
| V1 | Read complete diff against AC1–AC6 and check no unrelated files/spec changes | not run | | Record reviewed commit SHA |

## Checkpoint

- as of: 2026-10-17 local date; planning artifact prepared against remote G-Ingá `main` SHA `887f25adfe9c55ccd1d1b80082ac86ecd53d846d`
- done: current source, test, compatibility proposal, routing instructions, artifact contracts and cross-repository spec/task state reviewed remotely
- next: owner starts this task through `/work` in a local checkout; executor revalidates `main`, task contract and all referenced SHAs before any edit
- blockers: owner execution authorization is required; Gira-G schema 2 is explicitly not supported by this task
