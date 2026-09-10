import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useMesOrcamento } from '../../contexts/MesOrcamentoContext';
import { useTheme } from '@mui/material/styles';
import { corDaCategoria } from '../../utils/categoriaCores';
import { logErroSeguro } from '../../utils/apiErrorUtils';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

// Fallback das fatias quando a categoria nao tem cor gerenciada (ADR-038):
// serie do tema, ordem estavel, uma versao por tema.

const capitalize = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : ''

const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const formatarAnaliseHistorica = (responseData) => {
    if (Array.isArray(responseData)) {
        return responseData.map(item => ({ name: capitalize(item.categoria), value: Number(item.total) }));
    }
    if (responseData && typeof responseData === 'object') {
        return Object.entries(responseData)
            .map(([categoria, total]) => ({ name: capitalize(categoria), value: Number(total) }));
    }
    return [];
};

const agregarDespesasDoMes = (transacoes, mes, ano) => {
    if (!Array.isArray(transacoes)) return [];

    const prefixoMes = `${ano}-${String(mes).padStart(2, '0')}`;
    const totaisPorCategoria = transacoes.reduce((totais, transacao) => {
        const ehDebito = transacao.tipo?.toUpperCase() === 'DEBIT';
        const pertenceAoMes = transacao.data?.startsWith(prefixoMes);
        const valor = Number(transacao.valor);
        if (!ehDebito || !pertenceAoMes || !transacao.categoria || !Number.isFinite(valor)) return totais;

        totais.set(transacao.categoria, (totais.get(transacao.categoria) ?? 0) + valor);
        return totais;
    }, new Map());

    return Array.from(totaisPorCategoria, ([categoria, total]) => ({
        name: capitalize(categoria),
        value: total,
    }));
};

const GastosPorCategoriaChart = ({ showTitle = true }) => {
    const theme = useTheme();
    const COLORS = theme.palette.series;
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Categorias gerenciadas (ADR-038): cor da fatia por nome; sem match → paleta padrão
    const [categoriasGerenciadas, setCategoriasGerenciadas] = useState([]);
    const { user } = useAuth();
    const usuarioId = user?.id;
    const mesOrcamento = useMesOrcamento();
    const mes = mesOrcamento?.mes;
    const ano = mesOrcamento?.ano;
    const modoMensal = Number.isInteger(mes) && Number.isInteger(ano);

    useEffect(() => {
        if (!usuarioId) return;
        api.get('/orcamento/categorias-gerenciadas')
            .then((res) => setCategoriasGerenciadas(res.data ?? []))
            .catch(() => setCategoriasGerenciadas([]));
    }, [usuarioId]);

    useEffect(() => {
        if (!usuarioId) return;
        let active = true;

        const fetchData = async () => {
            try {
                setLoading(true);
                const response = modoMensal
                    ? await api.get(`/orcamento/transacoes/${usuarioId}`)
                    : await api.get(`/orcamento/analise-historica/${usuarioId}`);
                const formatted = modoMensal
                    ? agregarDespesasDoMes(response.data, mes, ano)
                    : formatarAnaliseHistorica(response.data);
                if (!active) return;
                setData(formatted);
                setError(null);
            } catch (err) {
                if (!active) return;
                setError('Não foi possível carregar os dados do gráfico.');
                logErroSeguro('Falha ao carregar gastos por categoria', err);
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchData();
        return () => { active = false; };
    }, [usuarioId, modoMensal, mes, ano]);

    if (!usuarioId) {
        return (
            <SkeletonTheme baseColor={theme.palette.surfaces.surfaceSoft} highlightColor={theme.palette.surfaces.raised}>
                <div style={{ width: '100%', height: 320, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ textAlign: 'center' }}><Skeleton width={300} /></h3>
                    <Skeleton circle height={240} width={240} style={{ marginTop: '20px' }} />
                </div>
            </SkeletonTheme>
        );
    }

    if (loading) {
        return (
            <SkeletonTheme baseColor={theme.palette.surfaces.surfaceSoft} highlightColor={theme.palette.surfaces.raised}>
                <div style={{ width: '100%', height: 320, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ textAlign: 'center' }}><Skeleton width={350} /></h3>
                    <Skeleton circle height={240} width={240} style={{ marginTop: '20px' }} />
                </div>
            </SkeletonTheme>
        );
    }

    if (error) return <p style={{ color: theme.palette.error.main }}>{error}</p>;
    if (data.length === 0) {
        return modoMensal
            ? <p>{`Não há despesas em ${MESES[mes - 1].toLowerCase()} de ${ano} para exibir.`}</p>
            : <p>Não há dados de despesas históricas para exibir.</p>;
    }

    const titulo = modoMensal
        ? `Despesas por Categoria — ${MESES[mes - 1]} ${ano}`
        : 'Despesas por Categoria (Histórico Completo)';

    return (
        <div style={{ width: '100%' }}>
            {showTitle && <h3 style={{ textAlign: 'center', margin: '0 0 8px 0' }}>{titulo}</h3>}
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill={theme.palette.primary.main}
                        dataKey="value"
                        nameKey="name"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`}
                                fill={corDaCategoria(entry.name, categoriasGerenciadas, COLORS[index % COLORS.length])} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default GastosPorCategoriaChart;
