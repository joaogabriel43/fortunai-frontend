import React, { useState } from 'react';
import { Box } from '@mui/material';
import AdicionarTransacaoForm from '../components/orcamento/AdicionarTransacaoForm';
import GastosPorCategoriaChart from '../components/dashboard/GastosPorCategoriaChart';
import ListaTransacoes from '../components/orcamento/ListaTransacoes';

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
            <h2>Painel de Orçamento</h2>
            <hr />
            <AdicionarTransacaoForm onTransacaoAdicionada={handleTransacaoAdicionada} />
            <ListaTransacoes refreshKey={refreshKey} onChanged={handleTransacaoAlterada} />
            <GastosPorCategoriaChart key={refreshKey} />
        </Box>
    );
};

export default Orcamento;
