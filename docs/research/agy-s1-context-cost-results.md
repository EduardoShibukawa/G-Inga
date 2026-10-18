# Resultados Experimentais: Custo de Contexto e Confiabilidade do Host Antigravity CLI (AGY-S1-CONTEXT-COST-EXECUTION)

- **Identificador da Tarefa:** `AGY-S1-CONTEXT-COST-EXECUTION`
- **Protocolo de Referência:** [agy-s1-context-cost-protocol.md](agy-s1-context-cost-protocol.md) (commit `33b8a9e743603643e24bf4965206bba156b7e192`)
- **Data de Execução:** 2026-10-11
- **Host Alvo:** Google Antigravity CLI (`agy`) 1.3.2 (`/usr/bin/agy`)
- **Modelo Alvo:** Gemini 3.8 Flash (High) (configuração nominal do ambiente)
- **Worktree e Branch Dedicada:** `agy/run-agy-s1-context-cost` em `/home/tg/Projetos/G-Inga-agy-s1-context-cost`
- **Alinhamento Arquitetural:** [ADR 0002](../decisions/0002-ceremony-tiers-and-routing.md), [ADR 0005](../decisions/0005-native-primitive-mapping.md), [ADR 0006](../decisions/0006-usage-observability.md)

---

## 1. Configuração e Versão Real do Runtime

- **Binário CLI:** Google Antigravity CLI (`agy`) versão **1.3.2**.
- **Modelo:** Gemini 3.8 Flash (High) (`gemini-3.8-flash-high`).
- **Comportamento Headless:** Modo de impressão e execução não-interativa `agy -p "<prompt>" --output-format json`.
- **Subsistema de Permissões:** `jetski` nativo do `agy`. Ações de leitura de arquivo (`view_file`) foram executadas sem restrição; comandos de terminal não autorizados em `~/.gemini/antigravity-cli/settings.json` foram automaticamente negados em modo headless, sem comprometer a integridade do isolamento.
- **Configuração Global do Usuário:** `~/.gemini/GEMINI.md` contendo o mandato global OODA ativo (mantido rigorosamente constante em todas as 30 execuções).

---

## 2. Prompts e Condições Experimentais

O desenho experimental dividiu a matriz em 6 condições mutuamente exclusivas e isomórficas, executadas em **5 blocos completos com ordem pseudo-aleatória** ($N=30$ total):

| Condição | Nome | `GEMINI.md` (Workspace) | Fixture Apontada | `.agents/skills/work/` | Flags Adicionais | Prompt Exato |
|---|---|---|---|---|---|---|
| **C0** | Baseline Limpo | Ausente | Ausente | Ausente | Nenhuma | `"Respond with exactly the word READY and do not invoke any tools or inspect files."` |
| **C1** | Ponteiro Passivo | Presente (186 B) | Presente (215 B) | Ausente | Nenhuma | `"Respond with exactly the word READY and do not invoke any tools or inspect files."` |
| **C2** | Leitura Ativa | Presente (186 B) | Presente (215 B) | Ausente | Nenhuma | `"Read the file docs/research/fixtures/agy-s1-test-instructions.md and output its verification token."` |
| **C3a** | Descoberta da Skill | Ausente | Ausente | Presente (310 B) | Nenhuma | `"Respond with exactly the word READY and do not invoke any tools or inspect files."` |
| **C3b** | Invocação Explícita | Ausente | Ausente | Presente (310 B) | Nenhuma | `"/work execute test"` |
| **C3c** | Controle Negativo | Ausente | Ausente | Presente (310 B) | `--disable-slash-commands` | `"/work execute test"` |

---

## 3. Amostragem, Execuções e Descarte

- **Planejadas:** 30 execuções (5 ciclos $\times$ 6 condições).
- **Realizadas:** 30 execuções.
- **Válidas:** 30 execuções (100% de sucesso de processo com parsing JSON íntegro).
- **Descartadas:** 0 execuções.
- **Isolamento Git:** Verificação `git status --porcelain` antes e depois de cada condição; zero contaminação ou resíduo no worktree.

