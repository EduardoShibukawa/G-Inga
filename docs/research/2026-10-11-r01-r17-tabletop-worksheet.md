# G-Ingá — Planilha de Calibração Table-Top R01–R17 (ADR 0002)

**Data:** 2026-10-11  
**Objetivo:** Exercício de calibração e auditoria de roteamento dos cenários R01 a R17 para validar a precisão determinística dos critérios categóricos de cerimônia do ADR 0002.

---

## 1. Resumo dos Tiers e Regras Categóricas (ADR 0002)

- **`investigation`**: Trabalho puramente de leitura/exploração sem modificação de código ou artefato entregável.
- **`light`**: Todas as condições L1–L7 satisfeitas (S1, S2, S3, S4, S6/não-comportamental, S7 e sem S5). Zero artefato persistido em `tasks/`; execução direta com verificação e relatório de terminal.
- **`standard`**: Padrão do sistema quando não é `light` e nenhum gatilho `heavy` é ativado. Exige registro de tarefa em `tasks/`, captura de baseline antes da edição e rastreamento de evidências.
- **`heavy`**: Ativado se **qualquer** gatilho H1 a H6 for verdadeiro:

  - **H1**: Ambiguidade de produto/preferência irresolvível por investigação prévia.
  - **H2**: Mudança irreversível / *one-way door* (deleção de dados, migration com drop, mensagem externa irrevogável).
  - **H3**: Alteração de contrato já consumido por terceiros, mudança arquitetural ou impacto em 2+ subsistemas independentes.
  - **H4**: Comportamento sensível (segurança, autenticação, permissões, privacidade, financeiro ou políticas do próprio harness).
  - **H5**: Escopo excede uma sessão (necessita decomposição).
  - **H6**: Linha de base fraca (S6 falha) E erro indetectável de imediato (S7 falha).

---

## 2. Matriz de Classificação R01–R17

| ID | Cenário | Tier Determinado | Sinais Decisórios (ADR 0002) | Racional e Observações |
|:---|:---|:---:|:---|:---|
| **R01** | Fix a typo in the README | `light` | Todas as condições `light` (S1–S4, S6 não-comportamental, S7) | Edição em prosa/documentação, estritamente reversível, escopo imediato. |
| **R02** | Change one color constant, with a screenshot check available | `light` | Todas as condições `light` (S1–S4, S6, S7) | Mudança pontual de valor, padrão existente, verificação visual disponível. |
| **R03** | Add a log line inside one function | `light` | Todas as condições `light` (S1–S4, S6, S7) | Modificação de uma linha interna sem vazamento de dados sensíveis ou segredos. |
| **R04** | Off-by-one pagination bug with a clear repro, cause not yet known | `standard` | S2 falha (abordagem ainda não descrita em 1 frase) | Repro claro (S1 passa), mas causa desconhecida exige investigação guiada por teste antes do fix. |
| **R05** | New endpoint following an existing pattern, criteria given | `standard` | S3 falha (adiciona contrato público), mas não H3 | Adicionar novo endpoint não quebra contratos existentes consumidos (portanto, não é H3). |
| **R06** | Rename an internal function across 120 files with a codemod | `standard` | S3 falha (ultrapassa 1 módulo, 120 arquivos) | Amplo raio de arquivos, mas estritamente interno e mecânico. Não é H3 (sem contrato externo consumido). |
| **R07** | Rename a REST response field the Angular client consumes | `heavy` | **H3** (quebra de contrato consumido por cliente externo) | Quebra contrato de API em produção consumido pelo frontend Angular. Exige alinhamento e spec. |
| **R08** | Migration that drops a column | `heavy` | **H2** (*one-way door*, migração destrutiva de dados) | Perda potencial ou definitiva de dados em banco relacional. |
| **R09** | "Make the app multi-tenant" | `heavy` | **H1**, **H3**, **H5** (alta incerteza, múltiplos subsistemas, multi-sessão) | Demanda entrevistas de requisitos, decisão de isolamento (schema vs tabela), spec formal aprovada. |
| **R10** | Change auth token expiry | `heavy` | **H4** (S5: comportamento sensível de segurança/autenticação) | Política de segurança e expiração de sessão. Impacta segurança e experiência de login. |
| **R11** | "How does caching work here?" | `investigation` | Não altera código entregável | Pergunta puramente exploratória. Gera resposta com citações de código, sem gerar tarefa. |
| **R12** | Typo fix in an error message that an external client parses | `light → heavy` | **E1** revela **H3** (contrato consumido) | Inicia como `light`, mas na descoberta revela que clientes fazem parse da string, escalando para `heavy`. |
| **R13** | "Quick, just drop the legacy table, no plan" | `heavy` (com override) | **H2** (*one-way door* destrutivo) | Mesmo com pedido do usuário para pular plano, H2 impede `light`. Ação destrutiva exige confirmação. |
| **R14** | `standard` fix fails twice without new information | `standard → re-plan / heavy` | **E3** (duas falhas sem nova informação) | Dispara circuito de recuperação: interrompe edições cegas, força re-planejamento ou escalada para `heavy`. |
| **R15** | Suspected API change turns out to be internal only | `standard` | S3 reavaliado | A suspeita de quebra externa cai, mas não desce para `light` a menos que satisfaça todos os critérios de `light`. |
| **R16** | Module tests already red before a small change | `standard` | S6 falha (baseline já quebrado) | Não pode ser `light`. Entra em `standard` para capturar e isolar formalmente a quebra pré-existente. |
| **R17** | Change G-Ingá's own routing rules | `heavy` | **H4** (S5: política do próprio harness SDLC) | Modificação nas regras de governança e cerimônia do harness afeta a integridade de todas as tarefas. |

---

## 3. Conclusão da Calibração

1. **Taxa de Sub-roteamento Perigoso (*Unsafe Misroute Rate*):** **0%**.
   - Todos os cenários com gatilhos H2 (*one-way door*, R08/R13) e H4 (segurança/harness, R10/R17) foram classificados rigorosamente como `heavy`.
2. **Resiliência a Atalhos:** No cenário R13 (*"quick, drop without plan"*), o harness recusa a degradação para `light` e mantém os gates de proteção contra destruição acidental.
3. **Escalada Dinâmica:** Os cenários R12 e R14 demonstram que o modelo de 3 tiers do ADR 0002 não é estático: ele reage a novas evidências (E1) e falhas de verificação repetidas (E3).
