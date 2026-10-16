import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Select, MenuItem, FormControl,
  InputLabel, Chip, Button, Collapse, IconButton, Skeleton, Alert,
  FormControlLabel, Switch, Paper, Divider,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TimelineIcon from '@mui/icons-material/Timeline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../contexts/AuthContext';
import useResumoInteligente from '../hooks/useResumoInteligente';
import { mesCorrente } from '../utils/dateUtils';

// ── Constantes ────────────────────────────────────────────────────────────────

const MESES = [
  { value: 1, label: 'Janeiro' },  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },    { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },     { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },    { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' }, { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },{ value: 12, label: 'Dezembro' },
];

const { ano: anoAtual } = mesCorrente();
const ANOS = [anoAtual - 2, anoAtual - 1, anoAtual];

// Mapa tipo → apresentação (ícone + cor). O tipo vem do backend (ADR-045).
// A cor é SEMÂNTICA (conquista = positivo, alerta = negativo, ...), então sai
// dos tokens de status do tema — nunca de hex fixo, que não responderia à
// troca claro/escuro.
const tipoMeta = (t) => ({
  CONQUISTA:    { icon: EmojiEventsIcon,       cor: t.palette.success.main,       rotulo: 'Conquista' },
  ALERTA:       { icon: WarningAmberIcon,      cor: t.palette.error.main,         rotulo: 'Alerta' },
  OPORTUNIDADE: { icon: LightbulbOutlinedIcon, cor: t.palette.warning.main,       rotulo: 'Oportunidade' },
  INVESTIMENTO: { icon: ShowChartIcon,         cor: t.palette.primary.main,       rotulo: 'Investimento' },
  TENDENCIA:    { icon: TimelineIcon,          cor: t.palette.info.main,          rotulo: 'Tendência' },
  IMPACTO:      { icon: TrendingUpIcon,        cor: t.palette.accent.copperText,  rotulo: 'Impacto' },
});

const cardStyle = (t) => ({
  border: `1px solid ${t.palette.lines.subtle}`,
  borderRadius: '16px',
  boxShadow: 'none',
});

// ── Card de um insight, com botão "por quê?" ─────────────────────────────────

