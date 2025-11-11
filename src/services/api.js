import axios from 'axios';

// Usa a URL da API definida em .env (exposta pelo Vite em import.meta.env) ou fallback relativo
const BASE_API_URL = (import.meta?.env?.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '') + '/api';

const api = axios.create({
    baseURL: BASE_API_URL || '/api', // fallback caso variável não esteja presente
    withCredentials: false,
});

// Log inicial para diagnóstico
try { console.log('[API] BaseURL configurada:', api.defaults.baseURL); } catch (_) { /* ignore logging errors */ }

// Define default JSON headers for POST requests
api.defaults.headers.post['Content-Type'] = 'application/json';

// Interceptor para adicionar o token JWT ao header de autorização
api.interceptors.request.use(async config => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    // Log de diagnóstico
    try {
        console.log('Interceptor do Axios: BaseURL:', api.defaults.baseURL, 'Token presente?', !!token);
    } catch (_) { /* ignore logging errors */ }
    return config;
});

export default api;
