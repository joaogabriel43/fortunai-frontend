import { useState, useCallback } from 'react';
import api from '../services/api';

/**
 * Hook para buscar projeções de fluxo de caixa nos 3 períodos (30/60/90 dias) em paralelo.
 * O fetch é lazy — só dispara ao chamar `buscar()`.
 */
export function useFluxoCaixa() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data30, setData30] = useState(null);
    const [data60, setData60] = useState(null);
    const [data90, setData90] = useState(null);

    const buscar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [res30, res60, res90] = await Promise.all([
                api.get('/fluxo-caixa/projecao?dias=30'),
                api.get('/fluxo-caixa/projecao?dias=60'),
                api.get('/fluxo-caixa/projecao?dias=90'),
            ]);
            setData30(res30.data);
            setData60(res60.data);
            setData90(res90.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao carregar projeção de fluxo de caixa.');
        } finally {
            setLoading(false);
        }
    }, []);

    return { loading, error, data30, data60, data90, buscar };
}
