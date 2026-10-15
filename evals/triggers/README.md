# Trigger evaluation cases

Trigger cases for the `work`, `drive` and `orchestrate` skills, run by `claude plugin eval` (spec `2026-10-13-skill-health-evaluation@1`, SC1 trigger part and SC2). All prompts are synthetic.

Since ADR 0010 every G-Ingá skill is user-invoked (`disable-model-invocation: true`), so the model cannot invoke `work`, `drive` or `orchestrate`. A model-initiated `Skill` call to any of them is now a defect, not a trigger. The should-fire cases (`work-should-fire-new-deliverable`, `drive-should-fire-backlog-drain`, `orchestrate-should-fire-parallel-tickets`) were therefore retired: trigger accuracy by model invocation no longer applies, and conformance cases type the slash command instead.

## Cases

| Case | Skill | Category | Expected outcome | Graders |
|---|---|---|---|---|
| `work-should-not-fire-unrelated-code` | work | should-not-fire | no `work` call; answer is a Python function | deterministic |
| `work-near-miss-agile-ceremony` | work | near-miss | no `work` call, no routing line; prose explanation | deterministic + model-graded |
| `work-registration-precedence` | work | registration | typed `/work` resolves to one registration; verdicts record project or plugin | deterministic |
| `drive-should-not-fire-shell-question` | drive | should-not-fire | no `drive` call; answer is a `find` command | deterministic |
| `drive-near-miss-single-task` | drive | near-miss | no `drive` call; work stays on one task | deterministic + model-graded |
| `orchestrate-should-not-fire-recipe` | orchestrate | should-not-fire | no `orchestrate` call; answer is 177 | deterministic |
| `orchestrate-near-miss-ooda-theory` | orchestrate | near-miss | no `orchestrate` call; explains the OODA phases | deterministic |

Each `case.yaml` also states its category and grader types in its header comment, `tags` and `expected_outcome`.

## Grader types

- **Deterministic:** `tool_used` and `regex`. `type: llm` is the only model-graded grader. It is judged by `--judge-model` (default `haiku`).
- **Must-not-fire:** `tool_used` with `min: 0`, `max: 0` and `arm: both`. It is scored in both arms. Under ADR 0010 the model can never invoke a G-Ingá skill, so these graders now assert a contract the harness itself enforces rather than measuring a model choice.
- **Registration record (SC2):** `work-registration-precedence` types `/work` (the user-invoked entry) and has two `with-only` indicators, `invoked-plugin-registration` (`g-inga:work`) and `invoked-project-registration` (`work`). In each run, one of the two is expected to pass. The per-run verdicts in the JSON result record which registration the typed command resolved to. The case doesn't assert which one should win, and it is kept only as long as a typed `/work` still shows which registration wins; a paid run confirms this.

## Running

Run from the repository root. Every agent run is billed to the owner's credential, so set a cost ceiling:

```sh
claude plugin eval . --tag trigger --ablation with-without --scaffold --max-cost-usd 5 --no-publish --json <out>.json
```

- `--tag trigger` selects these cases. `--case 'work-*'` filters by name glob.
- `--scaffold` is needed by `work-registration-precedence`, whose `scaffold.sh` copies the project `work` skill into the sandbox. Without it, that case runs with only the plugin registration, and its SC2 record is `not run`.
- `--runs <n>` overrides the per-case `runs: 3`.
- Raw results in `evals/results/` contain prompts and transcripts. They are not committed (ADR 0006).

Free structural check (no agent runs, $0): a zero ceiling still loads and validates every case file and then skips every run. Invalid files are reported as `✗ <path>: invalid case.yaml: ...` and `N case file(s) failed to load`.

```sh
claude plugin eval . --tag trigger --ablation none --no-scaffold --max-cost-usd 0 --no-publish
```

It exits 2 because the ceiling is hit. To validate the cases, check for load errors in the output, not for the exit code.
