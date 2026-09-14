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
- 1278 testes unitários + 33 de integração no backend e 703 testes Vitest (95 arquivos) no frontend — GREEN (`./mvnw verify -Pintegration-tests` e `npx vitest run`, 2026-09-13, fechamento da auditoria Antigravity)
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
- **Paginação ou filtro de backend em `/orcamento/transacoes/{id}`** — o endpoint
  devolve a base inteira do usuário e não aceita `mes`/`ano`; o recorte mensal do
  `ListaTransacoes` e do `GastosPorCategoriaChart` é client-side. Funciona bem
  enquanto o payload é pequeno, e evita um round-trip a cada troca de mês. Quando
  o volume de transações crescer o suficiente para o payload incomodar, o caminho
  é paginação (ou `mes`/`ano` como query param) no backend. Decisão consciente de
  não otimizar antes disso.
- **Dívida de "skeleton total" no `GastosPorCategoriaChart`** — o componente já
  mergeado chama `setLoading(true)` em todo refetch, então trocar de mês apaga o
  gráfico e mostra o skeleton inteiro em vez de manter o dado anterior esmaecido
  durante a busca. `ListaTransacoes` e `CalendarioGastosCard` já seguem o padrão
  correto (dados anteriores permanecem na tela, `aria-busy` + opacidade reduzida);
  falta alinhar o gráfico. Registrado fora do escopo da rodada que fez os outros dois.
- **Seletor próprio de mês/ano na seção "Exportar Relatórios" do Orçamento** — o
  `pages/Orcamento.jsx` mantém `mesExportacao`/`anoExportacao` em `useState` local,
  independentes do `MesOrcamentoContext`. No teste manual da propagação do mês, com
  o contexto em Julho/2026 os selects de exportação continuavam em Setembro/2026:
  dois seletores na mesma tela divergindo, e o PDF/CSV sai do mês que o usuário não
  está vendo. Os endpoints `/api/exportacao/*` já aceitam `mes`/`ano` — é só
  consumir o contexto (ou inicializar a partir dele), sem mudança de contrato.
  Registrado fora do escopo da rodada que corrigiu `ListaTransacoes` e
  `CalendarioGastosCard`.
- **`ComparativoCard` / `useComparativoMensal` fixo no mês corrente** — o hook
  calcula `mesAtual`/`mesAnterior` a partir de `new Date()` com dependência `[]`, então
  o card mostra sempre "mês corrente vs. anterior" (ex.: `2026-08 vs 2026-09`
  enquanto o contexto está em Julho). Mesmo problema de fonte de mês divergente;
  `/comparativo-mensal` já recebe `mesAtual`/`mesAnterior` por query param, então o
  fix também dispensa mudança de contrato. De quebra, o hook usa `new Date()` em vez
  de `hojeLocal()` (fuso America/Sao_Paulo). Registrado fora do escopo da mesma rodada.

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

### Padrão: propagação do mês de referência para consumidores do painel de Orçamento
Todo componente sob `pages/Orcamento.jsx` que exibe dado mensal consome `useMesOrcamento()` com guarda (`Number.isInteger(mesOrcamento?.mes)`) e degrada para o mês corrente via `hojeLocal()` quando não há provider acima. Recorte client-side por prefixo `YYYY-MM` quando o endpoint não aceita `mes`/`ano`; refetch com `params: { mes, ano }` quando aceita. Nenhum consumidor mantém seletor de mês próprio — dois seletores na mesma tela divergem e o usuário não sabe qual vale.

### [2026-09-13] Padrão: `isAuthenticated` considera a expiração do JWT (L-5)
**O que é**: o `AuthContext` lê o `exp` do payload do access token (base64url → base64 → `atob`) para decidir se a sessão local ainda faz sentido. Token ilegível ou sem `exp` numérico conta como expirado (fail-closed). Access token vencido **com** refresh token no `localStorage` continua sendo sessão válida — o interceptor do `api.js` renova no primeiro 401 (ADR-029). Vencido **e** sem refresh: o token é descartado no carregamento, sem gastar uma ida ao `/auth/me`.
**Limite**: essa leitura não verifica assinatura (papel do backend) e só roda em render. Um token que vence com a tela parada não desloga até a próxima renderização — registrado como backlog no CLAUDE.md do backend.
**Onde**: [AuthContext.jsx](src/contexts/AuthContext.jsx) (`272f8c1`).

