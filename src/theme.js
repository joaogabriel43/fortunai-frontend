import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#7C6AF7' },
    secondary: { main: '#00D4AA' },
    error: { main: '#FF4D6A' },
    background: {
      default: '#0a0a0f',
      paper: 'rgba(255,255,255,0.04)',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#8B8BA8',
    },
    divider: 'rgba(255,255,255,0.06)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          background: 'linear-gradient(135deg, #7C6AF7 0%, #5B4FD4 100%)',
          boxShadow: 'none',
          borderRadius: 8,
          fontWeight: 600,
          textTransform: 'none',
          '&:hover': {
            boxShadow: '0 0 20px rgba(124,106,247,0.4)',
            background: 'linear-gradient(135deg, #7C6AF7 0%, #5B4FD4 100%)',
          },
        },
        outlined: {
          border: '1px solid rgba(124,106,247,0.5)',
          color: '#7C6AF7',
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
          '&:hover': {
            border: '1px solid rgba(124,106,247,0.8)',
            backgroundColor: 'rgba(124,106,247,0.08)',
          },
        },
        text: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.12)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.24)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#7C6AF7',
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.12)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.24)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#7C6AF7',
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255,255,255,0.06)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
  },
})

export default theme
