# FortunAI — Contexto do Projeto

## Stack
- Backend: Java 17 + Spring Boot 3 + PostgreSQL
- Frontend: React + MUI v7 + Vite
- Auth: Spring Security + JWT
- IA: Google Gemini (NLU apenas), Alpha Vantage (dados mercado)
- MUI v7: sempre usar size={{xs, md}} — NUNCA prop "item"

## URLs de Produção
- Frontend: https://pondero.com.br
- Backend: https://api.pondero.com.br
- Health: https://api.pondero.com.br/actuator/health

## Estado Atual
- 958 testes backend + 441 frontend GREEN (medidos em clone limpo: `mvnw clean install -Pintegration-tests` e `npm ci && npx vitest run` — 2026-07-19)
- CI/CD: GitHub Actions (push na main = deploy automático)
- Deploy: Vercel (frontend); backend e PostgreSQL no servidor próprio, publicados via Cloudflare Tunnel

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

## Padrões do Projeto

### [2026-09-01] Viabilidade de merge de branch órfã: contam os commits que tocaram os ARQUIVOS-ALVO, não o total no `main`
**Contexto**: a branch `claude/orcamento-mes-seletor` (seletor de mês persistente do Orçamento + Cartão) ficou parada, sem push, durante todo o redesign Pondero (D4 "Bento Refinado"). Quando o redesign entrou no `main`, o instinto era descartá-la e reimplementar o conceito por cima dos componentes novos — o `main` tinha **88 commits** à frente do ponto de fork.
**O que a métrica certa mostrou**: `git log --oneline <fork>..main -- <arquivos-alvo>` devolveu **4 commits distintos** tocando os 3 arquivos que a branch alterava, e todos cosméticos ou pontuais (substituição de cor literal por token, razão de grid 6/6 → 7/5, `labelId` de a11y, fix de fuso, texto de mensagem de sucesso). Relação sinal/ruído de **22:1** entre o total do `main` e o que de fato conflitava. O merge real produziu **1 arquivo conflitado** com 2 conflitos triviais de adjacência.
**Como aplicar**: antes de decidir "merge vs. reimplementar", medir com `git log --oneline <base>..main -- <caminhos>` e `git diff <tip-da-branch> main -- <caminhos>`. O total de commits no `main` mede o tempo decorrido, não o custo do merge. Só o histórico filtrado pelos arquivos-alvo — e a natureza (estrutural vs. cosmética) das mudanças neles — responde a pergunta.
**Corolário**: a decisão é barata de verificar e cara de errar. Reimplementar joga fora testes já escritos e o design de estado já validado; um `git log` filtrado custa segundos.

### Disciplina de tokens é o que preserva trabalho paralelo através de um redesign
**O que aconteceu**: o `SeletorMesOrcamento`, escrito ANTES do Pondero existir, herdou a paleta nova sem uma linha de alteração — porque nasceu lendo `theme.palette.divider`, `theme.palette.warning.main` e `theme.palette.text.secondary`, com **zero hex/rgba hardcoded**. Verificação visual confirmou: dark, light e mobile 375px, todos corretos, sem retoque.
**Por que funciona**: um componente que só lê tokens não tem opinião sobre cor — ele delega ao tema. Trocar o tema inteiro (que é o que um redesign é) reescreve a aparência dele de graça. Um componente com `#1e1e1e` cravado teria que ser reescrito à mão, e é exatamente esse custo que faz branches paralelas "expirarem".
**Como aplicar**: a regra 1 do Design System (cores sempre via `theme.palette.*` / `tokens.colors.*`, nunca hardcoded) não é só estética — é o que dá **prazo de validade longo** a trabalho não mergeado. Vale ainda mais para branch de feature que vai ficar parada.
**Limite conhecido**: tokens preservam a *coerência*, não garantem *contraste* em modos que não existiam quando o componente nasceu. O chip "Mês atual" ficou legível porém de contraste baixo no light mode (que o `ColorModeContext` só introduziu depois do fork) — registrado como observação, não corrigido no merge.

## Erros Conhecidos e Como Evitá-los

### [2026-07-19] Erro: heading aninhado em DialogTitle (React 19)
**O que aconteceu**: `Typography variant="h6"` usado dentro de `DialogTitle` do MUI gera `<h6>` dentro do `<h2>` que o `DialogTitle` já renderiza. React 19 loga isso como erro de hidratação no console ("In HTML, <h6> cannot be a child of <h2>").
**Por que**: o `variant` do `Typography` define a tag HTML por padrão (h6 → `<h6>`), e o `DialogTitle` já é semanticamente um `<h2>`.
**Como prevenir**: sempre que usar `Typography` dentro de `DialogTitle`, definir `component="span"` (ou `div`) explicitamente, mantendo o `variant` apenas para o estilo visual.
**Exemplo**: `<Typography variant="h6" component="span">Título</Typography>` — corrigido em [ConsentimentoModal.jsx](src/components/ConsentimentoModal.jsx) e [ExclusaoContaModal.jsx](src/components/ExclusaoContaModal.jsx).
**Varredura feita**: `grep -rn -B3 'Typography variant="h6"' src --include="*.jsx" | grep -i dialogtitle` — esses eram os dois únicos casos no projeto.

