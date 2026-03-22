import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export function useBenchmarks() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dados, setDados] = useState(null);

    const fetchDados = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/benchmarks/comparativo');
            setDados(response.data);
        } catch (err) {
            setError(err.message || 'Erro ao buscar benchmarks.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDados();
    }, [fetchDados]);

    return { loading, error, dados, refetch: fetchDados };
}
