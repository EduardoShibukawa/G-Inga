---
schema: spec/1
status: approved
version: 1
approved_version: 1
approved_hash: sha256:33bd591c1a91f506f8c5e1cb2295378be5c3e6e1af702c8759dd15dcb179403a
---
# Validator UX redesign and AI-native SDLC alignment

## Problem

The validator's full gate is correct but expensive to satisfy while iterating: commit-order evidence (quoted `verified_at`, `Ref` equality, `B` ancestry), the immutable history walk, and late-arriving heavy-parent sections all land as `fail` in one pass with short messages. Sessions E6 and "Integração task 03" spent more time on process choreography than on the underlying change, and repaired records cannot clear old failures without rewriting history (F8).

At the same time, the SDLC layer has no explicit origin artifact before a `heavy` task starts: the playbook's `intent.md` (problem, outcome, affected users/systems, constraints, open questions) is a cleaner pre-task seed than an approval entry buried in a parent task, and the harness has no defined subagent portfolio or skill explaining the validator flow to agents.

The harness must therefore gain an authoring mode for local iteration while keeping full history and commit-order gates where they matter, plus an intent artifact, phased subagents, and clearer validator UX, without relaxing `baseline/verified_at` invariants.

## Expected behavior

- An `authoring` validation mode checks the current tree's structure and records, runs locally, and does not run the Git history walk or commit-order ancestry checks. Exit codes stay `0/1/2`.
- The full validation mode remains the complete deterministic gate, including Git history and commit-order checks, and is the required gate before merge/acceptance and in CI/pre-commit.
- `verified_at`, `Ref` equality for non-`B` rows, and the strict-ancestor rule for `B` rows remain in full mode unchanged. The baseline/final-commit distinction is not relaxed in either mode.
- Historical findings are not a hard blocker in authoring mode; they remain a hard gate in full mode.
- A heavy task starts from an `intent/1` artifact created by a subagent, preserving the original prompt verbatim. The intent artifact is the source for the derived spec.
- The subagent portfolio ships in phases: validator-guide + researcher first, then reviewer, then verifier. Each subagent has one job and the least tools needed.
- A skill explains the validator flow, authoring/full modes, exit codes, and the next action for each finding to agents.
- Validator messages include observed vs expected and one suggested action. SHA values are canonicalized internally before comparison. An explain mode (`--explain <rule>`) prints a rule's rationale and repair step.
- `## Review` on a heavy parent may be `skip: <reason>` until review runs; it must have resolved findings before `verified`.
- Decision map updated and proposed ADR(s) added for accepted policy changes. New fixtures cover authoring/full modes.

## Scope

In scope:

- Contract and validator changes for authoring/full modes.
- New `intent/1` artifact schema and storage under `intents/`.
- Validator UX: SHA canonicalization, error templates, explain mode.
- Phased subagent definitions and a validator-flow skill.
- Contract updates allowing `skip:` on heavy-parent `## Review` until review.
- Decision map and proposed ADR entries.
- Fixtures covering new modes.
- Backfill an `intent/1` artifact for this task.

Out of scope:

- Removing or weakening commit-order checks in full mode.
- Relaxing `B` strict ancestor or `AC/SC/R/V` at `verified_at`.
- Migrating retired schemas.
- Multi-repo context map, plugin packaging, deployment orchestration.
- Removing historical enforcement from the canonical repository's full gate.

## Acceptance criteria

- SC1: `validate --authoring` (or the documented equivalent) runs only current-state checks and never exits fail solely because of a historical commit.
- SC2: full `validate` keeps history and ancestry checks and fails or blocks on them exactly as before.
- SC3: authoring and full mode share one finding/rule vocabulary; a current-tree finding is identical in both modes.
- SC4: SHA canonicalization prevents abbreviation/log-path mismatches from producing false failures.
- SC5: each validator finding (current-tree) includes observed, expected, and one next action, and `--explain <rule>` documents the rule.
- SC6: heavy parents may keep `## Review: skip: ...` during authoring/execution and still pass snapshot checks; an open finding still blocks `verified`.
- SC7: an `intent/1` artifact round-trips through the validator (parse, rules, history) and preserves the original prompt verbatim.
- SC8: validator-guide and researcher subagents exist with one job and minimal tools; reviewer and verifier are scoped for later phases without implementation claims.
- SC9: skills explaining the validator flow exist and are linked from the contract/development docs.
- SC10: decision map records the policy changes; proposed ADR(s) are present for accepted changes.
- SC11: baseline and verification test suites pass; fixtures for authoring/full modes pass.