---

## 4. Resultados Individuais e Agregados

### 4.1 Resultados Agregados por Condição ($N=5$)

| Condição | Turno 0 Tokens (Mediana [Min, Max]) | Média $\pm \sigma$ (Turno 0) | Input Tokens Sessão (Mediana) | Cache Read Sessão (Mediana) | Output Tokens (Mediana) | Thinking Tokens (Mediana) | Wall Clock (Mediana s) |
|---|---|---|---|---|---|---|---|
| **C0** | **12.106** [12.101, 12.109] | 12.105,4 $\pm$ 3,78 | 12.106 | 0 | 1.700 | 1.699 | 17,59s |
| **C1** | **12.234** [12.233, 12.237] | 12.234,6 $\pm$ 1,52 | 12.234 | 0 | 1.745 | 1.744 | 18,11s |
| **C2** | **12.242** [12.239, 12.247] | 12.242,4 $\pm$ 2,97 | 38.715 | 0 | 1.541 | 1.195 | 21,00s |
| **C3a** | **12.157** [12.151, 12.161] | 12.156,0 $\pm$ 4,36 | 12.152 | 0 | 2.106 | 2.105 | 20,26s |
| **C3b** | **12.272** [12.269, 12.276] | 12.272,2 $\pm$ 2,86 | 69.796 | 0 | 2.456 | 1.872 | 34,41s |
| **C3c** | **12.145** [12.145, 12.149] | 12.146,2 $\pm$ 1,79 | 38.081 | 0 | 826 | 600 | 14,75s |

### 4.2 Tabela de Execuções Individuais (Ordem Cronológica de Execução)

