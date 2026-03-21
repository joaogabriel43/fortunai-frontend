import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0A0A0F',
      paper: '#111118',
    },
    primary: {
      main: '#7C6AF7',
      dark: '#5B4FD4',
      contrastText: '#F0F0F8',
    },
    secondary: {
      main: '#00D4AA',
      contrastText: '#0A0A0F',
    },
    error: {
      main: '#FF4D6A',
    },
    text: {
      primary: '#F0F0F8',
      secondary: '#8B8BA8',
    },
    divider: 'rgba(255,255,255,0.06)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#111118',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#111118',
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
});

export default theme;
