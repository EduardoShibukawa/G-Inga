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

## Round 1 experimental results (EXP-01 to EXP-04)

The initial four candidate experiments were executed, measured against frozen scenario suites, and logged in the canonical experiment ledger ([records/autoresearch-ledger.tsv](../../records/autoresearch-ledger.tsv)):

| ID | Hypothesis & target | Baseline & candidate | Scenarios | Primary metrics & outcome | Guardrails & safety gates | Owner decision |
|---|---|---|---|---|---|---|
| EXP-01 / EXP-01-C01 | Categorical routing & compact prompt ([.claude/skills/work/SKILL.md](../../.claude/skills/work/SKILL.md)) | `948e669` / `4da2510` | R01–R17 (`r01-r17-v1`) | 100% agreement (17/17); ~210 tokens (-18.5% chars) saved per `/work` invocation | 0 critical misses; 0 under-routing of sensitive/irreversible tasks | accepted (promoted to V1 bundle in `4da2510`) |
| EXP-02 | Operational prompt layout optimization ([CLAUDE.md](../../CLAUDE.md), [GEMINI.md](../../GEMINI.md)) | `71b1890` / `b4d3197` | Protocol mandates (`protocol-mandates-v1`) | 214 tokens (-31.2% chars) saved per turn; fixed overhead reduced | 100% retention of all 7 operational mandates; pointer block preserved | accepted (promoted to V1 bundle in `8e8f2fe`) |
| EXP-03 | Circuit-breaker recovery policy ("two failures without new info -> re-plan") ([tools/eval/evaluate_circuit_breaker.ts](../../tools/eval/evaluate_circuit_breaker.ts)) | `4a13a82` / `f66db94` | Recovery suite (`circuit-breaker-v1`, 12 scenarios) | 100% unproductive retries eliminated (5 -> 0); 100% verified success on transient/progressive failures | 0 premature stops; 0 critical misses; useful progress preserved | accepted (promoted to V1 bundle in `8e8f2fe`) |
| EXP-04 | Calibrated independent reviewer trigger policy & deterministic audit gate ([tools/eval/evaluate_reviewer_trigger.ts](../../tools/eval/evaluate_reviewer_trigger.ts)) | `f66db94` / `2f62098` | Reviewer trigger suite (`reviewer-trigger-v1`, 14 scenarios) | 100% high-risk defects caught (9/9 vs 0/9 baseline); 14k tokens saved on simple tasks without unneeded reviews | Deterministic audit catches defects under hallucinated agent consensus; 0 false agreement escapes; 0 critical misses | accepted (promoted to V1 bundle in `8e8f2fe`) |

## Round 2 experimental results (EXP-05 and EXP-06)

The Round 2 experiments investigating concurrency scaling and real-time telemetry guardrails were executed, measured against frozen scenario suites, and logged in the canonical experiment ledger ([records/autoresearch-ledger.tsv](../../records/autoresearch-ledger.tsv)):

| ID | Hypothesis & target | Baseline & candidate | Scenarios | Primary metrics & outcome | Guardrails & safety gates | Owner decision |
|---|---|---|---|---|---|---|
| EXP-05 | Dynamic git worktree isolation ([tools/gate/worktree-runner.ts](../../tools/gate/worktree-runner.ts)) | `3213a45` / `77416dd` | Concurrency suite (`worktree-concurrency-v1`, 10 scenarios) | 0 git lock collisions across concurrent subagents; setup overhead ~12ms (well under <500ms SLA); 100% clean merge & cleanup integrity | Zero git state corruption; zero scope leak across task boundaries; clean sandbox execution | accepted (promoted to V1 bundle) |
| EXP-06 | Telemetry token accounting & cost drift calibration ([tools/eval/token_budget_guard.ts](../../tools/eval/token_budget_guard.ts)) | `cacaa07` / `58401b4` | Telemetry suite (`token-budget-v1`, 12 scenarios) | 100% runaway loop detection (3/3); 100% budget adherence across light (<5k), standard (<25k), and heavy (<60k); 0 premature stops | Warning alert triggered at >=80% consumption; strict ADR 0006 privacy sanitization (0 prompt/secret leaks) | accepted (promoted to V1 bundle) |

