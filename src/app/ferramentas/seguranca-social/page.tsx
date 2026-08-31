// ═══════════════════════════════════════════════════════════════════════
//  P0-03 — Uma ferramenta que existia, mas só dentro de um guia.
//
//  `CalculadoraSSTrimestral` é uma experiência interativa real. Vivia
//  apenas embutida em `/guias/seguranca-social`, ou seja: não aparecia no
//  hub, não entrava na contagem, não era filtrável, não era recomendável
//  como passo seguinte e não tinha URL para partilhar. Uma calculadora
//  escondida como conteúdo editorial é uma ferramenta que o produto tem e
//  não sabe que tem.
//
//  O guia continua a embutir a mesma calculadora — e passa a apontar para
//  cá. Um componente, dois sítios, nenhuma segunda implementação.
// ═══════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import Link from "next/link";
import ToolShell from "@/components/ferramentas/ToolShell";
import { porId } from "@/lib/ferramentas";
import { CalculadoraSSTrimestral } from "@/components/guias/CalculadoraSSTrimestral";
import InfoTip from "@/components/ui/InfoTip";
import { ArrowRight } from "@/components/ui/Icons";
import {
  generateFAQSchema, generateSoftwareApplicationSchema, generateHowToSchema,
} from "@/lib/seo";
import {
  SS_TAXA, SS_COEFICIENTE, SS_BASE_MAX_MENSAL, SS_MIN_MENSAL, IAS_VALUE,
} from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";

const TOOL = porId("seguranca-social")!;

export const metadata: Metadata = {
  title: "Calculadora Segurança Social trabalhador independente 2026 | Recibo Certo",
  description:
    "Quanto declarar e quanto pagar de Segurança Social por mês, como trabalhador independente: média do trimestre, coeficiente, ajuste de ±25%, mínimos e máximos, e o calendário de declaração e pagamento em 2026.",
  keywords: [
    "calculadora segurança social trabalhador independente",
    "declaração trimestral segurança social",
    "contribuição segurança social recibos verdes",
    "quanto pago segurança social 2026",
    "coeficiente segurança social",
  ],
  alternates: { canonical: `https://www.recibocerto.pt${TOOL.canonicalHref}` },
  openGraph: {
    title: "Calculadora de Segurança Social trimestral 2026 | Recibo Certo",
    description:
      "A declaração trimestral de quem passa recibos verdes: base de incidência, contribuição mensal e datas — com as regras oficiais de 2026.",
    url: `https://www.recibocerto.pt${TOOL.canonicalHref}`,
    siteName: "Recibo Certo",
    locale: "pt_PT",
    type: "article",
  },
};

const FAQS = [
  {
    q: "Como se calcula a contribuição trimestral?",
    a: `Soma-se a faturação dos três meses do trimestre e divide-se por três. A essa média aplica-se o coeficiente da atividade — ${pct(SS_COEFICIENTE.servicos.value)} para prestação de serviços e ${pct(SS_COEFICIENTE.bens.value)} para venda de bens, hotelaria e restauração — e sobre o resultado incide a taxa de ${pct(SS_TAXA.value)}. O valor obtido é a contribuição mensal dos três meses seguintes.`,
  },
  {
    q: "O que é o ajuste de ±25%?",
    a: "Na declaração trimestral podes ajustar a base de incidência até 25% para cima ou para baixo, em intervalos de 5%. Serve para aproximar a contribuição da realidade quando os teus rendimentos variam muito de trimestre para trimestre. A calculadora mostra o efeito do ajuste no valor a pagar.",
  },
  {
    q: "Há um valor mínimo a pagar?",
    a: `Sim. Mesmo com faturação baixa ou nula, quem está enquadrado paga uma contribuição mínima de ${fmt(SS_MIN_MENSAL.value)} por mês. Há também um limite superior: a base de incidência não pode exceder ${fmt(SS_BASE_MAX_MENSAL.value)} mensais, o equivalente a 12 vezes o IAS de ${fmt(IAS_VALUE)}.`,
  },
  {
    q: "Quando tenho de declarar e pagar?",
    a: "A declaração trimestral entrega-se em janeiro, abril, julho e outubro, até ao dia 31 do mês. O pagamento das contribuições faz-se até ao dia 20 do mês seguinte àquele a que dizem respeito. A calculadora mostra a próxima data aplicável.",
  },
  {
    q: "E no primeiro ano de atividade?",
    a: "Há isenção de contribuições nos primeiros 12 meses após a abertura de atividade. A contrapartida é não haver, nesse período, direito a prestações sociais como subsídio de doença, parentalidade ou desemprego.",
  },
];

