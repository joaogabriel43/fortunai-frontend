// scripts/generate-og-image.js
// Gera public/og-image.png (1200x630) — imagem de compartilhamento (Open Graph).
// PLACEHOLDER de marca: wordmark "Pondero" sobre o verde escuro do tema, com o
// acento primario do modo escuro. Substituivel sem custo quando o design system
// definitivo existir: basta sobrescrever public/og-image.png (mesmo caminho,
// mesmas dimensoes) — nenhuma referencia no codigo muda.
// Uso: node scripts/generate-og-image.js
import sharp from 'sharp'

const WIDTH = 1200
const HEIGHT = 630
const BG = '#09100E' // theme-color / fundo do modo escuro (src/theme.js)
const ACCENT = '#B8D979' // primary do modo escuro (src/theme.js)
const TEXT_DIM = '#9FB0A8'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>
  <rect x="80" y="240" width="8" height="150" rx="4" fill="${ACCENT}"/>
  <text x="120" y="340" font-family="Georgia, 'Times New Roman', serif" font-size="128" font-weight="600" fill="#FFFFFF">Pondero</text>
  <text x="124" y="400" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="${TEXT_DIM}">Orçamento, investimentos e IR em uma visão integrada</text>
  <text x="124" y="560" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="${ACCENT}">pondero.com.br</text>
</svg>`

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile('public/og-image.png')
console.log(`Generated public/og-image.png (${WIDTH}x${HEIGHT})`)
