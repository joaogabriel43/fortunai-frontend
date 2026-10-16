import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { logErroSeguro } from '../utils/apiErrorUtils';
import { Grid, Card, CardContent, Typography, Box, List, ListItem, ListItemText } from '@mui/material';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#9C27B0', '#E91E63', '#3F51B5', '#009688'];

const Dashboard = () => {
    const [summary, setSummary] = useState(null);
    const [composition, setComposition] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const response = await api.get('/dashboard/summary');
                const data = response.data;
                setSummary(data);
                let comp = data?.composition || data?.composicao || data?.portfolioComposition || [];
                if (!Array.isArray(comp)) comp = [];
                setComposition(comp);
            } catch (err) {
                setError('Falha ao carregar os dados do dashboard.');
                logErroSeguro('Falha ao carregar o dashboard', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, []);

    return (
        <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Seu Dashboard Financeiro
            </Typography>
            <Grid container spacing={3}>
                {/* Card para o Resumo das Contas */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" component="h2" gutterBottom>
                                Resumo das Contas
                            </Typography>
                            {loading && <Typography>Carregando contas...</Typography>}
                            {error && <Typography color="statusText.negative">{error}</Typography>}
                            {summary && summary.contas && summary.contas.length > 0 ? (
                                <List>
                                    {summary.contas.map((conta) => (
                                        <ListItem key={conta.id} disablePadding>
                                            <ListItemText
                                                primary={conta.nome}
                                                secondary={`Saldo: R$ ${Number(conta.saldoAtual).toFixed(2)}`}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            ) : (
                                !loading && <Typography>Nenhuma conta financeira encontrada.</Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Card para o Gráfico de Composição da Carteira */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" component="h2" gutterBottom>
                                Composição da Carteira
                            </Typography>
                            {loading && <Typography>Carregando gráfico...</Typography>}
                            {error && (
                                <Typography color="statusText.negative">Não foi possível carregar os dados do gráfico.</Typography>
                            )}
                            {/* Renderiza o gráfico somente quando houver mais de um item na composição */}
                            {composition && composition.length > 1 ? (
                                <Box sx={{ width: '100%', height: 400 }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                data={composition}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={120}
                                                fill="#8884d8"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            >
                                                {composition.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Box>
                            ) : (
                                !loading && (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: 300,
                                        }}
                                    >
                                        <Typography variant="body1" color="text.secondary">
                                            Adicione pelo menos dois tipos de ativos diferentes para ver o gráfico de
                                            alocação.
                                        </Typography>
                                    </Box>
                                )
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;
