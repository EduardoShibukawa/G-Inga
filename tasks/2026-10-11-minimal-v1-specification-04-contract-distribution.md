---
schema: task/1
tier: standard
status: verified
parent: 2026-10-11-minimal-v1-specification
spec: 2026-10-11-minimal-v1-specification@1
depends_on:
  - 2026-10-11-minimal-v1-specification-02-validator-and-manifest
  - 2026-10-11-minimal-v1-specification-03-ci-and-update
verified_at: "0d4f497"
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
| AC1 | copy present, transform documented, listed and hashed | pass | 0d4f497 | artifacts.test.ts: committed copy equals `renderContractCopy(docs/artifact-contracts.md)`; the copy minus its header and link prefix is the canonical text byte for byte; header names the source and says it's a generated copy. `bundle.json` lists it; manifest.json covers 9 files including it; `node tools/validate/validate.js`: manifest-integrity pass, 9 files |
| AC2 | drift fails deterministically | pass | 0d4f497 | `mise run validate` check `artifact-contract-copy` pass on this repository. artifacts.test.ts: canonical edited without regeneration → check `fail`, exit 1; copy edited alone → `fail`; copy deleted → `fail` ("is missing"); regenerated → `pass`; no `.claude/skills/work/` → `not run`. Chosen as a `validate` check (a repository-content invariant, like `artifact-contract-sync`, run by the same CI job) with committed tests for the check itself; the manifest additionally pins the copy's hash |
| AC3 | procedures cite the delivered copy | pass | 0d4f497 | bundle.test.ts: no skill file in the bundle contains `docs/artifact-contracts.md`; SKILL.md, standard.md and resume.md cite `.claude/skills/work/references/artifact-contracts.md` (heavy.md too) |
| AC4 | update installs the copy, target docs untouched | pass | 0d4f497 | bundle.test.ts: `updateBundle` into a target holding its own `docs/artifact-contracts.md` installs the copy byte-identical under `.claude/skills/work/references/`, leaves the target file byte-identical and `git status -- docs` empty, also after an upgrade |
| AC5 | docs/bundle.md current | pass | 0d4f497 | inspection: contents table lists the copy; source-only table lists contract-copy.mjs; the A7 item is gone from `## Open`; docs/development.md documents `artifact-contract-copy`. Other `.claude/skills/work/` mentions (README, ADR 0005, spec, research) name the directory, not its file list, and need no change |
| AC6 | manifest regenerated and proven | pass | 0d4f497 | commit C = 57ac605 (assets), `bun tools/validate/manifest.mjs` at C, commit M = 0d4f497 (manifest.json alone); `bun tools/validate/manifest.mjs --check`: pass |
| R1 | repository test suite | pass | 0d4f497 | `G_INGA_REQUIRE_RUNTIMES=1 mise run test`: type-check clean, 114 pass, 0 fail. At 57ac605 alone, 23 tests that read the source manifest failed as the two-commit protocol expects |
| R2 | repository validation suite | pass | 0d4f497 | `mise run validate` exit 0 |
| V1 | diff read against AC1–AC6 and SC1, SC5, SC6 | pass | 0d4f497 | self-review of 7ddbe07..0d4f497 by the implementing session; limitation: in a target, the copy's relative links point to G-Ingá's `docs/`, which the target doesn't have (stated in the copy's header and docs/bundle.md) |

## Checkpoint

- as of: 2026-10-11, branch feat/v1-work-self-hosting, head 0d4f497, worktree dirty (this record only)
- done: rows run at 0d4f497; status verified
- next: none for this child; the parent records A7 as fixed

## Outcome

Delivered `.claude/skills/work/references/artifact-contracts.md`, a generated copy of the canonical `docs/artifact-contracts.md` (header comment plus relative-link prefix, `tools/validate/contract-copy.mjs`), listed in `bundle.json` and `manifest.json`. `mise run validate` fails on drift (`artifact-contract-copy`). The `/work` procedures cite the delivered copy. Commits: 7ddbe07 (record opened `active`), 57ac605 (implementation, commit C), 0d4f497 (manifest, commit M). Follow-up, not in scope: the copy's links into G-Ingá's `docs/` don't resolve in a target.
