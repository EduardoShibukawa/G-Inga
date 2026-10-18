# Auditoria Independente do Experimento AGY-S1 de Custo de Contexto

- **Identificador da Tarefa:** `AGY-S1-CONTEXT-COST-AUDIT`
- **Data da Auditoria:** 2026-10-11
- **Status:** Auditoria independente documental, estatística e de rastreabilidade (sem novas chamadas ao modelo)
- **Branch Auditada:** `agy/run-agy-s1-context-cost` (commit `86d36a66a0cccecaca22596931089530a2870db7`)
- **Branch desta Auditoria:** `agy/audit-agy-s1-context-cost`
- **Reserva Atômica:** `refs/heads/task-claims/AGY-S1-CONTEXT-COST-AUDIT`
- **Artefatos Inspecionados:**
  - Protocolo: [docs/research/agy-s1-context-cost-protocol.md](agy-s1-context-cost-protocol.md) (commit `33b8a9e`)
  - Relatório de Resultados: [docs/research/agy-s1-context-cost-results.md](agy-s1-context-cost-results.md) (commit `86d36a6`)
  - Runner Versionado: [tools/research/run_agy_s1_context_cost.py](../../tools/research/run_agy_s1_context_cost.py) (commit `86d36a6`)
  - Relatório Original e Revisão Prévia: [docs/research/agy-s1-results.md](agy-s1-results.md) e [docs/research/agy-s1-results-review.md](agy-s1-results-review.md)
  - Transcrições Locais do Host: `~/.gemini/antigravity-cli/brain/<conversation_id>/.system_generated/logs/transcript_full.jsonl`

---

## 1. Resumo Executivo

Esta auditoria realizou a verificação independente dos resultados publicados no documento [agy-s1-context-cost-results.md](agy-s1-context-cost-results.md), confrontando as alegações analíticas contra o protocolo experimental planejado, o código do runner versionado em [run_agy_s1_context_cost.py](../../tools/research/run_agy_s1_context_cost.py) e os registros brutos de telemetria das 30 execuções preservadas nas transcrições locais do Google Antigravity CLI (`agy` 1.3.2).

### Principais Constatações

1. **Rastreabilidade e Execução:** As 30 execuções relatadas (5 ciclos de 6 condições) foram efetivamente realizadas na ordem pseudo-aleatória definida pela semente (`seed=42`). Embora o diretório temporário intermediário (`/tmp/agy_experiment_runner/data/runs_data.json`) tenha sido removido após o experimento, as 30 sessões completas foram localizadas e reconstruídas diretamente no armazenamento interno do CLI (`~/.gemini/antigravity-cli/brain/`). Uma bateria anterior de 7 execuções preliminares (testes de fumaça) foi identificada antes da série principal de 30 execuções.
2. **H1 (Custo Fixo do Ponteiro):** A medição de **128 tokens** no Turno 0 foi **confirmada independentemente** a partir das transcrições (Mediana C1: 12.234 tokens vs Mediana C0: 12.106 tokens). Contudo, o critério de aceitação pré-estabelecido no protocolo estipulava explicitamente o intervalo $[150, 250]$ tokens. A classificação do relatório original ("Confirmada com Ressalva de Intervalo") comete uma flexibilização post-hoc: o valor estrito ficou fora da janela de aceitação pré-definida.
3. **H2 (Custo da Consulta ao Documento):** **Parcialmente demonstrada em comportamento, mas inconclusiva em medição isolada de payload.** O modelo leu a fixture apontada e emitiu o marcador em 100% dos casos ($N=5$). Porém, o relatório atribuiu o acréscimo de 8 tokens no Turno 0 ao prompt, sem isolar o custo real da ferramenta `view_file` (que injetou ~434 tokens no histórico de diálogo). Adicionalmente, em todas as 5 execuções de C2, a regra global incondicional de OODA induziu uma tentativa prévia de leitura de workflow inexistente, violando o critério formal de executar "exatamente uma chamada de leitura".
4. **H3 (Descoberta e Invocação de Skill):** **Confirmada integralmente.** H3a (descoberta passiva) adicionou 51 tokens ao catálogo ($\le 80$). H3b (invocação explícita com `/work`) injetou o bloco `<SKILL>` no Turno 0 somando 115 tokens. H3c (controle negativo com `--disable-slash-commands`) comprovou a supressão absoluta do bloco `<SKILL>`, reduzindo 127 tokens em relação a C3b.
5. **H4 (Estabilidade e Efeito do Mandato Global):** **Confirmada com restrição de escopo.** A estabilidade no Turno 0 foi comprovada ($\sigma \le 4,36$ tokens, variação $< 0,04\%$). Contudo, o cancelamento do mandato global OODA só ocorreu nas condições fechadas (C0, C1, C3a). Nas tarefas abertas (C2, C3b, C3c), o mandato OODA interagiu de forma assimétrica com o ambiente, disparando ferramentas de exploração e comandos shell negados pelo subsistema de permissões `jetski`.
6. **Recomendação Final:** **Aceitar Parcialmente.** O experimento valida categoricamente o custo de injeção em bootstrap (H1 e H3) e a eficácia de `--disable-slash-commands`, mas a generalização do custo dinâmico de ferramentas (H2) e a neutralidade global (H4) sofrem interferência do ambiente do usuário.

