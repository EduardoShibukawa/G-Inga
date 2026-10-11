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

## Objective

Formalize and approve the Minimal V1 Specification for the G-Ingá SDLC harness and consolidate pending architectural decisions.

- In scope: minimal V1 specification document, D5/ADR 0005 formal acceptance, distribution bundle contract, offline validator contract, draft PR preparation.
- Out of scope: implementation of /work skill, distribution bundle assets, runtime installation, code generation, merge to main.

## Acceptance criteria

SC1–SC8 from the minimal V1 specification.

## Plan

1. Author minimal V1 specification draft and establish governance records.
2. Formalize owner approval of V1 specification with frozen SHA-256 hash.
3. Consolidate pending documentation and publish Draft PR on dedicated branch.
4. Decompose implementation into children tasks upon implementation authorization.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation suite before change | pass | 9036fb5 | |
| SC1 | bundle self containment (V1 spec SC1) | not run | | implementation deferred |
| SC2 | zero ceremony for light tier (V1 spec SC2) | not run | | implementation deferred |
| SC3 | contract conformance (V1 spec SC3) | not run | | implementation deferred |
| SC4 | deterministic validation exit codes (V1 spec SC4) | not run | | implementation deferred |
| SC5 | manifest integrity checking (V1 spec SC5) | not run | | implementation deferred |
| SC6 | non-destructive update (V1 spec SC6) | not run | | implementation deferred |
| SC7 | honest CI enforcement gate (V1 spec SC7) | not run | | implementation deferred |
| SC8 | transitional coexistence (V1 spec SC8) | not run | | implementation deferred |
| R1 | repository test suite | not run | | |
| V1 | diff review against V1 specification | not run | | |

## Review

skip: specification phase; review subagent runs upon children implementation

## Checkpoint

- as of: 2026-10-11, branch docs/approve-v1-spec-consolidate-pending-work, head a6eb341, worktree dirty
- done: minimal V1 specification drafted and approved by owner (approved_version: 1, approved_hash: sha256:09ff9d3d15f71c9ee832e401edea5c833064c64a317457121b8f6f4f64bc5bab)
- next: commit approval, run final validations, create draft PR
