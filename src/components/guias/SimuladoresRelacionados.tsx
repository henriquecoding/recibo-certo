import Link from "next/link";
import { ArrowRight } from "@/components/ui/Icons";
import { manifesto, TOOL_HREFS, type ToolId } from "@/lib/guias/manifests";
import { FERRAMENTAS } from "@/lib/ferramentas-config";

// ─────────────────────────────────────────────────────────────────────────
//  Ferramentas relacionadas — agora CONTEXTUAIS.
//
//  Falha 4.4 da auditoria: o componente recebia o `slug` e não o usava, pelo
//  que os 29 Guias encaminhavam todos para os mesmos dois destinos. Quem lê
//  "Subsídios de férias" não tem a mesma intenção de quem lê "IVA".
//
//  Os destinos passam a vir de `relatedToolIds` no manifesto do Guia.
// ─────────────────────────────────────────────────────────────────────────

interface Destino {
  titulo: string;
  descricao: string;
  href: string;
}

// Rotas que não constam de FERRAMENTAS (hub, comparador e quiz).
const EXTRA: Partial<Record<ToolId, Destino>> = {
  calculadora: {
    titulo: "Simuladores",
    descricao: "Recibos verdes, vencimento e empresa — o teu líquido real com as taxas oficiais.",
    href: TOOL_HREFS.calculadora,
  },
  comparador: {
    titulo: "Comparador de enquadramentos",
    descricao: "Recibos verdes, contrato ou empresa: o líquido de cada um para o mesmo rendimento.",
    href: TOOL_HREFS.comparador,
  },
  "quiz-fiscal": {
    titulo: "Quiz Fiscal",
    descricao: "Testa o que percebeste, com base legal em cada resposta.",
    href: TOOL_HREFS["quiz-fiscal"],
  },
};

function resolver(id: ToolId): Destino | null {
  const extra = EXTRA[id];
  if (extra) return extra;
  const f = FERRAMENTAS.find((x) => x.slug === id);
  if (!f) return null;
  return { titulo: f.titulo, descricao: f.descricao, href: f.href };
}

export default function SimuladoresRelacionados({ slug }: { slug: string }) {
  const m = manifesto(slug);
  if (!m) return null;

  const destinos = m.relatedToolIds.map(resolver).filter((d): d is Destino => d !== null);
  if (destinos.length === 0) return null;

  return (
    <section
      aria-labelledby={`ferramentas-${slug}`}
      className="mt-10 rounded-4xl border border-brand/20 bg-gradient-to-br from-brand-light/60 to-cream p-5 shadow-card dark:border-brand/15 dark:from-brand/10 dark:to-stone-900 sm:p-6"
    >
      <span className="eyebrow text-brand">Aplica ao teu caso</span>
      <h2 id={`ferramentas-${slug}`} className="mt-1 font-display text-xl font-semibold text-ink">
        Faz as contas à tua situação
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        Estas são as ferramentas que continuam este guia. Gratuitas, com as taxas oficiais e a
        memória de cálculo passo a passo.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {destinos.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="group flex min-h-[44px] items-start gap-3 rounded-2xl border border-stone-200/80 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift dark:border-stone-700 dark:bg-stone-900"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{d.titulo}</p>
                <ArrowRight
                  size={15}
                  className="flex-shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand"
                />
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                {d.descricao}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
