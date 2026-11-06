// scripts/generate-icons.js
// Gera a identidade visual PROVISÓRIA do Pondero (letra "P") com sharp (SVG -> PNG).
// Rodar: node scripts/generate-icons.js
//
// - O "P" é um path (não <text>): não depende de fonte instalada na máquina que gera.
// - Cores = tokens do tema escuro (src/theme.js): fundo #09100E, primary #B8D979.
// - O fundo é full-bleed (sem cantos transparentes) porque o ícone de 512 é
//   `purpose: 'any maskable'`; o "P" fica dentro da zona segura (círculo de 40% do lado).
// - Troque este arquivo (ou os PNGs gerados) quando existir um logo oficial.
import sharp from 'sharp'
import { mkdir, writeFile } from 'fs/promises'

const BG = '#09100E' // theme.js: background.default (dark)
const FG = '#B8D979' // theme.js: primary.main (dark)

// Medidas num viewBox 512. Com o traço, o "P" ocupa x 174..390 / y 102..388 (centro 282,245);
// o transform o leva ao centro (256,256) com escala 1.1 (canto mais distante a ~197px < 204px da zona segura).
const P_PATH = 'M200 388V128H288a76 76 0 0 1 0 152H200'
const P_GLYPH = `<path d="${P_PATH}" fill="none" stroke="${FG}" stroke-width="52" stroke-linejoin="miter" transform="translate(256 256) scale(1.1) translate(-282 -245)"/>`

const svg = (size, radius = 0) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">` +
  `<rect width="512" height="512" rx="${radius}" fill="${BG}"/>${P_GLYPH}</svg>`

const PNGS = [
  ['public/icons/pwa-192x192.png', 192],
  ['public/icons/pwa-512x512.png', 512],
  ['public/icons/apple-touch-icon.png', 180], // iOS aplica o arredondamento sozinho
]

async function main() {
  await mkdir('public/icons', { recursive: true })
  for (const [file, size] of PNGS) {
    await sharp(Buffer.from(svg(size))).png().toFile(file)
    console.log(`Generated ${file}`)
  }
  // Favicon vetorial: cantos arredondados, já que não é máscara.
  await writeFile('public/favicon.svg', svg(64, 112) + '\n')
  console.log('Generated public/favicon.svg')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
