# G-Ingá

Personal agentic SDLC harness for Claude Code favoring **tokens per verified task**.

The **Minimal V1 Specification is approved** (`specs/2026-10-11-minimal-v1-specification.md@1`, hash `sha256:09ff9d3d15f71c9ee832e401edea5c833064c64a317457121b8f6f4f64bc5bab`). Product implementation proceeds strictly according to authorized task records and the approved specification.

## Working Protocol for Agent Sessions

1. **Language & Communication:** Talk with the owner in Brazilian Portuguese. Write repository documentation, code, and commit messages in English.
2. **Repository as Canonical Source of Truth:** Do not rely on conversation memory or external trackers. Project state, decisions, specifications, tasks, evidence, and session continuity reside exclusively in repository files.
3. **Session Startup & Handoff Revalidation:**
   - Review [README.md](README.md) and [docs/README.md](docs/README.md).
   - Inspect `git status`, current branch, and current HEAD.
   - Inspect active task records in [tasks/](tasks/). Revalidate the latest `## Checkpoint` against actual branch, HEAD, and worktree state before making any edits.
4. **Architectural & Specification Authority:**
   - Consult [docs/decision-map.md](docs/decision-map.md) and accepted ADRs in [docs/decisions/](docs/decisions/).
   - Follow [docs/artifact-contracts.md](docs/artifact-contracts.md) and [specs/2026-10-11-minimal-v1-specification.md](specs/2026-10-11-minimal-v1-specification.md).
   - Decisions and claims must be labeled (`proposed`, `accepted`, `open`, `superseded`). Only the project owner can accept an ADR or approve a specification.
   - The approved spec is immutable under its hash. Never modify an approved spec body without explicit owner approval, version increment, and hash update.
5. **Authorized Implementation Scope:**
   - Implement only within the boundaries defined by the active task and the approved V1 spec.
   - Record durable state, evidence, and decisions in canonical repository artifacts.
6. **Canonical Verification & Evidence:**
   - Record baseline checks (`B` rows) before editing.
   - Use the strict 4-value vocabulary: `pass`, `fail`, `blocked`, `not run`. Report only observed facts.
   - Run canonical checks: `mise install`, `mise run validate`, `mise run test`.
7. **Session Handoff:**
   - Update the task's `## Checkpoint` with current date, branch, HEAD SHA, worktree status, completed work, and the exact next action.
   - Create work on a dedicated branch; deliver via PR. Never commit directly to `main`.

<!-- g-inga:pointer -->
- Changes to deliverables go through `/work`.
- Open work is tracked under `tasks/`.
- Check results use `pass`, `fail`, `blocked`, and `not run`.
<!-- /g-inga:pointer -->
