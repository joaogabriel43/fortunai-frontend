// Metadados das rotas públicas. Fonte única: o componente <Seo> e os testes leem daqui.
// A landing repete o título/description do index.html (fallback sem JS) — mantenha os dois iguais.
export const SITE_URL = 'https://www.pondero.com.br'

export const PAGINAS = {
  home: {
    path: '/',
    title: 'Pondero — Orçamento, investimentos e IR em um só lugar',
    description:
      'Organize orçamento, investimentos e IR em uma visão integrada, com análises, insights e simulações para decidir com mais clareza.',
  },
  privacidade: {
    path: '/privacidade',
    title: 'Política de Privacidade — Pondero',
    description:
      'Saiba como o Pondero coleta, usa e protege seus dados pessoais e quais são os seus direitos como titular.',
  },
  termos: {
    path: '/termos',
    title: 'Termos de Uso — Pondero',
    description:
      'Leia as condições de uso do Pondero, plataforma de organização financeira: cadastro, uso do serviço e responsabilidades.',
  },
  login: {
    path: '/login',
    title: 'Entrar — Pondero',
    description:
      'Acesse sua conta no Pondero para acompanhar orçamento, investimentos e IR em um só lugar.',
  },
  registrar: {
    path: '/registrar',
    title: 'Criar conta — Pondero',
    description:
      'Crie sua conta no Pondero e organize orçamento, investimentos e IR em uma visão integrada.',
  },
  // Páginas fora do índice: sem canonical/og:url (canonical contradiria o noindex).
  status: {
    noindex: true,
    title: 'Status do sistema — Pondero',
    description: 'Disponibilidade e saúde dos serviços do Pondero.',
  },
  naoEncontrada: {
    noindex: true,
    title: 'Página não encontrada — Pondero',
    description: 'A página que você procura não existe ou foi movida.',
  },
}
