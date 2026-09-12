/**
 * Prévia de parcelamento de compra no cartão — espelho, no cliente, das regras
 * que o backend aplica em `CartaoCreditoService.lancarCompra` e `obterFatura`.
 *
 * Existe só para a PRÉVIA do wizard "Novo gasto": o valor persistido continua
 * sendo calculado pelo backend. Se as regras de lá mudarem, este arquivo e o
 * teste dele precisam acompanhar — é um espelho, não uma segunda fonte.
 *
 * Toda a aritmética é em centavos inteiros para não herdar erro de ponto
 * flutuante (0.1 + 0.2) numa conta que o usuário confere com a calculadora.
 */

const pad2 = (n) => String(n).padStart(2, '0')

const paraISO = (ano, mes, dia) => `${ano}-${pad2(mes)}-${pad2(dia)}`

const lerISO = (iso) => {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return { ano, mes, dia }
}

const diasNoMes = (ano, mes) => new Date(ano, mes, 0).getDate()

/** Soma meses com a mesma semântica do `LocalDate.plusMonths` do Java: dia 31 + 1 mês vira o último dia do mês seguinte. */
const somarMeses = ({ ano, mes, dia }, meses) => {
  const indice = (mes - 1) + meses
  const novoAno = ano + Math.floor(indice / 12)
  const novoMes = ((indice % 12) + 12) % 12 + 1
  return { ano: novoAno, mes: novoMes, dia: Math.min(dia, diasNoMes(novoAno, novoMes)) }
}

/**
 * Divide o total em `n` parcelas: cada parcela é o total / n arredondado
 * HALF_UP em 2 casas, e o resíduo vai para a ÚLTIMA — assim a soma das
 * parcelas é sempre exatamente o total (invariante do backend, padrão ADR-026).
 *
 * @returns {{ n: number, parcela: number, ultima: number, total: number }} valores em reais
 */
export const calcularParcelas = (total, n) => {
  const totalCentavos = Math.round(Number(total) * 100)
  const qtd = Math.trunc(Number(n))
  if (!Number.isFinite(totalCentavos) || totalCentavos <= 0 || !Number.isFinite(qtd) || qtd < 1) {
    return null
  }
  // HALF_UP para inteiros positivos: floor((2a + b) / 2b).
  const parcelaCentavos = Math.floor((2 * totalCentavos + qtd) / (2 * qtd))
  const ultimaCentavos = totalCentavos - parcelaCentavos * (qtd - 1)
  return {
    n: qtd,
    parcela: parcelaCentavos / 100,
    ultima: ultimaCentavos / 100,
    total: totalCentavos / 100,
  }
}

/**
 * Fatura em que cai um lançamento datado em `dataISO`. O ciclo fecha no
 * `diaFechamento`: compras até esse dia (inclusive) entram na fatura que fecha
 * no mesmo mês; depois dele, na do mês seguinte. `mes`/`ano` são os mesmos
 * parâmetros que `GET /cartoes/{id}/fatura?mes=&ano=` espera.
 */
export const faturaDoLancamento = (dataISO, diaFechamento, diaVencimento) => {
  const data = lerISO(dataISO)
  const base = data.dia <= diaFechamento ? data : somarMeses({ ...data, dia: 1 }, 1)
  const fechamento = { ano: base.ano, mes: base.mes, dia: diaFechamento }
  const vencimento = diaVencimento > diaFechamento
    ? { ...fechamento, dia: diaVencimento }
    : { ...somarMeses(fechamento, 1), dia: diaVencimento }
  return {
    mes: fechamento.mes,
    ano: fechamento.ano,
    fechamento: paraISO(fechamento.ano, fechamento.mes, fechamento.dia),
    vencimento: paraISO(vencimento.ano, vencimento.mes, vencimento.dia),
  }
}

/**
 * Primeira e última fatura de uma compra em `n` parcelas. O backend data a
 * parcela i como `dataCompra.plusMonths(i)`, então cada parcela cai no ciclo
 * da sua própria data — não necessariamente em faturas consecutivas à primeira
 * quando a data da compra é fim de mês.
 */
export const faturasDaCompra = (dataCompraISO, n, diaFechamento, diaVencimento) => {
  const compra = lerISO(dataCompraISO)
  const ultimaData = somarMeses(compra, Math.max(1, n) - 1)
  return {
    primeira: faturaDoLancamento(dataCompraISO, diaFechamento, diaVencimento),
    ultima: faturaDoLancamento(paraISO(ultimaData.ano, ultimaData.mes, ultimaData.dia), diaFechamento, diaVencimento),
  }
}
