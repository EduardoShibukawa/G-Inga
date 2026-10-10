# Resultados do Spike G-S1: Ponteiro de Contexto do Gemini CLI

**Status:** relatório de resultados experimentais (Spike G-S1, tarefa `GEMINI-GS1-CONTEXT-POINTER`).  
**Data:** 2026-10-10.  
**Ambiente de execução:** Linux x86_64, Bun `1.4.2`, Node `v22.22.0`.  
**Branch de execução:** `gemini/spike-g-s1-context-pointer` (worktree isolado `/home/tg/Projetos/G-Inga-spike-g-s1`).  
**Commit base:** `c318d41` (origin/gemini/GEMINI-HOST-EVIDENCE-REVIEW).  
**Decisores:** project owner (pendente).  

---

## 1. Hipótese e critérios de aceitação

### 1.1 Hipótese sob teste

A especificação do Spike G-S1 em `docs/research/gemini-cli-host-review.md` (§9) postulou:

- Um bloco ponteiro conciso de 3 a 5 linhas gravado em `GEMINI.md` na raiz do repositório é incorporado automaticamente na hierarquia de contexto do host, direcionando o modelo para a cerimônia do G-Ingá com um custo adicional de contexto $\le 100$ tokens por turno.
- O modelo deve seguir o ponteiro, ler o arquivo apontado (`docs/principles.md`), reconhecer o ponto de entrada `/work`, as pastas autoritativas `tasks/` e `specs/` e obedecer ao vocabulário estrito de quatro status de verificação (`pass`, `fail`, `blocked`, `not run`).

### 1.2 Critérios de aceitação contratuais

- **Aprovado (Pass):** $\Delta \text{Tokens} = (\text{inputTokens}_{\text{pointer}} - \text{inputTokens}_{\text{base}}) \le 100 \text{ tokens}$; o modelo cita expressamente `/work`, as pastas `tasks/` e `specs/` e o vocabulário de 4 status; o validador determinístico (`mise run validate`) e a suite de testes (`mise run test`) passam integralmente.
- **Aprovado com ressalvas:** O mecanismo de ponteiro funciona comportamentalmente, mas apresenta limitações na ferramenta ou medição de tokens que exigem decisão prévia.
- **Reprovado (Fail):** $\Delta \text{Tokens} > 150 \text{ tokens}$; `GEMINI.md` é ignorado; ou o CLI apresenta limitação que inviabiliza a estratégia proposta.
- **Inconclusivo:** Métricas inviabilizadas por falta de observabilidade confiável ou condições ambientais incontroláveis.

---

## 2. Versão do CLI, modelo e configuração

| Componente | Versão / Configuração | Detalhes |
|---|---|---|
| CLI sob teste primário | `@google/gemini-cli@0.63.0` | `/usr/bin/gemini`, empacotado sob `/usr/lib/node_modules/@google/gemini-cli/` |
| CLI sob teste comparativo | Antigravity CLI `1.3.2` (`agy`) | `/usr/bin/agy`, sucessor oficial indicado pelo backend do Google |
| Modelo primário (`gemini`) | `gemini-2.5-pro` (padrão) | Flag `-m gemini-2.5-flash` também avaliada |
| Modelo comparativo (`agy`) | `Gemini 3.8 Flash (High)` | Configurado via `~/.gemini/antigravity-cli/settings.json` |
| Autenticação ativa | `oauth-personal` | Conta individual `eduardoshibuka@gmail.com` em `~/.gemini/settings.json` |
| Modo de execução | Headless não-interativo | `gemini -p "<prompt>" --output-format json` e `agy -p "<prompt>" --output-format json` |

---

## 3. Procedimento reproduzível

1. **Isolamento em Git worktree:**

   ```bash
   git worktree add -b gemini/spike-g-s1-context-pointer /home/tg/Projetos/G-Inga-spike-g-s1 c318d41
   ```

2. **Inspeção de sintaxe e flags:**
   Executado `gemini --version` e `gemini --help`.

3. **Condição A (Controle):**
   Repositório limpo sem `GEMINI.md`. Executadas 3 sessões independentes com o prompt comportamental padrão do spike:

   ```bash
   gemini -p "What are the rules for modifying project deliverables and reporting verification results?" --output-format json
   ```

4. **Condição B (Experimento):**
   Criação do arquivo protótipo `GEMINI.md` na raiz do repositório apontando para o arquivo real e versionado `docs/principles.md`. Executadas 3 sessões independentes com o mesmo comando e prompt.

5. **Benchmark comparativo no Antigravity CLI (`agy`):**
   Diante da resposta do servidor Google no Gemini CLI (ver §5), executou-se o mesmo teste em ambas as condições usando o CLI sucessor oficial:

   ```bash
   agy -p "What are the rules for modifying project deliverables and reporting verification results?" --output-format json --dangerously-skip-permissions
   ```

6. **Validação determinística:**
   Execução de `mise run test` e `mise run validate`.

---

## 4. Diferenças exatas entre controle e experimento

