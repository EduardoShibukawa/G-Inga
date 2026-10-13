---
schema: task/1
tier: standard
status: verified
parent: 2026-10-13-skill-health-evaluation
spec: 2026-10-13-skill-health-evaluation@1
depends_on:
  - 2026-10-13-skill-health-evaluation-01-instrument-adr
  - 2026-10-13-skill-health-evaluation-02-trigger-cases
  - 2026-10-13-skill-health-evaluation-03-conformance-cases
verified_at: "d450b11"
---

# Skill Health Baseline Run

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-13-skill-health-evaluation after spec v1 approval)

## Objective

Provide one documented command that runs the suite under the USD 5 ceiling, execute the phase 1 baseline once, and record aggregated results in the autoresearch ledger (spec SC2, SC3, SC5, SC6, SC7).

- In scope: a `mise` task, `.gitignore` for raw results, ledger rows in `records/autoresearch-ledger.tsv`, this record.
- Out of scope: editing any skill instruction file (spec SC6); changes to the approved spec or accepted ADRs.

## Acceptance criteria

- AC1 = SC7: a single documented command reruns the suite with `--max-cost-usd 5`; unexecuted cases report `blocked` or `not run`.
- AC2 = SC2, SC3: baseline run executed once; per-skill trigger and conformance results recorded.
- AC3 = SC5: ledger rows appended with existing columns; raw results ignored by git, no prompts or transcripts committed.
- AC4 = SC6: skill instruction files and their manifest hashes unchanged versus c039980.
- AC5: evaluation files stay outside the distributed bundle scope.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | c039980 | parent B1/B2: `mise run validate` exit 0, `mise run test` 227 pass |
| AC1 | `mise run eval:skills` is the single documented command: trigger suite (`--ablation with-without --scaffold`) then conformance suite (`--scaffold --allow-tools Write Edit Bash --ablation none --keep-temp`), both `--runs 1 --no-publish`, total ceiling `SHE_BUDGET_USD` default 5 split sequentially (trigger 1.5, conformance = 5 − trigger spent − 1.0 headroom for the in-flight run overrun) | pass | d450b11 | ran end to end twice on 2026-10-13: attempt 1 (`skills-20261013T165646Z`) came back as an `auth_failed` partial at $0, reported `blocked`, never `pass`; attempt 2 (`skills-20261013T171724Z`) completed both suites, trigger ceiling $1.50, conformance ceiling $2.68 |
| AC2 | baseline run executed once, per-skill trigger and conformance results recorded | pass | d450b11 | attempt 2, model `claude-opus-5-5`, CLI 2.1.296. Trigger: trigger decisions 10/10 correct; cases 8/10 pass (score 0.90, mean delta −0.05). work 4/4 pass; drive 2/3 (`drive-near-miss-single-task` fail in both arms on model-graded `no-backlog-run`, run hit `max_turns` 3); orchestrate 2/3 (`orchestrate-should-not-fire-recipe` no Skill call, but the `177` answer regex missed in the with arm only, delta −0.5). Conformance: work-light pass, work-heavy pass, drive-dry-run pass, drive-no-eligible pass, orchestrate-draft-spec pass, orchestrate-collision pass, work-standard-valid-record eval score 0.70 (`det-validator-accepts-last-run` fail, see Outcome) and `check-workspace.sh` on its kept workspace pass (validator exit 0). Cost: trigger $1.3247 agent + $0.0224 judge, conformance $1.4011 agent + $0.0008 judge, total $2.75 (attempt 1 $0.00). Conformance tokens: input 82, output 12,454, cache read 831,911, cache write 123,060; trigger tokens unavailable (not in result JSON, traces not kept) |
| AC3 | ledger rows appended with existing columns; raw results git-ignored | pass | d450b11 | `SHE-BASE-TRIGGER` and `SHE-BASE-CONFORMANCE` hold attempt 2 results (attempt 1 rows replaced, no duplicates), header unchanged, every row 27 fields; `git check-ignore -v evals/results/x.json` → `.gitignore:4:evals/results/`; `git status` shows no raw output |
| AC4 | skill instruction files and manifest unchanged versus c039980 | pass | d450b11 | `git diff --stat c039980 -- .claude/skills .agents/skills manifest.json` empty |
| AC5 | evaluation files outside the distributed bundle scope | pass | d450b11 | `tools/validate/bundle.json` scope is `.claude/skills/work/`, `.agents/skills/work/`, `tools/validate/`; no `evals` entry in `bundle.json` or `manifest.json` |
| V1 | `mise run validate` after change | pass | d450b11 | exit 0, Overall: pass |
| V2 | `mise run test` after change | pass | d450b11 | flaky by environment, not a failure of this diff: `validate.test.ts` "this repository" timed out at its 120 s limit in 2 of my runs under load ~4.5 (226 pass, 1 fail); the orchestrator gate reran it 4 times on this diff, 3 with 227 pass. The standalone validator takes 98 s on a clean clone of b7f1009 and 94 s on this worktree, close to the limit |

