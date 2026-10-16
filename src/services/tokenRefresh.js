/**
 * Renovação de sessão via refresh token rotativo (ADR-029).
 *
 * Extraído do interceptor do axios para ser testável isoladamente.
 * Single-flight: N requests que tomam 401 simultaneamente disparam UMA única
 * chamada a /auth/refresh — todas aguardam a mesma Promise (rotação emite um
 * refresh novo por chamada; chamadas paralelas seriam detectadas como reuso
 * pelo backend e derrubariam a família inteira).
 */

let refreshEmAndamento = null;

/**
 * Decide se um erro de resposta merece tentativa de refresh:
 * 401 ou 403, fora dos endpoints de auth, sem retry anterior e com refresh token salvo.
 * O Spring (sem entry point configurado) devolve 403 sem corpo para JWT ausente/expirado,
 * então 403 é candidato a sessão expirada. Se a reexecução voltar 403, `_retry` barra o
 * loop e o erro sobe como "sem permissão".
 */
export const deveTentarRefresh = (error) => {
  const status = error?.response?.status;
  if (status !== 401 && status !== 403) return false;
  if (error?.config?._retry) return false;
  const url = error?.config?.url || '';
  if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/registrar')) {
    return false;
  }
  return Boolean(localStorage.getItem('refreshToken'));
};

/**
 * Executa a rotação (single-flight) e persiste o novo par de tokens.
 * @param {import('axios').AxiosInstance} instancia instância axios SEM retry loop
 * @returns {Promise<string>} novo access token
 */
export const renovarSessao = (instancia) => {
  if (!refreshEmAndamento) {
    refreshEmAndamento = instancia
      .post('/auth/refresh', { refreshToken: localStorage.getItem('refreshToken') })
      .then(({ data }) => {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        return data.token;
      })
      .finally(() => {
        refreshEmAndamento = null;
      });
  }
  return refreshEmAndamento;
};

/** Somente para isolamento entre testes. */
export const __resetParaTestes = () => {
  refreshEmAndamento = null;
};
