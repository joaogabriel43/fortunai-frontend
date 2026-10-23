import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
} from '@mui/material'
import RepeatIcon from '@mui/icons-material/Repeat'

const FREQUENCIA_LABEL = {
  SEMANAL: 'Semanal',
  MENSAL: 'Mensal',
  BIMESTRAL: 'Bimestral',
  ANUAL: 'Anual',
}

const FREQUENCIA_COLOR = {
  SEMANAL: 'secondary',
  MENSAL: 'primary',
  BIMESTRAL: 'info',
  ANUAL: 'success',
}

const NIVEL_CONFIANCA_LABEL = {
  ALTA: 'Alta confiança',
  MEDIA: 'Média confiança',
  BAIXA: 'Baixa confiança',
}

const NIVEL_CONFIANCA_COLOR = {
  ALTA: 'success',
  MEDIA: 'warning',
  BAIXA: 'default',
}

// Chip outlined: borda segue `color`, mas o texto precisa de statusText (contraste no claro).
const NIVEL_CONFIANCA_TEXT = {
  ALTA: 'statusText.positive',
  MEDIA: 'statusText.warning',
}

const formatBRL = (valor) =>
  Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const RecorrenciasCard = ({ recorrencias = [], totalMensalComprometido = 0, loading = false }) => {
  const mostrarTotal = !loading && recorrencias.length > 0 && Number(totalMensalComprometido) > 0

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              Assinaturas Recorrentes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gastos recorrentes identificados automaticamente
            </Typography>
          </Box>
          {mostrarTotal && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Comprometido/mês
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                R$ {formatBRL(totalMensalComprometido)}
              </Typography>
            </Box>
          )}
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && recorrencias.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 4,
              color: 'text.secondary',
            }}
          >
            <RepeatIcon sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} />
            <Typography variant="body2">
              Nenhuma assinatura detectada ainda
            </Typography>
            <Typography variant="caption" sx={{ mt: 0.5, textAlign: 'center' }}>
              Continue registrando suas transações para detectarmos padrões
            </Typography>
          </Box>
        )}

        {!loading && recorrencias.length > 0 && (
          <List disablePadding>
            {recorrencias.map((rec, idx) => (
              <React.Fragment key={`${rec.nome}-${idx}`}>
                <ListItem
                  alignItems="flex-start"
                  disableGutters
                  secondaryAction={
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                      <Chip
                        label={FREQUENCIA_LABEL[rec.frequencia] ?? rec.frequencia}
                        color={FREQUENCIA_COLOR[rec.frequencia] ?? 'default'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                      {rec.confianca && (
                        <Chip
                          label={NIVEL_CONFIANCA_LABEL[rec.confianca] ?? rec.confianca}
                          color={NIVEL_CONFIANCA_COLOR[rec.confianca] ?? 'default'}
                          size="small"
                          variant="outlined"
                          sx={{ color: NIVEL_CONFIANCA_TEXT[rec.confianca] }}
                        />
                      )}
                    </Box>
                  }
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: (t) => (rec.possivelmenteCancelada
                          ? t.palette.lines.strong
                          : t.palette.secondary.main),
                        width: 36,
                        height: 36,
                        fontSize: 16,
                      }}
                    >
                      {rec.nome?.charAt(0)?.toUpperCase() ?? '?'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography
                          component="span"
                          sx={{
                            fontWeight: 500,
                            textDecoration: rec.possivelmenteCancelada ? 'line-through' : 'none',
                            color: rec.possivelmenteCancelada ? 'text.secondary' : 'text.primary',
                          }}
                        >
                          {rec.nome}
                        </Typography>
                        {rec.possivelmenteCancelada && (
                          <Chip
                            label="Possivelmente cancelada"
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: 11 }}
                          />
                        )}
                        {rec.aumentouValor && (
                          <Chip
                            label="Valor subiu"
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ height: 20, fontSize: 11, color: 'statusText.warning' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box component="span">
                        {`R$ ${formatBRL(rec.valorMedio)} · Todo dia ${rec.diaRecorrente}`}
                        {rec.aumentouValor && rec.valorAnterior != null &&
                          ` · antes R$ ${formatBRL(rec.valorAnterior)}`}
                      </Box>
                    }
                    secondaryTypographyProps={{ component: 'span' }}
                  />
                </ListItem>
                {idx < recorrencias.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  )
}

export default RecorrenciasCard