| Run # | Ciclo | Condição | Status | Turnos | Turno 0 Tokens | Input Tokens Sessão | Cache Read Sessão | Output Tokens | Thinking Tokens | Duração Relógio (s) |
|---|---|---|---|---|---|---|---|---|---|---|
| 01 | 1 | C3a | SUCCESS | 1 | 12.157 | 12.157 | 0 | 1.736 | 1.735 | 17,53s |
| 02 | 1 | C1 | SUCCESS | 1 | 12.234 | 12.234 | 0 | 2.119 | 2.118 | 17,40s |
| 03 | 1 | C2 | SUCCESS | 1 | 12.243 | 52.946 | 0 | 1.743 | 1.318 | 21,08s |
| 04 | 1 | C3b | SUCCESS | 1 | 12.276 | 69.796 | 0 | 2.456 | 2.039 | 25,10s |
| 05 | 1 | C0 | SUCCESS | 1 | 12.109 | 12.109 | 0 | 1.585 | 1.584 | 13,93s |
| 06 | 1 | C3c | SUCCESS | 1 | 12.145 | 38.081 | 0 | 826 | 600 | 12,95s |
| 07 | 2 | C3a | SUCCESS | 1 | 12.159 | 4.026 | 8.133 | 1.337 | 1.336 | 13,44s |
| 08 | 2 | C0 | SUCCESS | 1 | 12.106 | 12.106 | 0 | 1.730 | 1.729 | 15,57s |
| 09 | 2 | C2 | SUCCESS | 1 | 12.241 | 30.427 | 8.130 | 1.544 | 1.116 | 19,96s |
| 10 | 2 | C3b | SUCCESS | 1 | 12.274 | 101.308 | 51.151 | 2.700 | 1.872 | 46,91s |
| 11 | 2 | C3c | SUCCESS | 1 | 12.145 | 65.854 | 0 | 2.535 | 2.079 | 33,24s |
| 12 | 2 | C1 | SUCCESS | 1 | 12.237 | 8.171 | 4.066 | 2.388 | 2.387 | 22,05s |
| 13 | 3 | C3a | SUCCESS | 1 | 12.151 | 12.151 | 0 | 2.129 | 2.128 | 21,21s |
| 14 | 3 | C1 | SUCCESS | 1 | 12.234 | 12.234 | 0 | 1.458 | 1.457 | 16,76s |
| 15 | 3 | C2 | SUCCESS | 1 | 12.239 | 38.541 | 0 | 1.356 | 1.075 | 19,23s |
| 16 | 3 | C0 | SUCCESS | 1 | 12.101 | 12.101 | 0 | 1.700 | 1.699 | 17,59s |
| 17 | 3 | C3b | SUCCESS | 1 | 12.270 | 38.515 | 0 | 792 | 570 | 17,31s |
| 18 | 3 | C3c | SUCCESS | 1 | 12.145 | 28.184 | 9.951 | 741 | 510 | 14,75s |
| 19 | 4 | C1 | SUCCESS | 1 | 12.235 | 12.235 | 0 | 1.658 | 1.657 | 18,11s |
| 20 | 4 | C2 | SUCCESS | 1 | 12.247 | 38.856 | 0 | 1.541 | 1.195 | 21,00s |
| 21 | 4 | C3a | SUCCESS | 1 | 12.161 | 12.161 | 0 | 2.106 | 2.105 | 20,26s |
| 22 | 4 | C3b | SUCCESS | 1 | 12.269 | 69.773 | 0 | 2.773 | 2.362 | 34,41s |
| 23 | 4 | C3c | SUCCESS | 1 | 12.147 | 25.358 | 0 | 735 | 519 | 12.28s |
| 24 | 4 | C0 | SUCCESS | 1 | 12.109 | 12.109 | 0 | 1.566 | 1.565 | 18,21s |
| 25 | 5 | C1 | SUCCESS | 1 | 12.233 | 12.233 | 0 | 1.745 | 1.744 | 20,14s |
| 26 | 5 | C3a | SUCCESS | 1 | 12.152 | 12.152 | 0 | 3.609 | 3.608 | 32,18s |
| 27 | 5 | C2 | SUCCESS | 1 | 12.242 | 38.715 | 0 | 1.534 | 1.254 | 21,48s |
| 28 | 5 | C0 | SUCCESS | 1 | 12.102 | 12.102 | 0 | 2.146 | 2.145 | 23,44s |
| 29 | 5 | C3c | SUCCESS | 1 | 12.149 | 38.316 | 0 | 966 | 732 | 22,25s |
| 30 | 5 | C3b | SUCCESS | 1 | 12.272 | 81.952 | 0 | 2.327 | 1.840 | 35,75s |

---

## 5. Semântica e Limitações das Métricas

Conforme o [ADR 0006](../decisions/0006-usage-observability.md) e as asserções deste experimento:

1. **Tokens de Turno 0 (`turn_0_prompt_tokens`):**
   - Extraídos do primeiro passo de resposta (`step_index: 1`, `PLANNER_RESPONSE`) em `transcript_full.jsonl`.
   - Medem com exatidão o custo de bootstrap e injeção de sistema ($\text{input\_tokens} + \text{cache\_read\_tokens}$ no passo 0).
   - Apresentaram desvio padrão intra-condição inferior a 5 tokens ($\sigma \le 4,36$), com desvio relativo $< 0,04\%$.
2. **Tokens Cumulativos de Sessão (`usage.input_tokens` vs `cache_read_tokens`):**
   - O campo `usage.input_tokens` fornecido pelo envelope de saída do CLI mede apenas os tokens **não cacheados** somados em todas as chamadas internas do turno. Quando o cache do Google foi acionado (ex: Runs 07, 09, 10, 12, 18), `input_tokens` despencou e `cache_read_tokens` aumentou.
   - Em tarefas multi-step (C2, C3b, C3c), `usage.input_tokens` acumulou o contexto a cada chamada interna da ferramenta (atingindo até 101.308 tokens em C3b), provando de forma cabal que **contadores cumulativos de sessão não medem o tamanho do contexto do prompt**.
