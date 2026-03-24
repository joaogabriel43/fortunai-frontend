import { useState, useEffect } from 'react'
import api from '../services/api'

export function useComparativoMensal() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const now = new Date()
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const prev = new Date(now.getFullYear(), now.getMonth() - 1)
    const mesAnterior = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`

    api.get(`/comparativo-mensal?mesAtual=${mesAtual}&mesAnterior=${mesAnterior}`)
      .then(res => setData(res.data))
      .catch(() => setError('Erro ao carregar comparativo'))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}
