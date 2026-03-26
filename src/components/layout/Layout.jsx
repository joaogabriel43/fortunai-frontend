import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppBar, Box, Drawer, IconButton, Toolbar } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import Sidebar from '../Sidebar'
import NotificacoesBadge from '../notificacoes/NotificacoesBadge'

const DRAWER_WIDTH = 220

const drawerPaperSx = {
  width: DRAWER_WIDTH,
  boxSizing: 'border-box',
  height: '100vh',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  background: '#111118',
  borderRight: '1px solid rgba(255,255,255,0.06)',
}

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleToggle = () => setMobileOpen((prev) => !prev)
  const handleClose = () => setMobileOpen(false)

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* AppBar — sempre no DOM; Toolbar oculta em desktop via CSS */}
      <AppBar
        data-testid="app-bar"
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: '#111118',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Toolbar sx={{ display: { xs: 'flex', md: 'none' }, minHeight: 56 }}>
          <IconButton
            data-testid="menu-toggle"
            color="inherit"
            edge="start"
            onClick={handleToggle}
            aria-expanded={mobileOpen.toString()}
            aria-label="abrir menu de navegação"
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <NotificacoesBadge />
        </Toolbar>
        <Toolbar sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end', minHeight: 48 }}>
          <NotificacoesBadge />
        </Toolbar>
      </AppBar>

      {/* Área de navegação: Temporary (mobile) + Permanent (desktop) */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>

        {/* Mobile: Temporary Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': drawerPaperSx,
          }}
        >
          <Sidebar />
        </Drawer>

        {/* Desktop: Permanent Drawer */}
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': drawerPaperSx,
          }}
        >
          <Sidebar />
        </Drawer>

      </Box>

      {/* Conteúdo principal — scroll acontece aqui, não no body */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: 0,
          height: { xs: 'calc(100vh - 56px)', md: '100vh' },
          mt: { xs: '56px', md: 0 },
          overflowY: 'auto',
          overflowX: 'hidden',
          minWidth: 0,
        }}
      >
        <Outlet />
      </Box>

    </Box>
  )
}

export default Layout
