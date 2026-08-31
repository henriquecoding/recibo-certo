// ═══════════════════════════════════════════════════════════════════════
//  P0-03 (segunda metade) — o IRS Jovem sai de dentro do guia.
//
//  Mesmo diagnóstico da Segurança Social trimestral: uma ferramenta real,
//  com procura própria («simulador IRS Jovem 2026»), acessível apenas por
//  quem já estava a ler o guia. O guia mantém a versão embutida e passa a
//  apontar para esta.
// ═══════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import Link from "next/link";
import ToolShell from "@/components/ferramentas/ToolShell";
import { porId } from "@/lib/ferramentas";
import { SimuladorIRSJovem } from "@/components/guias/SimuladorIRSJovem";
import InfoTip from "@/components/ui/InfoTip";
import { ArrowRight } from "@/components/ui/Icons";
import { generateFAQSchema, generateSoftwareApplicationSchema } from "@/lib/seo";
import { IRS_JOVEM, IAS_VALUE } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";

const TOOL = porId("irs-jovem")!;

const tetoIAS = IRS_JOVEM.tetoIAS.value;
const tetoEuros = tetoIAS * IAS_VALUE;

const ISENCOES = [
  { anos: "1.º ano", parte: 1.0 },
  { anos: "2.º a 4.º ano", parte: 0.75 },
  { anos: "5.º a 7.º ano", parte: 0.5 },
  { anos: "8.º a 10.º ano", parte: 0.25 },
];

export const metadata: Metadata = {
  title: "Simulador IRS Jovem 2026 — sou elegível e quanto poupo? | Recibo Certo",
  description:
    "Descobre se és elegível para o IRS Jovem em 2026 e quanto o benefício muda no teu imposto: ano de carreira, percentagem de isenção, teto em IAS traduzido para euros e comparação lado a lado com e sem o benefício.",
  keywords: [
    "simulador IRS Jovem 2026",
    "IRS Jovem elegibilidade",
    "isenção IRS jovem",
    "quanto poupo com IRS Jovem",
    "IRS Jovem teto IAS",
  ],
  alternates: { canonical: `https://www.recibocerto.pt${TOOL.canonicalHref}` },
  openGraph: {
    title: "Simulador IRS Jovem 2026 — elegibilidade e poupança real | Recibo Certo",
    description:
      "Triagem de elegibilidade e comparação com e sem o benefício, com o teto em IAS já traduzido para euros.",
    url: `https://www.recibocerto.pt${TOOL.canonicalHref}`,
    siteName: "Recibo Certo",
    locale: "pt_PT",
    type: "article",
  },
};

const FAQS = [
  {
    q: "Quem tem direito ao IRS Jovem?",
    a: "O benefício aplica-se a rendimentos das categorias A (trabalho dependente) e B (trabalho independente) de jovens até aos 35 anos, que não sejam considerados dependentes para efeitos fiscais. Aplica-se durante dez anos de carreira, que não têm de ser consecutivos.",
  },
  {
    q: "Qual é a percentagem de isenção em cada ano?",
    a: `A isenção decresce ao longo dos dez anos: ${pct(1)} no primeiro ano, ${pct(0.75)} do segundo ao quarto, ${pct(0.5)} do quinto ao sétimo e ${pct(0.25)} do oitavo ao décimo. Em todos eles, o rendimento excluído tem o mesmo teto: ${tetoIAS} vezes o IAS, ou seja ${fmt(tetoEuros)} em 2026.`,
  },
  {
    q: "O benefício reduz a retenção mensal ou só o IRS final?",
    a: "As duas coisas, mas por vias diferentes, e é importante não as confundir. A retenção mensal pode ser reduzida se comunicares a situação à entidade pagadora; o benefício anual é apurado na declaração. O simulador separa o efeito no imposto final do efeito no que recebes todos os meses.",
  },
  {
    q: "Posso acumular o IRS Jovem com o IFICI?",
    a: "Não. O regime do IRS Jovem e o IFICI (o antigo residente não habitual, reformulado) são incompatíveis — tens de escolher um. O simulador avisa no momento em que a escolha se torna relevante.",
  },
  {
    q: "Conta o ano em que só trabalhei alguns meses?",
    a: "Sim. Um ano de carreira conta como um ano de benefício mesmo que só tenhas auferido rendimentos durante parte dele. É por isso que o simulador pergunta em que ano de benefício estás, e não há quantos anos trabalhas.",
  },
];

export default function FerramentaIRSJovemPage() {
  const faqSchema = generateFAQSchema(FAQS);
  const appSchema = generateSoftwareApplicationSchema();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }} />

      <ToolShell
        tool={TOOL}
        subtitulo="Primeiro a elegibilidade, depois os números: em que ano de benefício estás, quanto fica isento e o que isso muda no imposto do ano."
        contexto={
          <>
            <section className="mb-10">
              <h2 className="font-display mb-4 text-xl font-semibold text-stone-800 dark:text-stone-100">
                Isenções por ano de carreira
                <InfoTip label="Art. 12.º-B CIRS">{IRS_JOVEM.isencaoPorAno.legalBasis}</InfoTip>
              </h2>
              <div className="overflow-x-auto rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6">
                <table className="w-full min-w-[22rem] text-sm">
                  <caption className="sr-only">
                    Percentagem de isenção do IRS Jovem e teto de rendimento excluído, por ano de carreira
                  </caption>
                  <thead>
                    <tr className="border-b border-stone-100 dark:border-stone-800">
                      <th scope="col" className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-400">Período</th>
                      <th scope="col" className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-400">Isenção</th>
                      <th scope="col" className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-400">Teto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ISENCOES.map((linha) => (
                      <tr key={linha.anos} className="border-b border-stone-50 last:border-0 dark:border-stone-800/50">
                        <th scope="row" className="py-3 text-left font-medium text-stone-700 dark:text-stone-300">{linha.anos}</th>
                        <td className="py-3 text-right tabular-nums text-stone-600 dark:text-stone-400">{pct(linha.parte)}</td>
                        <td className="py-3 text-right tabular-nums text-stone-600 dark:text-stone-400">{fmt(tetoEuros)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-4 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                  O teto é sempre {tetoIAS} × IAS ({fmt(IAS_VALUE)} em 2026) = {fmt(tetoEuros)}. Acima
                  desse valor, o rendimento é tributado normalmente.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <div className="rounded-4xl border border-stone-100 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900/50 sm:p-6">
                <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                  O IRS Jovem é um benefício dentro da declaração, não uma declaração à parte.
                  Depois de confirmares a elegibilidade, faz sentido ver o efeito no IRS completo
                  — com as tuas deduções e as restantes categorias de rendimento.
                </p>
                <Link
                  href="/ferramentas/simulador-irs"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand transition-colors hover:text-brand/80"
                >
                  Simular o IRS anual completo <ArrowRight size={14} />
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
        <SimuladorIRSJovem />
      </ToolShell>
    </>
  );
}
