import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building,
  Check,
  Coin,
  Crosshair,
  ExternalLink,
  Lightbulb,
  Lock,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Warning,
} from "@/components/ui/Icons";
import Reveal from "@/components/ui/Reveal";
import FilaPilares from "@/components/navegacao/FilaPilares";
import Precos from "@/components/Precos";
import Bussola from "@/components/foco/Bussola";
import HeroDescobrir, { type ExemploDescoberta } from "./HeroDescobrir";
import LaboratorioDescobrir from "./LaboratorioDescobrir";
import BifurcacaoDescobrir from "./BifurcacaoDescobrir";

const PRINCIPIOS = [
  {
    titulo: "Compatibilidade pessoal",
    texto: "O que sabes fazer, o tempo que tens, os meios disponíveis e aquilo que recusas entram antes da recomendação.",
    Icon: Crosshair,
  },
  {
    titulo: "Evidência separada",
    texto: "Um dado oficial descreve contexto. Não é transformado em procura nem em vontade de pagar por conveniência.",
    Icon: Search,
  },
  {
    titulo: "Viabilidade explícita",
    texto: "Capital, prazo até à receita, preço sustentável, requisitos e riscos aparecem em dimensões diferentes.",
    Icon: ShieldCheck,
  },
  {
    titulo: "Teste que pode falhar",
    texto: "Cada hipótese acaba numa ação observável e num critério para parar. Se nada a conseguir refutar, não é um teste.",
    Icon: Warning,
  },
] as const;

const ESTADOS_DA_VERDADE = [
  {
    rotulo: "Observado",
    titulo: "O que a fonte realmente mediu",
    texto: "Vem com origem, período, geografia, unidade, licença e data de consulta.",
    tom: "brand",
  },
  {
    rotulo: "Estimado",
    titulo: "O que deriva da estrutura do modelo",
    texto: "Traz a hipótese usada e a limitação. Nunca se veste de dado de mercado.",
    tom: "areia",
  },
  {
    rotulo: "Em falta",
    titulo: "O que ainda precisa de investigação",
    texto: "A lacuna fica visível e transforma-se numa pergunta de entrevista, orçamento ou piloto.",
    tom: "clay",
  },
] as const;

const FAQS = [
  {
    pergunta: "O motor escolhe um negócio por mim?",
    resposta:
      "Não. Compõe hipóteses a partir do teu contexto, mostra o que ficou de fora e entrega testes para reduzires incerteza. A decisão continua a ser tua.",
  },
  {
    pergunta: "Um sinal oficial prova que existem clientes?",
    resposta:
      "Não. INE e Eurostat ajudam a descrever o território e o setor. A disposição a pagar só se confirma localmente, idealmente com um piloto pago.",
  },
  {
    pergunta: "Tenho de indicar a minha morada?",
    resposta:
      "Não. O concelho é opcional, nunca pedimos a morada, e o contexto pessoal fica guardado apenas no teu dispositivo.",
  },
  {
    pergunta: "O que acontece quando uma fonte falha?",
    resposta:
      "A dimensão fica marcada como indisponível ou por apurar. O ReciboCerto não inventa um valor de fallback para manter o cartão bonito.",
  },
] as const;

