// ═══════════════════════════════════════════════════════════════════════
//  A FRONTEIRA DE DADOS DO DOSSIÊ
//  ---------------------------------------------------------------------
//  Este ficheiro é o `CAMPOS_PARTILHA` deste motor, e existe pela mesma
//  razão: **lista branca, nunca negra.** Com uma lista negra, cada campo
//  novo passa a seguir por omissão e o erro descobre-se depois de já ter
//  seguido. Aqui, um campo que ninguém autorizou fica de fora, e o pior
//  que acontece é faltar informação — que se vê e se corrige.
//
//  DESVIO CONSCIENTE face ao esboço do §4.5 do relatório: ali a entrada
//  `resumo` listava campos do CABEÇALHO do dossiê («titulo», «arquetipo»,
//  «categoria») ao lado de campos de item. Duas semânticas na mesma tabela
//  é o tipo de ambiguidade que se paga seis meses depois, quando alguém
//  acrescenta uma entrada com a semântica errada e nada o reprova. Aqui a
//  tabela tem UMA semântica — as chaves que um ITEM daquela secção pode
//  transportar — e o cabeçalho tem a sua própria lista,
//  `CAMPOS_DO_CABECALHO`. As duas são verificadas pelo mesmo teste.
// ═══════════════════════════════════════════════════════════════════════

import type { DossieDeGuia, IdSeccao, ItemDossie, SeccaoDossie } from "./tipos";

/**
 * Chaves estruturais: existem em todos os itens, de todas as secções, e
 * não são opcionais. `proveniencia` está aqui porque um item sem ela não
 * é um item — é uma afirmação órfã.
 */
export const CAMPOS_ESTRUTURAIS: readonly string[] = ["id", "texto", "proveniencia"];

/** As chaves que um item pode transportar, além das estruturais. */
export const CAMPOS_POR_SECCAO: Record<IdSeccao, readonly string[]> = {
  resumo: [],
  aplicabilidade: ["sentido", "resposta"],
  elementos: ["estado", "numero"],
  julgamento: ["peso"],
  prazos: ["quando"],
  numeros: ["ruleKey", "ano"],
  base_legal: ["fonte"],
  avisos: [],
  // Delega em `CAMPOS_PARTILHA[tipo]` — não duplica. A bagagem já nasce
  // filtrada por essa lista branca (ver `bagagem.ts`), e o que chega aqui
  // é uma linha de texto por campo que a lista branca deixou passar.
  simulacao: [],
  historico: ["data", "tipo"],
};

/** As chaves do cabeçalho `DossieDeGuia.guia`. Nem uma a mais. */
export const CAMPOS_DO_CABECALHO: readonly string[] = [
  "slug", "titulo", "arquetipo", "categoria", "hub", "area",
];

/**
 * As chaves de topo de um `DossieDeGuia`.
 *
 * É daqui que sai `CAMPOS_PARTILHA.dossie_guia` — uma lista branca, não
 * duas a divergir. `vinculo.ts` delega nesta em vez de a copiar: um campo
 * novo no dossiê que ninguém autorize aqui fica de fora da partilha, que é
 * exatamente o comportamento que se quer.
 */
export const CAMPOS_DO_DOSSIE: readonly string[] = [
  "versao", "guia", "fixado", "seccoes", "nota", "consentimento",
];

// ─── O que nunca entra num dossiê ──────────────────────────────────────

/**
 * As fronteiras deste motor, em código e testáveis — ao lado de
 * `NUNCA_COMUNICAR` em `routing.ts`, e pela mesma razão: uma fronteira que
 * só existe num documento é uma fronteira que se atravessa sem dar por
 * isso. `dossie:copy` lê esta lista e compara-a com a copy publicada.
 */
export const DOSSIE_NUNCA: readonly string[] = [
  "Gerar, resumir ou reescrever conteúdo de um Guia. O que segue é o que está publicado.",
  "Transportar NIF, nome, email, telefone, morada ou documentos.",
  "Dizer, ou deixar entender, que o dossiê é um parecer ou uma submissão.",
  "Dar a um contabilista acesso a dados fiscais que não foram enviados nesta passagem.",
  "Cobrar, condicionar ao Plus ou usar como isco de subscrição.",
  "Enviar a mesma passagem a mais contabilistas do que o teto da plataforma.",
  "Manter acesso depois de revogado, expirado ou com o vínculo terminado.",
  "Deixar um item chegar ao ecrã sem proveniência.",
];

