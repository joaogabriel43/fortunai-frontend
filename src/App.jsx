import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import PageLoader from './components/ui/PageLoader';

const LoginPage       = lazy(() => import('./pages/LoginPage'));
const Registro        = lazy(() => import('./pages/Registro'));
const Dashboard       = lazy(() => import('./pages/Dashboard'));
const Chat            = lazy(() => import('./pages/Chat'));
const Orcamento       = lazy(() => import('./pages/Orcamento'));
const Investimentos   = lazy(() => import('./pages/Investimentos'));
const Questionario    = lazy(() => import('./pages/Questionario'));
const FireCalculator  = lazy(() => import('./pages/FireCalculator'));
const FluxoCaixa      = lazy(() => import('./pages/FluxoCaixa'));
const Metas           = lazy(() => import('./pages/Metas'));
const Configuracoes   = lazy(() => import('./pages/Configuracoes'));
const CalculadorasPage = lazy(() => import('./pages/CalculadorasPage'));
const StatusPage      = lazy(() => import('./pages/StatusPage'));
const NotFound        = lazy(() => import('./pages/NotFound'));

function App() {
    return (
        <Router>
            <AuthProvider>
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
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
                </Suspense>
              </ErrorBoundary>
            </AuthProvider>
        </Router>
    );
}

export default App;
