import Link from "next/link";
import {
  ArrowRight,
  Bank,
  Building,
  Check,
  Coin,
  ExternalLink,
  Receipt,
  Scale,
  ShieldCheck,
  Warning,
} from "@/components/ui/Icons";
import Reveal from "@/components/ui/Reveal";
import FilaPilares from "@/components/navegacao/FilaPilares";
import Precos from "@/components/Precos";
import HeroFoco from "@/components/foco/HeroFoco";
import Bussola from "@/components/foco/Bussola";
import SeccaoFoco, { CartaoMetodo, FaqFoco } from "@/components/foco/SeccaoFoco";
import { FOCO_POR_ID } from "@/components/foco/focos";
import PalcoEmpresa, { type DadosEmpresa } from "./PalcoEmpresa";

const eur0 = (n: number) => `${Math.round(n).toLocaleString("pt-PT")} €`;

const PRINCIPIOS = [
  {
    titulo: "Uma empresa custa antes de render",
    texto:
      "Contabilidade certificada todos os meses, mesmo num mês sem faturar. É um custo fixo que a sociedade tem de recuperar antes de compensar seja o que for.",
    Icon: Coin,
  },
  {
    titulo: "O imposto é em dois andares",
    texto:
      "O IRC incide sobre o lucro da sociedade; depois, tirar esse lucro para o teu bolso volta a ser tributado como dividendo. Comparar só o IRC com o IRS erra a conta por inteiro.",
    Icon: Bank,
  },
  {
    titulo: "O simplificado é bom até deixar de ser",
    texto:
      "O coeficiente presume as despesas em vez de as contar. Enquanto as tuas despesas reais forem menores do que a presunção, o simplificado ganha — e é isso que muda com a escala.",
    Icon: Scale,
  },
  {
    titulo: "Nem tudo é imposto",
    texto:
      "Responsabilidade limitada, sócios, crédito, contratos com grandes clientes: há razões para abrir empresa que não aparecem em euros. O ponto de viragem diz quando vale a pena discuti-las.",
    Icon: ShieldCheck,
  },
] as const;

const FAQS = [
  {
    pergunta: "Este número decide por mim?",
    resposta:
      "Não. O ponto de viragem é o valor a partir do qual a sociedade passa a deixar mais líquido no teu bolso, com pressupostos declarados. Não conta a responsabilidade limitada, o custo de fechar a empresa mais tarde, nem o que uma estrutura formal muda na relação com clientes e bancos.",
  },
  {
    pergunta: "Porque é que a linha da empresa começa tão abaixo?",
    resposta:
      "Porque a contabilidade é obrigatória e mensal. Antes do primeiro euro de imposto já há um custo fixo anual a pagar, e é esse fosso que a faturação tem de recuperar. Uma comparação que o ignore faz a empresa parecer melhor do que é em faturações baixas.",
  },
  {
    pergunta: "E se eu não retirar os lucros?",
    resposta:
      "Aí a conta muda, e muda a favor da sociedade — mas deixa de ser comparável com o líquido de recibos verdes, que é dinheiro na tua conta. Manter lucros na empresa é uma decisão de investimento, não uma poupança fiscal automática.",
  },
  {
    pergunta: "O regime simplificado tem um limite?",
    resposta:
      "Tem: acima do limite anual de rendimentos previsto no Art. 28.º do CIRS, passas obrigatoriamente a contabilidade organizada. A partir daí a pergunta deixa de ser «compensa?» e passa a ser «sob que forma».",
  },
  {
    pergunta: "Posso ter empresa e continuar a recibos verdes?",
    resposta:
      "Podes, e há casos em que faz sentido — mas exige atenção a preços de transferência e à substância de cada atividade. É precisamente o tipo de decisão que não se toma a partir de um gráfico.",
  },
] as const;

