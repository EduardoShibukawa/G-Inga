# Validator UX redesign (analysis)

**Status:** analysis only, no decisions recorded. Implementation requires an owner-approved spec and, because it touches harness policy and the artifact contract, a `/work heavy` route.

**Prepared:** 2026-10-15 from a read of the active OpenCode sessions on this machine, the existing validator and the artifact contract.

## 1. Scope and sources

Inspected:

- Active sessions stored in `~/.local/share/opencode/opencode.db` for projects `G-Inga` and `gira-g`, including `E6 documentation website via G-Ingá routing`, `Orquestração e drive: task/1 e gate de 5 camadas`, `Integração task 03 prompt-audit-remediation`, `Pendentes para v1`, `Tarefas pendentes para fazer`.
- `tools/validate/artifacts/rules.ts` (snapshot/state checks, `checkVerified`), `tools/validate/artifacts/history.ts` (history walk), `tools/validate/artifacts/records.ts` and `fixtures.ts`.
- `docs/artifact-contracts.md` sections 3.3, 3.4, 4.3, 4.4, 7.1, 8.
- `docs/research/artifact-contract-validator-findings.md` (F1–F14), especially F3 (B row commit versus `verified_at`) and F8 (a past invalid commit fails forever).
- `CLAUDE.md`, `docs/development.md`.

This document records causes, trade-offs and options. It does not change the validator, the contract or any record.

## 2. What the sessions show

| Session | Observed friction | Code path involved |
|---|---|---|
| `E6 documentation website via G-Ingá routing` (gira-g) | Spec approval first committed as hash-only, failed because no parent task existed; draft had to be committed before approval; `approved: spec v1` had to be added to the parent; `## Plan` and `## Review` were required on a heavy parent before the review existed; an older local commit (`1e547e1`) stayed invalid and required rewriting local history/rebase | `checkSpecTransition`, spec approval hash, heavy-parent section checks, history walk |
| `Integração task 03` (G-Inga) | `AC/SC/R/V` rows had to be changed so `Ref == verified_at` (6494ce3); a `B` row's SHA had to be an ancestor; a `V` row and `## Outcome` had to be added; abbreviation had to be checked | `checkVerified` |
| `Orquestração e drive` (G-Inga) | Contract rules discovered only while editing the parent; otherwise clean pass | `checkVerified` |
| all sessions | Full validation took about 78 s, mostly `bun install --frozen-lockfile`, before reaching artifact checks | `mise run validate` setup task |
| all sessions | Historical commits can remain marked invalid even after the working tree is fixed, so repair means rewrite local history | `checkHistory`, F8 |

The common surprise is not that the rules exist, but that six unrelated-looking obligations (quoting, commit equality, ancestry, sections,-hash, approval entry, historical walk) are enforced as `fail` in one pass with short messages.

## 3. Friction taxonomy

1. **Commit-order invariants.** A `verified` record now requires:
   - every `AC`, `SC`, `R`, `V` row with `Ref == verified_at` (`tools/validate/artifacts/rules.ts` lines 217, 228);
   - every `B` row with its own `Ref`, not equal to `verified_at`, and a strict ancestor of it (`merge-base --is-ancestor`);
   - `verified_at` quoted so YAML does not read the SHA as a number.
2. **Immutable historical audit.** `checkHistory` walks every commit that touched `tasks/` or `specs/`. Once a committed record violates a state or snapshot rule, that finding is reported on every later run. Fixing the working tree does not clear it (F8).
3. **Spec approval protocol.** Approval requires the spec to be committed as `draft` first, then as `approved`; `approved_version` and `approved_hash` to match a exact body hash; and a new `approved: spec vN` entry in a heavy parent task in the same or an ancestor commit (`newApproval()`).
4. **Structural sections arrive before their content.** A heavy parent needs `## Plan` and `## Review` as soon as it is authored, even though the review runs later. Empty sections with `skip:` reasons are allowed where the contract permits.
5. **Partial-child ambiguity.** A parent that is `verified`/`accepted` with a `partial` child is reported `blocked`, because section 3.3 and section 4.4 disagree (F1).
6. **Tooling latency and noise.** Preflight, dependency installation and a full universal lint pass run before any artifact check. Exit-code semantics (`2` = blocked/prerequisite) are subtle for iterative work.
7. **SHA comparison precision.** `Ref` and `verified_at` must use compatible forms; an abbreviated commit versus another abbreviation, or a trailing log path, can fail exact comparison (F4).

## 4. Root cause

The validator treats repository state as evidence of causation: `verified_at` is a Git commit, `Ref` is a Git commit, ancestry is proof that the baseline predates the change. That design is strong but creates three coupled costs:

- **Every typo or lifecycle slip becomes permanent history.** Because the gate is committed-state aware, a record that was once invalid keeps failing even after it is repaired.
- **Proof is expensive to produce.** The owner/agent has to stage the right content at the right commits, then coordinate spec, parent task and approval entry so the history walk sees a consistent sequence.
- **The proof is about process, not about code behaviour.** None of the commit-order checks run the checks themselves; they check that someone recorded runs at the right SHAs.

