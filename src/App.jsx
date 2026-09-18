import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomeRoute from './components/HomeRoute';
import ErrorBoundary from './components/ErrorBoundary';
import PageLoader from './components/ui/PageLoader';
import ConsentimentoModal from './components/ConsentimentoModal';
import TutorialOnboarding from './components/onboarding/TutorialOnboarding';
import PWAInstallBanner from './components/pwa/PWAInstallBanner';
import CookieConsentBanner from './components/consent/CookieConsentBanner';
import OfflinePage from './components/pwa/OfflinePage';
import api from './services/api';

const LandingPage             = lazy(() => import('./pages/LandingPage'));
const LoginPage               = lazy(() => import('./pages/LoginPage'));
const Registro                = lazy(() => import('./pages/Registro'));
const Dashboard               = lazy(() => import('./pages/Dashboard'));
const Chat                    = lazy(() => import('./pages/Chat'));
const Orcamento               = lazy(() => import('./pages/Orcamento'));
const Investimentos           = lazy(() => import('./pages/Investimentos'));
const Questionario            = lazy(() => import('./pages/Questionario'));
const FluxoCaixa              = lazy(() => import('./pages/FluxoCaixa'));
const Metas                   = lazy(() => import('./pages/Metas'));
const Configuracoes           = lazy(() => import('./pages/Configuracoes'));
const CalculadorasPage        = lazy(() => import('./pages/CalculadorasPage'));
const StatusPage              = lazy(() => import('./pages/StatusPage'));
const NotFound                = lazy(() => import('./pages/NotFound'));
const PlanoPage               = lazy(() => import('./pages/PlanoPage'));
const IrPage                  = lazy(() => import('./pages/IrPage'));
const ResumoInteligente       = lazy(() => import('./pages/ResumoInteligente'));
const TermosUsoPage           = lazy(() => import('./pages/TermosUsoPage'));
const PoliticaPrivacidadePage = lazy(() => import('./pages/PoliticaPrivacidadePage'));

/**
 * Rotas onde o ConsentimentoModal NÃO deve aparecer:
 * - Páginas legais (usuário precisa conseguir LER antes de aceitar)
 * - Páginas públicas de auth (sem sessão ativa ainda)
 */
const ROTAS_SEM_MODAL = ['/termos', '/privacidade', '/login', '/registrar', '/status'];

/**
 * Wrapper interno (dentro de AuthProvider + Router) — controla os overlays globais:
 * 1. ConsentimentoModal LGPD — exibido PRIMEIRO, bloqueia tutorial até aceite
 * 2. TutorialOnboarding — exibido APÓS consentimento aceito
 * 3. PWAInstallBanner e OfflinePage — sem restrição de consentimento
 *
 * FIX: ConsentimentoModal suprimido em /termos e /privacidade para que o usuário
 * consiga ler os documentos antes de aceitar.
 */
function AppContent({ children }) {
    const { user } = useAuth();
    const location = useLocation();
    const [consentimentoPendente, setConsentimentoPendente] = useState(false);

    useEffect(() => {
        if (!user) { setConsentimentoPendente(false); return; }
        api.get('/conta/consentimento/status')
            .then(res => setConsentimentoPendente(!res.data.consentido))
            .catch(() => { /* falha silenciosa — não bloqueia o uso */ });
    }, [user?.id]);

    // Modal só aparece em rotas que não sejam as páginas legais/auth
    const exibirModal = consentimentoPendente &&
        !ROTAS_SEM_MODAL.includes(location.pathname);

    return (
        <>
            {children}

            {/* ConsentimentoModal — PRIMEIRO overlay (bloqueia tutorial enquanto pendente) */}
            <ConsentimentoModal
                open={exibirModal}
                onAceitar={() => setConsentimentoPendente(false)}
            />

            {/* TutorialOnboarding — só exibido APÓS consentimento aceito
                Se consentimentoPendente, não renderiza para evitar conflito de overlays */}
            {!consentimentoPendente && <TutorialOnboarding />}

            <CookieConsentBanner />
            <PWAInstallBanner />
            <OfflinePage />
        </>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
              <ErrorBoundary>
                <AppContent>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                        {/* Rotas Públicas — acessíveis sem login (inclui páginas legais LGPD) */}
                        {/* Landing page (ADR-039): visitante vê a apresentação; logado vai ao dashboard */}
                        <Route path="/" element={<HomeRoute landing={<LandingPage />} />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/registrar" element={<Registro />} />
                        <Route path="/status" element={<StatusPage />} />
                        <Route path="/termos" element={<TermosUsoPage />} />
                        <Route path="/privacidade" element={<PoliticaPrivacidadePage />} />

                        {/* Rotas Protegidas aninhadas sob o ProtectedRoute */}
                        <Route element={<ProtectedRoute />}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/chat" element={<Chat />} />
                            <Route path="/orcamento" element={<Orcamento />} />
                            <Route path="/investimentos" element={<Investimentos />} />
                            <Route path="/questionario" element={<Questionario />} />
                            <Route path="/questionario-perfil" element={<Questionario />} />
                            <Route path="/fire-calculator" element={<Navigate to="/calculadoras" replace />} />
                            <Route path="/fluxo-caixa" element={<FluxoCaixa />} />
                            <Route path="/metas" element={<Metas />} />
                            <Route path="/configuracoes" element={<Configuracoes />} />
                            <Route path="/calculadoras" element={<CalculadorasPage />} />
                            <Route path="/plano" element={<PlanoPage />} />
                            <Route path="/ir" element={<IrPage />} />
                            <Route path="/resumo" element={<ResumoInteligente />} />
                        </Route>

                        {/* Rota Catch-all para caminhos não encontrados */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </AppContent>
              </ErrorBoundary>
            </AuthProvider>
        </Router>
    );
}

export default App;
