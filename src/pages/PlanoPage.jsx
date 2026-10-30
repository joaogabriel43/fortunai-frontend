import React from 'react'
import {
  Box, Typography, Card, CardContent, Chip, Button, Divider,
  List, ListItem, ListItemIcon, ListItemText, Accordion,
  AccordionSummary, AccordionDetails,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import StarIcon from '@mui/icons-material/Star'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useNavigate } from 'react-router-dom'
import usePlano from '../hooks/usePlano'

const FEATURES_FREE = [
  { texto: 'Orçamento ilimitado', incluido: true },
  { texto: 'Metas financeiras', incluido: true },
  { texto: 'Calculadoras FIRE e Juros', incluido: true },
  { texto: '10 mensagens de IA por dia', incluido: true },
  { texto: '3 análises de anomalias por mês', incluido: true },
  { texto: 'Exportação PDF/CSV', incluido: false },
  { texto: 'Alertas de preço', incluido: false },
  { texto: 'Otimização Markowitz ilimitada', incluido: false },
  { texto: 'Chat ilimitado', incluido: false },
]

const FEATURES_PREMIUM = FEATURES_FREE.map(f => ({ ...f, incluido: true }))

const FAQ = [
  {
    q: 'Como faço upgrade?',
    a: 'Entre em contato por e-mail em contato@pondero.com.br e nossa equipe ativa o Premium manualmente.',
  },
  {
    q: 'Posso cancelar?',
    a: 'Sim, a qualquer momento. Basta nos contatar e seu plano volta para Free imediatamente.',
  },
  {
    q: 'Meus dados ficam salvos?',
    a: 'Sim, todos os seus dados ficam preservados independente do plano.',
  },
]

const PlanoPage = () => {
  const { plano, isPremium, loading } = usePlano()
  // useNavigate kept for potential future use (back button, etc.)
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate()

  return (
    <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Typography variant="h4" fontWeight={700} sx={{ color: 'text.primary', mb: 1 }}>
          Escolha seu plano
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Comece gratuitamente, faça upgrade quando precisar
        </Typography>
        {!loading && (
          <Chip
            icon={<StarIcon sx={{ fontSize: '14px !important' }} />}
            label={`Plano atual: ${plano}`}
            sx={(theme) => ({
              bgcolor: isPremium ? alpha(theme.palette.warning.main, 0.15) : theme.palette.surfaces.surfaceSoft,
              color: isPremium ? 'statusText.warning' : 'text.secondary',
              border: `1px solid ${isPremium ? alpha(theme.palette.warning.main, 0.3) : alpha(theme.palette.text.primary, 0.1)}`,
            })}
          />
        )}
      </Box>

      {/* Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 5 }}>

        {/* Free card */}
        <Card sx={{
          borderRadius: '16px',
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>Free</Typography>
              {!isPremium && (
                <Chip
                  label="Seu plano atual"
                  size="small"
                  sx={{ bgcolor: 'surfaces.surfaceSoft', color: 'text.secondary', fontSize: 11 }}
                />
              )}
            </Box>
            <Typography variant="h3" fontWeight={900} sx={{ color: 'text.primary', mb: 0.5 }}>Gratuito</Typography>
            <Typography variant="caption" color="text.secondary">Para sempre</Typography>
            <Divider sx={{ my: 2 }} />
            <List dense disablePadding>
              {FEATURES_FREE.map((f, i) => (
                <ListItem key={i} sx={{ px: 0, py: 0.3 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    {f.incluido
                      ? <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
                      : <CloseIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                    }
                  </ListItemIcon>
                  <ListItemText
                    primary={f.texto}
                    primaryTypographyProps={{
                      variant: 'body2',
                      sx: { color: f.incluido ? 'text.primary' : 'text.disabled' },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>

        {/* Premium card */}
        <Card sx={(theme) => ({
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
          border: `2px solid ${alpha(theme.palette.primary.main, 0.4)}`,
          borderRadius: '16px',
          position: 'relative',
        })}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>Premium</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label="Recomendado"
                  size="small"
                  sx={(theme) => ({ bgcolor: alpha(theme.palette.primary.main, 0.3), color: 'primary.light', fontSize: 11 })}
                />
                {isPremium && (
                  <Chip
                    label="Plano ativo"
                    size="small"
                    sx={(theme) => ({ bgcolor: alpha(theme.palette.warning.main, 0.2), color: 'statusText.warning', fontSize: 11 })}
                  />
                )}
              </Box>
            </Box>
            <Typography variant="h3" fontWeight={900} sx={{ color: 'text.primary', mb: 0.5 }}>R$ 19,90</Typography>
            <Typography variant="caption" color="text.secondary">por mês · cancele quando quiser</Typography>
            <Divider sx={{ my: 2 }} />
            <List dense disablePadding>
              {FEATURES_PREMIUM.map((f, i) => (
                <ListItem key={i} sx={{ px: 0, py: 0.3 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={f.texto}
                    primaryTypographyProps={{ variant: 'body2', sx: { color: 'text.primary' } }}
                  />
                </ListItem>
              ))}
            </List>
            <Button
              variant="contained"
              fullWidth
              disabled={isPremium}
              startIcon={<StarIcon />}
              onClick={() => {
                if (!isPremium) {
                  window.location.href = 'mailto:contato@pondero.com.br?subject=Upgrade Premium Pondero'
                }
              }}
              sx={{
                mt: 3,
                borderRadius: '10px', textTransform: 'none', fontWeight: 700, py: 1.2,
              }}
            >
              {isPremium ? 'Plano ativo' : 'Começar Premium'}
            </Button>
          </CardContent>
        </Card>
      </Box>

      {/* FAQ */}
      <Typography variant="h6" fontWeight={600} sx={{ color: 'text.primary', mb: 2 }}>
        Perguntas frequentes
      </Typography>
      {FAQ.map((item, i) => (
        <Accordion
          key={i}
          sx={{
            borderRadius: '8px !important',
            mb: 1,
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}>
            <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary' }}>{item.q}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary">{item.a}</Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  )
}

export default PlanoPage
