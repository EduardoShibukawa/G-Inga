# 0008 — Skill evaluation instrument

- **Status:** accepted (accepted by project owner 2026-10-13)
- **Date:** 2026-10-13
- **Deciders:** project owner
- **Depends on:** D7 on the [decision map](../decision-map.md), `accepted` through the [evaluation protocol](../research/d7-evaluation-protocol.md). This record extends D7 for skill health and doesn't reopen it. Constrained by [ADR 0006](0006-usage-observability.md) (privacy boundary, cost semantics) and [ADR 0005](0005-native-primitive-mapping.md) (pinned bundle scope, personal plugin channel FU7), both `accepted`.
- **Spec:** [Skill Health Evaluation](../../specs/2026-10-13-skill-health-evaluation.md) v1, criterion SC8. The spec's Decisions section names the runner; this record states the reasons and the alternatives so the owner can accept or reject it.

## Context

G-Ingá ships three skills (`work`, `drive`, `orchestrate`). When this record was written, `work` was the only model-invoked one ([ADR 0007](0007-harness-extensions-beyond-v1.md)). Since [ADR 0010](0010-user-invoked-entry-skills.md), all three are user-invoked. Their trigger accuracy and behavioral conformance are asserted, not measured. The [autoresearch program](../research/autoresearch-program.md) runs deterministic evaluators over frozen scenario sets (EXP-01 to EXP-07) and records every run in [the ledger](../../records/autoresearch-ledger.tsv), but none of those experiments drives a skill end to end inside the host.

The owner's environment was checked on 2026-10-13 without running any paid evaluation:

| Code | Instrument | Observed evidence | Finding |
|---|---|---|---|
| E1 | `claude plugin eval` | `claude --version` → `2.1.296 (Claude Code)`. `claude plugin --help` lists `eval [options] [target]`. `claude plugin eval --help` documents `--ablation` (`with-without` default when a plugin resolves), `--max-cost-usd` (hard ceiling, exit 2, partial results), `--judge-model` (default `haiku`), `--runs` (default `case.runs ?? 3`), `--json`, `--threshold`, `--trust-plugin`, `--no-publish`, `--case`, `--tag`, `-j/--concurrency` (default 1) and the `init` subcommand. Cases live under `evals/**/case.yaml` or `prompt.md` + `graders/*.md` unless `--eval-dir` or the manifest's `experimental.evals` says otherwise | available |
| E2 | `claude plugin details` | `claude plugin details --help`: "Show a plugin's component inventory and projected token cost" | available; a free static input for the duplicate-listing cost (spec SC2) |
| E3 | `skill-creator` | Listed in this session's skills as `anthropic-skills:skill-creator`; present at `~/.claude/skills/synced/<id>/skill-creator/` (`SKILL.md`, `scripts/`, `agents/`, `eval-viewer/`). Also in the marketplace cache at `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/skill-creator`, but `claude plugin list` shows only `g-inga@g-inga` and `mattpocock-skills@claude-plugins-official` installed | available as a synced skill, not as an installed plugin |
| E4 | `/skill-doctor` | Not in `claude --help` or `claude plugin --help` (only `doctor`, an installation health check). Not among this session's listed skills. The 2.1.296 binary contains the strings "`/skill-doctor` is available in this session." / "is NOT available in this session. It is on by default in current releases" (gated by feature settings) and "skill-doctor moved — skill usage and context costs now live in this Stats tab." | unverified: shipped behind feature settings, not observed as invocable here |

The project plugin's manifest is [`.claude-plugin/plugin.json`](../../.claude-plugin/plugin.json) at the repository root, so the default eval directory for `claude plugin eval .` is the root `evals/`.

## Problem

Choose the instrument that runs the phase 1 suite (spec SC1–SC3, SC7) so that:

- each case drives the real skill inside Claude Code and grades the outcome, deterministically where possible;
- a no-plugin baseline arm shows the skill's contribution;
- every run has a hard cost ceiling and reports `blocked` or `not run`, never `pass`, for a case it couldn't finish;
- results land in the existing ledger as the single system of record (owner decision, 2026-10-13);
- nothing new enters the distributed bundle and no raw prompt or transcript is committed (ADR 0006).