The underlying choice is defensible: G-Ingá is explicitly a *tokens-per-verified-task* harness, and `verified` is meant to be evidence, not a label. But the current UX makes the evidence cost higher than the work for small changes.

## 5. Why each check exists today

| Check | Why it exists | Failure mode if removed naively |
|---|---|---|
| `B` strict ancestor of `verified_at` | Prevents recording a baseline after the change, which would make the baseline meaningless | Baseline rows can be fabricated post hoc |
| Non-`B` rows at `verified_at` | Proves checks ran on the exact version being declared verified | A passing run from an earlier draft can be borrowed for the final commit |
| `verified_at` quoted | YAML parses an all-digit SHA as a number, losing bytes | Records parse with wrong or null SHAs |
| Historical walk and state transitions | Stops an invalid transition from being grandfathered forever; makes the contract time-consistent | Repositories silently carry invalid life-cycle history |
| Spec draft then approved | Forces evidence that approval happened after drafting, with a stable body hash | Approval metadata can be invented in one commit |
| Heavy parent `## Plan` / `## Review` | Keeps one place where intent and review status are visible | Heavy work loses its plan and review record |
| Child non-cancelled must be verified at parent's spec version | Ties integration evidence to the approved contract | Parent can be accepted on stale child evidence |

## 6. Trade-offs of the main proposals

### 6.1 Remove commit-order verification entirely

Gain: much less choreography around `verified_at`, `Ref` and ancestry.

Cost: the validator can no longer tell whether a baseline predates the change or whether checks ran on the final commit. `verified` becomes a claim. This directly weakens the harness's central invariant, and would need either a replacement evidence mechanism or an explicit downgrade of what `verified` means.

### 6.2 Keep commit order, remove historical enforcement (F8)

Gain: repair becomes possible without rewriting history; agents fix the current record and move on. Old mistakes stop blocking new work.

Cost: the contract can no longer audit its own past. Bad transitions that were committed and later patched would remain invisible. For a retrofit or a migrating repository this is an improvement; for the canonical repository it removes a self-hosting check.

### 6.3 Add a two-tier gate: authoring mode and merge mode

Gain: iterative work uses a structural/current-state gate (`validate --authoring`, exit codes focused on the current tree), while CI keeps the full gate including history and commit order. The same rules stay in force where it matters, but local iteration stops failing on process choreography.

Cost: two command surfaces, two documented expectations, and a risk that people run only authoring locally. Needs clear ownership in `docs/development.md`.

### 6.4 Keep the proof but make it repayable

Gain: lower friction without changing guarantees. Examples: canonical full-SHA expansion internally (F4); split `Ref` and log path with a documented separator; `--explain <rule>`; standard error templates with observed, expected and one suggested action; reusable examples in the contract doc.

Cost: still requires the same Git evidence; does not solve historical immutability.

### 6.5 Soften section timing for heavy parents

Gain: lets `## Review` be added when the review actually happens, while keeping a placeholder/`skip:` requirement for early authoring. Less fake content.

Cost: the contract needs a defined lifecycle for those sections; today `## Review` is read as "all findings resolved" at verification. Changing that requires clearer prose and tests.

## 7. Recommendation from this analysis

Do not remove the commit-order rules in one step. The baseline/final-commit distinction is load-bearing. Instead, split the problem:

1. **Keep full history and commit-order gates in CI and pre-commit.** Do not downgrade them in the reference repository.
2. **Add an explicit authoring validation mode** that checks current-state structure and lets work proceed; full `validate` remains required before merge/acceptance and in CI.
3. **Fix the sharp edges that are clearly bugs or documentation gaps:** SHA canonicalization (F4), clearer historical findings with the exact commit and rule, and error templates that name the next action.
4. **Defer a historical-enforcement decision.** Whether every past commit must remain valid is a policy choice (F8) and needs owner confirmation; it should not be changed as a side effect of UX work.

This keeps the integrity guarantees where they matter while giving sessions like E6 and `Integração task 03` a path that does not require rewriting history for a repaired record.

## 8. Open decisions for the owner

1. Should the history walk stay a hard gate on all past commits (F8), or should only the current commit be hard-gated?
2. Do you want an authoring mode that is not accepted by CI, even if that risks skipped full validation?
3. Is `## Review` on a heavy parent allowed to be absent/`skip:` until review actually runs, or must the section exist from authoring?
4. Should the `B` row be allowed to equal `verified_at` for explicitly declared trivial or documentation-only changes?
5. Should spec approval accept one commit when the spec body hash and owner log entry are both present, or is the draft-then-approved sequence essential?

## 9. If implementation is requested

The minimum deliverables for a real change would be:

- A parent task plus spec, because the answer to at least questions 1–3 changes harness policy (H4/H5).
- Changes in `tools/validate/artifacts/rules.ts` and `history.ts`, with fixture coverage in `fixtures.ts`.
- Contract updates in `docs/artifact-contracts.md` and `tools/validate/artifacts/contract.json`.
- ADR entries in `docs/decisions/` for any accepted policy change.
- Updates to `docs/development.md` for command surfaces.
- Test revisions proving old fixtures still pass where the contract changed.

None of those are part of this analysis.
