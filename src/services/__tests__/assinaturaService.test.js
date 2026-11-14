import { vi, describe, it, expect, beforeEach } from 'vitest'
import api from '../api'
import {
  assinaturaService, CICLOS, isCheckoutUrlConfiavel, motivoErroAssinatura,
} from '../assinaturaService'

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

const erroHttp = (status, data) => Object.assign(new Error('http'), { response: { status, data } })

beforeEach(() => vi.clearAllMocks())

describe('isCheckoutUrlConfiavel', () => {
  it.each([
    'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=1',
    'https://mercadopago.com.br/checkout/v1/redirect?pref_id=1',
  ])('aceita checkout do Mercado Pago: %s', (url) => {
    expect(isCheckoutUrlConfiavel(url)).toBe(true)
  })

  it.each([
    'http://www.mercadopago.com.br/checkout',
    'https://mercadopago.com.br.evil.com/checkout',
    'https://evilmercadopago.com.br/checkout',
    'javascript:alert(1)',
    '/plano',
    '',
    undefined,
  ])('recusa destino fora do Mercado Pago: %s', (url) => {
    expect(isCheckoutUrlConfiavel(url)).toBe(false)
  })
})

describe('motivoErroAssinatura', () => {
  it('503 com PAGAMENTOS_DESABILITADOS vira desabilitado', () => {
    expect(motivoErroAssinatura(erroHttp(503, { erro: 'PAGAMENTOS_DESABILITADOS' }))).toBe('desabilitado')
    expect(motivoErroAssinatura(erroHttp(503, { codigo: 'PAGAMENTOS_DESABILITADOS' }))).toBe('desabilitado')
  })

  it('503 sem o código é erro genérico', () => {
    expect(motivoErroAssinatura(erroHttp(503, {}))).toBe('erro')
  })

  it('classifica 409, 429, 404 e falha de rede', () => {
    expect(motivoErroAssinatura(erroHttp(409))).toBe('conflito')
    expect(motivoErroAssinatura(erroHttp(429))).toBe('limite')
    expect(motivoErroAssinatura(erroHttp(404))).toBe('sem-assinatura')
    expect(motivoErroAssinatura(new Error('Network Error'))).toBe('erro')
  })
})

describe('assinaturaService', () => {
  it('iniciar envia o ciclo e devolve o corpo', async () => {
    api.post.mockResolvedValue({ data: { assinaturaId: 7, checkoutUrl: 'https://www.mercadopago.com.br/x' } })
    await expect(assinaturaService.iniciar(CICLOS.ANUAL))
      .resolves.toEqual({ assinaturaId: 7, checkoutUrl: 'https://www.mercadopago.com.br/x' })
    expect(api.post).toHaveBeenCalledWith('/plano/assinatura', { ciclo: 'ANUAL' })
  })

  it('status devolve null quando o backend responde 404', async () => {
    api.get.mockRejectedValue(erroHttp(404))
    await expect(assinaturaService.status()).resolves.toBeNull()
    expect(api.get).toHaveBeenCalledWith('/plano/assinatura')
  })

  it('status devolve null com corpo vazio (204)', async () => {
    api.get.mockResolvedValue({ data: '' })
    await expect(assinaturaService.status()).resolves.toBeNull()
  })

  it('status repassa outros erros', async () => {
    api.get.mockRejectedValue(erroHttp(500))
    await expect(assinaturaService.status()).rejects.toThrow('http')
  })

  it('cancelar envia solicitarReembolso', async () => {
    api.post.mockResolvedValue({ data: {} })
    await assinaturaService.cancelar(true)
    expect(api.post).toHaveBeenCalledWith('/plano/assinatura/cancelar', { solicitarReembolso: true })
  })
})
