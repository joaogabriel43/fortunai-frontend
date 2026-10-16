import { useState, useEffect } from 'react'
import api from '../services/api'
import { useMesOrcamento } from '../contexts/MesOrcamentoContext'
import { mesCorrente, mesAnterior } from '../utils/dateUtils'

const prefixo = ({ ano, mes }) => `${ano}-${String(mes).padStart(2, '0')}`

// Compara o mês de referência da página Orçamento (MesOrcamentoContext) com o
// anterior; fora do Provider, cai no mês de hoje em America/Sao_Paulo.
export function useComparativoMensal() {
  const { ano, mes } = useMesOrcamento() ?? mesCorrente()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false
    const atual = prefixo({ ano, mes })
    const anterior = prefixo(mesAnterior({ ano, mes }))

    api.get(`/comparativo-mensal?mesAtual=${atual}&mesAnterior=${anterior}`)
      .then(res => { if (!cancelado) { setData(res.data); setError(null) } })
      .catch(() => { if (!cancelado) setError('Erro ao carregar comparativo') })
      .finally(() => { if (!cancelado) setLoading(false) })

    return () => { cancelado = true }
  }, [ano, mes])

  return { data, loading, error }
}
