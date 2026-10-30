// Consolidado no design system D4 — fonte única em src/components/ui.
import { formatBRL } from '../components/ui'

/**
 * @deprecated Use `formatBRL` de '@/components/ui'.
 * Formata um número como moeda BRL: 800.0 → "R$ 800,00"
 */
export const formatCurrency = formatBRL

/**
 * Substitui padrões "R$ 800.0" e "R$ 1500.0" em textos de mensagem
 * por "R$ 800,00" e "R$ 1.500,00" usando regex.
 *
 * Valor já em pt-BR ("R$ 52,66", "R$ 1.234,50", "R$ 1.000") fica como está.
 * Incidente 2026-10-30: o backend já envia "R$ 52,66" e a regex antiga casava só o
 * "52", produzindo "R$ 52,00,66". O lookahead impede casar um prefixo do número
 * (nada de separador ou dígito logo depois) e o replacer preserva milhar com ponto.
 */
export const formatCurrencyInText = (text) => {
  if (!text || typeof text !== 'string') return text
  return text.replace(/R\$\s*(\d+(?:\.\d+)?)(?![.,]?\d)/g, (match, num) =>
    /^\d{1,3}(?:\.\d{3})+$/.test(num) ? match : formatBRL(parseFloat(num))
  )
}
