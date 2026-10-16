# Resume Procedure

Procedure for resuming paused or inter-session tasks in G-Ingá.

## Invocation

Called via `/work resume <task-id>` or when resuming work referenced in `tasks/<task-id>.md`.

## Steps

1. **Locate Task Record:**
   - Read `tasks/<task-id>.md`.
   - Inspect YAML frontmatter (`status`, `tier`, `parent`, `spec`, `depends_on`).

2. **Reconcile Git State:**
   - Read the latest entry in `## Checkpoint`.
   - Compare recorded branch, commit SHA, and modified files with actual working tree (`git status`, `git log -n 1`).
   - If working tree differs from checkpoint, reconcile and note differences before continuing.
   - Any verification rows whose `Ref` commit is not an ancestor of the current HEAD must be flagged as stale and re-verified.

3. **Check Dependencies:**
   - If `depends_on` lists tasks, verify that each dependency has `status: verified` or `status: accepted`.
   - If any dependency is incomplete, stop and report `blocked`.

4. **Verify Spec Alignment (Heavy Children):**
   - If task has `spec: <spec-id>@<version>`, inspect `specs/<spec-id>.md`.
   - Verify that spec is `status: approved` at that version.
   - If spec has been reopened or superseded, handle per `references/artifact-contracts.md` (relative to this skill's directory) §4.4.

5. **Resume Execution:**
   - Remove or update blocker in `## Blockers`.
   - Transition `status: active`.
   - Continue execution under `standard.md` or `heavy.md`.

## Parent Checkpoint After Each Child (`/drive`, `/orchestrate`)

Shared by `/drive` Step 1 and Step 6 and by `/orchestrate` OBSERVE and SEAL. The format is `references/artifact-contracts.md` §3.6.

### Write after each verified child

After a child is sealed, replace the parent's `## Checkpoint` (the latest replaces the previous one) with:

```markdown
## Checkpoint

- as of: <date>, branch <branch>, head <short-sha>, worktree <clean | dirty (files)>
- done: <verified children, by id, with the sealing SHA>
- active: <children in `active` or `completed`, or none>
- blocked: <children in `blocked` with the blocker, or none>
- next: <the next eligible child id and its first action>
- revalidate: <rows whose Ref isn't the current head, or none>
- resume prompt:

  ~~~text
  Resume <parent-id> on branch <branch>. Expected head <short-sha>.
  Read the parent's ## Checkpoint, then reconcile it with `git status`, `git log -n 1` and the child statuses.
  If the head or any child status disagrees with the checkpoint, report the difference and dispatch nothing until it is reconciled.
  Otherwise continue with child <next-id>. Done: <ids>. Blocked: <ids or none>.
  ~~~
```

### Reconcile on start

Before any dispatch, compare the latest `## Checkpoint` with Git:

1. The current branch equals the recorded branch.
2. The recorded head equals HEAD, or is its ancestor (`git merge-base --is-ancestor <recorded> HEAD`) with only the commits that seal the children named in `done`.
3. Every child named in `done` has `verified` or `accepted` in its record, and no other child is further along than the checkpoint says.
4. The worktree matches the recorded worktree state.

Any mismatch is reported (recorded value, actual value) and stops the start: no child is dispatched until the checkpoint is corrected or the difference is explained and recorded. Treat a row whose `Ref` isn't the current head as stale until rerun or judged unaffected.
