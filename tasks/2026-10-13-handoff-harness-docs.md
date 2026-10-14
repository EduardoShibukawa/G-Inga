---
schema: task/1
tier: standard
status: active
---

# Handoff harness docs: analysis + architecture proposal

## Routing and approvals

- tier: standard (S2 fails: multi-doc design with open decisions; S1, S3, S4, S6, S7 hold; not S5)

## Objective

Publish four docs (one analysis, one architecture proposal with 12 sections, two primary-source research notes) for multi-host orchestration, validated by the repo suite.

In scope: `docs/research/2026-10-13-multi-host-orchestration-analysis.md`, `docs/architecture/2026-10-13-handoff-harness-proposal.md`, `docs/research/2026-10-13-community-crosscheck.md`, `docs/research/2026-10-13-similar-harness-ideas.md`.
Out of scope: any code, skills, validator, or other untracked work (`evals/`, cursor-host files stay untouched).

## Acceptance criteria

1. AC1: proposal doc covers goal, flow, CLI, packets, hosts, gate, phases, economy, loop, OmniRoute spike.
2. AC2: analysis doc states ToS bans with verbatim quotes and sources.
3. AC3: both research notes cite owning primary sources per claim.
4. AC4: `mise run validate` Overall pass with the four files in tree.
5. AC5: commit touches only the four docs plus this task record.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | `mise run validate` without the new files | pass | c2a0633 | Overall pass: lint 110 files 0 issues, mermaid 39/39 |
| AC1 | §1–§12 present, 54 mermaid diagrams render | not run | | |
| AC2 | FAQ quotes present with URLs | not run | | |
| AC3 | per-claim citations in both notes | not run | | |
| AC4 | `mise run validate` Overall pass in tree | not run | | |
| AC5 | `git show --stat` lists only the four docs + this record | not run | | |
| R1 | `mise run test` | not run | | |
| V1 | diff read against AC1–AC5 | not run | | |

## Plan

1. Baseline B1 with files moved out.
2. Branch, add four files, verify AC1–AC5 + R1, PR, merge commit.

## Checkpoint

- as of: 2026-10-13, branch main, head c2a0633, worktree has 4 new docs untracked + unrelated untracked work
- done: docs written and lint-clean locally
- next: B1 baseline, then branch + PR
