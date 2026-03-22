import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const initialState = {
  loading: true,
  error: null,
  proventos: [],
  resumo: { totalPago: 0, totalProvisionado: 0 },
}

/**
 * Hook para buscar proventos e resumo financeiro do usuário autenticado.
 * Endpoints consumidos:
 *   GET /api/proventos        → lista completa
 *   GET /api/proventos/resumo → totalPago e totalProvisionado
 */
export function useDividendos() {
  const [state, setState] = useState(initialState)

  const fetchDividendos = useCallback(async () => {
    try {
      const [proventosRes, resumoRes] = await Promise.all([
        api.get('/proventos'),
        api.get('/proventos/resumo'),
      ])

      setState({
        loading: false,
        error: null,
        proventos: Array.isArray(proventosRes.data) ? proventosRes.data : [],
        resumo: resumoRes.data ?? { totalPago: 0, totalProvisionado: 0 },
      })
    } catch {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Não foi possível carregar os proventos.',
      }))
    }
  }, [])

  useEffect(() => {
    fetchDividendos()
  }, [fetchDividendos])

  return { ...state, refetch: fetchDividendos }
}
