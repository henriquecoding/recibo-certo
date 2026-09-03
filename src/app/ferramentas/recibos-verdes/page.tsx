// ═══════════════════════════════════════════════════════════════════════
//  P0-01 — A ferramenta central do produto passa a ter landing pública.
//
//  Era a maior falha de completude do hub: a metadata da página dizia que
//  servia trabalhadores independentes, mas não oferecia a calculadora
//  principal de IRS, Segurança Social e IVA dos recibos verdes. A pessoa
//  encontrava o wizard do Merchant of Record antes de encontrar o núcleo
//  do Recibo Certo. Existia na homepage (`/?modo=independente`) e no painel
//  — nenhum dos dois é uma URL canónica de ferramenta.
//
//  O componente é o mesmo do painel (`SimuladorIntegrado vista="rv"`): uma
//  landing nova não é uma segunda implementação.
// ═══════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import Link from "next/link";
import ToolShell from "@/components/ferramentas/ToolShell";
import { porId } from "@/lib/ferramentas";
import {
  generateFAQSchema, generateSoftwareApplicationSchema, generateHowToSchema,
} from "@/lib/seo";
import { ArrowRight } from "@/components/ui/Icons";
import SimuladorRecibosVerdesLazy from "./lazy";
import { jsonLd } from "@/lib/jsonld";

const TOOL = porId("recibos-verdes")!;

export const metadata: Metadata = {
  title: "Calculadora de recibos verdes 2026 — quanto recebes mesmo",
  description:
    "Do valor faturado ao líquido real: IRS, retenção na fonte, Segurança Social e IVA dos recibos verdes em 2026. Descobre quanto reservar para impostos e quanto fica mesmo para ti. Grátis e sem conta.",
  keywords: [
    "calculadora recibos verdes 2026",
    "quanto recebo recibos verdes",
    "simulador trabalhador independente",
    "líquido recibos verdes",
    "IRS e segurança social recibos verdes",
    "quanto guardar para impostos",
  ],
  alternates: { canonical: `https://www.recibocerto.pt${TOOL.canonicalHref}` },
  openGraph: {
    title: "Calculadora de recibos verdes 2026 — quanto fica mesmo para ti | Recibo Certo",
    description:
      "IRS, Segurança Social e IVA em camadas separadas, com o que reservar e o que sobra para a conta. Regras oficiais de 2026.",
    url: `https://www.recibocerto.pt${TOOL.canonicalHref}`,
    siteName: "Recibo Certo",
    locale: "pt_PT",
    type: "article",
  },
};

const FAQS = [
  {
    q: "Quanto devo guardar de cada recibo verde?",
    a: "Depende da tua atividade, do regime de IVA e de já teres ou não retenção na fonte. Em regime simplificado com coeficiente de 0,75, uma reserva prudente costuma ficar entre 25% e 35% do valor faturado para IRS e Segurança Social somados. O simulador calcula o teu caso concreto em vez de aplicar uma regra geral.",
  },
  {
    q: "A retenção na fonte já paga o meu IRS?",
    a: "Não. A retenção é um adiantamento por conta do IRS do ano, não o imposto final. No acerto anual podes ter de pagar mais ou receber reembolso. Por isso o simulador separa o que sai agora do recibo do imposto que ainda vai ser apurado.",
  },
  {
    q: "Tenho de cobrar IVA nos recibos verdes?",
    a: "Só se estiveres fora do regime de isenção do artigo 53.º do CIVA. O simulador deixa-te escolher o regime e mostra o IVA como camada separada, porque o IVA que cobras nunca é rendimento teu — é dinheiro do Estado que passa pela tua conta.",
  },
  {
    q: "E no primeiro ano de atividade?",
    a: "No primeiro ano há isenção de contribuições para a Segurança Social durante os primeiros 12 meses. O simulador tem essa opção, e também a de quem acumula recibos verdes com trabalho por conta de outrem, em que as regras de contribuição mudam.",
  },
  {
    q: "É preciso criar conta?",
    a: "Não. Calcular é grátis e sem registo, e os valores ficam no teu dispositivo. Guardar cenários e exportar em PDF/CSV fazem parte do plano Plus.",
  },
];

