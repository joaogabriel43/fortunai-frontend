import React from 'react'
import { NavLink } from 'react-router-dom'
import { Box, Button, Typography } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'

const NAV_LINKS = [
  { to: '/dashboard',    label: 'Dashboard' },
  { to: '/chat',         label: 'Chat' },
  { to: '/orcamento',    label: 'Orçamento' },
  { to: '/investimentos', label: 'Investimentos' },
]

const Sidebar = () => {
  const { logout } = useAuth()

  return (
    <Box
      component="aside"
      data-testid="sidebar"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* TOPO: Logo */}
      <Box
        sx={{
          px: 2.5,
          py: 3,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{ color: '#7C6AF7', letterSpacing: '-0.5px', lineHeight: 1.2 }}
        >
          FortunAI
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
          Assistente Financeiro
        </Typography>
      </Box>

      {/* MEIO: Navegação */}
      <Box component="nav" sx={{ flexGrow: 1, px: 1.5, py: 2, overflow: 'hidden' }}>
        {NAV_LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '4px',
              textDecoration: 'none',
              color: isActive ? '#ffffff' : '#8B8BA8',
              backgroundColor: isActive ? 'rgba(124, 106, 247, 0.15)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              fontSize: '0.875rem',
              transition: 'background-color 0.15s, color 0.15s',
            })}
          >
            {label}
          </NavLink>
        ))}
      </Box>

      {/* RODAPÉ: Ambiente + Sair */}
      <Box
        sx={{
          px: 1.5,
          py: 2,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: 'text.disabled', display: 'block', mb: 1, fontSize: 10, textAlign: 'center' }}
        >
          Ambiente: {import.meta.env.MODE.toUpperCase()}
        </Typography>
        <Button
          fullWidth
          variant="contained"
          color="error"
          size="small"
          onClick={logout}
          sx={{ borderRadius: '6px', textTransform: 'none' }}
        >
          Sair
        </Button>
      </Box>
    </Box>
  )
}

export default Sidebar
