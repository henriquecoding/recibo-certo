// ═══════════════════════════════════════════════════════════════════════
//  AS PERGUNTAS FREQUENTES DEIXAM DE VIVER NUMA ÂNCORA DA HOMEPAGE
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O DEFEITO QUE ESTA PÁGINA EXISTE PARA REPARAR                        │
//  │                                                                     │
//  │ O rodapé prometia «Perguntas frequentes» em `/#faq` e «Fontes        │
//  │ fiscais» em `/#fontes`. As duas secções viviam na homepage; a        │
//  │ homepage foi reescrita à volta dos cinco focos e elas saíram de lá.  │
//  │ As ligações ficaram — e uma âncora para um id que já não é           │
//  │ renderizado não dá 404 nem erro de compilação: entrega a homepage    │
//  │ pelo TOPO, em silêncio, como se a pessoa nunca tivesse clicado.      │
//  │                                                                     │
//  │ Uma âncora não é um destino: é um sítio DENTRO de um destino, e      │
//  │ desaparece quando quem a hospedava muda de forma. Estas respostas    │
//  │ são das poucas coisas que uma pessoa procura pelo nome — passam a    │
//  │ ter rota própria, indexável, citável e impossível de perder numa     │
//  │ reescrita da homepage.                                               │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  RENDERIZADA NO SERVIDOR, e por inteiro. A versão da homepage era um
//  componente de cliente que mostrava seis das dezoito perguntas conforme
//  o perfil guardado em `localStorage` — bom para não despejar tudo a
//  quem está a decidir, péssimo para quem chega aqui de propósito ou de
//  uma pesquisa. Aqui estão as dezoito, no HTML, legíveis sem JavaScript:
//  `<details>` abre e fecha sem uma linha de código nosso.
//
//  O conteúdo continua a ser `lib/faq.ts` — o mesmo que alimenta o
//  componente de `/precos` e o JSON-LD. Uma página nova não é uma segunda
//  cópia das respostas.
// ═══════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { Section, Nota } from "@/components/LegalPage";
import { faqs, faqsPorCategoria } from "@/lib/faq";
import { DATA_LAST_REVIEW } from "@/lib/fiscal-data";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import { generateBreadcrumbSchema, generateFAQSchema } from "@/lib/seo";
import { ArrowRight, Plus } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: `Perguntas frequentes ${FISCAL_YEAR} — recibos verdes, IRS e salário | Recibo Certo`,
  description:
    "As dúvidas mais comuns de quem passa recibos verdes ou recebe salário em Portugal: retenção na fonte, Segurança Social, IVA, IRS Jovem, subsídio de refeição e duodécimos. Respostas curtas, com as taxas oficiais de 2026.",
  keywords: [
    "perguntas frequentes recibos verdes",
    "dúvidas irs 2026",
    "faq fiscal portugal",
    "retenção na fonte dúvidas",
    "segurança social independentes perguntas",
  ],
  alternates: { canonical: "/perguntas-frequentes" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Perguntas frequentes — Recibo Certo",
    description:
      "Retenção na fonte, Segurança Social, IVA, IRS Jovem e salário líquido: as dúvidas mais comuns respondidas com as taxas oficiais de 2026.",
    url: "https://www.recibocerto.pt/perguntas-frequentes",
    type: "article",
    locale: "pt_PT",
  },
};

/** O índice são as categorias — derivado das perguntas, não escrito à mão. */
const idDaCategoria = (categoria: string) =>
  categoria
    .toLocaleLowerCase("pt-PT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const TOC = faqsPorCategoria.map((g) => ({
  id: idDaCategoria(g.categoria),
  label: g.categoria,
}));

/**
 * Uma pergunta. `<details>` e não um acordeão em React: a resposta tem de
 * estar no HTML servido — é o que um motor de resposta cita e o que uma
 * pessoa com o JavaScript por carregar consegue ler.
 */
function Pergunta({ q, a }: { q: string; a: string }) {
  return (
    <details className="group overflow-hidden rounded-2xl border border-stone-200 bg-white transition-colors open:border-brand/50 dark:border-stone-700 dark:bg-stone-800/50">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-left text-[13.5px] font-semibold text-stone-700 transition-colors group-open:text-brand-dark dark:text-stone-200 dark:group-open:text-brand-mint">
        <span>{q}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-transform duration-200 group-open:rotate-45 group-open:bg-brand group-open:text-white dark:bg-stone-700 motion-reduce:transition-none">
          <Plus size={12} />
        </span>
      </summary>
      <p className="border-t border-stone-100 px-4 py-3.5 text-[13.5px] leading-7 text-stone-600 dark:border-stone-700 dark:text-stone-400">
        {a}
      </p>
    </details>
  );
}

export default function PerguntasFrequentesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      generateFAQSchema(faqs),
      generateBreadcrumbSchema([
        { name: "Início", url: "/" },
        { name: "Perguntas frequentes", url: "/perguntas-frequentes" },
      ]),
    ],
  };

  const fmtData = new Date(`${DATA_LAST_REVIEW}T00:00:00Z`).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LegalPage
        title="Perguntas frequentes"
        subtitle={`As ${faqs.length} dúvidas que mais aparecem sobre recibos verdes, salário e impostos em Portugal. Respostas curtas, com os valores de ${FISCAL_YEAR} e sem termos que obriguem a procurar outra explicação.`}
        lastUpdated={fmtData}
        toc={TOC}
        eyebrow="Ajuda"
        selo={`${faqs.length} perguntas`}
        ctaTitulo="A tua pergunta não está aqui?"
        ctaTexto="Escreve-nos. Se for uma dúvida comum, entra nesta página com a fonte legal."
      >
        {faqsPorCategoria.map((grupo) => (
          <Section
            key={grupo.categoria}
            id={idDaCategoria(grupo.categoria)}
            title={grupo.categoria}
          >
            <div className="space-y-2.5">
              {grupo.itens.map((faq) => (
                <Pergunta key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </Section>
        ))}

        <Section id="onde-continuar" title="Onde continuar">
          <p>
            Uma resposta curta serve para desbloquear uma decisão, não para a substituir.
            Quando precisares do número exato da tua situação, o caminho é uma ferramenta;
            quando precisares do enquadramento completo, é um guia.
          </p>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {[
              { href: "/ferramentas", titulo: "Todas as ferramentas", desc: "Simular o teu caso concreto, com as taxas oficiais." },
              { href: "/guias", titulo: "Guias fiscais", desc: "O enquadramento completo, obrigação a obrigação." },
              { href: "/fontes-fiscais", titulo: "Fontes fiscais", desc: "De onde vem cada taxa usada nestas respostas." },
              { href: "/metodologia", titulo: "Metodologia", desc: "Como calculamos — e o que nunca fazemos." },
            ].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="group flex min-h-[44px] flex-col justify-center rounded-2xl border border-stone-200 bg-white px-4 py-3 transition-all hover:border-brand/40 hover:shadow-lift dark:border-stone-700 dark:bg-stone-800/50"
                >
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-stone-700 group-hover:text-brand-dark dark:text-stone-200 dark:group-hover:text-brand-mint">
                    {l.titulo}
                    <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  </span>
                  <span className="mt-0.5 texto-mini leading-snug text-stone-400 dark:text-stone-500">
                    {l.desc}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Nota>
            Estas respostas são informativas e referem-se a {FISCAL_YEAR}. Não substituem o
            aconselhamento de um contabilista certificado nem uma confirmação junto da
            Autoridade Tributária ou da Segurança Social.
          </Nota>
        </Section>
      </LegalPage>
    </>
  );
}
