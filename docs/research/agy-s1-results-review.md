# Revisão independente dos resultados do Spike AGY-S1

- **Tarefa:** `AGY-S1-RESULTS-REVIEW`
- **Status:** nota de pesquisa e auditoria. Não é ADR nem decisão. Não altera o relatório original.
- **Data:** 2026-10-11
- **Revisado:** [agy-s1-results.md](agy-s1-results.md), branch `agy/spike-agy-s1-minimal-host`, commit `95e87fe27b3b7cc9cb15e247ff52690c81182d47`
- **Branch desta revisão:** `agy/review-agy-s1-results` (base: o commit acima)
- **Reserva:** `refs/heads/task-claims/AGY-S1-RESULTS-REVIEW`
- **Runtime auditado:** Google Antigravity CLI `agy` 1.3.2 (`/usr/bin/agy`), modelo registrado nas sessões: Gemini 3.8 Flash (High)

Convenção usada em todo o documento:

- **Fato:** observado diretamente em um artefato citado (JSON bruto, transcrição de sessão, armazenamento da sessão, código do runner ou Git).
- **Inferência:** conclusão do revisor a partir de fatos. Pode estar errada.
- **Recomendação:** ação proposta. Não é decisão.

---

## 1. Resumo executivo

**Fatos principais:**

1. Os seis JSONs brutos, o runner final e as transcrições e armazenamentos de sessão do `agy` para as seis execuções ainda existiam no momento da revisão. Os valores de tokens da tabela do relatório conferem com os JSONs.
2. O armazenamento interno das sessões B_1, B_2, C_1 e C_2 contém o conteúdo de `GEMINI.md` do workspace injetado pelo runtime no prompt de sistema, dentro de um bloco `<RULE[.../GEMINI.md]>`. Nas sessões A_1 e A_2 esse bloco não existe.
3. Nas sessões C_1 e C_2, o runtime listou a skill `work` entre as skills disponíveis e, ao receber `/work`, injetou o corpo de `SKILL.md` na mensagem do usuário com o texto `The user has explicitly invoked the (work) skill`. O relatório original não cita essa evidência estruturada.
4. `usage.input_tokens`, `usage.cache_read_tokens` e `usage.output_tokens` são a **soma** dos valores por chamada ao modelo durante a sessão inteira. Em cada chamada, `input_tokens` é a parte do prompt **não** lida do cache, e `cache_read_tokens` é a parte lida do cache. `total_tokens` é igual a `input_tokens + output_tokens` nas seis execuções e não inclui `cache_read_tokens`.
5. O custo fixo por requisição do ponteiro, medido no primeiro passo de cada sessão, é de cerca de **+181 tokens** (A: 12.125 e 12.123; B: 12.303 e 12.307). O ponteiro **aumenta** o contexto fixo em cerca de 1,5%.
6. Quatro das seis execuções (A_1, B_1, C_1, B_2) foram produzidas por uma versão anterior do runner, que não foi preservada. O runner final as reaproveitou com `exit_code` fixado em `0` e `elapsed_wall` copiado de `duration_seconds`.
7. As execuções de controle A saíram do worktree: leram outras branches (incluindo um `GEMINI.md` com o mesmo bloco de ponteiro no spike G-S1), outro worktree e `~/.gemini/antigravity-cli/settings.json`.

**Avaliação:**

| Hipótese | Estado |
|---|---|
| H1 Carregamento das instruções pelo runtime | **Demonstrada** para o escopo testado. O seguimento do ponteiro é comportamento do modelo, não do runtime |
| H2 Descoberta e invocação explícita de `/work` | **Demonstrada** para invocação explícita por slash command em modo `-p`. Invocação implícita não testada |
| H3 Métricas disponíveis e interpretadas corretamente | **Parcial.** Disponíveis: sim. Interpretação do relatório: incorreta em pontos centrais. Semântica derivada empiricamente, não documentada |
| H4 Redução de contexto com o ponteiro | **Não sustentada.** A medida comparável mostra aumento de ~181 tokens por requisição. O efeito sobre tarefas reais é **inconclusivo** |