---

## 2. Inventário de Evidências Disponíveis

| Artefato / Fonte | Status de Disponibilidade | Escopo e Rastreabilidade |
|---|---|---|
| Runner versionado (`run_agy_s1_context_cost.py`) | **Disponível e íntegro** | Commit `86d36a66a0c`. Código determinístico, sem credenciais, parametrização via variáveis de ambiente. |
| Dados brutos intermediários (`/tmp/agy_experiment_runner/data`) | **Indisponível (Removido)** | Conforme documentado no histórico, a pasta efêmera `/tmp` foi limpa após a consolidação. |
| Transcrições completas do CLI (`transcript_full.jsonl`) | **Disponíveis (30 de 30)** | Armazenadas em `~/.gemini/antigravity-cli/brain/<cid>/.system_generated/logs/`. Contêm contadores por passo (`input_tokens`, `cache_read_tokens`, `output_tokens`), timestamps e chamadas de ferramenta. |
| Sessões exploratórias preliminares | **Disponíveis (7 sessões)** | 7 execuções anteriores (06:43 a 06:46) que serviram de calibração antes do início do lote formal das 30 execuções. |
| Hashes e Fixtures Sintéticas | **Disponíveis no runner** | O runner embute strings exatas para `GEMINI.md` (186 B), fixture de teste (215 B) e `SKILL.md` (310 B). |
| Documentação oficial do CLI | **Parcialmente disponível** | `agy --help` e referências embutidas em `antigravity_guide`. Documentação pública remota não renderiza via HTTP estático (SPA em JS). |

---

## 3. Comparação: Protocolo, Runner e Execução

### 3.1 Desenho Amostral e Ordem das Execuções

O protocolo prescreveu 30 execuções divididas em 5 ciclos completos com blocos pseudo-aleatórios. O runner implementou essa diretiva com `random.seed(42)`:

```text
Ciclo 1: C3a -> C1 -> C2 -> C3b -> C0 -> C3c
Ciclo 2: C3a -> C0 -> C2 -> C3b -> C3c -> C1
Ciclo 3: C3a -> C1 -> C2 -> C0 -> C3b -> C3c
Ciclo 4: C1 -> C2 -> C3a -> C3b -> C3c -> C0
Ciclo 5: C1 -> C3a -> C2 -> C0 -> C3c -> C3b
```

A auditoria cronológica das 30 sessões em `~/.gemini/antigravity-cli/brain/` confirmou que a execução real obedeceu rigorosamente a essa ordem, ocorrendo entre **09:47:29Z e 09:57:39Z** em 2026-10-11.

### 3.2 Tabela Sanitizada das 30 Execuções Auditadas

Os dados abaixo foram extraídos diretamente dos arquivos `transcript_full.jsonl` de cada sessão, sanitizando credenciais e instruções privadas:

