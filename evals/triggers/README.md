# Trigger evaluation cases

Trigger cases for the `work`, `drive` and `orchestrate` skills, run by `claude plugin eval` (spec `2026-10-13-skill-health-evaluation@1`, SC1 trigger part and SC2). All prompts are synthetic.

## Cases

| Case | Skill | Category | Expected outcome | Graders |
|---|---|---|---|---|
| `work-should-fire-new-deliverable` | work | should-fire | `work` fires; trace has a `tier:` routing line | deterministic |
| `work-should-not-fire-unrelated-code` | work | should-not-fire | no `work` call; answer is a Python function | deterministic |
| `work-near-miss-agile-ceremony` | work | near-miss | no `work` call, no routing line; prose explanation | deterministic + model-graded |
| `work-registration-precedence` | work | should-fire, registration | `work` fires; verdicts record project or plugin registration | deterministic |
| `drive-should-fire-backlog-drain` | drive | should-fire | `drive` fires; backlog-level handling | deterministic + model-graded |
| `drive-should-not-fire-shell-question` | drive | should-not-fire | no `drive` call; answer is a `find` command | deterministic |
| `drive-near-miss-single-task` | drive | near-miss | no `drive` call; work stays on one task | deterministic + model-graded |
| `orchestrate-should-fire-parallel-tickets` | orchestrate | should-fire | `orchestrate` fires; gated parallel plan | deterministic + model-graded |
| `orchestrate-should-not-fire-recipe` | orchestrate | should-not-fire | no `orchestrate` call; answer is 177 | deterministic |
| `orchestrate-near-miss-ooda-theory` | orchestrate | near-miss | no `orchestrate` call; explains the OODA phases | deterministic |

Each `case.yaml` also states its category and grader types in its header comment, `tags` and `expected_outcome`.

## Grader types

- **Deterministic:** `tool_used` and `regex`. `type: llm` is the only model-graded grader. It is judged by `--judge-model` (default `haiku`).
- **Trigger indicator:** `tool_used` on `Skill` with `input_match` on the skill name, accepting `work` or `g-inga:work`. With `arm` unset under `--ablation with-without`, it is reported as a plugin-fired indicator and does not count toward the score.
- **Must-not-fire:** `tool_used` with `min: 0`, `max: 0` and `arm: both`. It is scored in both arms.
- **Registration record (SC2):** `work-registration-precedence` has two `with-only` indicators, `invoked-plugin-registration` (`g-inga:work`) and `invoked-project-registration` (`work`). In each run, one of the two is expected to pass. The per-run verdicts in the JSON result record which registration was invoked. The case doesn't assert which one should win.

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
