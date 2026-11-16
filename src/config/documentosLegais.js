// Versões vigentes dos Termos de Uso e da Política de Privacidade.
// Enviadas no POST /conta/consentimento pelo Registro e pelo ConsentimentoModal.
// Devem bater com ConsentimentoService.VERSAO_TERMOS / VERSAO_PRIVACIDADE no
// backend: o status compara a versão gravada com a do backend, então subir
// aqui sem subir lá faz o modal reaparecer em loop para usuário novo.
export const VERSAO_TERMOS = '2.0'
export const VERSAO_PRIVACIDADE = '2.0'