| Run # | Ciclo | Condição | Conversation ID (Prefixo) | Turno 0 Prompt | Input Tokens Sessão | Cache Read Sessão | Output Tokens | Passos Transcrição | Status Operacional |
|---|---|---|---|---|---|---|---|---|---|
| 01 | 1 | C3a | `9fc46f78...` | 12.157 | 12.157 | 0 | 1.736 | 2 | `SUCCESS` |
| 02 | 1 | C1 | `e79d712f...` | 12.234 | 12.234 | 0 | 2.119 | 2 | `SUCCESS` |
| 03 | 1 | C2 | `bb4f15c7...` | 12.243 | 52.946 | 0 | 1.743 | 8 | `SUCCESS` |
| 04 | 1 | C3b | `31dd7156...` | 12.276 | 69.796 | 0 | 2.456 | 10 | `SUCCESS` |
| 05 | 1 | C0 | `10c520c9...` | 12.109 | 12.109 | 0 | 1.585 | 2 | `SUCCESS` |
| 06 | 1 | C3c | `0b35715d...` | 12.145 | 38.081 | 0 | 826 | 6 | `SUCCESS` |
| 07 | 2 | C3a | `581097e9...` | 12.159 | 4.026 | 8.133 | 1.337 | 2 | `SUCCESS` |
| 08 | 2 | C0 | `b889bf41...` | 12.106 | 12.106 | 0 | 1.730 | 2 | `SUCCESS` |
| 09 | 2 | C2 | `d120ccb9...` | 12.241 | 30.427 | 8.130 | 1.544 | 6 | `SUCCESS` |
| 10 | 2 | C3b | `00b0da47...` | 12.274 | 101.308 | 51.151 | 2.700 | 21 | `SUCCESS` |
| 11 | 2 | C3c | `268f9727...` | 12.145 | 65.854 | 0 | 2.535 | 10 | `SUCCESS` |
| 12 | 2 | C1 | `81a916e4...` | 12.237 | 8.171 | 4.066 | 2.388 | 2 | `SUCCESS` |
| 13 | 3 | C3a | `6c855f76...` | 12.151 | 12.151 | 0 | 2.129 | 2 | `SUCCESS` |
| 14 | 3 | C1 | `eaaa1310...` | 12.234 | 12.234 | 0 | 1.458 | 2 | `SUCCESS` |
| 15 | 3 | C2 | `ff961eb8...` | 12.239 | 38.541 | 0 | 1.356 | 6 | `SUCCESS` |
| 16 | 3 | C0 | `41893cb5...` | 12.101 | 12.101 | 0 | 1.700 | 2 | `SUCCESS` |
| 17 | 3 | C3b | `1dd06506...` | 12.270 | 38.515 | 0 | 792 | 6 | `SUCCESS` |
| 18 | 3 | C3c | `0216342a...` | 12.145 | 28.184 | 9.951 | 741 | 7 | `SUCCESS` |
| 19 | 4 | C1 | `2285bb18...` | 12.235 | 12.235 | 0 | 1.658 | 2 | `SUCCESS` |
| 20 | 4 | C2 | `d64f5279...` | 12.247 | 38.856 | 0 | 1.541 | 6 | `SUCCESS` |
| 21 | 4 | C3a | `8dd851f9...` | 12.161 | 12.161 | 0 | 2.106 | 2 | `SUCCESS` |
| 22 | 4 | C3b | `aabe967b...` | 12.269 | 69.773 | 0 | 2.773 | 10 | `SUCCESS` |
| 23 | 4 | C3c | `1b8914f2...` | 12.147 | 25.358 | 0 | 735 | 5 | `SUCCESS` |
| 24 | 4 | C0 | `9303e450...` | 12.109 | 12.109 | 0 | 1.566 | 2 | `SUCCESS` |
| 25 | 5 | C1 | `384e96b4...` | 12.233 | 12.233 | 0 | 1.745 | 2 | `SUCCESS` |
| 26 | 5 | C3a | `ca0ace6c...` | 12.152 | 12.152 | 0 | 3.609 | 2 | `SUCCESS` |
| 27 | 5 | C2 | `6fcbc49f...` | 12.242 | 38.715 | 0 | 1.534 | 6 | `SUCCESS` |
| 28 | 5 | C0 | `e2da39e4...` | 12.102 | 12.102 | 0 | 2.146 | 2 | `SUCCESS` |
| 29 | 5 | C3c | `644e92c2...` | 12.149 | 38.316 | 0 | 966 | 6 | `SUCCESS` |
| 30 | 5 | C3b | `287e6c73...` | 12.272 | 81.952 | 0 | 2.327 | 12 | `SUCCESS` |

