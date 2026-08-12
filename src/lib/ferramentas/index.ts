// ═══════════════════════════════════════════════════════════════════════
//  A porta do catálogo de ferramentas.
//
//  Importar daqui corre `assertCatalogoFerramentas()` uma vez — o mesmo
//  contrato de `fiscal-data.ts`: se os dados ficarem inconsistentes, o
//  build falha em vez de servir um hub incompleto.
// ═══════════════════════════════════════════════════════════════════════

import { assertCatalogoFerramentas } from "./validar";

assertCatalogoFerramentas();

export * from "./tipos";
export { CATALOGO_FERRAMENTAS, PERCURSOS } from "./catalogo";
export * from "./selecionar";
export * from "./homepage";
export { validarCatalogoFerramentas, assertCatalogoFerramentas } from "./validar";
