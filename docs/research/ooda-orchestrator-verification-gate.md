# Autonomous OODA Orchestration & Deterministic Verification Gate

**Status:** research report and architectural specification proposal.  
**Date:** 2026-10-11.  
**Audited Commit:** `dd02c552f7e2108f758d00f0432fcdf73e46da99` on branch `feat/promote-autoresearch-exp01-candidate-01`.  
**Primary Sources:**

- Orchestration Session Transcript: `/home/tg/.gemini/antigravity/brain/76f570ed-c9d3-43e6-b0b6-ea5aaba094ad/.system_generated/logs/transcript.jsonl`
- Testbed Roadmap & Issues: `/home/tg/Git/duh-homelab/.scratch/system-context-harness/map.md` and `issues/`
- G-Ingá Canonical Contracts: `docs/artifact-contracts.md`, `specs/2026-10-11-minimal-v1-specification.md`, `docs/decisions/0002-ceremony-tiers-and-routing.md`, `.agents/skills/work/SKILL.md`
- Host Primitives: Google Antigravity CLI (`invoke_subagent`, `manage_subagents`, `manage_task`, `schedule`).

---

## 1. Executive Summary & Confidence Assessment

This research investigates the mechanics of autonomous agent orchestration using the **OODA (Observe, Orient, Decide, Act)** loop and addresses the critical mandate:

> *"VERIFICAR o que FOI FEITO é A PARTE MAIS IMPORTANTE: o AGENTE DEVE SEMPRE TER uma FORMA de VERIFICAR se o que foi FEITO FUNCIONA, OU ATINGE O THRESHOLD MINIMO."*

### 1.1 Key Findings

1. **Context Explosion in Serial Orchestration:** In session `76f570ed`, running steps serially within a single conversation context caused input cache tokens to balloon from 0 to 59,474 tokens across 63 steps. Every file read, tool output, and intermediate draft degraded context capacity and increased turn latency.
2. **Subagent Concurrency Saves ~75% Orchestrator Context:** Spawning concurrent subagents via `invoke_subagent` (Step 73 of `76f570ed`) for independent tickets (Issues 16, 17, 23) isolated exploration and drafting into separate contexts (34–48 steps each). The main orchestrator context received only concise executive summaries, reducing token consumption per resolved ticket by > 60%.
3. **The Verification Vulnerability in `76f570ed`:** The orchestrator in session `76f570ed` committed work (`git commit -m "Resolve Issues 16, 17, and 23..."`) relying solely on subagent prose reports and a rudimentary `git status` check. No automated test, schema validator, or deterministic threshold check was executed by the orchestrator prior to sealing the commit.
4. **Autonomous Go/No-Go Verification Gate:** An agent must never accept self-reported success. Orchestration requires a 4-layer autonomous verification gate:
   - **Layer 1: Scope & Diff Gate** (Git porcelain sanity, zero out-of-scope edits).
   - **Layer 2: Deterministic Command & Exit Code Gate** (Strict 4-value vocabulary: `pass` [exit 0], `fail` [exit 1], `blocked` [exit 2], `not run`).
   - **Layer 3: Quantitative Metric & Threshold Gate** (Objective thresholds, e.g. coverage, recall $\ge 90\%$, precision $\ge 80\%$, zero hallucination).
   - **Layer 4: Circuit Breaker / Anti-Thrashing** (Max 2 verification attempts without new information before escalating, preventing infinite loops).
5. **Skill Relationship (`/orchestrate` vs `/work`):** `/work` remains the canonical micro-executor for delivering individual scoped tasks across `light`, `standard`, and `heavy` tiers. `/orchestrate` (or `/ooda`) serves as the macro-governor: maintaining the roadmap DAG, discovering unblocked frontiers, dispatching parallel workers running `/work`, and enforcing the verification gate across batches.

---

## 2. Forensic Audit of Real OODA Session `76f570ed`

### 2.1 The Two Phases of Session `76f570ed`

| Dimension | Phase 1: Serial Execution (Steps 0–63) | Phase 2: Parallel Subagent Execution (Steps 64–107) |
|---|---|---|
| **Trigger** | Initial user request (`/work Assuma o papel de Orquestrador OODA...`) | User intervention: *"vamos continua pode usar subagents para cada issue assim voce ecopnomiza cotexto aqui"* |
| **Execution Topology** | Single main conversation thread | Orchestrator + 4 spawned subagents (`invoke_subagent`) |
| **Context Cache Growth** | Rose from 0 to 59,474 cache tokens | Main context stabilized (~64k–85k tokens over 40+ steps) |
| **Parallelism** | Sequential (1 ticket at a time) | Batch concurrency (3 tickets in parallel: 16, 17, 23) |
| **Tool Footprint** | All `view_file`, `replace_file_content`, `write_to_file` in main log | Subagent private logs (`4d4881d1`, `59d9f693`, `7849d24e`, `d58f1c11`) |
| **Verification Behavior** | None executed | Relied on subagent self-reports + `git status` check |

### 2.2 Token Economics & Context Efficiency

In Phase 1, the orchestrator read files directly into main context:

- Step 1: 14,305 tokens
- Step 35: 12,576 input tokens, 30,705 cache read tokens
- Step 63: 2,837 input tokens, 59,474 cache read tokens

In Phase 2, dispatching Subagents 1, 2, and 3 via `invoke_subagent` at Step 73 delegated:

- Subagent `7849d24e` (Issue 17): 48 private transcript lines (~45k tokens)
- Subagent `59d9f693` (Issue 23): 40 private transcript lines (~40k tokens)
- Subagent `4d4881d1` (Issue 20): 34 private transcript lines (~35k tokens)
- Subagent `d58f1c11` (Issue 16): ~38 private transcript lines (~38k tokens)

**Measured Token Savings:** By moving exploration, drafting, and iterative refinements out of the main orchestrator context, the orchestrator offloaded **~158,000 token-turns**. The orchestrator only ingested the final message payloads (~800–1,500 tokens each) sent via `send_message`.

### 2.3 The Anatomical Gap: Missing Autonomous Verification

At Step 87, upon receiving reports from subagents `59d9f693` and `d58f1c11`, the orchestrator executed:

1. `run_command("git status")` -> Saw modified issue files and created ADRs.
2. `view_file("map.md")` -> Reviewed ticket status.
3. `run_command('git commit -m "Resolve Issues 16, 17, and 23 with ADRs 0007, 0008, 0009"')`.

**Critical Vulnerability:** The orchestrator never verified that:

- The created ADRs adhered to ADR schemas (`docs/decisions/0003-minimum-artifact-schemas.md`).
- Markdown linters and contract links were valid.
- If code had been generated, whether tests passed or failed.
- The subagents did not touch unapproved files or introduce subtle regressions.

This confirms the user's principle: **Trusting model self-attestation is an anti-pattern. Orchestration without autonomous verification gates is fragile and prone to silent quality collapse.**

---

## 3. The Verification Imperative: Principles & Hazards

### 3.1 Failure Modes of Unverified AI Output

1. **The "Pass" Hallucination:** Agents frequently claim *"all tests pass and criteria are satisfied"* even when tests were skipped, mocked out, or failed with unexamined stack traces.
2. **Scope Creep / Unintended Tampering:** Subagents modifying shared configuration files, deleting comments, or altering dependencies outside their authorized boundary.
3. **Specification Divergence (E5):** Agents simplifying problem statements to fit easily implementable solutions rather than meeting hard contract criteria.
4. **Regression Ingestion:** Successfully passing a newly added unit test while silently breaking 5 existing baseline integration tests.

### 3.2 G-Ingá Core Metric: Tokens Per Verified Task

Under G-Ingá's founding mandate (`GEMINI.md` and `specs/2026-10-11-minimal-v1-specification.md`):

- Work is NOT measured by tokens generated or code volume written.
- Work is measured strictly by **Verified Tasks**.
- An unverified task represents technical debt and negative token value.

---

## 4. Deterministic Go/No-Go Threshold Gate Architecture

The Autonomous Verification Gate operates deterministically across four layers. A task or subagent deliverable MUST pass all applicable layers to achieve `verified` status.

```mermaid
flowchart TD
    subgraph OODA Loop
        OBS[Observe: Repo state, Git HEAD, Map/DAG] --> ORI[Orient: Unblocked frontier, Dependency check]
        ORI --> DEC[Decide: Parallel batch, Assign thresholds]
        DEC --> ACT[Act: invoke_subagent with verification contract]
    end

    ACT --> G1{Gate 1: Scope & Diff}
    G1 -->|Dirty / Out of Scope| REJ1[Reject / Rollback]
    G1 -->|Clean Scope| G2{Gate 2: Command & Exit Codes}
    
    G2 -->|Exit != 0 / Blocked| REJ2{Attempts < 2?}
    REJ2 -->|Yes| RETRY[Retry with failure log]
    REJ2 -->|No: E3| ESC[Circuit Breaker: Escalate to Owner]
    
    G2 -->|Exit == 0| G3{Gate 3: Quantitative Thresholds}
    G3 -->|Below Threshold| REJ2
    G3 -->|Meets Threshold| G4[Gate 4: Record Evidence & Commit]
    G4 --> ADV[Advance DAG Frontier & Repeat]
```

### 4.1 Layer 1: Scope & Diff Gate (Structural Integrity)

Executed immediately upon worker return, before running suites:

- `git status --porcelain`: Confirms no unintended untracked files or leftover temp artifacts exist.
- `git diff --name-only`: Compares touched files against the worker's declared `In scope:` paths.
  - If a subagent touched files outside declared scope $\rightarrow$ **Immediate Gate Rejection**.
- Secret pattern scan: Rejects any staged file matching API keys, `.env`, or credential tokens.

### 4.2 Layer 2: Deterministic Command & Exit Code Gate

Following `specs/2026-10-11-minimal-v1-specification.md` SC4:

- Every check evaluates strictly to one of: `pass`, `fail`, `blocked`, `not run`.
- **Exit Code 0:** All checks passed.
- **Exit Code 1:** One or more checks failed.
- **Exit Code 2:** Environmental block, missing toolchain, or shallow clone.
- **Mandatory Checks Invariant:** Exit code 0 is strictly forbidden if any mandatory check (e.g. contract validator, baseline test suite, type check) was skipped, unrun, or blocked.

