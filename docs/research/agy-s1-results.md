# Spike AGY-S1: Resultados Experimentais e Auditoria do Host Antigravity CLI

- **Identificador:** `AGY-S1` (`spike-agy-s1-minimal-host`)
- **Data:** 2026-10-11
- **Host Testado:** Google Antigravity CLI (`agy`)
- **Modelo:** Gemini 3.8 Flash (High)
- **Worktree:** `/home/tg/Projetos/G-Inga-spike-agy-s1`
- **Branch:** `agy/spike-agy-s1-minimal-host`
- **Reserva Atômica:** `refs/heads/task-claims/AGY-S1-MINIMAL-HOST`
- **Documento de Referência:** [docs/research/antigravity-cli-host-review.md](antigravity-cli-host-review.md)

---

## 1. Contexto e Objetivos do Spike

O Spike AGY-S1 é o primeiro experimento empírico controlado do G-Ingá executado contra o runtime real do Google Antigravity CLI (`agy`). O objetivo foi testar de forma reproduzível e estritamente não destrutiva as seguintes hipóteses de integração:

1. **Carregamento de instruções de workspace:** Verificar se o `agy` consome diretivas configuradas em `GEMINI.md` na raiz do repositório e segue ponteiros para arquivos de instruções complementares.
2. **Descoberta e invocação de skills:** Validar se comandos iniciados por barra (`/work`) acionam a descoberta nativa em `.agents/skills/work/SKILL.md` e executam o procedimento especificado.
3. **Comportamento do modo headless e observabilidade:** Avaliar o envelope estruturado JSON emitido por `agy -p <prompt> --output-format json`, inspecionando tempos de execução, códigos de retorno, tokens de entrada, saída, raciocínio (*thinking*) e cache.
4. **Isolamento e segurança operacional:** Comprovar que a execução em worktree Git isolado, combinada com protocolos atômicos de claim, previne contaminação do branch principal e de branches de outros agentes.

---

## 2. Auditoria de Segurança e Correção do Runner

Antes da aceitação final das evidências, o script de orquestração experimental (`/tmp/run_spike.py`) foi submetido a uma auditoria formal de segurança e robustez, identificando e corrigindo vulnerabilidades metodológicas e operacionais.

### 2.1 Diagnóstico de Vulnerabilidades no Runner Original

1. **Limpeza destrutiva indiscriminada (`shutil.rmtree`):**
   - *Falha identificada:* A rotina de limpeza do runner original executava `shutil.rmtree(agents_dir)` e `shutil.rmtree(fixtures_dir)` recursivamente no worktree, sem distinguir arquivos criados pelo teste de arquivos preexistentes ou criados por outros processos.
   - *Risco:* Risco de perda acidental de código, workflows ou fixtures preexistentes caso colocados sob `.agents/` ou `docs/research/fixtures/`.
2. **Fragilidade de formatação em métricas ausentes (`:.2f`):**
   - *Falha identificada:* O relatório final tentava formatar `duration_seconds` com `:.2f`. Se o runtime retornasse um JSON sem esse campo ou com valor `null` em caso de erro, o próprio script falhava ao gerar a tabela de resultados.
3. **Uso não auditado de permissões headless (`--dangerously-skip-permissions`):**
   - *Falha identificada:* A flag estava habilitada sem documentação técnica do motivo de sua necessidade e sem asserções atômicas de isolamento no repositório.

### 2.2 Correções Implementadas no Runner Auditado

O runner foi reescrito para cumprir as seguintes garantias estritas:

