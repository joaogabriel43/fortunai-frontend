import React, { useState, useEffect, useMemo } from 'react';
import AlocacaoAtivosChart from '../components/investimentos/AlocacaoAtivosChart';
import BenchmarkChart from '../components/investimentos/BenchmarkChart';
import BenchmarkJanelasPanel from '../components/investimentos/BenchmarkJanelasPanel';
import RendaPassivaPanel from '../components/investimentos/RendaPassivaPanel';
import CalendarioProventosPanel from '../components/investimentos/CalendarioProventosPanel';
import EventosCorporativosPanel from '../components/investimentos/EventosCorporativosPanel';
import RentabilidadePanel from '../components/investimentos/RentabilidadePanel';
import MarkowitzPanel from '../components/investimentos/MarkowitzPanel';
import PortfolioTable from '../components/dashboard/PortfolioTable';
import EstrategiaForm from '../components/investimentos/EstrategiaForm';
import EstrategiaSetoresPanel from '../components/investimentos/EstrategiaSetoresPanel';
import SaudeCarteiraPanel from '../components/investimentos/SaudeCarteiraPanel';
import PrecoTetoPanel from '../components/investimentos/PrecoTetoPanel';
import CorrelacaoPanel from '../components/investimentos/CorrelacaoPanel';
import FronteiraPanel from '../components/investimentos/FronteiraPanel';
import AdicionarAtivoForm from '../components/investimentos/AdicionarAtivoForm';
import EditarAtivoDialog from '../components/investimentos/EditarAtivoDialog';
import RemoverAtivoDialog from '../components/investimentos/RemoverAtivoDialog';
import ImportacaoLoteInvestimentosModal from '../components/investimentos/ImportacaoLoteInvestimentosModal';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { investimentoService } from '../services/investimentoService';
import { useExportacao } from '../hooks/useExportacao';
import api from '../services/api';
import { mesclarOrdem, moverCard } from '../utils/ordemCards';
import { logErroSeguro } from '../utils/apiErrorUtils';
import { pageContainerSx } from '../constants/layout';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Grid,
    IconButton,
    Modal,
    Paper,
    Skeleton,
    Snackbar,
    Alert,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useTheme, alpha } from '@mui/material/styles';
import ConfigurarAlertasModal from '../components/notificacoes/ConfigurarAlertasModal';

// Funcao do tema: a hairline muda entre claro e escuro. O `sx` do MUI
// aceita callback, entao `sx={cardStyle}` continua valido.
const cardStyle = (t) => ({
    p: 3,
    border: `1px solid ${t.palette.lines.subtle}`,
    borderRadius: '16px',
    boxShadow: 'none',
});

/**
 * Sub-abas da página (padrão de mercado: Kinvo/Status Invest agrupam a
 * carteira por tema em vez de uma página única com scroll infinito).
 */
const ABAS = [
    { id: 'carteira', label: 'Carteira' },
    { id: 'rentabilidade', label: 'Rentabilidade' },
    { id: 'proventos', label: 'Proventos' },
    { id: 'estrategia', label: 'Estratégia' },
    { id: 'risco', label: 'Risco & Valuation' },
];

/**
 * Registry dos cards (ADR-037): fonte da verdade de id, sub-aba, título e
 * render. A ordem deste array É a ordem padrão; a ordem customizada do
 * usuário (backend) é reconciliada contra estes ids em mesclarOrdem().
 */
