# Protocolo Experimental: Custo de Contexto e Confiabilidade do Host Antigravity CLI (AGY-S1-REDESIGN)

- **Identificador da Tarefa:** `AGY-S1-CONTEXT-COST-REDESIGN`
- **Status:** especificação metodológica e protocolo experimental proposto (aguarda aprovação humana formal). Não executa chamadas nesta fase.
- **Data de Especificação:** 2026-10-11
- **Host Alvo:** Google Antigravity CLI (`agy`) 1.3.2 (`/usr/bin/agy`)
- **Modelo Alvo:** Gemini 3.8 Flash (High) (configuração nominal do ambiente)
- **Base Experimental e Auditoria:** [agy-s1-results.md](agy-s1-results.md) e [agy-s1-results-review.md](agy-s1-results-review.md)
- **Alinhamento Arquitetural:** [ADR 0002](../decisions/0002-ceremony-tiers-and-routing.md), [ADR 0005](../decisions/0005-native-primitive-mapping.md), [ADR 0006](../decisions/0006-usage-observability.md) e [antigravity-cli-host-review.md](antigravity-cli-host-review.md)

---

## 1. Perguntas Experimentais

A revisão crítica do primeiro experimento AGY-S1 ([agy-s1-results-review.md](agy-s1-results-review.md)) demonstrou que as hipóteses de carregamento estrutural do ponteiro e da skill foram comprovadas no nível de injeção no runtime, mas a alegação de "redução de contexto de 54,4%" não era sustentada metodologicamente. O experimento anterior confundiu contadores cumulativos de sessão (`usage.input_tokens`) com tamanho de contexto e usou uma tarefa de busca aberta que penalizou a condição de controle com dezenas de turnos exploratórios adicionais.

Este protocolo desacopla estritamente o problema em quatro perguntas independentes:

1. **Pergunta 1 (Custo fixo do ponteiro - H1):** Qual é o incremento exato em tokens inserido no prompt inicial de sistema (Turno 0) pelo runtime do `agy` ao carregar um arquivo `GEMINI.md` mínimo contendo apenas o bloco delimitado de ponteiro do G-Ingá?
2. **Pergunta 2 (Custo da consulta ao documento - H2):** Qual é o consumo adicional em tokens, chamadas de ferramenta e turnos quando o modelo efetivamente consulta via ferramenta (`view_file`) o documento referenciado pelo ponteiro, sem agregar esse custo ao tamanho basal de bootstrap?
3. **Pergunta 3 (Descoberta e invocação da skill - H3):** Qual é o custo em tokens da descoberta passiva de uma skill em `.agents/skills/work/SKILL.md` (tamanho de seu sumário no catálogo de skills do prompt de sistema) e qual é o custo incremental de sua invocação explícita via slash command (`/work`), distinguindo a injeção do corpo da skill de sua execução?
4. **Pergunta 4 (Reprodutibilidade e variabilidade - H4):** Qual é o intervalo de variabilidade estocástica entre sessões independentes e idênticas em condições controladas, e como a taxa de acerto do cache de prompt afeta a telemetria agregada emitida pelo runtime?

---

## 2. Hipóteses e Critérios de Aceitação

Cada hipótese possui critérios formais pré-definidos para conclusão em **Confirmada**, **Refutada** ou **Inconclusiva**, prevenindo interpretações post-hoc enviesadas.

### 2.1 Hipótese 1: Custo Fixo de Bootstrap do `GEMINI.md` (H1)

- **Formulação:** O carregamento hierárquico de um `GEMINI.md` contendo um bloco ponteiro minimalista (~150 a 200 bytes) incrementa o prompt de sistema do Turno 0 em uma quantidade delimitada e determinística de tokens ($150 \le \Delta_{tokens} \le 250$), sem disparar ferramentas de exploração autônoma quando o prompt é neutro.
- **Critérios de Aceitação:**
  - **Confirmada:** A diferença emparelhada de prompt no Turno 0 ($\text{Prompt}_{Turno 0}(B) - \text{Prompt}_{Turno 0}(A)$) situa-se dentro do intervalo $[150, 250]$ tokens em 100% dos pares válidos, com desvio padrão intra-condição $\sigma < 5$ tokens e zero chamadas de ferramentas de busca no Turno 0.
  - **Refutada:** $\Delta_{tokens}$ for nulo (arquivo ignorado), superior a 350 tokens (efeito colateral desproporcional) ou inferior a 50 tokens sem justificativa de truncamento.
  - **Inconclusiva:** O runtime falhar no parsing, omitir os dados de passo na transcrição ou apresentar variância inexplicada $> 20$ tokens entre sessões idênticas.