**Recomendação:** **aceitar parcialmente** o AGY-S1 (H1 e H2 no escopo testado) e **rejeitar a conclusão quantitativa** de redução de tokens. Ver §10.

---

## 2. Artefatos e dados efetivamente inspecionados

| Artefato | Disponível | Uso nesta revisão |
|---|---|---|
| `/tmp/spike_raw/{A_1,A_2,B_1,B_2,C_1,C_2}.json` | sim | envelopes `usage`, `status`, `duration_seconds`, `conversation_id`, `response` |
| `/tmp/spike_raw/*.err` | sim, todos com 0 bytes | stderr vazio nas seis execuções |
| `/tmp/spike_raw/summary.json` | sim | saída do runner final |
| `/tmp/run_spike.py` (mtime 00:55) | sim, só a versão final | revisão de código (§7) |
| Runner original (usado em A_1, B_1, C_1, B_2) | **não preservado** | limitação (§9) |
| `~/.gemini/antigravity-cli/brain/<id>/.system_generated/logs/transcript_full.jsonl` das seis sessões | sim | tokens por chamada ao modelo, chamadas de ferramenta, prompt do usuário, horários |
| `~/.gemini/antigravity-cli/conversations/<id>.db` das seis sessões | sim | presença do bloco de regras e da listagem de skills no prompt de sistema (inspeção por `strings`; formato interno, não documentado) |
| Sessões adjacentes do `agy` (00:43 a 00:53) | sim | linha do tempo: testes de fumaça, tentativa interrompida de A_2 e o provável teste sem a flag de permissões |
| `~/.gemini/GEMINI.md` e `~/.gemini/antigravity-cli/settings.json` | sim | regras globais e lista de permissões ativas durante o spike |
| Documentação embutida do `agy` (`builtin/skills/agy-customizations/docs/rules.md`, `skills.md`; `antigravity_guide/references/cli.md`) | sim | descoberta de `GEMINI.md`, caminho de skills, orçamento de regras |
| `https://antigravity.google/docs/cli/reference` e `/docs/permissions` | buscadas; o conteúdo retornado era só a casca HTML renderizada por JavaScript | nenhuma definição semântica dos campos de `usage` foi obtida |
| `agy --help` (1.3.2) | sim | flags `--dangerously-skip-permissions`, `--sandbox`, `--disable-slash-commands`, `--mode` |

Repositório lido integralmente: [agy-s1-results.md](agy-s1-results.md), [antigravity-cli-host-review.md](antigravity-cli-host-review.md), [decision-map.md](../decision-map.md), [ADR 0002](../decisions/0002-ceremony-tiers-and-routing.md) e [ADR 0006](../decisions/0006-usage-observability.md). [ADR 0005](../decisions/0005-native-primitive-mapping.md) foi lido nas seções sobre ponteiro, custo fixo por turno e U7.

Classes de fonte usadas:

- **Documentação oficial:** documentação embutida do `agy` 1.3.2 e `agy --help`. As páginas públicas não renderizaram. Uma busca na web confirmou apenas os **nomes** dos campos de `usage`, não seu significado.
- **Registros de execução:** JSONs brutos, transcrições e armazenamentos de sessão. São formatos internos, não contratos documentados.
- **Código-fonte instalado:** não inspecionado (binário).
- **Inferências do revisor:** marcadas como tal.

---

## 3. Matriz de hipóteses

Cada hipótese foi decomposta nos eventos pedidos: existência do arquivo, carregamento pelo runtime, descoberta, invocação e cumprimento pelo modelo.

### H1 — Carregamento das instruções (`GEMINI.md` e ponteiro)

