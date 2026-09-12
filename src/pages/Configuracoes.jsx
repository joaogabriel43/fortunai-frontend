import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert, Avatar, Box, Button, CircularProgress,
  Snackbar, Stack, Switch, Tab, Tabs, TextField, Typography, useMediaQuery,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { useAuth } from '../contexts/AuthContext'
import { configuracaoService } from '../services/configuracaoService'
import ExclusaoContaModal from '../components/ExclusaoContaModal'
import { extrairMensagemErroApi } from '../utils/apiErrorUtils'

// ── Primitivos visuais da pagina (linguagem Pondero / D4 "Bento Refinado") ───
//
// Nota de espacamento: o tema define `spacing: 4`, entao `sx={{ gap: 4 }}` vale
// 16px e nao 32px. Esta pagina foi escrita antes dessa base e herdou todos os
// respiros pela METADE — foi exatamente isso que colou a foto de perfil no
// nome. Os espacos estruturais aqui sao declarados em px explicito para nao
// dependerem da base de spacing.

/** Cartao bento: cabecalho (titulo + descricao) sobre corpo, em superficie de tema. */
function SecaoCard({ titulo, descricao, tone = 'default', children }) {
  const perigo = tone === 'danger'
  return (
    <Box
      component="section"
      sx={(t) => ({
        borderRadius: `${t.radius.lg}px`,
        border: `1px solid ${perigo ? alpha(t.palette.error.main, 0.45) : t.palette.lines.subtle}`,
        backgroundColor: perigo ? alpha(t.palette.error.main, 0.06) : t.palette.surfaces.surface,
        boxShadow: perigo ? 'none' : t.palette.elevation.low,
        overflow: 'hidden',
      })}
    >
      <Box
        sx={(t) => ({
          px: { xs: '18px', md: '24px' },
          pt: { xs: '18px', md: '22px' },
          pb: '14px',
          borderBottom: `1px solid ${perigo ? alpha(t.palette.error.main, 0.28) : t.palette.lines.subtle}`,
        })}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {perigo && <WarningAmberIcon sx={{ fontSize: 18, color: 'error.main' }} />}
          <Typography
            component="h2"
            sx={{
              fontSize: 'clamp(15px, 1.3vw, 17px)',
              fontWeight: 700,
              letterSpacing: '-0.015em',
              color: perigo ? 'error.main' : 'text.primary',
              m: 0,
            }}
          >
            {titulo}
          </Typography>
        </Box>
        {descricao && (
          <Typography sx={{ mt: '4px', fontSize: 13.5, color: 'text.secondary', maxWidth: 620 }}>
            {descricao}
          </Typography>
        )}
      </Box>
      <Box sx={{ px: { xs: '18px', md: '24px' }, py: { xs: '18px', md: '22px' } }}>
        {children}
      </Box>
    </Box>
  )
}

/** Grade responsiva de campos: 1 coluna no mobile, N colunas a partir de sm. */
function CamposGrid({ colunas = 2, children }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: `repeat(${colunas}, minmax(0, 1fr))` },
        gap: '16px',
      }}
    >
      {children}
    </Box>
  )
}

function TabPanel({ children, value, index }) {
  if (value !== index) return null
  return (
    <Box
      role="tabpanel"
      id={`configuracoes-painel-${index}`}
      aria-labelledby={`configuracoes-aba-${index}`}
    >
      {children}
    </Box>
  )
}

// ── Aba Perfil ───────────────────────────────────────────────────────────────

