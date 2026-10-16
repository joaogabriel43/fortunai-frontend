import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Grid, Typography, Select, MenuItem,
  FormControl, InputLabel, Chip, Button, Divider, CircularProgress,
  Skeleton, Alert, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, Tooltip, Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { mesCorrente } from '../utils/dateUtils';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import StarIcon from '@mui/icons-material/Star';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CalculateIcon from '@mui/icons-material/Calculate';
import { useTheme, alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import usePlano from '../hooks/usePlano';
import useIr from '../hooks/useIr';
import { hojeLocal } from '../utils/dateUtils';

// ── Constantes ────────────────────────────────────────────────────────────────

const MESES = [
  { value: 1, label: 'Janeiro' },  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },    { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },     { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },    { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' }, { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },{ value: 12, label: 'Dezembro' },
];

const { ano: anoAtual } = mesCorrente();
const ANOS = [anoAtual - 2, anoAtual - 1, anoAtual];

const TIPOS_OPERACAO = ['COMPRA', 'VENDA'];
const TIPOS_TRADE    = ['SWING', 'DAY_TRADE'];
const TIPOS_ATIVO    = ['ACAO', 'FII', 'ETF', 'BDR', 'OPCAO'];

const FORM_INICIAL = {
  ticker: '', tipoOperacao: 'COMPRA', tipoTrade: 'SWING',
  tipoAtivo: 'ACAO', quantidade: '', precoUnitario: '',
  corretagem: '', dataOperacao: hojeLocal(),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatBRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const formatData = (iso) => {
  if (!iso) return '-';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

const cardStyle = {
  border: '1px solid',
  borderColor: 'lines.subtle',
  borderRadius: '16px',
  boxShadow: 'none',
};

// ── Chip de tipo de operação ──────────────────────────────────────────────────

const TipoChip = ({ tipo, trade }) => {
  if (trade === 'DAY_TRADE')
    return <Chip label="Day Trade" size="small" color="warning" sx={{ fontWeight: 700, fontSize: 10 }} />;
  if (tipo === 'COMPRA')
    return <Chip label="COMPRA" size="small" color="success" sx={{ fontWeight: 700, fontSize: 10 }} />;
  return <Chip label="VENDA" size="small" color="error" sx={{ fontWeight: 700, fontSize: 10 }} />;
};

// ── Disclaimer legal obrigatório ──────────────────────────────────────────────

const Disclaimer = () => {
  const theme = useTheme();
  return (
  <Paper
    elevation={0}
    sx={{
      mt: 3,
      p: 2,
      borderRadius: 2,
      border: `1px solid ${alpha(theme.palette.warning.main, 0.35)}`,
      bgcolor: alpha(theme.palette.warning.main, 0.06),
      display: 'flex',
      alignItems: 'flex-start',
      gap: 1.5,
    }}
  >
    <WarningAmberIcon sx={{ color: 'warning.main', mt: 0.2, flexShrink: 0 }} />
    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
      <strong style={{ color: theme.palette.statusText.warning }}>⚠️ Aviso importante:</strong> Este cálculo é{' '}
      <strong>apenas informativo</strong> e pode conter imprecisões. Ele não substitui a
      orientação de um contador ou especialista tributário. Consulte um profissional para
      sua declaração oficial do Imposto de Renda.
    </Typography>
  </Paper>
  );
};

// ── Gate de plano Premium ─────────────────────────────────────────────────────

const PremiumGate = ({ navigate }) => (
  <Box sx={{ width: '100%', maxWidth: 560, mx: 'auto', mt: 8, textAlign: 'center', px: 2 }}>
    <StarIcon sx={{ fontSize: 56, color: 'secondary.main', mb: 2 }} />
    <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
      Recurso exclusivo Premium
    </Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>
      A apuração de IR sobre investimentos está disponível apenas para assinantes Premium.
      Faça upgrade para acessar esta e outras funcionalidades avançadas.
    </Typography>
    <Button
      variant="contained"
      size="large"
      startIcon={<StarIcon />}
      onClick={() => navigate('/plano')}
      sx={{ borderRadius: 2, px: 4, fontWeight: 700 }}
    >
      Ver planos
    </Button>
  </Box>
);

// ── Card de resumo da apuração ────────────────────────────────────────────────

const ResumoCard = ({ apuracao, onGerarDarf, loadingDarf, darf, errorDarf }) => {
  const isento = apuracao.isento;
  const irDevido = apuracao.irDevido ?? 0;

  return (
    <Card sx={cardStyle}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
          <CalculateIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={700}>
            Resumo da Apuração
          </Typography>
          {isento && (
            <Chip
              icon={<CheckCircleIcon />}
              label="Isento neste mês"
              color="success"
              size="small"
              sx={{ ml: 'auto', fontWeight: 700 }}
            />
          )}
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            { label: 'Total de Vendas', value: apuracao.totalVendas },
            { label: 'Lucro Bruto', value: apuracao.lucroBruto },
            { label: 'Prejuízos Compensados', value: apuracao.prejuizoAnteriorCompensado, highlight: 'warning' },
            { label: 'Lucro Líquido', value: apuracao.lucroLiquido },
            // IRRF "dedo-duro" retido pela corretora, já abatido do IR devido (ADR-032/041)
            { label: 'IRRF já retido (deduzido)', value: apuracao.irrfDeduzido, highlight: 'warning' },
          ].map(({ label, value, highlight }) => (
            <Grid size={{ xs: 6, sm: 3 }} key={label}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'surfaces.surfaceSoft' }}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Typography
                  variant="body1"
                  fontWeight={700}
                  sx={{ color: highlight === 'warning' ? 'statusText.warning' : 'text.primary' }}
                >
                  {formatBRL(value)}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ mb: 2, borderColor: 'lines.subtle' }} />

        {/* IR Devido */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">IR Devido</Typography>
            {isento ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                <Typography variant="h6" fontWeight={700} sx={{ color: 'statusText.positive' }}>
                  Isento
                </Typography>
                <Tooltip title="Vendas de ações abaixo de R$20.000 no mês — isenção de IR (Swing Trade de ações)">
                  <InfoOutlinedIcon sx={{ color: 'text.disabled', fontSize: 16, cursor: 'help' }} />
                </Tooltip>
              </Box>
            ) : (
              <Typography variant="h5" fontWeight={700} sx={{ color: 'statusText.negative', mt: 0.5 }}>
                {formatBRL(irDevido)}
              </Typography>
            )}
            {apuracao.temDayTrade && (
              <Typography variant="caption" color="text.secondary">
                Inclui Day Trade — código DARF: <strong>6017</strong>
              </Typography>
            )}
          </Box>

          {!isento && irDevido > 0 && (
            <Button
              variant="contained"
              startIcon={<ReceiptLongIcon />}
              onClick={onGerarDarf}
              disabled={loadingDarf}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              {loadingDarf ? <CircularProgress size={20} color="inherit" /> : 'Gerar DARF'}
            </Button>
          )}
        </Box>

        {/* DARF gerado */}
        {darf && (
          <Box sx={(t) => ({ mt: 2.5, p: 2, borderRadius: 2,
              border: `1px solid ${alpha(t.palette.primary.main, 0.4)}`,
              bgcolor: alpha(t.palette.primary.main, 0.06) })}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: 'primary.main' }}>
              📋 DARF Gerado
            </Typography>
            <Grid container spacing={1.5}>
              {[
                { label: 'Código da Receita', value: darf.codigoReceita, big: true },
                { label: 'Período de Apuração', value: darf.periodoApuracao },
                { label: 'Valor a Pagar', value: formatBRL(darf.valor) },
                { label: 'Vencimento', value: formatData(darf.dataVencimento) },
              ].map(({ label, value, big }) => (
                <Grid size={{ xs: 6, sm: 3 }} key={label}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography variant={big ? 'h6' : 'body2'} fontWeight={big ? 800 : 600}
                      sx={{ color: big ? 'primary.main' : 'text.primary' }}>
                    {value}
                  </Typography>
                </Grid>
              ))}
            </Grid>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
              💡 Pague no banco, app do seu banco, ou pelo site da Receita Federal usando o código acima.
            </Typography>
          </Box>
        )}

        {errorDarf && (
          <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>{errorDarf}</Alert>
        )}

        {/* Disclaimer obrigatório — sempre visível no card de apuração */}
        <Disclaimer />
      </CardContent>
    </Card>
  );
};

