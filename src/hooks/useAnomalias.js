import { useState, useEffect } from 'react'
import api from '../services/api'

export function useAnomalias() {
  const [anomalias, setAnomalias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/anomalias')
      .then(res => setAnomalias(res.data))
      .catch(() => setError('Erro ao carregar anomalias'))
      .finally(() => setLoading(false))
  }, [])

  return { anomalias, loading, error }
}
