import React from 'react'
import { Box, Button, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import SearchOffIcon from '@mui/icons-material/SearchOff'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <Box
      data-testid="not-found-page"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#111118',
        textAlign: 'center',
        px: 3,
      }}
    >
      <SearchOffIcon sx={{ fontSize: 80, color: '#7C6AF7', mb: 2, opacity: 0.6 }} />
      <Typography variant="h2" fontWeight={700} sx={{ color: '#fff', mb: 1 }}>
        404
      </Typography>
      <Typography variant="h6" sx={{ color: 'text.secondary', mb: 3 }}>
        Pagina nao encontrada
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate('/dashboard')}
        sx={{
          bgcolor: '#7C6AF7',
          borderRadius: '8px',
          textTransform: 'none',
          px: 4,
          '&:hover': { bgcolor: '#6554d4' },
        }}
      >
        Voltar ao Dashboard
      </Button>
    </Box>
  )
}

export default NotFound