### 3.3 Distinção Conceitual dos Níveis de Validade

Conforme exigido pelo mandato de auditoria, estabelece-se a tripla distinção:

- **Validade Operacional:** **100% atingida.** Todas as 30 sessões iniciaram, executaram sem travamentos de processo e emitiram envelopes JSON com `status: "SUCCESS"` e exit code `0`.
- **Validade de Medição:** **Parcial.** A métrica de Turno 0 (`turn_0_prompt_tokens`) derivada do passo 1 de `transcript_full.jsonl` possui escopo correto e estabilidade matemática comprovada. Contudo, contadores cumulativos de sessão (`usage.input_tokens` e `usage.total_tokens`) continuam agregando reenvios de prompt e são inválidos para estimar tamanho de arquivo ou ocupação basal de contexto.
- **Sucesso da Hipótese:** **Misto.** Ter status `SUCCESS` no CLI não implica confirmação das hipóteses substantivas. H1 ultrapassou a meta original de 100 tokens e situou-se fora da janela pré-definida em protocolo. H2 cumpriu o objetivo funcional, mas com contaminação colateral.

---

## 4. Auditoria Detalhada de H1: Custo Fixo do Ponteiro

- **Afirmação do Relatório:** Incremento mediano de 128 tokens no Turno 0 com $\sigma = 1,52$ tokens.
- **Verificação Independente dos Dados:**
  - Mediana C0 ($N=5$): 12.106 tokens [Min: 12.101, Max: 12.109, Média: 12.105,4 $\pm$ 3,78]
  - Mediana C1 ($N=5$): 12.234 tokens [Min: 12.233, Max: 12.237, Média: 12.234,6 $\pm$ 1,52]
  - Diferença emparelhada: $12.234 - 12.106 = \mathbf{128\text{ tokens}}$.
- **Natureza da Medição:** A medida representa fielmente a soma de `input_tokens + cache_read_tokens` na primeira requisição ao modelo (`step_index: 1`), contendo o prompt inicial montado pelo runtime (sistema, ferramentas, regras globais e bloco de workspace).
- **Confronto com os Critérios do Protocolo:**
  - O protocolo especificou como critério de aceitação: *"situa-se dentro do intervalo $[150, 250]$ tokens em 100% dos pares válidos"*.
  - O valor observado (128 tokens) situa-se **abaixo do intervalo inferior** de 150 tokens.
  - No objetivo arquitetural original anterior, a meta proposta era de até 100 tokens.
- **Classificação Independente:**
  > **A medida de 128 tokens está confirmada, mas o limite formal de 100 tokens foi excedido e a janela pré-definida de $[150, 250]$ foi violada.**
  > A classificação científica correta é **Refutada por Limites Formais** (embora favorável operacionalmente por ser mais enxuta que o teto superior de 250 tokens). O relatório original errou metodologicamente ao reclassificar o resultado como "Confirmada com Ressalva de Intervalo" sem manter o rigor dos critérios cegos pré-fixados.
- **Status do Formato:** Esta medição depende de parsing estruturado do log interno `transcript_full.jsonl` do `agy` 1.3.2. Não se trata de uma métrica exposta no contrato da API ou no envelope padrão de saída (`agy -p`).

---

## 5. Auditoria Detalhada de H2: Custo da Leitura do Documento

