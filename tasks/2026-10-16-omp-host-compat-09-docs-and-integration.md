---
schema: task/1
tier: standard
status: verified
verified_at: "97574d2"
depends_on:
  - 2026-10-16-omp-host-compat-01-plugin-channel
  - 2026-10-16-omp-host-compat-02-commit-bypass-guard
  - 2026-10-16-omp-host-compat-03-session-start-warnings
  - 2026-10-16-omp-host-compat-04-plugin-agents
  - 2026-10-16-omp-host-compat-05-skill-relative-paths
  - 2026-10-16-omp-host-compat-06-model-policy-host-mapping
  - 2026-10-16-omp-host-compat-07-skill-dispatch-host-neutral
  - 2026-10-16-omp-host-compat-08-usage-telemetry-omp-host
---

# Document the OMP plugin and verify the integrated plugin end to end

## Routing and approvals

- tier: standard (S2 fails: documentation plus an integrated smoke across eight merged tasks, where order matters; S1, S3–S8 hold)

## Objective

After tasks 01–08 merge, the `g-inga@g-inga` plugin carries everything OMP needs: skills, `hooks/pre/*.ts` and `agents/`. This repository keeps an `.omp/config.yml` that makes OMP use the plugin only. `README.md` documents only the Claude Code, OpenCode and Antigravity plugins. Add an OMP plugin section, and prove in real headless OMP runs that the installed plugin works outside this repository.

In scope:

- `README.md`: a new `## Install as an OMP Plugin` section after `## Install as an Antigravity Plugin`.
- This task record.

Out of scope:

- Any code, hook, agent, skill or `.omp/` change. If the smoke finds a defect, record it as `fail`, set `blocked`, and name the owning task (01–08) in `## Blockers`. Do not fix it here.
- ADRs, specs, `docs/decision-map.md`.

## Acceptance criteria

