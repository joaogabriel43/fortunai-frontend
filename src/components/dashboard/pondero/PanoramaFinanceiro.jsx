import React from 'react'
import { Box, Button, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { formatBRL } from '../../ui'

const mono = (t) => t.typography.fontFamilyMono

// Fonte indisponível (null) nunca vira R$ 0,00 — zero financeiro real é outra
// coisa e precisa continuar legível como zero.
function formatarOuTraco(valor) {
  return valor === null || valor === undefined ? '—' : formatBRL(valor)
}

// Mini-stat do panorama. Mantém data-testid="kpi-card" (contrato de teste).
function MiniStat({ label, value }) {
  const indisponivel = value === null || value === undefined
  return (
    <Box data-testid="kpi-card" sx={{ minWidth: 0 }}>
      <Typography
        component="span"
        sx={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'panorama.muted',
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: mono,
          mt: '3px',
          fontSize: { xs: '1rem', md: '1.15rem' },
          fontWeight: 700,
          color: 'panorama.text',
        }}
      >
        {formatarOuTraco(value)}
      </Typography>
      {indisponivel && (
        <Typography sx={{ fontSize: 11.5, color: 'panorama.muted', mt: '2px' }}>
          Fonte indisponível
        </Typography>
      )}
    </Box>
  )
}

/**
 * Panorama financeiro G3-A — a placa translúcida do protótipo Pondero,
 * apoiada DIRETO no ambiente (sem placa opaca extra por baixo).
 *
 * Só mostra o que o backend entrega: patrimônio consolidado, suas duas
 * parcelas e uma próxima ação puramente NAVEGACIONAL. Nada de variação
 * percentual, meta ou diagnóstico — não há fonte factual para isso.
 */
export default function PanoramaFinanceiro({
  patrimonioTotal,
  saldoAtual,
  totalInvestido,
  proximaAcao,
  parcial,
  onTentarNovamente,
}) {
  return (
    <Box
      component="section"
      data-testid="panorama"
      data-tutorial="patrimonio"
      aria-labelledby="panorama-titulo"
      sx={(t) => ({
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.16fr) minmax(300px, 0.84fr)' },
        gap: { xs: '22px', md: '34px' },
        alignItems: 'stretch',
        minHeight: { xs: 'auto', md: 330 },
        p: { xs: '24px 20px', md: 'clamp(26px, 3.1vw, 46px)' },
        borderRadius: `${t.radius.xl}px`,
        border: `1px solid ${t.palette.panorama.line}`,
        background: t.palette.panorama.bg,
        backdropFilter: 'blur(18px)',
        boxShadow: t.palette.elevation.high,
        overflow: 'hidden',
        // A placa é escura NOS DOIS temas, mas o anel de foco global do
        // index.css usa --c-pri — que no tema claro é verde escuro e some
        // sobre ela. Dentro do panorama o foco usa o acento, claro nos dois
        // modos, para continuar visível (WCAG 2.2 AA, foco visível).
        '& :focus-visible': {
          outline: `3px solid ${t.palette.panorama.accent}`,
          outlineOffset: '3px',
        },
      })}
    >
      {/* Coluna editorial ------------------------------------------------ */}
      <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Typography
          component="span"
          sx={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'panorama.accent',
          }}
        >
          Panorama financeiro
        </Typography>

        <Typography
          id="panorama-titulo"
          component="h2"
          sx={(t) => ({
            fontFamily: t.typography.fontFamilyDisplay,
            fontSize: 'clamp(27px, 3vw, 42px)',
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: 'panorama.text',
            m: '10px 0 0',
          })}
        >
          Sua posição consolidada hoje
        </Typography>

        <Typography
          sx={{ mt: '10px', maxWidth: 460, fontSize: 14, lineHeight: 1.55, color: 'panorama.muted' }}
        >
          O patrimônio é o saldo em conta somado ao total investido. Cada número
          abaixo vem direto das suas contas e da sua carteira.
        </Typography>

        <Box sx={{ mt: 'auto', pt: '26px' }}>
          <Typography
            component="span"
            sx={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'panorama.muted',
            }}
          >
            Patrimônio total
          </Typography>
          <Typography
            sx={{
              fontFamily: mono,
              fontSize: { xs: '2rem', md: '2.6rem' },
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: 'panorama.text',
              mt: '4px',
            }}
          >
            {formatarOuTraco(patrimonioTotal)}
          </Typography>
          {parcial && (
            <Typography sx={{ fontSize: 12.5, color: 'panorama.muted', mt: '6px' }}>
              Uma das fontes não respondeu — o total só aparece com as duas parcelas.
            </Typography>
          )}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '18px',
              mt: '20px',
              pt: '18px',
              borderTop: (t) => `1px solid ${t.palette.panorama.line}`,
            }}
          >
            <MiniStat label="Saldo Atual" value={saldoAtual} />
            <MiniStat label="Total Investido" value={totalInvestido} />
          </Box>

          {/* O panorama era o unico modulo sem afordancia de nova tentativa:
              quando uma das suas fontes cai, o usuario precisa poder recarregar
              daqui, como ja acontece nas demais secoes. */}
          {onTentarNovamente && (
            <Button
              onClick={onTentarNovamente}
              size="small"
              sx={(t) => ({
                mt: '14px',
                px: '14px',
                py: '6px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 13,
                borderRadius: `${t.radius.pill}px`,
                border: `1px solid ${t.palette.panorama.innerLine}`,
                color: t.palette.panorama.accent,
                '&:hover': { backgroundColor: t.palette.panorama.inner },
              })}
            >
              Tentar novamente
            </Button>
          )}
        </Box>
      </Box>

      {/* Próxima ação — navegacional, nunca recomendação financeira ------- */}
      <Box
        sx={(t) => ({
          display: 'flex',
          flexDirection: 'column',
          p: { xs: '20px', md: '24px' },
          borderRadius: `${t.radius.lg}px`,
          border: `1px solid ${t.palette.panorama.innerLine}`,
          backgroundColor: t.palette.panorama.inner,
        })}
      >
        <Typography
          component="span"
          sx={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'panorama.accent',
          }}
        >
          Próxima ação
        </Typography>
        <Typography
          component="h3"
          sx={{ fontSize: 17, fontWeight: 700, color: 'panorama.text', m: '10px 0 0' }}
        >
          {proximaAcao.titulo}
        </Typography>
        <Typography sx={{ mt: '8px', fontSize: 13.5, lineHeight: 1.55, color: 'panorama.muted' }}>
          {proximaAcao.descricao}
        </Typography>

        <Button
          component={RouterLink}
          to={proximaAcao.to}
          data-testid="proxima-acao"
          endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
          sx={(t) => ({
            mt: 'auto',
            alignSelf: 'flex-start',
            px: '18px',
            py: '10px',
            textTransform: 'none',
            fontWeight: 700,
            fontSize: 14,
            borderRadius: `${t.radius.pill}px`,
            backgroundColor: t.palette.panorama.accent,
            color: t.palette.panorama.onAccent,
            '&:hover': { backgroundColor: t.palette.panorama.accent, filter: 'brightness(1.06)' },
          })}
        >
          {proximaAcao.rotulo}
        </Button>
      </Box>
    </Box>
  )
}
