import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building,
  Check,
  Coin,
  ExternalLink,
  Lightbulb,
  Lock,
  Plus,
  Receipt,
  Scale,
  ShieldCheck,
  Warning,
} from "@/components/ui/Icons";
import Reveal from "@/components/ui/Reveal";
import FilaPilares from "@/components/navegacao/FilaPilares";
import Precos from "@/components/Precos";
import Bussola from "@/components/foco/Bussola";
import HeroPreco from "./HeroPreco";
import LaboratorioPreco from "./LaboratorioPreco";
import type { ParametrosDemoPreco } from "@/lib/pricing/demo-homepage";
import type { CenarioDemoPreco } from "@/lib/pricing/demo-homepage.servidor";
import LinkFocoIntencao from "@/components/foco/LinkFocoIntencao";

const PRINCIPIOS = [
  {
    titulo: "Margem não é markup",
    texto:
      "Markup é o que acrescentas ao custo; margem é a fatia do preço líquido que sobra. 40% de markup são 28,6% de margem. As duas aparecem sempre com o nome certo.",
    Icon: Scale,
  },
  {
    titulo: "A margem mede-se no líquido",
    texto:
      "Nunca sobre o preço com IVA. Dividir pelo PVP inflaciona a margem aparente pela taxa e faz o negócio parecer mais saudável do que é.",
    Icon: Coin,
  },
  {
    titulo: "Impostos não são todos iguais",
    texto:
      "O IVA passa pelas tuas mãos e vai para o Estado. A Segurança Social sai da faturação. O IRS depende do regime. Somá-los numa só linha erra o preço.",
    Icon: ShieldCheck,
  },
  {
    titulo: "Um preço impossível diz-se",
    texto:
      "Quando as comissões e a margem pretendida não cabem no mesmo euro, não há preço. A engine devolve o motivo e o teto real, em vez de um número inventado.",
    Icon: Warning,
  },
] as const;

const CAMADAS = [
  {
    rotulo: "Custo",
    titulo: "O que sai do bolso",
    texto: "Materiais, tempo aplicado, desperdício, devoluções e a quota dos custos fixos do mês.",
    tom: "stone",
  },
  {
    rotulo: "Imposto",
    titulo: "O que sai, mas não se negoceia",
    texto: "IVA sobre a venda, Segurança Social sobre a faturação, IRS conforme o regime.",
    tom: "areia",
  },
  {
    rotulo: "Margem",
    titulo: "O que fica para o negócio existir",
    texto: "O que paga o risco, o investimento e os meses fracos. É a última coisa a entrar e a primeira a desaparecer.",
    tom: "brand",
  },
] as const;

const FAQS = [
  {
    pergunta: "Este preço já inclui os meus impostos?",
    resposta:
      "O IVA aparece sempre à parte, porque não é teu — passa por ti e vai para o Estado. A Segurança Social e o IRS entram no cálculo quando indicas que operas a recibos verdes, porque incidem sobre a faturação e reduzem o que te fica de cada venda.",
  },
  {
    pergunta: "Porque é que o preço sobe mais do que a comissão do marketplace?",
    resposta:
      "Porque a comissão incide sobre o total da encomenda, com IVA. Uma comissão de 15% do bruto são 18,45% do líquido, e o preço tem de subir o suficiente para pagar a comissão sobre o novo preço — não sobre o antigo.",
  },
  {
    pergunta: "Estar isento de IVA torna-me mais barato?",
    resposta:
      "Ao consumidor, sim: não liquidas IVA. Mas o Art. 53.º, n.º 3 também te impede de deduzir o IVA das compras, por isso os teus materiais passam a custar o valor com IVA. É outra base de custo, não margem grátis.",
  },
  {
    pergunta: "Posso usar o preço psicológico em vez do recomendado?",
    resposta:
      "Podes, e a ferramenta mostra-o — numa coluna à parte, com o custo em margem já calculado. Nunca substitui o recomendado: 19,90 € é o preço redondo, não necessariamente o preço viável.",
  },
  {
    pergunta: "Preciso de conta para calcular?",
    resposta:
      "Não. O cálculo é gratuito, sem conta e sem email, e os números que introduzes ficam guardados apenas no teu dispositivo.",
  },
] as const;

