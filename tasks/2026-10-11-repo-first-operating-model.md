---
schema: task/1
tier: standard
status: active
---

# Repository-First Operating Model and V1 Readiness

## Routing and approvals

- tier: standard (documentation, governance reconciliation, repository-first protocol, and implementation-readiness analysis)

## Objective

Establish the G-Ingá repository as the sole source of truth for project state, decisions, specifications, tasks, evidence, research provenance, and session continuity. Audit and reconcile documentation and task records, establish the repository-first working protocol, investigate the validator coexistence architecture, and prepare for V1 implementation without implementing product features.

- In scope: baseline audit (PR #10 status, commit 9cec3e6), documentation reconciliation (README.md, CLAUDE.md, docs/README.md, docs/decision-map.md, ADR 0005, tasks/2026-10-11-minimal-v1-specification.md), repository-first working protocol definition, validator dual-role coexistence architecture investigation, canonical check validation.
- Out of scope: product implementation (no /work skill, no bundle generator, no manifest runner), modification of approved spec body (approved hash sha256:09ff9d3d15f71c9ee832e401edea5c833064c64a317457121b8f6f4f64bc5bab must remain frozen), branch or worktree deletion, direct push or merge to main.

## Acceptance criteria

- AC1: PR #10 verified as integrated into main and recorded as the actual working baseline.
- AC2: Minimal V1 specification status, version, and approved hash verified and unchanged.
- AC3: Stale claims in README.md, CLAUDE.md, decision-map.md, ADR 0005, and parent task record reconciled with actual decisions and approved specification.
- AC4: Repository-first operating protocol documented in CLAUDE.md and README.md with clear session entry, state recording, validation, and handoff rules.
- AC5: Navigation map created in docs/README.md with all links resolving cleanly.
- AC6: Dual-role coexistence between repository tooling (`tools/validate/`) and product runtime validator (`.g-inga/` bundle) investigated and documented without conflation or premature file overwriting.
- AC7: Repository validation suite (`mise run validate`, `mise run test`) executed cleanly with exact results recorded.

## Plan

1. Verify actual baseline on main (`9cec3e6`), PR #10 status, worktrees, and initial check suite.
2. Verify spec approval hash invariance.
3. Update parent task record `tasks/2026-10-11-minimal-v1-specification.md` checkpoint.
4. Reconcile `docs/decision-map.md` and `docs/decisions/0005-native-primitive-mapping.md`.
5. Author `docs/README.md` documentation index.
6. Rewrite `README.md` and `CLAUDE.md` to establish human entry point and repository-first agent protocol.
7. Document validator path investigation findings.
8. Run canonical validation suite and test suite.
9. Commit changes on dedicated branch `docs/repo-first-operating-model` and open draft PR.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation suite on main | pass | 9cec3e6 | `mise run validate` (77 pass, 0 fail) |
| AC1 | PR #10 integration check | pass | 9cec3e6 | gh pr view 10 confirmed MERGED into 9cec3e6 |
| AC2 | spec hash verification | pass | 9cec3e6 | sha256:09ff9d3d15f71c9ee832e401edea5c833064c64a317457121b8f6f4f64bc5bab |
| AC3 | documentation audit & status reconciliation | pass | dd84a5a | README, CLAUDE, decision-map, ADR 0005, parent task updated |
| AC4 | repository-first protocol definition | pass | dd84a5a | CLAUDE.md & README.md |
| AC5 | docs/README.md navigation index | pass | dd84a5a | created, 626 local links verified |
| AC6 | validator coexistence architecture analysis | pass | dd84a5a | documented in section below |
| AC7 | repository validation suite | pass | dd84a5a | `mise run validate` (exit 0) & `mise run test` (77 pass, 0 fail) |
| R1 | local link integrity check | pass | dd84a5a | 626 local references in 32 files pass |
| R2 | external link verification | fail | dd84a5a | `mise run validate:external` (exit 1: 1 broken pre-existing Wikipedia URL in brand-and-roadmap.md:82, 2 unreachable) |
| V1 | diff review against governance constraints | pass | dd84a5a | diff verified; no product code; spec hash unchanged |

## Validator Path Investigation (AC6)

### Context & Finding

The approved Minimal V1 Specification specifies:

- Distribution bundle layout containing `.claude/skills/work/`, `tools/validate/`, and `manifest.json` (SC1, SC5).
- In target repositories, `tools/validate/` houses the standalone zero-install runtime validator (`node tools/validate/validate.js` or `bun tools/validate/validate.ts`) that checks artifact schemas (`tasks/`, `specs/`), transitions, and Git history walks offline (SC4).

However, in the canonical G-Ingá repository itself:

- `tools/validate/` is currently the comprehensive repository development and documentation test harness.
- It contains universal checks (`markdown-lint`, `local-links`, `mermaid`, `external-links`), decision record checks (`decision-records`), artifact contract checks (`artifact-contract-sync`, `artifact-contract-examples`, `artifact-rule-fixtures`, `artifact-records`), test suites (`artifacts.test.ts`, `validate.test.ts`), and preflight scripts.
- It depends on development dependencies (`markdownlint`, `@mermaid-js/mermaid-cli`, `puppeteer`, etc.) and mise/Bun runner tooling.

### Coexistence Architecture

To prevent conflation or overwriting between development tooling and the bundled product validator:

1. **Source of Truth:** In the G-Ingá repository, `tools/validate/` continues to serve as the development test suite and canonical authoring source for validator logic.
2. **Bundle Generation:** The V1 product validator for distribution to target repositories is a build/export artifact. When the bundle is generated/packaged (e.g. into a distribution bundle directory or release tarball), the standalone runtime validator (comprising `artifacts/rules.ts`, `artifacts/records.ts`, `artifacts/history.ts`, and a zero-dependency CLI runner compatible with Node 22 / Bun) is bundled as the standalone script expected by target repositories.
3. **No Target Collision in Canonical Repository:** The canonical G-Ingá repository is itself an authoring environment, not a target repository installation. Target repositories receive only the standalone runtime bundle assets.
4. **Architectural Compatibility:** This design fully conforms to ADR 0005 Alternative A (FU1–FU4) and SC1–SC5 without requiring any modification to the approved V1 specification or approved hash.

## Checkpoint

- as of: 2026-10-11, branch docs/repo-first-operating-model, head dd84a5a, worktree dirty
- done: baseline verified (main at 9cec3e6, PR #10 merged), spec hash verified (sha256:09ff9d3d15f71c9ee832e401edea5c833064c64a317457121b8f6f4f64bc5bab), documentation and task records reconciled, docs/README.md navigation map created, repository-first protocol defined in CLAUDE.md/README.md, validator coexistence architecture investigated, validation and test suite passing cleanly (77 pass, exit 0)
- next: amend or commit updated task record, push branch to origin, and create Draft PR to main