const CARDS = [
    {
        id: 'alocacao-ativos', aba: 'carteira', titulo: 'Alocação por Tipo de Ativo', xl: 4,
        render: (ctx) => <AlocacaoAtivosChart refreshKey={ctx.refreshKey} />,
    },
    {
        id: 'portfolio', aba: 'carteira', titulo: 'Meu Portfólio', xl: 8,
        render: (ctx) => (
            <PortfolioTable
                onSellRequest={ctx.handleOpenSellModal}
                onEditRequest={ctx.setEditAtivo}
                onRemoveRequest={ctx.setRemoveAtivo}
                refreshKey={ctx.refreshKey}
            />
        ),
    },
    {
        id: 'adicionar-ativo', aba: 'carteira', titulo: 'Adicionar Ativo',
        render: (ctx) => <AdicionarAtivoForm onAtivoAdicionado={ctx.handlePortfolioChanged} />,
    },
    {
        id: 'benchmark', aba: 'rentabilidade', titulo: 'Comparação com Benchmarks',
        render: () => <BenchmarkChart />,
    },
    {
        id: 'benchmark-janelas', aba: 'rentabilidade', titulo: 'Benchmark por Janela Temporal',
        render: () => <BenchmarkJanelasPanel />,
    },
    {
        id: 'rentabilidade', aba: 'rentabilidade', titulo: 'Rentabilidade da Carteira',
        render: () => <RentabilidadePanel />,
    },
    {
        id: 'renda-passiva', aba: 'proventos', titulo: 'Renda Passiva',
        render: () => <RendaPassivaPanel />,
    },
    {
        id: 'calendario-proventos', aba: 'proventos', titulo: 'Calendário de Proventos',
        render: () => <CalendarioProventosPanel />,
    },
    {
        id: 'eventos-corporativos', aba: 'proventos', titulo: 'Agenda de Eventos Corporativos',
        render: () => <EventosCorporativosPanel />,
    },
    {
        id: 'estrategia-setores', aba: 'estrategia', titulo: 'Estratégia por Setores',
        render: (ctx) => (
            <EstrategiaSetoresPanel
                refreshKey={ctx.refreshKey}
                onTetosSalvos={ctx.handlePortfolioChanged}
            />
        ),
    },
    {
        id: 'saude-carteira', aba: 'estrategia', titulo: 'Saúde da Carteira',
        render: (ctx) => (
            <SaudeCarteiraPanel
                refreshKey={ctx.refreshKey}
                onConfigurarEstrategia={ctx.irParaEstrategiaAlocacao}
            />
        ),
    },
    {
        id: 'markowitz', aba: 'estrategia', titulo: 'Otimização de Portfólio (Markowitz)',
        render: () => <MarkowitzPanel />,
    },
    {
        id: 'estrategia-alocacao', aba: 'estrategia', titulo: 'Minha Estratégia de Alocação',
        domId: 'card-estrategia-alocacao',
        render: () => <EstrategiaForm />,
    },
    {
        id: 'preco-teto', aba: 'risco', titulo: 'Preço-Teto (Bazin + Graham)',
        render: (ctx) => <PrecoTetoPanel refreshKey={ctx.refreshKey} />,
    },
    {
        id: 'correlacao', aba: 'risco', titulo: 'Correlação e Diversificação',
        render: (ctx) => <CorrelacaoPanel refreshKey={ctx.refreshKey} />,
    },
    {
        id: 'fronteira', aba: 'risco', titulo: 'Fronteira Eficiente',
        render: (ctx) => <FronteiraPanel refreshKey={ctx.refreshKey} />,
    },
];

const ORDEM_PADRAO = CARDS.map((c) => c.id);

// Títulos de cards cujos painéis já renderizam o próprio cabeçalho —
// evita título duplicado (o Paper só mostra o Typography quando true).
const TITULO_NO_PAPER = new Set(['alocacao-ativos', 'portfolio', 'adicionar-ativo', 'estrategia-alocacao']);

