import { useEffect, useState } from 'react'
import { PAGAMENTOS_HABILITADOS } from '../config/features'
import { assinaturaService } from '../services/assinaturaService'

/**
 * Pagamentos só aparecem com as duas chaves ligadas: a constante do frontend
 * (kill switch, sem requisição quando false) e `GET /features.pagamentos` do
 * backend (flag global + allowlist por usuário). Falha na consulta conta como false.
 * @returns {boolean|null} null enquanto consulta o backend.
 */
export default function usePagamentosHabilitados() {
  const [liberado, setLiberado] = useState(PAGAMENTOS_HABILITADOS ? null : false)

  useEffect(() => {
    if (!PAGAMENTOS_HABILITADOS) return undefined
    let ativo = true
    assinaturaService.pagamentosLiberados()
      .then((valor) => { if (ativo) setLiberado(valor === true) })
      .catch(() => { if (ativo) setLiberado(false) })
    return () => { ativo = false }
  }, [])

  return liberado
}
