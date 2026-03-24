import { useState } from 'react'
import api from '../services/api'

export function useExtratoImportacao() {
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState(null)
  const [resultado, setResultado] = useState(null)

  const analisarExtrato = async (file) => {
    setLoading(true)
    setError(null)
    setPreview(null)
    setResultado(null)
    try {
      const formData = new FormData()
      formData.append('arquivo', file)
      const res = await api.post('/extrato/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPreview(res.data)
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao analisar extrato.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const confirmarImportacao = async (transacoes) => {
    setConfirming(true)
    setError(null)
    try {
      const res = await api.post('/extrato/confirmar', transacoes)
      setResultado(res.data)
    } catch {
      setError('Erro ao importar transações.')
    } finally {
      setConfirming(false)
    }
  }

  const resetar = () => {
    setPreview(null)
    setLoading(false)
    setConfirming(false)
    setError(null)
    setResultado(null)
  }

  return { preview, loading, confirming, error, resultado, analisarExtrato, confirmarImportacao, resetar }
}