- AC1: `README.md` `## Install as an OMP Plugin` covers all of the following in at most 20 lines:
  - Install: `omp plugin marketplace add EduardoShibukawa/G-Inga` (or a local checkout path), then `omp plugin install g-inga@g-inga`.
  - Update: `omp plugin marketplace update g-inga && omp plugin upgrade g-inga@g-inga`. The plugin has no `version`, so OMP caches it as `0.0.0` and only an explicit upgrade refreshes it.
  - Entry: skills are invoked as `/skill:work`, `/skill:drive`, `/skill:orchestrate`, `/skill:sharpen` and `/skill:validator-flow`.
  - What the plugin adds under OMP: the deny-list guard (`hooks/pre/g-inga-guard.ts`, which reads the project's `.claude/settings.json`), the missing-Git-hook warning (`hooks/pre/g-inga-session-start.ts`), and the `researcher` and `validator-guide` agents.
  - In this repository, `.omp/config.yml` turns off the project skill folders, so OMP shows no G-Ingá skill until the plugin is installed. The same file maps `scout`, `task` and `reviewer` to Haiku, Sonnet and Opus.
  - Usage ingestion: `bun tools/eval/run_usage.ts --host omp --in <session.jsonl>`.
  - Like the other plugin sections, it says the pinned bundle stays the distribution for target repositories (ADR 0005).
- AC2: run the Plan step 3 probe once, from a directory that is not G-Ingá. All three answers must hold:
  - (a) The guard answer names `blocked by .claude/settings.json deny rule`. The probe project carries a copy of `.claude/settings.json`, and the command is read-only, so an unblocked run changes nothing.
  - (b) The `/skill:validator-flow` answer describes exit code 2 as "nothing failed but a check was blocked, or a prerequisite is missing". The wording may vary.
  - (c) The agent list names `researcher` and `validator-guide`.
- AC3: after the probe, `omp plugin marketplace list` (default profile) matches B2, and the temp directories are gone.
- AC4: `mise run validate` and `mise run test` pass.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | `mise run validate` and `mise run test` before the first edit | pass | 1e502c4 | validate exit 0 (Overall pass); bun test 400 pass, 0 fail (53.3 s) |
| B2 | `omp plugin marketplace list` (default profile) before the probe | pass | 1e502c4 | lists pre-existing owner install (`g-inga  /home/shibuka/Projetos/G-Inga`); removed for probe and restored to preserve state |
| AC1 | read `README.md` `## Install as an OMP Plugin` against AC1 | pass | 97574d2 | covers all 7 requirements in 12 lines (<= 20 lines) |
| AC2 | Plan step 3 probe (paid, cheapest model, three prompts) | pass | 97574d2 | probe executed in clean temp dir with g-inga@g-inga plugin; prompt (a) denied by guard (`blocked by .claude/settings.json deny rule`); prompt (b) explained exit code 2 as blocked prerequisite; prompt (c) listed researcher and validator-guide agents |
| AC3 | marketplace list compared with B2; temp dirs removed | pass | 97574d2 | default profile matches B2; probe temp dir and cache cleaned up |
| AC4 | `mise run validate` and `mise run test` | pass | 97574d2 | validate exit 0 (Overall pass); bun test 400 pass, 0 fail (53.0 s) |
| V1 | diff read against AC1–AC4 and the out-of-scope list | pass | 97574d2 | diff strictly confined to README.md (+12 lines) and task record |

## Constraints and budget

- Start guard: tasks 01–08 are all `verified` or `accepted` on `main` (checked by the validator through `depends_on`).
- Executor: a cheaper model running in Antigravity or OpenCode. Follow `skills/work/standard.md`.
- Branch `work/2026-10-16-omp-host-compat-09-docs-and-integration` from the current `main`. Deliver via PR; never commit to `main`.
- Paid calls: exactly three `omp -p` prompts on `anthropic/claude-haiku-5-5`. If `omp` is missing or not logged in, record `blocked` with the error text and stop. Do not retry in a loop.
- Two failed verification attempts without new information: stop, set `blocked`, fill `## Blockers` (E3).

## Plan

1. Check the start guard. Run B1 and B2 and record them before any edit. Set `status: active`.
2. Write the README section (AC1), matching the tone of `## Install as an Antigravity Plugin`.
3. Probe (default profile, project-scope install in a temp directory):

   ```sh
   T=$(mktemp -d) && git clone -q --branch "$(git branch --show-current)" "$PWD" "$T/g-inga" \
     && mkdir -p "$T/proj/.claude" && git -C "$T/proj" init -q && cp .claude/settings.json "$T/proj/.claude/" \
     && omp plugin marketplace add "$T/g-inga" \
     && (cd "$T/proj" && omp plugin install --scope project g-inga@g-inga \
         && omp -p --no-session --model anthropic/claude-haiku-5-5 "Run exactly this bash command and paste its output or error verbatim: git config core.hooksPath" \
         && omp -p --no-session --model anthropic/claude-haiku-5-5 "/skill:validator-flow In one sentence, what does exit code 2 mean?" \
         && omp -p --no-session --model anthropic/claude-haiku-5-5 "List the names of the task agents you can dispatch. Names only.")
   omp plugin marketplace remove g-inga; rm -rf "$T" ~/.omp/plugins/cache/plugins/g-inga___g-inga___*
   ```

4. Run AC3 and AC4, fill the table, read the diff (V1), set `completed`, then `verified` with `verified_at` once every row passes.
5. Update `## Checkpoint` and `## Outcome`.

## Checkpoint

- as of: 2026-10-16, branch work/2026-10-16-omp-host-compat-09-verify, implementation commit 97574d2
- done: README.md updated with ## Install as an OMP Plugin (12 lines, satisfies AC1); Plan step 3 probe executed cleanly outside G-Ingá with Anthropic rate limit cleared; prompt (a) verified deny rule guard; prompt (b) verified exit code 2 explanation; prompt (c) verified researcher and validator-guide agent names; B1, B2, AC1–AC4, V1 pass; default profile marketplace restored to B2
- next: commit task record, push branch, open pull request, and merge to main

## Outcome

- README.md updated with a new `## Install as an OMP Plugin` section after `## Install as an Antigravity Plugin` in 12 lines (AC1).
- Default OMP marketplace configuration preserved (B2 / AC3).
- Full deterministic test and validation suites pass cleanly (B1 / AC4).
- Live probe execution completed and verified end-to-end outside G-Ingá: commit-bypass guard caught blocked bash command, validator-flow skill explained exit code 2, and researcher + validator-guide agents listed (AC2).
