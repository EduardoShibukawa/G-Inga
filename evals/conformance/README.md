# Conformance cases

Behavioral cases for the `work`, `drive` and `orchestrate` skills, run with `claude plugin eval`. They cover the behavioral part of SC1 and the case design of SC3 in `specs/2026-10-13-skill-health-evaluation.md`.

Each case directory holds a `case.yaml` (schema 1.1: prompt, limits, graders) and a `fixture.sh` scaffold. The scaffold builds a small Git repository in the empty run workspace, so a run never touches this repository. Fixture task and spec records are generated at scaffold time. No fixture record is stored here as Markdown, so the repository validator never scans one.

## Cases

Grader labels: a grader named `det-*` is deterministic (`regex`, `tool_used` or `file_exists`, no model call). A grader named `model-graded-*` is an `llm` grader judged by a model. Model-graded graders appear only where the expected result is a free-form plan that no deterministic check can read.

| Case | Skill | Covers | Expected outcome | Graders |
|---|---|---|---|---|
| `work-light-zero-persistence` | work | SC3 light | Routes to `light`, prints `tier: light (...)`, fixes the README typo, and creates or writes nothing under `tasks/` or `specs/` | deterministic only |
| `work-standard-valid-record` | work | SC3 standard | Routes to `standard` and creates `tasks/2026-10-13-shout-option.md` with the task/1 shape. The agent's last validator run exits 0 | deterministic only |
| `work-heavy-stops-for-confirmation` | work | SC3 heavy | Routes to `heavy` and asks the owner to confirm. Creates no spec, no child task and no code change; at most one proposed parent record | deterministic only (confirmation check is lexical) |
| `drive-dry-run-respects-depends-on` | drive | SC1 | `--dry-run` executes nothing and lists the free task as eligible. It holds back the task whose `depends_on` isn't verified | deterministic + model-graded (dependency verdict) |
| `drive-no-eligible-no-dispatch` | drive | SC1 | Nothing is runnable, so there is no dispatch, no commit and no code change, and the report explains the blocker | deterministic + model-graded (report) |
| `orchestrate-draft-spec-no-dispatch` | orchestrate | SC1 | The parent's spec is `draft`, so there is no decomposition and no dispatch. The response says the spec needs approval | deterministic only (approval mention is lexical) |
| `orchestrate-collision-serializes-waves` | orchestrate | SC1 | Two tasks share `src/greet.js`, so the plan-only request serializes them into separate waves, with no dispatch | deterministic + model-graded (wave verdict) |

Every case also has `det-skill-fired`, a `tool_used: Skill` check that the intended skill ran. Under a two-arm run it's a with-only indicator. Under `--ablation none` it's scored.

### How the standard case reaches the validator

`claude plugin eval` has no custom-code graders. The scaffold therefore copies the real standalone validator (`tools/validate/validate.js`) into the workspace as `tools/validate/validate.real.mjs`. It installs `lib/validator-wrapper.cjs` in front of it as `tools/validate/validate.js`, plus a manifest covering the copy. The wrapper runs the real validator unchanged and appends `validator-exit=<code>` to `.eval/validator-runs.log`. The `det-validator-accepts-last-run` grader reads that log.

That log only proves what the agent's last validator run returned. For an authoritative verdict on the final workspace, keep it with `--keep-temp` and run the post-run check, which needs no model:

```bash
bash evals/conformance/lib/check-workspace.sh <kept-workspace-dir>
```

It prints `pass`, `fail` or `blocked` and exits 0, 1 or 2, like the validator.

## Running

Every run is a paid model call. A run needs these settings:

- `--scaffold`: the cases depend on their `fixture.sh`. Without it each run starts in an empty workspace and the cases are meaningless.
- `--allow-tools Write Edit Bash`: the work cases edit files, and the standard case runs Git and the validator. Granting `Bash` needs the OS sandbox: on Linux, `bubblewrap` and `socat` must be installed, or every run that grants Bash is refused.
- `--ablation none`: these cases measure conformance with the plugin loaded, not the delta against a no-plugin baseline.
- A hard ceiling with `--max-cost-usd`. The first run in this directory may also ask for plugin trust, which the owner answers.

```bash
claude plugin eval . --tag conformance --scaffold --allow-tools Write Edit Bash \
  --ablation none --runs 1 --max-cost-usd <ceiling> --no-publish --keep-temp
```

Results go to `evals/results/<timestamp>/`. They hold prompts and transcripts, so they stay out of version control (ADR 0006).

## Free checks

These checks make no model call:

- `node evals/conformance/lib/selftest.mjs`: builds every scaffold, checks that each fixture passes the standalone validator, and replays each case's deterministic graders against a passing and a failing synthetic run. Model-graded graders are reported as `not run`.
- `claude plugin eval . --tag conformance --max-cost-usd 0 --ablation none --no-publish --output-dir <tmp>`: loads and plans every case and reports load errors. With a $0 ceiling no run starts, so it exits 2 (`partial`).

## Limits

- The scaffold resolves the validator from this checkout (`../../../tools/validate/validate.js` from the case directory). It fails, and the run scores 0 with `scaffold failed`, if the suite is evaluated from a copied plugin.
- `file_exists` sees only files created during the run, so edits to existing records are caught by the `tool_used` checks on `Write` and `Edit`, not by `file_exists`.
- Lexical checks (`confirm`, `approv`, `tier: heavy`) are deterministic but only show that the words appear. Read the transcript before treating a failure there as a regression.
