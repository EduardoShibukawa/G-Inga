# Canonical Subagent Prompt Template (`Agent` tool)

When dispatching concurrent workers via parallel `Agent` tool calls, the orchestrator MUST format the prompt using this canonical structure to ensure strict scope confinement, deterministic deliverables, and minimal context return overhead.

---

## 1. Template Structure

Before each dispatch, set the `model` parameter on the `Agent` call by role from the shared table in `.claude/skills/work/references/model-policy.md`: `sonnet` for implementation workers, `haiku` for read-only `Explore` spikes, and `opus` for the retry after a Sonnet worker's first verification failure.

When constructing the `prompt` for each `Agent` call, include the following structured sections:

````markdown
# TASK DISPATCH: Ticket #<ID> — <TITLE>

Você foi invocado como Subagente Especialista do Harness G-Ingá para executar a micro-entrega do Ticket #<ID>.

## 1. Missão
<Descrição concisa, objetiva e autocontida do que deve ser implementado ou corrigido.>

## 2. Arquivos Permitidos (In Scope)
ATENÇÃO: Você só tem autorização para criar ou modificar estritamente os arquivos listados abaixo. Edições fora desta lista violam o Gate 1 e resultarão em rollback imediato.
- `<caminho/do/arquivo/1>`
- `<caminho/do/arquivo/2>`

## 3. Restrições Herdadas & Mandatos
- Procedimento: leia e siga `.claude/skills/work/references/procedure.md` para esta entrega. Não invoque a skill `work`: ela é só do owner (ADR 0010).
- Repositório é a fonte canônica da verdade: consulte `docs/artifact-contracts.md` e decisões em `docs/decisions/`.
- Vocabulário factual estrito: reporte checagens usando apenas `pass`, `fail`, `blocked` e `not run`.
- Comunicação: Código e commits em inglês; relatórios executivos em português.
- Nunca adicione dependências não autorizadas no `package.json` ou remova testes existentes.

## 4. Critérios de Aceite & Thresholds Obrigatórios
O Orquestrador executará deterministicamente os seguintes gates antes de aceitar sua entrega:
- **Gate 1 (Scope):** Apenas os arquivos em "In Scope" foram modificados (`git diff --name-only`).
- **Gate 2 (Deterministic Checks):**
  - `<Comando de teste ou validação 1>` deve retornar Exit Code 0 (`pass`).
  - `<Comando de teste ou validação 2>` deve retornar Exit Code 0 (`pass`).
- **Gate 3 (Thresholds):**
  - Zero erros de linter ou formatação.
  - `<Critério quantitativo adicional, se houver>`.

## 5. Formato do Relatório de Retorno
Ao concluir o trabalho e verificar localmente suas alterações, entregue ao orquestrador, como relatório final do Agent, uma mensagem concisa no formato exato:

```text
status: ready_for_gate
ticket: #<ID>
model: <sonnet | opus | haiku>
summary: <1 a 2 frases resumindo a alteração realizada>
modified_files:
  - <caminho/do/arquivo>
checks_run:
  - <check_name>: pass / fail / blocked (<evidência resumida>)
```

The worker does NOT report token usage: it cannot observe its own. The orchestrator records the model and the ADR 0006 token totals from the host's `Agent` result (fields the host doesn't provide are `not run`), never from the worker's report, and never with prompt content.
````

---

## 2. Example Dispatch Prompt (Real Ticket)

````markdown
# TASK DISPATCH: Ticket #12 — Fix Pagination Offset in Query Parser

Você foi invocado como Subagente Especialista do Harness G-Ingá para executar a micro-entrega do Ticket #12.

## 1. Missão
Corrigir o cálculo do offset de paginação em `src/parser/query.ts` para evitar erro off-by-one quando o parâmetro `page=1`.

## 2. Arquivos Permitidos (In Scope)
- `src/parser/query.ts`
- `tests/unit/parser/query.test.ts`

## 3. Restrições Herdadas & Mandatos
- Procedimento: leia e siga `.claude/skills/work/references/procedure.md` para esta entrega. Não invoque a skill `work`: ela é só do owner (ADR 0010).
- Repositório é a fonte canônica da verdade: consulte `docs/artifact-contracts.md`.
- Vocabulário factual estrito: use `pass`, `fail`, `blocked` ou `not run`.
- Não altere assinaturas de métodos públicos existentes.

## 4. Critérios de Aceite & Thresholds Obrigatórios
- **Gate 1:** Apenas `src/parser/query.ts` e `tests/unit/parser/query.test.ts` modificados.
- **Gate 2:**
  - `mise run validate` retorna Exit Code 0 (`pass`).
  - `mise exec -- bun test tests/unit/parser/query.test.ts` retorna Exit Code 0 (`pass`).
- **Gate 3:**
  - 100% dos novos testes passam; zero regressões na suite existente.

## 5. Formato do Relatório de Retorno

```text
status: ready_for_gate
ticket: #12
model: sonnet
summary: Adjusted page index subtraction to 0-based offset; added boundary test for page=1.
modified_files:
  - src/parser/query.ts
  - tests/unit/parser/query.test.ts
checks_run:
  - bun test: pass (6 passed, 0 failed)
```
````
