# FortunAI — Contexto do Projeto

## Stack
- Backend: Java 17 + Spring Boot 3 + PostgreSQL
- Frontend: React + MUI v7 + Vite
- Auth: Spring Security + JWT
- IA: Google Gemini (NLU apenas), Alpha Vantage (dados mercado)
- MUI v7: sempre usar size={{xs, md}} — NUNCA prop "item"

## URLs de Produção
- Frontend: https://finassistant-frontend.vercel.app
- Backend: https://finassistant-production.up.railway.app
- Health: https://finassistant-production.up.railway.app/api/status

## Estado Atual
- 96 testes backend + 71 frontend = 167 total GREEN
- CI/CD: GitHub Actions (push na main = deploy automático)
- Deploy: Railway (backend) + Vercel (frontend)

## Features Implementadas
- Auth (JWT), Dashboard (Hero + Score Saúde + Gráficos)
- Chat NLU + detecção anomalias integrada
- Orçamento (CRUD + Comparativo Mensal + Import CSV/OFX)
- Investimentos (portfólio + rebalanceamento + benchmarks CDI/IBOV)
- FIRE Calculator, Fluxo de Caixa 30/60/90 dias
- Dividendos/Proventos, Metas Financeiras
- Score de Saúde Financeira, Relatório PDF
- Extração comprovantes via Gemini Vision
- Status Page SRE, Observabilidade (Actuator + Micrometer + logs JSON)
- ADRs documentados em /docs/adr/

## Regra de Ouro
Gemini: interpreta e formata texto APENAS
Alpha Vantage: dados financeiros factuais
Java: todos os cálculos financeiros
NUNCA inverta esse contrato

## Agentes disponíveis
@agents-orchestrator, @engineering-backend-architect,
@engineering-frontend-developer, @engineering-software-architect,
@engineering-senior-developer, @engineering-code-reviewer,
@engineering-database-optimizer, @engineering-sre,
@testing-api-tester, @testing-test-results-analyzer,
@design-ui-designer, @engineering-security-engineer,
@engineering-devops-automator, @engineering-technical-writer

## Próximos passos pendentes
- Chunk size warning Vercel (bundle splitting)
- Tela de perfil do usuário
- Notificações in-app
- Onboarding para novos usuários
