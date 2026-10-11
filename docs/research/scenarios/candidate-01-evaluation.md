# Candidate 01: Compact Routing Prompt Specification

## 1. Baseline vs Candidate Comparison

| Metric | Baseline (`.claude/skills/work/SKILL.md`) | Candidate 01 (Compact) | Delta |
|---|---|---|---|
| Characters | 4,453 | 3,630 | -823 (-18.5%) |
| Words | 591 | 472 | -119 (-20.1%) |
| Lines | 83 | 75 | -8 lines |
| Estimated Tokens | ~1,100 | ~890 | ~-210 tokens per invocation |

## 2. Formulation Invariants Preserved

- All 8 signals (S1–S8) preserved with their exact core criteria (intent clarity, approach clarity, single module footprint, two-way door reversibility, sensitive domain protection, passing baseline, rapid detectability, single session scale).
- All 6 heavy triggers (H1–H6) preserved verbatim in logic.
- Light tier all-of checklist preserved.
- Standard default preserved.
- Escalation triggers (E1–E5) and Light procedure output structure preserved.

## 3. Evaluation on Frozen Scenarios R01–R17

When evaluated against `docs/research/scenarios/r01-r17-v1.json`:
- **Agreements:** 17/17 (100.0%)
- **Critical Under-Routes:** 0
- **Over-Routes:** 0

## 4. Governance Implications

- Modifying the bundle distribution asset `.claude/skills/work/SKILL.md` directly in target repos requires a bundle version release or regeneration of `manifest.json`.
- Keeping this candidate documented and validated on the research branch preserves bundle provenance while establishing empirical evidence for future bundle releases.