### 2.2 Hipótese 2: Custo Isolado da Consulta ao Documento Apontado (H2)

- **Formulação:** Quando orientado explicitamente a ler o documento apontado, o modelo realiza exatamente uma chamada de ferramenta (`view_file`), adicionando ao histórico do diálogo o custo correspondente ao tamanho da fixture, sem inflar retroativamente o prompt de sistema basal.
- **Critérios de Aceitação:**
  - **Confirmada:** Em 100% das execuções da condição H2, o modelo executa exatamente uma operação de leitura sobre a fixture apontada, emite o marcador de verificação exigido e encerra em $\le 3$ turnos com consumo de saída estritamente proporcional ao payload lido.
  - **Refutada:** O modelo tentar ler múltiplos arquivos alheios, ignorar o caminho fornecido ou falhar na emissão do marcador determinístico.
  - **Inconclusiva:** A ferramenta de leitura for bloqueada pelo subsistema de permissões ou ocorrer timeout de rede.

### 2.3 Hipótese 3: Descoberta e Invocação da Skill `/work` (H3)

- **Formulação:**
  - *H3a (Descoberta Passiva):* A presença de `.agents/skills/work/SKILL.md` adiciona ao catálogo de skills no Turno 0 apenas a linha correspondente ao seu nome e sumário ($\Delta_{discovery} \le 80$ tokens).
  - *H3b (Invocação Explícita):* O prefixo `/work` faz o parser do `agy` injetar o corpo de `SKILL.md` na mensagem do usuário com o envelope `<SKILL>`, sem necessidade de releitura manual do arquivo via ferramentas.
  - *H3c (Controle Negativo):* A flag `--disable-slash-commands` suprime a injeção do bloco `<SKILL>`, tratando `/work` como texto literal.
- **Critérios de Aceitação:**
  - **Confirmada:** H3a, H3b e H3c são simultaneamente observadas nas transcrições: H3a exibe acréscimo delimitado no Turno 0; H3b exibe o bloco `<SKILL>` com hash idêntico ao corpo de `SKILL.md`; H3c confirma ausência de injeção com a flag ativa.
  - **Refutada:** A skill for omitida da lista de Available Skills em H3a, o bloco `<SKILL>` não for injetado em H3b, ou a flag de supressão for ineficaz em H3c.
  - **Inconclusiva:** Divergência de comportamento entre repetições ou dependência de parsing não reproduzível.

### 2.4 Hipótese 4: Estabilidade e Reprodutibilidade de Métricas (H4)

- **Formulação:** Sob prompts determinísticos fechados e ambiente idêntico, a variação de tokens no Turno 0 entre sessões da mesma condição é estritamente inferior a 1%, e as discrepâncias nas métricas globais de `usage.input_tokens` decorrem unicamente da taxa de reuso do cache de contexto (`usage.cache_read_tokens`).
- **Critérios de Aceitação:**
  - **Confirmada:** O desvio padrão relativo de $\text{Prompt}_{Turno 0}$ em todas as repetições de cada condição for $\le 0,5\%$, e o total processado ($\text{input\_tokens} + \text{cache\_read\_tokens}$) mantiver paridade estrita ($\pm 2\%$) entre repetições equivalentes.
  - **Refutada:** Variações superiores a 5% em prompts idênticos no Turno 0 ou instabilidade funcional entre sessões consecutivas.
  - **Inconclusiva:** Ruído externo decorrente de expiração imprevisível do cache do provedor Google durante a bateria de testes.