export default function HomepageEmpresa({ dados }: { dados: DadosEmpresa }) {
  const foco = FOCO_POR_ID.get("empresa")!;

  return (
    <>
      <HeroFoco
        foco={foco}
        ancora="#metodo-empresa"
        rotuloAncora="Ver o que entra na conta"
        selos={[
          { Icon: ShieldCheck, texto: "IRC, derrama e dividendos contados" },
          { Icon: Warning, texto: "Pressupostos sempre à vista" },
        ]}
      >
        <PalcoEmpresa dados={dados} />
      </HeroFoco>

      {/* ── Método ──────────────────────────────────────────────── */}
      <SeccaoFoco
        id="metodo-empresa"
        fundo="areia"
        sobrancelha="O método"
        titulo="A resposta é «depende» — e o «de quê» é um número."
        intro="Quase toda a gente responde a esta pergunta com uma regra de bolso ouvida a alguém. A conta existe, e o que a torna difícil não é a matemática: é lembrar-se de contar o que a empresa custa antes de render."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPIOS.map(({ titulo, texto, Icon }, indice) => (
            <Reveal key={titulo} delay={indice * 0.05}>
              <CartaoMetodo indice={indice} Icon={Icon} titulo={titulo} texto={texto} />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-8 overflow-hidden rounded-[2rem] border border-stone-100 bg-white shadow-lift dark:border-stone-800 dark:bg-stone-900">
          <div className="border-b border-stone-100 px-5 py-4 dark:border-stone-800 sm:px-7">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-stone-500">
              <Building size={15} className="text-brand" /> No exemplo de {eur0(dados.exemplo)} por
              ano
            </div>
          </div>
          <div className="grid md:grid-cols-3">
            {[
              {
                rotulo: "Recibos verdes",
                valor: eur0(dados.exemploFreelancer),
                texto:
                  "Regime simplificado: o coeficiente presume as despesas, e a Segurança Social incide sobre o rendimento relevante.",
                cores: "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint",
                vence: dados.exemploFreelancer >= dados.exemploEmpresa,
              },
              {
                rotulo: "Empresa",
                valor: eur0(dados.exemploEmpresa),
                texto:
                  "Sociedade: IRC sobre o lucro, derrama, e tributação dos dividendos ao retirar para o bolso.",
                cores:
                  "bg-categoria-areia-bg text-categoria-areia-text dark:bg-stone-800 dark:text-[#e7c98e]",
                vence: dados.exemploEmpresa > dados.exemploFreelancer,
              },
              {
                rotulo: "O custo de ter",
                valor: `${eur0(dados.custoFixo)}/ano`,
                texto:
                  "Contabilidade certificada, obrigatória e mensal. É o fosso que a sociedade tem de recuperar primeiro.",
                cores: "bg-clay-bg text-clay-text",
                vence: false,
              },
            ].map((coluna, indice) => (
              <div
                key={coluna.rotulo}
                className={`p-5 sm:p-7 ${indice > 0 ? "border-t border-stone-100 dark:border-stone-800 md:border-l md:border-t-0" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${coluna.cores}`}
                  >
                    {coluna.rotulo}
                  </span>
                  {coluna.vence ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand">
                      <Check size={11} /> mais líquido
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 font-display text-2xl font-semibold tabular-nums text-ink">
                  {coluna.valor}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-stone-500">{coluna.texto}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </SeccaoFoco>

      {/* ── Percurso ────────────────────────────────────────────── */}
      <SeccaoFoco
        id="percurso-empresa"
        fundo="branco"
        sobrancelha="Antes de decidir"
        titulo="Um gráfico não abre uma empresa."
        intro="O ponto de viragem diz quando a conversa vale a pena. A conversa em si tem partes que nenhum simulador substitui — e há duas coisas que convém ter feito antes."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Link
            href="/?foco=preco"
            className="focus-marca group rounded-4xl border border-stone-100 bg-white p-5 no-underline shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift dark:border-stone-800 dark:bg-stone-900 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300">
                <Coin size={18} />
              </span>
              <span className="font-mono text-[11px] font-bold text-stone-500 dark:text-stone-400">
                01
              </span>
            </div>
            <div className="mt-5 text-[10px] font-bold uppercase tracking-[.14em] text-stone-400">
              Primeiro
            </div>
            <h3 className="mt-1 font-display text-xl font-semibold text-ink">
              Um preço que se sustenta
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              Mudar de estrutura não corrige um preço mal formado — só muda quem paga a diferença.
            </p>
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand transition-transform group-hover:translate-x-1">
              Formar o preço <ArrowRight size={13} />
            </div>
          </Link>

          <Link
            href="/?foco=recibos"
            className="focus-marca group rounded-4xl border border-stone-100 bg-white p-5 no-underline shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift dark:border-stone-800 dark:bg-stone-900 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300">
                <Receipt size={18} />
              </span>
              <span className="font-mono text-[11px] font-bold text-stone-500 dark:text-stone-400">
                02
              </span>
            </div>
            <div className="mt-5 text-[10px] font-bold uppercase tracking-[.14em] text-stone-400">
              Depois
            </div>
            <h3 className="mt-1 font-display text-xl font-semibold text-ink">
              Saber o que sobra hoje
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              A comparação só é honesta quando sabes o que o regime atual te deixa de facto.
            </p>
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand transition-transform group-hover:translate-x-1">
              Ver a repartição <ArrowRight size={13} />
            </div>
          </Link>

          <div className="rounded-4xl border border-brand bg-brand-light p-5 shadow-card dark:bg-brand/15 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-white">
                <Scale size={18} />
              </span>
              <span className="font-mono text-[11px] font-bold text-brand-dark dark:text-brand-mint">
                03
              </span>
            </div>
            <div className="mt-5 text-[10px] font-bold uppercase tracking-[.14em] text-brand">
              Estás aqui
            </div>
            <h3 className="mt-1 font-display text-xl font-semibold text-ink">
              Comparar com os teus números
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Faturação, dependentes, região e despesas reais mudam o ponto de viragem. Com os teus
              valores, o número deixa de ser um exemplo.
            </p>
            <Link
              href="/ferramentas/comparar-regimes"
              className="focus-marca mt-5 inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-brand-dark no-underline dark:text-brand-mint"
            >
              Comparar os três regimes <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </SeccaoFoco>

      <section className="px-4 pb-8 sm:px-6 sm:pb-12">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-7">
          <FilaPilares />
        </div>
      </section>

      <Precos />

      <FaqFoco
        id="faq-empresa"
        sobrancelha="Antes de abrir"
        titulo="As perguntas que o gráfico não responde."
        intro="Cinco coisas que mudam a decisão e que não cabem numa linha a cruzar outra."
        perguntas={FAQS}
        cta={{ href: "/ferramentas/simulador-empresa", rotulo: "Simular a minha empresa" }}
      />

      {/* ── Fontes ──────────────────────────────────────────────── */}
      <SeccaoFoco
        id="fontes-empresa"
        fundo="areia"
        sobrancelha="Fontes e limites"
        titulo="Os pressupostos ficam à vista, ou o número não vale nada."
        intro="Um ponto de viragem depende do que se assume: despesas reais, retirada dos lucros, derrama do concelho, situação familiar. Esta demonstração fixa esses valores e diz quais são."
        larguraTitulo="max-w-2xl"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              sigla: "CIRC",
              titulo: "IRC e derrama",
              texto:
                "Taxa geral, taxa reduzida do primeiro escalão para PME e derrama municipal, que varia por concelho.",
              href: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/circ_rep/Pages/codigo-do-irc-indice.aspx",
            },
            {
              sigla: "CIRS",
              titulo: "Simplificado e dividendos",
              texto:
                "Art. 31.º para os coeficientes do regime simplificado; tributação dos dividendos ao retirar lucros da sociedade.",
              href: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/codigo-do-irs-indice.aspx",
            },
          ].map(({ sigla, titulo, texto, href }, i) => (
            <Reveal key={sigla} delay={i * 0.05}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-marca group flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-5 no-underline shadow-card transition-shadow hover:shadow-lift dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand">
                    {sigla}
                  </span>
                  <ExternalLink size={13} className="text-stone-400 group-hover:text-brand" />
                </div>
                <h3 className="mt-5 text-sm font-semibold text-stone-800 dark:text-stone-100">
                  {titulo}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-stone-500">{texto}</p>
              </a>
            </Reveal>
          ))}
          <Reveal delay={0.1}>
            <div className="flex h-full flex-col rounded-4xl border border-brand/30 bg-brand-light p-5 shadow-card dark:bg-brand/15">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-dark dark:text-brand-mint">
                <Warning size={12} /> Os pressupostos desta cena
              </div>
              <h3 className="mt-5 text-sm font-semibold text-stone-800 dark:text-stone-100">
                Sem dependentes, lucros retirados
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                O gráfico assume que os lucros da sociedade são retirados para o bolso e que não há
                dependentes. Custo de contabilidade estimado em {eur0(dados.custoFixo)}/ano. Muda
                qualquer um destes e o ponto de viragem muda com ele.
              </p>
            </div>
          </Reveal>
        </div>
      </SeccaoFoco>

      {/* A bússola fecha a leitura. Quem chegou aqui já sabe uma coisa;
          isto diz-lhe que há outras quatro e qual é a pergunta de cada
          uma — sem o obrigar a subir ao cabeçalho para descobrir. */}
      <section className="px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-6xl">
          <Bussola
            excepto="empresa"
            compacta
            titulo="E as outras quatro?"
            nota="Cada uma responde ao que este ecrã não responde."
          />
        </div>
      </section>
    </>
  );
}
