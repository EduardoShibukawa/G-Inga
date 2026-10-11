---
schema: task/1
tier: standard
status: verified
parent: 2026-10-11-minimal-v1-specification
spec: 2026-10-11-minimal-v1-specification@1
depends_on:
  - 2026-10-11-minimal-v1-specification-01-work-skill
verified_at: "9b7ebb5"
---

# Implement Standalone Validator and SHA-256 Integrity Manifest

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-11-minimal-v1-specification)

## Objective

Build the standalone zero-install runtime validator (`tools/validate/validate.js`) compatible with Node 22+ and Bun, and implement the accidental drift detection manifest (`manifest.json` and `tools/validate/manifest.mjs`), satisfying specification criteria SC4 and SC5.

- In scope: Node 22 / Bun zero-install standalone validator script, exit code contract (0 pass, 1 fail, 2 blocked), manifest generator and preflight integrity checking, dual-role coexistence preservation.
- Out of scope: CI workflow definition, update script, target repository installation tests.

## Acceptance criteria

- AC1: Standalone validator runs offline on Node 22 and Bun with zero external `node_modules` required (SC1, SC4).
- AC2: Exit code contracts hold deterministically: 0 for all pass, 1 for fail, 2 for blocked (SC4).
- AC3: Manifest `manifest.json` covers bundle files (`.claude/skills/work/**`, `tools/validate/validate.js`) with SHA-256 hashes, excluding itself (SC5).
- AC4: Manifest checking detects accidental file tampering or drift (SC5).
- AC5: Repository development validator (`tools/validate/main.ts`) and test suites remain untouched and functional.
- AC6: Both documented CLI paths, `node tools/validate/validate.js` and `bun tools/validate/validate.ts`, exist in the bundle and run the same validator (SC4).
- AC7: `manifest.json` names a canonical commit whose tree holds every listed asset with the listed hash, and that commit is in the branch history (SC5).

## Plan

1. Adapt `history.ts` git runner to use `node:child_process` with Bun fallback.
2. Build `tools/validate/standalone.ts` bundling contract rules, history walks, and manifest preflight.
3. Generate standalone `tools/validate/validate.js` using bun build targeting node.
4. Implement manifest generator `tools/validate/manifest.mjs` and emit `manifest.json`.
5. Verify exit codes (0, 1, 2) and manifest drift detection.

## Verification

Rows below reran at 9b7ebb5. The rows recorded at 5faf6af (all `pass`) are in Git history; that run's AC5 claim was wrong: `tsc --noEmit` failed on `tools/validate/standalone.ts`.

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation suite | pass | c8067d8 | `mise run validate` (exit 0), recorded before the first implementation |
| B2 | remediation baseline: `mise run test` | fail | 5d38ae3 | `tsc --noEmit`: 5 errors in tools/validate/standalone.ts; same failure as CI run 38142286827 |
| AC1 | installed bundle runs offline on Node 22 and Bun without node_modules | pass | 9b7ebb5 | `tools/validate/bundle.test.ts` runtime matrix: Node v22.22.0 and Bun 1.4.2, clean target repos in the OS temp dir, run under `unshare -rn` (no network namespace); static check: only `node:` built-ins, no network module |
| AC2 | exit codes 0, 1, 2 | pass | 9b7ebb5 | bundle.test.ts per runtime: 0 clean target and valid record; 1 contract violation and altered asset; 2 shallow clone, missing manifest, not a Git repo |
| AC3 | manifest covers the bundle assets and excludes itself | pass | 9b7ebb5 | 8 assets from tools/validate/bundle.json; `manifest.json` never listed; paths outside the scope fail |
| AC4 | accidental drift detected | pass | 9b7ebb5 | bundle.test.ts: altered SKILL.md gives `manifest-integrity fail`, exit 1, under Node and Bun |
| AC5 | development validator untouched and functional | pass | 9b7ebb5 | `tools/validate/main.ts` and its checks unchanged; `mise run validate` exit 0 |
| AC6 | both CLI paths exist and work | pass | 9b7ebb5 | `node tools/validate/validate.js` and `bun tools/validate/validate.ts` exit 0 on this repo; bundle.test.ts runs both in targets |
| AC7 | manifest canonical commit provenance | pass | 9b7ebb5 | `bun tools/validate/manifest.mjs --check` pass: commit ba5ebe5 holds the 8 assets with the listed hashes and is an ancestor of HEAD |
| R1 | repository test suite | pass | 9b7ebb5 | `G_INGA_REQUIRE_RUNTIMES=1 mise run test`: type-check clean, 107 pass, 0 fail |
| R2 | repository validation suite | pass | 9b7ebb5 | `mise run validate` exit 0 |
| R3 | validate.js is the current build of standalone.ts | pass | 9b7ebb5 | bundle.test.ts rebuilds with `bun build --target=node` and compares SHA-256 |
| V1 | diff read against SC4, SC5 and AC1–AC7 | pass | 9b7ebb5 | self-review by the implementing session, not a fresh-context review |

## Checkpoint

- as of: 2026-10-11, branch feat/v1-work-self-hosting, head aa9e38c, worktree clean
- done: rows rerun at 9b7ebb5; status verified
- next: none for this child; remote CI on the pushed head is tracked in the parent

## Outcome

Delivered the standalone validator (`tools/validate/validate.js`, built from `standalone.ts` by `bun run build:validator`), its Bun entry `tools/validate/validate.ts`, the bundle definition `tools/validate/bundle.json`, and `manifest.json` generated and checked by `tools/validate/manifest.mjs` under the two-commit protocol in [bundle](../docs/bundle.md). Remediation commits: 586a056 (type-check, CLI path, per-check report, missing manifest blocked), ba5ebe5 (manifest provenance, tests), 4c9ac0d (manifest regenerated). The first verification at 5faf6af was wrong about AC5 and is superseded by the rows above.
