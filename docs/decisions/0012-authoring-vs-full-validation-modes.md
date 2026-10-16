# 0012 — Authoring vs full validation modes for the artifact gate

- **Status:** accepted (accepted by project owner 2026-10-16)
- **Date:** 2026-10-15
- **Deciders:** project owner

## Context

The validator's full gate is strong but expensive while iterating: commit-order evidence, the immutable history walk, and heavy-parent section timing all surface as `fail` in one pass. Repaired records cannot clear old findings without rewriting history (F8). At the same time the harness must not weaken the `baseline/verified_at` invariants or the full gate's audit guarantees.

## Decision

Add an explicit authoring validation mode that checks only current-tree structure and records, and keep full validation as the gate of record (before merge/acceptance and in CI/pre-commit). Authoring runs locally and never runs the Git history walk or commit-order ancestry checks; the full gate keeps all of them.

Included sharpenings: canonicalize SHAs internally before comparing `Ref` and `verified_at`; emit error templates with observed, expected, and one suggested action; add an explain mode for rules. Heavy-parent `## Review` may be `skip:` until review runs.

`B` rows stay strict ancestors and `AC/SC/R/V` stay at `verified_at` in both modes.

## Considered options

- Remove commit-order verification entirely: rejected, it removes the baseline/final-commit distinction.
- Keep commit order and remove historical enforcement: deferred; full gate keeps it.
- Soften historical enforcement globally: rejected; authoring skips it, full gate keeps it.

## Consequences

- Two command surfaces; default `validate` remains full. Authoring is documentation-only for iterative work and is not accepted by CI or pre-commit.
- Current-tree findings are identical across modes; only historical/ancestry findings differ by absence.
- No relaxation of `baseline/verified_at` invariants in either mode.