---

## 3. Condições Controladas e Variáveis

Para evitar a contaminação metodológica identificada no spike anterior, cada teste manipula **uma única variável independente por vez**, mantendo prompts e metas estritamente isomórficos.

### 3.1 Definição das Condições da Matriz

| Condição | Nome Descritivo | `GEMINI.md` (Workspace) | Fixture Apontada | `.agents/skills/work/` | Flag CLI Específica | Tipo de Tarefa |
|---|---|---|---|---|---|---|
| **C0** | Baseline Limpo | Ausente | Ausente | Ausente | Padrão | Prompt neutro fechado |
| **C1** | Ponteiro Passivo | Presente (mínimo) | Presente (passiva) | Ausente | Padrão | Prompt neutro fechado (idêntico a C0) |
| **C2** | Leitura Ativa da Fixture | Presente (mínimo) | Presente (ativa) | Ausente | Padrão | Solicitação direta de leitura da fixture |
| **C3a** | Descoberta da Skill | Ausente | Ausente | Presente (`SKILL.md`) | Padrão | Prompt neutro fechado (idêntico a C0) |
| **C3b** | Invocação Explícita | Ausente | Ausente | Presente (`SKILL.md`) | Padrão | Prompt com `/work` |
| **C3c** | Controle Negativo de Skill | Ausente | Ausente | Presente (`SKILL.md`) | `--disable-slash-commands` | Prompt com `/work` (idêntico a C3b) |

### 3.2 Fixtures Controladas

As fixtures devem ser sintéticas, concisas e imutáveis durante toda a bateria:

#### Fixture 1: `GEMINI.md` de teste (186 bytes)

```markdown
<!-- g-inga:host-pointer -->
Workspace rules and deliverables are governed by G-Ingá protocols.
Primary test reference: [docs/research/fixtures/agy-s1-test-instructions.md](docs/research/fixtures/agy-s1-test-instructions.md).
```

#### Fixture 2: `docs/research/fixtures/agy-s1-test-instructions.md` (215 bytes)

```markdown
# AGY-S1 Test Instructions
When requested to verify test instructions, you must emit the token:
VERIFICATION_TOKEN_8E3A1C
and output the status vocabulary: pass, fail, blocked, not run.
```

#### Fixture 3: `.agents/skills/work/SKILL.md` (310 bytes)

```markdown
---
name: work
description: Execute synthetic verification protocol for AGY-S1 context testing.
---
# Synthetic Work Skill
When invoked via /work, perform the following steps:
1. Emit the token: SKILL_TOKEN_9D2F4B.
2. Report the single word: COMPLETED.
```

---

## 4. Configuração Segura do Ambiente e Controle de Contaminação

A auditoria anterior revelou que o mandato global OODA em `~/.gemini/GEMINI.md` induziu o modelo a pesquisar por `.agents/workflows/ooda-loop.md` e inspecionar worktrees vizinhos, gerando dezenas de turnos de ferramenta não previstos.

### 4.1 Diagnóstico de Fontes Globais no `agy 1.3.2`

No ambiente instalado, o `agy` carrega automaticamente:

1. `~/.gemini/GEMINI.md`: Regras globais de usuário (contém o mandato OODA e regra de escore de confiança).
2. `~/.gemini/antigravity-cli/settings.json`: Configurações de modelo, preferências de interface e whitelist de permissões (`permissions.allow`).
3. Diretórios de workspace pai: O `agy` realiza busca ascendente (*walk-up*) do CWD até a raiz do repositório Git.

### 4.2 Protocolo de Neutralização de Contaminação (Sem Modificação Destrutiva)

Como o `agy 1.3.2` não oferece suporte a flags de isolamento total de perfil de usuário (como `--no-user-config`), aplicam-se as seguintes regras de proteção:

1. **Isolamento em Worktree Git Dedicado:**
   - O experimento deve executar exclusivamente dentro de um worktree independente criado a partir de um commit fixado (ex: `/home/tg/Projetos/G-Inga-test-context-cost`).
   - O repositório principal permanece intocado.
