import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export function useStatusPage() {
  const [servicos, setServicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStatus = useCallback(() => {
    setLoading(true)
    api.get('/status')
      .then(res => {
        setServicos(res.data)
        setError(null)
      })
      .catch(() => setError('Erro ao verificar status'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  return { servicos, loading, error, refetch: fetchStatus }
}
