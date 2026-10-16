# Artifact contract validator findings

**Status:** open findings from encoding the accepted [artifact contracts](../artifact-contracts.md) ([ADR 0003](../decisions/0003-minimum-artifact-schemas.md)) as checks. None changes the contract. Each needs an owner decision before the validator can treat it as settled.

Recorded 2026-10-10 while building `tools/validate/` ([development](../development.md)).

## Ambiguities the validator reports instead of resolving

| ID | Sections | Finding | What the validator does now |
|---|---|---|---|
| F1 | §3.3, §4.4 | A `heavy` parent becomes `verified` only if "every child that isn't `cancelled` is `verified` or `accepted`" (§3.3). §4.4 says a `partial` child "doesn't count toward the parent" | reports `blocked` when a parent is `verified` or `accepted` with a `partial` child (fixture X6 in `tools/validate/artifacts/fixtures.ts`) |
| F2 | §3.3, §8 | "The owner can cancel from any state that isn't terminal", but §3.3 doesn't define terminal. §8 lists `verified`, `accepted`, `partial` and `cancelled` as terminal for `task/1` | adds one edge from prose, `completed → cancelled`, listed in `transitions_from_prose` |
| F3 | §3.4, §3.6, §9.3 | A `B` row "keeps the commit it ran on; it isn't refreshed" (§3.4), yet the checkpoint examples say "rerun it if main moved". It isn't defined whether a rerun replaces the row's `Ref` or adds a new `B` row | checks only that each `B` commit is a strict ancestor of `verified_at`, not that a `B` row's `Ref` never changes |
| F4 | §3.4 | `Ref` is "the short commit SHA … plus a log path", with no separator or SHA length. Comparisons with `verified_at` are exact | extracts clean SHA via `extractRefSha` (supporting backticks and trailing paths), resolves via `git rev-parse`, and degrades to `blocked` when history is unavailable ([ADR 0012](../decisions/0012-authoring-vs-full-validation-modes.md), SC4) |
| F5 | §3.4 | Attribution: "when both rows list failing checks, the `R` list is a subset of the `B` list". The list format isn't defined | checks that the cited `B` row exists and is `fail`; the subset check is not run |
| F6 | §4.3 | The hash covers "every byte after the closing `---`", while the `awk` illustration drops the newline after `---` and ends every line with a newline | follows the `awk` definition; a test compares both on the same file |
| F7 | §3.4 | "A `standard` task and a `heavy` parent" need a `B` and a `V` row. Children are `tier: standard`, so it's unclear whether the rule covers them | applies it to children |
| F8 | §7.1 | "The guards of `cur.status` must hold at `cur`" for every committed transition. A past invalid commit then fails forever, and there's no waiver | settled by [ADR 0012](../decisions/0012-authoring-vs-full-validation-modes.md): `--authoring` mode checks current tree only without history walk; full gate keeps immutable history walk for audit integrity (SC1, SC2) |
| F9 | §8 | `spec/1` lists only `superseded` as terminal, so an `approved` spec of finished work can never be frozen on a retired major. It has to be migrated, and a body migration needs reapproval | implemented as written |
| F10 | §6.1 | Deleting an untracked, agent-created record leaves no Git trace, so case 1 can't be checked. Whether the agent is "the only author" is judgment | fails only when a committed task record is deleted |
| F11 | §7.1, §6.1 | §7.1 lists deletion as a failure for specs. For task records it follows from §6.1 ("never deleted"). A renamed record looks like a deletion | fails a committed task record's deletion or rename |
| F12 | §3.2 | A `## Review` finding's resolution (`fixed in`, `rejected:`, `open`) has no fixed line format | a bullet line ending in `open` counts as open |
| F13 | §3.3 | A blocked child's `## Blockers` "names the spec version awaiting approval", in no fixed format | checks only that `## Blockers` isn't empty |
| F14 | `CLAUDE.md`, decision map | `CLAUDE.md` lists `proposed`, `accepted`, `open` and `superseded`; the decision map adds `rejected` | uses the decision map's list |

## Rules not encoded yet

- Start guard on `depends_on` (`todo → active` needs every dependency `verified` or `accepted`). It's a transition guard, and the history walk doesn't check it yet.
- Log grammar beyond the tier entries (`escalated:` reasons, `approved:` subjects, `<ref>` format), the checkpoint format and the secrets scan (§7).
- Same-failure judgment for attribution and every "agent judgment" or "owner" row of §7.
