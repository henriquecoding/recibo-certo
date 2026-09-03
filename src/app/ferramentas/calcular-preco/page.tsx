import type { Metadata } from "next";
import Link from "next/link";
import ToolShell from "@/components/ferramentas/ToolShell";
import { porId } from "@/lib/ferramentas";
import SimuladorPrecoLazy from "./lazy";
import { generateFAQSchema } from "@/lib/seo";
import { fmt } from "@/lib/format";
import { IVA_TAXAS, IVA_ISENCAO_LIMITE, SS_TAXA, SS_COEFICIENTE } from "@/lib/fiscal-data";
import { REDUCAO_PRECO_30_DIAS, LIVRE_RESOLUCAO, PRECO_AO_CONSUMIDOR, REVISAO_PRICING } from "@/lib/pricing";
import { ArrowRight, ExternalLink, Info } from "@/components/ui/Icons";
import { jsonLd } from "@/lib/jsonld";

const TOOL = porId("calcular-preco")!;

export const metadata: Metadata = {
  // Sem «| Recibo Certo»: o `template` do layout raiz já o acrescenta, e
  // escrevê-lo aqui produzia «… | Recibo Certo | Recibo Certo» no separador.
  title: "Calculadora de preço de venda 2026 — quanto cobrar",
  description:
    "Calcula o preço de venda do teu produto ou serviço em Portugal: custo, margem, markup, comissões, IVA por região, Segurança Social e IRS. Com ponto de equilíbrio e simulação de cenários.",
  keywords: [
    "calcular preço de venda",
    "calculadora de preços",
    "quanto cobrar",
    "margem de lucro",
    "markup",
    "preço com IVA",
    "PVP",
    "ponto de equilíbrio",
    "quanto cobrar por hora",
  ],
  alternates: { canonical: `https://www.recibocerto.pt${TOOL.canonicalHref}` },
  openGraph: {
    title: "Calculadora de preço de venda 2026 | Recibo Certo",  // openGraph não passa pelo template
    description:
      "Descobre o teu cenário e constrói o preço connosco: custos, comissões, IVA, Segurança Social e o que te fica mesmo de cada venda.",
    url: `https://www.recibocerto.pt${TOOL.canonicalHref}`,
    siteName: "Recibo Certo",
    locale: "pt_PT",
    type: "article",
  },
};