function TabPerfil({ onSuccess }) {
  const { user, updateUser } = useAuth()
  const [nome, setNome] = useState(user?.nome || '')
  const [email, setEmail] = useState(user?.email || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const handleSalvar = async () => {
    setError('')
    if (!nome.trim() || !email.trim()) { setError('Nome e email sao obrigatorios'); return }
    setLoading(true)
    try {
      await configuracaoService.atualizarPerfil(nome.trim(), email.trim())
      await updateUser()
      onSuccess('Perfil atualizado com sucesso')
    } catch {
      setError('Nao foi possivel salvar o perfil. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleFoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setLoading(true)
    try {
      await configuracaoService.uploadFoto(file)
      await updateUser()
      onSuccess('Foto atualizada com sucesso')
    } catch (err) {
      // O backend distingue 422 (formato/tamanho invalido), 413 (limite do multipart)
      // e 502 (falha no Cloudinary) com mensagem propria — exibir a real, nao a generica.
      setError(extrairMensagemErroApi(err, 'Erro ao enviar foto. Verifique o formato e tamanho.'))
    } finally {
      setLoading(false)
    }
  }

  const displayName = user?.nome || user?.email || ''
  const initials = displayName
    ? displayName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <Stack sx={{ gap: '20px' }}>
      <SecaoCard
        titulo="Identidade"
        descricao="Sua foto e seu nome aparecem no menu lateral e nos relatorios exportados."
      >
        {/* O problema relatado nascia aqui: o respiro vinha de `spacing={2}` (8px na base
            4) e o botao de camera ficava colado em `bottom:0/right:0`, invadindo o pouco
            espaco que sobrava ate o nome. Agora o respiro e explicito (24px) e o controle
            de camera sai do circulo com anel proprio na cor da superficie. */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: { xs: '18px', sm: '24px' },
          }}
        >
          <Box sx={{ position: 'relative', flexShrink: 0, lineHeight: 0 }}>
            <Avatar
              src={user?.fotoUrl || undefined}
              sx={(t) => ({
                width: { xs: 72, md: 88 },
                height: { xs: 72, md: 88 },
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: { xs: 24, md: 28 },
                fontWeight: 700,
                boxShadow: `0 0 0 3px ${t.palette.surfaces.surface}, 0 0 0 4px ${t.palette.lines.subtle}`,
              })}
            >
              {!user?.fotoUrl && initials}
            </Avatar>
            <Box
              component="button"
              type="button"
              aria-label="Alterar foto de perfil"
              onClick={() => fileRef.current?.click()}
              sx={(t) => ({
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 30,
                height: 30,
                borderRadius: '50%',
                backgroundColor: t.palette.surfaces.raised,
                border: `1px solid ${t.palette.lines.strong}`,
                boxShadow: `0 0 0 3px ${t.palette.surfaces.surface}`,
                color: t.palette.text.primary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 0,
                transition: `background-color 200ms ${t.motion.ease}, color 200ms ${t.motion.ease}`,
                '&:hover': {
                  backgroundColor: t.palette.primary.main,
                  color: t.palette.primary.contrastText,
                },
              })}
            >
              <CameraAltIcon sx={{ fontSize: 15 }} />
            </Box>
            {/* Espelha a validacao do backend (CloudinaryService: JPEG/PNG, 5 MB) — o seletor
                nao deve oferecer formatos que o servidor recusaria com 422. */}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" hidden onChange={handleFoto} />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: { xs: 17, md: 19 },
                fontWeight: 700,
                letterSpacing: '-0.015em',
                lineHeight: 1.25,
              }}
            >
              {displayName || 'Usuario'}
            </Typography>
            {user?.email && (
              <Typography sx={{ mt: '3px', fontSize: 13.5, color: 'text.secondary' }}>
                {user.email}
              </Typography>
            )}
            <Typography sx={{ mt: '10px', fontSize: 12.5, color: 'text.disabled' }}>
              JPG ou PNG, ate 5 MB
            </Typography>
          </Box>
        </Box>
      </SecaoCard>

      <SecaoCard
        titulo="Dados pessoais"
        descricao="Usados para identificar sua conta e enviar as comunicacoes do Pondero."
      >
        <Stack sx={{ gap: '16px' }}>
          <CamposGrid>
            <TextField label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} fullWidth />
            <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth type="email" />
          </CamposGrid>

          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: '4px' }}>
            <Button variant="contained" onClick={handleSalvar} disabled={loading}>
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Salvar perfil'}
            </Button>
          </Box>
        </Stack>
      </SecaoCard>
    </Stack>
  )
}

// ── Aba Seguranca ────────────────────────────────────────────────────────────

