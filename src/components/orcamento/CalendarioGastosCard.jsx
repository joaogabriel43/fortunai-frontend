import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { formatBRL } from '@/components/ui';
import api from '../../services/api';
import { useMesOrcamento } from '../../contexts/MesOrcamentoContext';
import { extrairMensagemErroApi } from '../../utils/apiErrorUtils';
import { hojeLocal } from '../../utils/dateUtils';

/**
 * Calendário de gastos (ADR-036): heatmap do mês — intensidade da célula
 * proporcional ao gasto do dia (normalizada pelo maiorGastoDia do backend).
 *
 * O mês exibido vem do MesOrcamentoContext (SeletorMesOrcamento, acima das
 * sub-abas). O card não tem mais navegação própria: dois seletores de mês na
 * mesma tela divergiam entre si e o usuário não sabia qual valia.
 */

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const CalendarioGastosCard = () => {
  const theme = useTheme();
  const mesOrcamento = useMesOrcamento();
  // Fora da página de Orçamento não há provider: cai no mês corrente ancorado
  // em America/Sao_Paulo, mesmo relógio que o contexto usa.
  const [anoHoje, mesHoje] = hojeLocal().split('-').map(Number);
  const mes = Number.isInteger(mesOrcamento?.mes) ? mesOrcamento.mes : mesHoje;
  const ano = Number.isInteger(mesOrcamento?.ano) ? mesOrcamento.ano : anoHoje;

  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    setCarregando(true);
    api.get('/orcamento/calendario', { params: { mes, ano } })
      .then(({ data }) => { setDados(data); setErro(''); })
      .catch((e) => {
        // Limpa a grade: manter o heatmap do mês anterior sob o rótulo do mês
        // novo seria mostrar dado errado, não dado velho.
        setDados(null);
        setErro(extrairMensagemErroApi(e, 'Não foi possível carregar o calendário.'));
      })
      .finally(() => setCarregando(false));
  }, [mes, ano]);

  useEffect(() => { carregar(); }, [carregar]);

  const corDoDia = (dia) => {
    const maior = Number(dados?.maiorGastoDia ?? 0);
    const gasto = Number(dia.totalDebito);
    if (gasto <= 0) return theme.palette.action.hover;
    const alpha = maior > 0 ? 0.15 + (gasto / maior) * 0.75 : 0.5;
    return `${theme.palette.error.main}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonthIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Calendário de gastos</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {MESES[mes - 1]} {ano}
          </Typography>
        </Box>

        {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

        {carregando && !dados ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={26} />
          </Box>
        ) : dados && (
          // Durante a troca de mês a grade anterior permanece visível (apenas
          // esmaecida) em vez de dar lugar ao spinner.
          <Box
            data-testid="heatmap-calendario"
            aria-busy={carregando}
            sx={{ opacity: carregando ? 0.6 : 1, transition: 'opacity 150ms ease' }}
          >
            <Box sx={{
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5,
            }}>
              {dados.dias.map((d) => (
                <Tooltip key={d.dia}
                         title={`Dia ${d.dia}: gastos ${formatBRL(d.totalDebito)}${Number(d.totalCredito) > 0 ? ` · entradas ${formatBRL(d.totalCredito)}` : ''}`}>
                  <Box sx={{
                    aspectRatio: '1', borderRadius: 1,
                    backgroundColor: corDoDia(d),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${theme.palette.divider}`,
                    cursor: 'default',
                  }}>
                    <Typography variant="caption" sx={{ color: theme.palette.text.primary }}>
                      {d.dia}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1, fontFamily: theme.typography.fontFamilyMono }}>
              Total do mês: {formatBRL(dados.totalDebitos)} em gastos · {formatBRL(dados.totalCreditos)} em entradas
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default CalendarioGastosCard;