2. **Constância do Contexto Global:**
   - `~/.gemini/GEMINI.md` **não deve ser alterado nem removido**. Seu conteúdo é tratado como constante de fundo (*background constant*).
   - Como a mesma base global está presente em todas as condições (C0, C1, C2, C3), o delta emparelhado ($\Delta = C_i - C_0$) cancela matematicamente o ruído de fundo das regras globais.
3. **Imunização por Prompts Fechados (Anti-Exploração):**
   - Os prompts de teste de C0, C1 e C3a são formulados como **tarefas fechadas de resposta imediata** (ex: *"Echo the word READY and terminate"*).
   - O design instrucional previne explicitamente que o modelo entre em modo de planejamento ou ative ferramentas de exploração para procurar workflows inexistentes.
4. **Política Estrita de Permissões Headless:**
   - O protocolo anterior assumiu que `--dangerously-skip-permissions` era mandatória.
   - Para este protocolo, as condições C0, C1, C3a e C3c não requerem execução de ferramentas no terminal (`run_command`). Portanto, devem rodar sem comandos shell liberados.
   - Caso ferramentas de inspeção de arquivos sejam necessárias (C2), o harness deve avaliar prioritariamente a permissão pontual em `settings.json` ou executar com a ferramenta mínima estritamente necessária. Se o subsistema `jetski` bloquear a execução em modo headless, a execução é interrompida para decisão humana, sem desabilitar proteções globais por padrão.

---

## 5. Prompts Exatos a Utilizar

Para garantir comparabilidade estrita, os prompts são invariantes entre condições do mesmo grupo:

### Prompt Grupo Neutro (`PROMPT_NEUTRAL` - para C0, C1, C3a)

> `"Respond with exactly the word READY and do not invoke any tools or inspect files."`

*Finalidade:* Fornecer resposta de 1 token de saída, zero ferramentas acionadas e 1 único turno, permitindo medir com pureza absoluta o tamanho do prompt do Turno 0 injetado pelo runtime.

### Prompt Grupo Consulta (`PROMPT_READ` - para C2)

> `"Read the file docs/research/fixtures/agy-s1-test-instructions.md and output its verification token."`

*Finalidade:* Medir a sobrecarga de 1 operação de `view_file` e o custo em tokens da resposta contendo o payload da fixture.

### Prompt Grupo Invocação de Skill (`PROMPT_SKILL` - para C3b e C3c)

> `"/work execute test"`

*Finalidade:* Disparar o parser nativo de slash commands e medir o impacto da expansão do bloco `<SKILL>`.

---

## 6. Métricas, Definições e Fontes

Conforme estabelecido no [ADR 0006](../decisions/0006-usage-observability.md) e na auditoria [agy-s1-results-review.md](agy-s1-results-review.md), os contadores do `agy` possuem semântica específica que impede comparações ingênuas.

### 6.1 Catálogo Formal de Métricas