// ── FAQ derivada da pesquisa de intenção, não inventada para encher ────
// Cada pergunta veio do mapa em docs/research/pricing-search-intent.md e
// responde a uma dúvida que aparece repetidamente em pesquisa portuguesa.
const FAQ = [
  {
    q: "Como se calcula o preço de venda de um produto?",
    a: "Parte-se do custo de uma unidade, somam-se os custos que só existem quando vendes (embalagem, portes, comissões, taxas de pagamento) e a parte das contas fixas que cabe a cada venda. Depois aplica-se a margem pretendida sobre o preço sem IVA, e só no fim se acrescenta o IVA para chegar ao preço que o cliente vê.",
  },
  {
    q: "Qual é a diferença entre margem e markup?",
    a: "As duas medem a mesma coisa — o que te fica — mas dividem por números diferentes. Num preço de 15 € com 10 € de custo, ficam-te 5 €: esses 5 € são 50% do custo (markup) e 33,3% do preço (margem). O markup é sempre o número maior, porque o custo é sempre menor do que o preço; por isso um markup de 100% é uma margem de 50%, e não «o dobro do lucro». Nesta calculadora as duas medem o que te fica DEPOIS da Segurança Social e do IRS, e não o que acrescentaste à etiqueta — é por isso que o preço sugerido a um trabalhador independente é mais alto do que o da conta de manual.",
  },
  {
    q: "Se estou isento de IVA pelo Art. 53.º, o preço fica mais barato?",
    a: "Nem sempre. É verdade que não acrescentas IVA ao preço, mas também não deduzes o IVA que pagas nas compras (Art. 53.º n.º 3 do CIVA). O teu custo real passa a ser o valor com IVA, e isso pode comer boa parte da vantagem. A calculadora trata os dois efeitos ao mesmo tempo.",
  },
  {
    q: "A Segurança Social entra no preço de um trabalhador independente?",
    a: `Sim, e entra como custo variável sobre a faturação, não como imposto sobre o lucro. A base de incidência é ${(SS_COEFICIENTE.servicos.value * 100).toFixed(0)}% do que faturas em serviços (${(SS_COEFICIENTE.bens.value * 100).toFixed(0)}% na venda de bens), a que se aplica a taxa de ${(SS_TAXA.value * 100).toFixed(1).replace(".", ",")}%. Ou seja, cerca de 15 cêntimos de cada euro de serviços prestados — independentemente de essa venda ter dado lucro.`,
  },
  {
    q: "Os meus custos reduzem o IRS que pago?",
    a: "Depende do regime, e a diferença é grande. No regime simplificado, não: o rendimento tributável é a faturação multiplicada por um coeficiente (Art. 31.º do CIRS), e esse coeficiente já presume as despesas — comprar melhor aumenta a tua margem, mas não reduz o imposto. Em contabilidade organizada, sim: o tributável é a receita menos as despesas documentadas (Art. 28.º), e cada euro de custo abate mesmo ao imposto. A calculadora pergunta-te qual é o teu regime e faz a conta certa para cada um.",
  },
  {
    q: "Como calculo quanto cobrar por hora?",
    a: "Não é o rendimento pretendido a dividir por 160. Tira do ano as férias, os feriados e as semanas sem clientes; depois tira a percentagem de horas que não são faturáveis (propostas, administração, deslocações, formação). O que sobra são as horas produtivas reais — normalmente entre metade e três quartos do tempo de trabalho. Só então se divide, e ainda se repõe o que sai em Segurança Social e IRS.",
  },
  {
    q: "A comissão de um marketplace incide sobre o preço com ou sem IVA?",
    a: "Habitualmente sobre o valor total da encomenda, com IVA incluído. Por isso uma comissão de 15% custa-te, na prática, 18,45% do valor sem IVA — e é essa a percentagem que te sai da margem. A calculadora separa as duas bases para não confundir uma com a outra.",
  },
  {
    q: "Posso anunciar qualquer desconto?",
    a: `Podes fazer o desconto que quiseres, mas o preço de referência que anuncias tem regras: é o preço mais baixo que praticaste nos ${REDUCAO_PRECO_30_DIAS.value.dias} dias consecutivos anteriores, incluindo promoções nesse período. Saldos têm ainda um limite de ${REDUCAO_PRECO_30_DIAS.value.diasMaximoSaldosAno} dias por ano e comunicação prévia à ASAE.`,
  },
  {
    q: "O preço que mostro ao cliente tem de incluir IVA?",
    a: "Sim. O preço indicado ao consumidor é o preço total, com todos os impostos e encargos incluídos, escrito de forma visível e inequívoca. O preço sem IVA serve para a tua gestão — não para a montra nem para a página de produto.",
  },
  {
    q: "Como sei quantas unidades tenho de vender para não perder dinheiro?",
    a: "Divide os custos fixos mensais pela margem de contribuição de cada venda (o preço sem IVA menos tudo o que varia com a venda). O resultado é o ponto de equilíbrio. Se a margem de contribuição for zero ou negativa, não existe ponto de equilíbrio nenhum: vender mais só aumenta o prejuízo.",
  },
];

export default async function CalcularPrecoPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(generateFAQSchema(FAQ)) }}
      />
      <ToolShell
        tool={TOOL}
        // Esta mede-se a si própria, e melhor: sabe quantos campos
        // essenciais do cenário é que faltam, e só chama «concluído» a uma
        // simulação que os tem todos. Ver `components/precos/medicao.ts`.
        medir={false}
        subtitulo="Diz-nos o que estás a vender e construímos o preço contigo — com os custos que costumam ficar de fora, as regras de IVA da tua região e o que a Segurança Social e o IRS levam de cada euro faturado."
        contexto={<Contexto />}
      >
        <SimuladorPrecoLazy cenarioInicial={c ?? null} />
      </ToolShell>
    </>
  );
}

