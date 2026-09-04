// ═══════════════════════════════════════════════════════════════════════
//  API pública do motor de dossiê — o que atravessa a fronteira
//  ---------------------------------------------------------------------
//  ⚠️ `projecao.servidor.ts` NÃO é reexportado daqui, e é a única razão
//  pela qual este ficheiro existe. Um barril que exportasse tudo tornava
//  trivial um componente de cliente escrever
//  `import { projetarGuia } from "@/lib/guias/dossie"` e arrastar o
//  catálogo inteiro — e o erro só apareceria no tamanho do bundle, que
//  ninguém lê. Quem precisa da projeção importa-a pelo caminho completo,
//  do servidor, e o marcador `server-only` faz o build falhar se não for
//  do servidor.
// ═══════════════════════════════════════════════════════════════════════

export * from "./tipos";
export * from "./area";
export * from "./perguntas";
export * from "./fronteira";
export * from "./impressao";
export * from "./compor";
export * from "./pedido";
export { paraMarkdown, paraTexto } from "./formatos/markdown";
export { paraCsv } from "./formatos/csv";
export { prazosParaIcs } from "./formatos/ics";
export { paraJson, FORMATO_JSON, VERSAO_JSON, type EnvelopeJson } from "./formatos/json";
export { data as dataCurta, referencia, rodape, itensSelecionados, seccoesSelecionadas } from "./formatos/comum";
