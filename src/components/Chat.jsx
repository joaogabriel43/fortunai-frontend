import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Box, TextField, Button, Paper, Typography, IconButton, Skeleton, Chip, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DownloadIcon from '@mui/icons-material/Download';
import api from '../services/api';
import { API_BASE_URL, BACKEND_ORIGIN } from '../config/apiUrl';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrencyInText } from '../utils/formatters';
import { logErroSeguro } from '../utils/apiErrorUtils';
import UploadComprovanteModal from './comprovantes/UploadComprovanteModal';
import PremiumBanner from './plano/PremiumBanner';

const MENSAGEM_BEM_VINDO = { text: 'Olá! Eu sou o Pondero. Como posso te ajudar hoje?', sender: 'bot' };

// Sugestões iniciais — mapeiam para intents reais do ChatService.
const SUGESTOES = [
    'Quanto gastei esse mês?',
    'Registrar um gasto',
    'Como está meu portfólio?',
    'Cotação da PETR4',
];

const PLACEHOLDER = 'Pergunte ou registre algo em português...';
const RELOAD_HISTORY_RETRY_INTERVAL_MS = 1000;
const RELOAD_HISTORY_MAX_RETRIES = 6;

// API helpers para histórico de chat persistido no backend
const buscarHistorico = async (limite = 50) => {
    const res = await api.get(`/chat/historico?limite=${limite}`);
    return res.data;
};

const limparHistoricoBackend = async () => {
    await api.delete('/chat/historico');
};

const removerEcoDaMensagem = (resposta, mensagemUsuario) => {
    if (!mensagemUsuario || !resposta?.includes(mensagemUsuario)) return resposta;
    return resposta.replaceAll(mensagemUsuario, 'Sua mensagem');
};

// Ícone "spark" do design system D4 (SVG puro).
function SparkIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 3l2 6 6 .5-4.5 4 1.5 6-5-3.5-5 3.5 1.5-6L4 9.5 10 9z" />
        </svg>
    );
}

