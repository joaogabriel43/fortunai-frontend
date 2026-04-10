import React from 'react'
import { Box, CircularProgress } from '@mui/material'

const PageLoader = () => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100vh',
      bgcolor: '#0D0D14',
    }}
  >
    <CircularProgress sx={{ color: '#7C6AF7' }} />
  </Box>
)

export default PageLoader
