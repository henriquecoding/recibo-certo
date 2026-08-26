import Link from "next/link";
import { ArrowRight, Briefcase, Building, Receipt, Scale } from "@/components/ui/Icons";
import Reveal from "@/components/ui/Reveal";

// ═══════════════════════════════════════════════════════════════════════
//  «E SOB QUE FORMA TESTAS ISTO?» — o comparador, dentro de Descobrir
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE É QUE O «COMPARAR CENÁRIOS» ACABA AQUI                       │
//  │                                                                     │
//  │ Era um quarto botão do cartão de audiência: «Gostaria de: Abrir     │
//  │ empresa / Comparar cenários». Comparar regimes antes de saber o     │
//  │ que se vai fazer é comparar impostos sobre um rendimento que ainda  │
//  │ não existe — e é o que aquele botão convidava a fazer.              │
//  │                                                                     │
//  │ A sequência real da decisão é: o que abrir → sob que forma →        │
//  │ quanto cobrar. Depois de a mesa de decisão entregar uma hipótese,   │
//  │ «sob que forma testo isto?» é a pergunta que a pessoa tem mesmo, e  │
//  │ é aí que a escolha deve aparecer — sequenciada depois do contexto   │
//  │ que a torna decidível, e não antes dele.                            │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ── A regra anti-duplicação ──────────────────────────────────────────
//
//  O comparador passa a existir em dois sítios, e é assim que se começa a
//  duplicar conteúdo entre secções. Por isso a regra é dura:
//
//    AQUI  · raso   · «sob que forma testo isto?»  · SEM controlos
//    /?foco=empresa · fundo · «a partir de quando compensa?» · com tudo
//
//  Nunca o mesmo bloco duas vezes: um é uma bifurcação qualitativa que
//  fecha uma leitura, o outro é a leitura inteira. Os dois apontam para
//  `/ferramentas/comparar-regimes`, que continua a ser a rota completa.
//
//  Este componente NÃO tem estado, NÃO tem entradas e NÃO mostra um número
//  comparável — de propósito. No instante em que ganhar um controlo, passa
//  a ser o outro bloco escrito outra vez.
// ═══════════════════════════════════════════════════════════════════════

const FORMAS = [
  {
    id: "recibos",
    Icon: Receipt,
    titulo: "Recibos verdes",
    resumo: "Abrir atividade nas Finanças e emitir. É o caminho mais curto entre a hipótese e o primeiro cliente pagante.",
    exige: "Abertura de atividade, uma declaração trimestral e reservar o que é do Estado.",
    quando: "Para testar. Enquanto não souberes se alguém paga, tudo o resto é estrutura a mais.",
    href: "/?foco=recibos",
    cta: "Ver o que fica de cada recibo",
    destaque: true,
  },
  {
    id: "empresa",
    Icon: Building,
    titulo: "Sociedade",
    resumo: "Uma pessoa coletiva com contabilidade organizada, responsabilidade limitada e IRC sobre o lucro.",
    exige: "Contabilista certificado todos os meses — mesmo num mês sem faturar — e capital social.",
    quando: "Quando a faturação, o risco ou os clientes o justificarem. Há um ponto de viragem, e é um número.",
    href: "/?foco=empresa",
    cta: "Ver o ponto de viragem",
    destaque: false,
  },
  {
    id: "salario",
    Icon: Briefcase,
    titulo: "Manter o salário",
    resumo: "Testar a hipótese ao lado do emprego. Não é desistir: é financiar o teste com rendimento que já existe.",
    exige: "Verificar exclusividade no contrato e as regras de acumulação da Segurança Social.",
    quando: "Quase sempre, no início. É a forma que permite a hipótese falhar sem levar o resto atrás.",
    href: "/?foco=salario",
    cta: "Conferir o meu recibo",
    destaque: false,
  },
] as const;

export default function BifurcacaoDescobrir() {
  return (
    <section
      id="sob-que-forma"
      aria-labelledby="sob-que-forma-titulo"
      className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-3xl">
          <div className="eyebrow mb-3 text-brand">Depois da hipótese</div>
          <h2
            id="sob-que-forma-titulo"
            className="text-balance font-display display-2 font-semibold text-ink"
          >
            E sob que forma testas isto?
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-600">
            Esta pergunta só faz sentido agora. Comparar regimes antes de saber o que se vai fazer
            é comparar impostos sobre um rendimento que ainda não existe — e é o erro mais caro do
            princípio, porque leva pessoas a abrir empresa para uma ideia que nunca chegou a ter
            um cliente.
          </p>
        </Reveal>

        <div className="mt-9 grid gap-3 lg:grid-cols-3">
          {FORMAS.map(({ id, Icon, titulo, resumo, exige, quando, href, cta, destaque }, i) => (
            <Reveal key={id} delay={i * 0.05}>
              <div
                className={`flex h-full flex-col rounded-4xl border p-5 shadow-card sm:p-6 ${
                  destaque
                    ? "border-brand bg-brand-light dark:bg-brand/15"
                    : "border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900"
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                    destaque
                      ? "bg-brand text-white"
                      : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300"
                  }`}
                >
                  <Icon size={18} />
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold text-ink">{titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                  {resumo}
                </p>

                <dl className="mt-4 space-y-2.5 border-t border-stone-200/70 pt-4 dark:border-stone-700">
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[.13em] text-stone-400">
                      Exige
                    </dt>
                    <dd className="mt-0.5 text-xs leading-relaxed text-stone-500">{exige}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[.13em] text-stone-400">
                      Faz sentido quando
                    </dt>
                    <dd className="mt-0.5 text-xs leading-relaxed text-stone-500">{quando}</dd>
                  </div>
                </dl>

                <Link
                  href={href}
                  className={`focus-marca mt-auto inline-flex min-h-[40px] items-center gap-1.5 pt-4 text-xs font-semibold no-underline ${
                    destaque
                      ? "text-brand-dark dark:text-brand-mint"
                      : "text-brand hover:text-brand-dark"
                  }`}
                >
                  {cta} <ArrowRight size={13} />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        {/*
          Nenhum número comparável aqui, e não é omissão: um líquido posto
          ao lado de outro convida a decidir com ele, e a esta altura da
          leitura a pessoa ainda não tem faturação para comparar. O número
          vive onde há controlos para o mexer.
        */}
        <div className="mt-4 flex flex-col gap-4 rounded-4xl border border-dashed border-stone-300 px-5 py-4 dark:border-stone-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300">
              <Scale size={17} />
            </span>
            <div>
              <div className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                Queres os três com números?
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
                Precisa de uma faturação anual para comparar. Aqui ainda não há uma — e um número
                comparado sem base é pior do que número nenhum.
              </p>
            </div>
          </div>
          <Link
            href="/ferramentas/comparar-regimes"
            className="focus-marca inline-flex min-h-[44px] flex-shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 no-underline hover:border-brand/40 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
          >
            Comparar regimes <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </section>
  );
}
