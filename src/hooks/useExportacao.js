import { useState } from 'react'
import { getToken } from '../services/authService'
import { API_BASE_URL, BACKEND_ORIGIN } from '../config/apiUrl'

/**
 * Hook para download autenticado de arquivos (PDF e CSV) dos endpoints de exportação.
 *
 * SEGURANÇA: O token JWT é obtido do authService e enviado no header Authorization.
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
      const token = getToken()
      // Endpoints absolutos sob /api partem do origin; os demais, da base da API.
      const url = endpoint.startsWith('/api')
        ? `${BACKEND_ORIGIN}${endpoint}`
        : `${API_BASE_URL}${endpoint}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          setError('Sessão expirada')
        } else {
          setError('Erro ao gerar relatório')
        }
        return
      }

      const blob = await response.blob()

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
      setError('Erro ao gerar relatório')
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, downloadArquivo, clearError: () => setError(null) }
}