### [2026-09-13] Padrão: `X-Frame-Options: DENY` como fallback de `frame-ancestors` (M-5, M-6)
**O que é**: o `vercel.json` envia a CSP com `frame-ancestors 'none'` **e** `X-Frame-Options: DENY`. O primeiro é o controle moderno; o segundo cobre navegador que não honra `frame-ancestors`. Os dois headers dizem a mesma coisa, então não há conflito.
**Onde**: [vercel.json](vercel.json), pinado por [cspConfig.test.js](src/__tests__/cspConfig.test.js) (`8b446aa`) — mudar um header sem mudar o teste falha a suíte.

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

### [2026-09-10] Erro: `spacing: 4` do tema como armadilha silenciosa de layout
**O que aconteceu**: na aba Configurações, a foto de perfil encostava no nome. `<Stack direction="row" spacing={2}>` entre o avatar de 72px e o bloco de texto rendia **8px**, não os 16px que o autor esperava — e o botão de câmera (24px, `bottom: 0; right: 0`, sem offset nem anel de recorte) invadia esse vão. O mesmo halving comprimia a página inteira (`pt: 3` = 12px, `p: { xs: 2, md: 3 }` = 8/12px).
**Por que**: `src/theme.js` define `spacing: 4` (base de 4px), não os 8px padrão do MUI. Componente escrito antes dessa definição — ou por quem assume o default do MUI — fica com **todos** os espaçamentos silenciosamente pela metade. Não gera erro nem warning; o sintoma é só um layout apertado que parece descuido de CSS.
**Como prevenir**: em layout estrutural (cards, blocos de identidade, gaps entre regiões da página), declarar espaço em **px explícito** (`gap: '24px'`), nunca em múltiplos de `spacing`. Reservar a escala de `spacing` para ajuste fino dentro de um componente já calibrado. Ao tocar um arquivo antigo, conferir se ele nasceu antes do redesign Pondero.
**Exemplo**: `<Stack direction="row" spacing={2}>` (8px neste tema) → `<Box sx={{ display: 'flex', gap: { xs: '18px', sm: '24px' } }}>`. Corrigido em [Configuracoes.jsx](src/pages/Configuracoes.jsx) (`e9467c8`), com comentário no topo do arquivo explicando a armadilha.
**Relação com o padrão de tokens (acima)**: complementa o "Limite conhecido" da disciplina de tokens — um componente token-only herda **cor** de graça através de um redesign, mas **não herda calibração de espaçamento**: a escala de `spacing` também é token, e mudar a base dela reescala tudo sem que ninguém perceba.

### [2026-09-11] Erro: `useAuth()` devolve `null` em teste de componente que lê o usuário
**O que aconteceu**: um componente novo do Orçamento passou a ler `const { user } = useAuth()` para buscar as categorias já usadas (`/orcamento/categorias/{userId}`). Os testes renderizam o componente sob `ThemeProvider` + contextos de domínio, mas **sem** o `AuthProvider` — fora do provider o contexto devolve o valor default (`null`) e a desestruturação quebra o render inteiro, com erro que não menciona autenticação.
**Como prevenir**: todo teste de componente que lê o usuário — direto ou através de um filho — precisa de `vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-123' } }) }))`. Envolver com o `AuthProvider` real é pior: puxa a chamada de sessão e acopla o teste ao fluxo de auth.
**Detalhe que custa tempo**: o id mockado precisa casar com as URLs roteadas no mock do `api` (`/orcamento/categorias/user-123`) — senão o mock cai no `reject` de "url inesperada" e o sintoma aparece como falha de rede, não como contexto ausente.

### [2026-09-12] Payload curl com acento retorna 400 no Git Bash do Windows
**O que aconteceu**: 4 de 7 seeds de transação falharam com HTTP 400; todas as falhas tinham categoria acentuada (`Alimentação`, `Salário`, `Saúde`), todas as ASCII passaram.
**Por que**: encoding do payload no Git Bash sobre Windows, não defeito da aplicação.
**Como prevenir**: usar ASCII em payload de seed via curl nesse ambiente, ou enviar o corpo por arquivo com `--data-binary @arquivo` gravado em UTF-8.

