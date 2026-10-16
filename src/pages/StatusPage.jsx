import React from 'react'
import { useNavigate } from 'react-router-dom'
import { alpha, Box, Button, Card, CardContent, Chip, CircularProgress, Grid, Typography, IconButton, Skeleton } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import ErrorIcon from '@mui/icons-material/Error'
import PeopleIcon from '@mui/icons-material/People'
import ChatBubbleIcon from '@mui/icons-material/ChatBubble'
import ReceiptIcon from '@mui/icons-material/Receipt'
import { useStatusPage } from '../hooks/useStatusPage'
import { useMetricas } from '../hooks/useMetricas'

const statusConfig = {
  OPERACIONAL: { color: 'success', icon: <CheckCircleIcon />, label: 'Operacional' },
  DEGRADADO: { color: 'warning', icon: <WarningIcon />, label: 'Degradado' },
  FORA: { color: 'error', icon: <ErrorIcon />, label: 'Fora do Ar' },
}

const MetricCard = ({ icon, label, value, loading: metLoading }) => (
  <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', height: '100%' }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ color: 'primary.main', flexShrink: 0 }}>{icon}</Box>
      <Box>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{label}</Typography>
        {metLoading ? (
          <Skeleton variant="text" width={60} sx={{ bgcolor: 'action.hover' }} />
        ) : (
          <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>
            {value !== null && value !== undefined ? value.toLocaleString('pt-BR') : '--'}
          </Typography>
        )}
      </Box>
    </CardContent>
  </Card>
)

const StatusPage = () => {
  const navigate = useNavigate()
  const { servicos, loading, error, refetch } = useStatusPage()
  const { transacoesCriadas, usuariosAtivos, chatMensagens, loading: metLoading } = useMetricas()

  const allOperational = servicos.length > 0 && servicos.every(s => s.status === 'OPERACIONAL')

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{ mb: 2, color: 'text.secondary', textTransform: 'none', pl: 0 }}
        >
          Voltar ao Dashboard
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} sx={{ color: 'text.primary' }}>
              Status dos Servicos
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Pondero - Monitoramento em tempo real
            </Typography>
          </Box>
          <IconButton onClick={refetch} disabled={loading} aria-label="atualizar" data-testid="refresh-btn" sx={{ color: 'primary.main' }}>
            <RefreshIcon />
          </IconButton>
        </Box>

        {/* Overall status banner */}
        <Card sx={(theme) => {
          const statusColor = allOperational ? theme.palette.success.main : theme.palette.warning.main
          return {
            mb: 3,
            borderRadius: '12px',
            bgcolor: alpha(statusColor, 0.1),
            border: '1px solid',
            borderColor: alpha(statusColor, 0.3),
          }
        }}>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="h6" fontWeight={600} data-testid="overall-status" sx={{ color: allOperational ? 'statusText.positive' : 'statusText.warning' }}>
              {loading ? 'Verificando...' : allOperational ? 'Todos os sistemas operacionais' : 'Alguns servicos com problemas'}
            </Typography>
          </CardContent>
        </Card>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress data-testid="status-loading" />
          </Box>
        )}

        {error && (
          <Typography color="statusText.negative" sx={{ textAlign: 'center', mb: 2 }}>
            {error}
          </Typography>
        )}

        {/* Metricas customizadas do Pondero */}
        <Typography variant="h6" fontWeight={600} sx={{ color: 'text.primary', mb: 2, mt: 2 }}>
          Metricas da Aplicacao
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <MetricCard
              icon={<ReceiptIcon />}
              label="Transacoes Criadas"
              value={transacoesCriadas}
              loading={metLoading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <MetricCard
              icon={<PeopleIcon />}
              label="Usuarios Cadastrados"
              value={usuariosAtivos}
              loading={metLoading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <MetricCard
              icon={<ChatBubbleIcon />}
              label="Mensagens Processadas"
              value={chatMensagens}
              loading={metLoading}
            />
          </Grid>
        </Grid>

        <Typography variant="h6" fontWeight={600} sx={{ color: 'text.primary', mb: 2 }}>
          Status dos Servicos
        </Typography>
        <Grid container spacing={2}>
          {servicos.map((servico, i) => {
            const config = statusConfig[servico.status] || statusConfig.FORA
            return (
              <Grid key={i} size={{ xs: 12 }}>
                <Card data-testid="servico-card" sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {servico.nome}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {servico.mensagem}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {servico.latenciaMs >= 0 ? `${servico.latenciaMs}ms` : '--'}
                      </Typography>
                      <Chip
                        icon={config.icon}
                        label={config.label}
                        color={config.color}
                        size="small"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>

        {servicos.length > 0 && (
          <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 3, color: 'text.disabled' }}>
            Ultima verificacao: {servicos[0]?.ultimaVerificacao || '--'}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

export default StatusPage
