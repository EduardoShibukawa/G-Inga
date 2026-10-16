# 0015 — Decoupling commit-gate scope to authoring validation in pre-commit and trunk-linear history walk in CI

- **Status:** accepted (accepted by project owner 2026-10-16)
- **Date:** 2026-10-16
- **Deciders:** project owner
- **Amends:** [ADR 0009](0009-enforcement-primitives.md) §2, [ADR 0012](0012-authoring-vs-full-validation-modes.md)
- **Spec:** [Decouple commit gate and trunk-linear history](../../specs/2026-10-16-decouple-commit-gate-and-trunk-linear-history.md) v1

## Context

ADR 0009 §2 established that the Git pre-commit hook runs `mise run pre-commit`, which depended on the full `validate` suite, and that CI runs the same task. ADR 0012 introduced `validate:authoring` for manual iteration but explicitly forbade its use in pre-commit or CI ("Authoring is documentation-only for iterative work and is not accepted by CI or pre-commit").

In practice, this coupling introduced two major failure modes:

1. Every local commit incurs 50–70s latency, executing Mermaid SVG rendering and a 230+ commit Git history walk. In agentic workflows with multiple atomic commits per task, this imposes massive latency and idle token burn.
2. The §7.1 history walk used `git rev-list --reverse HEAD`, which flattened the commit DAG chronologically across merged sibling branches. Merges of multi-task branches (such as PR #83 merge `b00459e`) interleaved commits non-monotonically, triggering spurious false positives where tasks appeared to regress (`verified → todo`).

## Decision

Amending ADR 0009 §2 and ADR 0012:

### 1. Pre-Commit Gate: Fast Authoring Validation

- The Git pre-commit hook (`hk.pkl` -> `mise run pre-commit`) executes authoring validation (`mise run validate:authoring` / `bun tools/validate/main.ts --authoring`).
- The pre-commit gate verifies staged/working tree structure: schema validity, frontmatter syntax, required sections, valid enums, start guards, and reference resolution.
- It completely skips the Git history walk (§7.1), commit-order ancestry checks (§3.4), and heavy rendering/external network calls.
- This protects repository authoring integrity against model hallucinations (e.g. Haiku) while reducing commit latency to immediate turnaround and eliminating branch DAG false positives.

### 2. CI / PR Gate: Full Repository Audit

- Continuous Integration on pull requests and pushes to `main` (`.github/workflows/validate.yml`) continues to run the full validation suite (`mise run validate`).
- The full audit gate enforces all universal checks (markdownlint, link resolution, Mermaid diagrams), commit-order ancestry (`B` rows as ancestors of `verified_at`), and the complete Git history walk (§7.1).
- Branch protection on `main` requires the full validation CI job, ensuring no invalid state transitions can merge into trunk.

### 3. Re-Architecting §7.1: Trunk-Linear History Walk (`--first-parent`)

- In `tools/validate/artifacts/history.ts`, the Git history walk algorithm is refactored from `git rev-list --reverse HEAD` to:
  `git rev-list --first-parent --reverse HEAD -- tasks specs intents`
- Along trunk (`main`), `--first-parent` follows the linear trunk progression, treating merge commits as atomic integration steps and ignoring intermediate branch interleaving.
- Along a feature branch, it follows the branch lineage without diving into merged side branches.
- This eliminates phantom backwards status regressions (`verified → todo`) and ghost deletions without requiring fragile DAG-interleaving heuristics.

## Considered Options

| ID | Option | Decision | Rationale |
|---|---|---|---|
| A | Keep full validation in pre-commit, optimize Mermaid rendering | Rejected | Does not address §7.1 DAG false positives; history walk scales with commit count and will keep slowing down. |
| B | Narrow pre-commit hook to run only when `tasks/` or `specs/` are staged | Rejected | Does not protect against breaking markdown links or universal rules when other files change; still incurs 50-70s whenever artifacts are edited. |
| C | Decouple: authoring in pre-commit, full gate in CI, `--first-parent` in §7.1 | **Accepted** | Clear invariant boundary: local authoring syntax guarded at commit time; global history and integration audit guarded at PR merge; zero DAG interleaving bugs. |

## Consequences

- Commit turnaround drops from 50–70s to fast authoring validation; agents and developers commit smoothly without blocking.
- ADR 0009 §2 is amended: `mise run pre-commit` runs `validate:authoring`.
- ADR 0012 is amended: authoring mode is formally promoted as the official pre-commit gate.
- §7.1 history walk is robust against PR merges and multi-branch workflows.
- Full gate guarantees remain strictly preserved in CI prior to trunk merge.