### [2026-09-13] Erro: filtrar a saída colorida do Vitest dá falso vazio
**O que aconteceu**: um filtro de texto sobre a saída do `npx vitest run` não encontrava a linha de resumo, e a suíte parecia não ter terminado.
**Por que**: o Vitest colore a saída com códigos ANSI, que ficam entre as palavras da linha de resumo — o texto visível não é o texto que o filtro recebe.
**Como prevenir**: remover as cores antes de filtrar, com `sed 's/\x1b\[[0-9;]*m//g'`, e só depois procurar a linha `Test Files` / `Tests`.

### [2026-09-13] Erro: `AuthContext.jsx` usa CRLF
**O que aconteceu**: uma edição por script que normalizava para LF e regravava sem restaurar o CRLF faria o diff marcar o arquivo inteiro como alterado.
**Como prevenir**: antes de editar por script, conferir o terminador (`file <arquivo>`); se for CRLF, regravar com CRLF e validar com `git diff --stat` que só as linhas pretendidas mudaram.

## Configurações do Ambiente

### Vitest no Windows: timeout de forks com suíte completa
`npx vitest run` rodando a suíte inteira pode falhar em ~11 arquivos com "[vitest-pool]: Failed to start forks worker" / "Timeout waiting for worker to respond", por pressão de recursos ao subir muitos workers em paralelo. Os testes em si não têm relação com o erro — reexecutar os arquivos afetados com `--maxWorkers=1` resolve. Considerar fixar `test.maxWorkers` (ou `poolOptions.forks.maxForks`) no `vitest.config` se o problema persistir.
**Atenção ao contar testes**: uma execução com forks falhando reporta um total PARCIAL (ex.: 273) sem falhar visivelmente. Sempre conferir o número de arquivos (`Test Files X passed (X)`) — se o total de arquivos for menor que o esperado, a contagem de testes está incompleta.
**Complemento — rodar pelo Bash não funciona neste ambiente**: `npx vitest run` disparado pela ferramenta Bash (Git Bash) estoura o tempo limite sem devolver saída, mesmo quando a suíte de fato roda. Pelo PowerShell a mesma suíte completa termina normalmente. Rodar sempre pelo PowerShell e no MESMO comando do `Set-Location` da worktree (`Set-Location <worktree>; npx vitest run`) — o cwd do PowerShell é redefinido a cada chamada.
**[2026-09-13] Atualização**: pelo Bash **em background** (`run_in_background`) a suíte completa terminou normalmente — 95 arquivos, 703 testes. O que estoura é a execução em primeiro plano. Duas condições: passar `--exclude 'finassistant-frontend/**'` (há um gitlink `finassistant-frontend` dentro do repo que o Vitest tentaria varrer) e, em worktree ou clone novo, rodar `npm ci` antes — com `node_modules` vazio a suíte falha por import, não por teste.

### E2E de auth/tutorial vs. rate limiter local do backend
O `RateLimitingFilter` do backend limita `POST /api/auth/registrar` a **5 por hora por IP** (`REGISTRAR_MAX`) e `POST /api/auth/login` a 10/min, com buckets Bucket4j **em memória** (Caffeine). Uma rodada de `e2e/tutorial.spec.ts` consome 4 registros (1 do `globalSetup` + 3 cenários), então **duas rodadas seguidas na mesma hora falham por design**, não por regressão.
**Como se manifesta**: a falha nem sempre é um 429 legível. O 429 vem no `registrar`, mas se o estouro pegar o `login`, o `token` chega vazio e o erro que aparece é um **403 no `/api/conta/consentimento`** — sintoma a três saltos da causa.
**O que fazer**: reiniciar o backend zera os buckets (são em memória) — é o caminho rápido, não esperar a janela de 1h.
**Pré-requisitos de uma rodada E2E local**: Docker + `finassistant-db` na porta **5439**, backend dev na 3333, Vite na 5173 (o `webServer` do Playwright reusa um Vite já de pé fora do CI). Sempre fixar `PLAYWRIGHT_API_URL=http://localhost:3333` e `PLAYWRIGHT_BASE_URL=http://localhost:5173` explicitamente — há default silencioso apontando para produção em `smoke.spec.ts`, o mesmo formato de falha do incidente do smoke test.
**Falso alarme conhecido**: `/actuator/health` responde **503** em dev por causa do health indicator de mail (não há SMTP local). Não indica backend quebrado — validar com `POST /api/auth/registrar` (201) ou `login` (200/401).

