<!-- Adapted from Matt Pocock's skills at 49dd158: skills/productivity/grilling/SKILL.md and skills/engineering/domain-modeling/SKILL.md -->
# Question Rounds Procedure

This procedure governs structured question rounds for G-Ingá. It is the single source of truth for both the `/sharpen` standalone skill and the `/work` heavy route (step 2). It contains G-Ingá's own text, not a close copy of upstream.

## Purpose

Interview the owner until shared understanding exists. Map decisions as a **design tree**: every decision branches into the decisions that hang off it. Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled — the questions you can ask now without guessing at answers you haven't heard yet.

## Round Mechanics

1. **Ask the whole frontier in one round.** Number each question (Q1, Q2, …) and give your recommended answer with clear rationale.
2. **Dependent questions wait.** A question whose answer depends on another question still open in this round belongs to a later round, not this one.
3. **Record owner decisions.** Each answer becomes `decided: <question> → <answer> by owner (<date>, "<ref>")`.
4. **Recompute the frontier.** Settled decisions push the frontier outward and unblock questions that depended on them. Ask the next round.
5. **Done when empty.** The session ends when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. The owner must confirm shared understanding before any action is taken.

### Question Format

```text
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer with rationale>
```

## Facts versus Decisions

- **Facts are the agent's job.** Never ask the owner for anything you could look up yourself (filesystem, codebase, tools, docs).
- **Read-only subagents for broad lookups.** When a frontier question needs a fact from the environment and the lookup is broad, dispatch a read-only subagent (Haiku model, no write tools) to find it. Do not block the round on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the subagent to report — ask the rest of the frontier now.
- **Decisions are the owner's.** Put each decision to the owner and wait. Never assume or infer a decision.

## Domain Discipline

During every round, actively sharpen the project's domain model:

### 1. Challenge against the glossary

When the owner uses a term that conflicts with `docs/glossary.md`, call it out immediately: *"Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"*

If `docs/glossary.md` does not exist, create it lazily when the first term is resolved.

### 2. Sharpen fuzzy language

When the owner uses vague or overloaded terms, propose a precise canonical term: *"You're saying 'account' — do you mean the Customer or the User? Those are different things."*

### 3. Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the owner to be precise about the boundaries between concepts.

### 4. Cross-reference with code

When the owner states how something works, check whether the code agrees. If you find a contradiction, surface it: *"Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"*

### 5. Write resolved terms to `docs/glossary.md` immediately

When a term is resolved, write it to `docs/glossary.md` right there. Do not batch these up — capture them as they happen.

**Glossary format** (plain repository doc, not a contract artifact):

```md
# Glossary

**Order**:
A customer's request for products or services.
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request
```

Rules:

- Be opinionated: when multiple words exist for the same concept, pick the best one and list the others under `_Avoid_`.
- Keep definitions tight: one or two sentences max. Define what it IS, not what it does.
- Only include terms specific to this project's context. General programming concepts don't belong.
- Group terms under subheadings when natural clusters emerge.
- **No implementation details.** The glossary is a vocabulary reference, not a spec or scratch pad.

### 6. Migrate existing `CONTEXT.md`

If a `CONTEXT.md` exists at the repository root, migrate its terms into `docs/glossary.md` on first use of this procedure, then remove `CONTEXT.md`.

## ADR Offers

Offer an ADR **only when all three conditions are true**:

1. **Hard to reverse** — the cost of changing your mind later is meaningful.
2. **Surprising without context** — a future reader will wonder "why did they do it this way?".
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons.

If any condition is missing, skip the ADR.

When offered, write it to `docs/decisions/` as `proposed` with status frontmatter `proposed`. Only the owner accepts it (changes status to `accepted`).

**ADR format** (minimal, per ADR 0004 item 5):

```md
# {Short title of the decision}

{1-3 sentences: what's the context, what did we decide, and why.}

Status: proposed
```

Optional sections (only when they add genuine value):

- **Considered Options** — only when rejected alternatives are worth remembering.
- **Consequences** — only when non-obvious downstream effects need to be called out.

Numbering: scan `docs/decisions/` for the highest existing number and increment by one (e.g., `0005-...`, `0006-...`).

## Standalone Mode (`/sharpen`)

When invoked as `/sharpen <idea or plan>`:

- Run the procedure above.
- Persist **only** glossary entries (`docs/glossary.md`) and owner-accepted ADR drafts (`docs/decisions/*` with `Status: accepted`).
- Do not create task or spec files.
- Close with a **decision summary** listing every `decided:` line and every glossary term added/updated.
- Offer to open `/work` with the captured decisions as input.

## Heavy Mode (`/work` heavy route, step 2)

When invoked from `/work` heavy route step 2:

- Run the procedure above.
- **Every owner answer becomes a `decided:` line in the parent task record** (not just in the session).
- The procedure feeds directly into spec authoring (step 2 continued: author specification in `specs/<id>.md`).
- No implementation before the owner confirms shared understanding and the spec is approved.

## Provenance

Technique adapted under ADR 0004 item 5 from:

- `mattpocock/skills` at commit `49dd158`
  - `skills/productivity/grilling/SKILL.md` — frontier rounds with recommended answers, fact-finding via subagents, decisions to owner
  - `skills/engineering/domain-modeling/SKILL.md` — term challenge, fuzzy language sharpening, edge-case scenarios, claim-vs-code cross-check, glossary inline updates, three-condition ADR rule

G-Ingá's text is original; only the technique structure is adapted.
