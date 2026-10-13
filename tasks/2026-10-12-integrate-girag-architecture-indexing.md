---
schema: task/1
tier: standard
status: verified
verified_at: "7593bd6"
---

# Integrate Gira-G Architecture Indexing Harness

## Routing and approvals

- tier: standard (S1 holds: testable architecture indexing and graph traversal criteria; S2 holds: follows SDLC harness tooling integration and ADR 0002; S3 holds: strictly bounded to `gira.yaml`, `docs/architecture/`, and `tasks/`; S4 holds: two-way door)
- approved: standard procedure by owner (2026-10-12, "Task: Integrate Gira-G Architecture Indexing Harness")

## Objective

Integrate the Gira-G architecture indexing harness into the G-Ingá repository to enable semantic boundary extraction, architecture macro mapping, and component query/slicing capabilities:

1. Create canonical `gira.yaml` manifest configuring G-Ingá as the target system with local repository locator, current HEAD SHA anchor (`47cc03dbd29b0e98916105e4938c46463138a361`), and root path scope.
2. Execute architectural indexing using the Gira-G CLI binary (`/home/tg/Git/duh-homelab/labs/gira-g/bin/gira`), generating `docs/architecture/macro-map.json`.
3. Verify index query capabilities via `gira locate` and `gira slice`.
4. Ensure all repository validation checks (`mise run validate`) pass with 100% compliance.

- In scope:
  - `gira.yaml`
  - `docs/architecture/macro-map.json`
  - `tasks/2026-10-12-integrate-girag-architecture-indexing.md`
- Out of scope:
  - Modifying approved specs, spec hashes, or ADRs.
  - Committing directly to git (atomic commit seal handled by parent orchestrator).

## Acceptance criteria

- AC1: `gira.yaml` exists at repo root defining target system `g-inga`, local URL `file:///home/tg/Projetos/G-Inga`, SHA anchor `47cc03dbd29b0e98916105e4938c46463138a361`, and path scope `.`.
- AC2: `docs/architecture/macro-map.json` generated successfully via `gira index`, indexing repository nodes and relationships.
- AC3: Architecture queries `gira locate "work"` and `gira slice` successfully extract matched entities and boundary relationships from the generated index.
- AC4: Repository validation suite (`mise run validate`) passes with 0 errors.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validation suite | pass | 47cc03dbd29b0e98916105e4938c46463138a361 | `mise run validate` and `mise run test` pass on HEAD |
| AC1 | canonical gira.yaml manifest | pass | 7593bd6 | `gira.yaml` created with valid version 1 manifest schema |
| AC2 | macro-map.json generation | pass | 7593bd6 | `gira index` produced docs/architecture/macro-map.json (75 nodes, 217 relationships) |
| AC3 | gira locate and slice queries | pass | 7593bd6 | `gira locate` and `gira slice` succeed with zero runtime errors |
| AC4 | repository validation suite | pass | 7593bd6 | `mise run validate` passes (77 files, 0 issues) |
| V1 | diff review against scope | pass | 7593bd6 | changes strictly bounded to in-scope files |

## Outcome

Successfully integrated the Gira-G (`gira`) architecture harness into G-Ingá. Configured canonical `gira.yaml` manifest, generated the full system architecture map at `docs/architecture/macro-map.json` indexing 75 component nodes and 217 structural relationships across skills, tooling, ADRs, specs, and tasks. Validated fast entity lookup and bounded context slicing via `gira locate` and `gira slice` with 100% compliance under repository validation suite.

## Checkpoint

- as of: 2026-10-12, branch feat/integrate-girag-architecture-indexing, head 7593bd6, task verified
- done: gira.yaml configured, macro-map.json generated, locate and slice verified, validate passing
- next: squash/merge PR to main and sync
