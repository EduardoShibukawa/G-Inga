# /work Procedure — G-Ingá SDLC Harness

Procedure for deliverables. Dispatches across `light`, `standard`, and `heavy` tiers and handles resumption (ADR 0010).

- **Who reads it:** the owner's `/work` session, and each worker that `/drive` or `/orchestrate` dispatches. A worker's request is its dispatched task. Workers never invoke the `work` skill.
- **After compaction:** if no routing line for the current request is in context, reread this file before the next edit.

## Invariants

1. Print routing line first: `tier: <tier> (<signals>)`.
2. `light` persists ZERO files under `tasks/` or `specs/`; outputs concise terminal report with evidence.
3. `standard` and `heavy` persist contract-compliant artifacts under `tasks/` and `specs/` (`references/artifact-contracts.md`, relative to this skill's directory).
4. Guarded transitions (`verified`, `accepted`, spec approvals) require running validator (`node tools/validate/validate.js` or `bun tools/validate/validate.ts`).
5. Check failures (`fail` exit 1, `blocked` exit 2) block `verified` or `accepted`.

## Routing Rules (ADR 0002)

Evaluate S1–S8:

- **S1 (Intent):** Checkable criteria without product/preference call?
- **S2 (Approach):** Diff describable in one sentence following existing pattern?
- **S3 (Footprint):** Inside one module without adding/altering consumed public contracts?
- **S4 (Reversibility):** Fully reversible two-way door?
- **S5 (Sensitive):** Security, auth, permissions, secrets, privacy, money, or harness policy?
- **S6 (Baseline):** Relevant check passes before change?
- **S7 (Detectability):** Mistakes caught quickly by existing check?
- **S8 (Scale):** Fits in one session without decomposition?

### Tier Decision

1. **`heavy`** if ANY hold:
   - **H1:** S1 fails (unsettled product/preference call).
   - **H2:** S4 fails (one-way door: migration, deletion, publication).
   - **H3:** S3 fails (consumed contract changes, architecture changes, multiple subsystems).
   - **H4:** S5 holds (sensitive behavior changes).
   - **H5:** S8 fails (multi-session decomposition required).
   - **H6:** S6 fails AND S7 fails (weak baseline and undetected error).
   *Action:* Stop. Read `heavy.md` and `references/question-rounds.md`. Propose heavy to owner and await confirmation.
2. **`light`** if ALL hold: S1, S2, S3, S4, S6 (or non-behavioral prose/formatting), S7, and NOT S5.
   *Action:* Follow light procedure below.
3. **`standard`** otherwise (default when in doubt).
   *Action:* Read `standard.md`.

## Escalation Triggers (ADR 0002 §5)

Stop and escalate immediately (`escalated: <from> → <to> because <E1–E5>: <evidence>`) if:

- **E1:** New evidence breaks `light` or triggers `heavy`.
- **E2:** Diff outgrows one sentence or touches another module.
- **E3:** Verification fails twice without new information (re-plan: circuit breaker halts repeated unproductive retries while preserving useful progress).
- **E4:** Affected check fails in baseline without clear attribution.
- **E5:** Implementation diverges from approved specification.

*Note:* Escalation to `heavy` stops for owner confirmation.

## Verification & Review Auditing

1. **Risk-Calibrated Independent Review:** Trigger an independent reviewer subagent for `heavy` tasks or high-risk changes (cross-module footprint, public contract changes, or sensitive behavior under S5/H4); simple, localized tasks rely on self-review. Dispatch the reviewer as an adversarial reviewer (Opus class) per the host dispatch mapping in `references/model-policy.md`.
2. **Deterministic Verification Audit:** Never assume model or agent consensus equals correctness. Deterministic verification gates (test suites, validators, linters, schemas) strictly override model agreement.

## Concurrency & Token Budgets

Parallel workers run in isolated ephemeral worktrees (`tools/gate/worktree-runner.ts`). Per-tier token ceilings, warning thresholds and loop detection are enforced by `tools/eval/token_budget_guard.ts`, not by this session. ADR 0006 still applies to telemetry: token records never contain prompts, secrets or repository metadata.

## Resume Command

On `resume <task-id>`: read `resume.md`, verify git state vs `## Checkpoint`, reconcile, and resume.

## Session Close and Merge

Applies to every session that delivered work. Do not call work delivered until this section's report shows it on `origin/main`.

1. **Handoff report.** Run `git fetch origin`, then collect:
   - `origin/main`: `git log --oneline <base>..origin/main` (commits landed since the session's base).
   - Local-only commits: `git log --branches --not --remotes --oneline`.
   - Pushed branches without a merged PR: `gh pr list --state open --author @me`, or `git branch -r --no-merged origin/main`.
   - Worktrees: `git worktree list`; for each, unmerged work is commits outside `origin/main` (`git log origin/main..HEAD`) or a dirty tree (`git status --porcelain`).

   ```text
   handoff (fetched <date>, base <sha>)
   origin/main: <N commits since base | none> (<head sha>)
   local-only commits: <none | list> -> pass / fail
   pushed, not merged: <none | branch (PR #n)> -> pass / fail
   worktrees: <path: clean | unmerged work> -> pass / fail
   merge: pass / fail / blocked / not run (<PR #n, head sha>)
   ```

   Local-only commits, unmerged pushed branches or worktrees with unmerged work are `fail`, unless the task is intentionally open; then name it and the next action.
2. **Merge rule.** The agent may merge its own pull request only when every required check passed.
   - Confirm with `gh pr checks <n>`: no `fail`, no `pending`. Never use `--admin`.
   - Do not rely on `--auto` when `main` has no required checks: GitHub then merges at once without waiting for CI. Confirm the checks first.
   - Merge with `gh pr merge <n> --merge` (merge commit), which keeps the SHAs cited in `verified_at`.
   - If the merge is denied (permission or branch protection), report `blocked` and leave the action to the owner.
3. **Verify after merge.** Run `git fetch origin` and `git merge-base --is-ancestor <PR head sha> origin/main`. Exit `0`: `pass`. Otherwise report `fail` and do not declare the work delivered.

## Light Tier Procedure

1. **Routing:** Output `tier: light (S1–S4, S6, S7 hold; S5 doesn't)`.
2. **Inspect:** Check baseline linters/tests.
3. **Execute:** Minimal edits only.
4. **Verify:** Run cheap relevant check and read `git diff`.
5. **Report (`artifact-contracts.md` §6):**

   ```text
   tier: light (<deciding signals>)
   Changed: <file>, <description> (<N> lines)
   Checks:
   - <Check 1>: pass / fail / blocked / not run (<details>)
   - <Check 2>: pass / fail / blocked / not run (<details>)
   ```

6. **Zero persistence:** Do NOT create/edit files under `tasks/` or `specs/`.
