import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Box, TextField, Button, Paper, List, ListItem, Typography, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const MENSAGEM_BEM_VINDO = { text: 'Olá! Eu sou o Fortunai. Como posso te ajudar hoje?', sender: 'bot' };
// Preserve legacy welcome texts for migration from localStorage
const LEGACY_WELCOME_TEXTS = [
    'Olá! Eu sou o Finassistant. Como posso te ajudar hoje?',
    'Olá! Eu sou o FinAssistant. Como posso te ajudar hoje?'
];

const Chat = () => {
    const { user } = useAuth();
    const userKey = user?.id ?? user?.email ?? user?.username ?? 'anon';

    const keyHistory = (k) => `chatHistory:${k}`;
    const keySession = (k) => `chatSessionId:${k}`;

    // Cleanup de chaves legadas sem escopo de usuário
    useEffect(() => {
        try {
            if (localStorage.getItem('chatHistory')) localStorage.removeItem('chatHistory');
            if (localStorage.getItem('chatSessionId')) localStorage.removeItem('chatSessionId');
        } catch (_) { /* ignore */ }
    }, []);

    // Helpers de reidratação por usuário
    const loadSessionId = (k) => {
        try {
            return localStorage.getItem(keySession(k)) || uuidv4();
        } catch (_) {
            return uuidv4();
        }
    };

    const loadMessages = (k) => {
        const welcome = [MENSAGEM_BEM_VINDO];
        try {
            const saved = localStorage.getItem(keyHistory(k));
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    const normalized = parsed
                        .map((m) => {
                            if (m && typeof m === 'object') {
                                if ('sender' in m) return m;
                                if ('author' in m) {
                                    return {
                                        text: m.text,
                                        sender: m.author === 'Você' ? 'user' : 'bot',
                                    };
                                }
                            }
                            return null;
                        })
                        .filter((m) => m && !m.typing && m.text && m.sender);
                    // migration: update old welcome text(s) to new branding if present as the first bot message
                    if (normalized.length && normalized[0]?.sender === 'bot' && LEGACY_WELCOME_TEXTS.includes(normalized[0]?.text)) {
                        normalized[0] = { ...normalized[0], text: MENSAGEM_BEM_VINDO.text };
                    }
                    return normalized.length ? normalized : welcome;
                }
            }
        } catch (error) {
            console.error('Erro ao ler o histórico do chat do localStorage', error);
        }
        return welcome;
    };

    // Estados
    const [sessionId, setSessionId] = useState(() => loadSessionId(userKey));
    const skipNextPersistRef = useRef(false);
    const [messages, setMessages] = useState(() => loadMessages(userKey));
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    // Reidrata quando trocar de usuário
    useEffect(() => {
        setSessionId(loadSessionId(userKey));
        setMessages(loadMessages(userKey));
    }, [userKey]);

    // Persiste sessionId por usuário
    useEffect(() => {
        try {
            localStorage.setItem(keySession(userKey), sessionId);
        } catch (_) { /* ignore */ }
    }, [sessionId, userKey]);

    // Salva histórico por usuário e faz scroll
    useEffect(() => {
        try {
            if (skipNextPersistRef.current) {
                skipNextPersistRef.current = false;
            } else {
                const toSave = messages.filter((m) => !m.typing);
                localStorage.setItem(keyHistory(userKey), JSON.stringify(toSave));
            }
        } catch (error) {
            console.error('Erro ao salvar o histórico do chat no localStorage', error);
        }
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, userKey]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        const userMessage = { text: input, sender: 'user' };
        setMessages((prev) => [...prev, userMessage]);
        const currentInput = input;
        setInput('');

        const typingMessage = { text: 'Assistente está digitando...', sender: 'bot', typing: true };
        setMessages((prev) => [...prev, typingMessage]);

        try {
            const response = await api.post('/chat/enviar', {
                mensagem: currentInput,
                idSessao: sessionId,
            });
            const data = response.data;
            const botMessage = { text: data.resposta, sender: 'bot' };
            setMessages((prev) => [...prev.filter((m) => !m.typing), botMessage]);
        } catch (error) {
            console.error('Falha ao enviar mensagem:', error);
            const errorMessage = { text: 'Desculpe, não consegui me conectar ao assistente.', sender: 'bot' };
            setMessages((prev) => [...prev.filter((m) => !m.typing), errorMessage]);
        }
    };

    const limparChat = () => {
        try {
            localStorage.removeItem(keyHistory(userKey));
        } catch (_) { /* ignore */ }
        setMessages([MENSAGEM_BEM_VINDO]);
    };

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
            }}
        >
            <Typography variant="h5" gutterBottom>
                Fortunai
            </Typography>

            <Paper
                elevation={3}
                sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    p: 2,
                    mb: 2,
                }}
            >
                <List>
                    {messages.map((msg, index) => (
                        <ListItem key={index} sx={{ justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                            <Paper
                                elevation={2}
                                sx={{
                                    bgcolor: msg.sender === 'user' ? 'primary.main' : 'background.paper',
                                    color: msg.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                                    p: 1.5,
                                    borderRadius: 2,
                                    maxWidth: '75%'
                                }}
                            >
                                <Typography component="span" sx={{ whiteSpace: 'pre-wrap' }}>
                                    {msg.typing ? 'Assistente está digitando...' : msg.text}
                                </Typography>
                            </Paper>
                        </ListItem>
                    ))}
                </List>
                <div ref={messagesEndRef} />
            </Paper>

            <Box component="form" onSubmit={handleSend} sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Digite sua mensagem..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    autoFocus
                />
                <Button type="submit" variant="contained" sx={{ ml: 1, p: '15px' }} endIcon={<SendIcon />}>
                    Enviar
                </Button>
                <IconButton
                    color="secondary"
                    onClick={limparChat}
                    sx={{ ml: 1 }}
                    aria-label="limpar chat"
                    title="Limpar chat"
                >
                    <DeleteIcon />
                </IconButton>
            </Box>
        </Box>
    );
};
export default Chat;
