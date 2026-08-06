// ═══════════════════════════════════════════════════════════════════════
//  QUE GUIAS DA EXPANSÃO JÁ TÊM CORPO REDIGIDO
//  ---------------------------------------------------------------------
//  Uma lista, e não uma marca dentro de cada guia, porque é a lista que se
//  lê de uma vez: sabe-se sempre quantos dos 112 estão escritos sem ter de
//  percorrer o catálogo.
//
//  Um slug só entra aqui quando TODOS os H2 de `estruturaH2` estiverem
//  escritos no componente de corpo correspondente. Entrar aqui muda três
//  coisas de uma vez — o guia passa a aparecer no índice, entra no sitemap
//  e deixa de ser `noindex` — por isso é uma decisão editorial explícita,
//  não um efeito secundário de criar um ficheiro.
//
//  `guias:expansao` verifica as duas direções: nenhum slug listado aqui
//  sem componente de corpo, e nenhum componente de corpo com secções a
//  menos face ao plano do pacote.
//
//  Vive num módulo próprio (e leve) porque os manifestos precisam dele
//  para decidir o estado editorial, e os manifestos chegam ao cliente.
// ═══════════════════════════════════════════════════════════════════════

export const CORPOS_REDIGIDOS: ReadonlySet<string> = new Set([
  // ── Casa e património ───────────────────────────────────────────────
  //    Escritos contra o articulado, artigo a artigo, com o texto oficial
  //    aberto ao lado — não a partir das epígrafes. Foi assim que se
  //    apanhou o prazo errado do art. 120.º e se confirmou que os limiares
  //    da isenção jovem do IMT estão certos (ver `correcoes.ts`).
  "imi",
  "imt",
  "aimi",
  "vpt-reavaliacao",
]);
