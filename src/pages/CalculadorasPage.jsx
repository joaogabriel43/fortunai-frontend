import React, { useState } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import FireCalculator from './FireCalculator';
import JurosCompostosCalculadora from './calculadoras/JurosCompostosCalculadora';
import AposentadoriaCalculadora from './calculadoras/AposentadoriaCalculadora';

function TabPanel({ children, value, index }) {
    return (
        <Box
            role="tabpanel"
            hidden={value !== index}
            id={`calc-tabpanel-${index}`}
            aria-labelledby={`calc-tab-${index}`}
        >
            {value === index && <Box>{children}</Box>}
        </Box>
    );
}

const CalculadorasPage = () => {
    const [tab, setTab] = useState(0);

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <CalculateIcon sx={{ color: '#7C6AF7', fontSize: 28 }} />
                <Box>
                    <Typography variant="h5" fontWeight={700}>
                        Calculadoras Financeiras
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Ferramentas para planejar sua vida financeira
                    </Typography>
                </Box>
            </Box>

            <Box
                sx={{
                    borderBottom: 1,
                    borderColor: 'rgba(255,255,255,0.08)',
                    mb: 3,
                }}
            >
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    aria-label="calculadoras financeiras"
                    sx={{
                        '& .MuiTab-root': { color: '#8B8BA8', textTransform: 'none', fontWeight: 500 },
                        '& .Mui-selected': { color: '#7C6AF7 !important' },
                        '& .MuiTabs-indicator': { backgroundColor: '#7C6AF7' },
                    }}
                >
                    <Tab label="Independência Financeira" id="calc-tab-0" aria-controls="calc-tabpanel-0" />
                    <Tab label="Juros Compostos" id="calc-tab-1" aria-controls="calc-tabpanel-1" />
                    <Tab label="Aposentadoria" id="calc-tab-2" aria-controls="calc-tabpanel-2" />
                </Tabs>
            </Box>

            <TabPanel value={tab} index={0}>
                <FireCalculator />
            </TabPanel>

            <TabPanel value={tab} index={1}>
                <JurosCompostosCalculadora />
            </TabPanel>

            <TabPanel value={tab} index={2}>
                <AposentadoriaCalculadora />
            </TabPanel>
        </Box>
    );
};

export default CalculadorasPage;