### EXP-05: Concurrency Batch Optimization & Dynamic Worktree Isolation

- **Target artifact:** Orchestration dispatcher and task graph scheduler (`.agents/skills/orchestrate/` and git worktree isolation harness in `tools/gate/worktree-runner.ts`).
- **Hypothesis:** Dynamic git worktree isolation with batched wave dispatch enables concurrent multi-subagent execution without git index lock collisions or working tree corruption, achieving high-throughput parallel execution while maintaining 100% gate verification.
- **Empirical outcome:** Verified across 10 scenarios in `docs/research/scenarios/worktree-concurrency-v1.json`. Achieved 0 git lock collisions, isolated setup overhead averaging ~12ms (satisfying <500ms SLA), and clean sandbox command execution with automated merge and cleanup. Accepted by owner.

### EXP-06: Telemetry Token Accounting & Cost Drift Calibration

- **Target artifact:** Telemetry collectors and token usage monitors (`tools/eval/token_budget_guard.ts` and multi-host normalizers).
- **Hypothesis:** Real-time multi-host token usage measurement with per-task cost drift calibration prevents session cost overruns in long-running SDLC tasks, detecting context bloat and runaway loops before ceiling overrun.
- **Empirical outcome:** Verified across 12 scenarios in `docs/research/scenarios/token-budget-v1.json`. Achieved 100% detection of runaway repetitive loops (3/3), calibrated warning triggers at 80% consumption, 0 premature stops on complex tasks, and zero privacy leakage under ADR 0006. Accepted by owner.

## Round 3 experimental results (EXP-07)

The Round 3 experiment investigating deterministic architectural context slicing via Gira-G (`gira slice`) against blind full-repo discovery was executed, measured against the frozen scenario suite, and logged in the canonical experiment ledger ([records/autoresearch-ledger.tsv](../../records/autoresearch-ledger.tsv)):

| ID | Hypothesis & target | Baseline & candidate | Scenarios | Primary metrics & outcome | Guardrails & safety gates | Owner decision |
|---|---|---|---|---|---|---|
| EXP-07 | Deterministic architectural context slicing via Gira-G ([tools/eval/evaluate_girag_slicing.ts](../../tools/eval/evaluate_girag_slicing.ts)) | `bd7a882` / `candidate-07` | Slicing suite (`girag-slicing-v1`, 12 scenarios) | 65.8% mean token reduction (well exceeding >= 30% target); 236k tokens saved across 12 tasks; slicing overhead ~15ms (< 500ms SLA) | 100% boundary accuracy (0 boundary misses vs 12 misses in blind discovery); zero out-of-scope hallucinations | proposed (recommended keep) |

### EXP-07: Gira-G Architectural Slicing vs Full Context Exploration

- **Target artifact:** Context extraction harness and architectural slicing evaluator (`tools/eval/evaluate_girag_slicing.ts` and `docs/research/scenarios/girag-slicing-v1.json`).
- **Hypothesis:** Injecting deterministic architectural slices via Gira-G (`gira slice`) into worker contexts reduces input tokens by >= 30% compared to blind full-repo discovery while eliminating 100% of out-of-scope boundary misses on complex multi-component tasks.
- **Empirical outcome:** Verified across 12 multi-component scenarios in `docs/research/scenarios/girag-slicing-v1.json`. Achieved 65.8% mean input token reduction (exceeding the >= 30% target by over 2x), saving 236,430 prompt tokens across the suite. Eliminated 100% of out-of-scope boundary misses (0 misses in Gira-G slices vs 12 misses in blind exploration). Measured average slicing latency of 14.9ms (max 22ms), well within the < 500ms SLA. Recommended `keep`; owner decision `proposed`.

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
