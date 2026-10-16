/**
 * Converte uma string de data (YYYY-MM-DD) para o formato local (pt-BR)
 * sem ser afetado por problemas de fuso horário (timezone).
 *
 * É uma data de calendário, sem instante: monta em UTC e formata em UTC, assim
 * o dia nunca desloca, qualquer que seja a TZ do navegador. `opcoes` repassa
 * opções de Intl (ex.: `{ day: '2-digit', month: '2-digit' }`).
 */
export const formatarDataLocal = (dataString, opcoes) => {
  if (!dataString) return '';

  // Quebra a string "YYYY-MM-DD"
  const partes = dataString.split('-');
  if (partes.length !== 3) return dataString; // Retorna a string original se o formato for inesperado

  const [ano, mes, dia] = partes;

  const data = new Date(Date.UTC(parseInt(ano), parseInt(mes) - 1, parseInt(dia)));

  return data.toLocaleDateString('pt-BR', { ...opcoes, timeZone: 'UTC' });
};

/**
 * Data de "hoje" no fuso America/Sao_Paulo, no formato "YYYY-MM-DD" que os
 * endpoints esperam.
 *
 * NÃO usar `new Date().toISOString().split('T')[0]` para isso: o `toISOString`
 * devolve a data em UTC. Entre 21:00 e 23:59 (BRT) o UTC já virou o dia
 * seguinte, então o formulário nascia preenchido com AMANHÃ e o backend
 * rejeitava com "não pode ser futura" — os DTOs validam `@PastOrPresent`
 * contra a JVM, cujo fuso é fixado em America/Sao_Paulo no boot da aplicação.
 *
 * O fuso é fixado em São Paulo (e não lido do navegador) de propósito: é ele
 * que o backend usa para decidir o que é futuro, então é ele que define o
 * maior valor aceitável no campo.
 */
export const hojeLocal = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

/** Mês/ano de "hoje" em America/Sao_Paulo: `{ ano, mes }` numéricos (mes 1-12). */
export const mesCorrente = () => {
  const [ano, mes] = hojeLocal().split('-').map(Number);
  return { ano, mes };
};

/** Prefixo "YYYY-MM" do mês de hoje (America/Sao_Paulo). */
export const prefixoMesCorrente = () => hojeLocal().slice(0, 7);

/** Mês imediatamente anterior a `{ ano, mes }`, virando o ano em janeiro. */
export const mesAnterior = ({ ano, mes }) =>
  mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 };
