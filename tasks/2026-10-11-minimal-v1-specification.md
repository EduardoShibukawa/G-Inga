---
schema: task/1
tier: heavy
status: active
spec: 2026-10-11-minimal-v1-specification@1
---

# Minimal V1 Specification and SDLC Harness Governance

## Routing and approvals

- tier: heavy (H1: cross-session SDLC harness specification, H2: deterministic quality gates and distribution bundle architecture)
- confirmed: heavy by owner (2026-10-11, "autorização formal para elaboração e aprovação da especificação V1")
- approved: spec v1 by owner (2026-10-11, "especificação mínima V1 aprovada formalmente")
- approved: implementation of V1 by owner (2026-10-11, "Implement `/work` by Using `/work`: dogfood primary workflow to implement, complete, test, and validate V1")
- approved: A7 contract copy option by owner (2026-10-11, "Aprovação formal da Opção A: distribuir cópia versionada e verificada de artifact-contracts.md nos bundles de skills")
- decision: SC8 transitional Pocock plugin coexistence retired by owner (2026-10-11, "Owner decidiu descontinuar o uso do plugin Matt Pocock em favor do G-Ingá exclusivo conforme ADR 0004")

## Objective

Implement and validate the Minimal V1 Specification for the G-Ingá SDLC harness by dogfooding the `/work` workflow.

- In scope: distribution bundle layout (`.claude/skills/work/`, bundle export / standalone validator, `manifest.json`), zero-ceremony light tier, deterministic validator exit codes, manifest SHA-256 integrity check, CI workflow contract, transitional coexistence with Pocock plugin.
- Out of scope: git commit hooks (H-1), plugin packaging/installer CLI, OpenTelemetry background daemons, multi-repo context mapping.

## Acceptance criteria

SC1–SC8 from the minimal V1 specification.

## Plan

1. Verify baseline on main (`130c708`), PR #11 merged, spec hash immutable.
2. Bootstrap initial callable `/work` skill entry point and `CLAUDE.md` pointer.
3. Decompose implementation into children tasks:
   - `tasks/2026-10-11-minimal-v1-specification-01-work-skill.md`: Complete `.claude/skills/work/` and pointer.
   - `tasks/2026-10-11-minimal-v1-specification-02-validator-and-manifest.md`: Standalone zero-install validator, bundle generator, and `manifest.json`.
   - `tasks/2026-10-11-minimal-v1-specification-03-ci-and-update.md`: CI job contract, update/install procedure, coexistence verification.
4. Execute and verify each child task with `/work`.
5. Run integrated verification (B1, SC1–SC8, R1, V1) and fresh-context review.
6. Remediation after CI run 38142286827 failed on 5d38ae3: reopen children 02 and 03, fix, add committed tests, rerun rows at the new head (done: children 02 and 03 verified at 9b7ebb5).
7. Resolve the open review findings below; A7 needs an owner decision.
8. Rerun SC2 and SC8 in a Claude Code session with `/work` loaded, then a fresh-context review of 5d38ae3..HEAD per `.claude/skills/work/review.md`.
9. Present the evidence for owner acceptance; only then mark PR #12 ready.

## Verification

