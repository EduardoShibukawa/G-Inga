---
schema: task/1
tier: standard
status: active
parent: 2026-10-15-validator-ux-and-ai-native-sdlc
spec: 2026-10-15-validator-ux-and-ai-native-sdlc@1
depends_on: ["2026-10-15-validator-ux-and-ai-native-sdlc-01-spec-and-intent-artifact", "2026-10-15-validator-ux-and-ai-native-sdlc-02-validator-authoring-full-modes"]
---

# Subagents (validator-guide, researcher) and skills

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-15-validator-ux-and-ai-native-sdlc)

## Objective

Implement child 03 of the approved spec: Subagents (validator-guide, researcher) and validator flow skill.

In scope:

- Subagent definitions under `.claude/agents/` (`validator-guide.md`, `researcher.md`) with single responsibility and least tools (SC8).
- Scoping documentation for later phases (reviewer in Phase 2, verifier in Phase 3) without implementation claims (SC8).
- Validator flow skill (`.claude/skills/validator-flow/SKILL.md` and `.agents/skills/validator-flow/SKILL.md`) explaining the validator flow, authoring/full modes, exit codes, and next actions (SC9).
- Document and link `validator-flow` from `docs/artifact-contracts.md` and `docs/development.md` (SC9).

Out of scope: other children; implementing Phase 2 reviewer or Phase 3 verifier.

## Acceptance criteria

1. AC1 = SC8: `validator-guide` and `researcher` subagents exist with one job and minimal tools; `reviewer` and `verifier` are scoped for later phases without implementation claims.
2. AC2 = SC9: skills explaining the validator flow exist and are linked from the contract/development docs.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | full repository validation and test suite before edits | pass | 7f32159 | `mise run validate && bun test tools/validate` |
| AC1 | validator-guide and researcher subagents defined with minimal tools and later phases scoped | not run |  | inspection of `.claude/agents/` |
| AC2 | validator-flow skill exists and is linked from docs/development.md and docs/artifact-contracts.md | not run |  | inspection of skills and docs links |
| R1 | full repository validation and test suite | not run |  | `mise run validate && bun test tools/validate` |
| V1 | diff read against AC1 and AC2 | not run |  | git diff inspected against spec SC8-SC9 |

## Plan

1. Create `.claude/agents/validator-guide.md` with minimal tools (ReadFile, Glob, Grep, Bash for running explain/authoring) and explicit phase documentation.
2. Create `.claude/agents/researcher.md` with read-only inspection tools (ReadFile, Glob, Grep) and explicit phase documentation.
3. Create `.claude/skills/validator-flow/SKILL.md` and `.agents/skills/validator-flow/SKILL.md` documenting authoring vs full modes, exit codes, finding templates, and `--explain <rule>`.
4. Link `validator-flow` from `docs/development.md` and `docs/artifact-contracts.md`, and rebuild contract copy (`bun run build:contract-copy`).
5. Run repository validation and tests, commit implementation, regenerate manifest if needed, seal task, and advance parent checkpoint.