const Chat = () => {
    const theme = useTheme();
    const { user } = useAuth();
    const userKey = user?.id ?? user?.email ?? user?.username ?? 'anon';

    const keySession = (k) => `chatSessionId:${k}`;

    // Cleanup de chaves legadas sem escopo de usuário
    useEffect(() => {
        try {
            if (localStorage.getItem('chatHistory')) localStorage.removeItem('chatHistory');
            if (localStorage.getItem('chatSessionId')) localStorage.removeItem('chatSessionId');
        } catch (_) { /* ignore */ }
    }, []);

    const loadSessionId = (k) => {
        try {
            return localStorage.getItem(keySession(k)) || uuidv4();
        } catch (_) {
            return uuidv4();
        }
    };

    // Estados
    const [sessionId, setSessionId] = useState(() => loadSessionId(userKey));
    const [messages, setMessages] = useState([MENSAGEM_BEM_VINDO]);
    const [loadingHistorico, setLoadingHistorico] = useState(true);
    const [loadingResposta, setLoadingResposta] = useState(false);
    const [input, setInput] = useState('');
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [planoBloqueio, setPlanoBloqueio] = useState(null);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Carrega histórico do backend ao montar (ou quando o usuário mudar).
    useEffect(() => {
        if (!user?.id) return;

        setSessionId(loadSessionId(userKey));

        let cancelado = false;

        const carregarHistorico = async () => {
            try {
                setLoadingHistorico(true);
                let historico = await buscarHistorico(50);
                const foiReload = window.performance
                    ?.getEntriesByType?.('navigation')
                    ?.some((navigation) => navigation.type === 'reload');

                for (
                    let tentativa = 0;
                    foiReload && historico.length === 0 && tentativa < RELOAD_HISTORY_MAX_RETRIES;
                    tentativa += 1
                ) {
                    await new Promise((resolve) => setTimeout(resolve, RELOAD_HISTORY_RETRY_INTERVAL_MS));
                    if (cancelado) return;
                    historico = await buscarHistorico(50);
                }

                if (cancelado) return;
                let ultimaMensagemUsuario = '';
                const mensagens = historico.map((dto) => {
                    const sender = dto.role === 'user' ? 'user' : 'bot';
                    const text = sender === 'user'
                        ? dto.conteudo
                        : removerEcoDaMensagem(dto.conteudo, ultimaMensagemUsuario);

                    if (sender === 'user') ultimaMensagemUsuario = dto.conteudo;

                    return {
                        id: dto.id,
                        text,
                        sender,
                        timestamp: dto.criadoEm,
                        sessaoId: dto.sessaoId,
                    };
                });
                setMessages((prev) => {
                    const apenasBoasVindas = prev.length === 1 && prev[0].text === MENSAGEM_BEM_VINDO.text;
                    if (!apenasBoasVindas) return prev;
                    return mensagens.length ? mensagens : [MENSAGEM_BEM_VINDO];
                });
            } catch (e) {
                if (cancelado) return;
                logErroSeguro('Falha ao carregar histórico — iniciando chat vazio', e, 'warn');
            } finally {
                if (!cancelado) setLoadingHistorico(false);
            }
        };

        carregarHistorico();

        return () => { cancelado = true; };
    }, [user?.id]);

    // Persiste sessionId por usuário
    useEffect(() => {
        try {
            localStorage.setItem(keySession(userKey), sessionId);
        } catch (_) { /* ignore */ }
    }, [sessionId, userKey]);

    // Scroll automático ao final quando mensagens mudam
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleDownloadAutenticado = async (url, label) => {
        try {
            const token = localStorage.getItem('authToken');
            const fullUrl = url.startsWith('http') ? url : `${BACKEND_ORIGIN}${url}`;

            // SEC: nunca enviar JWT para domínio externo — validar same-origin
            const backendOrigin = new URL(API_BASE_URL).origin;
            const targetOrigin = new URL(fullUrl).origin;
            if (targetOrigin !== backendOrigin) {
                console.warn('[Chat] Download bloqueado: URL aponta para domínio externo.');
                return;
            }

            const response = await fetch(fullUrl, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error(`Download falhou: ${response.status}`);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = label || 'download';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(objectUrl);
        } catch (e) {
            logErroSeguro('Falha no download autenticado', e);
        }
    };

    // Núcleo de envio — reaproveitado pelo form e pelos chips de sugestão.
    const enviarMensagem = async (texto) => {
        const conteudo = (texto ?? '').trim();
        if (!conteudo || loadingResposta) return;

        const userMessage = { text: conteudo, sender: 'user' };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');

        const typingMessage = { text: 'Assistente está digitando...', sender: 'bot', typing: true };
        setMessages((prev) => [...prev, typingMessage]);
        setLoadingResposta(true);

        try {
            const response = await api.post('/chat/enviar', {
                mensagem: conteudo,
                idSessao: sessionId,
            });
            const data = response.data;
            const botMessage = {
                text: removerEcoDaMensagem(data.resposta, conteudo),
                sender: 'bot',
                acao: data.acao || null,
            };
            setMessages((prev) => [...prev.filter((m) => !m.typing), botMessage]);
        } catch (error) {
            logErroSeguro('Falha ao enviar mensagem', error);
            if (error.response?.status === 429 || error.response?.status === 403) {
                const data = error.response.data;
                setMessages((prev) => prev.filter((m) => !m.typing));
                setPlanoBloqueio({ recurso: data.recurso, uso: null });
                return;
            }
            const errorMessage = { text: 'Desculpe, não consegui me conectar ao assistente.', sender: 'bot' };
            setMessages((prev) => [...prev.filter((m) => !m.typing), errorMessage]);
        } finally {
            setLoadingResposta(false);
        }
    };

    const handleSend = (e) => {
        e.preventDefault();
        enviarMensagem(input);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) { alert('Arquivo deve ter no maximo 5MB.'); return; }
        const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
        if (!allowed.includes(file.type)) { alert('Apenas PDF, PNG ou JPG.'); return; }
        setUploadFile(file);
        setUploadModalOpen(true);
        e.target.value = '';
    };

    const limparChat = async () => {
        try {
            await limparHistoricoBackend();
        } catch (e) {
            logErroSeguro('Falha ao limpar histórico no backend', e, 'warn');
        }
        setMessages([MENSAGEM_BEM_VINDO]);
    };

    const mostrarSugestoes = !loadingHistorico && messages.length <= 1;

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                maxWidth: 900,
                mx: 'auto',
                px: { xs: 1.5, md: 3 },
                py: 2,
                width: '100%',
                boxSizing: 'border-box',
            }}
        >
            {/* ── Header com avatar gradiente + status online ─────────────── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexShrink: 0 }}>
                <Box
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: theme.palette.primary.contrastText,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                        boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                    }}
                >
                    <SparkIcon size={22} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.1 }}>
                        Pondero
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box
                            sx={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                bgcolor: 'success.main',
                                '@keyframes faPulse': {
                                    '0%, 100%': { opacity: 1 },
                                    '50%': { opacity: 0.35 },
                                },
                                animation: 'faPulse 1.8s ease-in-out infinite',
                            }}
                        />
                        <Typography variant="caption" color="text.secondary">
                            online · entende português natural
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={limparChat} aria-label="limpar chat" title="Limpar chat" size="small">
                    <DeleteIcon fontSize="small" />
                </IconButton>
            </Box>

            {/* ── Corpo das mensagens ────────────────────────────────────── */}
            <Box
                sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    px: { xs: 0.5, md: 1 },
                    py: 1,
                    mb: 2,
                }}
            >
                {loadingHistorico && (
                    <Box sx={{ px: 1, py: 1 }}>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Box key={i} sx={{ display: 'flex', mb: 1.5, justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
                                <Skeleton
                                    animation="wave"
                                    variant="rectangular"
                                    height={56}
                                    width={`${55 + (i * 10)}%`}
                                    sx={{
                                        bgcolor: 'action.hover',
                                        borderRadius: i % 2 === 0 ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                    }}
                                />
                            </Box>
                        ))}
                    </Box>
                )}

                {messages.map((msg, index) => {
                    const isUser = msg.sender === 'user';
                    return (
                        <Box
                            key={index}
                            data-testid={`chat-message-${isUser ? 'user' : 'assistant'}`}
                            sx={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: 1,
                                mb: 1.75,
                                justifyContent: isUser ? 'flex-end' : 'flex-start',
                            }}
                        >
                            {!isUser && (
                                <Box
                                    sx={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        flexShrink: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: theme.palette.primary.contrastText,
                                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                    }}
                                >
                                    <SparkIcon size={14} />
                                </Box>
                            )}

                            <Paper
                                elevation={0}
                                sx={{
                                    p: 1.5,
                                    maxWidth: '78%',
                                    border: 'none',
                                    borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                    color: isUser ? theme.palette.primary.contrastText : 'text.primary',
                                    background: isUser
                                        ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                                        : theme.palette.surfaces.raised,
                                }}
                            >
                                {msg.typing ? (
                                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', py: 0.5 }}>
                                        {[0, 1, 2].map((d) => (
                                            <Box
                                                key={d}
                                                sx={{
                                                    width: 7,
                                                    height: 7,
                                                    borderRadius: '50%',
                                                    bgcolor: 'text.disabled',
                                                    '@keyframes faTyping': {
                                                        '0%, 60%, 100%': { transform: 'translateY(0)', opacity: 0.4 },
                                                        '30%': { transform: 'translateY(-4px)', opacity: 1 },
                                                    },
                                                    animation: 'faTyping 1.2s ease-in-out infinite',
                                                    animationDelay: `${d * 0.18}s`,
                                                }}
                                            />
                                        ))}
                                    </Box>
                                ) : (
                                    <Typography component="span" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.92rem', lineHeight: 1.5 }}>
                                        {isUser ? msg.text : formatCurrencyInText(msg.text)}
                                    </Typography>
                                )}

                                {msg.acao?.tipo === 'DOWNLOAD' && (
                                    <Box sx={{ mt: 1 }}>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<DownloadIcon />}
                                            onClick={() => handleDownloadAutenticado(msg.acao.url, msg.acao.label)}
                                            sx={{ textTransform: 'none', fontSize: 12 }}
                                        >
                                            {msg.acao.label}
                                        </Button>
                                    </Box>
                                )}
                            </Paper>
                        </Box>
                    );
                })}
                <div ref={messagesEndRef} />
            </Box>

            {planoBloqueio && (
                <Box sx={{ mb: 1.5, flexShrink: 0 }}>
                    <PremiumBanner
                        recurso={planoBloqueio.recurso}
                        uso={planoBloqueio.uso}
                        onDismiss={() => setPlanoBloqueio(null)}
                    />
                </Box>
            )}

            {/* ── Composer: sugestões + barra de input ───────────────────── */}
            <Box sx={{ flexShrink: 0 }}>
                {mostrarSugestoes && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                        {SUGESTOES.map((s) => (
                            <Chip
                                key={s}
                                label={s}
                                onClick={() => enviarMensagem(s)}
                                variant="outlined"
                                sx={{
                                    cursor: 'pointer',
                                    borderColor: 'lines.strong',
                                    '&:hover': { borderColor: 'primary.main', bgcolor: 'accent.primarySoft' },
                                }}
                            />
                        ))}
                    </Box>
                )}

                <Paper
                    component="form"
                    onSubmit={handleSend}
                    elevation={0}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        p: 0.5,
                        pl: 1.5,
                        borderRadius: 999,
                        bgcolor: 'surfaces.raised',
                    }}
                >
                    <Box sx={{ color: 'primary.main', display: 'flex', flexShrink: 0 }}>
                        <SparkIcon size={18} />
                    </Box>
                    <TextField
                        fullWidth
                        variant="standard"
                        placeholder={PLACEHOLDER}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        autoFocus
                        InputProps={{ disableUnderline: true, sx: { fontSize: '0.92rem' } }}
                    />
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileSelect}
                    />
                    <IconButton
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="upload comprovante"
                        title="Enviar comprovante"
                        size="small"
                    >
                        <AttachFileIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        type="submit"
                        aria-label="Enviar"
                        disabled={loadingResposta}
                        sx={{
                            color: theme.palette.primary.contrastText,
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                            '&:hover': { boxShadow: `0 0 16px ${alpha(theme.palette.primary.main, 0.5)}` },
                            '&.Mui-disabled': { color: 'text.disabled', background: theme.palette.action.disabledBackground },
                        }}
                    >
                        <SendIcon fontSize="small" />
                    </IconButton>
                </Paper>
            </Box>

            <UploadComprovanteModal
                open={uploadModalOpen}
                onClose={() => setUploadModalOpen(false)}
                file={uploadFile}
            />
        </Box>
    );
};

export default Chat;