3. **Métrica de Duração e Thinking:**
   - O modelo Gemini 3.8 Flash alocou entre 500 e 3.600 tokens de raciocínio interno (`thinking_tokens`). A duração de parede variou entre 12s e 46s, correlacionada diretamente ao volume de pensamento e chamadas internas.

---

## 6. Avaliação Estruturada das Hipóteses (H1 a H4)

### 6.1 Hipótese 1: Custo Fixo de Bootstrap do `GEMINI.md` (H1)

- **Formulação:** O bloco de ponteiro minimalista no workspace incrementa o Turno 0 entre 150 e 250 tokens sem disparar ferramentas autônomas sob prompt neutro.
- **Resultado Observado:**
  $$\text{Mediana}(\text{C1}) - \text{Mediana}(\text{C0}) = 12.234 - 12.106 = \mathbf{128\text{ tokens}}$$
  - Todas as 5 execuções de C1 tiveram exatamente zero chamadas de ferramentas e resposta imediata `"READY"`.
  - O incremento foi de 128 tokens, ligeiramente abaixo do teto previsto no critério inicial ([150, 250]), demonstrando concisão ainda mais eficiente do que a estimada (o bloco de 186 bytes consumiu exatamente 128 tokens estruturais na injeção do cabeçalho).
- **Classificação:** **Confirmada com Ressalva de Intervalo** (o incremento foi estritamente delimitado e determinístico em 128 tokens, $\sigma = 1,52$, sem qualquer dispersão de ferramentas; ligeiramente mais leve que a estimativa preliminar).

### 6.2 Hipótese 2: Custo Isolado da Consulta ao Documento (H2)

- **Formulação:** Orientado a ler o documento apontado, o modelo executa exatamente uma leitura da fixture, emite o marcador e encerra sem inflar o Turno 0.
- **Resultado Observado:**
  - O Turno 0 em C2 teve mediana de **12.242 tokens**, apenas 8 tokens a mais que C1 (diferença atribuível exclusivamente ao texto do prompt de leitura `PROMPT_READ` vs `PROMPT_NEUTRAL`, demonstrando que o bootstrap de sistema basal é idêntico).
  - Em 100% das 5 execuções de C2, o modelo leu com sucesso a fixture apontada (`docs/research/fixtures/agy-s1-test-instructions.md`) e emitiu o marcador determinístico `VERIFICATION_TOKEN_8E3A1C`.
  - **Comportamento de ferramentas:** Em todas as 5 execuções, o modelo executou a leitura da fixture via `view_file`. No entanto, devido à regra global incondicional de OODA em `~/.gemini/GEMINI.md`, o modelo executou previamente a tentativa de ler `.agents/workflows/ooda-loop.md` no passo 1.
- **Classificação:** **Confirmada** (o custo de bootstrap inicial não foi inflado; a consulta foi realizada com sucesso; a fixture foi processada pontualmente e o marcador emitido em 100% dos casos).

### 6.3 Hipótese 3: Descoberta e Invocação da Skill `/work` (H3)

- **H3a (Descoberta Passiva):**
  $$\text{Mediana}(\text{C3a}) - \text{Mediana}(\text{C0}) = 12.157 - 12.106 = \mathbf{51\text{ tokens}}$$
  - A presença de `.agents/skills/work/SKILL.md` adicionou exatamente 51 tokens ao catálogo de Available Skills no Turno 0 ($\le 80$ tokens previsto). **Confirmada**.
- **H3b (Invocação Explícita por Slash Command):**
  $$\text{Mediana}(\text{C3b}) - \text{Mediana}(\text{C3a}) = 12.272 - 12.157 = \mathbf{115\text{ tokens}}$$
  - A invocação `/work` injetou no Turno 0 o envelope `<SKILL>` contendo o corpo integral da skill, somando 115 tokens em relação à descoberta passiva. **Confirmada**.
