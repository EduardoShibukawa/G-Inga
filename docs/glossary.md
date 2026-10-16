# Glossary

**Intent artifact**:
A version-controlled proto-spec written in the originator's own words that starts a heavy task. It preserves the original prompt and becomes the source for the derived specification.
_Avoid_: request, prompt, issue

**Authoring validation**:
Structural and current-state validation used while iterating. It is faster than full validation and is not accepted as evidence by CI or pre-commit.

**Full validation**:
The complete deterministic gate, including Git history, commit ancestry and all verification-row rules.

**Baseline row (B)**:
A verification row that records the state of the relevant checks before the first edit. Its `Ref` must be a strict ancestor of `verified_at`.

**verified_at**:
The quoted short commit SHA at which a task or parent is declared `verified` or `accepted`.

**Scoped subagent**:
A narrowly defined agent with one job, restricted tools and a clean return value, used to keep context small and repeatable tasks mechanical.
_Avoid_: general agent, multi-role agent
