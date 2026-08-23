// ═══════════════════════════════════════════════════════════════════════
//  A porta do motor de afinidade.
//
//  Importar daqui corre `assertAfinidadeIntegra()` uma vez — o mesmo
//  contrato de `fiscal-data.ts` e de `lib/ferramentas/index.ts`: se uma
//  ferramenta do hub não disser que áreas pede, o build falha em vez de
//  servir um fim de página sem ninguém lá.
//
//  ⚠️ `leitura.ts` NÃO é reexportada daqui de propósito: arrasta o cliente
//  do Supabase, e quem só precisa de calcular a necessidade no servidor
//  (o `ToolShell`) não tem de pagar esse bundle. Quem lê, importa-a pelo
//  caminho completo.
// ═══════════════════════════════════════════════════════════════════════

import { assertAfinidadeIntegra } from "./vocabulario";

assertAfinidadeIntegra();

export * from "./tipos";
export {
  AFINIDADE_POR_FERRAMENTA,
  necessidadeDaFerramenta,
  validarAfinidade,
  assertAfinidadeIntegra,
  type PedidoDaFerramenta,
} from "./vocabulario";
export {
  PESOS,
  ORDEM_DAS_FONTES,
  ordenarPorAfinidade,
  apenasCorrespondentes,
  termoCasaVocabulario,
  explicar,
  emFrase,
  type FichaParaAfinidade,
} from "./motor";