const InsightCard = ({ insight, destaque }) => {
  const [aberto, setAberto] = useState(false);
  const theme = useTheme();
  const metas = tipoMeta(theme);
  const meta = metas[insight.tipo] || metas.TENDENCIA;
  const Icone = meta.icon;

  return (
    <Card
      sx={(t) => ({
        ...cardStyle(t),
        borderColor: destaque ? alpha(meta.cor, 0.4) : t.palette.lines.subtle,
        bgcolor: destaque ? alpha(meta.cor, 0.05) : 'transparent',
      })}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Box
            sx={{
              width: 36, height: 36, borderRadius: 2, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: alpha(meta.cor, 0.1),
            }}
          >
            <Icone sx={{ color: meta.cor, fontSize: 20 }} />
          </Box>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                {insight.titulo}
              </Typography>
              <Chip
                label={meta.rotulo}
                size="small"
                sx={{
                  height: 18, fontSize: 10, fontWeight: 700,
                  bgcolor: `${meta.cor}1a`, color: meta.cor,
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
              {insight.texto}
            </Typography>

            {insight.porQue && (
              <>
                <Button
                  size="small"
                  startIcon={<HelpOutlineIcon sx={{ fontSize: 16 }} />}
                  endIcon={
                    <ExpandMoreIcon
                      sx={{
                        fontSize: 16,
                        transform: aberto ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                      }}
                    />
                  }
                  onClick={() => setAberto((v) => !v)}
                  aria-expanded={aberto}
                  sx={{
                    mt: 1, px: 1, minWidth: 0, textTransform: 'none',
                    color: meta.cor, fontSize: 12, fontWeight: 600,
                  }}
                >
                  por quê?
                </Button>
                <Collapse in={aberto}>
                  <Box
                    sx={{
                      mt: 1, p: 1.5, borderRadius: 2,
                      bgcolor: (t) => t.palette.surfaces.surfaceSoft,
                      borderLeft: `3px solid ${meta.cor}`,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      {insight.porQue}
                    </Typography>
                  </Box>
                </Collapse>
              </>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// ── Disclaimer ────────────────────────────────────────────────────────────────

const Disclaimer = ({ texto }) => (
  <Paper
    elevation={0}
    sx={{
      mt: 3, p: 2, borderRadius: 2,
      border: (t) => `1px solid ${t.palette.lines.subtle}`,
      bgcolor: (t) => t.palette.surfaces.surfaceSoft,
      display: 'flex', alignItems: 'flex-start', gap: 1.5,
    }}
  >
    <WarningAmberIcon sx={{ color: 'text.disabled', mt: 0.2, flexShrink: 0, fontSize: 20 }} />
    <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
      {texto}
    </Typography>
  </Paper>
);

// ── Estado vazio ──────────────────────────────────────────────────────────────

const SemInsights = () => (
  <Card sx={(t) => ({ ...cardStyle(t) })}>
    <CardContent sx={{ py: 5, textAlign: 'center' }}>
      <AutoAwesomeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
      <Typography color="text.secondary">
        Nenhum destaque relevante neste período. Registre mais lançamentos para
        receber insights sobre suas finanças.
      </Typography>
    </CardContent>
  </Card>
);

// ── Página principal ──────────────────────────────────────────────────────────

const ResumoInteligente = () => {
  const { user } = useAuth();
  const { resumo, loading, error, gerar } = useResumoInteligente();

  const hoje = mesCorrente();
  const [mes, setMes] = useState(hoje.mes);
  const [ano, setAno] = useState(hoje.ano);
  const [modoDireto, setModoDireto] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    gerar(mes, ano, modoDireto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, mes, ano, modoDireto]);

  const top = resumo?.topInsights ?? [];
  const outros = resumo?.outrosInsights ?? [];
  const semDestaques = !loading && resumo && top.length === 0 && outros.length === 0;

  return (
    <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto', px: { xs: 1.5, md: 3 }, py: 2 }}>

      {/* Header */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 2, mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AutoAwesomeIcon sx={{ color: 'primary.main', fontSize: 28 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Resumo Inteligente do Período
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Conquistas, alertas e oportunidades priorizados do seu mês.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel id="resumo-mes-label">Mês</InputLabel>
            <Select id="resumo-mes" labelId="resumo-mes-label" value={mes} label="Mês" onChange={(e) => setMes(e.target.value)}>
              {MESES.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 90 }}>
            <InputLabel id="resumo-ano-label">Ano</InputLabel>
            <Select id="resumo-ano" labelId="resumo-ano-label" value={ano} label="Ano" onChange={(e) => setAno(e.target.value)}>
              {ANOS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Toggle modo direto */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={modoDireto}
              onChange={(e) => setModoDireto(e.target.checked)}
              size="small"
            />
          }
          label={
            <Typography variant="caption" color="text.secondary">
              Modo direto (só os números, sem narrativa de IA)
            </Typography>
          }
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
      )}

      {loading && (
        <Box>
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              animation="wave"
              variant="rectangular"
              height={90}
              sx={(t) => ({ mb: 2, borderRadius: 2, bgcolor: t.palette.surfaces.surfaceSoft })}
            />
          ))}
        </Box>
      )}

      {!loading && resumo && (
        <>
          {/* Narrativa da IA (modo completo com cota) */}
          {resumo.geradoComIa && resumo.narrativa && (
            <Card sx={(t) => ({ ...cardStyle(t), mb: 3,
                bgcolor: t.palette.accent.primarySoft,
                borderColor: alpha(t.palette.primary.main, 0.3) })}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AutoAwesomeIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'primary.main' }}>
                    Resumo do mês
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                  {resumo.narrativa}
                </Typography>
              </CardContent>
            </Card>
          )}

          {semDestaques ? (
            <SemInsights />
          ) : (
            <>
              {/* TOP 3 — os mais relevantes */}
              {top.length > 0 && (
                <Box sx={{ mb: outros.length > 0 ? 3 : 0 }}>
                  <Typography
                    variant="overline"
                    sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}
                  >
                    Destaques do mês
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                    {top.map((ins, i) => (
                      <InsightCard key={`top-${i}`} insight={ins} destaque />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Outros insights */}
              {outros.length > 0 && (
                <Box>
                  <Divider sx={(t) => ({ mb: 2, borderColor: t.palette.lines.subtle })} />
                  <Typography
                    variant="overline"
                    sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}
                  >
                    Outros pontos
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                    {outros.map((ins, i) => (
                      <InsightCard key={`outro-${i}`} insight={ins} />
                    ))}
                  </Box>
                </Box>
              )}
            </>
          )}

          {resumo.disclaimer && <Disclaimer texto={resumo.disclaimer} />}
        </>
      )}
    </Box>
  );
};

export default ResumoInteligente;
