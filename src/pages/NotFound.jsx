import React from 'react'
import { Box, Button, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import SearchOffIcon from '@mui/icons-material/SearchOff'
import HomeIcon from '@mui/icons-material/Home'
import Seo from '../components/Seo'
import { PAGINAS } from '../seo/paginas'

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
        bgcolor: 'background.default',
        textAlign: 'center',
        px: 3,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Seo {...PAGINAS.naoEncontrada} />
      {/* Big faded 404 background number */}
      <Typography
        sx={{
          position: 'absolute',
          fontSize: { xs: '6rem', md: '10rem' },
          fontWeight: 900,
          color: 'primary.main',
          opacity: 0.15,
          letterSpacing: '-0.05em',
          userSelect: 'none',
          lineHeight: 1,
        }}
      >
        404
      </Typography>

      <SearchOffIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, position: 'relative' }} />
      <Typography variant="h5" fontWeight={600} sx={{ color: 'text.primary', mb: 1, position: 'relative' }}>
        Página não encontrada
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ maxWidth: 400, textAlign: 'center', mb: 0, position: 'relative' }}
      >
        A página que você procura não existe ou foi movida.
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate('/dashboard')}
        startIcon={<HomeIcon />}
        sx={{
          mt: 4,
          bgcolor: 'primary.main',
          borderRadius: '8px',
          textTransform: 'none',
          px: 4,
          fontWeight: 600,
          position: 'relative',
          '&:hover': { bgcolor: 'primary.dark' },
        }}
      >
        Voltar ao Dashboard
      </Button>
    </Box>
  )
}

export default NotFound
