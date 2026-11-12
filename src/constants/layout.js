// Largura das páginas de dados (Investimentos, Orçamento, Metas, IR).
// Fluida até o teto: em Full HD (main ≈ 1700 px) ocupa tudo; em QHD (main ≈ 2340 px)
// para em 1800 px, para linhas de tabela não ficarem longas demais para ler.
export const PAGE_MAX_WIDTH = 1800

export const pageContainerSx = {
  width: '100%',
  maxWidth: PAGE_MAX_WIDTH,
  mx: 'auto',
  px: { xs: 1.5, md: 3, xl: 5 },
  py: 2,
  boxSizing: 'border-box',
}