### [2026-08-31] Erro: z-index ignorado em `position: static` — mascarado com `pointerEvents: 'none'`
**O que aconteceu**: o tooltip do `TutorialOnboarding` ficava atrás do overlay e inclicável. O fix anterior (`09fd706`) adicionou `pointerEvents: 'none'` nos painéis do scrim só para destravar um E2E — mascarou a causa raiz e destruiu a modalidade: com o scrim transparente a cliques, o app inteiro seguia operável por trás do tutorial.
**Por que**: `useState({})` para o estilo do tooltip + um `useEffect` com `if (!targetRect) return` faziam `position` nunca ser definido. Em elemento `position: static` o `z-index` **é ignorado** — o tooltip afundava para trás do overlay (`fixed`, z-index 10000).
**Como prevenir**: (1) todo estilo posicional guardado em estado deve **nascer** com `position` definido no valor inicial, nunca `{}`; um early return não pode ser o único caminho que decide se o elemento é posicionado. (2) **Sinal de alerta**: se o fix de um E2E é "desligar a interatividade de um elemento", ele quase certamente está mascarando um bug de stacking/layout — investigar antes de aceitar.
**Padrão adotado**: overlay modal só é modal se o scrim **capturar** clique. A saída (foco, teclado) é responsabilidade do diálogo — `role="dialog"`, `aria-modal`, focus trap, `Escape` — nunca de um scrim furado. Exceção legítima: elementos puramente decorativos sobre o alvo (o anel de destaque) mantêm `pointerEvents: 'none'`, senão engolem o clique no próprio alvo.
**Bônus**: geometria calculada por instância vai em `style`, não em `sx` — evita gerar classe nova do emotion a cada reposicionamento, e em jsdom o `getComputedStyle` passa a devolver `fixed` de forma determinística. Corrigido em [TutorialOnboarding.jsx](src/components/onboarding/TutorialOnboarding.jsx) (`9e2aa4e`).

## Configurações do Ambiente

### Vitest no Windows: timeout de forks com suíte completa
`npx vitest run` rodando a suíte inteira pode falhar em ~11 arquivos com "[vitest-pool]: Failed to start forks worker" / "Timeout waiting for worker to respond", por pressão de recursos ao subir muitos workers em paralelo. Os testes em si não têm relação com o erro — reexecutar os arquivos afetados com `--maxWorkers=1` resolve. Considerar fixar `test.maxWorkers` (ou `poolOptions.forks.maxForks`) no `vitest.config` se o problema persistir.
**Atenção ao contar testes**: uma execução com forks falhando reporta um total PARCIAL (ex.: 273) sem falhar visivelmente. Sempre conferir o número de arquivos (`Test Files X passed (X)`) — se o total de arquivos for menor que o esperado, a contagem de testes está incompleta.

### E2E de auth/tutorial vs. rate limiter local do backend
O `RateLimitingFilter` do backend limita `POST /api/auth/registrar` a **5 por hora por IP** (`REGISTRAR_MAX`) e `POST /api/auth/login` a 10/min, com buckets Bucket4j **em memória** (Caffeine). Uma rodada de `e2e/tutorial.spec.ts` consome 4 registros (1 do `globalSetup` + 3 cenários), então **duas rodadas seguidas na mesma hora falham por design**, não por regressão.
**Como se manifesta**: a falha nem sempre é um 429 legível. O 429 vem no `registrar`, mas se o estouro pegar o `login`, o `token` chega vazio e o erro que aparece é um **403 no `/api/conta/consentimento`** — sintoma a três saltos da causa.
**O que fazer**: reiniciar o backend zera os buckets (são em memória) — é o caminho rápido, não esperar a janela de 1h.
**Pré-requisitos de uma rodada E2E local**: Docker + `finassistant-db` na porta **5439**, backend dev na 3333, Vite na 5173 (o `webServer` do Playwright reusa um Vite já de pé fora do CI). Sempre fixar `PLAYWRIGHT_API_URL=http://localhost:3333` e `PLAYWRIGHT_BASE_URL=http://localhost:5173` explicitamente — há default silencioso apontando para produção em `smoke.spec.ts`, o mesmo formato de falha do incidente do smoke test.
**Falso alarme conhecido**: `/actuator/health` responde **503** em dev por causa do health indicator de mail (não há SMTP local). Não indica backend quebrado — validar com `POST /api/auth/registrar` (201) ou `login` (200/401).

## 📝 Changelog do CLAUDE.md
- 2026-07-19: adicionadas seções "Erros Conhecidos" e "Configurações do Ambiente" (heading aninhado em DialogTitle; timeout de forks do Vitest); corrigida a contagem de testes em "Estado Atual" para os números reais medidos em clone limpo (958 backend / 441 frontend).
- 2026-08-31: registrado o erro de `z-index` em `position: static` mascarado por `pointerEvents: 'none'` (tutorial de onboarding) e os pré-requisitos/rate limiter do E2E local de auth e tutorial.
- 2026-09-01: adicionada a seção "Padrões do Projeto" com a métrica de viabilidade de merge de branch órfã (contam os commits que tocaram os arquivos-alvo, não o total do `main`) e a disciplina de tokens como prazo de validade de trabalho paralelo — lições do merge do seletor de mês do Orçamento sobre o redesign Pondero.
