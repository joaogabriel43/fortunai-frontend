/**
 * Próxima ação do panorama: NAVEGACIONAL, nunca recomendação financeira.
 *
 * Cada fonte (transações, investimentos) está em um de quatro estados:
 * 'carregando' | 'erro' | 'vazio' | 'dados'. "Vazio" só é confirmado quando a
 * fonte respondeu sem erro e sem itens — falha de leitura NÃO é ausência de
 * dados, e sugerir cadastro nesse caso afirmaria algo que não sabemos.
 */

export function estadoDaFonte({ carregando = false, erro = false, itens }) {
  if (carregando) return 'carregando'
  // `itens` nulo sem erro explícito (resposta fora do contrato) também é indisponível.
  if (erro || !Array.isArray(itens)) return 'erro'
  return itens.length === 0 ? 'vazio' : 'dados'
}

const RECUPERAR = { rotulo: 'Tentar novamente', recuperar: true }

export function definirProximaAcao({ transacoes, investimentos }) {
  if (transacoes === 'erro' || investimentos === 'erro') {
    const ambas = transacoes === 'erro' && investimentos === 'erro'
    if (ambas) {
      return {
        titulo: 'Não foi possível verificar seus dados',
        descricao: 'A leitura das transações e da carteira falhou. Nada foi alterado nos seus dados.',
        ...RECUPERAR,
      }
    }
    return transacoes === 'erro'
      ? {
          titulo: 'Não foi possível verificar seus registros',
          descricao: 'A leitura das transações falhou. Nada foi alterado nos seus dados.',
          ...RECUPERAR,
        }
      : {
          titulo: 'Não foi possível verificar seus ativos',
          descricao: 'A leitura da carteira falhou. Nada foi alterado nos seus dados.',
          ...RECUPERAR,
        }
  }
  // Neutro, sem botão: ainda não dá para afirmar nem vazio nem dados.
  if (transacoes === 'carregando' || investimentos === 'carregando') {
    return {
      titulo: 'Verificando seus dados',
      descricao: 'Assim que a leitura terminar, a próxima ação aparece aqui.',
    }
  }
  if (transacoes === 'vazio') {
    return {
      titulo: 'Registre seus gastos do mês',
      descricao: 'O orçamento é onde suas entradas e despesas entram no sistema.',
      rotulo: 'Ir para o orçamento',
      to: '/orcamento',
    }
  }
  if (investimentos === 'vazio') {
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