### Commit com mensagem multi-linha no PowerShell 5.1: sempre `git commit -F <arquivo>`
**O que acontece**: uma here-string de aspas duplas (`@"..."@`) passada para `git commit -m` no PowerShell 5.1 é quebrada em vários argumentos — o commit sai com a mensagem deformada e sem as linhas seguintes, inclusive o `Co-Authored-By`.
**Como prevenir**: escrever a mensagem num arquivo (no diretório de scratchpad, nunca no repo) e commitar com `git commit -F <arquivo>`. Mesma regra para `gh pr create --body-file`.
**Se já commitou errado**: `git reset --soft HEAD~1; git reset` e recommitar com `-F` — nada do working tree se perde.
**Quirk irmão, mesmo shell**: `npx eslint $(git diff --name-only <base>)` vira UM argumento só e falha com "No files matching the pattern". A forma correta é splatting: `$f = git diff --name-only <base>; npx eslint @f`.

## Regras de Negócio

### Uso do limite por categoria só existe para o mês corrente
`GET /orcamento/limites/progresso` devolve o progresso dos limites **do mês corrente** — não aceita parâmetro de mês/ano. Por isso o painel do cartão só mostra o consumo do limite quando o mês selecionado é o mês atual: em qualquer outro mês o número seria do mês errado, e exibi-lo é pior que omiti-lo. O bloco sumir ao navegar para outro mês é comportamento esperado, não bug.

## 📝 Changelog do CLAUDE.md
- 2026-07-19: adicionadas seções "Erros Conhecidos" e "Configurações do Ambiente" (heading aninhado em DialogTitle; timeout de forks do Vitest); corrigida a contagem de testes em "Estado Atual" para os números reais medidos em clone limpo (958 backend / 441 frontend).
- 2026-08-31: registrado o erro de `z-index` em `position: static` mascarado por `pointerEvents: 'none'` (tutorial de onboarding) e os pré-requisitos/rate limiter do E2E local de auth e tutorial.
- 2026-09-01: adicionada a seção "Padrões do Projeto" com a métrica de viabilidade de merge de branch órfã (contam os commits que tocaram os arquivos-alvo, não o total do `main`) e a disciplina de tokens como prazo de validade de trabalho paralelo — lições do merge do seletor de mês do Orçamento sobre o redesign Pondero.
- 2026-09-10: registrado em "Erros Conhecidos" o `spacing: 4` do tema como armadilha silenciosa de layout (foto de perfil colada no nome em Configurações) — espaçamento estrutural em px explícito, não em múltiplos de `spacing`.
- 2026-09-12: registrados em "Próximos passos pendentes" os dois itens de backlog abertos pela propagação do mês de referência para `ListaTransacoes` e `CalendarioGastosCard` — paginação/filtro de backend em `/orcamento/transacoes/{id}` (o recorte mensal é client-side por decisão consciente) e a dívida de "skeleton total" no `GastosPorCategoriaChart` já mergeado.
- 2026-09-12: registrados em "Próximos passos pendentes" os achados fora de escopo do teste manual da propagação do mês — seletor próprio de mês/ano da seção "Exportar Relatórios" e `useComparativoMensal` fixo no mês corrente, ambos divergindo do `MesOrcamentoContext`.
- 2026-09-12: registrados em "Padrões do Projeto" a propagação do mês de referência para os consumidores do painel de Orçamento (contexto com guarda + fallback `hojeLocal()`, nenhum seletor de mês próprio) e em "Erros Conhecidos" o 400 de payload curl com acento no Git Bash do Windows.
- 2026-09-11: registrados o mock obrigatório de `AuthContext` em teste de componente que lê o usuário, o `git commit -F` como única forma segura de mensagem multi-linha no PowerShell 5.1 (+ splatting do eslint), o complemento de que a suíte Vitest só termina pelo PowerShell neste ambiente Windows, e a nova seção "Regras de Negócio" com a limitação de mês corrente do `/orcamento/limites/progresso` — lições da branch `feat/painel-cartao-novo-gasto`.
- 2026-09-13: remediação da auditoria Antigravity — contagem de testes em "Estado Atual" atualizada (1278+33 backend / 703 frontend); padrões do L-5 (expiração do JWT no `AuthContext`) e do M-5/M-6 (`X-Frame-Options` como fallback de `frame-ancestors`); erros de filtro sobre saída ANSI do Vitest e de CRLF no `AuthContext.jsx`; suíte Vitest pelo Bash em background com `--exclude` do gitlink.