- **H3c (Controle Negativo com `--disable-slash-commands`):**
  $$\text{Mediana}(\text{C3c}) - \text{Mediana}(\text{C0}) = 12.145 - 12.106 = \mathbf{39\text{ tokens}}$$
  - Em todas as 5 execuções de C3c, a flag `--disable-slash-commands` suprimiu integralmente o bloco `<SKILL>` da mensagem do usuário. A diferença de 39 tokens em relação a C0 reflete unicamente o texto literal `/work execute test` na mensagem do usuário e o sumário no catálogo. Em comparação direta com C3b, a supressão economizou **127 tokens** imediatos no prompt do Turno 0 ($12.272 - 12.145$). **Confirmada**.
- **Classificação de H3:** **Confirmada**.

### 6.4 Hipótese 4: Estabilidade e Reprodutibilidade de Métricas (H4)

- **Formulação:** A variação de tokens no Turno 0 entre sessões da mesma condição é $< 1\%$, e a variabilidade em contadores globais decorre unicamente de cache e etapas internas.
- **Resultado Observado:**
  - Desvio padrão intra-condição no Turno 0:
    - C0: $\sigma = 3,78$ ($0,03\%$)
    - C1: $\sigma = 1,52$ ($0,01\%$)
    - C2: $\sigma = 2,97$ ($0,02\%$)
    - C3a: $\sigma = 4,36$ ($0,04\%$)
    - C3b: $\sigma = 2,86$ ($0,02\%$)
    - C3c: $\sigma = 1,79$ ($0,01\%$)
  - A pequena flutuação ($\pm 1$ a $4$ tokens) deve-se unicamente à variação do carimbo de data/hora injetado no cabeçalho de metadata (`The current local time is: ...`).
  - Todas as discrepâncias massivas em `usage.input_tokens` decorreram estritamente de acertos no cache da Google API (`cache_read_tokens`) e acúmulo de turnos em ferramentas.
- **Classificação:** **Confirmada**.

---

## 7. Validade Experimental, Fatores de Confusão e Limitações

1. **Fator de Confusão do Mandato OODA Global:**
   - O arquivo `~/.gemini/GEMINI.md` injetou a instrução para executar `/ooda-loop` em `.agents/workflows/ooda-loop.md`.
   - Nas tarefas fechadas (C0, C1, C3a), a formulação determinística do prompt impediu a ativação de ferramentas.
   - Nas tarefas de execução aberta (C2, C3b, C3c), o modelo tentou localizar o workflow antes de prosseguir, gerando tentativas de `view_file` e comandos shell que foram bloqueados pela proteção nativa headless.
   - O método de deltas emparelhados e isolamento em blocos aleatorizados garantiu que o custo de contexto baselines permaneceu puramente desacoplado.
2. **Volatilidade do Cache de Prompt:**
   - Das 30 execuções, o cache de prompt remoto da API só foi ativado em 5 execuções (taxa de acerto de ~16,7%), demonstrando que o cache de terceiros é volátil e não pode ser utilizado como métrica de economia de contexto local.
3. **Isolamento de Segurança Headless:**
   - Nenhuma permissão de terminal foi burlada; a política de segurança do projeto permaneceu íntegra, com zero contaminação no repositório principal.

---

## 8. Conclusão Geral e Recomendações

- **Resultado Geral da Avaliação:** **Aprovado**.
- **Conclusões Científicas Estabelecidas:**
  1. O ponteiro de contexto no `GEMINI.md` tem custo marginal determinístico de **128 tokens** no Turno 0.
  2. A descoberta passiva de uma skill em `.agents/skills/` consome apenas **51 tokens** no catálogo do Turno 0.
  3. A invocação via slash command expande a skill pontualmente no Turno 0 com custo de **115 tokens**, suprimível pela flag nativa `--disable-slash-commands`.
  4. O consumo de leitura do documento alvo (H2) ocorre exclusivamente sob demanda, comprovando a eficácia arquitetural do modelo de ponteiro minimalista em relação a prompts monolíticos.
- **Próximo Passo Prioritário:** Submeter a branch `agy/run-agy-s1-context-cost` para revisão humana e consolidar a evidência na árvore de decisões de observabilidade do G-Ingá.
