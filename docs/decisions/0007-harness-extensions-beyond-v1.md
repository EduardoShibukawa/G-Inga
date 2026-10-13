# 0007 — Harness extensions beyond V1

- **Status:** accepted (2026-10-13)
- **Date:** 2026-10-13 (drafted from an audit of the approved V1 spec against the repository; accepted 2026-10-13)
- **Deciders:** project owner (accepted 2026-10-13 in full, Decision items 1–5 without change, by the owner's message requesting the `/orchestrate` run that accepts ADR 0007 and opens its follow-ups; the three open questions are answered below)
- **Depends on:** [ADR 0002](0002-ceremony-tiers-and-routing.md), [ADR 0004](0004-reuse-strategy-for-existing-skills.md), [ADR 0005](0005-native-primitive-mapping.md) and [ADR 0006](0006-usage-observability.md), all `accepted`, and the approved [Minimal V1 Specification](../../specs/2026-10-11-minimal-v1-specification.md) (`approved_version: 1`). This record changes none of them: the spec stays frozen under its hash and accepted ADRs stay as written.
- **Evidence:** repository files at commit b1aa551, cited inline. Audit task: [tasks/2026-10-13-adr-0007-harness-extensions.md](../../tasks/2026-10-13-adr-0007-harness-extensions.md).

## Context

The Minimal V1 Specification was approved on 2026-10-11. Since then the repository grew past it through owner-approved tasks, but no decision record covers the growth. An audit of the spec against the repository found five divergences.

1. **Manifest scope.** Spec SC5 fixes the manifest's covered files "strictly to harness assets (`.claude/skills/work/**`, `tools/validate/**`)". [`tools/validate/bundle.json`](../../tools/validate/bundle.json) and `manifest.json` also cover the six files under `.agents/skills/work/` (15 assets in all: 6 Claude Code, 6 Antigravity, 3 validator). They were added by the multi-host child task [05](../../tasks/2026-10-11-minimal-v1-specification-05-multi-host-antigravity.md), approved by the owner ("Opção A: Bundle Multi-Host"), and verified at 83d1ebb (its AC3). The child task records the owner's approval; the spec text was never revised.
2. **Extra model-invocable skills.** The spec settles a single `/work` entry point (Requirements Traceability, citing ADR 0005 §1) and restricts the fixed per-turn overhead to "pointer text (~3 lines) + 1 skill description (< 1,536 chars)" (Risks and constraints). The repository now also ships `/orchestrate` and `/drive` on both hosts, each with `disable-model-invocation: false`:
   - [`.claude/skills/orchestrate/SKILL.md`](../../.claude/skills/orchestrate/SKILL.md) description: 173 characters.
   - [`.claude/skills/drive/SKILL.md`](../../.claude/skills/drive/SKILL.md) description: 267 characters.
   - The `.agents/skills/` copies carry the same two descriptions.
   - Together they add 440 characters and two descriptions per turn on each host, on top of `/work` (134 characters on Claude Code, 149 on Antigravity). The character total (574 on Claude Code) is still under 1,536, but the count is three descriptions, not one. ADR 0005 Alternative D rejected "several descriptions every turn" for entry points, and Alternative B records `disable-model-invocation` as the zero-fixed-cost option (fact `N3`).
   - Neither skill is in `bundle.json`, so neither is delivered to target repositories or hashed by the manifest.
3. **Gira-G external dependency.** [`/drive`](../../.claude/skills/drive/SKILL.md) step 2 runs `gira locate`, `gira slice` and `gira impact` against [`docs/architecture/macro-map.json`](../architecture/macro-map.json). The `gira` CLI isn't in this repository: the [indexing task](../../tasks/2026-10-12-integrate-girag-architecture-indexing.md) ran a binary at an owner-local path (`/home/tg/Git/duh-homelab/labs/gira-g/bin/gira`). [`gira.yaml`](../../gira.yaml) points at `file:///home/tg/Projetos/G-Inga` with SHA anchor `47cc03dbd29b0e98916105e4938c46463138a361`, and every `commit_sha` in the macro map is that anchor. In a cloud session `gira` isn't on `PATH`, and the `file://` locator doesn't exist, so neither the queries nor a regeneration can run. At b1aa551 the map is 12 commits (8 non-merge) behind `HEAD`; the commits since include the `/drive` and `/orchestrate` skills themselves.
4. **Spec verification protocol gaps.** The spec's `## Verification` lists five checks. The accepted parent task [tasks/2026-10-11-minimal-v1-specification.md](../../tasks/2026-10-11-minimal-v1-specification.md) records rows SC1–SC8, R1–R3 and V1–V2, but none for:
   - item 2, the table-top walk of ADR 0002 scenarios R01–R17 "verifying prompt loading, file reads, and tier boundaries". Related evidence exists outside the parent: [EXP-01](../../tasks/2026-10-11-autoresearch-exp01-router-calibration.md) scores tier classification 17/17 with [`tools/eval/evaluate_routing.ts`](../../tools/eval/evaluate_routing.ts), and the [table-top worksheet](../research/2026-10-11-r01-r17-tabletop-worksheet.md) records the classification matrix. Neither covers which files load or which reads happen;
   - item 4, the compaction re-attachment check (ADR 0005 spike S2): no task row or research note records it.

   Separately, the parent's SC8 row and its routing line record that the owner retired the Pocock plugin on 2026-10-11 "per ADR 0004". The spec's Decisions item 5 expected the plugin to remain installed "until ADR 0004 §7 replacement criteria are met on real tasks", and ADR 0004 §7 says each upstream skill leaves the owner's flow "once its role is covered", with "No role is covered today". The retirement is the owner's call, but no decision record ties it to the §7 criteria.
5. **Stale dependency label.** ADR 0006's Depends on line still describes [ADR 0005](0005-native-primitive-mapping.md) as `proposed`; ADR 0005 has been `accepted` since 2026-10-11.

## Problem

Decide, per divergence, whether the repository or the record changes, so that:

- the approved spec stays immutable under its hash, and any deviation from it is written down rather than implied by later tasks;
- the per-turn fixed overhead the spec budgets for stays honest;
- a verification that depends on an owner-local tool degrades to `not run` instead of silently failing or being skipped;
- gaps in the V1 verification protocol are closed by new records, never by editing accepted ones.

## Decision

1. **Manifest scope: accept as a recorded deviation.** The `.agents/skills/work/**` coverage stays. The owner approved it in child task 05, and it extends SC5's integrity intent to a second host without hashing any user file. This record is the written deviation from SC5's "strictly" wording. A spec v2 is deferred until another spec change needs reapproval, and folds this in then.
2. **Extra skills: post-V1 extensions outside the bundle, made user-invocable.** `/orchestrate` and `/drive` stay as repository-local extensions, never delivered by `bundle.json`. A follow-up `light` task sets `disable-model-invocation: true` on both, on both hosts, which takes their descriptions out of every turn (`N3`) and restores the V1 budget of one model-invocable description. Both are invoked by name for multi-task runs, so automatic loading buys little.
3. **Gira-G: optional enrichment with a `not run` fallback.**
   - `/drive` treats Gira-G as optional. When `gira` isn't on `PATH`, or `gira.yaml` points at a locator that doesn't resolve, it records the slice step as `not run` and falls back to the task records' declared scopes. A follow-up task adds this rule to both `/drive` copies.
   - Gira-G output is context for workers, never evidence for a G-Ingá gate.
   - **Staleness policy:** the map is stale when its anchor SHA isn't `HEAD` and any commit since the anchor touches `.claude/skills/`, `.agents/skills/`, `tools/` or `docs/decisions/`. A stale map may still be read, but the run reports it as stale with its anchor. Regeneration happens only where the CLI exists (today the owner's machine), and commits `gira.yaml` and the map together.