// ── Dialog para adicionar operação ────────────────────────────────────────────

const OperacaoDialog = ({ open, onClose, onSalvar, loading }) => {
  const [form, setForm] = useState(FORM_INICIAL);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSalvar = async () => {
    await onSalvar({
      ticker: form.ticker.toUpperCase().trim(),
      tipoOperacao: form.tipoOperacao,
      tipoTrade: form.tipoTrade,
      tipoAtivo: form.tipoAtivo,
      quantidade: parseInt(form.quantidade, 10),
      precoUnitario: parseFloat(form.precoUnitario),
      corretagem: form.corretagem ? parseFloat(form.corretagem) : 0,
      dataOperacao: form.dataOperacao,
    });
    setForm(FORM_INICIAL);
    onClose();
  };

  const valido = form.ticker.trim() && form.quantidade > 0 && parseFloat(form.precoUnitario) > 0
    && form.dataOperacao;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3, bgcolor: 'background.paper' } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Registrar Operação</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Ticker" value={form.ticker} onChange={set('ticker')}
              fullWidth size="small" placeholder="Ex: PETR4, MXRF11"
              inputProps={{ style: { textTransform: 'uppercase' } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Data" type="date" value={form.dataOperacao}
              onChange={set('dataOperacao')} fullWidth size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="tipo-operacao-label">Operação</InputLabel>
              <Select id="tipo-operacao" labelId="tipo-operacao-label" value={form.tipoOperacao} label="Operação" onChange={set('tipoOperacao')}>
                {TIPOS_OPERACAO.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="tipo-trade-label">Trade</InputLabel>
              <Select id="tipo-trade" labelId="tipo-trade-label" value={form.tipoTrade} label="Trade" onChange={set('tipoTrade')}>
                <MenuItem value="SWING">Swing Trade</MenuItem>
                <MenuItem value="DAY_TRADE">Day Trade</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="tipo-ativo-op-label">Ativo</InputLabel>
              <Select id="tipo-ativo-op" labelId="tipo-ativo-op-label" value={form.tipoAtivo} label="Ativo" onChange={set('tipoAtivo')}>
                {TIPOS_ATIVO.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Quantidade" type="number" value={form.quantidade}
              onChange={set('quantidade')} fullWidth size="small"
              inputProps={{ min: 1, step: 1 }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Preço Unitário (R$)" type="number" value={form.precoUnitario}
              onChange={set('precoUnitario')} fullWidth size="small"
              inputProps={{ min: 0.01, step: 0.01 }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Corretagem (R$)" type="number" value={form.corretagem}
              onChange={set('corretagem')} fullWidth size="small"
              inputProps={{ min: 0, step: 0.01 }}
              helperText="Opcional"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button
          onClick={handleSalvar}
          variant="contained"
          disabled={!valido || loading}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Tabela de operações ───────────────────────────────────────────────────────

const TabelaOperacoes = ({ operacoes, onExcluir }) => {
  if (operacoes.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary" variant="body2">
          Nenhuma operação registrada neste período.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {['Data', 'Ticker', 'Tipo', 'Trade', 'Ativo', 'Qtd', 'Preço', 'Corretagem', 'Total', ''].map((h) => (
              <TableCell key={h} sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 11,
                  whiteSpace: 'nowrap', borderColor: 'lines.subtle' }}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {operacoes.map((op) => {
            const total = (op.precoUnitario * op.quantidade).toFixed(2);
            return (
              <TableRow key={op.id} hover
                  sx={{ '&:hover': { bgcolor: 'surfaces.surfaceSoft' } }}>
                <TableCell sx={{ borderColor: 'lines.subtle', whiteSpace: 'nowrap' }}>
                  {formatData(op.dataOperacao)}
                </TableCell>
                <TableCell sx={{ borderColor: 'lines.subtle', fontWeight: 700 }}>
                  {op.ticker}
                </TableCell>
                <TableCell sx={{ borderColor: 'lines.subtle' }}>
                  <TipoChip tipo={op.tipoOperacao} trade={op.tipoTrade} />
                </TableCell>
                <TableCell sx={{ borderColor: 'lines.subtle' }}>
                  <Chip label={op.tipoTrade === 'DAY_TRADE' ? 'Day Trade' : 'Swing'}
                      size="small" variant="outlined"
                      sx={{ fontSize: 10, borderColor: 'lines.strong' }} />
                </TableCell>
                <TableCell sx={{ borderColor: 'lines.subtle' }}>
                  <Chip label={op.tipoAtivo} size="small" variant="outlined"
                      sx={{ fontSize: 10, borderColor: 'lines.strong' }} />
                </TableCell>
                <TableCell sx={{ borderColor: 'lines.subtle' }}>{op.quantidade}</TableCell>
                <TableCell sx={{ borderColor: 'lines.subtle' }}>
                  {formatBRL(op.precoUnitario)}
                </TableCell>
                <TableCell sx={{ borderColor: 'lines.subtle' }}>
                  {formatBRL(op.corretagem)}
                </TableCell>
                <TableCell sx={{ borderColor: 'lines.subtle', fontWeight: 600 }}>
                  {formatBRL(total)}
                </TableCell>
                <TableCell sx={{ borderColor: 'lines.subtle' }}>
                  <Tooltip title="Excluir operação">
                    <IconButton size="small" aria-label="excluir operação" onClick={() => onExcluir(op.id)}
                        sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────

const IrPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, isLimitado, loading: planoLoading } = usePlano();

  const hoje = mesCorrente();
  const [mes, setMes] = useState(hoje.mes);
  const [ano, setAno] = useState(hoje.ano);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [salvandoOp, setSalvandoOp] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

  const {
    apuracao, operacoes, darf, loading, loadingDarf,
    error, errorDarf,
    apurar, registrarOperacao, excluirOperacao, gerarDarf,
  } = useIr();

  // Dispara apuração ao montar e ao mudar período
  useEffect(() => {
    if (!user?.id || planoLoading) return;
    if (!isPremium) return; // evita chamada 403 desnecessária
    apurar(mes, ano);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, mes, ano, isPremium, planoLoading]);

  // Gate Premium
  if (!planoLoading && (!isPremium || isLimitado('IR_APURACAO'))) {
    return <PremiumGate navigate={navigate} />;
  }

  if (planoLoading) {
    return (
      <Box sx={{ p: 3 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} animation="wave" variant="rectangular" height={80}
              sx={{ mb: 2, borderRadius: 2, bgcolor: 'surfaces.surfaceSoft' }} />
        ))}
      </Box>
    );
  }

  const handleSalvarOperacao = async (body) => {
    setSalvandoOp(true);
    try {
      await registrarOperacao(body);
      setDialogOpen(false);
      await apurar(mes, ano); // re-apura após nova operação
    } catch {
      // erro silenciado — Dialog exibe sua própria validação
    } finally {
      setSalvandoOp(false);
    }
  };

  const handleExcluir = async (id) => {
    if (!window.confirm('Excluir esta operação? A apuração será recalculada.')) return;
    try {
      await excluirOperacao(id);
      await apurar(mes, ano);
    } catch {
      setSnackMsg('Não foi possível excluir a operação.');
    }
  };

  const handleGerarDarf = () => {
    if (!apuracao?.id) return;
    gerarDarf(apuracao.id);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1100, mx: 'auto', px: { xs: 1.5, md: 3 }, py: 2 }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Apuração de IR — Renda Variável
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Swing Trade, Day Trade, FIIs e ETFs. Exclusivo Premium.
          </Typography>
        </Box>
        {/* Seletor de período */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel id="ir-mes-label">Mês</InputLabel>
            <Select id="ir-mes" labelId="ir-mes-label" value={mes} label="Mês" onChange={(e) => setMes(e.target.value)}>
              {MESES.map((m) => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 90 }}>
            <InputLabel id="ir-ano-label">Ano</InputLabel>
            <Select id="ir-ano" labelId="ir-ano-label" value={ano} label="Ano" onChange={(e) => setAno(e.target.value)}>
              {ANOS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            size="small"
            onClick={() => apurar(mes, ano)}
            disabled={loading}
            sx={{ borderRadius: 2, borderColor: 'lines.strong' }}
          >
            {loading ? <CircularProgress size={16} /> : 'Apurar'}
          </Button>
        </Box>
      </Box>

      {/* Erro de plano ou apuração */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {/* Loading skeleton */}
      {loading && (
        <Box>
          {[1, 2].map((i) => (
            <Skeleton key={i} animation="wave" variant="rectangular" height={120}
                sx={{ mb: 2, borderRadius: 2, bgcolor: 'surfaces.surfaceSoft' }} />
          ))}
        </Box>
      )}

      {/* SEÇÃO 1 — Resumo da apuração */}
      {!loading && apuracao && (
        <Box sx={{ mb: 3 }}>
          <ResumoCard
            apuracao={apuracao}
            onGerarDarf={handleGerarDarf}
            loadingDarf={loadingDarf}
            darf={darf}
            errorDarf={errorDarf}
          />
        </Box>
      )}

      {/* Sem dados ainda */}
      {!loading && !apuracao && !error && (
        <Card sx={{ ...cardStyle, mb: 3 }}>
          <CardContent sx={{ py: 4, textAlign: 'center' }}>
            <CalculateIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              Selecione o período e clique em <strong>Apurar</strong> para calcular o IR.
            </Typography>
            <Disclaimer />
          </CardContent>
        </Card>
      )}

      {/* SEÇÃO 2 — Tabela de operações */}
      <Card sx={{ ...cardStyle, mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              Operações do Período
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Registrar
            </Button>
          </Box>

          {loading ? (
            <Skeleton animation="wave" variant="rectangular" height={120}
                sx={{ borderRadius: 2, bgcolor: 'surfaces.surfaceSoft' }} />
          ) : (
            <TabelaOperacoes operacoes={operacoes} onExcluir={handleExcluir} />
          )}
        </CardContent>
      </Card>

      {/* Dialog para nova operação */}
      <OperacaoDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSalvar={handleSalvarOperacao}
        loading={salvandoOp}
      />
    </Box>
  );
};

export default IrPage;
