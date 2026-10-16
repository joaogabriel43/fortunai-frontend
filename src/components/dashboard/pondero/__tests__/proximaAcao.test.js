import { describe, it, expect } from 'vitest'
import { estadoDaFonte, definirProximaAcao } from '../proximaAcao'

describe('estadoDaFonte', () => {
  it('carregando tem precedencia sobre qualquer outro sinal', () => {
    expect(estadoDaFonte({ carregando: true, erro: true, itens: [] })).toBe('carregando')
  })

  it('erro nunca vira vazio, mesmo com lista vazia', () => {
    expect(estadoDaFonte({ erro: true, itens: [] })).toBe('erro')
    expect(estadoDaFonte({ erro: true, itens: null })).toBe('erro')
  })

  it('resposta sem lista (null) sem erro explicito tambem e indisponivel, nao vazia', () => {
    expect(estadoDaFonte({ erro: false, itens: null })).toBe('erro')
  })

  it('vazio so e confirmado quando a fonte respondeu sem erro e sem itens', () => {
    expect(estadoDaFonte({ erro: false, itens: [] })).toBe('vazio')
  })

  it('com itens e sem erro devolve dados', () => {
    expect(estadoDaFonte({ erro: false, itens: [{ id: 1 }] })).toBe('dados')
  })
})

describe('regressão: próxima ação trata fonte indisponível como vazia', () => {
  it('erro de investimentos não sugere "Cadastre seus ativos"', () => {
    const acao = definirProximaAcao({ transacoes: 'dados', investimentos: 'erro' })
    expect(acao.titulo).toBe('Não foi possível verificar seus ativos')
    expect(acao.descricao).toBe('A leitura da carteira falhou. Nada foi alterado nos seus dados.')
    expect(acao.rotulo).toBe('Tentar novamente')
    expect(acao.to).toBeUndefined()
    expect(acao.recuperar).toBe(true)
  })

  it('erro de transações não sugere "Registre seus gastos do mês"', () => {
    const acao = definirProximaAcao({ transacoes: 'erro', investimentos: 'dados' })
    expect(acao.titulo).toBe('Não foi possível verificar seus registros')
    expect(acao.descricao).toBe('A leitura das transações falhou. Nada foi alterado nos seus dados.')
    expect(acao.rotulo).toBe('Tentar novamente')
    expect(acao.to).toBeUndefined()
    expect(acao.recuperar).toBe(true)
  })

  it('erro em ambas as fontes gera uma única ação de recuperação genérica', () => {
    const acao = definirProximaAcao({ transacoes: 'erro', investimentos: 'erro' })
    expect(acao.titulo).toBe('Não foi possível verificar seus dados')
    expect(acao.rotulo).toBe('Tentar novamente')
    expect(acao.recuperar).toBe(true)
  })

  it('erro numa fonte prevalece sobre vazio confirmado na outra', () => {
    const acao = definirProximaAcao({ transacoes: 'vazio', investimentos: 'erro' })
    expect(acao.titulo).toBe('Não foi possível verificar seus ativos')
    expect(acao.recuperar).toBe(true)
  })

  it('carregando é neutro: sem botão e sem sugerir cadastro', () => {
    const acao = definirProximaAcao({ transacoes: 'carregando', investimentos: 'dados' })
    expect(acao.titulo).toBe('Verificando seus dados')
    expect(acao.rotulo).toBeUndefined()
    expect(acao.to).toBeUndefined()
    expect(acao.recuperar).toBeUndefined()
  })

  it('vazio confirmado de transações sugere o orçamento', () => {
    const acao = definirProximaAcao({ transacoes: 'vazio', investimentos: 'dados' })
    expect(acao.titulo).toBe('Registre seus gastos do mês')
    expect(acao.to).toBe('/orcamento')
  })

  it('vazio confirmado de investimentos sugere cadastrar ativos', () => {
    const acao = definirProximaAcao({ transacoes: 'dados', investimentos: 'vazio' })
    expect(acao.titulo).toBe('Cadastre seus ativos')
    expect(acao.to).toBe('/investimentos')
  })

  it('dados nas duas fontes mantém o resumo do mês', () => {
    const acao = definirProximaAcao({ transacoes: 'dados', investimentos: 'dados' })
    expect(acao.titulo).toBe('Veja o resumo do mês')
    expect(acao.rotulo).toBe('Abrir resumo do mês')
    expect(acao.to).toBe('/resumo')
  })
})