export default function FerramentaSegurancaSocialPage() {
  const faqSchema = generateFAQSchema(FAQS);
  const appSchema = generateSoftwareApplicationSchema();
  const howToSchema = generateHowToSchema({
    name: "Como calcular a Segurança Social trimestral de um trabalhador independente",
    description:
      "Passos para saber quanto declarar e quanto pagar de Segurança Social em cada trimestre como trabalhador independente em Portugal.",
    url: TOOL.canonicalHref,
    totalTime: "PT2M",
    steps: [
      { name: "Indica a faturação dos três meses", text: "Introduz o valor faturado em cada um dos três meses do trimestre. A base é a média dos três, não o total." },
      { name: "Escolhe o tipo de atividade", text: "Prestação de serviços e venda de bens têm coeficientes diferentes, e isso muda a base de incidência." },
      { name: "Vê a contribuição mensal e trimestral", text: "O resultado mostra a base de incidência, a contribuição de cada mês e o total do trimestre, com os limites mínimo e máximo aplicados." },
      { name: "Confirma as datas", text: "A calculadora indica a próxima data de declaração trimestral e o prazo de pagamento correspondente." },
    ],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />

      <ToolShell
        tool={TOOL}
        subtitulo="A declaração trimestral de quem trabalha por conta própria: quanto declarar, quanto vais pagar por mês e até quando."
        contexto={
          <>
            <section className="mb-10">
              <h2 className="font-display mb-4 text-xl font-semibold text-stone-800 dark:text-stone-100">
                A fórmula, sem mistério
              </h2>
              <div className="rounded-4xl border border-brand bg-brand-light p-5 dark:bg-brand/10 sm:p-6">
                <p className="font-mono text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                  (Faturação do trimestre ÷ 3) × {pct(SS_COEFICIENTE.servicos.value)}
                  <InfoTip label="Coeficiente SS">{SS_COEFICIENTE.servicos.legalBasis}</InfoTip>
                  {" "}× {pct(SS_TAXA.value)}
                  <InfoTip label="Taxa SS">{SS_TAXA.legalBasis}</InfoTip>
                  {" "}= contribuição mensal
                </p>
                <p className="mt-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                  Para venda de bens, hotelaria e restauração o coeficiente é{" "}
                  {pct(SS_COEFICIENTE.bens.value)} em vez de {pct(SS_COEFICIENTE.servicos.value)}.
                  A contribuição nunca é inferior a {fmt(SS_MIN_MENSAL.value)} por mês, e a base de
                  incidência não passa de {fmt(SS_BASE_MAX_MENSAL.value)} mensais.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <div className="rounded-4xl border border-stone-100 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900/50 sm:p-6">
                <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                  A Segurança Social não sai do recibo. É por isso que apanha tanta gente de
                  surpresa: a retenção na fonte é visível no momento da emissão, a contribuição
                  chega um trimestre depois. Se estás a começar, vê primeiro quanto reservar de
                  cada recibo.
                </p>
                <Link
                  href="/ferramentas/recibos-verdes"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand transition-colors hover:text-brand/80"
                >
                  Simular o líquido dos recibos verdes <ArrowRight size={14} />
                </Link>
              </div>
            </section>

            <section>
              <h2 className="font-display mb-4 text-xl font-semibold text-stone-800 dark:text-stone-100">
                Perguntas frequentes
              </h2>
              <div className="space-y-3">
                {FAQS.map((f) => (
                  <details key={f.q} className="group rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-stone-800 dark:text-stone-100">
                      {f.q}
                      <ArrowRight size={16} className="flex-shrink-0 text-stone-400 transition-transform group-open:rotate-90" />
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </>
        }
      >
        <CalculadoraSSTrimestral />
      </ToolShell>
    </>
  );
}
