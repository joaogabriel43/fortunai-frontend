import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import { formatBRL } from '@/components/ui';
import api from '../../services/api';
import { extrairMensagemErroApi } from '../../utils/apiErrorUtils';

/**
 * Orçamento por categoria (ADR-034): limites mensais com barra de progresso,
 * status OK/ATENCAO/ESTOURADO e projeção de estouro por run-rate.
 */

const STATUS_COLOR = { OK: 'success', ATENCAO: 'warning', ESTOURADO: 'error' };
const STATUS_LABEL = { OK: 'Dentro do limite', ATENCAO: 'Atenção', ESTOURADO: 'Estourado' };

const parseValorBR = (texto) => {
  const normalizado = String(texto ?? '').replace(/\./g, '').replace(',', '.');
  const valor = Number(normalizado);
  return Number.isFinite(valor) ? valor : NaN;
};

const OrcamentoLimitesCard = () => {
  const theme = useTheme();
  const [progresso, setProgresso] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(false);
  const [linhas, setLinhas] = useState([]);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    setCarregando(true);
    api.get('/orcamento/limites/progresso')
      .then(({ data }) => { setProgresso(data); setErro(''); })
      .catch((e) => setErro(extrairMensagemErroApi(e, 'Não foi possível carregar o orçamento.')))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const iniciarEdicao = () => {
    const atuais = (progresso?.itens ?? []).map((i) => ({
      categoria: i.categoria,
      valor: String(i.limite).replace('.', ','),
    }));
    setLinhas(atuais.length > 0 ? atuais : [{ categoria: '', valor: '' }]);
    setEditando(true);
  };

  const salvar = async () => {
    const payload = {};
    for (const linha of linhas) {
      const categoria = linha.categoria.trim();
      if (!categoria) continue;
      const valor = parseValorBR(linha.valor);
      if (!Number.isFinite(valor) || valor <= 0) {
        setErro(`Limite inválido para "${categoria}" — informe um valor maior que zero.`);
        return;
      }
      payload[categoria] = valor;
    }
    setSalvando(true);
    try {
      await api.put('/orcamento/limites', payload);
      setEditando(false);
      setErro('');
      carregar();
    } catch (e) {
      setErro(extrairMensagemErroApi(e, 'Não foi possível salvar os limites.'));
    } finally {
      setSalvando(false);
    }
  };

  const atualizarLinha = (idx, campo, valor) => {
    setLinhas((prev) => prev.map((l, i) => (i === idx ? { ...l, [campo]: valor } : l)));
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SavingsIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Orçamento por categoria</Typography>
          </Box>
          {!editando && (
            <Button size="small" startIcon={<EditIcon />} onClick={iniciarEdicao}>
              {progresso?.itens?.length > 0 ? 'Editar limites' : 'Definir limites'}
            </Button>
          )}
        </Box>

        {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

        {carregando ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={26} />
          </Box>
        ) : editando ? (
          <Box>
            {linhas.map((linha, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                <TextField size="small" label="Categoria" value={linha.categoria}
                           onChange={(e) => atualizarLinha(idx, 'categoria', e.target.value)}
                           sx={{ flex: 1 }} />
                <TextField size="small" label="Limite mensal (R$)" value={linha.valor}
                           inputProps={{ inputMode: 'decimal' }}
                           onChange={(e) => atualizarLinha(idx, 'valor', e.target.value)}
                           sx={{ width: 170 }} />
                <IconButton size="small" aria-label="remover"
                            onClick={() => setLinhas((prev) => prev.filter((_, i) => i !== idx))}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Button size="small" startIcon={<AddIcon />}
                      onClick={() => setLinhas((prev) => [...prev, { categoria: '', valor: '' }])}>
                Adicionar categoria
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button size="small" onClick={() => { setEditando(false); setErro(''); }}>Cancelar</Button>
              <Button size="small" variant="contained" disabled={salvando} onClick={salvar}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </Button>
            </Box>
          </Box>
        ) : progresso?.itens?.length > 0 ? (
          <Box>
            {progresso.itens.map((item) => {
              const pct = Math.min(100, Number(item.percentual));
              return (
                <Box key={item.categoria} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.categoria}</Typography>
                    <Chip size="small" color={STATUS_COLOR[item.status]} variant="outlined"
                          label={STATUS_LABEL[item.status]} />
                  </Box>
                  <LinearProgress variant="determinate" value={pct}
                                  color={STATUS_COLOR[item.status]}
                                  sx={{ height: 8, borderRadius: 4 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary"
                                sx={{ fontFamily: theme.typography.fontFamilyMono }}>
                      {formatBRL(item.gasto)} de {formatBRL(item.limite)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Number(item.percentual).toFixed(0)}%
                    </Typography>
                  </Box>
                  {item.diaEstimadoEstouro != null && (
                    <Typography variant="caption" sx={{ color: theme.palette.statusText.warning }}>
                      No ritmo atual, o limite estoura por volta do dia {item.diaEstimadoEstouro}
                      {item.projecaoFimDeMes != null &&
                        ` (projeção do mês: ${formatBRL(item.projecaoFimDeMes)})`}.
                    </Typography>
                  )}
                  {item.status === 'ESTOURADO' && (
                    <Typography variant="caption" sx={{ color: theme.palette.statusText.negative }}>
                      Limite ultrapassado em {formatBRL(Number(item.gasto) - Number(item.limite))}.
                    </Typography>
                  )}
                </Box>
              );
            })}
            <Typography variant="caption" color="text.secondary"
                        sx={{ fontFamily: theme.typography.fontFamilyMono }}>
              Total: {formatBRL(progresso.totalGasto)} de {formatBRL(progresso.totalLimites)}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Defina limites mensais por categoria para acompanhar seu orçamento e receber
            projeção de estouro antes que aconteça.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default OrcamentoLimitesCard;
