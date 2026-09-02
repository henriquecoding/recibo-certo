// ═══════════════════════════════════════════════════════════════════════
//  O CARTÃO DA QUARTA ETAPA — o mesmo nos três percursos
//  ---------------------------------------------------------------------
//  Server Component de propósito: entra nas leituras do preço, dos recibos
//  verdes e da empresa sem acrescentar um byte de JavaScript a nenhuma
//  delas. O que muda entre as três é a MOLDURA, e ela vem da tabela em
//  `lib/foco/arco-contratacao.ts` — não daqui, e muito menos de cada
//  página, que foi como os percursos divergiram da primeira vez.
//
//  Duas ações com pesos diferentes: calcular (a ferramenta) e perceber (a
//  leitura patronal). Nunca duas com o mesmo peso — dois botões iguais não
//  são uma escolha, são uma indecisão.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { ArrowRight, Briefcase } from "@/components/ui/Icons";
import {
  ENTRADA_CONTRATACAO,
  PASSO_CONTRATACAO,
  hrefPlaneador,
  type OrigemArcoContratacao,
} from "@/lib/foco/arco-contratacao";

export default function CartaoContratacao({ origem }: { origem: OrigemArcoContratacao }) {
  const entrada = ENTRADA_CONTRATACAO[origem];
  const tituloId = `passo-contratacao-${origem}`;

  return (
    <article
      aria-labelledby={tituloId}
      className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="flex items-start gap-3.5">
          <span className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-brand-light text-brand dark:bg-brand/15">
            <Briefcase size={18} />
          </span>
          <div className="min-w-0">
            <div className="texto-micro font-bold uppercase tracking-[.14em] text-stone-400">
              {entrada.sobrancelha}
            </div>
            <h3 id={tituloId} className="mt-1 font-display text-xl font-semibold text-ink">
              {entrada.titulo}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
              {entrada.texto}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:w-64 lg:flex-none lg:flex-col">
          <Link
            href={hrefPlaneador(origem)}
            className="focus-marca inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-2xl bg-brand px-4 py-2.5 text-xs font-semibold text-white no-underline shadow-glow transition-shadow hover:shadow-float"
          >
            {PASSO_CONTRATACAO.cta} <ArrowRight size={13} />
          </Link>
          <Link
            href={PASSO_CONTRATACAO.leitura}
            className="focus-marca inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 no-underline transition-colors hover:border-brand/40 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
          >
            {PASSO_CONTRATACAO.ctaLeitura} <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </article>
  );
}