- **Afirmação do Relatório:** O Turno 0 de C2 teve mediana de 12.242 tokens (+8 tokens em relação a C1, correspondente à diferença do prompt de usuário). Em 100% das execuções, o modelo leu a fixture e emitiu `VERIFICATION_TOKEN_8E3A1C`.
- **Análise Crítica dos Dados de Telemetria:**
  1. **Confusão de Escopo:** A diferença de 8 tokens no Turno 0 **não mede o custo da leitura do documento**. Ela reflete unicamente o tamanho do prompt textual do usuário (`PROMPT_READ` possui alguns caracteres a mais que `PROMPT_NEUTRAL`).
  2. **Consumo Real da Ferramenta (`view_file`):** Ao inspecionar os passos internos de C2 (ex: Run 15, sem interferência de cache):
     - Passo 1 (Tentativa OODA): Prompt 12.239 tokens $\rightarrow$ Saída 541 tokens.
     - Passo 3 (Chamada à fixture): Prompt 12.934 tokens $\rightarrow$ Saída 163 tokens.
     - Passo 5 (Resposta final): Prompt 13.368 tokens $\rightarrow$ Saída 652 tokens.
     - O retorno da leitura da fixture (215 bytes) injetou **~434 tokens** líquidos no contexto da conversa entre o passo 3 e o passo 5.
  3. **Comportamento de Ferramentas:** Em **100% das 5 execuções de C2**, o modelo executou **duas** chamadas de ferramenta: primeiro uma leitura mal-sucedida de `.agents/workflows/ooda-loop.md` (induzida pelo mandato global do usuário) e apenas no segundo turno a leitura de `docs/research/fixtures/agy-s1-test-instructions.md`. Na Run 03, o modelo executou ainda uma terceira ferramenta (`run_command: ls -la`).
  4. **Modo `stream-json` e Contadores Oficiais:** A documentação do `agy` 1.3.2 disponibiliza o modo `--input-format stream-json --output-format stream-json`. Esse modo transmite mensagens NDJSON a cada turno, permitindo inspecionar formalmente eventos de ferramentas sem depender de `transcript_full.jsonl`. O runner versionado não utilizou esse modo, limitando-se ao envelope agregado de sessão de `agy -p`.
- **Classificação Independente:**
  > **Inconclusiva quantitativamente para isolamento de payload, embora funcionalmente demonstrada.**
  > O modelo efetivamente consultou a fixture e emitiu o token determinístico. Contudo, a telemetria agregada e a interferência do mandato OODA impedem calcular o custo isolado da leitura sem artefatos espúrios no histórico.

---

## 6. Auditoria Detalhada de H3: Descoberta e Invocação de Skills

### 6.1 H3a: Custo de Descoberta Passiva

- **Medição Confirmada:** Mediana C3a (12.157 tokens) vs Mediana C0 (12.106 tokens) = **+51 tokens**.
- O arquivo `.agents/skills/work/SKILL.md` (310 bytes) foi catalogado em "Available skills" com seu nome e descrição no prompt de sistema inicial. O custo ficou estritamente abaixo do teto de 80 tokens ($\Delta_{discovery} \le 80$).
- **Veredito H3a:** **Confirmada.**

### 6.2 H3b: Invocação Explícita via Slash Command (`/work`)

- **Medição Confirmada:** Mediana C3b (12.272 tokens) vs Mediana C3a (12.157 tokens) = **+115 tokens**.
- As transcrições de todas as 5 execuções de C3b confirmam que o parser nativo do `agy` interceptou `/work execute test`, expandiu o envelope `<SKILL>` com o corpo íntegro de `SKILL.md` e o injetou na mensagem do usuário.
- **Veredito H3b:** **Confirmada.**

### 6.3 H3c: Controle Negativo com `--disable-slash-commands`

- **Medição Confirmada:**
  - Mediana C3c (12.145 tokens) vs Mediana C0 (12.106 tokens) = **+39 tokens** (texto literal do prompt + catálogo).
  - Mediana C3b (12.272 tokens) vs Mediana C3c (12.145 tokens) = **-127 tokens**.
- Em 100% das 5 execuções de C3c, o bloco `<SKILL>` esteve **completamente ausente** da mensagem do usuário. O runtime tratou `/work execute test` como texto comum.
- **Veredito H3c:** **Confirmada.**

### 6.4 Limite de Extrapolação

A skill testada possuía apenas 310 bytes com 2 instruções sintéticas. A confirmação de H3 comprova exclusivamente o mecanismo de parsing do `agy 1.3.2`. **Não é permitido extrapolar** essa conclusão para workflows complexos do G-Ingá (como transição de cerimônias ou múltiplos sub-agentes), cujas skills ultrapassam milhares de tokens e podem sofrer truncamento de catálogo.

---

## 7. Auditoria de H4: Estabilidade e Influência Global

### 7.1 Variação do Turno 0

A estabilidade da medição de Turno 0 entre repetições idênticas foi notável:

- C0: $\sigma = 3,78$ ($0,03\%$)
- C1: $\sigma = 1,52$ ($0,01\%$)
- C2: $\sigma = 2,97$ ($0,02\%$)
- C3a: $\sigma = 4,36$ ($0,04\%$)
- C3b: $\sigma = 2,86$ ($0,02\%$)
- C3c: $\sigma = 1,79$ ($0,01\%$)

A flutuação residual de 1 a 4 tokens decorre exclusivamente do timestamp dinâmico gerado pelo runtime no bloco de metadata do prompt (`The current local time is: ...`).

### 7.2 Instabilidade dos Contadores Cumulativos e Tempo

Enquanto o Turno 0 foi determinístico, os contadores cumulativos de sessão exibiram dispersão massiva:

- `usage.input_tokens` em C3b variou de **38.515** a **101.308 tokens** (CV = 0,32), dependendo das chamadas internas e do reuso de cache.
- O tempo de relógio (*wall clock*) em C3b variou entre **17,31s** e **46,91s**.
- O relatório original focou a estabilidade apenas no Turno 0. A conclusão de H4 deve ser explicitamente **restrita à métrica de Turno 0**, reconhecendo que a sessão cumulativa é estocástica e altamente volátil.

### 7.3 Avaliação do Cancelamento do Mandato Global OODA

O relatório original alegou que o método de deltas emparelhados "cancelou matematicamente o ruído de fundo das regras globais". A auditoria detalhada revela que essa afirmação é **apenas parcialmente verdadeira**:

- **Nas condições fechadas (C0, C1, C3a):** O cancelamento foi perfeito. Como os prompts ordenavam resposta imediata sem ferramentas, o modelo não ativou a cadeia de busca do OODA.
- **Nas condições abertas (C2, C3b, C3c):** Houve **interação assimétrica**. A presença de regras globais forçou tentativas ativas de localizar `.agents/workflows/ooda-loop.md` e comandos `find`/`ls`, gerando turnos espúrios e chamadas bloqueadas.
- O ruído global não foi um cancelamento nulo nas tarefas com ferramentas: ele adicionou turnos, variabilidade de latência e consumo de tokens de raciocínio.

---

## 8. Rastreabilidade, Runner e Segurança

1. **Reprodutibilidade do Runner:** O arquivo [tools/research/run_agy_s1_context_cost.py](../../tools/research/run_agy_s1_context_cost.py) versionado no commit `86d36a6` é de alta qualidade metodológica. Implementa verificações estritas com `git status --porcelain`, isolamento em `try/finally` para criação e limpeza de fixtures e geração determinística da matriz.
2. **Ausência de Segredos:** Nenhuma credencial pessoal, chave de API da Google ou instrução privada sensível foi vazada no código ou nos relatórios de teste.
3. **Caminhos de Sistema:** O runner parametriza o diretório de workspace via `WORKSPACE_DIR` (com fallback para `/home/tg/Projetos/G-Inga-agy-s1-context-cost`). Recomenda-se para versões futuras que todos os caminhos padrão sejam estritamente relativos ao CWD do processo.
4. **Armazenamento de Dados Brutos:** A remoção de `/tmp/agy_experiment_runner/data` após a execução não impediu a auditoria devido à persistência automática das transcrições do `agy` em `~/.gemini/antigravity-cli/brain/`. No entanto, para conformidade estrita de pesquisa, recomenda-se que os dados agregados brutos sanitizados sejam commitados em `docs/research/fixtures/` ou pasta de dados correlata.

---

## 9. Matriz Consolidada de Classificação das Hipóteses