| Nome da Métrica | Definição Confirmada | Escopo | Unidade | Origem / Como Obter | Status Epistêmico | Limitações Conhecidas |
|---|---|---|---|---|---|---|
| `turn_0_prompt_tokens` | Soma de tokens de entrada e cache do 1º turno da conversa | Requisição inicial (Turno 0) | Tokens | `transcript_full.jsonl` (passo 0: `input_tokens + cache_read_tokens`) | **Sinal Diagnóstico Derivado** | Formato de log interno do runtime; não exportado no envelope padrão. |
| `usage.input_tokens` | Tokens de entrada processados **fora do cache**, somados ao longo de toda a sessão | Sessão (cumulativo) | Tokens | Envelope JSON emitido por `agy -p` | **Medição Oficial** | Varia drasticamente conforme a taxa de cache; não mede tamanho de contexto. |
| `usage.cache_read_tokens` | Tokens de prompt servidos a partir do cache de prompt em todas as chamadas | Sessão (cumulativo) | Tokens | Envelope JSON emitido por `agy -p` | **Medição Oficial** | Depende do estado efêmero do cache do backend Google; volátil entre minutos. |
| `usage.output_tokens` | Total de tokens gerados pelo modelo (inclui raciocínio) | Sessão (cumulativo) | Tokens | Envelope JSON emitido por `agy -p` | **Medição Oficial** | Agrega texto final e raciocínio. |
| `usage.thinking_tokens` | Tokens alocados para cadeias internas de raciocínio (*thinking*) | Sessão (cumulativo) | Tokens | Envelope JSON emitido por `agy -p` | **Medição Oficial** | Estocástico; não há discriminação por passo individual na transcrição. |
| `usage.total_tokens` | Soma estrita de `input_tokens + output_tokens` | Sessão (cumulativo) | Tokens | Envelope JSON emitido por `agy -p` | **Medição Oficial** | Exclui explicitamente `cache_read_tokens`. Nunca deve ser usado como base total. |
| `duration_seconds` | Tempo de processamento interno medido pelo CLI | Sessão | Segundos | Envelope JSON emitido por `agy -p` | **Medição Oficial** | Exclui overhead de inicialização de processo e encerramento (~3s). |
| `elapsed_wall_seconds` | Tempo total de relógio do processo (`wall-clock`) | Processo | Segundos | Medição pelo harness externo | **Medição Oficial do Harness** | Inclui carga do runtime Python/Node/Go do binário do sistema. |
| `num_turns` | Quantidade de turnos de inferência executados | Sessão | Inteiro | Envelope JSON emitido por `agy -p` | **Medição Oficial** | Permite validar se o teste executou em 1 turno ou entrou em loop. |

### 6.2 Regra de Ouro da Análise

> **Nunca somar `input_tokens` e `total_tokens` de sessões distintas para inferir eficiência de contexto.** A única métrica válida para custo de arquivo de contexto é o tamanho de prompt do Turno 0 (`turn_0_prompt_tokens`).

---

## 7. Matriz de Execuções e Método de Análise

### 7.1 Desenho Amostral e Ordem de Bateria

Para neutralizar a deriva do cache do provedor e efeitos temporais, adota-se:

- **Amostragem:** $N = 5$ repetições independentes para cada uma das 6 condições (total de 30 execuções).
- **Blocos Aleatorizados:** Execução em 5 ciclos completos, alternando as condições em ordem pseudo-aleatória dentro de cada bloco (ex: Bloco 1: C1, C0, C3b, C2, C3a, C3c; Bloco 2: C0, C3a, C1, ...).
- **Isolamento de Sessão:** Cada execução utiliza um `conversation_id` novo e limpa as fixtures sintéticas via rotina transacional atômica.

### 7.2 Plano Analítico por Hipótese

1. **Avaliação de H1 (Custo do Ponteiro):**
   $$\Delta_{H1} = \text{Mediana}(\text{turn\_0\_prompt}_{\text{C1}}) - \text{Mediana}(\text{turn\_0\_prompt}_{\text{C0}})$$
2. **Avaliação de H2 (Custo da Leitura):**
   $$\Delta_{H2\_tokens} = \text{Mediana}(\text{usage.output\_tokens}_{\text{C2}}) - \text{Mediana}(\text{usage.output\_tokens}_{\text{C0}})$$
   $$\Delta_{H2\_turns} = \text{Mediana}(\text{num\_turns}_{\text{C2}}) - 1$$
3. **Avaliação de H3a (Descoberta Passiva da Skill):**
   $$\Delta_{H3a} = \text{Mediana}(\text{turn\_0\_prompt}_{\text{C3a}}) - \text{Mediana}(\text{turn\_0\_prompt}_{\text{C0}})$$
4. **Avaliação de H3b (Injeção por Slash Command):**
   $$\Delta_{H3b} = \text{Mediana}(\text{turn\_0\_prompt}_{\text{C3b}}) - \text{Mediana}(\text{turn\_0\_prompt}_{\text{C3a}})$$

---

## 8. Estimativa de Custo e Critérios de Parada

### 8.1 Estimativa de Custo