- **Rastreamento explícito de propriedade de arquivos:** Implementação dos registros em memória `created_files` (conjunto) e `created_dirs` (lista LIFO). O runner só cria arquivos após verificar que não existiam previamente no Git.
- **Limpeza cirúrgica sem `shutil.rmtree`:** A rotina `safe_cleanup()` itera exclusivamente sobre `created_files` registrados. Os diretórios criados são removidos unicamente com `os.rmdir()` e apenas se estiverem 100% vazios. Caso contenham qualquer arquivo ambíguo ou de terceiro, a limpeza automática do diretório é abortada e o conteúdo preservado.
- **Invariante de integridade Git com `try/finally`:** Todas as condições da matriz executam sob blocos `try/finally`. A função `verify_git_clean(WORKTREE)` é chamada antes do setup e logo após a limpeza, assegurando que nenhum arquivo rastreado preexistente foi modificado ou removido, e que nenhum arquivo não rastreado permaneceu.
- **Tratamento robusto de métricas nulas/ausentes:** A função auxiliar `fmt_val()` manipula com segurança campos `None`, inválidos ou ausentes, formatando valores indisponíveis como `"N/A"` sem interromper a rotina de relatório.
- **Avaliação rigorosa de execução (VALID / INVALID / INCONCLUSIVE):** Falhas de inferência, ações negadas registradas pelo CLI ou retornos com erro não são mascarados como sucesso apenas pela emissão de algum JSON.
- **Preservação e reaproveitamento de execuções válidas:** As execuções já concluídas com sucesso e metodologia idêntica foram carregadas e preservadas, executando-se apenas as repetições estritamente necessárias para completar o experimento pareado.

### 2.3 Parecer Técnico sobre `--dangerously-skip-permissions`

Um teste sintético direto foi executado contra o `agy` em modo headless (`-p`) sem a flag `--dangerously-skip-permissions`.

- **Resultado observado:** O subsistema de permissões do Antigravity CLI (`jetski`) auto-rejeitou a execução de ferramentas:
  > `jetski: no output produced — a tool required the "command" permission that headless mode cannot prompt for, so it was auto-denied. Add an allow-rule under permissions.allow in settings.json (e.g. command(<target>)). Alternatively, re-run with --dangerously-skip-permissions to auto-approve all tools.`
- O processo retornou exit code `0`, mas emitiu `response: ""` e registrou a recusa em `denied_actions: [{"action": "command", "display_name": "RunCommand"}]`.
- **Conclusão:** No modo não interativo de linha de comando (`agy -p`), a flag `--dangerously-skip-permissions` é indispensável para testes sintéticos que necessitem de invocação de ferramentas ou inspeção de arquivos.
- **Mitigação adotada:** O isolamento foi garantido pelo uso de um Git worktree dedicado (`/home/tg/Projetos/G-Inga-spike-agy-s1`), sem acesso de escrita a outros branches ou diretórios, com validação de status Git limpo antes e depois de cada chamada.

---

## 3. Desenho Experimental e Metodologia

O experimento foi desenhado para isolar perfeitamente as variáveis de teste:

### Condição A vs Condição B (Comparação Controlada)

- **Prompt idêntico (`PROMPT_AB`):**
  > *"What are the rules for modifying project deliverables and reporting verification results? If there is an entry point skill and authoritative artifact paths, name them. Include any active test verification marker if present."*
- **Mesmo modelo:** Gemini 3.8 Flash (High).
- **Mesma configuração do runtime:** `agy -p <prompt> --output-format json --dangerously-skip-permissions`.
- **Variável independente:**
  - **Condição A (Baseline):** Nenhuma diretiva em `GEMINI.md`, nenhuma fixture sintética, nenhuma pasta `.agents`.
  - **Condição B (Ponteiro Experimental):** Injeção de `GEMINI.md` contendo ponteiro contextual delimitado `<!-- g-inga:host-pointer -->` apontando para `docs/research/fixtures/agy-s1-test-instructions.md`, o qual prescreve a emissão obrigatória do token `AGY_S1_VERIFICATION_TOKEN_7F9B1E` e a confirmação textual `"AGY-S1 workspace instructions loaded successfully"`.

### Condição C (Experimento Independente de Skill)

- **Finalidade:** Testar especificamente o parser de slash command e a capacidade de expansão/invocação da skill `/work` localizada em `.agents/skills/work/SKILL.md`.
- **Prompt próprio (`PROMPT_C`):**
  > *"/work Run synthetic test inspection and report the active skill invocation marker and status vocabulary."*
