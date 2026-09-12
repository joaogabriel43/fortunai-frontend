import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Box, Typography, Chip, Stack, Alert, MenuItem, useMediaQuery,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import CreatableSelect from 'react-select/creatable';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatBRL } from '@/components/ui';
import { hojeLocal } from '../../utils/dateUtils';
import { calcularParcelas, faturasDaCompra } from '../../utils/parcelas';
import { extrairMensagemErroApi, logErroSeguro } from '../../utils/apiErrorUtils';

const OPCOES_PARCELAS = [1, 2, 3, 6, 10, 12, 24];
const MAX_PARCELAS = 48;
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Mesmo parser de OrcamentoLimitesCard/CartoesCard: aceita "1.200,50".
const parseValorBR = (texto) => {
  const v = Number(String(texto ?? '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(v) ? v : NaN;
};

const formatarFatura = (f) => `${MESES_CURTOS[f.mes - 1]}/${f.ano}`;
const formatarDiaMes = (iso) => {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
};

// Duplicado de AdicionarTransacaoForm.jsx de propósito (escopo desta entrega);
// extrair para um módulo compartilhado é follow-up.
const selectStyles = (t) => ({
  control: (base, state) => ({
    ...base,
    backgroundColor: 'transparent',
    borderColor: state.isFocused ? t.palette.primary.main : t.palette.lines.strong,
    borderRadius: 8,
    boxShadow: 'none',
    minHeight: 40,
    ':hover': { borderColor: t.palette.text.secondary },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: t.palette.surfaces.raised,
    border: `1px solid ${t.palette.lines.subtle}`,
    borderRadius: 8,
    zIndex: 9999,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? alpha(t.palette.primary.main, 0.12) : 'transparent',
    color: t.palette.text.primary,
    ':active': { backgroundColor: alpha(t.palette.primary.main, 0.2) },
  }),
  singleValue: (base) => ({ ...base, color: t.palette.text.primary }),
  input: (base) => ({ ...base, color: t.palette.text.primary }),
  placeholder: (base) => ({ ...base, color: t.palette.text.secondary }),
  clearIndicator: (base) => ({ ...base, color: t.palette.text.secondary, ':hover': { color: t.palette.text.primary } }),
  dropdownIndicator: (base) => ({ ...base, color: t.palette.text.secondary, ':hover': { color: t.palette.text.primary } }),
  indicatorSeparator: (base) => ({ ...base, backgroundColor: t.palette.lines.strong }),
});

const chave = (nome) => String(nome ?? '').trim().toLowerCase();

/**
 * Wizard "Novo gasto" do cartão, em dois passos:
 *  1. o que foi comprado (valor, descrição, data);
 *  2. como foi pago (parcelas, categoria/subcategoria) com prévia de parcela,
 *     faturas atingidas e impacto no limite de orçamento da categoria.
 *
 * A prévia é só informativa — o backend recalcula tudo em POST /cartoes/compra.
 * Subcategoria é persistida como o nome da folha (opção A), então o limite de
 * orçamento consultado é o da folha, sem rollup para a categoria-pai.
 */
const NovoGastoWizard = ({ open, cartao, onClose, onLancado }) => {
  const theme = useTheme();
  const telaPequena = useMediaQuery(theme.breakpoints.down('sm'));
  const user = useAuth()?.user;

  const [passo, setPasso] = useState(1);
  const [valorTexto, setValorTexto] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(hojeLocal());
  const [parcelas, setParcelas] = useState(1);
  const [outroAberto, setOutroAberto] = useState(false);
  const [outroTexto, setOutroTexto] = useState('');
  const [categoria, setCategoria] = useState(null);
  const [subcategoria, setSubcategoria] = useState('');
  const [gerenciadas, setGerenciadas] = useState([]);
  const [usadas, setUsadas] = useState([]);
  const [carregandoCategorias, setCarregandoCategorias] = useState(false);
  const [progresso, setProgresso] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Cada abertura começa do zero: o wizard é montado uma vez pelo painel e
  // reaproveitado entre lançamentos.
  useEffect(() => {
    if (!open) return;
    setPasso(1);
    setValorTexto('');
    setDescricao('');
    setData(hojeLocal());
    setParcelas(1);
    setOutroAberto(false);
    setOutroTexto('');
    setCategoria(null);
    setSubcategoria('');
    setErro('');
    setSalvando(false);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let ativo = true;
    setCarregandoCategorias(true);
    Promise.all([
      api.get('/orcamento/categorias-gerenciadas').then((r) => r.data ?? []).catch(() => []),
      user?.id
        ? api.get(`/orcamento/categorias/${user.id}`).then((r) => r.data ?? []).catch(() => [])
        : Promise.resolve([]),
      // Limites só existem para o mês corrente; sem eles a prévia apenas omite o impacto.
      api.get('/orcamento/limites/progresso').then((r) => r.data?.itens ?? []).catch(() => []),
    ]).then(([g, u, p]) => {
      if (!ativo) return;
      setGerenciadas(Array.isArray(g) ? g : []);
      setUsadas(Array.isArray(u) ? u : []);
      setProgresso(Array.isArray(p) ? p : []);
      setCarregandoCategorias(false);
    });
    return () => { ativo = false; };
  }, [open, user?.id]);

  const gerenciadaPorNome = useMemo(() => {
    const mapa = new Map();
    gerenciadas.forEach((c) => { if (c?.nome) mapa.set(chave(c.nome), c); });
    return mapa;
  }, [gerenciadas]);

  // Topo: raízes gerenciadas + categorias já usadas que não são gerenciadas
  // (uma usada que coincide com uma subcategoria aparece só no segundo select).
  const opcoesCategoria = useMemo(() => {
    const vistos = new Set();
    const opcoes = [];
    const adicionar = (nome) => {
      const k = chave(nome);
      if (!k || vistos.has(k)) return;
      vistos.add(k);
      opcoes.push({ value: nome.trim(), label: nome.trim() });
    };
    gerenciadas.filter((c) => c?.nome && !c.categoriaPaiId).forEach((c) => adicionar(c.nome));
    usadas.filter((nome) => typeof nome === 'string' && !gerenciadaPorNome.has(chave(nome))).forEach(adicionar);
    return opcoes;
  }, [gerenciadas, usadas, gerenciadaPorNome]);

  const subcategorias = useMemo(() => {
    const raiz = categoria ? gerenciadaPorNome.get(chave(categoria.value)) : null;
    if (!raiz) return [];
    return gerenciadas.filter((c) => c?.nome && c.categoriaPaiId === raiz.id);
  }, [categoria, gerenciadas, gerenciadaPorNome]);

  const valor = parseValorBR(valorTexto);
  const hoje = hojeLocal();
  const dataValida = Boolean(data) && data <= hoje;
  const passo1Valido = valor > 0 && descricao.trim().length > 0 && dataValida;
  const parcelasValidas = Number.isInteger(parcelas) && parcelas >= 1 && parcelas <= MAX_PARCELAS;
  const categoriaFinal = (subcategoria || categoria?.value || '').trim() || null;

  const previa = useMemo(
    () => (passo1Valido && parcelasValidas ? calcularParcelas(valor, parcelas) : null),
    [passo1Valido, parcelasValidas, valor, parcelas],
  );

  const faturas = useMemo(() => {
    if (!previa || !cartao?.diaFechamento || !cartao?.diaVencimento) return null;
    return faturasDaCompra(data, parcelas, cartao.diaFechamento, cartao.diaVencimento);
  }, [previa, data, parcelas, cartao?.diaFechamento, cartao?.diaVencimento]);

  // A 1ª parcela é datada na própria data da compra, então é ela que entra no
  // gasto do mês. Só faz sentido quando a compra é do mês corrente — é o único
  // mês que GET /orcamento/limites/progresso cobre.
  const impacto = useMemo(() => {
    if (!previa || !categoriaFinal || data.slice(0, 7) !== hoje.slice(0, 7)) return null;
    const item = progresso.find((i) => chave(i?.categoria) === chave(categoriaFinal));
    if (!item || !(Number(item.limite) > 0)) return null;
    const gasto = Number(item.gasto) || 0;
    const depois = gasto + previa.parcela;
    const percentual = Math.round((depois / Number(item.limite)) * 100);
    return { gasto, depois, limite: Number(item.limite), percentual };
  }, [previa, categoriaFinal, data, hoje, progresso]);

  const escolherParcelas = (n) => {
    setOutroAberto(false);
    setOutroTexto('');
    setParcelas(n);
  };

  const abrirOutro = () => {
    setOutroAberto(true);
    setOutroTexto(OPCOES_PARCELAS.includes(parcelas) ? '' : String(parcelas));
  };

  const mudarOutro = (texto) => {
    setOutroTexto(texto);
    const n = Number(texto);
    setParcelas(Number.isInteger(n) ? n : NaN);
  };

  const mudarCategoria = (opcao) => {
    setCategoria(opcao);
    setSubcategoria('');
  };

  const lancar = async () => {
    if (!passo1Valido || !parcelasValidas || !cartao) return;
    setSalvando(true);
    setErro('');
    try {
      await api.post('/cartoes/compra', {
        cartaoId: cartao.id,
        descricao: descricao.trim(),
        valor,
        categoria: categoriaFinal,
        parcelas,
        data,
      });
      onLancado?.();
    } catch (e) {
      logErroSeguro('Falha ao lançar gasto no cartão', e);
      setErro(extrairMensagemErroApi(e, 'Não foi possível lançar o gasto.'));
    } finally {
      setSalvando(false);
    }
  };

  const mono = { fontFamily: theme.typography.fontFamilyMono };

  return (
    <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={telaPequena}>
      <DialogTitle sx={{ pb: 1 }}>
        Novo gasto{cartao?.nome ? ` — ${cartao.nome}` : ''}
        <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
          Passo {passo} de 2 · {passo === 1 ? 'o que você comprou' : 'como você pagou'}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {passo === 1 ? (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Valor total (R$)"
              value={valorTexto}
              onChange={(e) => setValorTexto(e.target.value)}
              inputProps={{ inputMode: 'decimal' }}
              placeholder="0,00"
              autoFocus
              fullWidth
            />
            <TextField
              label="Descrição"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Notebook, mercado do mês"
              fullWidth
            />
            <TextField
              label="Data da compra"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              inputProps={{ max: hoje }}
              InputLabelProps={{ shrink: true }}
              error={Boolean(data) && !dataValida}
              helperText={Boolean(data) && !dataValida ? 'A data da compra não pode ser futura.' : ' '}
              fullWidth
            />
          </Stack>
        ) : (
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}>
                Parcelas
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" role="group" aria-label="Parcelas">
                {OPCOES_PARCELAS.map((n) => {
                  const ativo = !outroAberto && parcelas === n;
                  return (
                    <Chip
                      key={n}
                      label={n === 1 ? 'À vista' : `${n}×`}
                      onClick={() => escolherParcelas(n)}
                      color={ativo ? 'primary' : 'default'}
                      variant={ativo ? 'filled' : 'outlined'}
                      aria-pressed={ativo}
                    />
                  );
                })}
                <Chip
                  label="Outro…"
                  onClick={abrirOutro}
                  color={outroAberto ? 'primary' : 'default'}
                  variant={outroAberto ? 'filled' : 'outlined'}
                  aria-pressed={outroAberto}
                />
              </Stack>
              {outroAberto && (
                <TextField
                  label="Número de parcelas"
                  type="number"
                  value={outroTexto}
                  onChange={(e) => mudarOutro(e.target.value)}
                  inputProps={{ min: 1, max: MAX_PARCELAS }}
                  error={outroTexto !== '' && !parcelasValidas}
                  helperText={`De 1 a ${MAX_PARCELAS}.`}
                  size="small"
                  sx={{ mt: 1.5, width: 200 }}
                />
              )}
            </Box>

            <Box>
              <Typography
                component="label"
                htmlFor="categoria-cartao"
                variant="caption"
                sx={{ color: 'text.secondary', display: 'block', mb: 0.5, ml: 0.5 }}
              >
                Categoria
              </Typography>
              <CreatableSelect
                inputId="categoria-cartao"
                aria-label="Categoria"
                isClearable
                isDisabled={carregandoCategorias}
                isLoading={carregandoCategorias}
                onChange={mudarCategoria}
                options={opcoesCategoria}
                value={categoria}
                placeholder="Selecione ou digite uma categoria..."
                formatCreateLabel={(texto) => `Criar "${texto}"`}
                styles={selectStyles(theme)}
              />
            </Box>

            {subcategorias.length > 0 && (
              <TextField
                select
                label="Subcategoria (opcional)"
                value={subcategoria}
                onChange={(e) => setSubcategoria(e.target.value)}
                fullWidth
              >
                <MenuItem value="">
                  <em>Somente {categoria?.value}</em>
                </MenuItem>
                {subcategorias.map((s) => (
                  <MenuItem key={s.id} value={s.nome}>{s.nome}</MenuItem>
                ))}
              </TextField>
            )}

            {previa && (
              <Box
                data-testid="previa-gasto"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.lines.subtle}`,
                  bgcolor: theme.palette.surfaces.panel,
                }}
              >
                <Typography variant="h6" sx={{ ...mono, fontWeight: 600 }}>
                  {previa.n === 1
                    ? `À vista · ${formatBRL(previa.total)}`
                    : `${previa.n}× de ${formatBRL(previa.parcela)}`}
                </Typography>
                {previa.n > 1 && (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Total <Box component="span" sx={mono}>{formatBRL(previa.total)}</Box>
                    {previa.ultima !== previa.parcela && (
                      <> · última parcela de <Box component="span" sx={mono}>{formatBRL(previa.ultima)}</Box></>
                    )}
                  </Typography>
                )}
                {faturas && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                    {previa.n === 1 ? 'Entra' : 'Primeira parcela entra'} na fatura de{' '}
                    {formatarFatura(faturas.primeira)} (vence {formatarDiaMes(faturas.primeira.vencimento)})
                    {previa.n > 1 && <> · última na de {formatarFatura(faturas.ultima)}</>}
                  </Typography>
                )}
              </Box>
            )}

            {impacto && (
              <Alert
                severity={impacto.percentual > 100 ? 'error' : impacto.percentual >= 80 ? 'warning' : 'info'}
                data-testid="impacto-orcamento"
              >
                Orçamento de {categoriaFinal} este mês:{' '}
                <Box component="span" sx={mono}>{formatBRL(impacto.gasto)}</Box> →{' '}
                <Box component="span" sx={mono}>{formatBRL(impacto.depois)}</Box> de{' '}
                <Box component="span" sx={mono}>{formatBRL(impacto.limite)}</Box> ({impacto.percentual}%)
              </Alert>
            )}

            {erro && <Alert severity="error">{erro}</Alert>}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        {passo === 1 ? (
          <>
            <Button onClick={onClose} color="inherit">Cancelar</Button>
            <Button variant="contained" onClick={() => setPasso(2)} disabled={!passo1Valido}>
              Continuar
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => { setErro(''); setPasso(1); }} color="inherit" disabled={salvando}>
              Voltar
            </Button>
            <Button variant="contained" onClick={lancar} disabled={salvando || !parcelasValidas}>
              Lançar gasto
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default NovoGastoWizard;
