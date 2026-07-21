import type { Metadata } from "next";
import SimuladorHeranca from "@/components/SimuladorHeranca";
import { generateFAQSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Simulador de Heranças e Sucessões 2026 — partilha e Imposto do Selo | ReciboCerto",
  description:
    "Descobre quem herda o quê e quanto se paga de Imposto do Selo em Portugal (2026). A família direta é isenta. Meação, legítima e quota disponível, partilha e comparação herança vs doação. Guiado e gratuito.",
  keywords: [
    "simulador heranças 2026",
    "imposto do selo herança",
    "partilha de herança Portugal",
    "legítima quota disponível",
    "meação cônjuge",
    "herança vs doação",
    "quem paga imposto herança",
  ],
  alternates: { canonical: "https://www.recibocerto.pt/ferramentas/simulador-herancas" },
  openGraph: {
    title: "Simulador de Heranças e Sucessões 2026 | ReciboCerto",
    description:
      "Quem herda o quê e quanto se paga de Imposto do Selo. Partilha, meação, legítima e comparação herança vs doação — com a legislação de 2026.",
    url: "https://www.recibocerto.pt/ferramentas/simulador-herancas",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FAQS = [
  {
    q: "Paga-se imposto sobre heranças em Portugal?",
    a: "Portugal não tem imposto sucessório desde 2004. As heranças são tributadas em Imposto do Selo à taxa de 10% (Verba 1.2 da Tabela Geral), mas o cônjuge, o unido de facto, os descendentes e os ascendentes estão totalmente isentos (Art. 6.º al. e do Código do Imposto do Selo). Só herdeiros como irmãos, sobrinhos, tios ou pessoas sem parentesco pagam.",
  },
  {
    q: "A doação de imóveis em vida paga imposto mesmo entre família?",
    a: "Sim. Ao contrário da herança, a doação de imóveis paga 0,8% de Imposto do Selo (Verba 1.1) mesmo quando é feita a favor do cônjuge, filhos ou pais. A herança dos mesmos imóveis é totalmente isenta para a família direta.",
  },
  {
    q: "O que é a legítima e a quota disponível?",
    a: "A legítima é a parte da herança que a lei reserva obrigatoriamente aos herdeiros legitimários (cônjuge, descendentes, ascendentes). A quota disponível é o restante, que pode ser deixado livremente por testamento. Com cônjuge e filhos, a legítima é 2/3 e a disponível 1/3 (Art. 2159.º do Código Civil).",
  },
  {
    q: "O que é a meação do cônjuge?",
    a: "Num casamento em comunhão de bens, metade dos bens comuns já pertence ao cônjuge sobrevivo — é a meação, que não é herança nem é tributada. Só a outra metade (mais os bens próprios do falecido) entra na herança a partilhar.",
  },
  {
    q: "Até quando tenho de participar a herança ao Fisco?",
    a: "O cabeça-de-casal entrega o Modelo 1 do Imposto do Selo (ISTG) até ao fim do 3.º mês seguinte ao do óbito — mesmo quando a herança é isenta de imposto (Art. 26.º do Código do Imposto do Selo).",
  },
];

export default function SimuladorHerancasPage() {
  const faqSchema = generateFAQSchema(FAQS);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="mb-8">
        <div className="eyebrow mb-3 text-brand">Heranças e sucessões</div>
        <h1 className="font-display display-2 font-semibold text-ink mb-4 text-balance">
          Quem herda o quê — e quanto se paga?
        </h1>
        <p className="text-lg text-stone-500 dark:text-stone-400 leading-relaxed">
          Em Portugal não há imposto sobre heranças: a família direta é isenta. Este simulador mostra
          a meação do cônjuge, a partilha entre herdeiros e o Imposto do Selo — e compara herdar com
          doar em vida. Com a legislação de 2026.
        </p>
      </div>

      <SimuladorHeranca />

      <section className="mx-auto mt-16 max-w-3xl">
        <h2 className="font-display text-2xl font-semibold text-ink">Perguntas frequentes</h2>
        <div className="mt-6 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-stone-100 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <summary className="cursor-pointer list-none text-sm font-semibold text-stone-800 marker:hidden dark:text-stone-100">
                {f.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