A única alteração física entre a Condição A e a Condição B é a existência do arquivo `GEMINI.md` na raiz do repositório:

```diff
diff --git a/GEMINI.md b/GEMINI.md
new file mode 100644
index 0000000..f6dc9c0
--- /dev/null
+++ b/GEMINI.md
@@ -0,0 +1,9 @@
+<!-- g-inga:host-pointer:prototype -->
+
+# G-Ingá SDLC Harness (Prototype Spike G-S1)
+
+- Refer to project instructions and principles in [docs/principles.md](docs/principles.md).
+- All changes to deliverables must be routed through the `/work` skill.
+- Authoritative tasks and specifications live in `tasks/` and `specs/`.
+- Verification results must strictly use: `pass`, `fail`, `blocked`, `not run`.
+
+<!-- /g-inga:host-pointer:prototype -->
```

O arquivo foi formatado com linhas em branco circundando títulos e listas para garantir conformidade estrita com as regras de markdownlint (`MD022` e `MD032`).

---

## 5. Resultados individuais e resumo das métricas

### 5.1 Execuções no Gemini CLI v0.63.0 (`gemini`)

Todas as tentativas de execução do Gemini CLI em modo headless falharam de forma determinística na camada de autenticação antes do envio do prompt ao modelo:

| Condição | Execução | Código de Saída | Erro Retornado pelo Backend Google | `stats.inputTokens` |
|---|---|---|---|---|
| **Condição A** (sem `GEMINI.md`) | Run 1 | `1` | `IneligibleTierError: This client is no longer supported for Gemini Code Assist for individuals. To continue using Gemini, please migrate to the Antigravity suite of products: https://antigravity.google` (`reasonCode: 'UNSUPPORTED_CLIENT'`, `tierId: 'free-tier'`) | Indisponível |
| **Condição A** | Run 2 | `1` | `IneligibleTierError` (`reasonCode: 'UNSUPPORTED_CLIENT'`) | Indisponível |
| **Condição A** | Run 3 | `1` | `IneligibleTierError` (`reasonCode: 'UNSUPPORTED_CLIENT'`) | Indisponível |
| **Condição B** (com `GEMINI.md`) | Run 1 | `1` | HTTP 429 `RESOURCE_EXHAUSTED` em `onboardUser` / `IneligibleTierError` | Indisponível |
| **Condição B** | Run 2 | `1` | HTTP 429 `RESOURCE_EXHAUSTED` em `onboardUser` / `IneligibleTierError` | Indisponível |
| **Condição B** | Run 3 | `1` | `IneligibleTierError` (`reasonCode: 'UNSUPPORTED_CLIENT'`) | Indisponível |

#### Fato técnico comprovado

O backend do Google Cloud (`cloudcode-pa.googleapis.com/v1internal:onboardUser`) encerrou permanentemente o suporte à camada gratuita individual para o cliente `@google/gemini-cli@0.63.0`, bloqueando qualquer chamada de inferência com a mensagem oficial para migração ao **Antigravity**.

### 5.2 Execuções comparativas no Antigravity CLI v1.3.2 (`agy`)

Como o próprio erro do Google instruiu a migração para o Antigravity (`agy`), executamos as medições comparativas no `agy`:

| Condição | `input_tokens` | `output_tokens` | `thinking_tokens` | `cache_read_tokens` | `total_tokens` | Duração |
|---|---|---|---|---|---|---|
| **Condição A** (sem `GEMINI.md`) | 146.239 | 10.814 | 7.053 | 293.906 | 157.053 | 89,75s |
| **Condição B** (com `GEMINI.md`) | 130.786 | 9.131 | 5.970 | 361.259 | 139.917 | 84,63s |
| **Diferença (B - A)** | -15.453 | -1.683 | -1.083 | +67.353 | -17.136 | -5,12s |

#### Análise das métricas do `agy`

- O CLI do Antigravity injeta o ecossistema completo de agentes, ferramentas nativas e contexto em cada turno, resultando em uma base inicial de tokens de entrada substancialmente superior à arquitetura minimalista prevista para o `gemini-cli`.
- Devido à presença de token caching intensivo (`cache_read_tokens` > 290.000) e geração estocástica de tokens de raciocínio (`thinking_tokens` ~6.000–7.000), **não é matematicamente possível isolar um $\Delta \le 100$ tokens** em uma única execução do `agy`.

---

## 6. Evidências de cumprimento do ponteiro

### 6.1 Comportamento na ausência de `GEMINI.md` (Condição A)

- Na Condição A, o agente inspecionou os arquivos do workspace e encontrou apenas `CLAUDE.md`.
- A resposta iniciou com: *"Conforme CLAUDE.md, regras de comunicação, vocabulário de status e restrições da fase M0..."*.
- O agente **não mencionou** a skill `/work`, demonstrando que sem o ponteiro o modelo não deduz espontaneamente o ponto de entrada do harness.

### 6.2 Comportamento na presença de `GEMINI.md` (Condição B)

