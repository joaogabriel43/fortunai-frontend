/**
 * Extrai uma mensagem humana de um erro Axios vindo do backend Pondero.
 *
 * Formatos conhecidos do GlobalExceptionHandler:
 *  - 400 Bean Validation: { status, error: "Validation Failed", fields: { campo: mensagem } }
 *  - 404 / demais:        { status, error, message }
 *
 * @param {unknown} error erro capturado (Axios ou genérico)
 * @param {string} fallback mensagem padrão quando o corpo não é reconhecido
 * @returns {string}
 */
export const extrairMensagemErroApi = (error, fallback) => {
  const data = error?.response?.data;
  if (data) {
    if (typeof data === 'string' && data.trim()) {
      return data;
    }
    if (data.fields && typeof data.fields === 'object') {
      const mensagens = Object.values(data.fields).filter(Boolean);
      if (mensagens.length > 0) return mensagens.join(' ');
    }
    // Shape do RateLimitingFilter (429): { erro: "RATE_LIMIT", mensagem: "..." }
    if (typeof data.mensagem === 'string' && data.mensagem.trim()) {
      return data.mensagem;
    }
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }
  }
  return fallback;
};

/** Mensagem do 409 do lock otimista da conta (backend F1, ADR-066). */
export const MSG_CONFLITO_SALDO =
  'Seu saldo foi atualizado por outra operação neste momento. Recarregue a página e tente novamente.';

/**
 * O backend responde 409 { erro: "Conflito" } quando outra operação alterou a conta
 * ao mesmo tempo. Checa também `erro` para não confundir com o 409
 * PREVIEW_EM_PROCESSAMENTO da importação de extrato.
 */
export const ehConflitoDeSaldo = (error) =>
  error?.response?.status === 409 && error.response.data?.erro === 'Conflito';

/** Mensagem do conflito de saldo, ou `fallback` para qualquer outro erro. */
export const mensagemComConflitoDeSaldo = (error, fallback) =>
  ehConflitoDeSaldo(error) ? MSG_CONFLITO_SALDO : fallback;

/**
 * Loga um erro de API no console SEM vazar dado sensível (SEC-03).
 *
 * Um erro Axios carrega `config.headers.Authorization` (o JWT) e `config.data`
 * (o corpo enviado — no login, e-mail e senha). Passar o objeto cru para o
 * `console.error` despeja tudo isso no console do navegador, onde qualquer
 * extensão ou pessoa com acesso à máquina lê. Esta função extrai apenas o que
 * serve ao diagnóstico — contexto, status HTTP e a mensagem do backend — e
 * emite somente strings.
 *
 * Use SEMPRE esta função no lugar de `console.error(erro)` em blocos catch de
 * chamadas à API.
 *
 * @param {string} contexto o que estava sendo feito (ex.: 'Falha ao salvar estratégia')
 * @param {unknown} error erro capturado (Axios ou genérico)
 * @param {'error'|'warn'} nivel severidade — 'warn' para falhas que o app absorve
 *        com degradação graciosa (ex.: histórico não carregou, chat segue vazio)
 */
export const logErroSeguro = (contexto, error, nivel = 'error') => {
  const status = error?.response?.status;
  const mensagem = extrairMensagemErroApi(error, error?.message || 'erro desconhecido');
  const emitir = nivel === 'warn' ? console.warn : console.error;
  emitir(`[${contexto}]`, status ? `status=${status}` : 'sem resposta do servidor', '—', mensagem);
};
