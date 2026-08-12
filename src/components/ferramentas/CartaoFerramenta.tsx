// ═══════════════════════════════════════════════════════════════════════
//  O cartão de uma ferramenta — §5.3
//  ---------------------------------------------------------------------
//  Responde, por esta ordem: que problema resolve, o que recebo, é para
//  mim, quanto custa e demora, está atualizado, o que faço.
//
//  DISCIPLINA DOS SINAIS (P1-03). Os badges antigos misturavam conceitos
//  incompatíveis na mesma fila: «O mais completo» é benefício, «Plus» é
//  acesso, «Mapa» é formato e «Simulador» é tipo. Quatro etiquetas com
//  quatro gramáticas diferentes não se leem — competem. Agora os campos
//  são distintos (`kind`, `access`, `status`, `highlight`) e o cartão
//  escolhe NO MÁXIMO DOIS.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { ArrowRight, Clock } from "@/components/ui/Icons";
import { ROTULO_KIND, ROTULO_STATUS, type ToolDefinition } from "@/lib/ferramentas";
import { iconeDe } from "./icon-map";

/**
 * Dois sinais, no máximo — e o primeiro é sempre o mais informativo que a
 * ferramenta tenha para dar: benefício > novidade > tipo.
 */
function sinais(f: ToolDefinition): Array<{ texto: string; tom: "brand" | "neutro" }> {
  const out: Array<{ texto: string; tom: "brand" | "neutro" }> = [];
  if (f.highlight) out.push({ texto: f.highlight, tom: "brand" });
  else if (f.status) out.push({ texto: ROTULO_STATUS[f.status], tom: "brand" });
  out.push({ texto: ROTULO_KIND[f.kind], tom: "neutro" });
  return out.slice(0, 2);
}

interface Props {
  ferramenta: ToolDefinition;
  /** O cartão maior de «Começa por aqui». */
  destaque?: boolean;
}

export default function CartaoFerramenta({ ferramenta: f, destaque = false }: Props) {
  const Icon = iconeDe(f.icon);
  const marcas = sinais(f);

  return (
    <Link
      href={f.canonicalHref}
      className={`group flex h-full flex-col rounded-4xl border bg-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:bg-stone-900 ${
        destaque
          ? "border-brand/25 p-6 sm:p-7"
          : "border-stone-100 p-5 dark:border-stone-800"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`flex flex-shrink-0 items-center justify-center rounded-2xl ${
            destaque ? "h-11 w-11 bg-brand text-white shadow-glow" : "h-9 w-9 bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand"
          }`}
        >
          <Icon size={destaque ? 19 : 17} />
        </span>
        {marcas.map((m) => (
          <span
            key={m.texto}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
              m.tom === "brand"
                ? "bg-brand-light text-brand-dark dark:bg-brand/10 dark:text-brand"
                : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
            }`}
          >
            {m.texto}
          </span>
        ))}
      </div>

      <h3
        className={`font-semibold text-stone-800 group-hover:text-brand dark:text-stone-100 ${
          destaque ? "font-display text-xl leading-tight sm:text-2xl" : "text-[15px]"
        }`}
      >
        {f.title}
      </h3>
      <p
        className={`mt-1.5 leading-relaxed text-stone-500 dark:text-stone-400 ${
          destaque ? "text-sm sm:text-[15px]" : "text-sm"
        }`}
      >
        {f.shortOutcome}
      </p>

      {/* Quanto custa e demora · está atualizado */}
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-400 dark:text-stone-500">
        <span className="inline-flex items-center gap-1">
          <Clock size={12} /> {f.estimatedMinutes} min
        </span>
        <span aria-hidden="true">·</span>
        <span>Grátis{f.access.account === "none" ? ", sem conta" : ""}</span>
        <span aria-hidden="true">·</span>
        <span>Regras de {f.fiscalYear}</span>
      </p>

      {/* CTA específico — «Calcular líquido», não «Abrir» */}
      <span
        className={`mt-4 inline-flex items-center gap-1.5 font-semibold text-brand ${
          destaque ? "text-sm" : "text-[13px]"
        }`}
      >
        {f.cta}
        <ArrowRight size={destaque ? 15 : 13} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
