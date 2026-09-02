import { Check, Lock } from "@/components/ui/Icons";
import FizLogo from "./FizLogo";
import FizActionButton from "./FizActionButton";
import FizDisclosure from "./FizDisclosure";
import { DIVULGACAO_LIGACAO } from "@/content/parcerias-copy";
import { PLUS } from "@/lib/entitlements";

// ═══════════════════════════════════════════════════════════════════════
//  FAIXA DA PARCERIA — depois dos planos, fora da grelha
//  ---------------------------------------------------------------------
//  A primeira versão era a terceira coluna da grelha de planos. O comentário
//  dizia "nunca finge ser uma terceira subscrição" e o layout dizia o
//  contrário: três cartões lado a lado, com listas de itens iguais às dos
//  planos, lidos de uma vez como "Grátis · Plus · FIZ". Quem olha de relance
//  conclui que há um terceiro escalão a pagar.
//
//  Agora é uma FAIXA, e a diferença é estrutural, não decorativa:
//
//  1. Está fora da grelha e depois dela. Sai da comparação de preços porque
//     não é um preço — é o que acontece a seguir a escolheres.
//  2. Não tem preço nem botão de subscrição. O único destino é explicativo.
//     Nada aqui compete com o "Subscrever o Plus".
//  3. A cor faz o resto: os passos que são nossos ficam verdes, o da FIZ
//     fica amarelo. A fronteira vê-se sem se ler.
//
//  ── Correção de rumo: as ressalvas vão para o fim ────────────────────
//  A primeira tentativa de dizer "isto não é um plano" abriu com sete
//  negações seguidas — "não é um plano", "não tens de subscrever nada",
//  "não faz parte dos planos nem do Plus", e a seguir um bloco inteiro de
//  "não inclui / não é preciso / não emite". Lia-se como se estivéssemos a
//  afastar-nos de um parceiro em quem não confiamos, que é o contrário do
//  que a parceria é e do que queremos que se sinta.
//
//  A ordem passa a ser: quem é a FIZ e o que faz por ti → onde acaba um e
//  começa o outro → e só no fim, num só sítio calmo, as ressalvas
//  comerciais. A informação é exatamente a mesma. Muda quando aparece, e
//  isso muda tudo.
// ═══════════════════════════════════════════════════════════════════════

const JORNADA = [
  { rotulo: "Compreender", desc: "Guias com fonte oficial por afirmação.", nosso: true },
  { rotulo: "Simular", desc: "O teu líquido, com memória de cálculo.", nosso: true },
  { rotulo: "Preparar", desc: "Checklist, documentos e decisões.", nosso: true },
  { rotulo: "Executar", desc: "Emitir, declarar e cumprir prazos.", nosso: false },
];

// ⚠️ Sem a palavra «contabilista». Esta lista dizia «revisão por
// contabilistas certificados» — e o site tem um diretório de contabilistas,
// com vínculo sem plano pago e uma ordem que não se compra. Descrever um
// parceiro pago com a palavra que descreve o nosso diretório punha os dois a
// competir pelo mesmo clique, contra a hierarquia de `escolherRota()`, onde o
// contabilista vem ANTES da FIZ. A FIZ é descrita pelo que executa.
const O_QUE_A_FIZ_FAZ = [
  "Faturação certificada e comunicação à Autoridade Tributária",
  "IVA, Segurança Social e IRS tratados por quem executa",
  "Lembretes das tuas obrigações reais, não de um calendário genérico",
  "Um só sítio para emitir, entregar e arquivar",
];

