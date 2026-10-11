---
schema: spec/1
status: approved
version: 1
approved_version: 1
approved_hash: sha256:09ff9d3d15f71c9ee832e401edea5c833064c64a317457121b8f6f4f64bc5bab
---

# Minimal V1 Specification: G-Ingá SDLC Harness for Claude Code

## Problem

Software engineering sessions conducted with autonomous AI coding agents (specifically Claude Code) suffer from unpredictable autonomy, ceremony mismatch (over-engineering trivial changes or under-verifying risky ones), silent cross-session context drift, unverified completion claims ("build passed" taken as proof of correctness), and lack of deterministic quality gates across repositories.

Existing community skill packs (e.g. Matt Pocock's skills) provide interactive patterns (`grill-with-docs`, `to-spec`, `to-tickets`, `wayfinder`), but:

1. They do not adhere to deterministic artifact contracts or verifiable state transitions ([ADR 0004](../docs/decisions/0004-reuse-strategy-for-existing-skills.md));
2. They do not provide automated or deterministic verification gates in target repositories;
3. They incur high fixed per-turn context overhead (~2,152 characters across 11 model-invoked skills);
4. They do not load or function reliably in remote or cloud container environments ([ADR 0005](../docs/decisions/0005-native-primitive-mapping.md), Fact `N12`, `C15`).

Without a formal specification for G-Ingá V1, the project cannot build an implementation that is self-contained, reproducible across workstations and cloud sessions, and verifiable without reliance on external registries or ad-hoc prompt copying.

## Expected behavior

G-Ingá V1 provides a personal, lightweight, deterministic SDLC harness for Claude Code that:

1. Operates through a single, model-invocable entry skill (`/work`) with progressive disclosure of procedures across three ceremony tiers (`light`, `standard`, `heavy`);
2. Guarantees zero file persistence and zero ceremony overhead for trivial, local, reversible tasks (`light` tier);
3. Persists explicit, structured task records (`tasks/<id>.md`) and specifications (`specs/<id>.md`) for `standard` and `heavy` tasks;
4. Distributes as an atomic, pinned, self-contained repository bundle (`.claude/skills/work/`, `tools/validate/`, `manifest.json`) authored exclusively in G-Ingá;
5. Verifies bundle integrity and detects accidental drift locally and in CI via SHA-256 manifest checking;
6. Enforces contract validity deterministically via an offline, zero-install validator script executing both as a skill step and as a CI merge gate (when configured with required status checks).

## Scope

### In Scope for V1

- **Skill definition and progressive disclosure:** `.claude/skills/work/` containing `SKILL.md` (< 5,000 tokens for compaction survival) and supporting documents (`standard.md`, `heavy.md`, `resume.md`, `review.md`).
- **Target repository pointer:** A minimal, delimited block in `CLAUDE.md` directing Claude Code to `/work`, `tasks/`, and contract result vocabularies.
- **Repository layout:** `tasks/` and `specs/` directories at the target repository root.
- **Bundle layout & manifest:** Directory layout, manifest format (`manifest.json`), SHA-256 hash checking for accidental drift detection.
- **Validator CLI contract:** Standalone zero-install validator bundle (Node 22 / Bun compatible) checking artifact schemas, states, transitions, and history walks offline.
- **CI job contract:** Merge gate workflow definition for target repositories.
- **Update and coexistence policy:** Idempotent, non-destructive update contract; coexistence with Matt Pocock plugin without runtime dependency.

### Out of Scope (Explicit Exclusions)

- Any local Git commit hook (`PreToolUse` hook excluded from V1 per H-1).
- Plugin packaging, marketplace distribution, or installer CLIs (deferred per ADR 0001).
- Multi-repository System Context Harness / Wayfinder replacements (deferred per ADR 0001 and ADR 0005 item 10).
- OpenTelemetry daemons, background metrics collectors, or automated per-task token billing (ADR 0006 / D4 guidelines).
- Custom subagent definitions or auto-memory integration.
- Configurable artifact directory paths (fixed strictly to `tasks/` and `specs/`).

## Acceptance criteria

- **SC1 (Bundle Self-Containment):** The distributed bundle contains all required instruction markdown files, supporting procedures, the standalone validator script, and `manifest.json`. It requires no network fetches and no `node_modules` installation in target repositories during execution.
- **SC2 (Zero Ceremony for Light):** Tasks routed to the `light` tier persist zero files in `tasks/` or `specs/`, producing only a formatted terminal report with a `tier: light` routing line and verification evidence.
- **SC3 (Contract Conformance):** For `standard` and `heavy` tiers, artifact records strictly conform to `docs/artifact-contracts.md` schema, section, frontmatter, and state transition invariants.
- **SC4 (Deterministic Validation and Exit Codes):** The bundled validator runs offline via standard CLI (`node tools/validate/validate.js` or `bun tools/validate/validate.ts`).
  - *Individual check outcomes:* Each check evaluates to exactly one of `pass`, `fail`, `blocked`, or `not run`. `pass` requires all invariants to hold; `fail` indicates an explicit rule or schema violation; `blocked` indicates an environmental barrier, ambiguity (findings F1–F14), missing prerequisite history (such as shallow clones), or missing runtime dependency; `not run` indicates that a check's declared preconditions do not apply (e.g. no task records exist or network checks skipped).
  - *Global aggregation and exit code conditions:*
    - Exit code `0` is returned if and only if every executed check is `pass` (with non-applicable checks `not run`). Exit code 0 is forbidden if any mandatory check is `blocked`, `fail`, or silently unexecuted.
    - Exit code `1` is returned if at least one check evaluates to `fail` (regardless of `blocked` or `not run` checks).
    - Exit code `2` is returned if no check failed, but at least one mandatory or applicable check is `blocked`.
    - *Mandatory checks:* In repositories with task or spec records, the contract verification and history walk checks are mandatory. An unexecuted mandatory check (`not run` when preconditions apply) or any missing mandatory check MUST prevent exit code 0 and is aggregated as `blocked` (exit code 2) or `fail` (exit code 1), ensuring that absence of verification is never silently interpreted as approval.
- **SC5 (Manifest Integrity and Accidental Drift Detection):** The bundle includes an integrity manifest (`manifest.json`) containing release metadata, the canonical commit SHA, and SHA-256 hashes of all bundled instruction markdown files and the standalone validator script.
  - *Scope of covered files:* Fixed strictly to harness assets (`.claude/skills/work/**`, `tools/validate/**`). User files, project source code, `tasks/**`, `specs/**`, and target repository root files are strictly outside the manifest.
  - *Circularity prevention:* The `manifest.json` file itself is strictly excluded from the set of hashed files, avoiding circular hash reference.
  - *Validation mechanism:* The validator (or preflight integrity step) enumerates the covered bundle files, computes their SHA-256 digests, and compares them against `manifest.json`.
  - *Security boundary:* The manifest reliably detects accidental drift and uncoordinated local modifications when the expected hashes remain fixed. It explicitly does NOT provide cryptographic authentication or tamper resistance against deliberate modifications by an agent or user with write permissions who alters bundle files and recalculates manifest hashes within the same commit.
- **SC6 (Non-Destructive Update):** The bundle update procedure replaces bundle assets atomically and idempotently without modifying or overwriting existing user records in `tasks/` or `specs/`.
- **SC7 (Honest CI Enforcement Gate):** Target-repository CI execution acts as a deterministic merge barrier if and only if branch protection requires the check; in repositories without required status checks, documentation and session reports explicitly disclaim automated merge enforcement.
- **SC8 (Transitional Coexistence):** The `/work` skill executes correctly in environments where Matt Pocock's plugin is active, without naming collisions, cross-invocations, or runtime dependencies.

## Interfaces and dependencies

### Host Interfaces (Claude Code Primitives)

- **Model-invocable skill:** Declared in `.claude/skills/work/SKILL.md` with description < 1,536 characters (Fact `N2`). Loaded automatically by Claude Code.
- **On-demand supporting files:** Read via standard file viewing tools (`standard.md`, `heavy.md`, `resume.md`, `review.md`) upon tier entry (Fact `N4`).
- **Session pointer:** Delimited text block in target repository `CLAUDE.md` (< 5 lines, Fact `N1`).
- **Isolated review subagent:** Invocation of the built-in general-purpose subagent using the prompt template in `review.md` for `heavy` tier review (Fact `N9`).

### Runtime Dependencies

- Target development environment and CI runners must provide a pre-installed JavaScript runtime: **Node.js (>= 22.0.0)** or **Bun (>= 1.1.0)**.
- Full Git history (`git` CLI available) for commit ancestry and artifact history walks.

### Upstream Provenance Interfaces

- In accordance with ADR 0004 §5, any supporting instruction file adapting upstream techniques must cite the exact upstream file and pinned commit in its header line:
  - `grill-with-docs` adaptation cites `skills/grill-with-docs/SKILL.md` at `49dd158`;
  - `to-spec` adaptation cites `skills/to-spec/SKILL.md` at `49dd158`;
  - `to-tickets` adaptation cites `skills/to-tickets/SKILL.md` at `49dd158`.

## Requirements Traceability

Every mandatory requirement in this specification traces directly to an accepted architectural decision, accepted contract, or approved D5 decision. Requirements touching observability or telemetry derive from ADR 0006 (which remains `proposed`) and are explicitly designated as proposals or operational hypotheses:

| Requirement / Criterion | Source / Authoritative Basis | Status of Source | Notes & Governance Boundary |
|---|---|---|---|
| Single `/work` skill entry point & progressive disclosure | ADR 0005 §1, §2; ADR 0002 §2 | accepted | Single entry point unblocks clean host loading without name collision. |
| Delimited pointer in `CLAUDE.md` (< 5 lines) | ADR 0005 §3 | accepted | Non-intrusive target repository pointer; content outside block preserved. |
| Zero file persistence for `light` tier | ADR 0002 §4; ADR 0003 §1; artifact contracts §1 | accepted | Invariant: trivial tasks produce zero repository noise. |
| `tasks/` and `specs/` layout at target repo root | [artifact contracts](../docs/artifact-contracts.md) §2.1; ADR 0005 §4 | accepted | Fixed discovery paths aligned with validator. |
| Atomic pinned bundle distribution (Alternative A) | ADR 0005 FU1, FU2 | accepted | Canonical authoring in G-Ingá; committed copy in target repository. |
| Co-located validator script running offline | ADR 0005 FU4; [artifact contracts](../docs/artifact-contracts.md) §7 | accepted | Zero-install, zero-network verification in checkout. |
| Accidental drift detection via SHA-256 manifest | ADR 0005 FU3 | accepted | Manifest hashes detect accidental drift; not cryptographic authentication. |
| Artifact schemas (`task/1`, `spec/1`), states, transitions | ADR 0003; [artifact contracts](../docs/artifact-contracts.md) §§2–6 | accepted | Invariant state machine and transition guards. |
| Verification table vocabulary (`pass`, `fail`, `blocked`, `not run`) | [artifact contracts](../docs/artifact-contracts.md) §2.4, §3.4 | accepted | Strict 4-value result vocabulary. |
| Deterministic exit codes (0, 1, 2) and mandatory check gating | ADR 0005 §5; [development.md](../docs/development.md) | accepted | Exit code 0 requires all checks passing; unrun mandatory check blocks exit 0. |
| Exclusion of `PreToolUse` commit hook | ADR 0005 H-1 | accepted | Hook excluded from V1; CI acts as merge gate. |
| CI merge gating honesty condition | ADR 0005 §5; ADR 0005 H-1 | accepted | CI is a deterministic merge gate only where branch protection requires it. |
| Transitional coexistence with Matt Pocock plugin | ADR 0004 §3, §7; ADR 0005 FU6 | accepted | Zero runtime dependency; Pocock plugin unreferenced during transition. |
| Advisory per-turn context overhead (< 5k tokens) | ADR 0002 §8; ADR 0005 §11; ADR 0006 U7 | proposed (ADR 0006) / accepted (ADR 0002) | Advisory guideline budget only; no platform-enforced hard ceiling. |
| OpenTelemetry inspection & local usage observation | ADR 0006 §1, §4, §5 | proposed (ADR 0006) | Proposed hypothesis for exploratory investigation; no runtime daemon or billing in V1. |

## Decisions

### Architectural Choices Settled by Approved ADRs

1. **Canonical Source & Delivery (FU1/FU2):** G-Ingá repository is canonical; target repositories commit a dedicated bundle directory (`.claude/skills/work/`, `tools/validate/`, `manifest.json`). *(Rationale: guarantees loading in local and cloud sessions per Fact `N12`; self-contained checkouts).*
2. **Update by Replacement with Manifest (FU3):** Updates occur via atomic replacement at a pinned release tag. Manifest hashes detect accidental drift. *(Rationale: avoids unmanaged forks while recognizing SHA-256 is not tamper-proof authentication).*
3. **Co-located Validator (FU4):** The validator script ships inside the bundle alongside instructions. *(Rationale: guarantees 100% synchronization between contract rules and validator logic; zero network in CI).*
4. **No Commit Hook in V1 (H-1):** Exclude `PreToolUse` hook. Enforcement occurs via skill step guidance and CI merge gates. *(Rationale: avoids commit freezes from validator bugs/timeouts under `onFailure: "block"`; requires branch protection for true enforcement).*
5. **Transitional Coexistence (FU6):** Matt Pocock plugin remains installed and unreferenced until ADR 0004 §7 replacement criteria are met on real tasks. *(Rationale: preserves owner's existing workflow without creating runtime dependencies).*

## Risks and constraints

- **Accidental Drift vs. Intentional Tampering:** SHA-256 manifest checking detects accidental drift or uncoordinated edits. It does not authenticate against deliberate tampering by an agent with write permissions.
- **CI Gating Limitations:** A passing CI job does not stop invalid merges unless the hosting platform (e.g. GitHub/GitLab) enforces branch protection with required status checks.
- **Token Overhead vs. Compaction:** Fixed per-turn context overhead is restricted to pointer text (~3 lines) + 1 skill description (< 1,536 chars). `SKILL.md` must stay under 5,000 tokens so Claude Code re-attaches it completely after compaction (Fact `N2`).
- **Runtime Availability:** While the bundle is zero-install (no `node_modules`), the host system or CI container must provide Node or Bun.

## Verification

The V1 implementation will be verified against the following test protocol:

1. **Fixture Validation:** The bundled validator must execute the complete 40+ fixture suite from G-Ingá (`tools/validate/artifacts/fixtures.ts`) and report identical results.
2. **Table-top Scenario Walk:** Walk through scenarios R01–R17 from ADR 0002, verifying prompt loading, file reads, and tier boundaries.
3. **Isolated Target-Repo Installation Test:** Install the bundle into a clean throwaway Git repository; verify that `light` tasks create zero records; verify that invalid `tasks/` states return exit code 1; verify that shallow clones return exit code 2 (`blocked`).
4. **Compaction Re-attachment (Spike S2):** Verify in Claude Code that `/work` instructions survive context compaction without truncation.
5. **Transitional Coexistence Verification:** Execute tasks in a workspace with the Pocock marketplace plugin enabled; confirm `/work` executes without collision or fallback invocations.

## Rollback

skip: V1 is a specification artifact; no functional code or runtime bundle is deployed in this step.

## Open questions

- **U2 (Bundler format):** Whether the standalone validator is pre-bundled via `esbuild` or `bun build`. *(Deferred to M1 implementation; does not block specification).*
- **U4 (Decision map inclusion):** Decision-map schema remains excluded from V1 core runtime. *(Deferred post-V1).*
- **U5 (Cross-repo friction logging):** Friction logged manually into G-Ingá's log from target-repo session summaries. *(Protocol defined in D7).*
- **U6 (Setup tool CLI):** Exact CLI flags for the setup helper script. *(Deferred to M1 implementation).*
- **U7 (Hard per-turn token limit):** Guideline token budgets remain advisory per ADR 0006.
- **U8 (Validator findings F1–F14):** Ambiguities default to `blocked` (exit code 2).

## Revisions

- v1: Initial minimal V1 specification drafted following owner approval of D5 (ADR 0005) on 2026-10-11.