| Evento | Estado | Evidência |
|---|---|---|
| Arquivos existem em B e C | **fato** | as transcrições de B_1, B_2, C_1 e C_2 mostram leituras bem-sucedidas da fixture. Os hashes do conteúdo lido são idênticos nas quatro (`3ed83a44904f`). O `GEMINI.md` lido em B_1 e B_2 também é idêntico (`9eafb3de51ad`) |
| Arquivos ausentes em A | **fato** | o `ls -la` de A_1 e A_2 no worktree não mostra `GEMINI.md`, `.agents/` nem a fixture |
| `GEMINI.md` carregado pelo runtime | **fato** | bloco `<RULE[/home/tg/Projetos/G-Inga-spike-agy-s1/GEMINI.md]>` presente no armazenamento de B_1, B_2, C_1 e C_2 e ausente em A_1 e A_2. O primeiro passo de B tem ~181 tokens a mais que o de A, com o mesmo prompt de usuário |
| Fixture apontada carregada pelo runtime | **não**. Fato | não há bloco de regra para a fixture. Ela entrou no contexto por chamadas `view_file` feitas pelo modelo nas quatro sessões |
| Ponteiro seguido | **fato** (comportamento do modelo) | B_2 leu a fixture como **primeira** ação, antes de abrir `GEMINI.md`. Isso só é possível se o conteúdo de `GEMINI.md` já estava no contexto |
| Instrução cumprida (marcador e frase) | B: 2/2. C: 1/2. Fato | ver §6 |

**Estado:** demonstrada para `agy` 1.3.2, `GEMINI.md` na raiz do worktree, modo `-p`. O relatório está certo na conclusão, mas não apresentou a evidência estruturada. A presença do marcador sozinha provaria só que o modelo leu a fixture por algum caminho.

### H2 — Descoberta e invocação da skill `/work`

| Evento | Estado | Evidência |
|---|---|---|
| `SKILL.md` existe em C | **fato** | lido via `view_file` em C_1 e C_2, hash idêntico (`b402fad3c562`) |
| Skill descoberta pelo runtime | **fato** | o prompt de sistema de C_1 e C_2 lista `- work (/home/tg/Projetos/G-Inga-spike-agy-s1/.agents/skills/work/SKILL.md): ...` em "Available skills". Em B_1 e B_2 a entrada não existe |
| Slash command resolvido pelo runtime | **fato** | a mensagem do usuário registrada em C_1 e C_2 contém `/work is a [Slash Command]` e `<SKILL>The user has explicitly invoked the (work) skill. ... Here are its contents: ...`, com o corpo da skill sem frontmatter. O hash do bloco é idêntico nas duas sessões (`17be3370eafd`) |
| Procedimento executado pelo modelo | **fato** (cumprimento) | as duas respostas trazem os quatro passos: confirmação, marcador `AGY_S1_SKILL_INVOCATION_TOKEN_4C82D1`, vocabulário de 4 status e frase de conclusão |
| Invocação implícita (sem `/work`, pela `description`) | **não testada** | nenhuma condição usou prompt sem barra com a skill presente |
| Controle negativo (`--disable-slash-commands`) | **não executado** | — |

**Estado:** demonstrada para invocação **explícita** por slash command em modo `-p`. O modelo também releu `SKILL.md` via `view_file` nas duas sessões, embora o corpo já estivesse injetado. Isso é redundância de comportamento e não muda a conclusão.

### H3 — Disponibilidade e interpretação das métricas

| Aspecto | Estado |
|---|---|
| Campos presentes (`input_tokens`, `output_tokens`, `thinking_tokens`, `cache_read_tokens`, `total_tokens`, `duration_seconds`, `num_turns`) | **fato**: presentes nas seis execuções |
| Semântica oficial dos campos | **não encontrada**. Ausente da documentação embutida, e as páginas públicas não renderizaram |
| Semântica empírica | **derivada**: ver §5. Vale apenas para `agy` 1.3.2 |
| Interpretação no relatório | **incorreta** em pontos centrais: trata `input_tokens` como contexto, compara `input_tokens` entre sessões com divisões cache/não cache diferentes e atribui as diferenças ao ponteiro |

**Estado:** parcialmente demonstrada.

### H4 — Redução mensurável de contexto com o ponteiro

| Aspecto | Estado |
|---|---|
| Custo fixo por requisição do ponteiro | **derivado**: +178 e +184 tokens (pares A_1/B_1 e A_2/B_2). Mediana de +181 (+1,49%). n = 2 por condição |
| Redução de ~54% em `input_tokens` atribuível ao ponteiro | **não sustentada**: ver §5.4 e §6 |
| Efeito do ponteiro sobre exploração em tarefas reais | **inconclusivo**: o desenho não isola essa variável |

