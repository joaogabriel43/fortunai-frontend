import { useState, useCallback } from 'react';
import api from '../services/api';

export function useAposentadoria() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [resultado, setResultado] = useState(null);

    const calcular = useCallback(async (dados) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('/calculadoras/aposentadoria/calcular', dados);
            setResultado(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao calcular aposentadoria.');
        } finally {
            setLoading(false);
        }
    }, []);

    return { loading, error, resultado, calcular };
}
