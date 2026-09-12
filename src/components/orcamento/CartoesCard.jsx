import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AddIcon from '@mui/icons-material/Add';
import { formatBRL } from '@/components/ui';
import api from '../../services/api';
import { extrairMensagemErroApi } from '../../utils/apiErrorUtils';
import { useMesOrcamento } from '../../contexts/MesOrcamentoContext';
import PainelCartao from './PainelCartao';
import NovoGastoWizard from './NovoGastoWizard';

/**
 * Cartões de crédito virtuais (ADR-035): lista com fatura aberta e uso do
 * limite, criação de cartão (com aviso anti-PAN), atalho de novo gasto por
 * cartão e abertura do painel com a fatura detalhada (PainelCartao).
 */

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const parseValorBR = (texto) => {
  const v = Number(String(texto ?? '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(v) ? v : NaN;
};

const formatarDiaMesCurto = (iso) => {
  const [, mes, dia] = String(iso).split('-');
  return `${dia}/${MESES_CURTOS[Number(mes) - 1]}`;
};

// Com as próximas datas calculadas pelo backend, mostra a data de fato;
// sem elas (resposta antiga), cai no dia do mês cadastrado.
const textoDatas = (c) => (c.proximoFechamento && c.proximoVencimento
  ? `Fecha ${formatarDiaMesCurto(c.proximoFechamento)} · vence ${formatarDiaMesCurto(c.proximoVencimento)}`
  : `Fecha dia ${c.diaFechamento} · vence dia ${c.diaVencimento}`);

const NOVO_CARTAO_VAZIO = { nome: '', bandeira: '', limite: '', diaFechamento: '', diaVencimento: '' };

const CartoesCard = () => {
  const theme = useTheme();
  const { mes, ano } = useMesOrcamento();
  const [cartoes, setCartoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [dialogNovo, setDialogNovo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [novo, setNovo] = useState(NOVO_CARTAO_VAZIO);
  const [painelId, setPainelId] = useState(null);
  const [wizardCartao, setWizardCartao] = useState(null);

  // O painel lê o cartão da lista (e não de uma cópia) para refletir a
  // fatura aberta recalculada depois de um lançamento ou exclusão.
  const cartaoDoPainel = cartoes.find((c) => c.id === painelId) ?? null;

  const carregar = useCallback(() => {
    setCarregando(true);
    api.get('/cartoes')
      .then(({ data }) => { setCartoes(Array.isArray(data) ? data : []); setErro(''); })
      .catch((e) => setErro(extrairMensagemErroApi(e, 'Não foi possível carregar seus cartões.')))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // A fatura do painel é a do mês do seletor; trocar o mês com o painel
  // aberto fecharia sobre dados de outro mês — então fecha.
  useEffect(() => {
    setPainelId(null);
  }, [mes, ano]);

  const criarCartao = async () => {
    const limite = novo.limite ? parseValorBR(novo.limite) : null;
    setSalvando(true);
    try {
      await api.post('/cartoes', {
        nome: novo.nome.trim(),
        bandeira: novo.bandeira.trim() || null,
        limiteTotal: limite && limite > 0 ? limite : null,
        diaFechamento: Number(novo.diaFechamento),
        diaVencimento: Number(novo.diaVencimento),
      });
      setDialogNovo(false);
      setNovo(NOVO_CARTAO_VAZIO);
      setErro('');
      carregar();
    } catch (e) {
      setErro(extrairMensagemErroApi(e, 'Não foi possível criar o cartão.'));
    } finally {
      setSalvando(false);
    }
  };

  const aoExcluirCartao = () => {
    setPainelId(null);
    carregar();
  };

  const aoLancarPeloAtalho = () => {
    setWizardCartao(null);
    carregar();
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CreditCardIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Cartões de crédito</Typography>
          </Box>
          <Button size="small" startIcon={<AddIcon />} onClick={() => setDialogNovo(true)}>
            Novo cartão
          </Button>
        </Box>

        {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

        {carregando && cartoes.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={26} />
          </Box>
        ) : cartoes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Cadastre seus cartões (apenas um apelido — nunca o número real) para acompanhar
            a fatura aberta e o uso do limite.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {cartoes.map((c) => (
              <Box
                key={c.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  pr: 1.5,
                }}
              >
                <ButtonBase
                  aria-label={`detalhes da fatura ${c.nome}`}
                  onClick={() => setPainelId(c.id)}
                  sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    display: 'block',
                    textAlign: 'left',
                    p: 1.5,
                    borderRadius: 2,
                    '&:hover': { bgcolor: theme.palette.action.hover },
                    '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{c.nome}</Typography>
                    {c.bandeira && <Chip size="small" variant="outlined" label={c.bandeira} />}
                  </Box>
                  <Typography variant="caption" color="text.secondary" component="div"
                              sx={{ fontFamily: theme.typography.fontFamilyMono }}>
                    Fatura aberta: {formatBRL(c.faturaAberta)}
                    {c.limiteTotal != null && ` de ${formatBRL(c.limiteTotal)}`}
                  </Typography>
                  {c.percentualLimite != null && (
                    <LinearProgress variant="determinate"
                                    value={Math.min(100, Number(c.percentualLimite))}
                                    color={Number(c.percentualLimite) >= 80 ? 'error' : 'primary'}
                                    sx={{ height: 6, borderRadius: 3, mt: 0.5 }} />
                  )}
                  <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                    {textoDatas(c)}
                  </Typography>
                </ButtonBase>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  aria-label={`novo gasto no cartão ${c.nome}`}
                  onClick={() => setWizardCartao(c)}
                  sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                  Gasto
                </Button>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>

      {/* Dialog: novo cartão */}
      <Dialog open={dialogNovo} onClose={() => setDialogNovo(false)} fullWidth maxWidth="xs">
        <DialogTitle>Novo cartão</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Use apenas um apelido (ex.: "Nubank Roxinho"). Nunca digite o número real do cartão —
            nenhum dado sensível é armazenado.
          </Alert>
          <TextField fullWidth margin="dense" label="Apelido do cartão"
                     value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
          <TextField fullWidth margin="dense" label="Bandeira (opcional)"
                     value={novo.bandeira} onChange={(e) => setNovo({ ...novo, bandeira: e.target.value })} />
          <TextField fullWidth margin="dense" label="Limite (opcional, R$)"
                     inputProps={{ inputMode: 'decimal' }}
                     value={novo.limite} onChange={(e) => setNovo({ ...novo, limite: e.target.value })} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField margin="dense" label="Dia fechamento" type="number"
                       inputProps={{ min: 1, max: 28 }}
                       value={novo.diaFechamento} onChange={(e) => setNovo({ ...novo, diaFechamento: e.target.value })} />
            <TextField margin="dense" label="Dia vencimento" type="number"
                       inputProps={{ min: 1, max: 28 }}
                       value={novo.diaVencimento} onChange={(e) => setNovo({ ...novo, diaVencimento: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogNovo(false)}>Cancelar</Button>
          <Button variant="contained" disabled={salvando} onClick={criarCartao}>Criar</Button>
        </DialogActions>
      </Dialog>

      <PainelCartao
        open={Boolean(cartaoDoPainel)}
        cartao={cartaoDoPainel}
        onClose={() => setPainelId(null)}
        onAtualizado={carregar}
        onExcluido={aoExcluirCartao}
      />

      <NovoGastoWizard
        open={Boolean(wizardCartao)}
        cartao={wizardCartao}
        onClose={() => setWizardCartao(null)}
        onLancado={aoLancarPeloAtalho}
      />
    </Card>
  );
};

export default CartoesCard;