## Options

- **A. `claude plugin eval` as the runner (selected).** Native to the host (E1). Case-based like the autoresearch scenario sets. Built-in ablation arm, hard cost ceiling, cheap default judge, JSON output for ledger aggregation and a threshold exit code. Deterministic graders and model graders are separate, so labeling them is direct. Costs: each case is a full agent run on the owner's credential; the first run asks for plugin trust; the feature is new and has no public docs page yet, so its case format may move.
- **B. Extend `tools/eval` with live model runs.** Keeps one in-repo evaluator family. It would rebuild what A already provides (child process control, ablation, cost ceiling, grading, reports), adds maintenance and new code paths, and still needs the same credential and cost. Rejected as a duplicate runner.
- **C. `skill-creator` benchmarking alone.** Available (E3). Its loop is description-centric: trigger evaluation and description optimization with variance analysis. It has no conformance grading against G-Ingá contracts (validator exit codes, files under `tasks/` and `specs/`), so it can't cover SC3. Rejected as the runner, kept as an aid.

## Decision (proposed)

1. **Runner:** `claude plugin eval` runs the phase 1 suite against this repository's plugin. The documented invocation sets at least `--max-cost-usd 5` (owner decision on the ceiling), `--runs 1` (owner decision: one run per case in phase 1; the CLI default is 3), `--ablation with-without`, `-j 1`, `--no-publish` and a `--json` path outside version control.
2. **Graders:** deterministic graders first (validator exit code, file presence under `tasks/` and `specs/`, the routing line). A model grader is used only where no deterministic check exists, uses the default cheap judge, and is labeled `model-graded` in the case.
3. **`skill-creator`:** an authoring aid for drafting cases in phase 1, and the candidate tool for phase 2 description optimization. It is never the phase 1 runner and its output is never a ledger row by itself.
4. **`/skill-doctor`:** conditional. It is used only if the owner's session shows it as invocable (E4 is unverified). If used, its report is an input to the duplicate-listing measurement, never a pass/fail grader. `claude plugin details` (E2) covers the static projected cost meanwhile.
5. **Trust:** the owner runs or approves the first run's plugin-trust prompt. `--trust-plugin` isn't committed into any script that runs without the owner.

## Relation to autoresearch

Complement, not replacement (owner decision, 2026-10-13). The autoresearch program keeps its deterministic evaluators and frozen scenario sets. This instrument adds the end-to-end skill baseline those experiments lack. The ledger stays the single system of record: each eval run is aggregated into rows with the existing columns (no column changes in phase 1), carrying tokens and estimated cost under ADR 0006 semantics, with `absent` or `unsupported` markers where a value isn't observed. Phase 2 skill-text changes go through autoresearch experiments measured against this baseline, under the program's decision rule.

## Consequences

- **Cost:** every case is a paid agent run, plus the baseline arm and any model grader. The USD 5 ceiling is `hard` (enforced by the CLI); overrun is bounded to the runs in flight, which `-j 1` keeps to one. A run that hits the ceiling reports the unfinished cases as `blocked` or `not run`.
- **Non-determinism:** one run per case is a baseline, not proof of a regression. Variance runs (3×) belong to phase 2, and their dispersion is reported, not only the mean.
- **Privacy (ADR 0006):** the JSON result and the HTML report contain prompts, grader verdicts and transcripts. They stay out of version control: `evals/results/` isn't ignored today (`git check-ignore` finds no rule), so the suite either adds an ignore rule or writes results outside the repository, the report isn't published to claude.ai (`--no-publish`; publishing is the default when the account supports it), and only aggregated ledger rows are committed.
- **Bundle scope:** `evals/` belongs to the personal plugin channel only. It stays outside the pinned bundle and its manifest hashes (ADR 0005), so target repositories never receive it.
- **Instrument stability:** `claude plugin eval` is newer than the project's other tooling and has no public docs page. If its case format changes, the suite is adapted; if it's removed, options B or C are reconsidered under a new record.
- **No change** to the approved spec, D7's status, the validator interface or any skill instruction file (spec SC6).
