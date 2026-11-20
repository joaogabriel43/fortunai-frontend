// Estilos compartilhados pelos cartões de autenticação (login, recuperação de senha).
export const cardSx = {
  p: 4,
  width: '100%',
  maxWidth: 420,
  borderRadius: '16px',
  border: '1px solid',
  borderColor: 'divider',
  backdropFilter: 'blur(12px)',
  bgcolor: 'background.paper',
};

export const inputSx = (theme) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'background.paper',
    '& fieldset': { borderColor: 'divider' },
    '&:hover fieldset': { borderColor: 'text.disabled' },
    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
  },
  '& .MuiInputBase-input': { color: 'text.primary' },
  '& .MuiInputBase-input:-webkit-autofill': {
    WebkitBoxShadow: `0 0 0 1000px ${theme.palette.background.paper} inset`,
    WebkitTextFillColor: theme.palette.text.primary,
    caretColor: theme.palette.text.primary,
  },
  '& .MuiInputLabel-root': { color: 'text.secondary' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
});
