import React from 'react'
import {
  Avatar,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { formatarDataLocal } from '../../utils/dateUtils'

const formatBRL = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)

const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : ''

export default function TransactionList({ transacoes }) {
  const theme = useTheme()
  const corPorTipo = (tipo) =>
    tipo === 'CREDIT' ? theme.palette.success.main : theme.palette.error.main
  // Texto do valor usa o token legivel (WCAG 1.4.3); avatar/icone mantem o tom pleno.
  const corTextoPorTipo = (tipo) =>
    tipo === 'CREDIT' ? theme.palette.statusText.positive : theme.palette.statusText.negative

  return (
    <List disablePadding>
      {transacoes.map((t, index) => (
        <React.Fragment key={t.id}>
          <ListItem
            data-type={t.tipo}
            secondaryAction={
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ fontFamily: theme.typography.fontFamilyMono, color: corTextoPorTipo(t.tipo) }}
              >
                {t.tipo === 'CREDIT' ? '+ ' : '- '}
                {formatBRL(t.valor?.quantia)}
              </Typography>
            }
          >
            {/* Avatar com ícone de direção por tipo */}
            <ListItemAvatar sx={{ minWidth: 40 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: alpha(corPorTipo(t.tipo), 0.15),
                }}
              >
                {t.tipo === 'CREDIT'
                  ? <ArrowUpwardIcon sx={{ fontSize: 16, color: corPorTipo(t.tipo) }} />
                  : <ArrowDownwardIcon sx={{ fontSize: 16, color: corPorTipo(t.tipo) }} />
                }
              </Avatar>
            </ListItemAvatar>

            <ListItemText
              secondaryTypographyProps={{ component: 'div' }}
              primary={
                // Quando a descrição é um ticker do portfólio, omite o texto primário
                // para evitar duplicata de texto no DOM (getByText encontraria duas ocorrências)
                t._isPortfolioTicker ? null : (
                  <Typography variant="body2" noWrap>
                    {t.descricao}
                  </Typography>
                )
              }
              secondary={
                <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                  <Chip
                    label={capitalize(t.categoria)}
                    size="small"
                    sx={{
                      fontSize: 10,
                      height: 18,
                      bgcolor: alpha(corPorTipo(t.tipo), 0.15),
                      color: corPorTipo(t.tipo),
                      border: 'none',
                    }}
                  />
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                    {formatarDataLocal(t.data)}
                  </Typography>
                </Box>
              }
            />
          </ListItem>
          {index < transacoes.length - 1 && <Divider />}
        </React.Fragment>
      ))}
    </List>
  )
}
