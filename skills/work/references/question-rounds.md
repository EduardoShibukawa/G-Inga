<!-- Technique adapted from mattpocock/skills at 49dd158 (grilling, domain-modeling) under ADR 0004 item 5. The wording is G-Ingá's own. -->
# Question Rounds

One procedure, two callers: the `/sharpen` entry skill (standalone) and step 2 of the `/work` heavy route. Its job is to turn a vague idea into decisions the owner has made on purpose.

## The model

Treat the idea as a tree of choices. Some choices must be settled before others even make sense. At any moment, the choices that are ready to be asked are the ones with nothing unsettled upstream. Call that set the **ready set**. You work through the tree in numbered **rounds**, each round covering the whole ready set.

## Running a round

1. Gather every ready choice and put all of them to the owner together, numbered Q1, Q2, and so on.
2. For each, state your own pick and the reason for it, so the owner can reply "agreed" or push back. If the owner says "you choose", your pick becomes their decision and is logged as theirs. If the owner says "later", the question stays open and returns in a later round; nothing is settled on their behalf.
3. Hold back any question whose wording would change depending on another answer in the same round. It joins a later round.
4. When the owner answers, log one line per answer in the form `decided: <question> → <answer> by owner (<date>, "<ref>")`, and recompute the ready set. New questions appear as old ones close.
5. Stop when no ready choice remains and no branch was skipped. Then ask the owner to confirm that you both understand the idea the same way. Take no action before that confirmation.

Question layout:

```text
Q2 [storage] Where should the checkpoint live?
  a) in the task record  b) in a separate file
Recommend: a) it keeps one source per task, and the contract already names that file.
```

## Facts and decisions

- A fact can be found; a decision must be made. Look facts up yourself in the repository, the tools and the docs. Never spend an owner question on something you could read.
- For a wide search, hand it to a read-only subagent in the "read-only search" role of the model policy (in Claude Code that is Haiku, per `references/model-policy.md`; in other hosts, the cheapest model available). Give it no write tools. Do not pause the round for it: only questions that need its answer move to the next round; ask the others now.
- A decision always goes to the owner. Never settle one by guessing what they would probably say.

## Keeping the vocabulary honest

While the rounds run, keep `docs/glossary.md` accurate.

1. **Check terms against the glossary.** If the owner uses a word in a different sense than the glossary gives it, say so at once and ask which sense holds. Example: the glossary says a *checkpoint* is the handoff block of a task, and the owner says "checkpoint" for a git tag.
2. **Replace loose words.** When a word is vague or covers two things, propose one precise term. Example: "the record" could mean a task file or a spec file; suggest which name each should carry.
3. **Probe with concrete cases.** When the owner describes how two concepts relate, invent a specific situation that tests the boundary. Example: a task whose spec changes after approval; does it keep its id?
4. **Compare claims with the repository.** When the owner says how something works, check the files. If they disagree, show both and ask which is right. Example: the owner says specs can be edited in place, but the spec header says the approved text is frozen under its hash.
5. **Record resolved terms right away.** Write each term to `docs/glossary.md` the moment it is settled, not at the end. Create the file when the first term arrives.

Glossary entry shape (a plain repository doc, not a contract artifact):

```md
# Glossary

**Checkpoint**:
The handoff block at the end of a task record.
_Avoid_: save point, bookmark
```

Entry rules:

- Choose one preferred word per concept and list rejected synonyms after `_Avoid_`.
- Define in one or two sentences what the thing is, not what it does.
- List only words with a meaning specific to this project; leave out general programming vocabulary.
- Group entries under subheadings once clusters appear.
- Keep implementation detail out; the glossary names things and nothing else.

### Legacy `CONTEXT.md`

If a `CONTEXT.md` sits at the repository root, copy its terms into `docs/glossary.md` the first time this procedure runs. In standalone mode leave the file in place and list its removal in the decision summary for the owner to do. In heavy mode its removal may be proposed as part of the task.

## When to offer an ADR

Offer one only if all three hold:

1. Reversing it later would be costly.
2. A newcomer would not guess the reason from the code or docs.
3. Real alternatives existed and one was chosen for stated reasons.

If one of these fails, do not offer.

A drafted ADR is written to `docs/decisions/` with status `proposed`. Only the owner accepts it. Number it one above the highest file number in that folder.

Follow the house layout of the existing records:

```md
# NNNN — Short decision title

- **Status:** proposed
- **Date:** <date>
- **Deciders:** project owner

## Context

Why the decision came up, in a few sentences.

## Decision

What was chosen and why.
```

Add `## Considered options` or `## Consequences` only when they carry something a reader would otherwise miss.

## Standalone mode (`/sharpen`)

- Run the rounds as above.
- Write only two kinds of file: glossary entries in `docs/glossary.md`, and ADR drafts in `docs/decisions/` that the owner agreed to record, each with status `proposed`. Accepting an ADR is the owner's act.
- Create no task or spec file.
- Finish with a decision summary: every `decided:` line, each glossary term added or changed, each ADR draft written, and any `CONTEXT.md` removal left for the owner.
- Offer to continue under `/work` with those decisions as input.

## Heavy mode (`/work`, step 2)

- Run the rounds as above.
- Copy each `decided:` line into the parent task record, so the decisions outlive the session.
- The outcome feeds the specification written next in `specs/<id>.md`.
- Do not implement anything until the owner has confirmed the shared understanding and approved the spec.

## Provenance

Technique adapted under ADR 0004 item 5 from `mattpocock/skills` at commit `49dd158` (`grilling` and `domain-modeling`): asking by rounds with recommended answers, delegating fact-finding, challenging terms, and the three-test ADR offer. The text, formats and examples here were written for G-Ingá.
