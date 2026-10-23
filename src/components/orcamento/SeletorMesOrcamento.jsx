import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import { useMesOrcamento } from '../../contexts/MesOrcamentoContext';

/**
 * Seletor de mês de referência da aba Orçamento — persistente e visível
 * (não é um dropdown escondido), evita lançamentos no mês errado ao
 * deixar claro qual mês está selecionado (ex.: navegar a fatura do
 * cartão para o mês seguinte não deve confundir o usuário sobre "onde" ele está).
 */

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const SeletorMesOrcamento = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { mes, ano, isMesAtual, navegar, irParaMesAtual, podeAvancar, podeVoltar } = useMesOrcamento();

  return (
    <Card
      sx={{
        mb: 3,
        border: `1px solid ${isMesAtual ? theme.palette.divider : theme.palette.warning.main}`,
      }}
    >
      <CardContent
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          py: 1.5,
          '&:last-child': { pb: 1.5 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarMonthIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
          <Typography variant="body2" color="text.secondary">
            Mês de referência
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" aria-label="mês anterior" onClick={() => navegar(-1)} disabled={!podeVoltar}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Typography
            variant={isMobile ? 'body1' : 'h6'}
            sx={{ fontWeight: 600, minWidth: isMobile ? 140 : 170, textAlign: 'center' }}
            data-testid="seletor-mes-orcamento-label"
          >
            {MESES[mes - 1]} {ano}
          </Typography>
          <IconButton size="small" aria-label="próximo mês" onClick={() => navegar(1)} disabled={!podeAvancar}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            size="small"
            label={isMesAtual ? 'Mês atual' : 'Fora do mês atual'}
            color={isMesAtual ? 'success' : 'warning'}
            variant={isMesAtual ? 'outlined' : 'filled'}
            // Outlined: o texto não pode ser success.main (reprova no claro); filled o MUI resolve.
            sx={isMesAtual ? { color: 'statusText.positive' } : undefined}
          />
          {!isMesAtual && (
            <Button size="small" startIcon={<TodayIcon fontSize="small" />} onClick={irParaMesAtual}>
              Voltar para hoje
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default SeletorMesOrcamento;
