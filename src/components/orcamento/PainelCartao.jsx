import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogContent, DialogTitle,
  IconButton, LinearProgress, ListItemIcon, Menu, MenuItem, Stack, Tab, Tabs,
  Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { formatBRL } from '@/components/ui';
import api from '../../services/api';
import { extrairMensagemErroApi, logErroSeguro } from '../../utils/apiErrorUtils';
import { useMesOrcamento } from '../../contexts/MesOrcamentoContext';
import ConfirmarExclusaoDialog from './ConfirmarExclusaoDialog';
import NovoGastoWizard from './NovoGastoWizard';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Categoria que o backend grava quando a compra chega sem categoria.
const CATEGORIA_PADRAO_CARTAO = 'Cartão';

const chave = (nome) => String(nome ?? '').trim().toLowerCase();
const rotuloCategoria = (nome) => (nome === CATEGORIA_PADRAO_CARTAO ? 'Sem categoria' : nome);
const arredondarCentavos = (v) => Math.round(v * 100) / 100;

const formatarDiaMes = (iso) => {
  if (!iso) return '';
  const [, mes, dia] = String(iso).split('-');
  return `${dia}/${mes}`;
};

/**
 * Agrupa `porCategoria` da fatura pela categoria-pai gerenciada: como a
 * subcategoria é gravada como o nome da folha, "Aluguel" só volta a ficar
 * sob "Casa" aqui, na apresentação. Categorias fora da árvore gerenciada
 * viram grupos de si mesmas.
 */
const agruparPorCategoriaPai = (porCategoria, gerenciadas) => {
  const porId = new Map();
  const porNome = new Map();
  gerenciadas.forEach((c) => {
    if (!c?.nome) return;
    porId.set(c.id, c);
    porNome.set(chave(c.nome), c);
  });

  const grupos = new Map();
  (porCategoria ?? []).forEach(({ categoria, total }) => {
    const gerenciada = porNome.get(chave(categoria));
    const pai = gerenciada?.categoriaPaiId ? porId.get(gerenciada.categoriaPaiId) : null;
    const nomeGrupo = pai?.nome ?? categoria;
    const k = chave(nomeGrupo);
    if (!grupos.has(k)) grupos.set(k, { nome: nomeGrupo, total: 0, direto: 0, filhas: [] });
    const grupo = grupos.get(k);
    const valor = Number(total) || 0;
    grupo.total += valor;
    if (pai) grupo.filhas.push({ categoria, total: valor });
    else grupo.direto += valor;
  });

  return [...grupos.values()]
    .map((g) => ({ ...g, total: arredondarCentavos(g.total), direto: arredondarCentavos(g.direto) }))
    .sort((a, b) => b.total - a.total);
};

/**
 * Painel do cartão (ADR-035/040): fatura do mês selecionado por categoria e
 * por lançamento, assinaturas cobradas no cartão, novo gasto e exclusão.
 *
 * O dono do estado de abertura é o CartoesCard, que também fecha o painel ao
 * trocar o mês de referência — a fatura mostrada é sempre a do mês do seletor.
 */
