import { useState, useCallback } from 'react';
import api from '../services/api';

export function useMarkowitz() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [resultado, setResultado] = useState(null);

    const otimizar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/investimentos/otimizacao-markowitz');
            setResultado(response.data);
        } catch (err) {
            const status = err.response?.status;
            const body = err.response?.data;
            let msg;
            if (status === 503 && body?.erro === 'RATE_LIMIT') {
                msg = 'Limite de consultas atingido. O serviço de cotações está temporariamente indisponível. Tente novamente amanhã.';
            } else if (status === 503) {
                msg = 'Serviço de dados de mercado temporariamente indisponível. Tente novamente em alguns minutos.';
            } else {
                msg = err.message || 'Erro ao otimizar portfólio.';
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    return { loading, error, resultado, otimizar };
}
