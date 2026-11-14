import api from './api'

// Cobrança Premium pelo Mercado Pago (ADR-073, seção 12). Único módulo que conhece
// as rotas e os formatos da assinatura: as telas só falam com este objeto.
// Contrato confirmado em joaogabriel43/fortunai#66 (B3), exceto o cancelamento (B5).

export const CICLOS = Object.freeze({
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
 * O backend devolve o `init_point` em mercadopago.com.br (nunca o sandbox).
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
 * Erros do backend vêm como `{ timestamp, status, erro }`.
 * @returns {'desabilitado'|'gateway'|'conflito'|'limite'|'sem-assinatura'|'erro'}
 */
export const motivoErroAssinatura = (error) => {
  const status = error?.response?.status
  const codigo = error?.response?.data?.erro
  if (status === 503 && codigo === CODIGO_PAGAMENTOS_DESABILITADOS) return 'desabilitado'
  if (status === 502) return 'gateway'
  if (status === 409) return 'conflito'
  if (status === 429) return 'limite'
  if (status === 404) return 'sem-assinatura'
  return 'erro'
}

export const assinaturaService = {
  /**
   * GET /features → `pagamentos` vale true só com a flag global ligada e o usuário
   * na allowlist. Qualquer outra resposta conta como desligado.
   */
  pagamentosLiberados: () =>
    api.get('/features').then((r) => r?.data?.pagamentos === true),

  /**
   * GET /plano/assinatura/ofertas → `{ pagamentosHabilitados, ofertas: [{ ciclo, valor }] }`.
   * Responde 200 mesmo com os pagamentos desligados.
   */
  ofertas: () =>
    api.get('/plano/assinatura/ofertas').then((r) => r.data),

  /** POST /plano/assinatura → 201 `{ assinaturaId, checkoutUrl }`. */
  iniciar: (ciclo) =>
    api.post('/plano/assinatura', { ciclo }).then((r) => r.data),

  /**
   * GET /plano/assinatura → `{ assinaturaId, status, ciclo, valor, acessoAte,
   * proximaCobrancaEm, reembolsoDisponivelAte, cancelavel, reembolsoEmProcessamento }`.
   * Sem assinatura o backend responde 404 `ASSINATURA_NAO_ENCONTRADA`: vira `null`.
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
   * TODO(ADR-073 B5): endpoint ainda não publicado (proposta: 200 com o mesmo DTO do
   * GET). A tela não depende do corpo: relê o status depois.
   */
  cancelar: (solicitarReembolso) =>
    api.post('/plano/assinatura/cancelar', { solicitarReembolso }).then((r) => r.data),
}