function TabSeguranca({ onSuccess }) {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAlterarSenha = async () => {
    setError('')
    if (!senhaAtual || !novaSenha || !confirmar) { setError('Preencha todos os campos'); return }
    if (novaSenha !== confirmar) { setError('A nova senha e confirmacao nao coincidem'); return }
    if (novaSenha.length < 6) { setError('A nova senha deve ter pelo menos 6 caracteres'); return }
    setLoading(true)
    try {
      await configuracaoService.alterarSenha(senhaAtual, novaSenha)
      setSenhaAtual(''); setNovaSenha(''); setConfirmar('')
      onSuccess('Senha alterada com sucesso')
    } catch (err) {
      const status = err.response?.status
      setError(status === 422 ? 'Senha atual incorreta' : 'Nao foi possivel alterar a senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SecaoCard
      titulo="Alterar senha"
      descricao="Confirme a senha atual antes de definir uma nova. Minimo de 6 caracteres."
    >
      <Stack sx={{ gap: '16px' }}>
        <TextField label="Senha atual" type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} fullWidth />

        <CamposGrid>
          <TextField label="Nova senha" type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} fullWidth />
          <TextField label="Confirmar nova senha" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} fullWidth />
        </CamposGrid>

        {error && <Alert severity="error">{error}</Alert>}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: '4px' }}>
          <Button variant="contained" onClick={handleAlterarSenha} disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Alterar senha'}
          </Button>
        </Box>
      </Stack>
    </SecaoCard>
  )
}

// ── Aba Notificacoes ─────────────────────────────────────────────────────────

function PrefsRow({ label, desc, checked, onChange }) {
  return (
    <Box
      sx={(t) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        px: '16px',
        py: '14px',
        borderRadius: `${t.radius.md}px`,
        border: `1px solid ${t.palette.lines.subtle}`,
        backgroundColor: t.palette.surfaces.surfaceSoft,
      })}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.3 }}>{label}</Typography>
        <Typography sx={{ mt: '3px', fontSize: 13, color: 'text.secondary' }}>{desc}</Typography>
      </Box>
      <Switch checked={checked} onChange={onChange} />
    </Box>
  )
}

function TabNotificacoes({ onSuccess }) {
  const [prefs, setPrefs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    configuracaoService.getPreferencias()
      .then(setPrefs)
      .catch(() => setPrefs({ temaEscuro: true, notificacaoEmailAtiva: true, digestSemanalAtivo: true }))
      .finally(() => setLoading(false))
  }, [])

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }))

  const handleSalvar = async () => {
    setSaving(true)
    try {
      await configuracaoService.atualizarPreferencias(prefs)
      onSuccess('Preferencias salvas com sucesso')
    } catch {
      onSuccess('Erro ao salvar preferencias')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <CircularProgress size={24} />

  return (
    <SecaoCard
      titulo="Notificacoes"
      descricao="Escolha o que voce quer receber por e-mail. Nada e enviado sem sua permissao."
    >
      <Stack sx={{ gap: '12px' }}>
        <PrefsRow
          label="Notificacoes por e-mail"
          desc="Receba alertas de preco e orcamento por e-mail"
          checked={prefs.notificacaoEmailAtiva}
          onChange={() => toggle('notificacaoEmailAtiva')}
        />
        <PrefsRow
          label="Digest semanal"
          desc="Resumo financeiro toda segunda-feira"
          checked={prefs.digestSemanalAtivo}
          onChange={() => toggle('digestSemanalAtivo')}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: '4px' }}>
          <Button variant="contained" onClick={handleSalvar} disabled={saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Salvar preferencias'}
          </Button>
        </Box>
      </Stack>
    </SecaoCard>
  )
}

// ── Aba Conta — Zona de Perigo (LGPD Art. 18) ───────────────────────────────

