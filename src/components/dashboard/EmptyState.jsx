import React from 'react'
import { Box, Typography } from '@mui/material'

export default function EmptyState({ mensagem, icone: Icone, compact = false }) {
  return (
    <Box
      data-testid="empty-state"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        py: compact ? 1.5 : 4,
        opacity: 0.6,
      }}
    >
      {Icone && <Icone sx={{ fontSize: compact ? 32 : 40, color: 'text.disabled' }} />}
      <Typography variant="body2" color="text.secondary" align="center">
        {mensagem}
      </Typography>
    </Box>
  )
}