## Interfaces and dependencies

- Artifact contract (`docs/artifact-contracts.md`) and its validator copy (`.claude/skills/work/references/artifact-contracts.md`), kept in sync by `contract-copy`.
- Schema registry and versioning scheme (contract §8); a new `intent/1` major family registers there.
- Validator core (`tools/validate/`), fixtures (`tools/validate/artifacts/fixtures.ts`), and check orchestration (`tools/validate/artifacts/checks.ts`, `main.ts`).
- Subagent definitions under `.claude/agents/` and skills under `.claude/skills/`.
- Decision map (`docs/decision-map.md`) and ADR directory (`docs/decisions/`).
- Depends on settled sharpen decisions Q11–Q15 and the owner answers recorded in the parent task.

## Decisions

- Authoring mode is a separate command surface and is not accepted by CI or pre-commit. Full mode remains the gate of record. (Q15 + research §6.3)
- Full mode keeps the history walk and commit-order checks; authoring skips them. Historical enforcement is not softened in the canonical repository's full gate. (Q15; open decision 1 answered: keep in full, skip in authoring)
- The `draft → approved` / reopen sequence is kept; the full gate keeps its existing allowed single-commit squashes. (open decision 5 answered: keep sequence)
- `## Review` may be `skip:` until review runs; it must have no open findings before `verified`. (open decision 3 answered)
- `B` strict ancestor and `AC/SC/R/V` at `verified_at` are not relaxed in either mode. (constraint from task; open decision 4 answered: no equality)
- Intent artifact is a new schema `intent/1` under `intents/`, preserving the original prompt verbatim in an `## Original prompt` section, rather than a task/1 extension or unvalidated markdown. (Q11)
- Subagent rollout is phased: validator-guide + researcher first, then reviewer, then verifier; one job per subagent, least tools. (Q12)
- Intent artifact and subagents are in this spec, not a separate project. (Q13)
- Human authority remains at gates; agents prepare and execute. (Q14)
- Intent artifacts are registered in the schema registry; retired-major freeze rules apply once a newer major exists.
- SHA comparison canonicalizes both sides via `git rev-parse` when possible before exact comparison; mismatches become `blocked` only when history is unavailable, else `fail`.
- Proposed ADRs: [0012](../docs/decisions/0012-authoring-vs-full-validation-modes.md), [0013](../docs/decisions/0013-intent-artifact-and-phased-subagents.md).

## Risks and constraints

- Two command surfaces (authoring/full) may be run in the wrong context. Mitigate by making the default `validate` full and documenting authoring as iterative-only in `docs/development.md`.
- New schema family `intent/1` adds contract surface; migration/freeze rules must keep it versioned.
- `skip:` on `## Review` could hide missing review if not re-checked at `verified`; `checkVerified`/parent guards still require resolved findings.
- Canonicalization must be opt-in by availability; in detached or shallow contexts it degrades to `blocked`, never silently to `pass`.
- Reviewer/verifier phases should not be merged into one subagent (context bloat). Keep them sequential.
- Protected actions still need owner approval; this spec does not authorize merge/release.

## Verification

- Unit/fixture tests for authoring vs full mode exit on identical current-tree findings.
- Fixtures for SHA canonicalization, error template shape, and explain mode (rule list).
- Fixtures for `intent/1` (parse, rules, history).
- Fixtures for `skip:` on heavy-parent `## Review`.
- Validator self-tests (`bun test tools/validate`) and repository validation (`bun run validate`) remain green.
- Run `--external-only` separately (network, already separate).
- Review focus: mode boundary (authoring cannot be used as merge evidence), invariant preservation, and subagent tool least-privilege.

## Rollback

skip: no one-way door; each change is reversible by reverting its child, and the full gate remains the default throughout.

## Open questions

None (all §8 owner questions answered; recorded as `decided:` in the parent task).

## Revisions

- v1: initial draft from sharpen decisions Q11–Q15 and owner answers 2026-10-15.
