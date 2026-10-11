# Product bundle

**Status:** describes the V1 bundle as implemented on `feat/v1-work-self-hosting` (task [2026-10-11-minimal-v1-specification](../tasks/2026-10-11-minimal-v1-specification.md), `active`). The contract is the [approved V1 spec](../specs/2026-10-11-minimal-v1-specification.md) (SC1, SC4–SC7) and [ADR 0005](decisions/0005-native-primitive-mapping.md) FU1–FU4. Where this page interprets the spec, the interpretation is labeled `proposed` until the owner accepts it.

## Contents

The bundle is what a target repository commits (FU2). `tools/validate/bundle.json` is the single list; `manifest.json` covers exactly that list.

| Path in the target | Role | Delivered | In `manifest.json` |
|---|---|---|---|
| `.claude/skills/work/SKILL.md`, `standard.md`, `heavy.md`, `resume.md`, `review.md` | `/work` skill and its procedures | yes | yes |
| `tools/validate/validate.js` | standalone validator, `node tools/validate/validate.js` | yes | yes |
| `tools/validate/validate.ts` | Bun entry of the same validator, `bun tools/validate/validate.ts` | yes | yes |
| `tools/validate/ci-template.yml` | CI merge-gate template (SC7) | yes | yes |
| `manifest.json` | integrity manifest; excludes itself (SC5) | yes | no |

Not delivered (`proposed` classification, source-repository utilities that run from a G-Ingá checkout):

| Path in G-Ingá | Why it stays in the source |
|---|---|
| `tools/validate/update.mjs` | installs a release from a G-Ingá checkout into a target; a copy in the target would have no source to read from |
| `tools/validate/manifest.mjs` | generates and checks the manifest against G-Ingá's own history |
| `tools/validate/standalone.ts`, `bundle.json` | sources of `validate.js` (`bun run build:validator`) |
| the rest of `tools/validate/` | this repository's development validator ([development](development.md)) |

`validate.js` is built with `bun build --target=node`. It imports only `node:` built-ins, so it runs offline on Node 22 or later or Bun without `node_modules` (SC1, SC4). `tools/validate/bundle.test.ts` checks that the committed file is the current build and runs it in clean target repositories under both runtimes.

## Validator

```sh
node tools/validate/validate.js [--root <dir>]
bun tools/validate/validate.ts [--root <dir>]
```

| Check | `pass` | `fail` | `blocked` | `not run` |
|---|---|---|---|---|
| `manifest-integrity` | every listed file exists and matches its SHA-256 | a file is missing or differs, the manifest is malformed, or it lists a path outside the bundle scope | `manifest.json` is absent | never |
| `artifact-records` | contract rules and the history walk hold | a contract finding | shallow clone, or an ambiguous finding | no task or spec record, now or in history |

Outside a Git repository both checks are `blocked`. Exit codes follow SC4: `0` every executed check passed, `1` a check failed, `2` nothing failed but a check was `blocked`. Treating a missing manifest as `blocked` is a `proposed` reading of SC1 and SC5: the validator ships with its manifest, so its absence is a missing prerequisite, never a pass.

## Manifest

```json
{ "release": "1.0.0", "commit": "<40-hex SHA>", "files": { "<path>": "<sha256 hex>" } }
```

- **`files`:** the SHA-256 of each asset in `bundle.json`. `manifest.json` itself is excluded (SC5).
- **`commit`:** the G-Ingá commit whose tree holds every listed asset with exactly the listed hash. It isn't the commit that contains `manifest.json`: a file can't name the commit that contains it. The protocol uses two commits:
  1. commit the bundle assets (commit C);
  2. at C, with those assets unmodified, run `bun tools/validate/manifest.mjs`. It hashes the committed blobs of C, refuses a dirty or uncommitted asset and writes `commit: C`. Commit `manifest.json` alone (commit M, a child of C).
- **Proof:** `bun tools/validate/manifest.mjs --check` (also a test in `mise run test`) passes only when C exists, is `HEAD` or an ancestor of it, and its blobs, the working tree and the manifest agree for exactly the listed assets. It is `blocked` in a shallow clone. A squash merge that drops C from history fails it; merge with a merge commit, or regenerate the manifest after the merge.
- **`release`:** the bundle version label from `bundle.json`. No Git tag exists for it yet. FU3 says updates go to "a new release tag"; creating tags is an owner action and is `open`.
- **Security boundary:** the manifest detects accidental drift, not deliberate tampering by someone who can also rewrite the manifest (SC5).

## Adopting the bundle in a target repository

From a G-Ingá checkout at the release to install:

```sh
node tools/validate/update.mjs /path/to/target      # or: bun tools/validate/update.mjs …
```

Then, in the target:

1. Copy `tools/validate/ci-template.yml` to `.github/workflows/g-inga.yml`. That copy belongs to the target; the update procedure never writes it. Re-copy it when a release changes the template.
2. Add the delimited pointer to the target's `CLAUDE.md` (spec "Host Interfaces"), leaving content outside the block untouched:

   ```markdown
   <!-- g-inga:pointer -->
   - Changes to deliverables go through `/work`.
   - Open work is tracked under `tasks/`.
   - Check results use `pass`, `fail`, `blocked`, and `not run`.
   <!-- /g-inga:pointer -->
   ```

3. Run `node tools/validate/validate.js`, review `git status`, and commit the bundle, the workflow and the pointer in one commit.
4. To make the gate a merge barrier, require the `g-inga-gate / validate-harness` status check in branch protection. Without it, CI only reports, and reports must say so (SC7).

## Update procedure (SC6)

The same command updates an installed bundle. What it guarantees:

- **Validated before any change:** the source manifest's paths must lie inside `.claude/skills/work/` or `tools/validate/`, and every source file must exist and match its hash. Otherwise it exits `1` and the target is untouched.
- **User content is never planned:** `tasks/`, `specs/` and every path outside the bundle scope are out of reach. Files under `tools/validate/` that no manifest lists are left alone.
- **Whole-bundle replacement:** files the new manifest drops are removed; identical files aren't touched, so a repeated run changes nothing (idempotent).
- **Failure atomicity on the working tree:** assets are staged in `<target>/.g-inga-update/` and re-hashed, then replaced file by file (old file to a backup, staged file renamed in), with a journal written before each step and `manifest.json` last. Installed hashes are verified. Any error rolls every step back and exits `1` with the target as it was. If the rollback itself fails, it exits `2` and keeps the journal and backups.
- **Interrupted runs:** if the process is killed, `.g-inga-update/` stays (visible in `git status`), the old manifest is still in place, so the validator reports drift instead of passing a mixed bundle, and the next update run rolls the interrupted run back first.

What it doesn't guarantee: a single filesystem operation can't swap two directories that also hold user files (`tools/validate/` mixes bundle and user files in a target), so replacement is per file with rollback, not one rename. The atomic publication unit is the target's Git commit (FU3): nothing reaches other clones until that commit. A second run refuses a target while the process recorded in `.g-inga-update/pid` is alive, and recovers the work directory of a run that died.

## Open

- Release tags for `release` values (owner action).
- `.claude/skills/work/` procedures cite `docs/artifact-contracts.md`, which isn't in the bundle, so a target has the rules (inside `validate.js`) but not the contract text. Delivering it, or making the procedures self-contained, changes the bundle's contents and needs an owner decision.