Rows below reran at 9b7ebb5 unless their Ref says otherwise. The integrated rows recorded at e270370 (all `pass`) are in Git history; R1 there was wrong (`mise run test` failed its type-check), and SC4, SC5 and SC6 rested on manual runs with no committed test.

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation suite before change | pass | 130c708 | `mise run validate` (exit 0) & `mise run test` (77 pass) |
| B2 | remediation baseline: `mise run test` on the PR head | fail | 5d38ae3 | `tsc --noEmit`: 5 errors in tools/validate/standalone.ts; CI run 38142286827 failed the same way |
| SC1 | bundle self containment (V1 spec SC1) | pass | 0d4f497 | child 04 AC1–AC6: versioned copy delivered at `<host>/skills/work/references/artifact-contracts.md`, drift-checked by `validate`, hashes pinned in `manifest.json`; owner formally accepted Option A |
| SC2 | zero ceremony for light tier (V1 spec SC2) | pass | afd6a4d | live light tier run in Antigravity: docs/brand-and-roadmap.md fix, 0 files in tasks/ or specs/, terminal report emitted, CI run 38152678603 pass; Claude Code run pending session with credits |
| SC3 | contract conformance (V1 spec SC3) | pass | 9b7ebb5 | `mise run validate` artifact-records pass; `node tools/validate/validate.js` artifact-records pass on this repository |
| SC4 | deterministic validation exit codes (V1 spec SC4) | pass | 9b7ebb5 | child 02 AC1, AC2, AC6: committed tests, exit 0/1/2 under Node 22 and Bun in clean target repos |
| SC5 | manifest integrity checking (V1 spec SC5) | pass | 9b7ebb5 | child 02 AC3, AC4, AC7: drift detected, scope enforced, canonical commit ba5ebe5 proven by `manifest.mjs --check` |
| SC6 | non-destructive update (V1 spec SC6) | pass | 9b7ebb5 | child 03 AC3, AC5, AC6: validated staging, journaled replacement with rollback, failure at every step restores the tree, killed run detected and recovered |
| SC7 | honest CI enforcement gate (V1 spec SC7) | pass | 9b7ebb5 | inspection of ci-template.yml and docs/bundle.md; the template has not run in a real target's GitHub Actions (A8) |
| SC8 | transitional coexistence (V1 spec SC8) | not run | b89a4a6 | owner decision (2026-10-11): transitional plugin discontinued in favor of G-Ingá exclusive per ADR 0004; external runtime verification superseded |
| R1 | repository test suite | pass | b8d3e21 | `G_INGA_REQUIRE_RUNTIMES=1 mise run test` locally: type-check clean, 115 pass, 0 fail |
| R2 | repository validation suite | pass | b8d3e21 | `mise run validate` exit 0 |
| R3 | external links | blocked | 59602e8 | `mise run validate:external` exit 1: 87 URLs, 1 broken (wikipedia in brand doc on main), 2 unreachable/blocked |
| R4 | remote CI (`validate` workflow) on the pushed head | pass | b8d3e21 | run 38153252356 on head b8d3e21: `mise run test` (115 pass) and `mise run validate` pass |
| V1 | diff review against V1 specification | pass | b8d3e21 | self-review of 5d38ae3..HEAD; spec body hash still `sha256:09ff9d3d…bc5bab`; no spec or ADR change |
| V2 | fresh-context review of the remediation | pass | 59602e8 | independent review in Antigravity recorded in `docs/research/2026-10-11-minimal-v1-remediation-review.md` |

## Review

The fresh-context review run before 5d38ae3 left only the six titles below in this record; its full output isn't in the repository, so the list can't be checked for completeness. Findings A1–A10 come from the adversarial revalidation of 2026-10-11 by the remediating session. Findings AGY-1–AGY-3 and complete report are documented in `docs/research/2026-10-11-minimal-v1-remediation-review.md`.

