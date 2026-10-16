import { useState } from 'react'
import api from '../services/api'
import { BACKEND_ORIGIN } from '../config/apiUrl'

/**
 * Hook para download autenticado de arquivos (PDF e CSV) dos endpoints de exportação.
 *
 * SEGURANÇA: a requisição passa pelo cliente central (services/api.js): o interceptor injeta
 * o JWT e renova a sessão em 401/403 expirado (F7) — não monte Authorization à mão aqui.
 * Nunca armazena o blob no estado React — usa URL.createObjectURL e revoga imediatamente.
 *
 * INVARIANTE: O userId NUNCA é passado como parâmetro de URL — vem sempre do JWT no backend.
 */
export function useExportacao() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Baixa um arquivo do endpoint fornecido com autenticação JWT.
   *
   * @param {string} endpoint - URL do endpoint (ex: '/api/exportacao/extrato?mes=3&ano=2026')
   * @param {string} filename - Nome do arquivo para download (ex: 'extrato_03_2026.pdf')
   */
  const downloadArquivo = async (endpoint, filename) => {
    setLoading(true)
    setError(null)

    try {
      // Endpoints absolutos sob /api partem do origin; os demais, da base da API (padrão do cliente).
      const config = { responseType: 'blob' }
      if (endpoint.startsWith('/api')) config.baseURL = BACKEND_ORIGIN

      const { data: blob } = await api.get(endpoint, config)

      // Criar URL temporária e disparar download programaticamente
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Revogar imediatamente para evitar memory leak
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      // Chegar aqui com 401 significa que o interceptor já tentou renovar e não conseguiu.
      setError(err?.response?.status === 401 ? 'Sessão expirada' : 'Erro ao gerar relatório')
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, downloadArquivo, clearError: () => setError(null) }
}