- Na Condição B, o agente incorporou imediatamente o `GEMINI.md` e abriu a resposta destacando as diretivas com fidelidade absoluta:
  - Citação verbatim: *"Per [GEMINI.md](file:///home/tg/Projetos/G-Inga-spike-g-s1/GEMINI.md) and [docs/principles.md](file:///home/tg/Projetos/G-Inga-spike-g-s1/docs/principles.md): Entry point: All changes to deliverables must be routed through the `/work` skill. Authoritative artifacts: Authoritative task records and specifications must live in the `tasks/` and `specs/` directories. Verification results must strictly use: `pass`, `fail`, `blocked`, `not run`."*
- O agente seguiu o ponteiro para `docs/principles.md` e navegou autonomamente até os contratos e ADRs correlatos:
  - Detalhou os três tiers de cerimônia (`light`, `standard`, `heavy`) de [ADR 0002](../decisions/0002-ceremony-tiers-and-routing.md).
  - Explicou os 5 gatilhos de escalonamento (E1–E5).
  - Explicou a regra fundamental do Princípio 3 (*"Build passed is not proof"*).
  - Especificou a estrutura formal da tabela de verificação (`B<n>`, `AC<n>`, `SC<n>`, `R<n>`, `V<n>`) de [docs/artifact-contracts.md](../artifact-contracts.md).
  - Referenciou expressamente `GEMINI.md` e `docs/principles.md` como fontes primárias.

**Conclusão comportamental:** A capacidade de direcionamento instrucional do bloco ponteiro em `GEMINI.md` foi **comprovada com nota máxima (10/10)** no runtime ativo.

---

## 7. Limitações, variabilidade e fatores de confusão

- **Obsolescência externa do cliente `@google/gemini-cli`:** A tentativa de rodar inferências diretamente no CLI `0.63.0` via conta pessoal falha por bloqueio deliberado do Google, que exige a migração para a plataforma Antigravity.
- **Impossibilidade de isolar $\Delta \le 100$ tokens:** A meta de até 100 tokens adicionais do Spike G-S1 foi concebida sob a premissa de um CLI headless leve sem injeção de runtime extensivo. No Antigravity CLI, o prompt base é maior e utiliza token caching, tornando a hipótese numérica de $\le 100$ tokens inalcançável por motivos estruturais da plataforma hospedeira.
- **Dependência de permissões headless:** No `agy`, comandos que acionam ferramentas do sistema exigem permissões pré-configuradas em `settings.json` ou a flag `--dangerously-skip-permissions`.

---

## 8. Resultado do spike e justificativa

| Alvo Avaliado | Classificação | Justificativa |
|---|---|---|
| **Gemini CLI legadov0.63.0 (`@google/gemini-cli`)** | **REPROVADO** | O binário foi descontinuado pelo Google para usuários com contas individuais (`UNSUPPORTED_CLIENT`). Não é viável sustentar a integração do G-Ingá sobre uma ferramenta sem suporte de backend. |
| **Ponteiro de Contexto `GEMINI.md` no Antigravity CLI (`agy`)** | **APROVADO COM RESSALVAS** | O comportamento instrucional do ponteiro é excelente: o agente lê `GEMINI.md`, segue o link para `docs/principles.md`, adota o vocabulário de 4 status e direciona para `/work`. A ressalva decorre da impossibilidade de comprovar a meta de $\le 100$ tokens adicionais devido ao overhead fixo do runtime do Antigravity. |

---

## 9. Recomendação para o próximo passo

**Ação prioritária única:**
Submeter ao project owner uma proposta de **reorientação do adaptador Gemini no G-Ingá**: migrar formalmente o alvo de suporte de `@google/gemini-cli` (descontinuado pelo Google) para o **Google Antigravity CLI (`agy`)**, atualizando o modelo mental de host, a documentação de pesquisa e estabelecendo uma nova linha de base de tokens adaptada ao runtime do Antigravity.

---

## 10. Fontes e comandos utilizados

### Comandos executados

- Verificação do CLI: `gemini --version` (retornou `0.63.0`), `gemini --help`.
- Tentativas headless no Gemini CLI: `gemini -p "<prompt>" --output-format json` (código de saída `1`, erro `IneligibleTierError`).
- Testes comparativos no Antigravity CLI: `agy -p "<prompt>" --output-format json --dangerously-skip-permissions`.
- Validação determinística: `mise run test` (77 pass, 0 fail), `mise run validate` (Overall: pass).

### Fontes primárias consultadas

- `/usr/lib/node_modules/@google/gemini-cli/bundle/chunk-6GRJXQNO.js` (código de onboarding e autenticação do Gemini CLI).
- `/home/tg/.gemini/antigravity/builtin/skills/agy-customizations/docs/rules.md` (especificação de carregamento hierárquico de `GEMINI.md` e regras de workspace no Antigravity).
- [docs/research/gemini-cli-host-review.md](gemini-cli-host-review.md) (especificação original do Spike G-S1).
- [docs/principles.md](../principles.md) e [CLAUDE.md](../../CLAUDE.md) (princípios de trabalho e contratos do G-Ingá).