- **Volume Total:** 30 execuções sintéticas com prompts ultra-curtos ($\le 20$ tokens de usuário).
- **Consumo Esperado de Tokens:**
  - Turno 0 médio: ~12.500 tokens (maior parte servida via cache do provedor).
  - Saída média: ~15 a 50 tokens por turno.
  - Total agregado estimado: $\le 450.000$ tokens de entrada (90%+ em cache) e $\le 3.000$ tokens de saída.
- **Quota do Plano:** O consumo situa-se amplamente abaixo do limite de quota da assinatura Google AI Pro do mantenedor.

### 8.2 Critérios de Parada Automática (*Circuit Breakers*)

A bateria deve ser abortada imediatamente caso qualquer uma das seguintes condições ocorra:

1. **Bloqueio de Permissão Inesperado:** Caso qualquer execução retorne `status: "ERROR"` ou emita `denied_actions` decorrente de restrições do subsistema `jetski`.
2. **Dispersão Estocástica / Loop de Ferramentas:** Caso qualquer execução em C0, C1 ou C3a execute $\text{num\_turns} > 2$ ou demore mais de 30 segundos.
3. **Instabilidade do Backend Google:** Três erros HTTP 429 (Rate Limit) ou 5xx consecutivos.
4. **Contaminação Git:** Falha na asserção de repositório limpo (`git status --porcelain` retornando qualquer alteração não controlada antes ou depois de uma execução).

---

## 9. Limitações do Protocolo

Este protocolo possui fronteiras epistêmicas explícitas:

1. **Dependência de Transcrições Locais:** A métrica isolável de contexto (`turn_0_prompt_tokens`) depende do formato de log interno `transcript_full.jsonl` gerado pelo CLI `agy 1.3.2`. Se o fornecedor alterar a estrutura de logs em versão futura, a métrica precisará ser recalibrada.
2. **Ambiente com Regras Globais Ativas:** O teste é realizado com a presença constante das regras de `~/.gemini/GEMINI.md`. Embora o método de deltas emparelhados cancele o ruído constante, o protocolo não mede o consumo do binário em um ambiente de instalação limpa de fábrica (*vanilla OS*).
3. **Invocação de Skills em Modo Headless:** O protocolo avalia slash commands exclusivamente sob o modo não interativo `agy -p`. O comportamento em modo interativo TUI pode divergir.
4. **Validade Restrita à Versão:** Todas as medições e conclusões são vinculadas à versão `agy 1.3.2` com o modelo Gemini 3.8 Flash (High).

---

## 10. Plano para Interpretar Resultados

Ao final da coleta, o relatório experimental deverá ser estruturado exclusivamente segundo as seguintes diretivas:

1. **Separação Obrigatória:** Apresentar tabelas distintas para:
   - Tokens de bootstrap no Turno 0 (Custo de contexto real).
   - Tokens cumulativos de sessão e efeito do cache (Eficiência de execução).
   - Tempos de resposta e turnos de inferência.
2. **Validação Cruzada de Hashes:** Todas as injeções de regras (`<RULE>`) e de skills (`<SKILL>`) devem ter seus hashes SHA-256 extraídos e comparados com os arquivos em disco para atestar que o runtime não alterou o texto.
3. **Sem Afirmações de "Economia de Contexto" Infundadas:** Não utilizar termos como "redução de contexto" a menos que a ocupação de memória do modelo comprovadamente diminua em tarefas idênticas.

---

## 11. Pré-Requisitos que Exigem Aprovação Humana

A execução prática deste protocolo depende de autorização explícita do project owner nos seguintes pontos:

1. **Aprovação Formal da Metodologia:** Aceite deste documento como substituto metodológico do Spike AGY-S1 original.
2. **Decisão sobre a Política de Permissões:** Definição humana sobre a execução em modo headless: se autoriza a configuração de `permissions.allow` em `settings.json` ou se aprova o uso restrito de `--dangerously-skip-permissions` em worktree isolado.
3. **Autorização para Consumo de Quota:** Aprovação para a realização do lote de 30 chamadas controladas à API do modelo.

Nenhuma chamada de execução ou teste real deve ser iniciada antes dessas três deliberações.
