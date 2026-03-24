import React, { useState } from 'react';
import { Box, Grid, Card, CardContent, Typography } from '@mui/material';
import AdicionarTransacaoForm from '../components/orcamento/AdicionarTransacaoForm';
import GastosPorCategoriaChart from '../components/dashboard/GastosPorCategoriaChart';
import ListaTransacoes from '../components/orcamento/ListaTransacoes';
import ComparativoCard from '../components/orcamento/ComparativoCard';
import AnomaliaAlert from '../components/orcamento/AnomaliaAlert';

const Orcamento = () => {
    const [refreshKey, setRefreshKey] = useState(0);

    const handleTransacaoAdicionada = () => {
        setRefreshKey((k) => k + 1);
    };

    const handleTransacaoAlterada = () => {
        setRefreshKey((k) => k + 1);
    };

    return (
        <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', px: { xs: 1.5, md: 3 }, py: 2 }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
                Painel de Orçamento
            </Typography>

            {/* Anomalias detectadas */}
            <AnomaliaAlert />

            {/* Top section: form (left) + chart (right) */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <AdicionarTransacaoForm onTransacaoAdicionada={handleTransacaoAdicionada} />
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <GastosPorCategoriaChart key={refreshKey} />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Comparativo Mensal */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <ComparativoCard />
                </CardContent>
            </Card>

            {/* Bottom: full-width transactions table */}
            <ListaTransacoes refreshKey={refreshKey} onChanged={handleTransacaoAlterada} />
        </Box>
    );
};

export default Orcamento;
