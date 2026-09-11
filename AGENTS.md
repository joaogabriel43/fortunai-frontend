# FortunAI — Contexto do Projeto

## Stack
- Backend: Java 17 + Spring Boot 3 + PostgreSQL
- Frontend: React + MUI v7 + Vite
- Auth: Spring Security + JWT
- IA: Google Gemini (NLU apenas), Alpha Vantage (dados mercado)
- MUI v7: sempre usar size={{xs, md}} — NUNCA prop "item"

## URLs de Produção
- Frontend: https://fortunai-frontend.vercel.app
- Backend: https://finassistant-api.onrender.com
- Health: https://finassistant-api.onrender.com/actuator/health

## Estado Atual
- 958 testes backend + 441 frontend GREEN (medidos em clone limpo: `mvnw clean install -Pintegration-tests` e `npm ci && npx vitest run` — 2026-07-19)
- CI/CD: GitHub Actions (push na main = deploy automático)
- Deploy: Vercel (frontend) no ar; backend aguardando migração Railway (expirado) → Render + Neon

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

## Erros Conhecidos e Como Evitá-los

### [2026-07-19] Erro: heading aninhado em DialogTitle (React 19)
**O que aconteceu**: `Typography variant="h6"` usado dentro de `DialogTitle` do MUI gera `<h6>` dentro do `<h2>` que o `DialogTitle` já renderiza. React 19 loga isso como erro de hidratação no console ("In HTML, <h6> cannot be a child of <h2>").
**Por que**: o `variant` do `Typography` define a tag HTML por padrão (h6 → `<h6>`), e o `DialogTitle` já é semanticamente um `<h2>`.
**Como prevenir**: sempre que usar `Typography` dentro de `DialogTitle`, definir `component="span"` (ou `div`) explicitamente, mantendo o `variant` apenas para o estilo visual.
**Exemplo**: `<Typography variant="h6" component="span">Título</Typography>` — corrigido em [ConsentimentoModal.jsx](src/components/ConsentimentoModal.jsx) e [ExclusaoContaModal.jsx](src/components/ExclusaoContaModal.jsx).
**Varredura feita**: `grep -rn -B3 'Typography variant="h6"' src --include="*.jsx" | grep -i dialogtitle` — esses eram os dois únicos casos no projeto.

## Configurações do Ambiente

### Vitest no Windows: timeout de forks com suíte completa
`npx vitest run` rodando a suíte inteira pode falhar em ~11 arquivos com "[vitest-pool]: Failed to start forks worker" / "Timeout waiting for worker to respond", por pressão de recursos ao subir muitos workers em paralelo. Os testes em si não têm relação com o erro — reexecutar os arquivos afetados com `--maxWorkers=1` resolve. Considerar fixar `test.maxWorkers` (ou `poolOptions.forks.maxForks`) no `vitest.config` se o problema persistir.
**Comando confiável nesta máquina**: executar diretamente `node .\node_modules\vitest\vitest.mjs run --maxWorkers=1`. Evitar `npm run test:run -- --maxWorkers=1`, pois o wrapper npm local pode não repassar a flag ao processo do Vitest.
**Atenção ao contar testes**: uma execução com forks falhando reporta um total PARCIAL (ex.: 273) sem falhar visivelmente. Sempre conferir o número de arquivos (`Test Files X passed (X)`) — se o total de arquivos for menor que o esperado, a contagem de testes está incompleta.

## 📝 Changelog do AGENTS.md
- 2026-09-11: documentado o comando direto e confiável do Vitest com um worker no Windows, sem o wrapper npm.
- 2026-07-19: adicionadas seções "Erros Conhecidos" e "Configurações do Ambiente" (heading aninhado em DialogTitle; timeout de forks do Vitest); corrigida a contagem de testes em "Estado Atual" para os números reais medidos em clone limpo (958 backend / 441 frontend).
