import React, { useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
    Accordion, AccordionDetails, AccordionSummary, Box, Button, Chip, Container,
    Divider, Grid, IconButton, Link, Paper, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CreditCardOffOutlinedIcon from '@mui/icons-material/CreditCardOffOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GitHubIcon from '@mui/icons-material/GitHub';
import useInView from '../components/landing/useInView';
import PublicHeader from '../components/public/PublicHeader';

/**
 * Landing page pública v2 (ADR-039/ADR-042): scroll próprio (o app confina o
 * scroll no Layout — a landing vive fora dele), header sticky com âncoras,
 * scroll-reveal leve, stats, FAQ e footer completo. 100% estática: nenhuma
 * chamada de API, nenhum input — superfície de ataque nula.
 */

const FEATURES = [
    { icon: SmartToyOutlinedIcon, titulo: 'Organização assistida', texto: 'Registre gastos em linguagem natural e mantenha seu orçamento atualizado sem interromper sua rotina.' },
    { icon: AccountBalanceWalletOutlinedIcon, titulo: 'Orçamento inteligente', texto: 'Limites por categoria com projeção de estouro, calendário de gastos, cartões virtuais e assinaturas detectadas automaticamente.' },
    { icon: ShowChartIcon, titulo: 'Carteira e análises', texto: 'Acompanhe carteira, setores, correlação, simulações de alocação e metodologias de preço-teto em uma visão organizada.' },
    { icon: ReceiptLongOutlinedIcon, titulo: 'IR da bolsa sem susto', texto: 'Apuração mensal com isenção de R$ 20 mil, compensação de prejuízos, DARF pronto e relatório anual para a declaração.' },
    { icon: QrCodeScannerIcon, titulo: 'Scanner de notas fiscais', texto: 'Aponte para o QR Code da NF-e e os itens entram categorizados no seu orçamento.' },
    { icon: GroupOutlinedIcon, titulo: 'Orçamento a dois', texto: 'Compartilhe as finanças com quem divide a vida com você — visão unificada, contas separadas.' },
];

const STATS = [
    { numero: '35+', rotulo: 'ferramentas de orçamento, investimento e IR' },
    { numero: 'Acesso antecipado', rotulo: 'Pondero está em desenvolvimento' },
    { numero: 'Dados protegidos', rotulo: 'Dados tratados em conformidade com a LGPD.' },
    { numero: 'R$ 0', rotulo: 'para começar — sem cartão de crédito' },
];

const PASSOS = [
    { n: '1', titulo: 'Organize sua base', texto: 'Crie sua conta e defina como quer acompanhar sua vida financeira.' },
    { n: '2', titulo: 'Centralize sua rotina', texto: 'Registre gastos, importe extratos e acompanhe investimentos em um só lugar.' },
    { n: '3', titulo: 'Decida com clareza', texto: 'Dashboards, análises e simulações ajudam você a entender cenários e próximos passos.' },
];

const FAQ = [
    { p: 'O Pondero é gratuito?', r: 'Sim — o plano gratuito cobre o essencial do orçamento e dos investimentos. Recursos avançados (como a apuração de IR e análises exclusivas) fazem parte do plano Premium.' },
    { p: 'Preciso informar dados do meu banco ou cartão?', r: 'Não. Você lança pelo chat, importa extratos CSV/OFX ou escaneia notas fiscais. Os cartões do orçamento são 100% virtuais — nunca pedimos número real, CVV ou validade.' },
    { p: 'Meus dados estão seguros?', r: 'Senhas com bcrypt, sessão com tokens rotativos de curta duração, consentimento LGPD explícito e exclusão total da conta quando você quiser.' },
    { p: 'Como a IA participa da experiência?', r: 'A IA ajuda a interpretar registros em linguagem natural e a organizar informações. Análises, simulações e cálculos financeiros seguem regras determinísticas do sistema, mantendo você no controle das decisões.' },
];

const ANCORAS = [
    { id: 'recursos', label: 'Recursos' },
    { id: 'como-funciona', label: 'Como funciona' },
    { id: 'seguranca', label: 'Segurança' },
    { id: 'faq', label: 'FAQ' },
];

const MediaPlaceholder = ({ label, icon: Icon, testid }) => {
    const theme = useTheme();
    return (
        <Box data-testid={testid} role="img" aria-label={label}
            sx={{
                width: '100%', aspectRatio: '16 / 9', borderRadius: '16px',
                border: `1px dashed ${theme.palette.divider}`,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.14)} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
            }}>
            <Icon sx={{ fontSize: 56, color: 'primary.main', opacity: 0.85 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{label}</Typography>
        </Box>
    );
};

/** Seção com scroll-reveal: sobe suavemente ao entrar no viewport. */
const Reveal = ({ children, delay = 0 }) => {
    const [ref, visivel] = useInView();
    return (
        <Box ref={ref} sx={{
            opacity: visivel ? 1 : 0,
            transform: visivel ? 'none' : 'translateY(24px)',
            transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
        }}>
            {children}
        </Box>
    );
};

const LandingPage = () => {
    const theme = useTheme();

    useEffect(() => {
        document.title = 'Pondero — Clareza para organizar suas finanças';
        return () => { document.title = 'Pondero'; };
    }, []);

    const irPara = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    return (
        <Box sx={{
            height: '100vh', overflowY: 'auto', overflowX: 'hidden',
            bgcolor: 'background.default', color: 'text.primary', scrollBehavior: 'smooth',
        }}>
            <PublicHeader anchors={ANCORAS} onNavigateSection={irPara} />

            <Container maxWidth="lg" component="main">
                {/* Hero com glow */}
                <Box sx={{ position: 'relative' }}>
                    <Box aria-hidden sx={{
                        position: 'absolute', top: -120, right: -180, width: 480, height: 480,
                        background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.22)} 0%, transparent 65%)`,
                        pointerEvents: 'none',
                    }} />
                    <Grid container spacing={6} alignItems="center" sx={{ py: { xs: 6, md: 10 } }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Reveal>
                                <Chip label="Orçamento e investimentos em uma visão integrada" size="small"
                                    sx={{ mb: 2, bgcolor: alpha(theme.palette.primary.main, 0.15), color: 'primary.main', fontWeight: 600 }} />
                                <Typography component="h1" variant="h3" fontWeight={800} sx={{ letterSpacing: '-1px', mb: 2 }}>
                                    Clareza para organizar suas finanças e planejar o futuro
                                </Typography>
                                <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 400, mb: 3 }}>
                                    Acompanhe orçamento, investimentos e IR em uma visão integrada —
                                    com análises, insights e simulações para entender melhor suas escolhas.
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <Button component={RouterLink} to="/registrar" variant="contained" size="large"
                                        data-testid="landing-cta-hero">
                                        Começar grátis
                                    </Button>
                                    <Button component={RouterLink} to="/login" variant="outlined" size="large">
                                        Já tenho conta
                                    </Button>
                                </Box>
                                <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}>
                                    Grátis para começar • Sem cartão de crédito
                                </Typography>
                            </Reveal>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Reveal delay={0.15}>
                                <MediaPlaceholder label="Prévia do dashboard (imagem em breve)"
                                    icon={ShowChartIcon} testid="landing-placeholder-screenshot" />
                            </Reveal>
                        </Grid>
                    </Grid>
                </Box>

                {/* Stats strip */}
                <Reveal>
                    <Paper sx={{ p: { xs: 2.5, md: 3 }, borderRadius: '16px', boxShadow: 'none', mb: { xs: 4, md: 6 } }}>
                        <Grid container spacing={2}>
                            {STATS.map((s) => (
                                <Grid key={s.rotulo} size={{ xs: 6, md: 3 }}>
                                    <Typography variant="h4" fontWeight={800} sx={{ color: 'primary.main' }}>{s.numero}</Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{s.rotulo}</Typography>
                                </Grid>
                            ))}
                        </Grid>
                    </Paper>
                </Reveal>

                {/* Features */}
                <Box component="section" id="recursos" aria-labelledby="landing-features-titulo"
                    sx={{ py: { xs: 4, md: 6 }, scrollMarginTop: 80 }}>
                    <Reveal>
                        <Typography id="landing-features-titulo" component="h2" variant="h4" fontWeight={700}
                            sx={{ textAlign: 'center', mb: 1 }}>
                            Orçamento e investimentos conectados à sua rotina
                        </Typography>
                        <Typography variant="body1" sx={{ textAlign: 'center', color: 'text.secondary', mb: 5 }}>
                            Da organização dos gastos às análises da carteira, tudo em uma visão integrada.
                        </Typography>
                    </Reveal>
                    <Grid container spacing={3}>
                        {FEATURES.map((f, i) => (
                            <Grid key={f.titulo} size={{ xs: 12, sm: 6, md: 4 }}>
                                <Reveal delay={Math.min(i * 0.08, 0.4)}>
                                    <Paper data-testid="landing-feature-card" sx={{
                                        p: 3, height: '100%', borderRadius: '16px', boxShadow: 'none',
                                        border: `1px solid ${theme.palette.divider}`,
                                        transition: 'transform 0.25s ease, border-color 0.25s ease',
                                        '&:hover': { transform: 'translateY(-4px)', borderColor: alpha(theme.palette.primary.main, 0.5) },
                                    }}>
                                        <f.icon sx={{ color: 'primary.main', fontSize: 32, mb: 1.5 }} />
                                        <Typography component="h3" variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                                            {f.titulo}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{f.texto}</Typography>
                                    </Paper>
                                </Reveal>
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                {/* Como funciona + vídeo */}
                <Box component="section" id="como-funciona" aria-labelledby="landing-passos-titulo"
                    sx={{ py: { xs: 4, md: 6 }, scrollMarginTop: 80 }}>
                    <Reveal>
                        <Typography id="landing-passos-titulo" component="h2" variant="h4" fontWeight={700}
                            sx={{ textAlign: 'center', mb: 5 }}>
                            Como funciona
                        </Typography>
                    </Reveal>
                    <Grid container spacing={4} sx={{ mb: 5 }}>
                        {PASSOS.map((p, i) => (
                            <Grid key={p.n} size={{ xs: 12, md: 4 }}>
                                <Reveal delay={i * 0.1}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Box sx={{
                                            width: 44, height: 44, borderRadius: '50%', mx: 'auto', mb: 1.5,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            bgcolor: alpha(theme.palette.primary.main, 0.15), color: 'primary.main', fontWeight: 800,
                                        }}>{p.n}</Box>
                                        <Typography component="h3" variant="subtitle1" fontWeight={700}>{p.titulo}</Typography>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{p.texto}</Typography>
                                    </Box>
                                </Reveal>
                            </Grid>
                        ))}
                    </Grid>
                    <Container maxWidth="md" disableGutters>
                        <Reveal>
                            <MediaPlaceholder label="Vídeo de demonstração (em breve)"
                                icon={PlayCircleOutlineIcon} testid="landing-placeholder-video" />
                        </Reveal>
                    </Container>
                </Box>

                {/* Segurança */}
                <Box component="section" id="seguranca" aria-labelledby="landing-seguranca-titulo"
                    sx={{ py: { xs: 4, md: 6 }, scrollMarginTop: 80 }}>
                    <Reveal>
                        <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', boxShadow: 'none' }}>
                            <Typography id="landing-seguranca-titulo" component="h2" variant="h5" fontWeight={700} sx={{ mb: 2 }}>
                                Segurança e privacidade por padrão
                            </Typography>
                            <Grid container spacing={3}>
                                {[
                                    { icon: ShieldOutlinedIcon, texto: 'LGPD de ponta a ponta: consentimento explícito e exclusão total da conta quando você quiser.' },
                                    { icon: LockOutlinedIcon, texto: 'Senha criptografada (bcrypt) e sessão com tokens rotativos de curta duração.' },
                                    { icon: CreditCardOffOutlinedIcon, texto: 'Nunca pedimos os dados reais do seu cartão — os cartões do orçamento são 100% virtuais.' },
                                ].map((s, i) => (
                                    <Grid key={i} size={{ xs: 12, md: 4 }}>
                                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                            <s.icon sx={{ color: 'primary.main' }} />
                                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{s.texto}</Typography>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </Paper>
                    </Reveal>
                </Box>

                {/* FAQ */}
                <Box component="section" id="faq" data-testid="landing-faq"
                    sx={{ py: { xs: 4, md: 6 }, scrollMarginTop: 80 }}>
                    <Reveal>
                        <Typography component="h2" variant="h4" fontWeight={700} sx={{ textAlign: 'center', mb: 4 }}>
                            Perguntas frequentes
                        </Typography>
                        <Container maxWidth="md" disableGutters>
                            {FAQ.map((item) => (
                                <Accordion key={item.p} disableGutters
                                    sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Typography variant="subtitle1" fontWeight={600}>{item.p}</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{item.r}</Typography>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Container>
                    </Reveal>
                </Box>

                {/* CTA final */}
                <Box component="section" sx={{ py: { xs: 6, md: 8 }, textAlign: 'center' }}>
                    <Reveal>
                        <Typography component="h2" variant="h4" fontWeight={800} sx={{ mb: 2 }}>
                            Comece a organizar suas finanças hoje
                        </Typography>
                        <Button component={RouterLink} to="/registrar" variant="contained" size="large"
                            data-testid="landing-cta-final">
                            Criar conta grátis
                        </Button>
                    </Reveal>
                </Box>
            </Container>

            {/* Footer completo */}
            <Divider />
            <Box component="footer" data-testid="landing-footer" sx={{ bgcolor: 'background.paper' }}>
                <Container maxWidth="lg">
                    <Grid container spacing={4} sx={{ py: 5 }}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Typography variant="h6" fontWeight={700} sx={{ color: 'primary.main', mb: 1 }}>Pondero</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                                Plataforma de organização financeira que integra orçamento,
                                investimentos e IR em um só lugar.
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton size="small" aria-label="GitHub do Pondero"
                                    component="a" href="https://github.com/joaogabriel43/fortunai-frontend" target="_blank" rel="noopener noreferrer">
                                    <GitHubIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 6, md: 4 }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Produto</Typography>
                            {[
                                ['Recursos', () => irPara('recursos')],
                                ['Como funciona', () => irPara('como-funciona')],
                                ['Segurança', () => irPara('seguranca')],
                                ['Perguntas frequentes', () => irPara('faq')],
                            ].map(([label, acao]) => (
                                <Link key={label} component="button" onClick={acao} variant="body2"
                                    underline="hover" color="text.secondary" sx={{ display: 'block', mb: 0.75, textAlign: 'left' }}>
                                    {label}
                                </Link>
                            ))}
                        </Grid>
                        <Grid size={{ xs: 6, md: 4 }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Legal e status</Typography>
                            <Link component={RouterLink} to="/termos" variant="body2" underline="hover"
                                color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>Termos de Uso</Link>
                            <Link component={RouterLink} to="/privacidade" variant="body2" underline="hover"
                                color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>Política de Privacidade</Link>
                            <Link component={RouterLink} to="/status" variant="body2" underline="hover"
                                color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>Status do sistema</Link>
                        </Grid>
                    </Grid>
                    <Divider />
                    <Box sx={{ py: 2.5, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            © 2026 Pondero — Organização Financeira. Todos os direitos reservados.
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Feito no Brasil 🇧🇷 • Análises e simulações para apoiar decisões mais conscientes.
                        </Typography>
                    </Box>
                </Container>
            </Box>
        </Box>
    );
};

export default LandingPage;
