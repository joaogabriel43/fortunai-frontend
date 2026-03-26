import { useState, useCallback, useEffect } from 'react'
import api from '../services/api'
import { useWebSocket } from './useWebSocket'

/**
 * Hook de estado para notificações do usuário.
 * Gerencia contagem de não lidas e integra com WebSocket para receber em tempo real.
 */
export function useNotificacoes() {
  const [notificacoes, setNotificacoes] = useState([])
  const [naoLidas, setNaoLidas] = useState(0)

  // Busca contagem inicial
  useEffect(() => {
    api.get('/notificacoes/count')
      .then(res => setNaoLidas(res.data.naoLidas ?? 0))
      .catch(() => {/* sem conexão ou não autenticado — ignora */})
  }, [])

  const handleNovaNotificacao = useCallback((notificacao) => {
    setNotificacoes(prev => [notificacao, ...prev])
    setNaoLidas(prev => prev + 1)
  }, [])

  useWebSocket({ onNotificacao: handleNovaNotificacao })

  const marcarComoLida = useCallback(async (id) => {
    await api.patch(`/notificacoes/${id}/lida`)
    setNotificacoes(prev =>
      prev.map(n => n.id === id ? { ...n, lida: true } : n)
    )
    setNaoLidas(prev => Math.max(0, prev - 1))
  }, [])

  return { notificacoes, naoLidas, marcarComoLida }
}