## Outcome

Delivered the `eval:skills` mise task, the `evals/results/` ignore rule, and the phase 1 baseline (attempt 2 of 2; attempt 1 failed authentication at $0). Both ledger rows record the baseline at a total cost of $2.75 against the $5 ceiling.

Findings:

- Running the eval from a Claude Code session needs the inherited session variables cleared (`ANTHROPIC_BASE_URL`, `CLAUDECODE`, `CLAUDE_CODE_ENTRYPOINT`, `CLAUDE_CODE_CHILD_SESSION`, `CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH`, `CLAUDE_CODE_SIMPLE`). With them set, the nested `claude` reports `loggedIn: false` and every run fails with `auth_failed` at $0. The `eval:skills` comment in `mise.toml` documents the `env -u ...` prefix.
- Premise (a), confirmed: the `Skill` tool input is `{"skill": "g-inga:<name>", "args": "..."}`, so `input_match` `"skill"\s*:\s*"(g-inga:)?<name>"` matches. All three should-fire cases fired the plugin-prefixed skill.
- Premise (b), not confirmed: the conformance workspaces have no `.claude/skills/`, and their traces list only `g-inga:drive`, `g-inga:orchestrate` and `g-inga:work`. In `work-registration-precedence`, whose scaffold copies the project `work` skill, the with arm invoked `g-inga:work` once and project `work` zero times. The trigger run did not keep its traces, so it is still open whether the sandbox lists the project copy at all.
- `work` versus `g-inga:work`: with both available, the plugin registration won in this one run. No double invocation was seen. SC2 records it; one run is not a precedence rule.
- `work-standard-valid-record` scores 0.70 only because `git` is denied inside the eval sandbox ("permission denied: git"). The agent's in-run validator therefore exited 2 (`git blocked: not a Git repository`) both times, and `det-validator-accepts-last-run` failed. The authoritative `check-workspace.sh` on the kept workspace passes. The case measures the sandbox, not the skill, until git is allowed or the grader accepts exit 2.
- `drive-near-miss-single-task` fails in both arms, so the failure does not come from the plugin. The with run hit `max_turns` 3 before finishing. This points to the case budget or the judge rubric rather than the `drive` skill.
- `orchestrate-should-not-fire-recipe` with arm: no `orchestrate` call (trigger correct), but the final message lacked `177`. It is a single run with an answer-quality miss and needs repetitions before it is read as a regression.
- The CLI's `costUsd` excludes judge cost ($0.0232 across both suites), so the ceiling does not count judge calls.
- Auth-failed runs score above zero (0.5, 0.56) because negative graders pass on an empty trace. Read `partial`, `partialReason` and the per-run `error` before reading a score.
- Per-run tokens are not in the result JSON. Trigger tokens need `--keep-temp` on the trigger suite too.

Follow-ups: decide whether the eval sandbox should allow `git` or the standard case should accept a blocked validator. Raise `max_turns` or review the rubric of `drive-near-miss-single-task`. Rerun with `--runs 3` before treating the orchestrate recipe miss or the registration precedence as stable. Consider `--keep-temp` on the trigger suite to confirm premise (b) and capture tokens.
