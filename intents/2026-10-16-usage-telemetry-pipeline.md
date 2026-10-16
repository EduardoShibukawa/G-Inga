---
schema: intent/1
status: approved
---

# Continuous usage telemetry pipeline (Claude Code, Antigravity, OpenCode)

## Problem

`tools/eval/collect_usage.ts` provides basic parsers and sanitization, but telemetry collection remains manual, lacks continuous persistence in everyday usage, lacks a local OTel pipeline, and has no reproducible A/B baseline runner. ADR 0006 covers only Claude Code and Antigravity. OpenCode has been only a distribution surface (`packages/opencode-plugin`) without telemetry, and token savings evidence is largely controlled or synthetic.

## Outcome

A continuous local OpenTelemetry pipeline and reproducible A/B baseline runner covering Claude Code, Antigravity, and OpenCode, with:

- Day-to-day continuous telemetry across all three hosts (Claude Code native OTel, OpenCode via `@devtheops/opencode-plugin-otel`, and Antigravity via lifecycle hook on `Stop`/`PostInvocation` parsing `transcript.jsonl`).
- Local OTLP emission and local dashboard readiness (Grafana / SigNoz).
- Multi-host CLI and batch collector (`tools/eval/run_usage.ts`).
- Aggregator (`tools/eval/aggregate_usage.ts`) writing Markdown tables and JSON summaries to `records/usage-summary.md`.
- Contamination-guarded A/B runner (`tools/eval/ab_runner.ts`) comparing tasks with vs without G-Ingá in isolated worktrees with host skill-disable flags.
- Tabular persistence in `records/usage-ledger.tsv` following ADR 0006 vocabulary, with raw `.jsonl` traces git-ignored.
- Environment fix in `mise.toml` preventing lockfile collisions with global developer tools.

## Affected users/systems

- G-Ingá SDLC harness evaluation and telemetry tooling (`tools/eval/`).
- Multi-host agents and plugins: Claude Code (OTel), Antigravity (hooks + transcripts), and OpenCode (OTel plugin + CLI surfaces).
- Maintainers evaluating token efficiency, cost metrics, and quality scores across tasks and epics.

## Constraints

- Honest recording: reuse ADR 0006 vocabulary (`pass`, `fail`, `blocked`, `not run`, `absent`); never fabricate metrics.
- Privacy-first: sanitize PII, local-first execution, no unauthorized remote telemetry egress.
- Budgets and safety: active safety ceiling default (`SHE_BUDGET_USD=5.00`).
- Verification integrity: tests pass (`bun test tools/eval`, `mise run test`, `mise run validate`).

## Open questions

None (all sharpen round questions Q1–Q9 settled with owner on 2026-10-16).

## Original prompt

```text
Tarefa: Pipeline contínuo de métricas de uso (multi-host: Claude Code, Antigravity, OpenCode)
Contexto
tools/eval/collect_usage.ts existe (OTel/JPEG parsers, sanitização), mas coleta é manual, sem persistência nem baseline A/B real. ADR 0006 cobre apenas Claude Code/Antigravity. OpenCode é hoje só superfície de distribuição (packages/opencode-plugin), sem telemetria. Evidências de economia de tokens são controladas/sintéticas.
Objetivo
Implementar pipeline local e contínuo de telemetria + baseline A/B reprodutível, cobrindo Claude Code, Antigravity e OpenCode, com agregador e registro honesto (absent quando não medível).
Escopo (In scope)
1. Plumbing multi-host
- Entrada bun tools/eval/run_usage.ts --host <claude-code|antigravity|opencode> --in <file|-stdin> --task-id <id> --condition <with|without> --out records/usage/YYYY-MM-DD-...jsonl.
- Claude Code: logs OTel (stdin/file).
- Antigravity: envelope --output-format json ou transcript JSONL.
- OpenCode: investigar superfície (CLI --output-format, endpoints do server, logs locais) e documentar antes de implementar; adicionar parser/host ao union UsageObservation se suportado (senão, absent + justificativa).
- Reusar parsers/sanitizeText atuais.
2. Agregador
- tools/eval/aggregate_usage.ts: Markdown (tabelas) + JSON com por run e por task/epic (tokens, cache ratio, costo, duração, host/model/effort).
- Saída default records/usage-summary.md.
3. A/B real (isolado de contaminação)
- Script tools/eval/ab_runner.ts (N=3 default) rodando task representativa with vs without G-Inga, mantendo traces (--keep-temp quando applicable) e extraíndo usage real.
- Controlar confundidores (mesma task/modelo/contexto/turn-limit); logar config.
- Contaminação scaffold: validar que arm “without” não carregue skill do projeto (check automático).
4. Baseline + schema
- specs/2026-10-16-usage-telemetry-pipeline@1 com ACs/invariants; decisão de schema se artefato.
- records/usage-ledger.tsv com colunas ADR 0006 (incl. condition, quality_score).
- Commit de evidência real.
5. OpenCode specifically (follow-up ou junto, mas explícito)
- Pesquisa de telemetria OpenCode documentada em docs/research/ + decision-map.
- Hooks no plugin apenas se viável; prioridade a parser externo para manter dependency-free.
- Sem egress; sanitização de PII.
6. Gates/Tests
- Estender tools/eval/*.test.ts (parsers, agregador).
- mise task eval:usage e eval:ab (budget cap estilo SHE_BUDGET_USD; default pequeno).
- bun test tools/eval verde + run end-to-end real gerando .jsonl/agregado.
- Tratar/fixar falha ambiental do mise install em clone limpo (shim node) ou bypass documentado.
Out of scope
- Dashboard gráfico (MD/JSON basta).
- Telemetria remota/egress.
- Refactor dos skills/experimentos antigos.
Guardrails
- Reusar vocabulário ADR 0006; registrar absent/not run, nunca fabricar.
- Circuit breaker e token budget ativos.
- Privacy first.
Aceite (DOD)
- mise run eval:usage gera .jsonl + agregado MD.
- mise run eval:ab --iterations 3 gera tabela comparativa tokens/quality sem contaminação.
- mise run test && mise run validate pass (corrige shim ou documenta bypass).
- records/usage-ledger.tsv com 1 run real.
- Docs atualizados (decision-map + research d4/d7) com instruções e caveats.
Open questions (decisão rápida)
- records/usage/ git-tracked (sanitizado) vs git-ignored + amostra?
- Schema próprio para runs telemétricos ou task/1?
- Custo max por A/B run (default $5)?
Modelo/Esforço
- Implementation worker: Sonnet (1 tentativa), Opus se falhar com failure log.
- Runs pagas: cap explícito (ex. $5), opt-in.
```
