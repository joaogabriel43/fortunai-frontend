<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/MUI-7-007FFF?logo=mui&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tests-71_passing-brightgreen?logo=vitest&logoColor=white" />
  <img src="https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel&logoColor=white" />
  <img src="https://github.com/joaogabriel43/fortunai-frontend/actions/workflows/ci.yml/badge.svg" />
</p>

# FortunAI Frontend

## 🚀 Demo

| | URL |
|---|---|
| **App** | https://fortunai-frontend.vercel.app |
| **API** | https://fortunai-production.up.railway.app |

Interface React do **FortunAI**, assistente financeiro pessoal inteligente. Dashboard premium com tema dark fintech, chat com IA, gestao de orcamento, portfolio de investimentos, FIRE Calculator e mais.

<!-- Screenshots placeholder -->
<!-- ![Dashboard](docs/screenshots/dashboard.png) -->
<!-- ![Chat](docs/screenshots/chat.png) -->
<!-- ![Orcamento](docs/screenshots/orcamento.png) -->

---

## Stack

| Tecnologia | Versao | Papel |
|-----------|--------|-------|
| React | 19 | UI framework |
| MUI (Material UI) | 7 | Design system |
| Vite | 6 | Build tool + HMR |
| Recharts | 2.x | Graficos (donut, line, bar) |
| Axios | 1.x | HTTP client |
| React Router | 7 | Navegacao SPA |
| Vitest | 4.x | Test runner |
| Testing Library | 16.x | Testes de componentes |

---

## Features

- 🎨 **Tema dark premium** — paleta fintech (`#0a0a0f` background, `#7C6AF7` primario, `#00D4AA` secundario)
- 📊 **Dashboard enriquecido** — KPI cards, donut chart de portfolio, evolucao de saldo, despesas por categoria
- 💬 **Chat com IA** — interface conversacional com deteccao de anomalias
- 💰 **Painel de Orcamento** — adicionar transacao, lista com edicao/exclusao, comparativo mensal, alertas de anomalia
- 📈 **Investimentos** — portfolio, estrategia de alocacao, rebalanceamento, benchmark
- 🔥 **FIRE Calculator** — projecao de independencia financeira por 3 perfis
- 🎯 **Metas Financeiras** — CRUD com barra de progresso
- 📱 **Responsivo** — Sidebar Drawer mobile + desktop permanente
- 🏥 **Status Page** — monitoramento em tempo real dos servicos

---

## Como Rodar Localmente

### Pre-requisitos

- Node.js 20+
- npm 10+
- Backend [finassistant](https://github.com/joaogabriel43/finassistant) rodando na porta 3333

### Setup

```bash
git clone https://github.com/joaogabriel43/fortunai-frontend.git
cd fortunai-frontend
npm install
npm run dev
```

Disponivel em **http://localhost:5173**

### Testes

```bash
npm test
# 66 testes devem passar
```

### Build

```bash
npm run build
# Gera dist/ para deploy
```

---

## Variaveis de Ambiente

| Variavel | Descricao | Default |
|----------|----------|---------|
| `VITE_API_URL` | URL base da API backend | `/api` (proxy em dev) |

Crie `.env` na raiz para producao:

```env
VITE_API_URL=https://seu-backend.railway.app
```

---

## Estrutura de Componentes

```
src/
├── pages/                    # Paginas de rota
│   ├── Dashboard.jsx
│   ├── Chat.jsx
│   ├── Orcamento.jsx
│   ├── Investimentos.jsx
│   ├── FireCalculator.jsx
│   ├── FluxoCaixa.jsx
│   ├── Metas.jsx
│   ├── StatusPage.jsx
│   ├── Questionario.jsx
│   └── __tests__/            # Testes por pagina
├── components/
│   ├── layout/Layout.jsx     # Layout principal com Sidebar
│   ├── Sidebar.jsx           # Navegacao lateral
│   ├── dashboard/            # KPI, charts, portfolio table
│   ├── orcamento/            # Formularios, lista, anomalia
│   ├── investimentos/        # Estrategia, benchmark, rebalanceamento
│   └── comprovantes/         # Upload de comprovantes
├── contexts/AuthContext.jsx  # Auth global (JWT)
├── services/api.js           # Axios instance
├── hooks/                    # Custom hooks (useMetas, useFire, etc.)
└── theme.js                  # MUI theme dark premium
```

---

## Backend

API backend: [finassistant](https://github.com/joaogabriel43/finassistant)

---

**FortunAI** — Inteligencia financeira a servico do usuario.