function MetodoDescobrir() {
  return (
    <section className="rc-home-deferred rc-home-deferred--large grain bg-sand px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="metodo-descobrir-titulo">
      <div className="mx-auto max-w-6xl">
        <Reveal className="grid gap-6 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
          <div>
            <div className="eyebrow mb-3 text-brand">O método</div>
            <h2 id="metodo-descobrir-titulo" className="text-balance font-display display-2 font-semibold text-ink">
              O motor tenta contrariar-te antes de te entusiasmar.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-stone-600 lg:justify-self-end">
            Uma ideia sobe porque sobrevive a restrições, tem alguma sustentação e permite um teste barato — não porque recebeu uma percentagem opaca.
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
              <ShieldCheck size={15} className="text-brand" /> Três estados da verdade
            </div>
          </div>
          <div className="grid md:grid-cols-3">
            {ESTADOS_DA_VERDADE.map((estado, indice) => {
              const cores =
                estado.tom === "brand"
                  ? "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint"
                  : estado.tom === "areia"
                    ? "bg-categoria-areia-bg text-categoria-areia-text dark:bg-stone-800 dark:text-[#e7c98e]"
                    : "bg-clay-bg text-clay-text dark:bg-stone-800 dark:text-[#e7b59f]";
              return (
                <div
                  key={estado.rotulo}
                  className={`p-5 sm:p-7 ${indice > 0 ? "border-t border-stone-100 dark:border-stone-800 md:border-l md:border-t-0" : ""}`}
                >
                  <span className={`inline-flex rounded-full px-3 py-1 texto-micro font-bold uppercase tracking-wide ${cores}`}>
                    {estado.rotulo}
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-stone-800 dark:text-stone-100">{estado.titulo}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-stone-500">{estado.texto}</p>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PercursoDescobrir() {
  return (
    <section className="rc-home-deferred rc-home-deferred--large px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="percurso-descobrir-titulo">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-3xl">
          <div className="eyebrow mb-3 text-brand">Depois da hipótese</div>
          <h2 id="percurso-descobrir-titulo" className="text-balance font-display display-2 font-semibold text-ink">
            Descobrir é o princípio da decisão, não o fim da página.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-600">
            Primeiro validas o problema. Depois descobres se o preço aguenta. Só então escolhes a forma de operar.
            Salário permanece um percurso paralelo, porque não é uma etapa de abrir negócio.
          </p>
        </Reveal>

        <div className="mt-9 grid gap-4 lg:grid-cols-[1fr_1fr_1.25fr]">
          <div className="relative rounded-4xl border border-brand bg-brand-light p-5 shadow-card dark:bg-brand/15 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-white"><Lightbulb size={18} /></span>
              <span className="font-mono texto-mini font-bold text-brand-dark dark:text-brand-mint">01</span>
            </div>
            <div className="mt-5 texto-micro font-bold uppercase tracking-[.14em] text-brand">Agora</div>
            <h3 className="mt-1 font-display text-xl font-semibold text-ink">Descobrir</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">Escolher uma hipótese e tentar refutá-la com clientes reais.</p>
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-dark dark:text-brand-mint">
              <Check size={13} /> Estás aqui
            </div>
          </div>

          <Link
            href="/ferramentas/calcular-preco"
            className="focus-marca group relative rounded-4xl border border-stone-100 bg-white p-5 no-underline shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift dark:border-stone-800 dark:bg-stone-900 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-categoria-areia-bg text-categoria-areia-text dark:bg-stone-800 dark:text-[#e7c98e]"><Coin size={18} /></span>
              <span className="font-mono texto-mini font-bold text-stone-500 dark:text-stone-400">02</span>
            </div>
            <div className="mt-5 texto-micro font-bold uppercase tracking-[.14em] text-stone-400">Se passar o teste</div>
            <h3 className="mt-1 font-display text-xl font-semibold text-ink">Definir o preço</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">Transformar tempo, custos, impostos e margem num preço sustentável.</p>
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand transition-transform group-hover:translate-x-1">
              Abrir calculadora <ArrowRight size={13} />
            </div>
          </Link>

          <div className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5">
            <div className="flex items-center justify-between px-1">
              <div>
                <div className="texto-micro font-bold uppercase tracking-[.14em] text-stone-400">03 · Escolher estrutura</div>
                <h3 className="mt-1 font-display text-xl font-semibold text-ink">O percurso bifurca aqui.</h3>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Link
                href="/ferramentas/recibos-verdes"
                className="focus-marca group rounded-3xl border border-stone-200 bg-stone-50 p-4 no-underline transition-colors hover:border-brand/40 dark:border-stone-700 dark:bg-stone-800"
              >
                <Receipt size={18} className="text-brand" />
                <div className="mt-3 text-sm font-semibold text-stone-800 dark:text-stone-100">Recibos verdes</div>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">Começar simples e perceber quanto reservar.</p>
                <ArrowRight size={13} className="mt-3 text-stone-400 transition-transform group-hover:translate-x-1 group-hover:text-brand" />
              </Link>
              <Link
                href="/ferramentas/simulador-empresa"
                className="focus-marca group rounded-3xl border border-stone-200 bg-stone-50 p-4 no-underline transition-colors hover:border-brand/40 dark:border-stone-700 dark:bg-stone-800"
              >
                <Building size={18} className="text-brand" />
                <div className="mt-3 text-sm font-semibold text-stone-800 dark:text-stone-100">Empresa</div>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">Testar se a operação sustenta uma sociedade.</p>
                <ArrowRight size={13} className="mt-3 text-stone-400 transition-transform group-hover:translate-x-1 group-hover:text-brand" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4 rounded-4xl border border-dashed border-stone-300 px-5 py-4 dark:border-stone-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300"><Briefcase size={17} /></span>
            <div>
              <div className="text-sm font-semibold text-stone-700 dark:text-stone-200">Salário é um percurso paralelo</div>
              <p className="mt-0.5 text-xs leading-relaxed text-stone-500">Pode coexistir com um negócio; não aparece como a etapa seguinte de o criar.</p>
            </div>
          </div>
          <Link href="/ferramentas/recibo-vencimento" className="focus-marca inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 no-underline hover:border-brand/40 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200">
            Simular salário <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function FontesDescobrir() {
  return (
    <section className="rc-home-deferred rc-home-deferred--medium grain bg-sand px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="fontes-descobrir-titulo">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
        <Reveal>
          <div className="eyebrow mb-3 text-brand">Fontes e limites</div>
          <h2 id="fontes-descobrir-titulo" className="text-balance font-display display-2 font-semibold text-ink">
            A fonte entra com o número. A limitação entra ao lado.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-stone-600">
            Se a série não mede intenção de compra, o ReciboCerto não diz que mede. Se uma fonte falha,
            o valor desaparece e a incerteza sobe — não há um fallback “plausível”.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 texto-mini font-semibold text-stone-600">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 dark:border-stone-700 dark:bg-stone-900"><Lock size={12} className="text-brand" /> Sem dados pessoais no servidor</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 dark:border-stone-700 dark:bg-stone-900"><ShieldCheck size={12} className="text-brand" /> Proveniência por leitura</span>
          </div>
        </Reveal>

        <div className="grid gap-3 sm:grid-cols-3">
          <Reveal>
            <a
              href="https://www.ine.pt/xportal/xmain?xpgid=ine_main&xpid=INE"
              target="_blank"
              rel="noopener noreferrer"
              className="focus-marca group flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-5 no-underline shadow-card transition-shadow hover:shadow-lift dark:border-stone-800 dark:bg-stone-900"
            >
              <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-brand">INE</span><ExternalLink size={13} className="text-stone-400 group-hover:text-brand" /></div>
              <h3 className="mt-5 text-sm font-semibold text-stone-800 dark:text-stone-100">Empresas, população e território</h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-500">Leituras regionais e locais, sempre com o período e a unidade originais.</p>
            </a>
          </Reveal>
          <Reveal delay={0.05}>
            <a
              href="https://ec.europa.eu/eurostat"
              target="_blank"
              rel="noopener noreferrer"
              className="focus-marca group flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-5 no-underline shadow-card transition-shadow hover:shadow-lift dark:border-stone-800 dark:bg-stone-900"
            >
              <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-brand">Eurostat</span><ExternalLink size={13} className="text-stone-400 group-hover:text-brand" /></div>
              <h3 className="mt-5 text-sm font-semibold text-stone-800 dark:text-stone-100">Contexto comparável</h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-500">Indicadores europeus usados como contexto, nunca como prova automática de procura local.</p>
            </a>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="flex h-full flex-col rounded-4xl border border-brand/30 bg-brand-light p-5 shadow-card dark:bg-brand/15">
              <div className="text-xs font-bold uppercase tracking-wider text-brand-dark dark:text-brand-mint">Prova local</div>
              <h3 className="mt-5 text-sm font-semibold text-stone-800 dark:text-stone-100">Entrevista, orçamento e piloto</h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">É aqui que a vontade de pagar deixa de ser hipótese. Nenhuma estatística substitui esta etapa.</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FAQDescobrir() {
  return (
    <section className="rc-home-deferred rc-home-deferred--medium px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="faq-descobrir-titulo">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <div className="eyebrow mb-3 text-brand">Antes de começar</div>
          <h2 id="faq-descobrir-titulo" className="font-display display-2 font-semibold text-ink">As promessas que o motor não faz.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-600">
            Ser útil aqui exige dizer com clareza onde termina a evidência e começa a decisão.
          </p>
        </Reveal>
        <div className="mt-9 space-y-3">
          {FAQS.map((faq) => (
            <details key={faq.pergunta} className="group rounded-3xl border border-stone-200 bg-white shadow-card open:border-brand dark:border-stone-700 dark:bg-stone-900">
              <summary className="focus-marca flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-4 rounded-3xl px-5 py-4 text-sm font-semibold text-stone-800 dark:text-stone-100">
                {faq.pergunta}
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-transform group-open:rotate-45 group-open:bg-brand group-open:text-white dark:bg-stone-800"><Plus size={12} /></span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-stone-500">{faq.resposta}</p>
            </details>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/ferramentas/descobrir-negocio" className="focus-marca inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-semibold text-white no-underline shadow-glow transition-shadow hover:shadow-float">
            Construir a minha primeira hipótese <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function HomepageDescobrir({ exemplo }: { exemplo: ExemploDescoberta }) {
  return (
    <>
      <HeroDescobrir exemplo={exemplo} />
      <LaboratorioDescobrir exemplo={exemplo} />
      <MetodoDescobrir />
      <PercursoDescobrir />
      <section className="rc-home-deferred rc-home-deferred--compact px-4 pb-8 sm:px-6 sm:pb-12">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-7">
          <FilaPilares />
        </div>
      </section>
      <Precos />
      <FAQDescobrir />
      {/* O «Comparar cenários» que era um botão do cartão de audiência.
          Fica entre o FAQ e as Fontes porque é o último ato da LEITURA —
          a pergunta que só existe depois de haver uma hipótese. */}
      <BifurcacaoDescobrir />
      <FontesDescobrir />
      {/* A bússola fecha a leitura. Quem chegou aqui já sabe uma coisa;
          isto diz-lhe que há outras quatro e qual é a pergunta de cada
          uma — sem o obrigar a subir ao cabeçalho para descobrir. */}
      <section className="rc-home-deferred rc-home-deferred--compact px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-6xl">
          <Bussola
            excepto="descobrir"
            compacta
            titulo="E as outras quatro?"
            nota="Cada uma responde ao que este ecrã não responde."
          />
        </div>
      </section>
    </>
  );
}
