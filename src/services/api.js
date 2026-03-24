import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3333',
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
    // Log de diagnóstico
    try {
        console.log('Interceptor do Axios: BaseURL:', api.defaults.baseURL, 'Token presente?', !!token);
    } catch (_) { /* ignore logging errors */ }
    return config;
});

export default api;
