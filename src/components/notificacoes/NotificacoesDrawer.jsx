import React from 'react'
import {
  Drawer, Box, Typography, List, ListItem, ListItemText,
  ListItemIcon, IconButton, Button, Divider, Chip
} from '@mui/material'
import NotificationsIcon from '@mui/icons-material/Notifications'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import BarChartIcon from '@mui/icons-material/BarChart'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import CloseIcon from '@mui/icons-material/Close'

const TIPO_ICONE = {
  PRECO: <TrendingUpIcon fontSize="small" sx={{ color: '#00bcd4' }} />,
  GASTO: <AccountBalanceWalletIcon fontSize="small" sx={{ color: '#ff9800' }} />,
  PORTFOLIO: <BarChartIcon fontSize="small" sx={{ color: '#9c27b0' }} />,
  DIGEST_SEMANAL: <CalendarTodayIcon fontSize="small" sx={{ color: '#4caf50' }} />,
}

function tempoRelativo(criadaEm) {
  if (!criadaEm) return ''
  const diff = Math.floor((Date.now() - new Date(criadaEm).getTime()) / 1000)
  if (diff < 60) return 'agora'
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`
  return `há ${Math.floor(diff / 86400)} dias`
}

/**
 * Drawer lateral com lista de notificações.
 */
export default function NotificacoesDrawer({ open, onClose, notificacoes = [], onMarcarComoLida }) {
  const handleMarcarTodas = () => {
    notificacoes.filter(n => !n.lida).forEach(n => onMarcarComoLida(n.id))
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 360, bgcolor: '#1a1a24', color: 'text.primary' } }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={600}>
          Notificações
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button size="small" onClick={handleMarcarTodas} disabled={!notificacoes.some(n => !n.lida)}>
            Marcar todas como lidas
          </Button>
          <IconButton size="small" onClick={onClose} aria-label="fechar">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {notificacoes.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          <NotificationsIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
          <Typography variant="body2">Nenhuma notificação</Typography>
        </Box>
      ) : (
        <List disablePadding>
          {notificacoes.map((n) => (
            <React.Fragment key={n.id}>
              <ListItem
                alignItems="flex-start"
                onClick={() => !n.lida && onMarcarComoLida(n.id)}
                sx={{
                  cursor: n.lida ? 'default' : 'pointer',
                  bgcolor: n.lida ? 'transparent' : 'rgba(255,255,255,0.04)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                  px: 2, py: 1.5,
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                  {TIPO_ICONE[n.tipo] ?? <NotificationsIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight={n.lida ? 400 : 600} noWrap sx={{ flex: 1 }}>
                        {n.titulo}
                      </Typography>
                      {!n.lida && (
                        <Chip label="Novo" size="small" color="error"
                          sx={{ ml: 1, height: 16, fontSize: '0.65rem' }} />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {n.mensagem}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {tempoRelativo(n.criadaEm)}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.04)' }} />
            </React.Fragment>
          ))}
        </List>
      )}
    </Drawer>
  )
}
