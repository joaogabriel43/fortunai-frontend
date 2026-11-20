// Rotas que o service worker NUNCA responde com o index.html do precache
// (navigateFallback do Workbox). O Workbox testa cada regex contra
// `pathname + search` da navegação.
//
// - Arquivos estáticos de SEO: sem isto, /robots.txt etc. receberiam o HTML do app.
// - Recuperação de senha: as duas páginas vêm sempre da rede, nunca do shell em
//   cache — o link de redefinição carrega um token e não deve ser atendido por
//   uma versão antiga do app. Custo: essas duas páginas não abrem offline
//   (e sem rede não haveria como enviar o formulário de qualquer forma).
export const navigateFallbackDenylist = [
  /^\/robots\.txt$/,
  /^\/sitemap\.xml$/,
  /^\/llms\.txt$/,
  /^\/esqueci-senha(?:[/?]|$)/,
  /^\/redefinir-senha(?:[/?]|$)/,
]