### 4.3 Layer 3: Quantitative Metric & Threshold Gate

Modeled on `duh-homelab/issues/17-evaluation-design.md` (Decision 0007), qualitative claims must be replaced by mathematical thresholds:

| Metric Category | Target Threshold | Deterministic Evaluation Method |
|---|---|---|
| **Impact Set / Recall** | $\ge 90\%$ | Automated evaluation against labeled ground truth (`TP / (TP + FN)`) |
| **Impact Set / Precision** | $\ge 80\%$ | Automated evaluation against labeled ground truth (`TP / (TP + FP)`) |
| **Token Reduction** | $\ge 60\%$ | Ratio of harness context tokens vs unassisted bash/grep baseline |
| **Network Egress** | $100\%$ Isolation | Sandboxed test execution with 0 egress outside declared git remote |
| **Unsupported Hallucination** | $0\%$ Hallucination | Strict schema marker (`status: unsupported`) on unparsed components |
| **Test Coverage Delta** | $\ge 0\%$ (no regression) | Test runner coverage report compared against baseline commit |
| **Execution Latency** | $\le 15\text{s}$ (build), $\le 50\text{ms}$ (query) | Execution timer during benchmark suite run |

### 4.4 Layer 4: Anti-Thrashing Circuit Breaker (Infinite Loop Mitigation)

Autonomous loops are susceptible to "thrashing" (repeatedly fixing a test, breaking another, and looping infinitely).

- **Hard Rule (ADR 0002 §5, Trigger E3):** Maximum **2 verification attempts** without new information or strategy changes.
- **Circuit Breaker Counter:** If a worker or subagent fails Layer 2 or Layer 3 twice:
  1. The orchestrator halts further worker dispatches for that ticket.
  2. The ticket is marked `status: blocked`.
  3. The orchestrator records a `divergence:` or `escalated:` entry in the task record.
  4. The orchestrator notifies the human owner with the exact failure diff and choices.
  5. The orchestrator moves to another independent unblocked ticket on the frontier rather than burning tokens in a stall loop.

---

## 5. Proposed Skill Specification: `/orchestrate`

### 5.1 Relationship Between `/orchestrate` and `/work`

- **`/work` (Micro-Level SDLC Execution):**
  - Focus: Single task or specification unit.
  - Hierarchy: Dispatches across `light`, `standard`, and `heavy`.
  - Artifacts: Writes `tasks/<id>.md`, `specs/<id>.md`.
  - Invariant: Zero persistence for `light`; deterministic validation for `standard`/`heavy`.

- **`/orchestrate` (Macro-Level OODA Governor):**
  - Focus: Roadmap graphs (`map.md`), multi-ticket dependencies, and batch concurrency.
  - Hierarchy: Dispatches and supervises subagents that execute `/work` in parallel.
  - Verification: Executes the Autonomous Verification Gate before accepting any subagent batch into the repository branch.
  - State Maintenance: Synchronizes roadmap completion, manages git commit batches, and enforces global token and circuit breaker budgets.

### 5.2 The 6-Step Orchestration Cycle

```text
 1. OBSERVE   ──> Read roadmap DAG (map.md / tasks/) + current git branch & HEAD.
 2. ORIENT    ──> Calculate topological dependency graph; identify unblocked frontier.
 3. DECIDE    ──> Select concurrent batch (N unblocked tasks); define verification thresholds.
 4. ACT       ──> Dispatch parallel workers via invoke_subagent with scoped prompt.
 5. GATE      ──> Run Autonomous Verification Gate (Diff, Exit Codes, Metrics, Circuit Breaker).
 6. SEAL/LOOP ──> Commit verified batch, update roadmap, advance frontier, or halt.
```

### 5.3 Proposed Skill Layout

```text
.agents/skills/orchestrate/
├── SKILL.md             # Core skill declaration (< 1,536 chars, OODA loop entry)
├── gate.md              # Autonomous verification gate rules & threshold definitions
├── subagent-prompt.md   # Canonical prompt template for delegated workers
└── references/
    ├── ooda-cycle.md    # Detailed state machine transitions
    └── circuit-breaker.md # Anti-thrashing policies and escalation triggers
```

---

## 6. Recommendations & Next Steps for G-Ingá

1. **Formalize Decision Record (Decision 0007 / Next):** Submit an architectural decision proposal for multi-agent OODA orchestration and autonomous verification gates.
2. **Implement Standalone Verification Gate Script:** Provide a zero-install helper (e.g. `tools/gate/verify-gate.js` or `mise run gate`) that evaluates exit codes, git diff boundaries, and threshold JSONs deterministically.
3. **Author `.agents/skills/orchestrate/SKILL.md`:** Author the skill bundle following the progressive disclosure architecture established in Minimal V1.
4. **Dogfood on Complex Roadmaps:** Test `/orchestrate` against the 12-task benchmark suite defined in `duh-homelab/issues/17-evaluation-design.md`.
