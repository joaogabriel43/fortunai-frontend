import React from 'react'
import {
  Box, Typography, Skeleton, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { useComparativoMensal } from '../../hooks/useComparativoMensal'

const formatBRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)

function VariacaoChip({ valor, inverter = false }) {
  const positivo = valor > 0
  const cor = inverter ? (positivo ? 'error.main' : 'success.main') : (positivo ? 'success.main' : 'error.main')
  const Icon = positivo ? TrendingUpIcon : TrendingDownIcon
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', color: cor }}>
      <Icon sx={{ fontSize: 16, mr: 0.3 }} />
      <Typography variant="body2" fontWeight={600} sx={{ color: cor }}>
        {valor > 0 ? '+' : ''}{valor}%
      </Typography>
    </Box>
  )
}

const ComparativoCard = () => {
  const { data, loading, error } = useComparativoMensal()

  if (loading) {
    return (
      <Box data-testid="comparativo-loading">
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="rectangular" height={120} sx={{ mt: 1 }} />
      </Box>
    )
  }

  if (error) return <Alert severity="error">{error}</Alert>

  if (!data || !data.categorias?.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
        Sem dados para comparacao.
      </Typography>
    )
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Comparativo Mensal
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {data.mesAnterior} vs {data.mesAtual}
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, mt: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Despesas</Typography>
          <Box><VariacaoChip valor={data.variacaoTotalDespesas} inverter /></Box>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Receitas</Typography>
          <Box><VariacaoChip valor={data.variacaoTotalReceitas} /></Box>
        </Box>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Categoria</TableCell>
              <TableCell align="right">Anterior</TableCell>
              <TableCell align="right">Atual</TableCell>
              <TableCell align="right">Variacao</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.categorias.map((c) => (
              <TableRow key={c.categoria}>
                <TableCell>
                  {c.categoria}
                  {c.categoria === data.maiorAlta && (
                    <TrendingUpIcon sx={{ fontSize: 14, ml: 0.5, color: 'error.main', verticalAlign: 'middle' }} />
                  )}
                  {c.categoria === data.maiorQueda && (
                    <TrendingDownIcon sx={{ fontSize: 14, ml: 0.5, color: 'success.main', verticalAlign: 'middle' }} />
                  )}
                </TableCell>
                <TableCell align="right">{formatBRL(c.valorMesAnterior)}</TableCell>
                <TableCell align="right">{formatBRL(c.valorMesAtual)}</TableCell>
                <TableCell align="right"><VariacaoChip valor={c.variacao} inverter /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {data.alertas?.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {data.alertas.map((alerta, i) => (
            <Alert key={i} severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 0.5 }}>
              {alerta}
            </Alert>
          ))}
        </Box>
      )}
    </Box>
  )
}

export default ComparativoCard
