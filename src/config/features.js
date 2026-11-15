// Flags de funcionalidade. Mudar o valor aqui é a única edição para liberar/esconder.
//
// COMPARTILHAMENTO_HABILITADO: "Orçamento a dois". Escondido até o fluxo de convite funcionar.
// Para reverter: trocar para `true` E recolocar em public/llms.txt (seção de funcionalidades) a linha:
//   - Orçamento a dois: compartilhamento das finanças entre pessoas, com visão unificada e contas separadas.
// (llms.txt é estático e não lê esta flag.)
export const COMPARTILHAMENTO_HABILITADO = false

// PAGAMENTOS_HABILITADOS: cobrança Premium pelo Mercado Pago (ADR-073, Fase C).
// Quem decide é o backend: a tela de planos com checkout, a rota /plano/retorno e a
// assinatura em Configurações só aparecem se `GET /api/features` trouxer
// `pagamentos: true` para o usuário (flag global + allowlist). Com a consulta falhando, nada aparece.
// Esta constante é o kill switch do frontend: `false` esconde tudo sem nem consultar o backend
// (/plano volta ao upgrade por e-mail). Ver src/hooks/usePagamentosHabilitados.js.
export const PAGAMENTOS_HABILITADOS = true
