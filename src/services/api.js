import axios from 'axios';
import { deveTentarRefresh, renovarSessao } from './tokenRefresh';
import { API_BASE_URL } from '../config/apiUrl';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: false,
});

// Define default JSON headers for POST requests
api.defaults.headers.post['Content-Type'] = 'application/json';

// Interceptor para adicionar o token JWT ao header de autorização
api.interceptors.request.use(async config => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    // SEC-03: nada de log de diagnóstico aqui — este interceptor roda em TODA
    // requisição e o console do navegador não é lugar para estado de sessão.
    return config;
});

// Renovação transparente de sessão (ADR-029): 401 → tenta rotacionar o refresh
// token UMA vez e repete a request original. Falha na rotação = sessão morta →
// limpa storage e volta ao login.
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (!deveTentarRefresh(error)) {
            return Promise.reject(error);
        }
        error.config._retry = true;
        try {
            const novoToken = await renovarSessao(api);
            error.config.headers.Authorization = `Bearer ${novoToken}`;
            return api.request(error.config);
        } catch {
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            window.location.assign('/login');
            return Promise.reject(error);
        }
    }
);

export default api;