### Reprodutibilidade (objetivo 5, transversal)

- **Fato:** B é estável em 2/2 (6 chamadas ao modelo cada, `input_tokens` com variação de 0,17%). C é estável em 2/2 no marcador da skill e 1/2 no marcador de instruções. A varia muito (38 contra 34 chamadas; 293 s contra 139 s).
- **Inferência:** n = 2 não permite estimar taxas de cumprimento nem intervalos. Basta para mostrar existência (o runtime injeta), não para afirmar estabilidade.

---

## 4. Avaliação do desenho experimental

| Pergunta | Resposta |
|---|---|
| A era um controle sem as instruções experimentais? | **Parcialmente.** O workspace não tinha os artefatos. Mas (fato) as regras globais de `~/.gemini/GEMINI.md` foram injetadas em **todas** as condições, e A_1 e A_2 leram por conta própria, via `git show`, o `GEMINI.md` da branch `gemini/spike-g-s1-context-pointer`, que tem o mesmo bloco `g-inga:host-pointer`. A_2 também leu `G-Inga-spike-g-s1/docs/research/gemini-cli-gs1-results.md`, em outro worktree, e `~/.gemini/antigravity-cli/settings.json`. A_1 e A_2 inspecionaram a reserva `task-claims/AGY-S1-MINIMAL-HOST`, ou seja, o próprio experimento |
| A e B diferiam só pela variável medida? | **Não.** O prompt é idêntico (fato), mas pede "any active test verification marker if present". O marcador existe **apenas** na fixture de B. Em A, o modelo procura algo inexistente e só para quando desiste. A variável manipulada foi "ponteiro **e** um alvo localizável" contra "nenhum alvo", e não apenas a presença do ponteiro |
| O conteúdo da skill era igual entre as execuções de C? | **Sim.** Fato: o hash do bloco `<SKILL>` injetado e o hash do `SKILL.md` lido são iguais em C_1 e C_2 |
| Sessões independentes? | **Parcialmente.** Os `conversation_id` são distintos. Mas o primeiro passo de C_1 leu 8.135 tokens do cache, 36 s depois de B_1 com prefixo de sistema quase igual. O cache de prompt é compartilhado entre sessões |
| Preparação determinística? | **Para o conteúdo, sim.** Hashes iguais. **Para o ambiente, não.** `node_modules/` apareceu no worktree às 00:53, entre B_2 e A_2, e o runner foi reescrito às 00:55. A_2 e C_2 rodaram em ambiente e runner diferentes dos de A_1, B_1, C_1 e B_2 |
| Sequência | A_1 00:44 → B_1 00:49 → C_1 00:50 → B_2 00:50 → tentativa de A_2 00:51 (interrompida após ~5 s) → A_2 00:55 → C_2 00:57. A ordem não foi aleatorizada |
| Marcadores sem carregamento efetivo? | O marcador **V** só existia na fixture e no runner em `/tmp`. Nenhuma sessão leu `/tmp`. Logo, a presença do marcador implica leitura da fixture, mas não indica **como** ela chegou ao contexto. Por isso H1 se apoia no bloco `<RULE>`, não no marcador |
| Duração cobre startup e execução? | Fato: `duration_seconds` exclui cerca de 3 s de startup e encerramento (A_2: 139,36 contra 142,58 s de wall; C_2: 19,65 contra 22,79 s). O "Tempo Wall" do relatório para A_1, B_1, B_2 e C_1 é cópia de `duration_seconds`, não medição |
| Repetições suficientes? | Para H1 e H2 (existência de um mecanismo determinístico do runtime), sim. Para taxas de cumprimento ou economia de tokens, não |

| Hipótese | Desenho |
|---|---|
| H1 | **adequado com ressalvas**: a evidência decisiva vem do armazenamento da sessão, não dos critérios do runner |
| H2 | **adequado com ressalvas**: sem controle negativo nem teste de invocação implícita |
| H3 | **adequado com ressalvas**: os dados permitem derivar a semântica, mas o runner não a registrou |
| H4 | **inadequado**: há confusão de tarefa, contaminação do controle e uma métrica inadequada para "contexto" |

---

## 5. Análise semântica dos contadores de tokens

