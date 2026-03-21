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
import ProtectedRoute from './components/ProtectedRoute';

// Componente para redirecionamento de rotas não encontradas
const NotFoundRedirect = () => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                        {/* Rotas Públicas */}
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/registrar" element={<Registro />} />

                        {/* Rotas Protegidas aninhadas sob o ProtectedRoute */}
                        <Route element={<ProtectedRoute />}>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/chat" element={<Chat />} />
                            <Route path="/orcamento" element={<Orcamento />} />
                            <Route path="/investimentos" element={<Investimentos />} />
                            <Route path="/questionario" element={<Questionario />} />
                            <Route path="/questionario-perfil" element={<Questionario />} />
                        </Route>

                        {/* Rota Catch-all para caminhos não encontrados */}
                        <Route path="*" element={<NotFoundRedirect />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;
