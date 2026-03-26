import React, { useState } from 'react'
import { Badge, IconButton, Tooltip } from '@mui/material'
import NotificationsIcon from '@mui/icons-material/Notifications'
import { useNotificacoes } from '../../hooks/useNotificacoes'
import NotificacoesDrawer from './NotificacoesDrawer'

/**
 * Ícone de sino com badge vermelho para notificações não lidas.
 * Abre NotificacoesDrawer ao clicar.
 */
export default function NotificacoesBadge() {
  const [open, setOpen] = useState(false)
  const { notificacoes, naoLidas, marcarComoLida } = useNotificacoes()

  return (
    <>
      <Tooltip title="Notificações">
        <IconButton
          color="inherit"
          onClick={() => setOpen(true)}
          aria-label="abrir notificações"
        >
          <Badge
            badgeContent={naoLidas > 0 ? naoLidas : null}
            color="error"
            max={99}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <NotificacoesDrawer
        open={open}
        onClose={() => setOpen(false)}
        notificacoes={notificacoes}
        onMarcarComoLida={marcarComoLida}
      />
    </>
  )
}