function MetodoPreco() {
  return (
    <section className="rc-home-deferred rc-home-deferred--large grain bg-sand px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="metodo-preco-titulo">
      <div className="mx-auto max-w-6xl">
        <Reveal className="grid gap-6 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
          <div>
            <div className="eyebrow mb-3 text-brand">O método</div>
            <h2 id="metodo-preco-titulo" className="text-balance font-display display-2 font-semibold text-ink">
              Um preço explica-se ou não vale nada.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-stone-600 lg:justify-self-end">
            Cada euro do preço tem um destino: cobrir um custo, pagar um imposto ou ficar como
            lucro. Se a soma das parcelas não der o preço, o preço está errado — e a ferramenta
            mostra as parcelas precisamente para isso poder ser verificado.
          </p>
        </Reveal>

        <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPIOS.map(({ titulo, texto, Icon }, indice) => (
            <Reveal key={titulo} delay={indice * 0.05}>
              <article className="h-full rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-light text-brand dark:bg-brand/15">
                    <Icon size={18} />
                  </span>
                  <span className="font-mono texto-mini font-semibold text-stone-500 dark:text-stone-400">
                    {String(indice + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold text-ink">{titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">{texto}</p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-8 overflow-hidden rounded-[2rem] border border-stone-100 bg-white shadow-lift dark:border-stone-800 dark:bg-stone-900">
          <div className="border-b border-stone-100 px-5 py-4 dark:border-stone-800 sm:px-7">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-stone-500">
              <Coin size={15} className="text-brand" /> As três camadas de um preço
            </div>
          </div>
          <div className="grid md:grid-cols-3">
            {CAMADAS.map((camada, indice) => {
              const cores =
                camada.tom === "brand"
                  ? "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint"
                  : camada.tom === "areia"
                    ? "bg-categoria-areia-bg text-categoria-areia-text dark:bg-stone-800 dark:text-[#e7c98e]"
                    : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300";
              return (
                <div
                  key={camada.rotulo}
                  className={`p-5 sm:p-7 ${indice > 0 ? "border-t border-stone-100 dark:border-stone-800 md:border-l md:border-t-0" : ""}`}
                >
                  <span className={`inline-flex rounded-full px-3 py-1 texto-micro font-bold uppercase tracking-wide ${cores}`}>
                    {camada.rotulo}
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-stone-800 dark:text-stone-100">{camada.titulo}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-stone-500">{camada.texto}</p>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PercursoPreco() {
  return (
    <section className="rc-home-deferred rc-home-deferred--large px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="percurso-preco-titulo">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-3xl">
          <div className="eyebrow mb-3 text-brand">Depois do preço</div>
          <h2 id="percurso-preco-titulo" className="text-balance font-display display-2 font-semibold text-ink">
            Saber o preço muda a pergunta seguinte.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-600">
            Com um preço que se sustenta, a decisão deixa de ser «quanto cobro» e passa a ser
            «como opero». Recibos verdes e empresa não são etapas uma da outra: são duas
            respostas à mesma pergunta, com custos e proteções diferentes.
          </p>
        </Reveal>

        <div className="mt-9 grid gap-4 lg:grid-cols-[1fr_1fr_1.25fr]">
          <LinkFocoIntencao
            foco="descobrir"
            className="focus-marca group relative rounded-4xl border border-stone-100 bg-white p-5 no-underline shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift dark:border-stone-800 dark:bg-stone-900 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300">
                <Lightbulb size={18} />
              </span>
              <span className="font-mono texto-mini font-bold text-stone-500 dark:text-stone-400">01</span>
            </div>
            <div className="mt-5 texto-micro font-bold uppercase tracking-[.14em] text-stone-400">Antes</div>
            <h3 className="mt-1 font-display text-xl font-semibold text-ink">Descobrir</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              Escolher uma hipótese e tentar refutá-la com clientes reais.
            </p>
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand transition-transform group-hover:translate-x-1">
              Voltar atrás <ArrowRight size={13} />
            </div>
          </LinkFocoIntencao>

          <div className="relative rounded-4xl border border-brand bg-brand-light p-5 shadow-card dark:bg-brand/15 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-white">
                <Coin size={18} />
              </span>
              <span className="font-mono texto-mini font-bold text-brand-dark dark:text-brand-mint">02</span>
            </div>
            <div className="mt-5 texto-micro font-bold uppercase tracking-[.14em] text-brand">Agora</div>
            <h3 className="mt-1 font-display text-xl font-semibold text-ink">Definir o preço</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Transformar custos, tempo, impostos e margem num valor que aguenta o negócio.
            </p>
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-dark dark:text-brand-mint">
              <Check size={13} /> Estás aqui
            </div>
          </div>

          <div className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5">
            <div className="px-1">
              <div className="texto-micro font-bold uppercase tracking-[.14em] text-stone-400">
                03 · Escolher estrutura
              </div>
              <h3 className="mt-1 font-display text-xl font-semibold text-ink">O percurso bifurca aqui.</h3>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Link
                href="/ferramentas/recibos-verdes"
                className="focus-marca group rounded-3xl border border-stone-200 bg-stone-50 p-4 no-underline transition-colors hover:border-brand/40 dark:border-stone-700 dark:bg-stone-800"
              >
                <Receipt size={18} className="text-brand" />
                <div className="mt-3 text-sm font-semibold text-stone-800 dark:text-stone-100">Recibos verdes</div>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  Começar simples e perceber quanto reservar.
                </p>
                <ArrowRight
                  size={13}
                  className="mt-3 text-stone-400 transition-transform group-hover:translate-x-1 group-hover:text-brand"
                />
              </Link>
              <Link
                href="/ferramentas/simulador-empresa"
                className="focus-marca group rounded-3xl border border-stone-200 bg-stone-50 p-4 no-underline transition-colors hover:border-brand/40 dark:border-stone-700 dark:bg-stone-800"
              >
                <Building size={18} className="text-brand" />
                <div className="mt-3 text-sm font-semibold text-stone-800 dark:text-stone-100">Empresa</div>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  Testar se a operação sustenta uma sociedade.
                </p>
                <ArrowRight
                  size={13}
                  className="mt-3 text-stone-400 transition-transform group-hover:translate-x-1 group-hover:text-brand"
                />
              </Link>
            </div>
            <Link
              href="/ferramentas/comparar-regimes"
              className="focus-marca mt-3 inline-flex min-h-[40px] items-center gap-1.5 px-1 text-xs font-semibold text-brand no-underline hover:text-brand-dark"
            >
              <Scale size={13} /> Comparar os dois lado a lado
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4 rounded-4xl border border-dashed border-stone-300 px-5 py-4 dark:border-stone-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300">
              <Briefcase size={17} />
            </span>
            <div>
              <div className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                Salário é um percurso paralelo
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
                Pode coexistir com o negócio; não é a etapa seguinte de lhe pôr preço.
              </p>
            </div>
          </div>
          <Link
            href="/ferramentas/recibo-vencimento"
            className="focus-marca inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 no-underline hover:border-brand/40 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
          >
            Simular salário <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function FontesPreco() {
  return (
    <section className="rc-home-deferred rc-home-deferred--medium grain bg-sand px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="fontes-preco-titulo">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
        <Reveal>
          <div className="eyebrow mb-3 text-brand">Fontes e limites</div>
          <h2 id="fontes-preco-titulo" className="text-balance font-display display-2 font-semibold text-ink">
            A lei entra com a data. O preçário também.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-stone-600">
            As taxas vêm do código aplicável; as comissões de canal vêm do preçário do próprio
            canal, com a data em que foi verificado. Um pressuposto de mercado sem data envelhece
            em silêncio, por isso o build falha quando algum passa de 400 dias por confirmar.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 texto-mini font-semibold text-stone-600">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 dark:border-stone-700 dark:bg-stone-900">
              <Lock size={12} className="text-brand" /> Os teus números não saem do dispositivo
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 dark:border-stone-700 dark:bg-stone-900">
              <ShieldCheck size={12} className="text-brand" /> Proveniência por linha
            </span>
          </div>
        </Reveal>

        <div className="grid gap-3 sm:grid-cols-3">
          <Reveal>
            <a
              href="https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/codigo-do-iva-indice.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="focus-marca group flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-5 no-underline shadow-card transition-shadow hover:shadow-lift dark:border-stone-800 dark:bg-stone-900"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-brand">CIVA</span>
                <ExternalLink size={13} className="text-stone-400 group-hover:text-brand" />
              </div>
              <h3 className="mt-5 text-sm font-semibold text-stone-800 dark:text-stone-100">
                Taxas e isenções
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-500">
                Art. 18.º para as taxas por região e escalão; Art. 53.º para a isenção e para o
                que ela custa na dedução.
              </p>
            </a>
          </Reveal>
          <Reveal delay={0.05}>
            <a
              href="https://www.seg-social.pt/trabalhadores-independentes"
              target="_blank"
              rel="noopener noreferrer"
              className="focus-marca group flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-5 no-underline shadow-card transition-shadow hover:shadow-lift dark:border-stone-800 dark:bg-stone-900"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-brand">
                  Segurança Social
                </span>
                <ExternalLink size={13} className="text-stone-400 group-hover:text-brand" />
              </div>
              <h3 className="mt-5 text-sm font-semibold text-stone-800 dark:text-stone-100">
                A contribuição do independente
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-500">
                Incide sobre o rendimento relevante apurado da faturação — não sobre o lucro. É
                por isso que entra antes de o preço estar resolvido.
              </p>
            </a>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="flex h-full flex-col rounded-4xl border border-brand/30 bg-brand-light p-5 shadow-card dark:bg-brand/15">
              <div className="text-xs font-bold uppercase tracking-wider text-brand-dark dark:text-brand-mint">
                O que não inventamos
              </div>
              <h3 className="mt-5 text-sm font-semibold text-stone-800 dark:text-stone-100">
                Preço de mercado
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                Sem fonte fiável para o teu setor e para a tua zona, o ReciboCerto diz que não tem
                dados — em vez de desenhar uma faixa plausível que ninguém mediu.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FAQPreco() {
  return (
    <section className="rc-home-deferred rc-home-deferred--medium px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="faq-preco-titulo">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <div className="eyebrow mb-3 text-brand">Antes de cobrar</div>
          <h2 id="faq-preco-titulo" className="font-display display-2 font-semibold text-ink">
            As perguntas que mudam o número.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-600">
            Cinco confusões comuns que fazem a diferença entre um preço que sustenta o negócio e
            um que o consome devagar.
          </p>
        </Reveal>
        <div className="mt-9 space-y-3">
          {FAQS.map((faq) => (
            <details
              key={faq.pergunta}
              className="group rounded-3xl border border-stone-200 bg-white shadow-card open:border-brand dark:border-stone-700 dark:bg-stone-900"
            >
              <summary className="focus-marca flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-4 rounded-3xl px-5 py-4 text-sm font-semibold text-stone-800 dark:text-stone-100">
                {faq.pergunta}
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-transform group-open:rotate-45 group-open:bg-brand group-open:text-white dark:bg-stone-800">
                  <Plus size={12} />
                </span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-stone-500">{faq.resposta}</p>
            </details>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/ferramentas/calcular-preco"
            className="focus-marca inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-semibold text-white no-underline shadow-glow transition-shadow hover:shadow-float"
          >
            Calcular o meu preço <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function HomepagePreco({
  parametros,
  cenarios,
}: {
  parametros: ParametrosDemoPreco;
  cenarios: CenarioDemoPreco[];
}) {
  return (
    <>
      <HeroPreco parametros={parametros} />
      <LaboratorioPreco cenarios={cenarios} />
      <MetodoPreco />
      <PercursoPreco />
      <section className="rc-home-deferred rc-home-deferred--compact px-4 pb-8 sm:px-6 sm:pb-12">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-7">
          <FilaPilares />
        </div>
      </section>
      <Precos />
      <FAQPreco />
      <FontesPreco />
      {/* A bússola fecha a leitura. Quem chegou aqui já sabe uma coisa;
          isto diz-lhe que há outras quatro e qual é a pergunta de cada
          uma — sem o obrigar a subir ao cabeçalho para descobrir. */}
      <section className="rc-home-deferred rc-home-deferred--compact px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-6xl">
          <Bussola
            excepto="preco"
            compacta
            titulo="E as outras quatro?"
            nota="Cada uma responde ao que este ecrã não responde."
          />
        </div>
      </section>
    </>
  );
}
