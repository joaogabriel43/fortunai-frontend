import React, { useState } from 'react'
import { Button, CircularProgress } from '@mui/material'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import api from '../../services/api'
import { prefixoMesCorrente } from '../../utils/dateUtils'

const ExportarRelatorioButton = () => {
  const [loading, setLoading] = useState(false)

  const handleExportar = async () => {
    setLoading(true)
    try {
      const mes = prefixoMesCorrente()
      const response = await api.get(`/relatorio/mensal?mes=${mes}`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `relatorio-${mes}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      // silently fail — user will see no download
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={loading ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
      onClick={handleExportar}
      disabled={loading}
      data-testid="exportar-relatorio-btn"
      sx={(t) => ({
        borderRadius: `${t.radius.sm}px`,
        textTransform: 'none',
        fontWeight: 600,
        // Ação secundária do cabeçalho: tokens do tema, nunca cor fixa. O roxo
        // legado destoava do ambiente creme/verde nos dois temas.
        borderColor: t.palette.lines.strong,
        color: t.palette.primary.main,
        '&:hover': {
          borderColor: t.palette.primary.main,
          backgroundColor: t.palette.accent.primarySoft,
        },
      })}
    >
      {loading ? 'Gerando...' : 'Exportar PDF'}
    </Button>
  )
}

export default ExportarRelatorioButton
