import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { login as authLogin, logout as authLogout, getToken as getStoredToken } from '../services/authService';

// Export nomeado exigido
export const AuthContext = createContext(null);

// L-5 (auditoria 2026-09-12): lê o `exp` do payload do JWT (base64url) só para decidir se a sessão
// local ainda faz sentido — NÃO verifica assinatura (isso é papel do backend). Token ilegível ou
// sem `exp` conta como expirado (fail-closed).
const tokenExpirado = (jwt) => {
    try {
        const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const { exp } = JSON.parse(atob(payload));
        return typeof exp !== 'number' || exp * 1000 <= Date.now();
    } catch (_) {
        return true;
    }
};

// Access token vencido continua sendo sessão válida enquanto houver refresh token: o interceptor
// do api.js renova no primeiro 401 (ADR-029). Sem refresh, não há como a sessão se recuperar.
const sessaoValida = (jwt) =>
    !!jwt && (!tokenExpirado(jwt) || !!localStorage.getItem('refreshToken'));

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Carrega somente o usuário se houver token armazenado. NÃO redireciona.
    useEffect(() => {
        const existingToken = getStoredToken();
        if (existingToken && !sessaoValida(existingToken)) {
            // L-5: token vencido e sem refresh — descarta sem gastar uma ida ao /auth/me.
            localStorage.removeItem('authToken');
            setLoading(false);
        } else if (existingToken) {
            setToken(existingToken);
            api.get('/auth/me')
                .then(response => {
                    setUser(response.data);
                })
                .catch(() => {
                    localStorage.removeItem('authToken');
                    setUser(null);
                    setToken(null);
                    // também zera header default por segurança
                    try { delete api.defaults.headers.common['Authorization']; } catch (_) {}
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (credentials) => {
        // Sinaliza início do processo de autenticação
        setLoading(true);
        // remove qualquer Authorization antigo antes de chamar /auth/login
        try { delete api.defaults.headers.common['Authorization']; } catch (_) {}

        const data = await authLogin(credentials.username, credentials.password);
        if (!data?.token) {
            setLoading(false); // garante que o loading finalize em falha precoce
            return data;
        }

        setToken(data.token);
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

        try {
            const userResponse = await api.get('/auth/me');
            const userData = userResponse.data;
            setUser(userData);
            if (userData && userData.questionarioRespondido === false) {
                navigate('/questionario');
            } else {
                navigate('/dashboard');
            }
        } catch (e) {
            // await: a limpeza do Cache Storage precisa terminar antes de a UI
            // liberar a próxima tentativa de login (F-01).
            await authLogout();
            setUser(null);
            setToken(null);
            try { delete api.defaults.headers.common['Authorization']; } catch (_) {}
        } finally {
            setLoading(false);
        }
        return data;
    }, [navigate, authLogout]);

    // F-01: assíncrono de propósito. A sessão em memória cai imediatamente, mas
    // só navegamos para /login depois que o Cache Storage do usuário anterior
    // foi destruído — antes, a limpeza era uma promise solta e a próxima conta
    // podia logar com o cache da anterior ainda de pé. `authLogout` nunca
    // rejeita e tem teto de tempo próprio, então isto não trava a UI.
    const logout = useCallback(async () => {
        setUser(null);
        setToken(null);
        try { delete api.defaults.headers.common['Authorization']; } catch (_) {}
        await authLogout();
        navigate('/login');
    }, [navigate]);

    const updateUser = useCallback((partial) => {
        if (partial && typeof partial === 'object' && !Array.isArray(partial)) {
            // Merge parcial: updateUser({ tutorialConcluido: true })
            setUser(prev => prev ? { ...prev, ...partial } : prev)
        } else {
            // Fallback: re-fetch completo (chamada legada sem argumento)
            api.get('/auth/me')
                .then(me => setUser(me.data))
                .catch(() => {/* ignore */})
        }
    }, []);

    const value = useMemo(() => ({
        user,
        token,
        loading,
        login,
        logout,
        updateUser,
        isAuthenticated: sessaoValida(token)
    }), [user, token, loading, login, logout, updateUser]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth() { return useContext(AuthContext); }
