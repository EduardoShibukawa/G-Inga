---
schema: task/1
tier: standard
status: completed
parent: 2026-10-13-skill-health-evaluation
spec: 2026-10-13-skill-health-evaluation@1
depends_on:
  - 2026-10-13-skill-health-evaluation-01-instrument-adr
  - 2026-10-13-skill-health-evaluation-02-trigger-cases
  - 2026-10-13-skill-health-evaluation-03-conformance-cases
---

# Skill Health Baseline Run

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-13-skill-health-evaluation after spec v1 approval)
- reopened: review findings F1–F6 from fresh-context epic review (2026-10-13)

- approved: exception SC2 registration part (which registration fires when project `work` and plugin `g-inga:work` both exist) deferred to phase 2 (3× runs with `--keep-temp` after fixing scaffold contamination) by owner (2026-10-13, "Exceção → fase 2 (Recommended)")

## Objective

Provide one documented command that runs the suite under the USD 5 ceiling, execute the phase 1 baseline once, and record aggregated results in the autoresearch ledger (spec SC2, SC3, SC5, SC6, SC7).

- In scope: a `mise` task, a deterministic post-run classifier (`tools/eval/classify_plugin_eval.ts`), `.gitignore` for raw results, ledger rows in `records/autoresearch-ledger.tsv`, this record.
- Out of scope: editing any skill instruction file (spec SC6); changes to the approved spec or accepted ADRs.

## Acceptance criteria

- AC1 = SC7: a single documented command reruns the suite with `--max-cost-usd 5`; unexecuted cases report `blocked` or `not run`, and a run that ended with an error, a partial suite or a missing run is never `pass` (deterministic classifier, not the CLI `passed` flag).
- AC2 = SC2, SC3: baseline run executed once; per-skill trigger and conformance results recorded.
- AC3 = SC5: ledger rows appended with existing columns, unobserved values marked `absent` or `unsupported` (ADR 0006, ADR 0007); raw results ignored by git, no prompts or transcripts committed.
- AC4 = SC6: skill instruction files and their manifest hashes unchanged versus c039980.
- AC5: evaluation files stay outside the distributed bundle scope.
- AC6 = SC2 (registration part): where both registrations exist, the run records which one (project or plugin) was invoked.
- AC7: the classifier is covered by deterministic tests on small synthetic fixtures (no real transcript).

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | c039980 | parent B1/B2: `mise run validate` exit 0, `mise run test` 227 pass |
| AC1 | `mise run eval:skills` is the single documented command: trigger suite (`--ablation with-without --scaffold --keep-temp`) then conformance suite (`--scaffold --allow-tools Write Edit Bash --ablation none --keep-temp`), both `--runs 1 --no-publish`, total ceiling `SHE_BUDGET_USD` default 5 split sequentially; each suite is classified by `tools/eval/classify_plugin_eval.ts`; a missing or unreadable `trigger/result.json` skips conformance as `not run` | pass | ffe90d2 | not rerun (paid run out of scope for this fix). Task script parses (`bash -n`); the F5 branch (missing result gives an empty spend) checked with `bun -e` on a missing file. Classifier on the existing baseline: trigger `fail` (exit 1), conformance `blocked` (exit 2), no errored run counted as `pass`. Judge cost ($0.0232 in the baseline) is outside the CLI `costUsd` and ceiling, documented in the task comment |
| AC2 | baseline run executed once, per-skill trigger and conformance results recorded, verdicts reclassified by the classifier | pass | ffe90d2 | attempt 2 (`skills-20261013T171724Z`), model `claude-opus-5-5`, CLI 2.1.296, reclassified with no model call. Trigger, with arm: work 4 pass; drive 1 pass, 2 blocked (`drive-should-fire-backlog-drain` and `drive-near-miss-single-task` ended `Reached maximum number of turns`, the first was scored passed by the CLI); orchestrate 2 pass, 1 fail (`orchestrate-should-not-fire-recipe`, answer regex `177` missing). Total 7 pass, 1 fail, 2 blocked, 0 not run; without arm 9 pass, 1 fail. Conformance: 6 pass, 1 blocked (`work-standard-valid-record`, environment-blocked grader `det-validator-accepts-last-run`: git denied in the sandbox, validator exit 2). Separate post-run `check-workspace.sh` on the kept workspace: pass (validator exit 0), observed on 2026-10-13; the temp dir has since been removed, so it can't be rerun. Cost: agent $1.3247 + $1.4011, judge $0.0224 + $0.0008, total $2.75 |
| AC3 | ledger rows appended with existing columns; raw results git-ignored | pass | ffe90d2 | `SHE-BASE-TRIGGER` (`verified_success` fail) and `SHE-BASE-CONFORMANCE` (`verified_success` blocked) rewritten in place, 27 fields each, header unchanged. Trigger tokens `absent` (the trace schema has usage, traces not kept), effort `unsupported` (not in result JSON or trace); `unavailable` removed |
| AC4 | skill instruction files and manifest unchanged versus c039980 | pass | ffe90d2 | `git diff --stat c039980 -- .claude/skills .agents/skills manifest.json` empty |
| AC5 | evaluation files outside the distributed bundle scope | pass | ffe90d2 | `tools/validate/bundle.json` unchanged, no `eval` entry |
| AC6 | SC2 registration part: which registration fired when both exist | blocked | ffe90d2 | no evidence that both `work` (project) and `g-inga:work` (plugin) were listed in the run: the trigger traces were not kept, and the kept conformance trace init lists only `g-inga:*` skills. `work-registration-precedence` invoked `g-inga:work` once and project `work` zero times; a non-conclusive observation, not a precedence result. Needs a rerun with `--keep-temp` whose trace init shows both registrations |
| AC7 | classifier tests on synthetic fixtures | pass | ffe90d2 | `bun test tools/eval/classify_plugin_eval.test.ts`: 12 pass |
| V1 | `mise run validate` after change | pass | ffe90d2 | exit 0, Overall: pass |
| V2 | `mise run test` after change | pass | ffe90d2 | exit 0, typecheck clean, 239 pass 0 fail (227 before plus 12 classifier tests); no timeout of the "this repository" test in this run |

