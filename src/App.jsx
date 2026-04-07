import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import Registro from './pages/Registro';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Orcamento from './pages/Orcamento';
import Investimentos from './pages/Investimentos';
import Questionario from './pages/Questionario';
import FireCalculator from './pages/FireCalculator';
import FluxoCaixa from './pages/FluxoCaixa';
import Metas from './pages/Metas';
import Configuracoes from './pages/Configuracoes';
import CalculadorasPage from './pages/CalculadorasPage';
import StatusPage from './pages/StatusPage';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
    return (
        <Router>
            <AuthProvider>
              <ErrorBoundary>
                <Routes>
                        {/* Rotas Públicas */}
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/registrar" element={<Registro />} />
                        <Route path="/status" element={<StatusPage />} />

                        {/* Rotas Protegidas aninhadas sob o ProtectedRoute */}
                        <Route element={<ProtectedRoute />}>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/chat" element={<Chat />} />
                            <Route path="/orcamento" element={<Orcamento />} />
                            <Route path="/investimentos" element={<Investimentos />} />
                            <Route path="/questionario" element={<Questionario />} />
                            <Route path="/questionario-perfil" element={<Questionario />} />
                            <Route path="/fire-calculator" element={<FireCalculator />} />
                            <Route path="/fluxo-caixa" element={<FluxoCaixa />} />
                            <Route path="/metas" element={<Metas />} />
                            <Route path="/configuracoes" element={<Configuracoes />} />
                            <Route path="/calculadoras" element={<CalculadorasPage />} />
                        </Route>

                        {/* Rota Catch-all para caminhos não encontrados */}
                        <Route path="*" element={<NotFound />} />
                </Routes>
              </ErrorBoundary>
            </AuthProvider>
        </Router>
    );
}

export default App;
