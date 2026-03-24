import { useState, useEffect } from 'react'
import api from '../services/api'

export function useScoreSaude() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/score-saude')
      .then(res => setData(res.data))
      .catch(() => setError('Erro ao carregar score'))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}