## Outcome

Delivered the `eval:skills` mise task, the `evals/results/` ignore rule, the phase 1 baseline (attempt 2 of 2; attempt 1 failed authentication at $0), and, after the fresh-context review, a deterministic classifier that replaces the CLI `passed` flag as the source of verdicts. Both ledger rows record the reclassified baseline at a total cost of $2.75 against the $5 ceiling. Status is `completed`, not `verified`, because AC6 (SC2 registration part) is `blocked`.

Review findings (fresh-context epic review, 2026-10-13):

- F1 (SC7): two trigger runs that ended with `Reached maximum number of turns` were read as results, one of them as a pass. Fixed: `tools/eval/classify_plugin_eval.ts` maps an errored run, a partial suite or a run without score to `blocked`, and an arm without runs to `not run`; `eval:skills` runs it after each suite. Baseline reclassified (AC2).
- F2 (SC7, SC5): `work-standard-valid-record` is `blocked` in-run (git denied in the sandbox, validator exit 2), passed to the classifier as an environment-blocked grader. `check-workspace.sh` is separate evidence (pass) and the task now runs it automatically on the kept workspace (`<tmp>/sealed/home/cwd`, derived from the run's `tracePath`). The conformance ledger row is `blocked`, not `pass`.
- F3 (SC2): the registration part is `blocked` (AC6). "Plugin registration won" is withdrawn as a fact.
- F4 (SC5): `--keep-temp` added to the trigger suite; ledger markers are now `absent` (tokens) and `unsupported` (effort) per ADR 0006.
- F5 (SC7): conformance does not run when the trigger result is missing or unreadable; judge cost sits outside the CLI ceiling ($0.0232 in the baseline), documented in the task.
- F6 (scope): `claude plugin details g-inga` projects ~242 tok always-on per session (drive ~110, orchestrate ~80, work ~60) and ~3.3k / ~3.6k / ~2.2k tok on invoke. `plugin.json` registers the same `.claude/skills/` directory, whose descriptions are 266 / 173 / 133 chars (~143 tok at 4 chars per token). With the project registration also active, the same three listings appear twice, about 240 extra tok in every session context.

Other findings, unchanged from the baseline:

- Running the eval from a Claude Code session needs the inherited session variables cleared (`ANTHROPIC_BASE_URL`, `CLAUDECODE`, `CLAUDE_CODE_ENTRYPOINT`, `CLAUDE_CODE_CHILD_SESSION`, `CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH`, `CLAUDE_CODE_SIMPLE`), documented in the task comment.
- Premise (a), confirmed: the `Skill` tool input is `{"skill": "g-inga:<name>", "args": "..."}`, so `input_match` `"skill"\s*:\s*"(g-inga:)?<name>"` matches.
- Premise (b), not confirmed: the conformance traces list only `g-inga:*` skills; whether the sandbox lists the project copy at all is open.
- `drive-near-miss-single-task` fails without the plugin and is blocked (max turns) with it, which points to the case budget or rubric rather than the `drive` skill.
- `orchestrate-should-not-fire-recipe` with arm: trigger correct, answer-quality miss in one run.
- Auth-failed runs score above zero because negative graders pass on an empty trace; the classifier reports them `blocked`.
- `--keep-temp` directories live in `/tmp` and don't survive cleanup: the standard-case workspace was gone hours after the run. Post-run checks must run inside `eval:skills`, which the task now does.

Follow-ups (owner):

- Decide whether the eval sandbox should allow `git`, or the standard case should accept a blocked validator (`evals/conformance/**` not edited here).
- The trigger scaffold copies the project `work` skill into the without-plugin arm too, contaminating the baseline arm; fix the scaffold (`evals/triggers/**` not edited here).
- Phase 2: rerun `--runs 3` with `--keep-temp` on both suites before reading the orchestrate recipe miss, the drive max-turns blocks or registration precedence as stable, and to capture trigger tokens.
- Raise `max_turns` or review the rubric of the drive trigger cases.

## Checkpoint

- as of: 2026-10-13, branch docs/skill-health-evaluation, head 311732f, worktree dirty (tools/eval/classify_plugin_eval.ts, tools/eval/classify_plugin_eval.test.ts, mise.toml, records/autoresearch-ledger.tsv, this record)
- done: F1–F6 resolved without a paid run; baseline reclassified
- next: orchestrator gate, then commit and refresh `Ref` from `worktree` to the commit SHA
- open: AC6 blocked until a rerun keeps traces showing both registrations
