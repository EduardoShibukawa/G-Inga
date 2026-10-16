---
schema: task/1
tier: standard
status: completed
parent: 2026-10-16-canonical-skills-root-layout
spec: 2026-10-16-canonical-skills-root-layout@1
---

# Canonical skills root layout: directory unification and host symlinks

## Routing and approvals

- tier: standard (S1, S2)
- parent: 2026-10-16-canonical-skills-root-layout

## Objective

Create canonical root `skills/` directory housing all harness skills (`drive`, `orchestrate`, `sharpen`, `validator-flow`, `work`), establish symlinks for `.claude/skills`, `.agents/skills`, and `.opencode/skills`, and update host plugin configurations.

In scope:

- Move/unify skills into root `skills/` (`skills/drive/`, `skills/orchestrate/`, `skills/sharpen/`, `skills/validator-flow/`, `skills/work/`).
- Create symlinks for `.claude/skills`, `.agents/skills`, and `.opencode/skills` pointing to `../skills`.
- Update `.claude-plugin/plugin.json` to `"skills": ["./skills/"]`.
- Update `packages/opencode-plugin/index.ts` to add `join(REPO_ROOT, "skills")` as primary candidate in `SKILL_ROOTS`.

Out of scope:

- Bundle manifest and validation tool modifications (handled in child 02).

## Acceptance criteria

- AC1: `skills/` contains `drive/`, `orchestrate/`, `sharpen/`, `validator-flow/`, and `work/`.
- AC2: `.claude/skills`, `.agents/skills`, and `.opencode/skills` resolve to `skills/` without physical file duplication.
- AC3: `.claude-plugin/plugin.json` points to `./skills/`.
- AC4: `packages/opencode-plugin/index.ts` finds skills in `skills/`.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | check | fail | 3bd870f | Pre-change: skills/ does not exist |
| B2 | check | pass | 3bd870f | Pre-change plugin tests pass |
| AC1 | ls skills/ | pass | 25cabda | Canonical skills/ contains all 5 skills |
| AC2 | readlink .claude/skills | pass | 25cabda | Host directories symlinked to ../skills |
| AC3 | cat .claude-plugin/plugin.json | pass | 25cabda | Plugin sources ./skills/ |
| AC4 | bun test packages/opencode-plugin/index.test.ts | pass | 25cabda | Plugin tests pass |

## Checkpoint

- as of: 2026-10-16, branch `work/canonical-skills-01-directory`, head 25cabda, worktree clean
- done: unified skills/ directory, host symlinks created, plugin.json and opencode-plugin updated
- active: none
- blocked: none
- next: ready for verification gate and commit
- revalidate: none
