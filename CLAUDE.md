# G-Ingá

Personal agentic SDLC harness for Claude Code favoring **tokens per verified task**.

**Minimal V1 Spec approved** (`specs/2026-10-11-minimal-v1-specification.md@1`, hash `sha256:09ff9d3d15f71c9ee832e401edea5c833064c64a317457121b8f6f4f64bc5bab`). Implementation strictly follows authorized tasks and approved spec.

## Working Protocol for Agent Sessions

1. **Language & Communication:** Owner: Brazilian Portuguese. Repo docs, code, commits: English.
2. **Repository as Canonical Truth:** The repository is canonical. Auto-memory is a hint: check it against the repository before acting on it. No external trackers.
3. **Session Startup & Revalidation:** Check [README.md](README.md), [docs/README.md](docs/README.md), `git status`, branch, HEAD, and active [tasks/](tasks/). Revalidate latest `## Checkpoint` before edits.
4. **Architectural & Spec Authority:** Follow [docs/decision-map.md](docs/decision-map.md), accepted ADRs in [docs/decisions/](docs/decisions/), [docs/artifact-contracts.md](docs/artifact-contracts.md), and [specs/2026-10-11-minimal-v1-specification.md](specs/2026-10-11-minimal-v1-specification.md). Labels: `proposed`, `accepted`, `open`, `superseded`. Only owner accepts ADRs or approves specs. Approved spec is immutable under its hash.
5. **Implementation Scope:** Bounded to active task and approved spec. Record state in canonical artifacts.
6. **Canonical Verification:** Record baseline (`B` rows) before edits. Strict vocabulary: `pass`, `fail`, `blocked`, `not run`. Run: `mise install`, `mise run validate`, `mise run test`.
7. **Session Handoff:** Update `## Checkpoint` with date, branch, HEAD SHA, worktree, work done, next action. Dedicated branch per task; deliver via PR; never commit to `main`.

<!-- g-inga:pointer -->
- Changes to deliverables go through `/work`.
- Open work is tracked under `tasks/`.
- Check results use `pass`, `fail`, `blocked`, and `not run`.
<!-- /g-inga:pointer -->
