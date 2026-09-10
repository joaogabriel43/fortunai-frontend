# Gráfico de despesas por mês no Orçamento

## Contexto e causa raiz

`GastosPorCategoriaChart` é reutilizado no Dashboard e na tela de Orçamento. Antes desta correção, o componente ignorava `MesOrcamentoContext`, buscava sempre `/orcamento/analise-historica/{usuarioId}` e repetia a consulta somente quando `user` mudava. Assim, a navegação mensal não alterava nem a chamada nem os dados do gráfico.

O endpoint histórico não recebe mês e ano. O endpoint de transações, por outro lado, já fornece data, tipo, categoria e valor suficientes para produzir a visão mensal no frontend sem ampliar o escopo para o backend.

## Decisão

O próprio gráfico consultará `MesOrcamentoContext` de forma opcional:

- dentro de `MesOrcamentoProvider`, buscará as transações do usuário, selecionará apenas débitos cuja data pertença ao mês/ano do contexto e agregará os valores por categoria;
- fora do provider, continuará usando a análise histórica existente, preservando integralmente o comportamento do Dashboard;
- mês e ano serão dependências do efeito mensal, fazendo a API ser consultada novamente a cada navegação;
- a limpeza do efeito invalidará respostas antigas para impedir que uma troca rápida de mês seja sobrescrita por uma requisição anterior.

`Orcamento.jsx` não será modificado. Isso reduz a área de mudança e evita conflito com o trabalho paralelo da Sprint 5.

## Estados visuais

Na tela de Orçamento, o título identificará o mês selecionado e o estado vazio informará que não existem despesas naquele mês. No Dashboard, o título e o estado vazio históricos permanecerão inalterados.

## Testes

Um teste de componente com o provider real navegará por três meses consecutivos. Cada resposta terá categorias diferentes, permitindo provar que:

1. a consulta mensal é refeita em cada troca;
2. os dados exibidos correspondem ao mês selecionado;
3. a resposta atrasada de um mês anterior não substitui o mês atual;
4. título e estado vazio acompanham o contexto;
5. renderizar fora do provider continua chamando o endpoint histórico.

Além do teste automatizado RED→GREEN, a validação manual exercitará três meses no navegador e registrará os valores/categorias observados.

## Evidência de execução

Validação visual executada em Chromium contra o Vite local da worktree, com respostas de API controladas e sem acesso ao backend externo:

| Mês | Despesas da fixture | Resultado observado |
| --- | --- | --- |
| Setembro/2026 | Alimentação: R$ 1.200; Saúde: R$ 300 | Título mensal, legenda e pizza 80%/20% atualizados |
| Agosto/2026 | Moradia: R$ 2.500; Transporte: R$ 480 | Título mensal, legenda e proporção da pizza atualizados após um clique |
| Julho/2026 | Educação: R$ 900; Lazer: R$ 350 | Título mensal, legenda e proporção da pizza atualizados após o segundo clique |

As capturas locais ficam em `test-results/manual-orcamento-chart/` (diretório ignorado pelo Git). O teste automatizado também cobre uma troca rápida em que a resposta do mês abandonado chega por último e confirma que ela não substitui o mês selecionado.
