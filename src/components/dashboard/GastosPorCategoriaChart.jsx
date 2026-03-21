import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

// Cores para as fatias do gráfico
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19AF'];

const GastosPorCategoriaChart = ({ showTitle = true }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        if (!user || !user.id) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                // Usar análise histórica para abranger todas as transações registradas
                const response = await api.get(`/orcamento/analise-historica/${user.id}`);
                let formatted = [];
                if (Array.isArray(response.data)) {
                    // Caso ainda venha no formato antigo (lista de objetos com categoria/total)
                    formatted = response.data.map(item => ({ name: item.categoria, value: Number(item.total) }));
                } else if (response.data && typeof response.data === 'object') {
                    // Novo formato: mapa categoria -> total
                    formatted = Object.entries(response.data).map(([categoria, total]) => ({ name: categoria, value: Number(total) }));
                }
                setData(formatted);
                setError(null);
            } catch (err) {
                setError('Não foi possível carregar os dados do gráfico.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    if (!user || !user.id) {
        return (
            <SkeletonTheme baseColor="#202020" highlightColor="#444">
                <div style={{ width: '100%', height: 320, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ textAlign: 'center' }}><Skeleton width={300} /></h3>
                    <Skeleton circle height={240} width={240} style={{ marginTop: '20px' }} />
                </div>
            </SkeletonTheme>
        );
    }

    if (loading) {
        return (
            <SkeletonTheme baseColor="#202020" highlightColor="#444">
                <div style={{ width: '100%', height: 320, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ textAlign: 'center' }}><Skeleton width={350} /></h3>
                    <Skeleton circle height={240} width={240} style={{ marginTop: '20px' }} />
                </div>
            </SkeletonTheme>
        );
    }

    if (error) return <p style={{ color: 'red' }}>{error}</p>;
    if (data.length === 0) return <p>Não há dados de despesas históricas para exibir.</p>;

    return (
        <div style={{ width: '100%' }}>
            {showTitle && <h3 style={{ textAlign: 'center', margin: '0 0 8px 0' }}>Despesas por Categoria (Histórico Completo)</h3>}
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
