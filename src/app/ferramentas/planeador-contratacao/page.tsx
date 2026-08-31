import type { Metadata } from "next";
import ToolShell from "@/components/ferramentas/ToolShell";
import { porId } from "@/lib/ferramentas";
import PlaneadorContratacaoLazy from "./lazy";

const TOOL = porId("planeador-contratacao")!;

export const metadata: Metadata = {
  title: "Quanto custa contratar em Portugal — planeador 2026",
  description: "Do orçamento ao salário, custo patronal, líquido provável, calendário do primeiro ano e capacidade necessária. Grátis e sem conta.",
  keywords: [
    "quanto custa contratar funcionário Portugal",
    "simulador custo empregador 2026",
    "custo total trabalhador empresa",
    "salário que cabe no orçamento",
    "TSU patronal 2026",
  ],
  alternates: { canonical: `https://www.recibocerto.pt${TOOL.canonicalHref}` },
  openGraph: {
    title: "Planeador de contratação 2026 | Recibo Certo",
    description: "Custo, pacote, líquido e capacidade do posto — separados e explicados antes de fazer a proposta.",
    url: `https://www.recibocerto.pt${TOOL.canonicalHref}`,
    siteName: "Recibo Certo",
    locale: "pt_PT",
    type: "website",
  },
};

export default function PlaneadorContratacaoPage() {
  return (
    <ToolShell
      tool={TOOL}
      subtitulo="Parte do orçamento, do líquido pretendido ou de uma proposta já conhecida. Vê custo patronal, pacote, encargos públicos, calendário e capacidade — sem pedir conta nem guardar nada ao simular."
      contexto={
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            ["Custo não é salário", "A empresa vê remuneração, TSU patronal e custos do posto em parcelas separadas."],
            ["Desconhecido não é zero", "Um custo obrigatório por preencher impede a conclusão em vez de entrar no total como se fosse zero."],
            ["Apoio não é desconto", "Medidas do IEFP são apenas triadas e nunca abatidas automaticamente ao custo."],
          ].map(([title, text]) => (
            <article key={title} className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
              <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{text}</p>
            </article>
          ))}
        </section>
      }
    >
      <PlaneadorContratacaoLazy hoje={new Date().toISOString().slice(0, 10)} />
    </ToolShell>
  );
}