| Hipótese | Descrição Formal | Classificação Original | Classificação da Auditoria Independente | Justificativa da Divergência |
|---|---|---|---|---|
| **H1** | Custo Fixo de Bootstrap ($150 \le \Delta \le 250$ tokens) | Confirmada com Ressalva | **Refutada nos limites formais; Medição de 128 tokens confirmada** | O delta medido foi de 128 tokens ($\sigma=1,52$). Excede o objetivo histórico de 100 tokens e viola o critério cego do protocolo ($[150, 250]$). Não se pode relaxar limites a posteriori. |
| **H2** | Custo Isolado da Leitura do Alvo | Confirmada | **Inconclusiva quantitativamente; Funcionalmente demonstrada** | O modelo leu a fixture e emitiu o token em 5/5 casos. Porém, o relatório usou o Turno 0 (+8 tokens de prompt) em vez de isolar o custo real da ferramenta. Houve contaminação colateral pelo mandato OODA. |
| **H3a** | Descoberta Passiva ($\Delta \le 80$ tokens) | Confirmada | **Confirmada** | Custo marginal de 51 tokens no catálogo de sistema. |
| **H3b** | Invocação Explícita por Slash Command | Confirmada | **Confirmada** | Injeção estruturada do bloco `<SKILL>` no Turno 0 comprovada (+115 tokens). |
| **H3c** | Controle Negativo (`--disable-slash-commands`) | Confirmada | **Confirmada** | Supressão de 100% do bloco `<SKILL>` nas 5 execuções. Economia imediata de 127 tokens em relação a C3b. |
| **H4** | Estabilidade de Métricas ($< 1\%$ de variação) | Confirmada | **Confirmada para Turno 0; Não sustentada para contadores cumulativos** | Turno 0 com $\sigma \le 4,36$ tokens ($< 0,04\%$). Contadores cumulativos e tempo de execução variaram mais de 100% devido a cache e turnos de pensamento. |

---

## 10. Correções Necessárias ao Relatório Original

Para preservar a integridade científica do projeto G-Ingá, as seguintes correções devem ser consideradas nos documentos de pesquisa:

1. **Correção de H1:** Registrar expressamente que o custo medido foi de 128 tokens e que esse resultado não cumpriu o critério de aceitação de $[150, 250]$ tokens do protocolo, nem a meta histórica de até 100 tokens, embora represente uma sobrecarga aceitável para o runtime.
2. **Correção de H2:** Retificar a alegação de que a leitura custa 8 tokens. Deixar explícito que os 8 tokens decorrem do texto da pergunta, enquanto a leitura real da fixture consumiu ~434 tokens no diálogo, além de turnos colaterais induzidos por regras globais.
3. **Escopo de H4:** Restringir a afirmação de estabilidade estritamente ao tamanho do prompt no Turno 0, eliminando alegações de cancelamento perfeito do ruído global em tarefas que demandam ferramentas.

---

## 11. Validação e Conformidade Contratual

A auditoria foi submetida aos testes e validações automatizadas no worktree isolado `agy/audit-agy-s1-context-cost`:

- **`mise run validate`:** Aprovado com sucesso (`Overall: pass`).
  - Markdown lint: 26 arquivos checados, 0 problemas.
  - Links locais: 404 referências validadas em 28 arquivos.
  - Diagramas Mermaid: 14 diagramas compilados para SVG sem erros.
  - Registros de decisão: 6 ADRs íntegros com 8 linhas de mapa.
  - Esquemas e contratos de artefatos: pass.
- **`mise run test`:** Aprovado integralmente com **77 testes passando em 2 arquivos** (`0 fail`, 206 asserções).
- **Integridade Arquitetural:** Nenhuma alteração foi realizada em ADRs, `docs/decision-map.md`, contratos universais ou configurações de outros agentes.

---

## 12. Recomendação Final e Próximo Passo

### Recomendação: Aceitar Parcialmente

- **Aceitar:**
  - O custo empírico determinístico do ponteiro no bootstrap de sistema (128 tokens no `agy 1.3.2`).
  - A eficácia do catálogo de skills passivo (51 tokens) e da expansão explícita por slash command (115 tokens).
  - A confirmação técnica de que `--disable-slash-commands` é uma barreira determinística nativa contra injeção de skills.
- **Rejeitar / Não Aceitar:**
  - A estimativa de custo de leitura de H2 baseada no Turno 0.
  - A alegação de cancelamento estocástico perfeito do mandato global OODA em tarefas abertas.
  - A rotulagem de H1 como "Confirmada" sob critérios que exigiam intervalo superior.

### Próxima Ação Prioritária (Única)

> **Submeter a auditoria independente à aprovação do mantenedor e, caso homologada, incorporar a medição empírica de 128 tokens ao ADR 0005 (Mapeamento de Primitivas Nativas, seção U7), mantendo fechadas as decisões de expansão multi-host até a conclusão das avaliações do Claude Code.**
