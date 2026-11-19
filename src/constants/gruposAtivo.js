// src/constants/gruposAtivo.js
// ───────────────────────────────────────────────────────────────────
// Grupos de exibição da carteira por tipo de ativo, na ordem em que
// aparecem na tela. `tipo` é o nome do enum TipoAtivo do backend.
// Só apresentação: nenhuma regra de negócio depende desta ordem.

export const GRUPOS_ATIVO = [
    { tipo: 'ACAO', label: 'Ações' },
    { tipo: 'FUNDO_IMOBILIARIO', label: 'FIIs' },
    { tipo: 'RENDA_FIXA', label: 'Renda fixa' },
    { tipo: 'EXTERIOR', label: 'Exterior' },
    { tipo: 'CRIPTOMOEDA', label: 'Cripto' },
];

// Tipo ausente ou que o frontend ainda não conhece: o ativo continua
// visível, num grupo à parte no fim da lista.
export const GRUPO_OUTROS = { tipo: 'OUTROS', label: 'Outros' };

export const grupoDoTipo = (tipoAtivo) =>
    GRUPOS_ATIVO.find((grupo) => grupo.tipo === tipoAtivo) ?? GRUPO_OUTROS;