/**
 * Os padrões de identificação pessoal que nunca podem aparecer no texto de
 * um item.
 *
 * A identificação vive em `casos` e em `caso_contactos`, onde já tem
 * regime próprio e onde a pessoa a liga e desliga. Um dossiê é sobre o
 * ASSUNTO, não sobre a PESSOA — e essa separação só é real se for
 * verificada.
 */
export const PADROES_PII: { nome: string; padrao: RegExp }[] = [
  { nome: "email", padrao: /[\w.+-]+@[\w-]+\.[\w.]{2,}/ },
  { nome: "IBAN", padrao: /\bPT50[\s-]?(?:\d[\s-]?){21}\b/i },
  // Nove dígitos seguidos, sem separador de milhares: é a forma de um NIF,
  // de um NISS truncado e de um telemóvel português. Nenhum número fiscal
  // publicado num guia tem esta forma — os valores em euros levam sempre
  // separador ou casas decimais.
  { nome: "NIF ou telefone", padrao: /(?<!\d)\d{9}(?!\d)/ },
];

export interface AchadoDeFronteira {
  seccao: IdSeccao;
  itemId: string;
  problema: string;
}

/** Os padrões de PII encontrados num texto. Vazio quando está limpo. */
export function detetarPII(texto: string): string[] {
  return PADROES_PII.filter(({ padrao }) => padrao.test(texto)).map(({ nome }) => nome);
}

/**
 * Deixa passar só as chaves autorizadas para a secção, e nada mais.
 *
 * Os valores são copiados por JSON, como em `sanitizarConteudoPartilha()`:
 * um objeto com getters, protótipos ou referências circulares não
 * atravessa a fronteira. O que chega ao contabilista é sempre inerte.
 */
export function sanitizarItem(seccao: IdSeccao, item: ItemDossie): ItemDossie {
  const permitidas = new Set([...CAMPOS_ESTRUTURAIS, ...CAMPOS_POR_SECCAO[seccao]]);
  const saida: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(item)) {
    if (!permitidas.has(chave) || valor === undefined) continue;
    saida[chave] = JSON.parse(JSON.stringify(valor)) as unknown;
  }
  return saida as unknown as ItemDossie;
}

export function sanitizarSeccao(seccao: SeccaoDossie): SeccaoDossie {
  return { ...seccao, itens: seccao.itens.map((i) => sanitizarItem(seccao.id, i)) };
}

/**
 * Tudo o que está errado num dossiê composto, de uma vez.
 *
 * Devolve a lista em vez de lançar à primeira: quem corre isto num teste
 * sobre 169 guias quer ver os 169 problemas, não o primeiro.
 */
export function auditarFronteira(dossie: DossieDeGuia): AchadoDeFronteira[] {
  const achados: AchadoDeFronteira[] = [];

  for (const chave of Object.keys(dossie.guia)) {
    if (!CAMPOS_DO_CABECALHO.includes(chave)) {
      achados.push({ seccao: "resumo", itemId: "guia", problema: `Campo "${chave}" fora da lista branca do cabeçalho.` });
    }
  }

  for (const seccao of dossie.seccoes) {
    const permitidas = new Set([...CAMPOS_ESTRUTURAIS, ...CAMPOS_POR_SECCAO[seccao.id]]);
    for (const item of seccao.itens) {
      if (!item.proveniencia) {
        achados.push({ seccao: seccao.id, itemId: item.id, problema: "Item sem proveniência." });
      }
      for (const chave of Object.keys(item)) {
        if (!permitidas.has(chave)) {
          achados.push({ seccao: seccao.id, itemId: item.id, problema: `Campo "${chave}" fora da lista branca de "${seccao.id}".` });
        }
      }
      const pii = detetarPII(item.texto);
      if (pii.length > 0) {
        achados.push({ seccao: seccao.id, itemId: item.id, problema: `Texto com ${pii.join(", ")}.` });
      }
    }
  }

  if (dossie.nota) {
    const pii = detetarPII(dossie.nota);
    if (pii.length > 0) {
      achados.push({ seccao: "resumo", itemId: "nota", problema: `Nota com ${pii.join(", ")}.` });
    }
  }

  return achados;
}

/** A mesma auditoria, a lançar. Para os caminhos de escrita. */
export function assertDentroDaFronteira(dossie: DossieDeGuia): void {
  const achados = auditarFronteira(dossie);
  if (achados.length === 0) return;
  throw new Error(
    `Dossiê fora da fronteira de dados:\n  · ${achados
      .map((a) => `${a.seccao}/${a.itemId}: ${a.problema}`)
      .join("\n  · ")}`,
  );
}
