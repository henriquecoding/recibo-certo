// ═══════════════════════════════════════════════════════════════════════
//  DATAS DE REVISÃO REAIS — a data material de cada recurso
//  ---------------------------------------------------------------------
//  §3.4 da auditoria, lacuna «Datas de sitemap»:
//
//    Evidência: «O padrão de lastModified na geração aparenta usar a data
//               do build.»
//    Impacto:   «Motores não distinguem revisão real de deploy.»
//    Ação:      «Guardar publishedAt/reviewedAt por recurso e usar a data
//               material.»
//
//  Era exatamente isso que acontecia: `sitemap.ts` fazia `new Date()` e
//  todas as 200 e tal URLs anunciavam ter mudado no instante do build. Um
//  motor de busca que veja o site inteiro a mudar a cada deploy aprende
//  depressa a ignorar o sinal — e depois já não distingue o deploy de
//  sexta-feira da revisão que aconteceu mesmo, quando um escalão de IRS
//  muda. É o pior dos dois mundos: rastreio desperdiçado no que não mudou
//  e lentidão a apanhar o que mudou.
//
//  A data material de cada tipo de recurso:
//
//   · Guia        → `lastReviewedAt` do manifesto. Já existia; faltava
//                   chegar ao sitemap.
//   · Ferramenta  → `DATA_LAST_REVIEW` dos parâmetros fiscais. O que muda
//                   num simulador é o que ele calcula, e isso tem data.
//   · Legal       → a data que a própria página mostra ao leitor. Se a
//                   página diz «Junho de 2026», o sitemap não pode dizer
//                   outra coisa.
//   · Índices     → a revisão mais recente do que listam. Um hub muda
//                   quando muda o seu conteúdo.
// ═══════════════════════════════════════════════════════════════════════

import { DATA_LAST_REVIEW } from "@/lib/fiscal-data";
import { GUIDE_MANIFESTS, manifesto } from "@/lib/guias/manifests";

/**
 * Páginas cuja data de revisão não deriva de outra coisa. Mantidas à mão
 * porque são poucas e porque inventar-lhes uma data automática seria
 * precisamente o problema que este ficheiro resolve.
 *
 * Ao alterar materialmente uma destas páginas, atualizar aqui a data — e,
 * nas legais, atualizar também o `lastUpdated` que o leitor vê. As duas
 * têm de dizer o mesmo; `seo:audit` verifica que existem.
 */
export const REVISOES_MANUAIS: Record<string, string> = {
  "/": DATA_LAST_REVIEW,
  "/precos": "2026-07-26",
  "/investidores": "2026-07-26",
  "/quiz-fiscal": "2026-07-26",
  // As três legais anunciam a data ao leitor no topo da página.
  "/privacidade": "2026-06-01",
  "/termos": "2026-01-01",
  "/cookies": "2026-01-01",
  // Páginas de autoridade (§10.3). A metodologia e o estado dos dados
  // seguem a revisão fiscal porque é isso que descrevem.
  "/metodologia": DATA_LAST_REVIEW,
  "/estado-dos-dados": DATA_LAST_REVIEW,
  "/changelog-fiscal": DATA_LAST_REVIEW,
};

const maisRecente = (datas: readonly string[]): string =>
  datas.reduce((a, b) => (a > b ? a : b), "1970-01-01");

/** A revisão mais recente entre todos os guias publicados. */
export function revisaoDosGuias(): string {
  return maisRecente(
    GUIDE_MANIFESTS.filter((m) => m.status !== "archived").map((m) => m.lastReviewedAt),
  );
}

/**
 * A data material de uma rota pública, em ISO (YYYY-MM-DD).
 *
 * Devolve `null` quando não há data conhecida, e quem chama decide — o
 * sitemap prefere omitir `lastmod` a inventá-lo. Um `lastmod` errado é
 * pior do que nenhum: nenhum deixa o motor decidir, errado ensina-o a
 * desconfiar.
 */
export function revisaoDaRota(path: string): string | null {
  const manual = REVISOES_MANUAIS[path];
  if (manual) return manual;

  if (path === "/guias") return revisaoDosGuias();
  if (path.startsWith("/guias/")) {
    const slug = path.slice("/guias/".length);
    return manifesto(slug)?.lastReviewedAt ?? null;
  }

  // O que uma ferramenta calcula vem dos parâmetros fiscais; é a revisão
  // desses parâmetros que muda materialmente a página.
  if (path === "/ferramentas" || path.startsWith("/ferramentas/")) return DATA_LAST_REVIEW;

  // As categorias do quiz mudam quando o banco de perguntas muda, e este
  // acompanha as regras fiscais.
  if (path.startsWith("/quiz-fiscal/")) return DATA_LAST_REVIEW;

  return null;
}

/** Converte a data ISO numa `Date` à meia-noite UTC, para o sitemap. */
export function comoData(iso: string | null): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
