import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { Section, Nota, Lista } from "@/components/LegalPage";
import { HISTORICO_GUIAS, ROTULO_ALTERACAO, type AlteracaoGuia } from "@/lib/guias/historico";
import { manifesto } from "@/lib/guias/manifests";
import { DATA_LAST_REVIEW } from "@/lib/fiscal-data";
import { generateBreadcrumbSchema } from "@/lib/seo";

// ─────────────────────────────────────────────────────────────────────
//  §10.3 — «/changelog-fiscal com histórico de correções».
//
//  O histórico já existia, guia a guia. O que não existia era um sítio
//  onde ele pudesse ser lido inteiro, por ordem de data — e é isso que o
//  torna uma prova em vez de uma nota de rodapé.
//
//  A escolha editorial que sustenta a página: as correções ficam. Uma
//  regra que descrevemos mal, uma fonte que citámos pela epígrafe errada,
//  um valor que mudou — tudo isso permanece visível com a data em que foi
//  corrigido. Apagar seria mais bonito e valeria menos: o §18.2 trata
//  «erro fiscal material» como risco crítico e a mitigação é «versionar,
//  revisor, correção e comunicação», não silêncio.
// ─────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Changelog fiscal — o que mudou e quando",
  description:
    "Registo público de todas as correções e atualizações fiscais do ReciboCerto: regras que mudaram, fontes corrigidas e conteúdo revisto, com data e razão. Nada é apagado.",
  keywords: [
    "alterações fiscais 2026 portugal",
    "correções calculadora fiscal",
    "changelog fiscal",
  ],
  alternates: { canonical: "/changelog-fiscal" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Changelog fiscal — ReciboCerto",
    description:
      "Todas as correções e atualizações fiscais, com data, razão e fonte. Registo público.",
    url: "https://www.recibocerto.pt/changelog-fiscal",
    type: "article",
  },
};

const TOC = [
  { id: "como-funciona", label: "Como funciona" },
  { id: "registo", label: "Registo" },
];

/** Agrupa por data, da mais recente para a mais antiga. */
function porData(entradas: readonly AlteracaoGuia[]): [string, AlteracaoGuia[]][] {
  const mapa = new Map<string, AlteracaoGuia[]>();
  for (const e of entradas) {
    if (!mapa.has(e.data)) mapa.set(e.data, []);
    mapa.get(e.data)!.push(e);
  }
  return [...mapa.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

const fmtData = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export default function ChangelogFiscalPage() {
  const breadcrumb = generateBreadcrumbSchema([
    { name: "Início", url: "/" },
    { name: "Changelog fiscal", url: "/changelog-fiscal" },
  ]);

  const grupos = porData(HISTORICO_GUIAS);
  const total = HISTORICO_GUIAS.length;
  const correcoes = HISTORICO_GUIAS.filter(
    (e) => e.tipo === "correcao_fonte" || e.tipo === "correcao_regra",
  ).length;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <LegalPage
        title="Changelog fiscal"
        subtitle="Tudo o que mudou nas regras que usamos, e tudo o que corrigimos quando estávamos errados. Com data, razão e fonte."
        lastUpdated={fmtData(grupos[0]?.[0] ?? DATA_LAST_REVIEW)}
        toc={TOC}
        eyebrow="Programa de autoridade"
        selo={`${total} entradas · ${correcoes} correções`}
        ctaTitulo="Detetaste uma regra desatualizada?"
        ctaTexto="Diz-nos qual e com que fonte. As correções fiscais passam à frente de tudo."
      >
        <Section id="como-funciona" title="Como funciona">
          <p>
            Uma entrada por alteração com efeito para quem lê. Correções de estilo,
            reformulações e ajustes visuais não entram aqui — entram no{" "}
            <Link href="/" className="font-semibold text-brand hover:underline">
              histórico de novidades do produto
            </Link>
            . Este registo é só para o que muda uma resposta.
          </p>
          <Lista
            items={[
              "Correção de fonte — a fonte estava errada, desatualizada ou não era oficial.",
              "Correção de conteúdo — a regra descrita estava errada ou era demasiado absoluta.",
              "Atualização anual — valores do novo ano fiscal.",
              "Conteúdo novo — secção que não existia.",
              "Reestruturação — o guia mudou de forma.",
            ]}
          />
          <Nota tipo="info">
            <strong>Nada é apagado.</strong> Quando corrigimos, o que estava errado
            continua descrito aqui, com a data em que deixou de estar. É a diferença entre
            «sempre atualizado» — uma promessa que ninguém pode verificar — e um registo
            que qualquer pessoa pode confrontar.
          </Nota>
        </Section>

        <Section id="registo" title="Registo">
          <div className="space-y-8">
            {grupos.map(([data, entradas]) => (
              <div key={data}>
                <div className="mb-3 flex items-center gap-3">
                  <time
                    dateTime={data}
                    className="font-display text-base font-bold text-stone-800 dark:text-stone-100"
                  >
                    {fmtData(data)}
                  </time>
                  <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
                  <span className="shrink-0 text-[11px] font-medium text-stone-400">
                    {entradas.length} {entradas.length === 1 ? "alteração" : "alterações"}
                  </span>
                </div>

                <ul className="space-y-3">
                  {entradas.map((e, i) => {
                    const guia = manifesto(e.guideId);
                    return (
                      <li
                        key={`${e.guideId}-${i}`}
                        className="rounded-2xl border border-stone-200 bg-white p-4 shadow-card dark:border-stone-700 dark:bg-stone-800/50"
                      >
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-brand-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-dark dark:bg-brand/15 dark:text-brand-mint">
                            {ROTULO_ALTERACAO[e.tipo]}
                          </span>
                          {guia ? (
                            <Link
                              href={`/guias/${guia.slug}`}
                              className="text-[12px] font-semibold text-stone-700 hover:text-brand dark:text-stone-200 dark:hover:text-brand-mint"
                            >
                              {guia.title}
                            </Link>
                          ) : (
                            <span className="text-[12px] font-semibold text-stone-500">
                              {e.guideId}
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">
                          {e.descricao}
                        </p>
                        {e.origem ? (
                          <p className="mt-1.5 text-[11px] text-stone-400">{e.origem}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      </LegalPage>
    </>
  );
}