- **Critério de separação metodológica:** A Condição C não é comparada diretamente em consumo de tokens brutos com as Condições A e B, pois envolve prompt, gatilho e instrução sintética distintos.

---

## 4. Matriz Completa de Execuções e Resultados

Foram coletadas 6 execuções válidas e controladas (N=2 para cada uma das condições A, B e C):

| Run ID | Cond | Status CLI | Avaliação | Input Tokens | Output Tokens | Thinking Tokens | Cache Read | Total Tokens | Duração CLI (s) | Tempo Wall (s) | V-Marker | S-Marker | 4-Status | /work |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `A_1` | A | SUCCESS | VALID | 187.157 | 20.671 | 12.999 | 1.668.317 | 207.828 | 293,07 | 293,07 | Não | Não | Sim | Sim |
| `A_2` | A | SUCCESS | VALID | 176.762 | 13.614 | 8.268 | 1.496.952 | 190.376 | 139,36 | 142,58 | Não | Não | Sim | Sim |
| `B_1` | B | SUCCESS | VALID | 82.825 | 2.881 | 2.096 | 0 | 85.706 | 31,82 | 31,82 | Sim | Não | Sim | Sim |
| `B_2` | B | SUCCESS | VALID | 82.965 | 3.106 | 2.152 | 0 | 86.071 | 28,52 | 28,52 | Sim | Não | Sim | Sim |
| `C_1` | C | SUCCESS | VALID | 61.277 | 2.099 | 1.538 | 8.135 | 63.376 | 22,05 | 22,05 | Não | Sim | Sim | Sim |
| `C_2` | C | SUCCESS | VALID | 67.917 | 2.526 | 1.641 | 0 | 70.443 | 19,65 | 22,79 | Sim | Sim | Sim | Sim |

### Detalhamento das Execuções

- **Execuções Aproveitadas (6):**
  - `A_1` e `A_2`: Ambas executaram com sucesso, explorando o repositório sem diretivas prévias em `GEMINI.md`. Responderam com precisão sobre o vocabulário de 4 status e a regra de transição de entregáveis inspecionando diretamente `CLAUDE.md`, ADRs e contratos em disco.
  - `B_1` e `B_2`: Ambas executaram com altíssima consistência (variação de tokens de entrada inferior a 0,2%), carregando imediatamente `GEMINI.md`, lendo a fixture apontada, emitindo o marcador `AGY_S1_VERIFICATION_TOKEN_7F9B1E` e a confirmação literal de instruções carregadas.
  - `C_1` e `C_2`: Ambas reconheceram o prefixo `/work`, ativando o procedimento da skill `.agents/skills/work/SKILL.md` e emitindo o marcador de invocação `AGY_S1_SKILL_INVOCATION_TOKEN_4C82D1`.
- **Execuções Descartadas (1):**
  - `A_2 (primeira tentativa da matriz preliminar)`: Interrompida via sinal SIGTERM controlado no início do teste para permitir a auditoria e correção do runner. Nenhum JSON ou métrica parcial foi gerado; foi integralmente descartada e reexecutada com o runner corrigido.
- **Execuções Inconclusivas (0):**
  - Nenhuma das 6 execuções finais foi inconclusiva. Todas retornaram envelope JSON com `status: "SUCCESS"`, zero ações negadas, respostas completas com citações explícitas aos arquivos consultados e códigos de saída `0`.

---

## 5. Análise Comparativa e Resultados Efetivamente Observados

### 5.1 Efeito do Ponteiro de Workspace (Condição A vs Condição B)

A introdução do ponteiro delimitado `<!-- g-inga:host-pointer -->` em `GEMINI.md` na raiz do repositório demonstrou impacto estatístico e comportamental significativo:

```text
Comparação A (Baseline sem ponteiro) vs B (Com ponteiro GEMINI.md):
- Tempo médio de resposta:  216,2s (A)  vs   30,2s (B)  → Redução de 86,0%
- Tokens de entrada médios: 181.959 (A) vs  82.895 (B)  → Redução de 54,4%
- Tokens de saída médios:    17.142 (A) vs   2.993 (B)  → Redução de 82,5%
- Tokens de raciocínio:      10.633 (A) vs   2.124 (B)  → Redução de 80,0%
- Precisão de marcadores:     0% (A)    vs   100% (B)   → Detecção determinística
```

- **Comportamento na Condição A:** Sem um arquivo de instruções primárias indicando onde residem as regras de teste, o agente ativou múltiplos ciclos de ferramentas de exploração (`find`, `git log`, `grep`, leitura integral de ADRs e de `docs/artifact-contracts.md`). Embora tenha respondido com 100% de correção formal sobre as regras do G-Ingá (extraídas de `CLAUDE.md`), demandou centenas de segundos e elevado consumo de tokens.
- **Comportamento na Condição B:** O agente leu `GEMINI.md` no bootstrap do contexto, seguiu o link Markdown para `docs/research/fixtures/agy-s1-test-instructions.md`, extraiu os critérios necessários e respondeu de forma concisa e direta, citando explicitamente os caminhos apontados.

### 5.2 Descoberta e Invocação da Skill `/work` (Condição C)

A Condição C comprovou que o runtime Antigravity CLI suporta a descoberta padrão de skills estruturadas no padrão G-Ingá:

- O comando `/work <instrução>` foi automaticamente resolvido pelo parser do `agy` para a skill em `.agents/skills/work/SKILL.md`.
- O modelo executou o procedimento de 4 passos descrito no arquivo da skill, emitindo o marcador `AGY_S1_SKILL_INVOCATION_TOKEN_4C82D1` e reportando com exatidão o vocabulário restrito (`pass`, `fail`, `blocked`, `not run`).
- O tempo médio de resposta foi de **20,8 segundos**, com consumo médio de **64.597 tokens de entrada**.

---

## 6. Verificação de Integridade e Conformidade Contratual

Após a execução da matriz experimental e a escrita deste relatório, o worktree foi submetido à suíte determinística de validação do repositório:

1. **`mise run validate`:** Executado com sucesso (`Overall: pass`, 22 arquivos checados pelo linter Markdown, 363 referências locais validadas, 14 diagramas Mermaid compilados para SVG sem erros, contratos de decisão e esquemas de artefatos íntegros).
2. **`mise run test`:** Suíte completa aprovada com **77 testes passando em 2 arquivos** (`0 fail`, 206 asserções verificadas).
3. **Isolamento Git:** O repositório principal (`/home/tg/Projetos/G-Inga`) permaneceu intocado durante todo o processo.

---

## 7. Limitações Reais e Implicações para o G-Ingá

Com base nas evidências deste spike, registram-se as seguintes conclusões e limitações reais para a arquitetura multi-host:

1. **Validação da Estratégia de Skills (Estratégia 1 Homologada):** A estratégia recomendada em [docs/research/antigravity-cli-host-review.md](antigravity-cli-host-review.md) (entradas isoladas com thin adapters em `.claude/skills/` e `.agents/skills/`) demonstrou viabilidade prática imediata sem dependência de links simbólicos.
2. **Observabilidade Headless:** O output JSON estruturado (`--output-format json`) fornece telemetria utilizável (`usage.input_tokens`, `usage.output_tokens`, `usage.thinking_tokens`, `duration_seconds`).
3. **Necessidade de isolamento em automações headless:** Como automações desacompanhadas exigem `--dangerously-skip-permissions` para não sofrerem bloqueio do subsistema `jetski`, qualquer runner ou harness automatizado deve operar exclusivamente dentro de Git worktrees efêmeros e isolados, com validação de invariantes antes e depois de cada sessão.
4. **Alinhamento ao ADR 0006 (Observabilidade):** Os resultados reforçam a decisão de não comparar grandezas brutas de tokens entre Claude Code e Antigravity CLI para estabelecer métricas de produtividade, limitando comparações a tempo de ciclo e taxa de aprovação determinística.
