import api from './api'

// Cobrança Premium pelo Mercado Pago (ADR-073, seção 12). Único módulo que conhece
// as rotas e os formatos da assinatura: as telas só falam com este objeto.
//
// TODO(ADR-073 B5): o contrato abaixo vem do ADR, não de um endpoint publicado.
// Quando o PR do B5 sair, conferir cada ponto marcado com TODO(ADR-073 B5).

export const CICLOS = Object.freeze({
  // TODO(ADR-073 B5): confirmar a grafia do enum `ciclo` no corpo do POST (ADR: MENSAL | ANUAL).
  MENSAL: 'MENSAL',
  ANUAL: 'ANUAL',
})

export const STATUS = Object.freeze({
  PENDENTE: 'PENDENTE',
  ATIVA: 'ATIVA',
  EM_ATRASO: 'EM_ATRASO',
  CANCELADA: 'CANCELADA',
  EXPIRADA: 'EXPIRADA',
  REEMBOLSADA: 'REEMBOLSADA',
})

/** Código do 503 que o backend devolve com a flag de pagamentos desligada. */
export const CODIGO_PAGAMENTOS_DESABILITADOS = 'PAGAMENTOS_DESABILITADOS'

/**
 * Só redireciona para o checkout do Mercado Pago. A URL vem do nosso backend, mas
 * conferir o destino barra um open redirect caso a resposta seja adulterada.
 * TODO(ADR-073 B5): confirmar os hosts do `init_point` (preapproval e Checkout Pro) no B5.
 */
export const isCheckoutUrlConfiavel = (url) => {
  try {
    const { protocol, hostname } = new URL(url)
    return protocol === 'https:'
      && (hostname === 'mercadopago.com.br' || hostname.endsWith('.mercadopago.com.br'))
  } catch {
    return false
  }
}

/**
 * Classifica um erro dos endpoints de assinatura em um motivo que a tela sabe mostrar.
 * @returns {'desabilitado'|'conflito'|'limite'|'sem-assinatura'|'erro'}
 */
export const motivoErroAssinatura = (error) => {
  const status = error?.response?.status
  const data = error?.response?.data
  // TODO(ADR-073 B5): confirmar em que campo do corpo vem o código (`erro` ou `codigo`).
  const codigo = data?.erro ?? data?.codigo
  if (status === 503 && codigo === CODIGO_PAGAMENTOS_DESABILITADOS) return 'desabilitado'
  if (status === 409) return 'conflito'
  if (status === 429) return 'limite'
  if (status === 404) return 'sem-assinatura'
  return 'erro'
}

export const assinaturaService = {
  /** POST /plano/assinatura → `{ assinaturaId, checkoutUrl }`. */
  iniciar: (ciclo) =>
    api.post('/plano/assinatura', { ciclo }).then((r) => r.data),

  /**
   * GET /plano/assinatura → `{ status, ciclo, acessoAte, proximaCobrancaEm,
   * reembolsoDisponivelAte, cancelavel }`, ou `null` quando o usuário nunca assinou.
   * TODO(ADR-073 B5): confirmar como o backend responde "sem assinatura" (404, 204 ou corpo vazio).
   * TODO(ADR-073 B5): confirmar o campo de "reembolso em processamento" (aqui `reembolsoEmProcessamento`).
   */
  status: () =>
    api.get('/plano/assinatura')
      .then((r) => r.data || null)
      .catch((error) => {
        if (error?.response?.status === 404) return null
        throw error
      }),

  /**
   * POST /plano/assinatura/cancelar. `solicitarReembolso = true` é o arrependimento
   * dos 7 dias (CDC art. 49): o acesso termina na hora.
   * TODO(ADR-073 B5): confirmar o corpo da resposta; a tela relê o status depois.
   */
  cancelar: (solicitarReembolso) =>
    api.post('/plano/assinatura/cancelar', { solicitarReembolso }).then((r) => r.data),
}
