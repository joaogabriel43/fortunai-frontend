const API_URL_PADRAO = 'http://localhost:3333/api'

/**
 * Normaliza a URL configurada no build para o prefixo único usado pelo backend.
 * Aceita tanto "https://host" quanto "https://host/api" sem gerar /api/api.
 */
export const normalizarApiUrl = (url = API_URL_PADRAO) => {
  const urlSemBarrasFinais = (url || API_URL_PADRAO).trim().replace(/\/+$/, '')
  return /\/api$/i.test(urlSemBarrasFinais)
    ? urlSemBarrasFinais
    : `${urlSemBarrasFinais}/api`
}

export const API_BASE_URL = normalizarApiUrl(import.meta.env.VITE_API_URL)
export const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api$/i, '')