export default function FizParceriaCard({ className = "" }: { className?: string }) {
  return (
    <section
      aria-labelledby="fiz-parceria"
      className={`overflow-hidden rounded-4xl border border-fiz-200 bg-fiz-50 ${className}`}
    >
      {/* ── Cabeçalho: quem é a FIZ e o que faz por ti ─────────────── */}
      <div className="border-b border-fiz-200 px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-wrap items-center gap-3">
          <FizLogo size={40} className="flex-shrink-0 rounded-xl shadow-card" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-fiz-700">
              O nosso parceiro
            </p>
            <h3 id="fiz-parceria" className="font-display text-xl font-semibold leading-tight text-ink">
              Preparamos nós, executa a FIZ
            </h3>
          </div>
        </div>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          A FIZ é um operador fiscal certificado: emite faturas, entrega declarações e trata das
          obrigações de quem trabalha por conta própria. Trabalhamos com eles porque é o que
          fazem bem — e porque o teu trabalho não devia parar no momento em que já sabes o
          número.
        </p>
      </div>

      {/* ── Corpo: duas colunas em ecrã largo, empilhadas no telemóvel ── */}
      <div className="grid gap-6 px-6 py-6 sm:px-8 sm:py-7 lg:grid-cols-2 lg:gap-10">
        {/* Jornada — onde acaba um e começa o outro */}
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            Do que precisas de saber ao que fica feito
          </p>
          <ol className="space-y-2.5">
            {JORNADA.map((passo, i) => (
              <li key={passo.rotulo} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold tabular-nums ${
                    passo.nosso ? "bg-brand-light text-brand-dark" : "bg-fiz text-fiz-ink shadow-card"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                      {passo.rotulo}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wide ${
                        passo.nosso ? "text-brand-dark" : "text-fiz-700"
                      }`}
                    >
                      {passo.nosso ? "Recibo Certo" : "FIZ"}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                    {passo.desc}
                  </span>
                </span>
              </li>
            ))}
          </ol>

        </div>

        {/* O que a FIZ trata + a fronteira comercial */}
        <div>
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            O que a FIZ trata por ti
          </p>
          <ul className="space-y-2">
            {O_QUE_A_FIZ_FAZ.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex-shrink-0 text-fiz-700">
                  <Check size={15} />
                </span>
                <span className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">{item}</span>
              </li>
            ))}
          </ul>

        </div>
      </div>

      {/* ── As ressalvas, todas juntas e no fim ─────────────────────
          Estiveram no topo e o painel inteiro passou a soar a aviso legal.
          A informação é a mesma; aqui já vem depois de se saber quem é a
          FIZ e o que faz, que é a ordem em que uma pessoa a quer ler. */}
      <div className="border-t border-fiz-200 px-6 py-5 sm:px-8">
        <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200">
          <Lock size={13} className="text-fiz-700" />
          Em termos práticos
        </p>
        <ul className="grid gap-1.5 sm:grid-cols-2 sm:gap-x-6">
          {/* O texto vai dentro de UM <span>. Num contentor flex cada nó de
              texto e cada elemento viram itens separados: com o <strong>
              solto, a frase era desenhada em colunas e lia-se baralhada. */}
          <li className="flex items-start gap-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            <span aria-hidden className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-brand" />
            <span>
              Ligar a conta e enviar uma simulação é <strong>gratuito</strong> — vês sempre os
              campos exatos antes de autorizar e podes desligar quando quiseres.
            </span>
          </li>
          <li className="flex items-start gap-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            <span aria-hidden className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-fiz-400" />
            <span>A FIZ tem preços e contrato próprios, contratados diretamente com ela.</span>
          </li>
          {PLUS.naoInclui.map((n) => (
            <li key={n} className="flex items-start gap-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              <span aria-hidden className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-stone-300 dark:bg-stone-600" />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Um só destino, e é a FIZ ────────────────────────────────
          Este cartão descrevia a parceria inteira e o único botão levava a
          `/integracoes/fiz` — uma página cujo título é, literalmente, «como
          funciona a parceria». Acabava de se explicar a parceria e oferecia-se
          explicá-la outra vez. Ficou uma ação só.

          E não leva cartaz. O criativo da FIZ é um anúncio completo — diz o
          que a FIZ faz, com que preço e com que certificação, e traz o seu
          próprio botão. Dentro de um bloco que acabou de explicar exatamente
          isso, é a mesma mensagem duas vezes. O cartaz vive onde é a ÚNICA
          presença da FIZ: nas faixas por baixo das demonstrações. */}
      <div className="border-t border-fiz-200 px-6 py-6 sm:px-8 sm:py-7">
        <p className="max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          Já sabes o que fazemos nós e o que faz a FIZ. O passo seguinte é vê-los por dentro —
          abre num separador novo, ficas aqui.
        </p>
        <div className="mt-4">
          <FizActionButton href="/ir/fiz?s=precos.faixa&v=faixa&d=registo">
            Conhecer a FIZ
          </FizActionButton>
        </div>
        <FizDisclosure texto={DIVULGACAO_LIGACAO} className="mt-3 max-w-2xl" />
        <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
          A FIZ é um parceiro independente. O Recibo Certo mantém liberdade editorial sobre o que
          escreve.
        </p>
      </div>

    </section>
  );
}
