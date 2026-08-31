import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { ChevronRight } from "@/components/ui/Icons";
import { construirDocumentos, contagens } from "@/lib/busca/documentos";
import { INTENCOES, ROTULO_TIPO, type FiltroIntencao } from "@/lib/busca/esquema";
import { agruparPorTipo, melhorResposta, pesquisar } from "@/lib/busca/pontuar";
import { SITE_URL } from "@/lib/seo";
import { FormularioPagina } from "./FormularioPagina";

// ═══════════════════════════════════════════════════════════════════════
//  A PÁGINA DE RESULTADOS — o destino previsível do Enter
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE UMA PESQUISA PRECISA DE UM URL (P0-03 / H-08)                 │
//  │                                                                     │
//  │ O Enter no campo abria «o primeiro resultado» — sem dizer qual era,  │
//  │ sem o destacar e com a regra escrita em letra pequena no rodapé.     │
//  │ Quem escrevesse depressa aterrava numa página que não escolheu.      │
//  │                                                                     │
//  │ Aqui o Enter tem destino: uma página com endereço, que se partilha,  │
//  │ se guarda nos favoritos, se abre noutro separador e aparece no       │
//  │ histórico. E — porque é renderizada no SERVIDOR a partir dos         │
//  │ manifestos — funciona sem uma linha de JavaScript, o que faz dela o  │
//  │ fallback honesto do painel do cabeçalho quando o índice não carrega. │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  Aqui NÃO há tecto de oito resultados: o tecto existe para o painel do
//  cabeçalho não se transformar numa lista infinita sobre a página. Esta
//  página é o sítio onde a lista completa é o que se quer.
// ═══════════════════════════════════════════════════════════════════════

export const metadata: Metadata = {
  title: "Pesquisar no Recibo Certo — ferramentas, guias e atividades",
  description:
    "Procura em todos os simuladores, guias fiscais e atividades do Art. 151.º do Recibo Certo. Resultados por intenção: simular, compreender ou cumprir.",
  alternates: { canonical: `${SITE_URL}/pesquisar` },
  // Uma página de resultados não é conteúdo: é uma vista sobre conteúdo que
  // já está indexado nas suas próprias páginas. Indexá-la produziria
  // milhares de URLs quase iguais a competir com os guias verdadeiros.
  robots: { index: false, follow: true },
};

function normalizarIntencao(valor: string | undefined): FiltroIntencao {
  return INTENCOES.some((i) => i.id === valor) ? (valor as FiltroIntencao) : "tudo";
}