### 5.1 Confirmação dos valores

Fato: os valores da tabela do relatório para A e B (e também para C) conferem com os JSONs brutos.

### 5.2 O que cada campo significa no `agy` 1.3.2

Derivado das transcrições, que registram `input_tokens`, `cache_read_tokens` e `output_tokens` por chamada ao modelo:

| Campo do envelope | Definição observada | Verificação |
|---|---|---|
| `input_tokens` | soma, em todas as chamadas da sessão, da parte do prompt **não** servida pelo cache | a soma por passo é igual ao envelope nas seis sessões (exemplo: B_1, 6 chamadas, soma 82.825) |
| `cache_read_tokens` | soma, em todas as chamadas, da parte do prompt lida do cache | A_1: soma de 38 chamadas igual a 1.668.317 |
| `output_tokens` | soma da saída por chamada | B_1: 2.881 |
| `total_tokens` | `input_tokens + output_tokens` | vale nas seis. Exclui `cache_read_tokens` |
| `thinking_tokens` | não há valor por passo nas transcrições | **inferência:** está contido em `output_tokens`, porque é sempre menor que ele. Não confirmado |

Consequências:

- Os contadores são **cumulativos por sessão** e **não** medem contexto. Uma sessão de 38 chamadas reenvia o prompt crescente 38 vezes.
- O tamanho do prompt de uma chamada é `input_tokens + cache_read_tokens` **daquela chamada**. A ocupação de contexto é o máximo desse valor, que só aparece nas transcrições, não no envelope.
- `input_tokens` sozinho não é comparável entre sessões com divisões de cache diferentes. B teve cache 0. Em A, 90% do prompt processado veio do cache.
- O orçamento inclui o prompt de sistema completo, que não aparece no workspace: regras globais do usuário, catálogo de ferramentas e skills embutidas. O primeiro passo de A, sem nenhum artefato experimental, já tem cerca de 12.100 tokens.

### 5.3 Medidas comparáveis

| Medida (derivada) | A_1 | A_2 | B_1 | B_2 | C_1 | C_2 |
|---|---:|---:|---:|---:|---:|---:|
| Prompt do 1º passo (`input + cache`) | 12.125 | 12.123 | 12.303 | 12.307 | 12.566 | 12.569 |
| Maior prompt da sessão | 83.314 | 81.548 | 15.212 | 15.145 | 14.793 | 14.530 |
| Chamadas ao modelo | 38 | 34 | 6 | 6 | 5 | 5 |
| Prompt processado acumulado (`input + cache`) | 1.855.474 | 1.673.714 | 82.825 | 82.965 | 69.412 | 67.917 |

- **A contra B no primeiro passo:** é a única comparação em que prompt, modelo e passo coincidem e só a presença de `GEMINI.md` muda. Medianas de 12.124 (A) e 12.305 (B): diferença de **+181 tokens (+1,49%)**. É o custo fixo por requisição do ponteiro desta fixture, coerente com o item 11 do [ADR 0005](../decisions/0005-native-primitive-mapping.md) (pointer + uma descrição de skill), que deixa o número para o D4 (U7).
- **C contra B no primeiro passo:** +262 tokens. Mistura listagem da skill, corpo injetado e prompt diferente. Não isola nada.

### 5.4 Por que a "redução de 54,4%" não se sustenta

1. **Métrica errada.** `input_tokens` é cumulativo e exclui o cache. Pela mesma lógica, o "prompt processado acumulado" daria uma razão A/B de cerca de 21 vezes. Nenhum dos dois números mede contexto.
2. **Causa confundida.** A diferença acumulada vem do número de chamadas (38 e 34 contra 6), que depende de a tarefa ter resposta localizável. Em A o alvo não existe.
3. **Sinal oposto na medida isolável.** O ponteiro acrescenta cerca de 181 tokens em **cada** requisição.
4. **Inferência:** um ponteiro pode, sim, encurtar a exploração quando aponta para a informação pedida. Este experimento mostra isso apenas para um prompt escrito em torno do conteúdo da fixture, o que não generaliza para o G-Ingá.

### 5.5 Por que A_1 e A_2 diferem