4. **Verification gaps: a follow-up task, not an edit to the accepted parent.**
   - Open a new `standard` task that runs spec Verification item 2 (walk R01–R17 recording, for each, the tier, the files loaded and the files read under the current `/work` bundle, reusing the EXP-01 frozen scenarios) and item 4 (spike S2: force compaction on a session that loaded `/work` and confirm `SKILL.md` re-attaches whole), with rows that cite the spec items. Item 4 needs a live Claude Code session; where none is available its row is `blocked`, not `pass`.
   - Accepting this record also ratifies the owner's 2026-10-11 retirement of the Pocock plugin as an owner decision that ends the transitional coexistence of spec Decisions item 5 and ADR 0004 §7 early. SC8's verified coexistence evidence (child 01 AC5) stands as recorded.
5. **ADR 0006 label: note only.** ADR 0006 isn't edited. Its Depends on line is read with ADR 0005 as `accepted`. If ADR 0006 is ever revised for another reason, the label is corrected then.

## Alternatives considered

| Item | Option | Why not recommended |
|---|---|---|
| 1 | Reapprove the spec as v2 with the wider SC5 scope now | Reopens a hash-frozen spec for a scope change the owner already approved in a task; costs a full heavy approval cycle for one line |
| 1 | Drop `.agents/skills/work/**` from `bundle.json` and `manifest.json` | Leaves the delivered Antigravity copy without drift detection, while it is still installed by `update.mjs` |
| 2 | Keep both skills model-invocable and amend the budget | Pays two descriptions every turn on every session for skills used by name; contradicts ADR 0005 Alternative D |
| 2 | Add both skills to the bundle | Ships the Gira-G dependency and multi-agent orchestration to every target repository before any logged friction asks for it ([ADR 0001](0001-product-boundary.md) decision item 4) |
| 3 | Vendor the `gira` binary or make it a required dependency | Adds a runtime dependency the V1 bundle avoids ("zero-install"); pins an external tool whose source isn't in this repository |
| 3 | Remove Gira-G from `/drive` | Discards owner-approved work that runs fine on the owner's machine |
| 4 | Add rows to the accepted parent task | Accepted records are terminal; editing them breaks the history the validator walks |

## Consequences

- The V1 spec stays at `approved_version: 1` and its hash doesn't change; this record is where the SC5 deviation and the plugin retirement are found.
- Per-turn fixed overhead returns to one description once item 2's follow-up lands; until then it is three.
- `/drive` runs in cloud sessions with a recorded `not run` for the Gira-G step instead of an unexplained failure.
- Two follow-up tasks are needed (skills frontmatter plus the `/drive` fallback and staleness rules; the verification walk and spike S2). Both are authorized by the acceptance on 2026-10-13. The `/drive` `not run` fallback of item 3 already landed with the [drive contract alignment task](../../tasks/2026-10-13-align-drive-skill-with-contracts.md).

## Open questions (answered)

Answered by the owner on 2026-10-13, with the acceptance.

- Should a spec v2 be opened proactively, gathering this record's deviations, or only when another change needs reapproval? **Answer:** not now. A spec v2 is opened only when another change needs reapproval, as item 1 recommends.
- Should the staleness check in item 3 be a validator layer, or stay a `/drive` instruction? A validator layer would need `gira.yaml` parsing inside `tools/validate/`, which is bundle scope. **Answer:** it stays a `/drive` instruction. It doesn't become a validator layer, which keeps `gira.yaml` parsing out of the bundle.
- Does spike S2 need a pinned Claude Code version to count as evidence, as ADR 0005 asks for spike S1? **Answer:** yes. A spike S2 row counts as evidence only when it records the Claude Code version (`claude --version`) it ran on, as for spike S1.
