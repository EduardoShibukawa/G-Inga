---
schema: task/1
tier: standard
status: active
parent: 2026-10-11-minimal-v1-specification
spec: 2026-10-11-minimal-v1-specification@1
depends_on:
  - 2026-10-11-minimal-v1-specification-02-validator-and-manifest
  - 2026-10-11-minimal-v1-specification-03-ci-and-update
---

# Artifact Contract Distribution in the Bundle

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-11-minimal-v1-specification; resolves parent review finding A7)
- approved: A7 contract distribution by owner (2026-10-11, "Keep `docs/artifact-contracts.md` as the canonical source in G-Ingá. Include a versioned copy at `.claude/skills/work/references/artifact-contracts.md` in the distributed bundle.")

## Objective

Deliver the artifact contract text to target repositories so the `/work` procedures cite a file the bundle contains (V1 spec SC1), while `docs/artifact-contracts.md` stays the single canonical source in G-Ingá.

- In scope: a versioned copy at `.claude/skills/work/references/artifact-contracts.md`, produced from the canonical file by a documented deterministic transform; a deterministic drift check; the copy listed in `tools/validate/bundle.json` and `manifest.json`; `/work` procedures citing the delivered copy; a committed test that `update.mjs` installs the copy under `.claude/skills/work/references/` and never writes a target's `docs/artifact-contracts.md`; docs/bundle.md updated.
- Out of scope: any change to the contract's content, the approved spec or accepted ADRs; release tags; making the procedures self-contained instead of shipping the contract.

## Acceptance criteria

- AC1: `.claude/skills/work/references/artifact-contracts.md` exists, states its source path and that it is a copy, and equals the documented deterministic transform of `docs/artifact-contracts.md`; `bundle.json` lists it and the manifest covers it (SC1, SC5).
- AC2: Any drift between the copy and the canonical contract fails deterministically in a canonical check, and a committed test proves the failing and passing cases.
- AC3: No file under `.claude/skills/work/` cites `docs/artifact-contracts.md`; the procedures cite `.claude/skills/work/references/artifact-contracts.md`.
- AC4: A committed test proves `update.mjs` installs the copy under `.claude/skills/work/references/` and leaves a pre-existing target `docs/artifact-contracts.md` byte-identical (SC6).
- AC5: docs/bundle.md lists the copy in its contents table and no longer carries the A7 open item; other references to the bundle's contents are current.
- AC6: The manifest is regenerated with the two-commit protocol of docs/bundle.md and `bun tools/validate/manifest.mjs --check` passes.

## Plan

1. Commit and push this record (`active`) before any implementation commit.
2. Add the transform and generator, the copy, the drift check and the tests; update the procedures, `bundle.json`, docs; rebuild `validate.js`; commit (commit C).
3. Run `bun tools/validate/manifest.mjs` at C and commit `manifest.json` alone (commit M); run `--check`.
4. Run the rows at the tested commit and transition to `verified`.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository suites before the change | pass | 74466d9 | `G_INGA_REQUIRE_RUNTIMES=1 mise run test`: 107 pass, 0 fail; `mise run validate`: exit 0 |
| AC1 | copy present, transform documented, listed and hashed | not run | 74466d9 | |
| AC2 | drift fails deterministically | not run | 74466d9 | |
| AC3 | procedures cite the delivered copy | not run | 74466d9 | |
| AC4 | update installs the copy, target docs untouched | not run | 74466d9 | |
| AC5 | docs/bundle.md current | not run | 74466d9 | |
| AC6 | manifest regenerated and proven | not run | 74466d9 | |
| R1 | repository test suite | not run | 74466d9 | |
| R2 | repository validation suite | not run | 74466d9 | |
| V1 | diff read against AC1–AC6 and SC1, SC5, SC6 | not run | 74466d9 | |

## Checkpoint

- as of: 2026-10-11, branch feat/v1-work-self-hosting, head 74466d9, worktree dirty (this record only)
- done: baseline B1
- next: commit and push this record, then implement plan step 2
