// STUB (red phase): reproduz o comportamento com defeito — fonte com erro e
// tratada como vazia. Substituido pela implementacao real no commit do fix.
export function estadoDaFonte({ itens }) {
  return (itens ?? []).length > 0 ? 'dados' : 'vazio'
}

export function definirProximaAcao({ transacoes, investimentos }) {
  if (transacoes !== 'dados') {
    return {
      titulo: 'Registre seus gastos do mês',
      descricao: 'O orçamento é onde suas entradas e despesas entram no sistema.',
      rotulo: 'Ir para o orçamento',
      to: '/orcamento',
    }
  }
  if (investimentos !== 'dados') {
    return {
      titulo: 'Cadastre seus ativos',
      descricao: 'Com a carteira cadastrada, o patrimônio passa a somar as duas partes.',
      rotulo: 'Ir para investimentos',
      to: '/investimentos',
    }
  }
  return {
    titulo: 'Veja o resumo do mês',
    descricao: 'O resumo reúne o que aconteceu no período com mais detalhe que o painel.',
    rotulo: 'Abrir resumo do mês',
    to: '/resumo',
  }
}