- **Fato:** o tamanho máximo do prompt foi parecido (83.314 e 81.548). A diferença está no número de chamadas e no caminho de exploração. A_1 leu contratos e testes. A_2 executou mais comandos (24 contra 17), inspecionou outras branches e outro worktree. A_2 também rodou com `node_modules/` presente.
- **Inferência:** a variação é estocástica, própria de uma busca aberta por algo inexistente. Não indica diferença de contexto inicial (12.125 contra 12.123).

---

## 6. Comparação de A, B e C

| | A (sem ponteiro) | B (ponteiro) | C (ponteiro + skill, prompt `/work`) |
|---|---|---|---|
| `GEMINI.md` no prompt de sistema | não | sim | sim |
| Skill `work` listada / injetada | não / não | não / não | sim / sim |
| Marcador V | 0/2: impossível por construção, o marcador não existia no workspace | 2/2 | 1/2 |
| Frase de instruções carregadas | 0/2 | 2/2 | 1/2 (C_2) |
| Marcador S | 0/2 | 0/2 | 2/2 |
| Saiu do worktree | sim (outras branches, outro worktree, `~/.gemini/...`) | não | não |

**C_1 contra C_2 no marcador V.** Fato: as duas sessões tinham o mesmo prompt de sistema e leram a mesma fixture. A fixture condiciona a diretiva: "When asked about project verification rules or test markers". O prompt de C pede "the active skill invocation marker and status vocabulary". Inferência: o gatilho é ambíguo, e o modelo o aplicou em C_2 e não em C_1. É variação de cumprimento, não de carregamento.

Limitações: n = 2. Controle A contaminado. O prompt de C difere do de A e B, e o próprio relatório reconhece isso.

---

## 7. Avaliação de segurança do runner

Só a versão final (`/tmp/run_spike.py`, 00:55) foi inspecionada. Ela **executou apenas A_2 e C_2**.

| Verificação | Resultado |
|---|---|
| 1. A limpeza remove só arquivos do runner | **Sim, na versão final.** A remoção itera sobre `created_files`, e `safe_create_file` recusa sobrescrever arquivo existente. Na versão original, usada em 4 das 6 execuções: **não verificável**. O próprio relatório diz que ela usava `shutil.rmtree` |
| 2. Diretórios preexistentes preservados | **Sim, na versão final.** Só registra diretórios que criou e os remove com `os.rmdir` apenas se vazios |
| 3. `try/finally` em falhas e interrupções | **Parcial.** Cobre exceções e `KeyboardInterrupt` (SIGINT). **Não** cobre SIGTERM com o handler padrão do Python nem SIGKILL, porque o processo termina sem executar `finally`. A tentativa preliminar de A_2 foi interrompida por SIGTERM, segundo o relatório. Mitigante: arquivos remanescentes não ignorados fariam `verify_git_clean` falhar na execução seguinte. Uma exceção levantada dentro do `finally` mascara a exceção original |
| 4. A verificação Git detecta modificações inesperadas | **Parcial.** Detecta modificação ou remoção de arquivos rastreados e arquivos não rastreados que sobrem após a limpeza. **Não** detecta arquivos em caminhos ignorados (`node_modules/` surgiu às 00:53 sem ser notado), alterações fora do worktree, nem mudanças em refs, config ou stash |
| 5. Brutos e credenciais não publicados | **Confirmado.** O commit `95e87fe` adiciona só `docs/research/agy-s1-results.md`. Uma busca por padrões de token (`ya29.`, `AIza…`, `refresh_token`, `access_token`, chaves privadas) nos brutos, no runner e no commit não encontrou nada. Os brutos ficam em `/tmp` com permissão `0644`, legíveis por outros usuários locais. Contêm respostas e caminhos, sem credenciais |
| 6. O worktree impediu alterações fora do escopo | **Não como fronteira de segurança.** Com `--dangerously-skip-permissions`, o agente tinha as permissões do usuário. Fato: A_1 e A_2 **leram** fora do worktree. Fato: nenhuma das 45 chamadas `run_command` das seis sessões tem efeito de escrita (revisão dos comandos registrados). A ausência de dano foi observada, não garantida |

