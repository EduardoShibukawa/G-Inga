---
schema: task/1
tier: standard
status: verified
verified_at: "3e6b4d5"
---

# Record the Personal Plugin Channel in ADR 0005

## Routing and approvals

- tier: standard (S1–S4 hold: the decision shipped in PR #34; docs-only diff following the ADR's own revision pattern. S5 borderline: records harness distribution policy without changing behavior, so the ADR text needs owner acceptance)
- approved: owner request (2026-10-13, "Ficou anotado como pendência na task ... registrar o canal de plugin na ADR 0005 e no decision map. Vamos fazer isso")
- approved: ADR 0005 revision FU7 and decision-map note by owner (2026-10-13, "Aceitar (Recomendado)")

## Objective

Close the follow-up from `tasks/2026-10-13-plugin-marketplace-manifest.md`: record the personal plugin channel as ADR 0005 FU7 and in `docs/decision-map.md`, and land the task-record commit (5e1c63b) that missed the PR #34 merge.

- In scope:
  - `docs/decisions/0005-native-primitive-mapping.md`
  - `docs/decision-map.md`
  - `tasks/2026-10-13-plugin-marketplace-manifest.md` (cherry-picked owner install check)
  - `tasks/2026-10-13-record-plugin-channel-adr-0005.md`
- Out of scope:
  - `.claude-plugin/`, `.claude/skills/`, `manifest.json`, specs and spec hashes.
  - ADR 0001 text (its deferral is refined through the decision map and FU7).

## Acceptance criteria

- AC1: ADR 0005 has an accepted 2026-10-13 revision bullet and a `## FU7` section stating the channel is personal, the pinned bundle stays the distribution for target repositories and CI, versioning follows commits, and the V1 spec is unchanged.
- AC2: ADR 0005 item 9 scopes the deferral to plugin packaging as a product distribution channel and points to FU7.
- AC3: `docs/decision-map.md` D5 row and the deferred list mention FU7.
- AC4: The install-check record from 5e1c63b is on this branch.
- AC5: `mise run validate` passes.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | baseline validate | pass | 8a82e05 | `mise run validate` Overall pass |
| AC1 | ADR 0005 revision and FU7 section | pass | 3e6b4d5 | revision bullet and `## FU7 ... (accepted 2026-10-13)` present; personal-use, versioning and V1-spec bullets present |
| AC2 | item 9 wording | pass | 3e6b4d5 | "as a product distribution channel stays deferred ... FU7" |
| AC3 | decision map D5 row and deferred list | pass | 3e6b4d5 | 2 FU7 mentions in `docs/decision-map.md` |
| AC4 | cherry-picked task record | pass | 3e6b4d5 | "Owner install check" in `tasks/2026-10-13-plugin-marketplace-manifest.md` |
| AC5 | validate | pass | 3e6b4d5 | `mise run validate` Overall pass |
| V1 | diff read against AC1-AC4 and the out-of-scope list | pass | 3e6b4d5 | 4 files, 66 insertions, 5 deletions; 0 files under `.claude-plugin/`, `.claude/skills/`, `manifest.json`, `specs/` |

## Outcome

ADR 0005 records the personal plugin channel as FU7 (accepted 2026-10-13), and the decision map narrows the plugin deferral to product distribution. The install-check record that missed the PR #34 merge is on this branch.

## Checkpoint

- as of: 2026-10-13, branch docs/adr-0005-plugin-channel, head 3e6b4d5, task verified
- done: ADR 0005 FU7, decision-map note, cherry-picked install check, AC1-AC5 and V1 pass
- next: owner review and PR merge
