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

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation suite before change | pass | 130c708 | `mise run validate` (exit 0) & `mise run test` (77 pass) |
| SC1 | bundle self containment (V1 spec SC1) | pass | e270370 | standalone validator + procedures require no network or node_modules |
| SC2 | zero ceremony for light tier (V1 spec SC2) | pass | e270370 | live /work test executed without persisting tasks/ or specs/ files |
| SC3 | contract conformance (V1 spec SC3) | pass | e270370 | child records and parent adhere to task/1 schema and state transitions |
| SC4 | deterministic validation exit codes (V1 spec SC4) | pass | e270370 | exit 0, 1, 2 verified across Node 22 and Bun |
| SC5 | manifest integrity checking (V1 spec SC5) | pass | e270370 | SHA-256 manifest preflight detects accidental drift |
| SC6 | non-destructive update (V1 spec SC6) | pass | e270370 | isolated install test preserves user files in tasks/ intact |
| SC7 | honest CI enforcement gate (V1 spec SC7) | pass | e270370 | ci-template.yml disclaims automated merge without required status checks |
| SC8 | transitional coexistence (V1 spec SC8) | pass | e270370 | /work executes in presence of Matt Pocock plugin without collision |
| R1 | repository test suite | pass | e270370 | `mise run test` (77 pass, 0 fail) |
| V1 | diff review against V1 specification | pass | e270370 | all criteria satisfied |

## Review

- [G1] Child tasks initial state: child tasks were authored and verified sequentially under task/1 contract.
- [G2] Manifest covers bundle scope: SHA-256 manifest covers bundled assets.
- [G3] Release commit metadata: canonical commit recorded in manifest.json.
- [M1] Atomic update: update.mjs copies bundle files idempotently and preserves user files.
- [M2] Target CI template: tools/validate/ci-template.yml provided with honest merge gate disclaimers.
- [M4] Validator CLI paths: validate.js supported across Node 22 and Bun.

## Checkpoint

- as of: 2026-10-11, branch feat/v1-work-self-hosting, head e270370, worktree dirty
- done: children tasks 01, 02, and 03 completed and verified; fresh-context review conducted and recorded
- next: commit parent task record, push branch, and open Draft PR to main
