# Canonical Subagent Prompt Template (`Agent` tool)

When dispatching concurrent workers via parallel `Agent` tool calls, the orchestrator MUST format the prompt using this canonical structure to ensure strict scope confinement, deterministic deliverables, and minimal context return overhead.

---

## 1. Template Structure

Before each dispatch, set the `model` parameter on the `Agent` call by role from the shared table in `.claude/skills/work/references/model-policy.md`: `sonnet` for implementation workers, `haiku` for read-only `Explore` spikes, and `opus` for the retry after a Sonnet worker's first verification failure.

When constructing the `prompt` for each `Agent` call, include the following structured sections:

````markdown
# TASK DISPATCH: Ticket #<ID> — <TITLE>

You are invoked as a G-Ingá Harness Specialist Subagent to execute the micro-delivery of Ticket #<ID>.

## 1. Mission
<Concise, objective, self-contained description of what must be implemented or fixed.>

## 2. Allowed Files (In Scope)
Attention: you are only authorized to create or modify strictly the files listed below. Edits outside this list violate Gate 1 and will result in immediate rollback.
- `<path/to/file/1>`
- `<path/to/file/2>`

## 3. Inherited Constraints & Mandates
- Procedure: read and follow `.claude/skills/work/references/procedure.md` for this delivery. Do not invoke the `work` skill: it is owner-only (ADR 0010).
- Repository is the canonical source of truth: consult `docs/artifact-contracts.md` and decisions in `docs/decisions/`.
- Strict factual vocabulary: report checks using only `pass`, `fail`, `blocked` and `not run`.
- Communication: Code and commits in English; executive reports in Portuguese.
- Never add unauthorized dependencies to `package.json` or remove existing tests.

## 4. Acceptance Criteria & Mandatory Thresholds
The Orchestrator will deterministically run the following gates before accepting your delivery:
- **Gate 1 (Scope):** Only the files in "In Scope" were modified (`git diff --name-only`).
- **Gate 2 (Deterministic Checks):**
  - `<Test or validation command 1>` must return Exit Code 0 (`pass`).
  - `<Test or validation command 2>` must return Exit Code 0 (`pass`).
- **Gate 3 (Thresholds):**
  - Zero linter or formatting errors.
  - `<Additional quantitative criterion, if any>`.

## 5. Return Report Format
Upon completing the work and verifying your changes locally, deliver to the orchestrator, as the final Agent report, a concise message in the exact format:

```text
status: ready_for_gate
ticket: #<ID>
model: <sonnet | opus | haiku>
summary: <1-2 sentence summary of the change made>
modified_files:
  - <path/to/file>
checks_run:
  - <check_name>: pass / fail / blocked (<summarized evidence>)
```

The worker does NOT report token usage: it cannot observe its own. The orchestrator records the model and the ADR 0006 token totals from the host's `Agent` result (fields the host doesn't provide are `not run`), never from the worker's report, and never with prompt content.
````

---

## 2. Example Dispatch Prompt (Real Ticket)

````markdown
# TASK DISPATCH: Ticket #12 — Fix Pagination Offset in Query Parser

You are invoked as a G-Ingá Harness Specialist Subagent to execute the micro-delivery of Ticket #12.

## 1. Mission
Fix the pagination offset calculation in `src/parser/query.ts` to avoid an off-by-one error when the `page=1` parameter.

## 2. Allowed Files (In Scope)
- `src/parser/query.ts`
- `tests/unit/parser/query.test.ts`

## 3. Inherited Constraints & Mandates
- Procedure: read and follow `.claude/skills/work/references/procedure.md` for this delivery. Do not invoke the `work` skill: it is owner-only (ADR 0010).
- Repository is the canonical source of truth: consult `docs/artifact-contracts.md`.
- Strict factual vocabulary: use `pass`, `fail`, `blocked` or `not run`.
- Do not change existing public method signatures.

## 4. Acceptance Criteria & Mandatory Thresholds
- **Gate 1:** Only `src/parser/query.ts` and `tests/unit/parser/query.test.ts` modified.
- **Gate 2:**
  - `mise run validate` returns Exit Code 0 (`pass`).
  - `mise exec -- bun test tests/unit/parser/query.test.ts` returns Exit Code 0 (`pass`).
- **Gate 3:**
  - 100% of new tests pass; zero regressions in the existing suite.

## 5. Return Report Format

```text
status: ready_for_gate
ticket: #12
model: sonnet
summary: Adjusted page index subtraction to 0-based offset; added boundary test for page=1.
modified_files:
  - src/parser/query.ts
  - tests/unit/parser/query.test.ts
checks_run:
  - bun test: pass (6 passed, 0 failed)
```
````
