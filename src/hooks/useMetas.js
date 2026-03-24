import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export function useMetas() {
  const [metas, setMetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchMetas = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/metas')
      setMetas(res.data)
    } catch {
      setError('Erro ao carregar metas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMetas() }, [fetchMetas])

  const criarMeta = async (data) => {
    await api.post('/metas', data)
    await fetchMetas()
  }

  const excluirMeta = async (metaId) => {
    await api.delete(`/metas/${metaId}`)
    await fetchMetas()
  }

  return { metas, loading, error, criarMeta, excluirMeta }
}
