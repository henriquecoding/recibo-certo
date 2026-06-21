import type { Metadata } from "next";
import Link from "next/link";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import { IVA_ISENCAO_LIMITE } from "@/lib/fiscal-data";
import { generateArticleSchema, generateFAQSchema } from "@/lib/seo";

const PATH = "/guias/fatura-vs-recibo";
const LIMITE_IVA = `${IVA_ISENCAO_LIMITE.value.toLocaleString("pt-PT")} €`;

export const metadata: Metadata = {
  title: "Fatura, recibo e fatura-recibo: as diferenças (2026)",
  description:
    "Qual a diferença entre fatura, recibo e fatura-recibo? E onde entram os recibos verdes? Explicado em português simples, com base legal e exemplos.",
  keywords: [
    "diferença fatura recibo",
    "fatura-recibo o que é",
    "fatura simplificada",
    "recibo verde é fatura-recibo",
    "documentos de faturação Portugal",
  ],
  alternates: { canonical: `https://www.recibocerto.pt${PATH}` },
  openGraph: {
    title: "Fatura, recibo e fatura-recibo: as diferenças | ReciboCerto",
    description:
      "A confusão mais comum dos independentes, resolvida: o que é cada documento e onde encaixam os recibos verdes.",
    url: `https://www.recibocerto.pt${PATH}`,
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FAQS = [
  {
    q: "Qual a diferença entre fatura e recibo?",
    a: "A fatura titula a transação e a obrigação de pagamento (o que foi vendido e quanto se deve). O recibo comprova que o pagamento foi efetivamente feito (a quitação). A fatura nasce com o serviço; o recibo nasce com o pagamento.",
  },
  {
    q: "O que é uma fatura-recibo?",
    a: "É um documento único que junta a fatura e o recibo num só, usado quando a emissão e o pagamento acontecem ao mesmo tempo. É exatamente o formato dos «recibos verdes» eletrónicos que os trabalhadores independentes emitem no Portal das Finanças.",
  },
  {
    q: "O recibo verde é uma fatura ou um recibo?",
    a: "Hoje o «recibo verde» eletrónico é uma fatura-recibo: documenta o serviço e comprova o recebimento ao mesmo tempo. Emite-se gratuitamente no Portal das Finanças, no separador dos recibos verdes eletrónicos.",
  },
  {
    q: "Preciso de software de faturação certificado para passar recibos verdes?",
    a: `Não. Como trabalhador independente, podes emitir a fatura-recibo diretamente no Portal das Finanças, sem custo e sem software certificado. O software certificado pela AT é exigido sobretudo a empresas com volume de faturação acima dos limites legais. Abaixo de ${LIMITE_IVA} de faturação anual ficas, ainda por cima, isento de IVA pelo Art. 53.º do CIVA.`,
  },
];

const articleSchema = generateArticleSchema({
  headline: "Fatura, recibo e fatura-recibo: as diferenças",
  description:
    "Explicação clara da diferença entre fatura, recibo e fatura-recibo, e onde encaixam os recibos verdes dos trabalhadores independentes em Portugal.",
  path: PATH,
  datePublished: "2026-06-16",
});

const FONTES = [
  {
    titulo: "Art. 29.º CIVA — obrigação de faturação (Portal das Finanças)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva29.aspx",
    tipo: "oficial" as const,
  },
  {
    titulo: "Art. 53.º CIVA — regime especial de isenção (Portal das Finanças)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/artigo-53-o-do-civa.aspx",
    tipo: "oficial" as const,
  },
  {
    titulo: "Fatura vs. recibo — Cegid Vendus",
    url: "https://www.vendus.pt/blog/fatura-vs-recibo/",
    tipo: "referencia" as const,
  },
  {
    titulo: "Fatura, fatura-recibo e fatura simplificada: diferenças — iziBizi",
    url: "https://www.izibizi.pt/blog/fatura-fatura-recibo-fatura-simplificada-diferencas/",
    tipo: "referencia" as const,
  },
];

const TIPOS = [
  {
    doc: "Fatura",
    para: "Titular a transação e a obrigação de pagamento.",
    quando: "Com o serviço ou a venda (até ao 5.º dia útil seguinte).",
    iva: "Sim — ou menção da isenção aplicável.",
  },
  {
    doc: "Recibo",
    para: "Comprovar que o pagamento foi efetuado (quitação).",
    quando: "Quando recebes o dinheiro.",
    iva: "Não acrescenta IVA — refere-se a uma fatura.",
  },
  {
    doc: "Fatura-recibo",
    para: "Os dois num só documento (serviço + recebimento).",
    quando: "Quando emissão e pagamento coincidem.",
    iva: "Sim — ou menção da isenção (ex.: Art. 53.º).",
  },
];

export default function FaturaVsReciboPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(FAQS)) }}
      />

      <GuiaHero
        titulo="Fatura, recibo e fatura-recibo: as diferenças"
        descricao="Três documentos parecidos, funções diferentes. Percebe qual usas, quando, e onde encaixam os recibos verdes."
        tempoLeitura={4}
      />

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          A diferença em três linhas
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800">
                <th className="pb-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">Documento</th>
                <th className="pb-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">Para quê</th>
                <th className="pb-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">Quando emitir</th>
                <th className="pb-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">IVA</th>
              </tr>
            </thead>
            <tbody>
              {TIPOS.map((t) => (
                <tr key={t.doc} className="border-b border-stone-50 dark:border-stone-900 align-top">
                  <td className="py-3 pr-4 font-semibold text-stone-800 dark:text-stone-100 whitespace-nowrap">{t.doc}</td>
                  <td className="py-3 pr-4 text-stone-600 dark:text-stone-400">{t.para}</td>
                  <td className="py-3 pr-4 text-stone-600 dark:text-stone-400">{t.quando}</td>
                  <td className="py-3 text-stone-600 dark:text-stone-400">{t.iva}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-3">
          Fatura
        </h2>
        <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
          A fatura é o documento que <strong>titula a transação</strong>: descreve
          o serviço prestado ou o bem vendido, o valor e o imposto. É ela que cria a
          obrigação de pagamento do cliente. Por regra, emite-se no momento do
          serviço ou até ao 5.º dia útil seguinte (Art. 29.º do CIVA).
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-3">
          Recibo
        </h2>
        <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
          O recibo é a <strong>prova de que o pagamento foi feito</strong> — a
          chamada quitação. Não acrescenta IVA nem cria obrigações novas: apenas
          confirma que aquela fatura foi liquidada. Faz sentido quando a fatura é
          emitida primeiro e o cliente paga mais tarde.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-3">
          Fatura-recibo
        </h2>
        <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
          A fatura-recibo junta os dois num <strong>documento único</strong>, para
          quando o serviço é faturado e pago ao mesmo tempo. É o formato natural de
          quem presta serviços e recebe na hora — e é exatamente o que os{" "}
          <strong>recibos verdes eletrónicos</strong> são.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-3">
          E os «recibos verdes»?
        </h2>
        <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
          O «recibo verde» eletrónico é, hoje, uma <strong>fatura-recibo</strong>{" "}
          emitida no Portal das Finanças pelos trabalhadores independentes
          (categoria B). Substituiu os antigos talões em papel verdes — daí o nome.
          Emite-se de borla, em poucos minutos, no separador dos recibos verdes
          eletrónicos. Se ainda não abriste atividade, vê o guia{" "}
          <Link href="/guias/abrir-atividade" className="text-brand underline underline-offset-2 hover:text-brand-dark">
            como abrir atividade nas Finanças
          </Link>
          .
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-3">
          Preciso de software de faturação certificado?
        </h2>
        <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
          Para passar recibos verdes, <strong>não</strong>. Emites a fatura-recibo
          diretamente no Portal das Finanças, sem custo e sem programa certificado.
          O software certificado pela Autoridade Tributária é exigido sobretudo a
          empresas acima dos limites legais de faturação. E, abaixo de {LIMITE_IVA}{" "}
          de faturação anual, ainda ficas isento de IVA pelo Art. 53.º do CIVA —
          detalhe no guia{" "}
          <Link href="/guias/iva-recibos-verdes" className="text-brand underline underline-offset-2 hover:text-brand-dark">
            IVA nos recibos verdes
          </Link>
          .
        </p>
        <div className="mt-4 rounded-2xl border border-brand/20 bg-brand-light/40 dark:bg-brand/5 p-4 text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
          O <strong>ReciboCerto</strong> não emite documentos legais — a emissão
          faz-se no Portal das Finanças. O que fazemos é calcular, ao cêntimo,
          quanto do teu recibo é teu, quanto reservar para impostos e quando pagar,
          para não teres surpresas.
        </div>
      </section>

      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
