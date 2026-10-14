---
schema: task/1
tier: standard
status: completed
parent: 2026-10-14-harness-hardening
spec: 2026-10-14-harness-hardening@1
---

# Subagent Model Policy

## Routing and approvals

- tier: standard (decomposed from heavy parent 2026-10-14-harness-hardening after spec v1 approval)

## Objective

Make every subagent dispatch in `work`, `drive` and `orchestrate` name a model by role, with one escalation to Opus, and record model and token totals per child.

- In scope: the three skills' Claude Code copies and their supporting files, host-parity notes for the other copies.
- Out of scope: custom agent definitions; changing the main session model.

## Acceptance criteria

- AC1 = SC4.
- AC2 = SC5.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | repository validation and test suites before change | pass | 2edf21e | parent B1/B2: `mise run validate` exit 0, `mise run test` 242 pass |
| B2 | repository validation suite before change | pass | d80069c | `mise run validate` exit 0 (Overall: pass) |
| B3 | repository test suite before change | pass | d80069c | `mise run test` exit 0: 253 pass, 0 fail |
| AC1 | SC4: one shared role-to-model table, model-named dispatches, Sonnet→Opus escalation (text check) | pass | 8f4ec8e | `references/model-policy.md` maps read-only search→Haiku, implementation→Sonnet, spec authoring→Opus, adversarial review→Opus; dispatches name models (reviewer/authoring on Opus in `work`, worker on Sonnet and `Explore` on Haiku in `drive`/`orchestrate`); retry-on-Opus then E3 in `drive` Layer 5 and `orchestrate` Layer 5 |
| AC2 | SC5: per-child cost note in ADR 0006 vocabulary (text check) | pass | 8f4ec8e | `drive` and `orchestrate` record `tokens_input`, `tokens_output`, `cache_read_tokens`, `cache_write_tokens`, `total_tokens`, `cache_read_ratio` with no prompt content; `subagent-prompt.md` report gains `model` + `usage` |
| R1 | repository validation and test suites after change | fail | 8f4ec8e | `mise run validate` exit 0 (Overall: pass); `mise run test` exit 1 — editing bundle assets `heavy.md`, `procedure.md`, `review.md` invalidated `manifest.json` (`manifest.mjs --check` reports the 3 drifted assets), and that drift cascades into the bundle and commit-gate tests that call `updateBundle`; regenerating `manifest.json` is out of scope (Gate 1, owned by `-02-bundle-validate-step`) |
| V1 | self-review of diff against AC1–AC2 | pass | 8f4ec8e | every subagent dispatch names a model; no model-less dispatch remains; shared table referenced, not duplicated |

## Plan

1. Add one role-to-model table where the three skills share it.
2. Set `model` on every dispatch, including `Explore` spikes.
3. Add the escalation step and the per-child cost note format (ADR 0006 vocabulary).
4. Update the parity inventory for the other host copies.

## Outcome

The three skills now share one canonical role-to-model table (`.claude/skills/work/references/model-policy.md`): read-only search on Haiku, implementation on Sonnet, spec authoring and adversarial review on Opus. Every subagent dispatch names a model, a Sonnet worker's first verification failure retries on Opus and a second failure follows the E3 circuit breaker, and `drive`/`orchestrate` record each child's model and token totals in the ADR 0006 vocabulary with no prompt content. The `.agents/skills/` and `.opencode/skills/` copies are not edited; mirroring is pending and noted in `docs/research/2026-10-13-skill-parity-inventory.md`.

Not delivered here (out of scope, follow-ups): regenerating `manifest.json` after the three bundle assets changed, and adding `model-policy.md` to the bundle assets. Both belong to `-02-bundle-validate-step` / integrated verification. Until the manifest is regenerated, `mise run test` and `bun tools/validate/validate.ts` report the drift, so this record stays `completed`, not `verified`.
