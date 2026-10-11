# G-Ingá Autoresearch Program

**Status:** proposed research procedure; not product runtime code.  
**Owner:** G-Ingá project owner.  
**Model default:** Claude Opus 5.5 at `medium` or Gemini 2.5 Flash / Pro at default effort; use higher effort only when the experiment explicitly studies effort or when the owner approves it.

## Mission

Run bounded, reproducible experiments to improve one G-Ingá prompt, routing rule, skill, or workflow at a time. Optimize **verified task quality and safety at a defensible cost**, not token count in isolation.

This is inspired by Karpathy's autoresearch experimental loop: establish a baseline, change a controlled target, run under a defined budget, preserve the independent evaluator, log the result, and keep/discard the candidate. G-Ingá does not import its GPU-training code or assume it has one universal scalar metric.

Reference: <https://github.com/karpathy/autoresearch>

## Required preconditions

Do not run an experiment unless all items below are known:

- A falsifiable hypothesis.
- One allowed target artifact (or a clearly scoped interaction experiment).
- A pinned, read-only scenario/evaluation-set version.
- An accepted evaluation rubric whose criteria will not change during the run.
- A recorded baseline commit and baseline result.
- Pinned model, effort, host CLI version (Claude Code or Antigravity CLI) and relevant settings, where available.
- Run count, time budget and cost ceiling (label hard versus guideline honestly).
- An isolated Git branch/worktree.
- A declared data/privacy policy: local-only by default (in accordance with [ADR 0006](../decisions/0006-usage-observability.md)).

If cost telemetry is missing, do not substitute zeros. Mark that metric unavailable (`absent` or `unsupported` under the 6-state taxonomy) and decide whether a qualitative bounded experiment is still useful.

## Read-only assets during an experiment

The candidate may not alter these within the same experiment:

- D2 routing scenario expected labels and the accepted routing-contract rules ([ADR 0002](../decisions/0002-ceremony-tiers-and-routing.md)).
- D3 artifact schemas, legal state transitions, spec-integrity rules and verification semantics ([ADR 0003](../decisions/0003-minimum-artifact-schemas.md) and [artifact contracts](../artifact-contracts.md)).
- Critical permission/security gates.
- The evaluator implementation or acceptance rubric.
- Existing baseline results or experiment records.
- Approved user requirements or specs ([specs/2026-10-11-minimal-v1-specification.md](../../specs/2026-10-11-minimal-v1-specification.md)).

An improvement to an evaluator is a separate change, requiring review, a new evaluator version and a fresh baseline. The evaluator is not allowed to grade itself by changing its expected answers.

## Experiment loop

1. Confirm the hypothesis and target boundary with the owner.
2. Inspect the current baseline and verify the working tree/branch are safe to use.
3. Run the baseline on the frozen scenarios; record exact outcomes.
4. Change only the allowed target and record the diff/commit.
5. Run all scenarios and repetitions within the ceiling.
6. Record every run, including crashes, timeouts, skipped tests and unavailable metrics (using [`tools/eval/collect_usage.ts`](../../tools/eval/collect_usage.ts) for sanitized multi-host telemetry).
7. Compare quality, critical misses, cost/time, rework/interventions and complexity.
8. Decide `keep`, `discard`, `crash` or `inconclusive` according to the predeclared rule.
9. Keep the candidate on the experiment branch only. Do not merge or promote it automatically.
10. Present evidence and ask the owner whether to accept the candidate. A rejected experiment remains useful evidence; preserve the record.

## Safety and budget

- No production actions or external mutations.
- No unapproved push, merge, release, issue creation or telemetry publication.
- Never change hard permissions or security policy to increase experiment throughput.
- Stop when the hard ceiling is reached. Do not create subagents to bypass budget.
- Do not include employer code, secrets, raw private prompts/transcripts, or identifying repository details in the public G-Ingá repo.
- Repeat stochastic evaluations and compare rates/distributions, not one lucky run.
- Simplicity matters: equal-quality simpler prompts/workflows are a positive result.

## Experiment ledger (TSV or JSONL)

Minimum fields:

`experiment_id, date, hypothesis, target_artifact, baseline_commit, candidate_commit, scenario_set_version, model, effort, cli_version, run_id, result, critical_misses, verified_success, tokens_input, tokens_output, cache_read, cache_write, estimated_cost, elapsed_seconds, retries, human_interventions, rework, complexity_delta, status, reason, owner_decision`

For unknown values, use an explicit empty/unavailable marker, never `0` by assumption. One experiment may have multiple run rows; keep per-run data rather than storing only averages.

## Decision rule

A candidate may be **recommended** only if:

1. No mandatory safety/acceptance gate regresses.
2. The gain appears across the agreed repetitions/scenarios or the uncertainty is explicitly reported.
3. The benefit is relevant to the hypothesis (e.g. lower cost per verified task, higher correct-routing rate, less rework).
4. Added complexity and maintenance cost are justified.
5. The evaluation set remained unchanged throughout the experiment.

A candidate is not automatically accepted merely because its mean cost is lower. A material regression in correctness, safety, or verification completeness invalidates a cost-only win.

## First candidate experiments (ideas only)

Choose one after D4 and D7 are accepted (both settled as `accepted` in [docs/decision-map.md](../decision-map.md)):

1. Compare the current router with a shorter router prompt on owner-labelled R01–R17. Main metric: routing agreement; hard guardrail: no under-routing of sensitive or irreversible scenarios. Secondary metrics: task success and context/cost where observable.
2. Compare two `CLAUDE.md` / `GEMINI.md` layouts. Main metric: correct instruction following on fixed cases; secondary: fixed context overhead. Keep all policy semantics equivalent.
3. Compare current recovery instruction against a more explicit “two failures without new information -> re-plan” rule. Main metric: repeated unproductive retries and verified success; guardrail: no premature stop when useful progress is demonstrated.
4. Compare a subagent reviewer trigger policy against self-review only on cases where independent review is allowed. Main metric: defects caught/rework vs extra cost; never assume agent agreement is correctness.

Do not run a broad search over all prompts/skills simultaneously. One experiment should teach us something interpretable.

## Required experiment report

- Hypothesis and why it matters.
- Baseline and candidate commits.
- Exact target changed and what was held constant.
- Scenario IDs and run count.
- Results per run and summary with uncertainty.
- Safety/acceptance gate results.
- Cost/time/rework/human-intervention comparison, including unavailable metrics.
- Complexity and maintenance implications.
- `keep` / `discard` / `crash` / `inconclusive` recommendation.
- Owner decision and next experiment, if any.
