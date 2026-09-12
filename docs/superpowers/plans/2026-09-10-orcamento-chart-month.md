# Orçamento Chart Month Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o gráfico de despesas por categoria acompanhar o mês selecionado no Orçamento sem alterar seu comportamento histórico no Dashboard.

**Architecture:** `GastosPorCategoriaChart` lê opcionalmente `MesOrcamentoContext`. Com contexto, ele refaz a consulta de transações ao mudar mês/ano, filtra débitos por prefixo ISO `YYYY-MM` e agrega categorias; sem contexto, mantém o endpoint histórico. Uma flag de atividade na limpeza do efeito impede commits de respostas obsoletas.

**Tech Stack:** React 19, Vitest, Testing Library, Axios e Recharts.

---

### Task 1: Regressão mensal e isolamento do Dashboard

**Files:**
- Create: `src/components/dashboard/__tests__/GastosPorCategoriaChart.mesOrcamento.test.jsx`
- Modify: `src/components/dashboard/GastosPorCategoriaChart.jsx`

- [x] **Step 1: Escrever o teste que navega por três meses**

Renderizar `MesOrcamentoProvider`, um botão que chama `navegar(-1)` e o gráfico. Configurar `api.get('/orcamento/transacoes/{id}')` para devolver débitos com datas nos três meses e validar, após cada clique, categoria, título mensal e nova chamada da API.

- [x] **Step 2: Executar o teste e confirmar RED**

Run: `node ./node_modules/vitest/vitest.mjs run src/components/dashboard/__tests__/GastosPorCategoriaChart.mesOrcamento.test.jsx --maxWorkers=1`

Expected: FAIL porque o componente ainda chama `analise-historica`, não reage a `mes/ano` e exibe o título histórico.

- [x] **Step 3: Implementar a fonte mensal mínima**

Adicionar `useMesOrcamento`, derivar `mes`/`ano` opcionais e, quando presentes, consultar transações e agregá-las com a seguinte regra:

```js
const prefixoMes = `${ano}-${String(mes).padStart(2, '0')}`;
const totais = transacoes
  .filter((item) => item.tipo?.toUpperCase() === 'DEBIT' && item.data?.startsWith(prefixoMes))
  .reduce((acc, item) => {
    acc[item.categoria] = (acc[item.categoria] ?? 0) + Number(item.valor);
    return acc;
  }, {});
```

Manter a transformação do endpoint histórico quando não houver contexto. No cleanup do efeito, definir `active = false` e condicionar todas as atualizações de estado ao valor de `active`.

- [x] **Step 4: Confirmar GREEN do teste focado**

Run: `node ./node_modules/vitest/vitest.mjs run src/components/dashboard/__tests__/GastosPorCategoriaChart.mesOrcamento.test.jsx --maxWorkers=1`

Expected: PASS com os três meses e o fallback histórico validados.

### Task 2: Corrida assíncrona e estados visuais

**Files:**
- Modify: `src/components/dashboard/__tests__/GastosPorCategoriaChart.mesOrcamento.test.jsx`
- Modify: `src/components/dashboard/GastosPorCategoriaChart.jsx`

- [x] **Step 1: Escrever teste de resposta obsoleta e estado vazio**

Usar promises controladas: navegar antes de resolver a primeira consulta, resolver primeiro a consulta do mês atual e depois a antiga, e verificar que a categoria do mês antigo nunca reaparece. Validar também a mensagem vazia com o mês selecionado.

- [x] **Step 2: Executar e confirmar RED quando a proteção/labels faltarem**

Run: `node ./node_modules/vitest/vitest.mjs run src/components/dashboard/__tests__/GastosPorCategoriaChart.mesOrcamento.test.jsx --maxWorkers=1`

Expected: FAIL se uma resposta invalidada atualizar estado ou se o texto não refletir o mês.

- [x] **Step 3: Completar título, vazio e cleanup**

Exibir `Despesas por Categoria — <Mês> <Ano>` e `Não há despesas em <mês> <ano> para exibir.` somente no modo mensal. Preservar literalmente os textos históricos fora do contexto.

- [x] **Step 4: Rodar teste focado, lint e build**

Run: `node ./node_modules/vitest/vitest.mjs run src/components/dashboard/__tests__/GastosPorCategoriaChart.mesOrcamento.test.jsx --maxWorkers=1`

Run: `npm run lint`

Run: `npm run build`

Expected: todos com exit code 0.

### Task 3: Validação final e entrega local

**Files:**
- Modify: `docs/superpowers/specs/2026-09-10-orcamento-chart-month-design.md`
- Modify: `docs/superpowers/plans/2026-09-10-orcamento-chart-month.md`

- [x] **Step 1: Testar manualmente três meses**

Abrir `/orcamento`, trocar entre três meses e registrar para cada um o título e as categorias/valores exibidos. Confirmar que troca rápida não reverte o gráfico.

- [x] **Step 2: Executar a suíte completa**

Run: `node ./node_modules/vitest/vitest.mjs run --maxWorkers=1`

Expected: 89 arquivos-base mais o novo arquivo, zero falhas.

- [x] **Step 3: Revisar diff e garantir isolamento**

Run: `git diff --check`

Run: `git diff --name-only origin/main...HEAD`

Expected: nenhuma alteração em `src/pages/Orcamento.jsx` nem em arquivos de Dashboard além do componente compartilhado e seu teste específico.

- [x] **Step 4: Criar o único commit solicitado**

Run: `git add docs/superpowers/specs/2026-09-10-orcamento-chart-month-design.md docs/superpowers/plans/2026-09-10-orcamento-chart-month.md src/components/dashboard/GastosPorCategoriaChart.jsx src/components/dashboard/__tests__/GastosPorCategoriaChart.mesOrcamento.test.jsx && git commit -m "fix(orcamento): atualizar grafico ao trocar mes"`

Expected: um commit local, sem push.