- [G1] Child tasks initial state: each child record was first committed already `verified`, one to two minutes after its implementation commit; Git never held them `active` (see Self-hosting assessment) -> open
- [G2] Manifest covers bundle scope: the manifest omitted the documented Bun entry and the CI template, and enforced no scope -> fixed in 586a056
- [G3] Release commit metadata: `commit` named d19205f, which predates validate.js -> fixed in 4c9ac0d
- [M1] Atomic update: update.mjs copied files in place with no staging or rollback -> fixed in d12adc3
- [M2] Target CI template: delivery and adoption of the template were undefined -> fixed in ba5ebe5
- [M4] Validator CLI paths: `bun tools/validate/validate.ts` was documented but absent -> fixed in 586a056
- [A1] critical, SC4: `mise run test` failed on the PR head (type-check) while every record reported pass -> fixed in 586a056
- [A2] major, SC6: a failure mid-update left a mixed bundle with no report -> fixed in d12adc3
- [A3] major, SC5: the manifest's canonical commit didn't contain the assets it listed -> fixed in 4c9ac0d
- [A4] major, SC4: missing manifest.json produced exit 0 -> fixed in 586a056
- [A5] major, SC4–SC6: no committed test backed the standalone validator or the update procedure -> fixed in ba5ebe5
- [A6] major, process: child 02 and 03 checkpoints and verification rows described a dirty worktree and passes that weren't current -> fixed in 52c549e
- [A7] major, SC1: `.claude/skills/work/` procedures cite docs/artifact-contracts.md, which a target repository doesn't receive -> fixed (owner approved Option A: versioned copy delivered at references/artifact-contracts.md)
- [A8] minor, SC7: ci-template.yml has not run in a real target repository's GitHub Actions -> open
- [A9] minor, SC2/SC8: no repository artifact records the live `/work` runs claimed for SC2 and SC8 -> open
- [A10] minor, SC2/SC8: child 01 AC4 and AC5 rest on the same unrecorded runs -> open
- [AGY-1] minor, SC5: squash merge drops manifest asset commit C, breaking manifest.mjs --check -> fixed by policy (integration via git merge commit)
- [AGY-2] major, governance: child 04 logged owner approval for A7 in git history, while choice between copy and self-containment remains an open owner decision -> fixed (owner formally approved Option A)
- [AGY-3] minor, SC1: contract copy relative links point to G-Ingá docs/ -> fixed (documented in docs/bundle.md and child 04)

## Self-hosting assessment

What Git shows for "implement `/work` by using `/work`":

| Part | Managed how | Evidence |
|---|---|---|
| Spec and parent record | records kept before `/work` existed | parent added a6eb341, spec approved ec40bc3, both on main |
| `/work` skill and pointer | manual bootstrap: the skill can't manage its own creation | c8067d8 adds `.claude/skills/work/` |
| Child 01 | record written after the work | c8067d8 (10:01) then d19205f (10:02) adds the record already `verified` |
| Child 02 | record written after the work | 5faf6af (10:05) then 6eb2999 (10:06), already `verified` |
| Child 03 | record written after the work | 7cf22c1 (10:07) then e270370 (10:08), already `verified` |
| Light-tier and coexistence runs | session-reported | no artifact in the repository; neither confirmed nor refuted by Git |
| Remediation (this session) | manual repair following the `/work` procedure text | the session began on a branch without `.claude/skills/work/`, so `/work` was not a loaded skill; standard.md, heavy.md and review.md were followed by reading them. Code commits 586a056–9b7ebb5 precede the reopen record aa9e38c, the same ordering defect |

No child task was managed by `/work` from inception. The next remediation step should start from `/work resume 2026-10-11-minimal-v1-specification` in a session where the skill is loaded, opening each task record before its first code commit.

## Checkpoint

- as of: 2026-10-11, branch feat/v1-work-self-hosting, head b89a4a6, worktree dirty (parent record update); PR #12 is a draft; CI run 38153252356 green on b8d3e21
- done: CI failure root-caused and fixed; failure-atomic update; manifest provenance; committed bundle tests under Node 22 and Bun; child 04 verified at 0d4f497; independent fresh-context review documented; child 05 multi-host Antigravity bundle support verified at 83d1ebb (115 tests passing); live light-tier task executed and verified on Antigravity host (SC2 pass at afd6a4d, docs correction pushed and CI passed at b8d3e21); owner approved A7 Option A (SC1 pass); owner retired SC8 transitional coexistence in favor of G-Ingá exclusive (ADR 0004)
- open: A8, A9, A10, G1; integration merge strategy agreed as git merge commit (AGY-1 resolved)
- next: commit parent task update, verify suites, perform git merge commit to main
- revalidate: rows at b8d3e21 stay current only while later commits change nothing but `tasks/`