const Investimentos = () => {
    const theme = useTheme();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { loading: exportLoading, error: exportError, downloadArquivo, clearError } = useExportacao();

    // Skeleton de inicialização — mostra enquanto os dados iniciais carregam
    const [pageLoading, setPageLoading] = useState(true);
    useEffect(() => {
        if (!user?.id) { setPageLoading(false); return; }
        api.get(`/investimentos/portfolio`)
            .catch(() => { /* silently ignore — child components handle their own errors */ })
            .finally(() => setPageLoading(false));
    }, [user?.id]);

    const [alertasModalOpen, setAlertasModalOpen] = useState(false);
    const [importarModalOpen, setImportarModalOpen] = useState(false);

    // Estado para venda de ativo (Modal)
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [sellQuantity, setSellQuantity] = useState(0);
    const [selling, setSelling] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Estado para edição/remoção de posição (CRUD manual de ativos)
    const [editAtivo, setEditAtivo] = useState(null);
    const [removeAtivo, setRemoveAtivo] = useState(null);
    const [crudSuccess, setCrudSuccess] = useState('');

    // Sub-abas + ordem customizada dos cards (ADR-037)
    const [abaAtiva, setAbaAtiva] = useState('carteira');
    const [ordem, setOrdem] = useState(ORDEM_PADRAO);
    const [ordemOriginal, setOrdemOriginal] = useState(ORDEM_PADRAO);
    const [editLayout, setEditLayout] = useState(false);
    const [salvandoOrdem, setSalvandoOrdem] = useState(false);

    useEffect(() => {
        if (!user?.id) return;
        api.get('/usuario/preferencias/ordem-cards-investimentos')
            .then((res) => {
                const mesclada = mesclarOrdem(res.data?.ordem, ORDEM_PADRAO);
                setOrdem(mesclada);
                setOrdemOriginal(mesclada);
            })
            .catch(() => { /* sem preferência salva → ordem padrão */ });
    }, [user?.id]);

    const iniciarEdicaoLayout = () => {
        setOrdemOriginal(ordem);
        setEditLayout(true);
    };

    const cancelarEdicaoLayout = () => {
        setOrdem(ordemOriginal);
        setEditLayout(false);
    };

    const salvarOrdem = async () => {
        try {
            setSalvandoOrdem(true);
            await api.put('/usuario/preferencias/ordem-cards-investimentos', { ordem });
            setOrdemOriginal(ordem);
            setEditLayout(false);
            setCrudSuccess('Ordem dos cards salva!');
        } catch {
            alert('Erro ao salvar a ordem dos cards.');
        } finally {
            setSalvandoOrdem(false);
        }
    };

    // Cards da aba ativa, já na ordem customizada
    const cardsDaAba = useMemo(() => {
        const porId = new Map(CARDS.map((c) => [c.id, c]));
        return ordem
            .map((id) => porId.get(id))
            .filter((c) => c && c.aba === abaAtiva);
    }, [ordem, abaAtiva]);

    const idsDaAbaAtiva = useMemo(
        () => CARDS.filter((c) => c.aba === abaAtiva).map((c) => c.id),
        [abaAtiva]
    );

    // Refresh da tabela + gráfico de alocação após qualquer operação bem-sucedida
    const handlePortfolioChanged = (mensagem) => {
        if (typeof mensagem === 'string' && mensagem) setCrudSuccess(mensagem);
        setRefreshKey((k) => k + 1);
    };

    // "Configurar estratégia" na Saúde da Carteira: o card alvo vive na mesma
    // sub-aba (estrategia) — troca a aba se preciso e rola até o card.
    const irParaEstrategiaAlocacao = () => {
        setAbaAtiva('estrategia');
        setTimeout(() => {
            document.getElementById('card-estrategia-alocacao')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const handleRefazerQuestionario = () => {
        navigate('/questionario-perfil');
    };

    const handleOpenSellModal = (ativo) => {
        setSelectedAsset(ativo);
        setSellQuantity(ativo?.quantidade ?? 0);
        setModalOpen(true);
    };

    const handleCloseSellModal = () => {
        setModalOpen(false);
        setSelectedAsset(null);
        setSellQuantity(0);
    };

    const handleSellConfirm = async () => {
        if (!selectedAsset || !selectedAsset.ticker) {
            alert('Ativo inválido.');
            return;
        }
        const qtd = parseFloat(sellQuantity);
        if (Number.isNaN(qtd) || qtd <= 0) {
            alert('Quantidade inválida.');
            return;
        }
        if (qtd > (selectedAsset.quantidade ?? 0)) {
            alert('Você não pode vender mais do que possui.');
            return;
        }
        try {
            setSelling(true);
            await investimentoService.venderAtivo({ ticker: selectedAsset.ticker, quantidade: qtd });
            handleCloseSellModal();
            // Força o refresh da tabela
            setRefreshKey((k) => k + 1);
        } catch (error) {
            logErroSeguro('Erro ao processar a venda', error);
            alert('Erro ao processar a venda.');
        } finally {
            setSelling(false);
        }
    };

    if (pageLoading) {
        return (
            <Box sx={{ p: { xs: 1.5, md: 3 } }}>
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} animation="wave" variant="rectangular" height={52}
                        sx={(t) => ({ mb: 1, bgcolor: t.palette.surfaces.surfaceSoft, borderRadius: 2 })} />
                ))}
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Skeleton animation="wave" variant="circular" width={200} height={200}
                        sx={(t) => ({ bgcolor: t.palette.surfaces.surfaceSoft })} />
                </Box>
            </Box>
        );
    }

    // Contexto passado ao render de cada card do registry
    const ctx = {
        refreshKey,
        handleOpenSellModal,
        setEditAtivo,
        setRemoveAtivo,
        handlePortfolioChanged,
        irParaEstrategiaAlocacao,
    };

    return (
        <Box sx={pageContainerSx}>

            {/* LINHA 1 — Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h5" fontWeight={700}>
                        Painel de Investimentos
                    </Typography>
                    {user?.perfilInvestidor && (
                        <Chip
                            label={`Perfil: ${user.perfilInvestidor}`}
                            size="small"
                            sx={{
                                ml: 1,
                                bgcolor: alpha(theme.palette.primary.main, 0.15),
                                color: 'primary.main',
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                fontWeight: 600,
                            }}
                        />
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {editLayout ? (
                        <>
                            <Button
                                variant="contained"
                                disabled={salvandoOrdem}
                                startIcon={salvandoOrdem ? <CircularProgress size={16} /> : null}
                                onClick={salvarOrdem}
                                data-testid="btn-salvar-ordem"
                            >
                                Salvar Ordem
                            </Button>
                            <Button variant="outlined" disabled={salvandoOrdem} onClick={cancelarEdicaoLayout}>
                                Cancelar
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="outlined"
                                startIcon={<ViewAgendaIcon />}
                                onClick={iniciarEdicaoLayout}
                                data-testid="btn-organizar-cards"
                            >
                                Organizar Cards
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={exportLoading ? <CircularProgress size={16} /> : <TableChartIcon />}
                                disabled={exportLoading}
                                onClick={() => downloadArquivo('/api/exportacao/portfolio/csv', 'portfolio.csv')}
                                data-testid="btn-portfolio-csv"
                            >
                                Exportar CSV
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<UploadFileIcon />}
                                onClick={() => setImportarModalOpen(true)}
                                data-testid="btn-importar-lote"
                            >
                                Importar CSV
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<NotificationsActiveIcon />}
                                onClick={() => setAlertasModalOpen(true)}
                            >
                                Alertas
                            </Button>
                            <Button variant="outlined" onClick={handleRefazerQuestionario}>
                                Refazer Questionário
                            </Button>
                        </>
                    )}
                </Box>
            </Box>

            <ConfigurarAlertasModal
                open={alertasModalOpen}
                onClose={() => setAlertasModalOpen(false)}
            />

            {/* Importação em lote de investimentos via CSV (ADR-052) */}
            <ImportacaoLoteInvestimentosModal
                open={importarModalOpen}
                onClose={() => setImportarModalOpen(false)}
                onImportado={() => handlePortfolioChanged('Importação concluída com sucesso!')}
            />

            {/* Sub-abas por tema (ADR-037) */}
            <Tabs
                value={abaAtiva}
                onChange={(_e, v) => setAbaAtiva(v)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={(t) => ({ mb: 3, borderBottom: `1px solid ${t.palette.lines.subtle}` })}
            >
                {ABAS.map((aba) => (
                    <Tab key={aba.id} value={aba.id} label={aba.label} data-testid={`tab-${aba.id}`} />
                ))}
            </Tabs>

            {editLayout && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Use as setas para reordenar os cards desta aba. A ordem é salva na sua conta
                    e vale em qualquer dispositivo.
                </Alert>
            )}

            {/* Cards da aba ativa, na ordem do usuário */}
            <Grid container spacing={3}>
                {cardsDaAba.map((card, posNaAba) => (
                    <Grid key={card.id} size={{ xs: 12, xl: card.xl ?? 12 }}>
                        <Paper sx={cardStyle} id={card.domId} data-testid={`card-${card.id}`}>
                            {(editLayout || TITULO_NO_PAPER.has(card.id)) && (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        {card.titulo}
                                    </Typography>
                                    {editLayout && (
                                        <Box>
                                            <IconButton
                                                size="small"
                                                aria-label={`Subir ${card.titulo}`}
                                                disabled={posNaAba === 0}
                                                onClick={() => setOrdem(moverCard(ordem, card.id, -1, idsDaAbaAtiva))}
                                            >
                                                <ArrowUpwardIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                aria-label={`Descer ${card.titulo}`}
                                                disabled={posNaAba === cardsDaAba.length - 1}
                                                onClick={() => setOrdem(moverCard(ordem, card.id, 1, idsDaAbaAtiva))}
                                            >
                                                <ArrowDownwardIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    )}
                                </Box>
                            )}
                            {card.render(ctx)}
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            <Snackbar
                open={!!exportError}
                autoHideDuration={5000}
                onClose={clearError}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity="error" onClose={clearError}>{exportError}</Alert>
            </Snackbar>

            <Snackbar
                open={!!crudSuccess}
                autoHideDuration={5000}
                onClose={() => setCrudSuccess('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity="success" onClose={() => setCrudSuccess('')}>{crudSuccess}</Alert>
            </Snackbar>

            {/* Dialog de edição absoluta de posição (PUT) */}
            <EditarAtivoDialog
                open={!!editAtivo}
                ativo={editAtivo}
                onClose={() => setEditAtivo(null)}
                onSaved={handlePortfolioChanged}
            />

            {/* Dialog de confirmação de remoção (DELETE) */}
            <RemoverAtivoDialog
                open={!!removeAtivo}
                ativo={removeAtivo}
                onClose={() => setRemoveAtivo(null)}
                onRemoved={handlePortfolioChanged}
            />

            {/* Modal de Venda */}
            <Modal open={modalOpen} onClose={handleCloseSellModal} aria-labelledby="sell-modal-title">
                <Paper
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 400,
                        p: 4,
                        borderRadius: '16px',
                        border: `1px solid ${theme.palette.lines.strong}`,
                    }}
                >
                    <Typography id="sell-modal-title" variant="h6" component="h2" sx={{ mb: 2 }}>
                        Vender {selectedAsset?.ticker}
                    </Typography>
                    <TextField
                        label="Quantidade a Vender"
                        type="number"
                        fullWidth
                        value={sellQuantity}
                        onChange={(e) => setSellQuantity(parseFloat(e.target.value) || 0)}
                        sx={{ mt: 1 }}
                        inputProps={{ min: 0, step: 'any' }}
                    />
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button onClick={handleCloseSellModal} disabled={selling}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSellConfirm}
                            variant="contained"
                            color="error"
                            disabled={selling}
                        >
                            {selling ? 'Vendendo...' : 'Confirmar Venda'}
                        </Button>
                    </Box>
                </Paper>
            </Modal>
        </Box>
    );
};

export default Investimentos;