Sobre `--dangerously-skip-permissions`:

- **Fato:** `agy --help` oferece alternativas que não foram avaliadas: `--sandbox` e `permissions.allow` em `settings.json`. A lista local já autorizava `command(ls)`, `command(grep)`, `command(git log)` e outros.
- **Fato:** a sessão `f30726a4` (00:52, prompt "Say OK") termina num `run_command` com `find . /home/tg/.gemini -name "*ooda*"` sem resultado registrado. **Inferência:** é o teste sem a flag citado no relatório. A ferramenta negada foi pedida porque o modelo seguia o mandato OODA das regras globais, não porque a tarefa exigisse.
- **Fato:** B e C usaram só `view_file` e `ls`. Não foi testado se essas sessões rodariam sem a flag.
- **Conclusão:** o achado vale apenas para "`agy` 1.3.2, `-p`, com estas regras globais e esta lista de permissões, quando o modelo pede um comando fora da lista". Não sustenta a regra de que automações do G-Ingá precisam desabilitar proteções.

---

## 8. Afirmações originais: confirmadas, corrigidas ou não sustentadas

| # | Afirmação em [agy-s1-results.md](agy-s1-results.md) | Veredito |
|---|---|---|
| 1 | Valores de tokens da tabela da seção 4 | **confirmada** |
| 2 | "6 execuções válidas e controladas" | **corrigida.** 4 de 6 vieram de um runner não preservado. O `exit_code` dessas 4 foi presumido pelo runner final, não registrado |
| 3 | Coluna "Tempo Wall" | **corrigida.** Para A_1, B_1, B_2 e C_1 é cópia de `duration_seconds` |
| 4 | "Condição A: nenhuma diretiva em `GEMINI.md`" | **corrigida.** Vale só para o workspace. As regras globais foram injetadas em todas as condições, e A leu um `GEMINI.md` com ponteiro em outra branch |
| 5 | B "leu `GEMINI.md` no bootstrap do contexto" | **confirmada**, por evidência que o relatório não apresentou (bloco `<RULE>`) |
| 6 | B "seguiu o link Markdown" | **confirmada como comportamento do modelo** (`view_file`), não como include do runtime |
| 7 | `/work` "automaticamente resolvido pelo parser" | **confirmada**, por evidência que o relatório não apresentou (bloco `<SKILL>`) |
| 8 | Redução de 54,4% de input, 86% de tempo, 82,5% de saída e 80% de raciocínio "pelo ponteiro" | **não sustentada.** Métrica cumulativa, tarefa confundida, controle contaminado. A medida isolável mostra +181 tokens por requisição |
| 9 | "Precisão de marcadores 0% vs 100% → detecção determinística" | **não sustentada como medição.** O 0% de A vem da construção do experimento, e C mostra 1/2 |
| 10 | `--dangerously-skip-permissions` "indispensável" | **corrigida.** Restrita ao cenário testado. Alternativas não avaliadas |
| 11 | Worktree "sem acesso de escrita a outros branches ou diretórios" | **não sustentada.** O worktree não restringe acesso. Só se observou que não houve escrita |
| 12 | `try/finally` garante a invariante | **corrigida.** Não cobre SIGTERM nem SIGKILL, nem caminhos ignorados ou externos |
| 13 | "Estratégia 1 homologada" | **não sustentada.** O spike não testou Claude Code, adaptadores finos nem includes, só um `SKILL.md` autônomo em `.agents/skills/` |
| 14 | Telemetria headless "utilizável" | **parcial.** Os campos existem, mas a semântica não está documentada e é cumulativa. A ocupação de contexto não está no envelope |
| 15 | Seção 6 (`validate` e `test` passaram) | **não reexecutada sobre o commit do spike.** Os resultados desta revisão estão no §10 |

Divergência num documento relacionado, registrada sem editá-lo: o item 6 do resumo de [antigravity-cli-host-review.md](antigravity-cli-host-review.md) afirma "contexto inicial superior a 130.000 tokens". Nesta configuração, o prompt do primeiro passo foi de cerca de 12.100 tokens. **Inferência:** o número anterior provavelmente somou contadores cumulativos. A mesma nota descreve `total_tokens` como "soma dos tokens transacionados", mas o campo exclui o cache.

