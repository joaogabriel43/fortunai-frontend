// Flags de funcionalidade. Mudar o valor aqui é a única edição para liberar/esconder.
//
// COMPARTILHAMENTO_HABILITADO: "Orçamento a dois". Escondido até o fluxo de convite funcionar.
// Para reverter: trocar para `true` E recolocar em public/llms.txt (seção de funcionalidades) a linha:
//   - Orçamento a dois: compartilhamento das finanças entre pessoas, com visão unificada e contas separadas.
// (llms.txt é estático e não lê esta flag.)
export const COMPARTILHAMENTO_HABILITADO = false

// PAGAMENTOS_HABILITADOS: cobrança Premium pelo Mercado Pago (ADR-073, Fase C).
// Desligada: /plano mantém o upgrade por e-mail e Configurações não mostra a assinatura.
// Para ligar: trocar para `true` só depois que o backend publicar os endpoints do B5 e a
// flag do backend estiver ligada no mesmo ambiente, e depois de resolver os `TODO(ADR-073 B5)`
// de src/services/assinaturaService.js. Para esconder de novo: voltar para `false`.
export const PAGAMENTOS_HABILITADOS = false