const PainelCartao = ({ open, cartao, onClose, onAtualizado, onExcluido }) => {
  const theme = useTheme();
  const telaPequena = useMediaQuery(theme.breakpoints.down('sm'));
  const { mes, ano, isMesAtual } = useMesOrcamento();

  const [aba, setAba] = useState(0);
  const [fatura, setFatura] = useState(null);
  const [assinaturas, setAssinaturas] = useState(null);
  const [gerenciadas, setGerenciadas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [menuAncora, setMenuAncora] = useState(null);
  const [confirmarExclusaoCartao, setConfirmarExclusaoCartao] = useState(false);
  const [parcelamentoAlvo, setParcelamentoAlvo] = useState(null);
  const [novoGastoAberto, setNovoGastoAberto] = useState(false);

  const cartaoId = cartao?.id;
  // Descarta respostas de uma requisição que já foi substituída por outra.
  const ultimaRequisicao = useRef(0);

  const carregarFatura = useCallback(async () => {
    if (!cartaoId) return;
    const requisicao = ++ultimaRequisicao.current;
    setCarregando(true);
    setErro('');
    try {
      const [fat, ass] = await Promise.all([
        api.get(`/cartoes/${cartaoId}/fatura?mes=${mes}&ano=${ano}`),
        api.get(`/cartoes/${cartaoId}/assinaturas`).catch(() => ({ data: null })),
      ]);
      if (requisicao !== ultimaRequisicao.current) return;
      setFatura(fat.data);
      setAssinaturas(ass.data);
    } catch (e) {
      if (requisicao !== ultimaRequisicao.current) return;
      logErroSeguro('Falha ao carregar fatura do cartão', e);
      setFatura(null);
      setErro(extrairMensagemErroApi(e, 'Não foi possível carregar a fatura.'));
    } finally {
      if (requisicao === ultimaRequisicao.current) setCarregando(false);
    }
  }, [cartaoId, mes, ano]);

  useEffect(() => {
    if (!open || !cartaoId) return;
    setAba(0);
    setFatura(null);
    setAssinaturas(null);
    carregarFatura();
  }, [open, cartaoId, carregarFatura]);

  useEffect(() => {
    if (!open) return undefined;
    let ativo = true;
    api.get('/orcamento/categorias-gerenciadas')
      .then((r) => { if (ativo) setGerenciadas(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (ativo) setGerenciadas([]); });
    return () => { ativo = false; };
  }, [open]);

  const grupos = useMemo(
    () => agruparPorCategoriaPai(fatura?.porCategoria, gerenciadas),
    [fatura?.porCategoria, gerenciadas],
  );

  const excluirParcelamento = async () => {
    const alvo = parcelamentoAlvo;
    setParcelamentoAlvo(null);
    if (!alvo) return;
    try {
      await api.delete(`/cartoes/parcelamentos/${alvo.parcelamentoId}`);
      await carregarFatura();
      onAtualizado?.();
    } catch (e) {
      logErroSeguro('Falha ao excluir parcelamento do cartão', e);
      setErro(extrairMensagemErroApi(e, 'Não foi possível excluir o parcelamento.'));
    }
  };

  const excluirCartao = async () => {
    setConfirmarExclusaoCartao(false);
    try {
      await api.delete(`/cartoes/${cartaoId}`);
      onExcluido?.();
    } catch (e) {
      logErroSeguro('Falha ao excluir cartão', e);
      setErro(extrairMensagemErroApi(e, 'Não foi possível excluir o cartão.'));
    }
  };

  const aoLancarGasto = () => {
    setNovoGastoAberto(false);
    carregarFatura();
    onAtualizado?.();
  };

  const mono = { fontFamily: theme.typography.fontFamilyMono };
  const totalFatura = Number(fatura?.total) || 0;
  const linhaValor = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 };

  const vazio = (texto) => (
    <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>{texto}</Typography>
  );

  return (
    <>
      <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="md" fullScreen={telaPequena}>
        <DialogTitle component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              Fatura — {cartao?.nome}
              {!isMesAtual && (
                <Typography component="span" variant="body2" sx={{ color: 'warning.main', ml: 1 }}>
                  ({MESES[mes - 1]}/{ano})
                </Typography>
              )}
            </Typography>
            {cartao?.bandeira && <Chip size="small" variant="outlined" label={cartao.bandeira} />}
          </Box>
          <IconButton aria-label="mais ações do cartão" onClick={(e) => setMenuAncora(e.currentTarget)}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <IconButton aria-label="fechar painel do cartão" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

          {carregando && !fatura ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={26} />
            </Box>
          ) : fatura && (
            <Stack spacing={3}>
              {/* Resumo: total do ciclo, datas e uso do limite */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total da fatura</Typography>
                  <Typography variant="h5" sx={{ ...mono, fontWeight: 600 }}>{formatBRL(totalFatura)}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Ciclo {formatarDiaMes(fatura.inicioCiclo)} a {formatarDiaMes(fatura.fechamento)} · vence em{' '}
                    {formatarDiaMes(fatura.vencimento)}
                  </Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNovoGastoAberto(true)}>
                  Novo gasto
                </Button>
              </Box>

              {isMesAtual && cartao?.limiteTotal != null && cartao?.percentualLimite != null && (
                <Box>
                  <Box sx={linhaValor}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Limite em uso</Typography>
                    <Typography variant="caption" sx={{ ...mono, color: 'text.secondary' }}>
                      {formatBRL(cartao.faturaAberta)} de {formatBRL(cartao.limiteTotal)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, Number(cartao.percentualLimite))}
                    color={Number(cartao.percentualLimite) >= 80 ? 'error' : 'primary'}
                    sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                  />
                </Box>
              )}

              <Box>
                <Tabs
                  value={aba}
                  onChange={(_, v) => setAba(v)}
                  sx={{ borderBottom: `1px solid ${theme.palette.divider}`, mb: 1.5 }}
                >
                  <Tab label="Por categoria" />
                  <Tab label="Lançamentos" />
                </Tabs>

                {aba === 0 && (
                  grupos.length === 0 ? vazio('Nenhum gasto nesta fatura.') : (
                    <Stack spacing={1.5}>
                      {grupos.map((g) => (
                        <Box key={g.nome} data-testid={`fatura-cat-${g.nome}`}>
                          <Box sx={linhaValor}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{rotuloCategoria(g.nome)}</Typography>
                            <Typography variant="body2" sx={mono}>{formatBRL(g.total)}</Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={totalFatura > 0 ? Math.min(100, (g.total / totalFatura) * 100) : 0}
                            aria-label={`participação de ${rotuloCategoria(g.nome)} na fatura`}
                            sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
                          />
                          {g.filhas.length > 0 && (
                            <Box sx={{ pl: 2, mt: 0.75 }}>
                              {g.filhas.map((f) => (
                                <Box key={f.categoria} data-testid={`fatura-subcat-${f.categoria}`} sx={linhaValor}>
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{f.categoria}</Typography>
                                  <Typography variant="caption" sx={{ ...mono, color: 'text.secondary' }}>
                                    {formatBRL(f.total)}
                                  </Typography>
                                </Box>
                              ))}
                              {g.direto > 0 && (
                                <Box sx={linhaValor}>
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Sem subcategoria</Typography>
                                  <Typography variant="caption" sx={{ ...mono, color: 'text.secondary' }}>
                                    {formatBRL(g.direto)}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  )
                )}

                {aba === 1 && (
                  !fatura.itens?.length ? vazio('Nenhum lançamento nesta fatura.') : (
                    <Stack divider={<Box sx={{ borderTop: `1px solid ${theme.palette.divider}` }} />}>
                      {fatura.itens.map((item) => (
                        <Box key={item.transacaoId} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                          <Typography variant="caption" sx={{ ...mono, color: 'text.secondary', width: 40, flexShrink: 0 }}>
                            {formatarDiaMes(item.data)}
                          </Typography>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="body2" noWrap>{item.descricao}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {rotuloCategoria(item.categoria)}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={mono}>{formatBRL(item.valor)}</Typography>
                          {item.parcelada && item.parcelamentoId ? (
                            <IconButton
                              size="small"
                              aria-label={`excluir parcelamento de ${item.descricao}`}
                              title="Excluir todas as parcelas deste parcelamento"
                              onClick={() => setParcelamentoAlvo(item)}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          ) : (
                            <Box sx={{ width: 34, flexShrink: 0 }} />
                          )}
                        </Box>
                      ))}
                    </Stack>
                  )
                )}
              </Box>

              {assinaturas?.recorrencias?.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Assinaturas neste cartão</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    {assinaturas.recorrencias.map((r) => (
                      <Chip key={r.nome} size="small" variant="outlined" label={`${r.nome} · ${formatBRL(r.valorMedio)}`} />
                    ))}
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Comprometimento mensal estimado: {formatBRL(assinaturas.totalMensalComprometido)}
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      <Menu anchorEl={menuAncora} open={Boolean(menuAncora)} onClose={() => setMenuAncora(null)}>
        <MenuItem
          onClick={() => { setMenuAncora(null); setConfirmarExclusaoCartao(true); }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}><DeleteOutlineIcon fontSize="small" /></ListItemIcon>
          Excluir cartão
        </MenuItem>
      </Menu>

      <ConfirmarExclusaoDialog
        open={Boolean(parcelamentoAlvo)}
        titulo="Excluir parcelamento"
        mensagem={`Excluir TODAS as parcelas de "${parcelamentoAlvo?.descricao ?? ''}", inclusive as de outras faturas? Esta ação não pode ser desfeita.`}
        onConfirm={excluirParcelamento}
        onCancel={() => setParcelamentoAlvo(null)}
      />

      <ConfirmarExclusaoDialog
        open={confirmarExclusaoCartao}
        titulo="Excluir cartão"
        mensagem={`O cartão "${cartao?.nome ?? ''}" será excluído. Esta ação não pode ser desfeita.`}
        onConfirm={excluirCartao}
        onCancel={() => setConfirmarExclusaoCartao(false)}
      />

      <NovoGastoWizard
        open={novoGastoAberto}
        cartao={cartao}
        onClose={() => setNovoGastoAberto(false)}
        onLancado={aoLancarGasto}
      />
    </>
  );
};

export default PainelCartao;
