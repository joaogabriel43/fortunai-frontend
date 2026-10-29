import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import theme from '../theme'
import LandingPage from '../pages/LandingPage'
import Login from '../components/Login'
import Registro from '../pages/Registro'
import StatusPage from '../pages/StatusPage'
import NotFound from '../pages/NotFound'
import TermosUsoPage from '../pages/TermosUsoPage'
import PoliticaPrivacidadePage from '../pages/PoliticaPrivacidadePage'
import Seo from '../components/Seo'

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ login: vi.fn(), user: null }) }))
vi.mock('../services/authService', () => ({ default: { registrar: vi.fn() } }))
vi.mock('../services/api', () => ({ default: { post: vi.fn(), get: vi.fn() } }))
vi.mock('../hooks/useStatusPage', () => ({
  useStatusPage: () => ({ servicos: [], loading: false, error: null, refetch: vi.fn() }),
}))
vi.mock('../hooks/useMetricas', () => ({
  useMetricas: () => ({ metricas: null, loading: false }),
}))

const SITE = 'https://www.pondero.com.br'
const TITULO_HOME = 'Pondero — Orçamento, investimentos e IR em um só lugar'

const meta = (seletor) => document.head.querySelector(seletor)
const conteudo = (seletor) => meta(seletor)?.getAttribute('content')

const renderNaRota = (ui) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>{ui}</MemoryRouter>
    </ThemeProvider>
  )

// canonical === null significa "não deve existir"; robots === null, idem.
const ROTAS = [
  { rota: '/', ui: <LandingPage />, title: TITULO_HOME, canonical: `${SITE}/`, robots: null },
  {
    rota: '/privacidade',
    ui: <PoliticaPrivacidadePage />,
    title: 'Política de Privacidade — Pondero',
    canonical: `${SITE}/privacidade`,
    robots: null,
  },
  {
    rota: '/termos',
    ui: <TermosUsoPage />,
    title: 'Termos de Uso — Pondero',
    canonical: `${SITE}/termos`,
    robots: null,
  },
  { rota: '/login', ui: <Login />, title: 'Entrar — Pondero', canonical: `${SITE}/login`, robots: null },
  {
    rota: '/registrar',
    ui: <Registro />,
    title: 'Criar conta — Pondero',
    canonical: `${SITE}/registrar`,
    robots: null,
  },
  {
    rota: '/status',
    ui: <StatusPage />,
    title: 'Status do sistema — Pondero',
    canonical: null,
    robots: 'noindex',
  },
  {
    rota: '*',
    ui: <NotFound />,
    title: 'Página não encontrada — Pondero',
    canonical: null,
    robots: 'noindex',
  },
]

describe('SEO por rota: título, canonical, og e robots', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ text: () => Promise.resolve('# Documento') })))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each(ROTAS)('$rota declara os metadados próprios', async ({ ui, title, canonical, robots }) => {
    renderNaRota(ui)

    await waitFor(() => expect(document.title).toBe(title))
    expect(conteudo('meta[property="og:title"]')).toBe(title)
    expect(conteudo('meta[name="twitter:title"]')).toBe(title)
    expect(conteudo('meta[name="description"]')).toBeTruthy()
    expect(conteudo('meta[property="og:description"]')).toBe(conteudo('meta[name="description"]'))

    if (canonical) {
      expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
      expect(meta('link[rel="canonical"]').getAttribute('href')).toBe(canonical)
      expect(conteudo('meta[property="og:url"]')).toBe(canonical)
    } else {
      expect(meta('link[rel="canonical"]')).toBeNull()
      expect(meta('meta[property="og:url"]')).toBeNull()
    }

    if (robots) {
      expect(conteudo('meta[name="robots"]')).toBe(robots)
    } else {
      expect(meta('meta[name="robots"]')).toBeNull()
    }
  })

  it('a landing usa um único título, igual ao do index.html, e não o troca ao desmontar', () => {
    const { unmount } = renderNaRota(<LandingPage />)
    expect(document.title).toBe(TITULO_HOME)
    unmount()
    expect(document.title).not.toBe('Pondero')
  })
})

describe('Seo — convivência com as tags padrão do index.html', () => {
  const padrao = `
    <title data-seo-default>Padrão</title>
    <meta data-seo-default name="description" content="padrão">
    <link data-seo-default rel="canonical" href="${SITE}/">
    <meta data-seo-default property="og:url" content="${SITE}/">
    <meta data-seo-default property="og:title" content="padrão">
    <meta data-seo-default name="twitter:title" content="padrão">`

  beforeEach(() => {
    document.head.insertAdjacentHTML('beforeend', padrao)
  })
  afterEach(() => {
    document.head.querySelectorAll('[data-seo-default]').forEach((n) => n.remove())
  })

  it('não deixa canonical nem título duplicados em /privacidade', () => {
    renderNaRota(
      <Seo path="/privacidade" title="Política de Privacidade — Pondero" description="d" />
    )
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
    expect(meta('link[rel="canonical"]').getAttribute('href')).toBe(`${SITE}/privacidade`)
    expect(document.head.querySelectorAll('title')).toHaveLength(1)
    expect(document.title).toBe('Política de Privacidade — Pondero')
    expect(document.head.querySelectorAll('meta[property="og:url"]')).toHaveLength(1)
  })

  it('página noindex remove o canonical padrão (não contradiz o noindex)', () => {
    renderNaRota(<Seo noindex title="Status do sistema — Pondero" description="d" />)
    expect(meta('link[rel="canonical"]')).toBeNull()
    expect(meta('meta[property="og:url"]')).toBeNull()
    expect(conteudo('meta[name="robots"]')).toBe('noindex')
  })

  it('restaura os padrões ao desmontar, para rotas sem Seo próprio', () => {
    const { unmount } = renderNaRota(<Seo path="/login" title="Entrar — Pondero" description="d" />)
    unmount()
    expect(meta('link[rel="canonical"]').getAttribute('href')).toBe(`${SITE}/`)
    expect(document.title).toBe('Padrão')
  })
})
