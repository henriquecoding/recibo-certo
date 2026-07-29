import Link from "next/link";
import Image from "next/image";
import { Check, ArrowRight, Lock } from "@/components/ui/Icons";
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

const O_QUE_A_FIZ_FAZ = [
  "Faturação certificada e comunicação à Autoridade Tributária",
  "IVA, Segurança Social e IRS tratados por quem executa",
  "Lembretes das tuas obrigações reais, não de um calendário genérico",
  "Revisão por contabilistas certificados",
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
                      {passo.nosso ? "ReciboCerto" : "FIZ"}
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

      {/* ── Ver a FIZ a sério ───────────────────────────────────────
          Este cartão descrevia a parceria e não tinha um único caminho para
          a FIZ: o único destino era uma página nossa. Faltava-lhe a coisa
          mais simples — poder ir ver.

          A imagem é o criativo do kit deles, com uma captura do produto. É o
          formato que NÃO se reproduz em CSS (os de texto e botão são gerados
          em código, em `FizCriativoTexto`), e é aqui que ela serve: numa
          coluna estreita, ao lado da explicação, com dimensões explícitas
          para não haver salto de layout. */}
      <div className="grid gap-6 border-t border-fiz-200 px-6 py-6 sm:px-8 sm:py-7 lg:grid-cols-[1fr_240px] lg:items-start lg:gap-10">
        <div>
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
            Queres ver como funciona do lado deles?
          </p>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            Abre num separador novo. Não sais daqui e a tua simulação fica onde está.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* O destino é uma rota NOSSA. O link do parceiro é resolvido no
                servidor, a cada clique — não viaja no bundle do browser. */}
            <FizActionButton href="/ir/fiz?s=precos.faixa&v=faixa&d=registo">
              Conhecer a FIZ
            </FizActionButton>
            <Link
              href="/integracoes/fiz"
              className="inline-flex min-h-[44px] flex-shrink-0 items-center justify-center gap-2 rounded-2xl border border-fiz-300 bg-white px-5 py-2.5 text-sm font-semibold text-fiz-900 transition-colors hover:bg-fiz-50 dark:bg-stone-900"
            >
              Como funciona a parceria
              <ArrowRight size={15} />
            </Link>
          </div>
          <FizDisclosure texto={DIVULGACAO_LIGACAO} className="mt-3 max-w-xl" />
        </div>

        <a
          href="/ir/fiz?s=precos.faixa&v=banner&d=registo"
          target="_blank"
          rel="noopener noreferrer nofollow sponsored"
          // Sem `object-cover`: recortar o criativo é modificação da marca, e a
          // cl. 15.1 permite converter e comprimir, não recompor. Reduz-se a
          // largura e a altura acompanha.
          className="mx-auto block w-full max-w-[200px] overflow-hidden rounded-2xl border border-fiz-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-fiz-600 focus-visible:ring-offset-2 sm:max-w-[240px]"
        >
          <Image
            src="/parceiros/fiz/fiz-300x600-pt.avif"
            width={300}
            height={600}
            alt="FIZ — impostos no automático, para freelancers em Portugal"
            loading="lazy"
            className="h-auto w-full"
          />
        </a>
      </div>

      {/* ── Rodapé ─────────────────────────────────────────────────── */}
      <div className="border-t border-fiz-200 bg-white/60 px-6 py-5 dark:bg-stone-900/40 sm:px-8">
        <p className="max-w-xl text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
          A FIZ é um parceiro independente. A parceria é remunerada e o ReciboCerto mantém
          liberdade editorial sobre o que escreve.
        </p>
      </div>
    </section>
  );
}