function TabConta() {
  const [exclusaoModalOpen, setExclusaoModalOpen] = useState(false)

  return (
    <>
      <SecaoCard
        titulo="Zona de Perigo"
        tone="danger"
        descricao="Acoes definitivas sobre a sua conta. Leia com atencao antes de prosseguir."
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: '16px', maxWidth: 620 }}>
          A exclusão da conta é <strong>permanente</strong> e remove todos os seus dados —
          transações, investimentos, metas, histórico de chat e configurações.
          Esta ação não pode ser desfeita.
        </Typography>
        <Button
          variant="outlined"
          color="error"
          onClick={() => setExclusaoModalOpen(true)}
        >
          Excluir minha conta
        </Button>
      </SecaoCard>

      {/* Modal de exclusão com confirmação "EXCLUIR" */}
      <ExclusaoContaModal
        open={exclusaoModalOpen}
        onClose={() => setExclusaoModalOpen(false)}
      />
    </>
  )
}

// ── Pagina principal ─────────────────────────────────────────────────────────

const ABAS = ['Perfil', 'Seguranca', 'Notificacoes', 'Conta']

export default function Configuracoes() {
  const [tab, setTab] = useState(0)
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' })
  const theme = useTheme()
  // Navegacao vertical (coluna dedicada) so a partir de md; abaixo disso a barra
  // volta a ser horizontal e rolavel, que e o gesto natural no toque.
  const navVertical = useMediaQuery(theme.breakpoints.up('md'))

  const showToast = useCallback((msg, severity = 'success') => {
    setToast({ open: true, msg, severity })
  }, [])

  return (
    <Box sx={{ p: { xs: '16px', md: '32px' }, maxWidth: 1080, mx: 'auto' }}>
      <Box sx={{ mb: { xs: '20px', md: '26px' } }}>
        <Typography
          component="h1"
          sx={{
            fontSize: 'clamp(21px, 2.4vw, 27px)',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            m: 0,
          }}
        >
          Configurações
        </Typography>
        <Typography sx={{ mt: '6px', fontSize: 14, color: 'text.secondary', maxWidth: 620 }}>
          Gerencie seu perfil, sua senha, as notificacoes que recebe e os dados da sua conta.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '224px minmax(0, 1fr)' },
          gap: { xs: '18px', md: '24px' },
          alignItems: 'start',
        }}
      >
        <Box sx={{ position: { md: 'sticky' }, top: { md: '24px' }, minWidth: 0 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            orientation={navVertical ? 'vertical' : 'horizontal'}
            variant={navVertical ? 'standard' : 'scrollable'}
            scrollButtons={navVertical ? false : 'auto'}
            allowScrollButtonsMobile
            sx={(t) => ({
              minHeight: 0,
              borderRadius: `${t.radius.lg}px`,
              border: `1px solid ${t.palette.lines.subtle}`,
              backgroundColor: t.palette.surfaces.surface,
              p: '6px',
              '& .MuiTabs-indicator': { display: 'none' },
              '& .MuiTabs-flexContainer, & .MuiTabs-list': { gap: '4px' },
              '& .MuiTab-root': {
                minHeight: 40,
                minWidth: 0,
                px: '12px',
                borderRadius: `${t.radius.md}px`,
                fontSize: 14,
                fontWeight: 600,
                color: t.palette.text.secondary,
                alignItems: navVertical ? 'flex-start' : 'center',
                justifyContent: 'flex-start',
                textAlign: 'left',
                transition: `background-color 200ms ${t.motion.ease}, color 200ms ${t.motion.ease}`,
                '&:hover': {
                  color: t.palette.text.primary,
                  backgroundColor: t.palette.surfaces.surfaceSoft,
                },
                '&.Mui-selected': {
                  color: t.palette.text.primary,
                  backgroundColor: t.palette.accent.primarySoft,
                },
              },
            })}
          >
            {ABAS.map((rotulo, i) => (
              <Tab
                key={rotulo}
                label={rotulo}
                id={`configuracoes-aba-${i}`}
                aria-controls={`configuracoes-painel-${i}`}
              />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <TabPanel value={tab} index={0}><TabPerfil onSuccess={showToast} /></TabPanel>
          <TabPanel value={tab} index={1}><TabSeguranca onSuccess={showToast} /></TabPanel>
          <TabPanel value={tab} index={2}><TabNotificacoes onSuccess={showToast} /></TabPanel>
          <TabPanel value={tab} index={3}><TabConta onSuccess={showToast} /></TabPanel>
        </Box>
      </Box>

      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
