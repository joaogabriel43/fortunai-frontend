import React from 'react'
import {
  Box, Chip, Divider, List, ListItem, ListItemText, Typography,
} from '@mui/material'

const formatBRL = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)

const formatDate = (dateStr) =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString('pt-BR')

export default function TransactionList({ transacoes }) {
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
                color={t.tipo === 'CREDIT' ? 'secondary.main' : 'error.main'}
              >
                {t.tipo === 'CREDIT' ? '+ ' : '- '}
                {formatBRL(t.valor?.quantia)}
              </Typography>
            }
          >
            <ListItemText
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
                    label={t.categoria}
                    size="small"
                    sx={{ fontSize: 10, height: 18 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(t.data)}
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
