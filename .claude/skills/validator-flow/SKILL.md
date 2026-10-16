---
name: validator-flow
description: Explains the G-Ingá validator flow, authoring vs full modes, exit codes, finding templates, and repair steps.
disable-model-invocation: true
---

# /validator-flow — G-Ingá Validator Guide

This skill documents how agents and developers interact with the G-Ingá repository and artifact validator.

## 1. Validation Modes

| Mode | Command | Scope | History Walk | Pre-commit / CI Gate |
|---|---|---|---|---|
| **Authoring** | `bun run validate:authoring` or `bun tools/validate/main.ts --authoring` | Current working tree snapshot | Skipped | No (iterative only) |
| **Full** | `mise run validate` or `bun run validate` | Complete repository and Git history | Mandatory | Yes (gate of record) |

### When to use which mode

- Use **Authoring mode** while authoring tasks, drafting specifications, and actively implementing code changes. It provides sub-second feedback on syntax, links, frontmatter, and verification tables without requiring past commit history or ancestor proofs.
- Use **Full mode** before sealing tasks, marking tasks `verified`, and creating Git commits. The `pre-commit` hook automatically enforces full mode on every commit.

## 2. Exit Code Semantics

The validator uses a strict 3-state exit code convention:

- `0` (**pass**): Every applicable check passed or was legitimately `not run` with an auditable reason.
- `1` (**fail**): A deterministic contract rule was violated (e.g., malformed frontmatter, broken link, invalid status transition, missing verification row). Must be repaired in the artifact or code.
- `2` (**blocked**): A required external prerequisite or tool is missing (e.g., dependencies uninstalled, missing Git repository, missing browser for Mermaid rendering, or shallow Git history).

## 3. Finding Structure

Every current-tree finding emitted by the validator provides structured diagnosis:

```text
<file> <rule> working tree: <detail> (observed: <what was found>; expected: <what the contract requires>; next: <concrete repair step>)
```

Example:

```text
tasks/2026-10-12-x.md §3.4 working tree: status is verified, which needs at least one V row (observed: tasks/2026-10-12-x.md (verified); expected: verification table and commit-order evidence; next: Keep `B` row `Ref` at the pre-change ancestor commit, set `AC`/`SC`/`R`/`V` row `Ref` to `verified_at`, and include at least one `B` and one `V` row.)
```

## 4. Rule Explanations (`--explain`)

To inspect a rule's contract rationale and repair guidance without running repository checks:

```sh
# List all registered rules
bun tools/validate/main.ts --explain

# Inspect a specific rule (accepts "§3.4", "3.4", etc.)
bun tools/validate/main.ts --explain 3.4
```

Rules covered include §2.2 (frontmatter quoting & skip reasons), §2.3 (routing log grammar), §2.4 (check vocabulary), §3.1–§3.4 (task frontmatter, sections, state machine, verification tables), §4.1–§4.5 (spec schemas, hashes, intent artifacts), §6.1 (deletion prevention), §7 (validation modes & gates), §7.1 (history walk invariants), and §8 (schema registry & retired-major freeze).