---

## 9. Limitações que impedem conclusões mais fortes

1. **Runner original ausente.** O código que produziu A_1, B_1, C_1 e B_2 não foi preservado. O conteúdo dos prompts e das fixtures foi reconstituído **das transcrições**, não do código.
2. **Formatos internos.** O bloco `<RULE>`, a listagem de skills e os tokens por passo vêm de armazenamentos não documentados do `agy` 1.3.2 e podem mudar entre versões.
3. **Semântica sem fonte oficial.** As páginas públicas não renderizaram. A definição dos campos é empírica e vale só para esta versão.
4. **`thinking_tokens`.** Não há valor por passo, então a relação com `output_tokens` continua inferida.
5. **n = 2 por condição, ordem fixa e ambiente alterado no meio da série** (`node_modules/`, runner novo).
6. **Regras globais do usuário** presentes em todas as sessões. Alteram o comportamento (busca pelo workflow OODA, erro de ferramenta no 1º ou 3º passo, escore de confiança) e o custo fixo.
7. **Cache compartilhado entre sessões**, já observado em C_1.
8. **Nenhuma chamada nova ao modelo** foi feita nesta revisão. Lacunas que exigiriam execução ficaram registradas aqui, não preenchidas.

---

## 10. Recomendação e próximo passo

### Validação desta revisão

Comandos executados em 2026-10-11 no worktree `agy/review-agy-s1-results`, com este documento adicionado. Antes, foi preciso rodar `mise trust mise.toml` porque o worktree era novo.

- `mise run validate`: **pass**, exit 0. markdown-lint com 24 arquivos e 0 problemas; local-links com 383 referências em 26 arquivos; mermaid com 14 diagramas; decision-records com 6 ADRs e 8 linhas do mapa; contratos e fixtures de artefatos passaram. external-links e artifact-records ficaram como `not run`, como esperado.
- `mise run test`: **pass**, exit 0. 77 testes passaram, 0 falharam, 206 asserções.

### Decisão recomendada: aceitar parcialmente

- **Aceitar, no escopo testado** (`agy` 1.3.2, `-p --output-format json`, `GEMINI.md` na raiz, `.agents/skills/work/SKILL.md`, invocação explícita):
  - H1: o runtime carrega `GEMINI.md` do workspace no prompt de sistema.
  - H2: o runtime descobre a skill e, com `/work`, injeta seu corpo como invocação explícita.
- **Não aceitar:**
  - H4 em qualquer forma quantitativa de "economia". O dado comparável indica custo fixo de cerca de +181 tokens por requisição para esta fixture.
  - Afirmações 8 a 13 do §8.
- **Manter abertos:** invocação implícita da skill, semântica oficial dos contadores, alternativas à flag de permissões e taxas de cumprimento.

Esta recomendação **não** aprova D5, o [ADR 0006](../decisions/0006-usage-observability.md), o protocolo de concorrência nem a expansão do V1 para múltiplos hosts. Nada no [decision map](../decision-map.md) muda por causa desta revisão.

### Por que não "repetir" nem "bloquear"

- **Bloquear:** nenhuma limitação técnica impeditiva foi demonstrada. O runtime fez o que a proposta precisa.
- **Repetir o experimento inteiro:** desnecessário para H1 e H2, já sustentadas por evidência estruturada. O defeito metodológico afeta apenas H4. A repetição deve ser proposta separadamente e só se o custo fixo ou o efeito do ponteiro for decisório.

### Próximo passo prioritário (único)

**Recomendação:** escrever uma especificação de experimento H4' que meça o custo fixo do ponteiro e da skill pelo prompt do primeiro passo (`input + cache`), a partir das transcrições. Requisitos:

- regras globais do usuário neutralizadas, ou registradas como constante;
- prompt que não dependa do conteúdo da fixture;
- ordem aleatorizada e cache controlado;
- `--sandbox` ou `permissions.allow` no lugar de `--dangerously-skip-permissions`;
- runner versionado e preservado junto com os brutos;
- `--disable-slash-commands` como controle negativo de H2.

A execução depende de aprovação do owner.
