import React from 'react'
import { Box, Skeleton } from '@mui/material'

export default function DashboardSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 3 }}>
      {/* Row 1: KPI cards */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            data-testid="skeleton"
            variant="rounded"
            height={100}
            sx={{ flex: 1 }}
          />
        ))}
      </Box>

      {/* Row 2: Charts */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        {[1, 2].map((i) => (
          <Skeleton
            key={i}
            data-testid="skeleton"
            variant="rounded"
            height={300}
            sx={{ flex: 1 }}
          />
        ))}
      </Box>

      {/* Row 3: Transaction list */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton
            key={i}
            data-testid="skeleton"
            variant="rounded"
            height={44}
          />
        ))}
      </Box>
    </Box>
  )
}
