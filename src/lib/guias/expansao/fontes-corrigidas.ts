// ═══════════════════════════════════════════════════════════════════════
//  CORREÇÕES AOS URL DAS FONTES DO PACOTE
//  ---------------------------------------------------------------------
//  As 17 fontes do Código do IVA que o pacote entregou apontam todas para
//  `/codigos_tributarios/civa/Pages/`. Essa coleção existe, responde 200 e
//  serve a redação HISTÓRICA — não a que está em vigor.
//
//  A prova é o art. 53.º. Em `/civa/` lê-se «não tenham atingido, no ano
//  civil anterior, um volume de negócios superior a 10 000 €», na redação
//  da Lei n.º 33/2006. O limiar em vigor são 15 000 €, e a epígrafe do
//  artigo mudou com o Decreto-Lei n.º 35/2025. Um leitor que clicasse na
//  fonte para confirmar o número encontrava lá outro — que é pior do que
//  não ter fonte nenhuma.
//
//  O mesmo padrão do `/circ_rep/` apanhado na primeira leva: um caminho
//  plausível, um 200, e uma redação de há vinte anos. Por isso a asserção
//  ganhou uma regra irmã, em `legal-sources.ts`, que faz o build falhar se
//  alguma fonte voltar a apontar para `/civa/Pages/`.
//
//  Verificadas uma a uma por HTTP a 07/08/2026: as 17 abrem em
//  `/civa_rep/`, com as epígrafes em vigor. Exceção: o art. 53.º, cuja
//  página foi renomeada pela AT quando o Decreto-Lei n.º 35/2025 o
//  reescreveu, e que já vivia em `legal-sources.ts` com o caminho certo.
//
//  Duas listas, porque há dois casos:
//
//    · `URL_CORRIGIDO` — a fonte do pacote é a única para aquele artigo.
//      Corrige-se o caminho e mantém-se a chave do pacote.
//    · `ALIAS_DE_FONTE` — o artigo JÁ tinha fonte em `legal-sources.ts`,
//      com o caminho certo. Corrigir o URL do pacote criava duas chaves
//      para a mesma página; a chave do pacote passa a apontar para a
//      entrada existente, e continua a resolver para quem a cite.
// ═══════════════════════════════════════════════════════════════════════

/** Chave do pacote → URL correto. A chave e o rótulo mantêm-se. */
export const URL_CORRIGIDO: Record<string, string> = Object.fromEntries(
  ["iva1", "iva27", "iva29", "iva30", "iva32", "iva41", "iva44", "iva54", "iva55", "iva58", "iva78"].map(
    (slug) => [
      `CIVA-${slug.replace("iva", "")}`,
      `https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/${slug}.aspx`,
    ],
  ),
);

/** Chave do pacote → chave já existente em `legal-sources.ts`. */
export const ALIAS_DE_FONTE: Record<string, string> = {
  "CIVA-6": "civa6",
  "CIVA-9": "civa9",
  "CIVA-18": "civa18",
  "CIVA-33": "civa33",
  "CIVA-36": "civa36",
  // O único cuja página mudou de nome: `artigo-53-o-do-civa`, não `iva53`
  // (que devolve 404 em `/civa_rep/`). A entrada existente já o sabe.
  "CIVA-53": "civa53",
};

/** As chaves que são alias — o catálogo não as conta como URL duplicado. */
export const CHAVES_ALIAS: ReadonlySet<string> = new Set(Object.keys(ALIAS_DE_FONTE));
