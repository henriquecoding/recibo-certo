import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Coin,
  ExternalLink,
  Lightbulb,
  Lock,
  Receipt,
  Scale,
  ShieldCheck,
  Warning,
} from "@/components/ui/Icons";
import Reveal from "@/components/ui/Reveal";
import FilaPilares from "@/components/navegacao/FilaPilares";
import PassoSeguinteHomepage from "@/components/parcerias/PassoSeguinteHomepage";
import Precos from "@/components/Precos";
import HeroFoco from "@/components/foco/HeroFoco";
import Bussola from "@/components/foco/Bussola";
import CartaoContratacao from "@/components/foco/CartaoContratacao";
import SeccaoFoco, { CartaoMetodo, FaqFoco } from "@/components/foco/SeccaoFoco";
import { FOCO_POR_ID } from "@/components/foco/focos";
import LinkFocoIntencao from "@/components/foco/LinkFocoIntencao";
import PalcoRecibos, { type DadosReciboHomepage } from "./PalcoRecibos";
import { PrazoSSTexto } from "./PrazoSSAtual";

const eur = (n: number) =>
  `${n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

const PRINCIPIOS = [
  {
    titulo: "O bruto não é teu",
    texto:
      "De cada recibo saem duas coisas antes de qualquer decisão tua: a retenção de IRS, que o cliente entrega, e a Segurança Social, que pagas tu no trimestre seguinte.",
    Icon: Receipt,
  },
  {
    titulo: "A parte que tem data é a perigosa",
    texto:
      "A retenção já saiu quando recebes. A Segurança Social não — fica na tua conta a parecer tua até ao dia em que não está.",
    Icon: Calendar,
  },
  {
    titulo: "Reservar não é poupar",
    texto:
      "O que separas para os impostos não é uma poupança: é dinheiro que já tem dono. Tratá-lo como margem é a forma mais comum de entrar em dívida sem gastar de mais.",
    Icon: Lock,
  },
  {
    titulo: "O primeiro ano é diferente",
    texto:
      "Nos primeiros doze meses de atividade há isenção de Segurança Social e a retenção pode ser dispensada. Aplicar as regras do segundo ano ao primeiro assusta sem motivo.",
    Icon: ShieldCheck,
  },
] as const;

const FAQS = [
  {
    pergunta: "Porque é que a Segurança Social não sai do recibo?",
    resposta:
      "Porque não é uma retenção: é uma contribuição tua, calculada sobre o rendimento relevante do trimestre e paga entre o dia 10 e o dia 20 do mês seguinte a cada trimestre. O cliente não a entrega por ti — chega à tua conta e sai de lá mais tarde.",
  },
  {
    pergunta: "A retenção de IRS é um imposto a mais?",
    resposta:
      "Não. É um adiantamento do IRS do ano. Se no acerto tiveres retido a mais, é devolvido; se tiveres retido a menos, pagas a diferença. O que muda não é quanto pagas no total — é quando.",
  },
  {
    pergunta: "Posso pedir dispensa de retenção?",
    resposta:
      "Podes, se previres não ultrapassar o limite anual previsto no Art. 101.º-B do CIRS. Só que a dispensa não reduz o imposto: adia-o inteiro para o acerto. Quem a pede sem reservar recebe a fatura toda de uma vez.",
  },
  {
    pergunta: "E o IVA, entra nesta conta?",
    resposta:
      "Só se não estiveres isento pelo Art. 53.º. Quando entra, não é receita tua em momento nenhum: é liquidado ao cliente e entregue ao Estado, e por isso aparece sempre à parte do que fica contigo.",
  },
  {
    pergunta: "Preciso de conta para calcular?",
    resposta:
      "Não. O cálculo é gratuito, sem conta e sem email, e os valores que introduzes ficam guardados apenas no teu dispositivo.",
  },
] as const;

export default function HomepageRecibos({ dados }: { dados: DadosReciboHomepage }) {
  const foco = FOCO_POR_ID.get("recibos")!;
  const reservado = dados.retencaoIRS + dados.segSocial;
  const pct = Math.round((dados.liquido / dados.bruto) * 100);
  const prazos = "prazosSS" in dados ? dados.prazosSS : undefined;
  const prazoEstatico = "prazoSS" in dados ? dados.prazoSS : undefined;

  return (
    <>
      <HeroFoco
        foco={foco}
        ancora="#metodo-recibos"
        rotuloAncora="Ver o que sai e quando"
        selos={[
          { Icon: Lock, texto: "Os teus valores ficam neste dispositivo" },
          { Icon: ShieldCheck, texto: "Base legal em cada linha" },
        ]}
      >
        <PalcoRecibos dados={dados} />
      </HeroFoco>

      {/* ── Método ──────────────────────────────────────────────── */}
      <SeccaoFoco
        id="metodo-recibos"
        fundo="areia"
        sobrancelha="O método"
        titulo="Um recibo tem três donos, e só um és tu."
        intro="A conta não é difícil. O que engana é o calendário: uma das partes sai na hora e a outra fica meses à espera na tua conta, indistinguível do resto."
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
              <Coin size={15} className="text-brand" /> Um recibo de {eur(dados.bruto)}, repartido
            </div>
          </div>
          <div className="grid md:grid-cols-3">
            {[
              {
                rotulo: "Fica contigo",
                valor: dados.liquido,
                texto: `${pct}% do recibo. É com isto que vives e é isto que devias tratar como receita.`,
                cores: "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint",
              },
              {
                rotulo: "Retenção de IRS",
                valor: dados.retencaoIRS,
                texto:
                  "Sai na hora, entregue pelo cliente. Adiantamento do imposto do ano, acertado na declaração.",
                cores: "bg-clay-bg text-clay-text",
              },
              {
                rotulo: "Segurança Social",
                valor: dados.segSocial,
                texto: (
                  <>
                    Fica na tua conta até{" "}
                    <PrazoSSTexto
                      prazos={prazos}
                      valor={prazoEstatico}
                      fallback="ao próximo dia 20"
                    />
                    . É esta a parte que apanha as pessoas.
                  </>
                ),
                cores:
                  "bg-categoria-areia-bg text-categoria-areia-text dark:bg-stone-800 dark:text-[#e7c98e]",
              },
            ].map((parte, indice) => (
              <div
                key={parte.rotulo}
                className={`p-5 sm:p-7 ${indice > 0 ? "border-t border-stone-100 dark:border-stone-800 md:border-l md:border-t-0" : ""}`}
              >
                <span
                  className={`inline-flex rounded-full px-3 py-1 texto-micro font-bold uppercase tracking-wide ${parte.cores}`}
                >
                  {parte.rotulo}
                </span>
                <div className="mt-4 font-display text-2xl font-semibold tabular-nums text-ink">
                  {eur(parte.valor)}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-stone-500">{parte.texto}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </SeccaoFoco>

      {/* ── Percurso ────────────────────────────────────────────── */}
      <SeccaoFoco
        id="percurso-recibos"
        fundo="branco"
        sobrancelha="Depois do recibo"
        titulo="Saber o que fica muda a pergunta seguinte."
        intro="Com a repartição à vista, a decisão deixa de ser «quanto recebi» e passa a ser «isto sustenta-se?». Duas perguntas se abrem, e não são a mesma — e há uma terceira, mais adiante, para quando o trabalho deixar de caber numa pessoa."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <LinkFocoIntencao
            foco="preco"
            className="focus-marca group rounded-4xl border border-stone-100 bg-white p-5 no-underline shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift dark:border-stone-800 dark:bg-stone-900 sm:p-6"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300">
              <Coin size={18} />
            </span>
            <div className="mt-5 texto-micro font-bold uppercase tracking-[.14em] text-stone-400">
              Se o que fica não chega
            </div>
            <h3 className="mt-1 font-display text-xl font-semibold text-ink">Rever o preço</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              O líquido baixo quase nunca é um problema de impostos: é um preço formado sem os
              contar.
            </p>
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand transition-transform group-hover:translate-x-1">
              Formar o preço <ArrowRight size={13} />
            </div>
          </LinkFocoIntencao>

          <LinkFocoIntencao
            foco="empresa"
            className="focus-marca group rounded-4xl border border-stone-100 bg-white p-5 no-underline shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift dark:border-stone-800 dark:bg-stone-900 sm:p-6"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300">
              <Scale size={18} />
            </span>
            <div className="mt-5 texto-micro font-bold uppercase tracking-[.14em] text-stone-400">
              Se a faturação cresceu
            </div>
            <h3 className="mt-1 font-display text-xl font-semibold text-ink">
              Ver se compensa empresa
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              A partir de certa faturação, o simplificado deixa de ser o mais eficiente — e há um
              número que diz onde.
            </p>
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand transition-transform group-hover:translate-x-1">
              Ver o ponto de viragem <ArrowRight size={13} />
            </div>
          </LinkFocoIntencao>

          <div className="rounded-4xl border border-brand bg-brand-light p-5 shadow-card dark:bg-brand/15 sm:p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-white">
              <Calendar size={18} />
            </span>
            <div className="mt-5 texto-micro font-bold uppercase tracking-[.14em] text-brand">
              A seguir, na prática
            </div>
            <h3 className="mt-1 font-display text-xl font-semibold text-ink">
              Reservar {eur(reservado)}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Separa hoje o que não é teu. A Segurança Social deste recibo sai até{" "}
              <PrazoSSTexto
                prazos={prazos}
                valor={prazoEstatico}
                fallback="no próximo dia 20"
              />
              , e esse dia chega na mesma se te esqueceres.
            </p>
            <Link
              href="/ferramentas/recibos-verdes"
              className="focus-marca mt-5 inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-brand-dark no-underline dark:text-brand-mint"
            >
              Calcular com os meus números <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div className="mt-4">
          <CartaoContratacao origem="recibos" />
        </div>

        <div className="mt-3 flex flex-col gap-4 rounded-4xl border border-dashed border-stone-300 px-5 py-4 dark:border-stone-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300">
              <Lightbulb size={17} />
            </span>
            <div>
              <div className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                Ainda não decidiste o que vais fazer?
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
                Os recibos verdes são a forma; a hipótese vem antes dela.
              </p>
            </div>
          </div>
          <LinkFocoIntencao
            foco="descobrir"
            className="focus-marca inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 no-underline hover:border-brand/40 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
          >
            Descobrir o que testar <ArrowRight size={13} />
          </LinkFocoIntencao>
        </div>
      </SeccaoFoco>

      {/* Onde acabamos nós, quando é caso para um contabilista, e o cartaz do
          parceiro na faixa que é dele. Aqui, no fim do arco de próximos
          passos — e não no fundo da página, onde ninguém chegava. */}
      <PassoSeguinteHomepage superficie="demo.hero.faixa" />

      <section className="rc-home-deferred rc-home-deferred--compact px-4 pb-8 sm:px-6 sm:pb-12">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-7">
          <FilaPilares />
        </div>
      </section>

      <Precos />

      <FaqFoco
        id="faq-recibos"
        sobrancelha="Antes de gastar"
        titulo="As perguntas que mudam o que sobra."
        intro="Cinco confusões comuns entre o que já saiu, o que ainda vai sair e o que nunca foi teu."
        perguntas={FAQS}
        cta={{ href: "/ferramentas/recibos-verdes", rotulo: "Calcular o meu recibo" }}
      />

      {/* ── Fontes ──────────────────────────────────────────────── */}
      <SeccaoFoco
        id="fontes-recibos"
        fundo="areia"
        sobrancelha="Fontes e limites"
        titulo="Cada linha tem um artigo, e uma data."
        intro="As taxas e os prazos vêm do código aplicável e da Segurança Social, com a data em que foram verificados. O build falha se algum valor ficar inconsistente com a sua fonte."
        larguraTitulo="max-w-2xl"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              sigla: "CIRS",
              titulo: "Retenção na fonte",
              texto:
                "Art. 101.º para as taxas de retenção da categoria B; Art. 101.º-B para a dispensa e o limite que a permite.",
              href: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/codigo-do-irs-indice.aspx",
            },
            {
              sigla: "Segurança Social",
              titulo: "Contribuição do independente",
              texto:
                "Taxa de 21,4% sobre o rendimento relevante — 70% dos serviços prestados —, declarada e paga trimestralmente.",
              href: "https://www.seg-social.pt/trabalhadores-independentes",
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
                <Warning size={12} /> O que não fazemos
              </div>
              <h3 className="mt-5 text-sm font-semibold text-stone-800 dark:text-stone-100">
                Dizer-te que não pagues
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                A demonstração mostra o que sai e quando. Não sugere dispensas, regimes ou
                estruturas para pagar menos — isso é uma conversa com um contabilista, com o teu
                caso à frente.
              </p>
            </div>
          </Reveal>
        </div>
      </SeccaoFoco>

      {/* A bússola fecha a leitura. Quem chegou aqui já sabe uma coisa;
          isto diz-lhe que há outras quatro e qual é a pergunta de cada
          uma — sem o obrigar a subir ao cabeçalho para descobrir. */}
      <section className="rc-home-deferred rc-home-deferred--compact px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-6xl">
          <Bussola
            excepto="recibos"
            compacta
            titulo="E as outras quatro?"
            nota="Cada uma responde ao que este ecrã não responde."
          />
        </div>
      </section>
    </>
  );
}
