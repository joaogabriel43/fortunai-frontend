import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

// Base URL do backend sem o prefixo /api (actuator está na raiz)
const backendBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3333/api')
  .replace(/\/api\/?$/, '')

/**
 * Busca o valor de uma métrica específica do actuator.
 * Usa o token JWT do localStorage para autenticação.
 */
async function fetchMetricValue(metricName) {
  const token = localStorage.getItem('authToken')
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  try {
    const response = await axios.get(`${backendBaseUrl}/actuator/metrics/${metricName}`, { headers })
    const measurements = response.data?.measurements || []
    const countMeasurement = measurements.find(m => m.statistic === 'COUNT') || measurements[0]
    return countMeasurement ? Math.floor(countMeasurement.value) : null
  } catch {
    return null
  }
}

/**
 * Hook para buscar métricas customizadas do FortunAI via Actuator.
 *
 * Retorna:
 * - transacoesCriadas: total de transações registradas (CREDIT + DEBIT)
 * - usuariosAtivos: número de usuários cadastrados
 * - chatMensagens: total de mensagens processadas pelo chat
 * - loading: boolean
 * - error: string ou null
 * - refetch: função para recarregar
 */
export function useMetricas() {
  const [transacoesCriadas, setTransacoesCriadas] = useState(null)
  const [usuariosAtivos, setUsuariosAtivos] = useState(null)
  const [chatMensagens, setChatMensagens] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchMetricas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [transacoesCredito, transacoesDebito, usuarios, chat] = await Promise.all([
        fetchMetricValue('fortunai.transacoes.criadas?tag=tipo:CREDIT'),
        fetchMetricValue('fortunai.transacoes.criadas?tag=tipo:DEBIT'),
        fetchMetricValue('fortunai.usuarios.ativos'),
        fetchMetricValue('fortunai.chat.mensagens'),
      ])

      const totalTransacoes =
        (transacoesCredito ?? 0) + (transacoesDebito ?? 0)

      setTransacoesCriadas(totalTransacoes)
      setUsuariosAtivos(usuarios)
      setChatMensagens(chat)
    } catch (err) {
      setError('Erro ao carregar metricas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetricas()
  }, [fetchMetricas])

  return { transacoesCriadas, usuariosAtivos, chatMensagens, loading, error, refetch: fetchMetricas }
}