export default function FerramentaRecibosVerdesPage() {
  const faqSchema = generateFAQSchema(FAQS);
  const appSchema = generateSoftwareApplicationSchema();
  const howToSchema = generateHowToSchema({
    name: "Como calcular o líquido de um recibo verde em 2026",
    description:
      "Passos para saber quanto de um recibo verde fica mesmo para ti: indicar o valor faturado, escolher a atividade, definir o regime de IVA e ler o resultado em camadas.",
    url: TOOL.canonicalHref,
    totalTime: "PT3M",
    steps: [
      { name: "Indica quanto vais faturar", text: "Introduz o valor do recibo ou a faturação do período. Podes alternar entre mensal e anual sem perder o que já preencheste." },
      { name: "Escolhe a tua atividade", text: "A atividade determina o coeficiente do regime simplificado, a retenção na fonte aplicável e a base de Segurança Social." },
      { name: "Define o regime de IVA e as isenções", text: "Indica se estás no regime de isenção do artigo 53.º, se tens dispensa de retenção, se é o primeiro ano de atividade ou se acumulas com trabalho dependente." },
      { name: "Lê o resultado em camadas", text: "O resultado separa o que é IRS, Segurança Social e IVA, distingue o dinheiro que recebes agora do imposto futuro e mostra o líquido disponível e o valor a reservar." },
    ],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(appSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(howToSchema) }} />

      <ToolShell
        tool={TOOL}
        subtitulo="Do valor faturado ao líquido real. IRS, Segurança Social e IVA em camadas separadas — para saberes quanto reservar e quanto fica mesmo para ti."
        contexto={
          <>
            <section className="mb-10">
              <h2 className="font-display mb-4 text-xl font-semibold text-stone-800 dark:text-stone-100">
                Porque é que o líquido não é o valor do recibo
              </h2>
              <div className="space-y-3 rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6">
                <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                  Um recibo verde de 1 000 € não são 1 000 € para ti — e também não são
                  1 000 € menos uma percentagem fixa. Há três coisas diferentes a acontecer
                  ao mesmo tempo, e é por as juntarem que a maioria das calculadoras engana:
                </p>
                <ul className="space-y-2.5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
                    <span>
                      <strong className="text-stone-800 dark:text-stone-200">O IVA nunca é teu.</strong>{" "}
                      Se o cobras, entra na tua conta e volta a sair. Não é rendimento e não
                      devia aparecer somado ao que ganhaste.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
                    <span>
                      <strong className="text-stone-800 dark:text-stone-200">A retenção é um adiantamento.</strong>{" "}
                      Sai já do recibo, mas é por conta do IRS do ano. Pode faltar ou sobrar
                      no acerto — não é o imposto final.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
                    <span>
                      <strong className="text-stone-800 dark:text-stone-200">A Segurança Social vem depois.</strong>{" "}
                      Não sai do recibo: é declarada e paga trimestralmente, sobre a média dos
                      três meses. É o que apanha de surpresa quem só olhou para a retenção.
                    </span>
                  </li>
                </ul>
                <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                  Por isso o resultado distingue o que <strong className="text-stone-800 dark:text-stone-200">recebes
                  agora</strong> do que tens de <strong className="text-stone-800 dark:text-stone-200">reservar
                  para impostos futuros</strong>.
                </p>
                <Link
                  href="/ferramentas/seguranca-social"
                  className="inline-flex items-center gap-2 pt-1 text-sm font-semibold text-brand transition-colors hover:text-brand/80"
                >
                  Calcular a Segurança Social do trimestre <ArrowRight size={14} />
                </Link>
              </div>
            </section>

            <section className="mb-2">
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
        <SimuladorRecibosVerdesLazy />
      </ToolShell>
    </>
  );
}