function Contexto() {
  const t = IVA_TAXAS.continente.value;

  return (
    <div className="space-y-8">
      {/* ── Como funciona ─────────────────────────────────────────── */}
      <section className="rounded-4xl border border-stone-100 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900/50 sm:p-6">
        <h2 className="font-display mb-3 text-xl font-semibold text-stone-800 dark:text-stone-100">
          Como esta ferramenta chega ao preço
        </h2>
        <ol className="space-y-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          {[
            ["O que estás a vender", "Um produto para revender, um bolo por encomenda e uma hora de consultoria são problemas diferentes. A primeira pergunta é essa, e é ela que decide todas as outras."],
            ["Quanto te custa mesmo", "Não é só o custo de compra: é a embalagem, os portes, o desperdício, as devoluções e o teu tempo. E é o custo com ou sem IVA, consoante o consigas deduzir."],
            ["O que sai de cada venda", "Comissão do canal e taxa de pagamento incidem sobre o valor total, com IVA. Um afiliado costuma incidir sobre o valor sem IVA. São bases diferentes e a conta trata-as como tal."],
            ["O que o Estado leva", "Se és trabalhador independente, a Segurança Social incide sobre a faturação e o IRS sobre um coeficiente dela. Nenhum dos dois depende do teu lucro — e isso muda o preço mínimo."],
            ["O preço sustentável", "Não um número, uma faixa: o piso abaixo do qual perdes dinheiro, o mínimo que cobre as contas fixas, o recomendado e o confortável."],
            ["Como o apresentas", "O preço ao consumidor inclui os impostos. Se fizeres desconto, o preço de referência tem regras. A ferramenta diz quais."],
          ].map(([titulo, texto], i) => (
            <li key={titulo} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-brand text-[11px] font-bold text-white"
              >
                {i + 1}
              </span>
              <span>
                <strong className="text-stone-700 dark:text-stone-300">{titulo}.</strong> {texto}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Margem vs markup ──────────────────────────────────────
          Reescrito porque a versão anterior ensinava a definição de manual
          («markup de 50% sobre 10 € dá 15 €») enquanto a ferramenta usa
          outra: aqui o markup mede O QUE FICAS a dividir pelo custo, não o
          que acrescentas ao preço. Para um trabalhador independente os dois
          dão números muito diferentes, porque a Segurança Social e o IRS
          saem pelo meio — e quem lia a tabela e depois via o preço da
          ferramenta concluía, com razão, que uma das duas estava errada.

          A explicação passa a ser: o mesmo euro, dois denominadores. E
          depois, a razão portuguesa para o preço subir. ─────────────── */}
      <section>
        <h2 className="font-display mb-3 text-xl font-semibold text-stone-800 dark:text-stone-100">
          Margem e markup: o mesmo euro, dois denominadores
        </h2>
        <p className="mb-5 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          É a confusão mais cara da precificação. Não são duas formas de cobrar — são duas formas de{" "}
          <strong className="font-semibold text-stone-800 dark:text-stone-100">medir a mesma coisa</strong>: o que te
          fica. O que muda é por quanto se divide.
        </p>

        {/* Uma barra: custo + o que te fica = preço. */}
        <div className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="eyebrow text-stone-500 dark:text-stone-400">Um exemplo simples</span>
            <span className="text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100">
              preço {fmt(15)}
            </span>
          </div>

          <div
            className="flex h-11 w-full overflow-hidden rounded-xl"
            role="img"
            aria-label="Um preço de 15 euros é feito de 10 euros de custo mais 5 euros que te ficam"
          >
            <div
              className="flex items-center justify-center bg-stone-200 text-xs font-semibold text-stone-700 dark:bg-stone-700 dark:text-stone-200"
              style={{ width: "66.67%" }}
            >
              {fmt(10)}
            </div>
            <div
              className="flex items-center justify-center bg-brand text-xs font-semibold text-white"
              style={{ width: "33.33%" }}
            >
              {fmt(5)}
            </div>
          </div>
          <div className="mt-1.5 flex w-full text-[11px] font-medium text-stone-500 dark:text-stone-400">
            <span style={{ width: "66.67%" }}>custo</span>
            <span style={{ width: "33.33%" }}>o que te fica</span>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3.5 dark:border-stone-800 dark:bg-stone-800/40">
              <dt className="text-sm font-semibold text-stone-800 dark:text-stone-100">Markup: 50%</dt>
              <dd className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                Os mesmos {fmt(5)} a dividir pelo <strong className="font-semibold">custo</strong> ({fmt(10)}).
                Responde a «quanto acrescentei ao que me custou?».
              </dd>
            </div>
            <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3.5 dark:border-stone-800 dark:bg-stone-800/40">
              <dt className="text-sm font-semibold text-stone-800 dark:text-stone-100">Margem: 33,3%</dt>
              <dd className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                Os mesmos {fmt(5)} a dividir pelo <strong className="font-semibold">preço</strong> ({fmt(15)}).
                Responde a «que fatia da venda é minha?».
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            O markup é sempre o número maior dos dois, porque o custo é sempre menor do que o preço. Por isso um markup
            de 100% não é «o dobro do lucro» — é uma margem de 50%.
          </p>
        </div>

        {/* A parte portuguesa, que é a que faz os números não baterem. */}
        <div className="mt-4 rounded-4xl border border-alert-border bg-alert-bg p-4 sm:p-5">
          <h3 className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-alert-text">
            <Info size={15} className="flex-shrink-0" />
            Porque é que o preço que esta ferramenta sugere é mais alto
          </h3>
          <p className="text-sm leading-relaxed text-alert-text">
            Naquele exemplo, os {fmt(5)} eram todos teus. Se passas recibos verdes, não são: a Segurança Social incide
            sobre a faturação e o IRS vem a seguir. Para te ficarem {fmt(5)} na mão, o preço tem de ser mais alto do que
            os {fmt(15)} da conta de manual.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-alert-text">
            É por isso que aqui <strong className="font-semibold">margem e markup medem o que te fica depois dos
            impostos</strong>, e não o que acrescentaste à etiqueta. Pedes 50% de markup, a ferramenta garante-te{" "}
            {fmt(5)} por venda — e diz-te que preço é preciso para isso.
          </p>
        </div>

        <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="Margem e markup lado a lado">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <caption className="mb-2 text-left text-xs text-stone-500 dark:text-stone-400">
              Sem impostos pelo meio, para a conversão ficar à vista:
            </caption>
            <thead>
              <tr className="border-b border-stone-200 text-left dark:border-stone-700">
                <th scope="col" className="py-2 pr-4 font-semibold text-stone-600 dark:text-stone-400">Custo</th>
                <th scope="col" className="py-2 pr-4 font-semibold text-stone-600 dark:text-stone-400">O que pedes</th>
                <th scope="col" className="py-2 pr-4 font-semibold text-stone-600 dark:text-stone-400">Preço sem IVA</th>
                <th scope="col" className="py-2 font-semibold text-stone-600 dark:text-stone-400">O outro fica</th>
              </tr>
            </thead>
            <tbody className="text-stone-700 dark:text-stone-300">
              <tr className="border-b border-stone-100 dark:border-stone-800">
                <td className="py-2.5 pr-4 tabular-nums">{fmt(10)}</td>
                <td className="py-2.5 pr-4">Markup de 50%</td>
                <td className="py-2.5 pr-4 font-semibold tabular-nums">{fmt(15)}</td>
                <td className="py-2.5 tabular-nums text-stone-600 dark:text-stone-400">margem de 33,3%</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 tabular-nums">{fmt(10)}</td>
                <td className="py-2.5 pr-4">Margem de 50%</td>
                <td className="py-2.5 pr-4 font-semibold tabular-nums">{fmt(20)}</td>
                <td className="py-2.5 tabular-nums text-stone-600 dark:text-stone-400">markup de 100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── O que muda em Portugal ───────────────────────────────── */}
      <section>
        <h2 className="font-display mb-3 text-xl font-semibold text-stone-800 dark:text-stone-100">
          O que muda por seres em Portugal
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              titulo: "O IVA depende da região",
              texto: `Taxa normal de ${(t.normal * 100).toFixed(0)}% no Continente, 22% na Madeira e 16% nos Açores. O preço sem IVA é o mesmo; o que o cliente paga não é.`,
            },
            {
              titulo: "A isenção do Art. 53.º corta nos dois sentidos",
              texto: `Abaixo de ${fmt(IVA_ISENCAO_LIMITE.value)} de faturação anual não liquidas IVA — mas também não o deduzes nas compras, e o teu custo sobe.`,
            },
            {
              titulo: "A Segurança Social é custo de faturação",
              texto: "Incide sobre 70% do que faturas em serviços, ganhes ou percas dinheiro nessa venda. Tratá-la como imposto sobre o lucro subestima o preço mínimo.",
            },
            {
              titulo: "No simplificado, os custos não abatem",
              texto:
                "O coeficiente do Art. 31.º já presume as despesas: comprar melhor dá-te margem, não te dá menos IRS. Na contabilidade organizada é ao contrário — o imposto incide sobre receita menos despesas, e a ferramenta calcula-o assim se disseres que é o teu caso.",
            },
            {
              titulo: "A retenção não é um custo",
              texto: "Quando faturas a uma empresa portuguesa, ela retém IRS na fonte. Isso mexe na tua tesouraria, não na tua margem — e não justifica cobrar mais.",
            },
            {
              titulo: "O preço tem regras de apresentação",
              texto: `Ao consumidor mostra-se o preço total com impostos incluídos, e um desconto anunciado obriga a indicar o preço mais baixo dos últimos ${REDUCAO_PRECO_30_DIAS.value.dias} dias.`,
            },
          ].map((b) => (
            <div
              key={b.titulo}
              className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900"
            >
              <h3 className="mb-1.5 text-sm font-semibold text-stone-800 dark:text-stone-100">{b.titulo}</h3>
              <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">{b.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-display mb-4 text-xl font-semibold text-stone-800 dark:text-stone-100">
          Perguntas frequentes
        </h2>
        <div className="space-y-3">
          {FAQ.map((f) => (
            <details
              key={f.q}
              className="group rounded-4xl border border-stone-100 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-stone-800 marker:hidden dark:text-stone-100">
                <span className="flex items-start justify-between gap-3">
                  {f.q}
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                    className="mt-0.5 flex-shrink-0 text-stone-400 transition-transform group-open:rotate-180"
                  >
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <p className="mt-2.5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Fontes ───────────────────────────────────────────────── */}
      <section className="rounded-4xl border border-stone-100 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900/50">
        <h2 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-200">Fontes</h2>
        <ul className="space-y-1.5 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
          {[
            { r: "Taxas de IVA e isenção do Art. 53.º", f: "Portal das Finanças — CIVA", u: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/artigo-53-o-do-civa.aspx" },
            { r: "Coeficientes do regime simplificado", f: "Art. 31.º CIRS", u: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs31.aspx" },
            { r: "Segurança Social do trabalhador independente", f: "Código Contributivo, arts. 162.º e 168.º", u: "https://www.seg-social.pt" },
            { r: PRECO_AO_CONSUMIDOR.descricao.slice(0, 60) + "…", f: PRECO_AO_CONSUMIDOR.fonte, u: PRECO_AO_CONSUMIDOR.fonteUrl },
            { r: "Regras dos saldos e das reduções de preço", f: REDUCAO_PRECO_30_DIAS.fonte, u: REDUCAO_PRECO_30_DIAS.fonteUrl },
            { r: "Direito de livre resolução e devoluções", f: LIVRE_RESOLUCAO.fonte, u: LIVRE_RESOLUCAO.fonteUrl },
          ].map((s) => (
            <li key={s.u}>
              <span className="text-stone-600 dark:text-stone-300">{s.r}</span> —{" "}
              <a
                href={s.u}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline-offset-2 hover:text-brand hover:underline"
              >
                {s.f}
                <ExternalLink size={10} />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-stone-600 dark:text-stone-400">
          Preçários de canais e meios de pagamento verificados a{" "}
          {new Date(REVISAO_PRICING).toLocaleDateString("pt-PT")}. São pressupostos editáveis: confirma sempre no
          contrato do teu canal.
        </p>
        <Link
          href="/metodologia"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-dark underline-offset-2 hover:underline dark:text-brand-mint"
        >
          Como verificamos os dados fiscais
          <ArrowRight size={12} />
        </Link>
      </section>
    </div>
  );
}