export default async function PesquisarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; i?: string }>;
}) {
  const params = await searchParams;
  const consulta = (params.q ?? "").slice(0, 120);
  const intencao = normalizarIntencao(params.i);

  const documentos = construirDocumentos();
  const resultados = pesquisar(consulta, documentos, { intencao });

  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ AGRUPAR POR TIPO ENTERRAVA A MELHOR RESPOSTA                         │
   * │                                                                     │
   * │ Os grupos aparecem por ordem de utilidade — ferramentas, guias,      │
   * │ atividades — e essa ordem é boa para percorrer uma lista. Mas é      │
   * │ cega ao ranking: numa consulta como «iva», o guia certo estava em    │
   * │ primeiro lugar E aparecia depois de uma calculadora que só o         │
   * │ mencionava na descrição, porque as ferramentas vêm antes dos guias.  │
   * │                                                                     │
   * │ A melhor resposta sai do grupo e vai para cima, sozinha — e só       │
   * │ quando ganha por margem clara (ver `melhorResposta`). Coroar sempre  │
   * │ o primeiro seria anunciar uma certeza que muitas vezes não existe.   │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  const destaque = melhorResposta(resultados);
  const grupos = agruparPorTipo(destaque ? resultados.filter((r) => r !== destaque) : resultados);
  const totais = contagens();

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-cream dark:bg-stone-950">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <nav aria-label="Localização" className="mb-6 flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
            <Link href="/" className="transition-colors hover:text-brand-dark dark:hover:text-stone-300">
              Início
            </Link>
            <ChevronRight size={12} />
            <span className="text-stone-600 dark:text-stone-300">Pesquisar</span>
          </nav>

          <h1 className="font-display display-2 mb-3 text-balance font-semibold text-ink">
            {consulta.trim() ? <>Resultados para «{consulta.trim()}»</> : <>Pesquisar no Recibo Certo</>}
          </h1>
          <p className="mb-6 text-stone-600 dark:text-stone-400">
            {totais.total} destinos indexados: {totais.ferramentas} ferramentas, {totais.guias} guias e{" "}
            {totais.atividades} atividades do catálogo fiscal.
          </p>

          {/* O formulário é cliente só por causa do foco e do estado do
              campo; o `action` continua a funcionar sem JavaScript. */}
          <FormularioPagina consulta={consulta} intencao={intencao} />

          <nav aria-label="Filtrar por intenção" className="mb-8 flex flex-wrap items-center gap-1.5">
            {INTENCOES.map((i) => {
              const on = i.id === intencao;
              const params = new URLSearchParams();
              if (consulta.trim()) params.set("q", consulta.trim());
              if (i.id !== "tudo") params.set("i", i.id);
              const cauda = params.toString();
              return (
                <Link
                  key={i.id}
                  href={cauda ? `/pesquisar?${cauda}` : "/pesquisar"}
                  aria-current={on ? "true" : undefined}
                  title={i.sub}
                  className={`focus-marca min-h-9 rounded-lg border px-3 py-1.5 text-xs font-semibold no-underline transition-colors ${
                    on
                      ? "border-brand/40 bg-brand-light text-brand-dark dark:border-brand/40 dark:bg-brand/15 dark:text-brand"
                      : "border-stone-200 bg-white text-stone-600 hover:border-brand/40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
                  }`}
                >
                  {i.label}
                </Link>
              );
            })}
          </nav>

          <p role="status" aria-live="polite" className="sr-only">
            {consulta.trim() ? `${resultados.length} resultados.` : ""}
          </p>

          {!consulta.trim() && (
            <p className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
              Escreve o que precisas de resolver — por exemplo «quanto vou receber», «tenho de cobrar IVA» ou o nome
              da tua profissão. Ou abre o{" "}
              <Link href="/guias" className="font-semibold text-brand-dark underline dark:text-brand">
                índice de guias
              </Link>{" "}
              e as{" "}
              <Link href="/ferramentas" className="font-semibold text-brand-dark underline dark:text-brand">
                ferramentas
              </Link>
              .
            </p>
          )}

          {consulta.trim() && resultados.length === 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                Sem resultados para «{consulta.trim()}».
              </p>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                Experimenta menos palavras. Se procuravas uma profissão, o catálogo do Art. 151.º está no{" "}
                <Link
                  href="/ferramentas/classificar-atividade"
                  className="font-semibold text-brand-dark underline dark:text-brand"
                >
                  classificador de atividade
                </Link>
                .
              </p>
            </div>
          )}

          <div className="space-y-8">
            {destaque && (
              <section aria-labelledby="grupo-destaque">
                <h2
                  id="grupo-destaque"
                  className="mb-2 text-[11px] font-bold uppercase tracking-widest text-brand-dark dark:text-brand"
                >
                  Melhor resposta
                </h2>
                <Link
                  href={destaque.doc.href}
                  className="focus-marca flex min-h-[64px] items-center gap-3 rounded-2xl border border-brand/25 bg-brand-light/40 px-4 py-3.5 no-underline transition-colors hover:border-brand/50 dark:border-brand/30 dark:bg-brand/10"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-stone-900 dark:text-stone-50">
                      {destaque.doc.titulo}
                    </span>
                    <span className="block text-sm text-stone-600 dark:text-stone-400">{destaque.doc.descricao}</span>
                  </span>
                  <span className="hidden flex-shrink-0 rounded-md border border-brand/30 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-dark sm:inline dark:bg-stone-900 dark:text-brand">
                    {ROTULO_TIPO[destaque.doc.tipo]}
                  </span>
                </Link>
              </section>
            )}

            {grupos.map(([tipo, lista]) => (
              <section key={tipo} aria-labelledby={`grupo-${tipo}`}>
                <h2
                  id={`grupo-${tipo}`}
                  className="mb-2 text-[11px] font-bold uppercase tracking-widest text-stone-600 dark:text-stone-400"
                >
                  {ROTULO_TIPO[tipo]} · {lista.length}
                </h2>
                <ul className="space-y-1.5">
                  {lista.map(({ doc }) => (
                    <li key={doc.id}>
                      <Link
                        href={doc.href}
                        className="focus-marca flex min-h-[56px] items-center gap-3 rounded-2xl border border-stone-100 bg-white px-4 py-3 no-underline transition-colors hover:border-brand/40 dark:border-stone-800 dark:bg-stone-900"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">
                            {doc.titulo}
                          </span>
                          <span className="block truncate text-xs text-stone-600 dark:text-stone-400">
                            {doc.descricao}
                          </span>
                        </span>
                        {/* O contexto que ajuda a escolher entre dois
                            resultados parecidos: onde vive e a que ano se
                            aplica. Só a partir de `sm` — em 360 px a linha
                            já tem título e descrição a competir. */}
                        <span className="hidden flex-shrink-0 items-center gap-1.5 sm:flex">
                          <span className="rounded-md border border-stone-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600 dark:border-stone-700 dark:text-stone-400">
                            {doc.grupo}
                          </span>
                          {doc.anoFiscal && (
                            <span className="text-[10px] font-semibold tabular-nums text-stone-600 dark:text-stone-400">
                              {doc.anoFiscal}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
