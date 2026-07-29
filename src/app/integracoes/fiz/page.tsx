import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import FizLogo from "@/components/fiz/FizLogo";
import { Check, Close, Lock, ShieldCheck, ArrowRight, Info } from "@/components/ui/Icons";
import { fizAtiva } from "@/lib/fiz/flag";
import { PLUS } from "@/lib/entitlements";
import { CAMPOS_NUNCA_ENVIADOS } from "@/lib/fiz/handoff-fields";

// ═══════════════════════════════════════════════════════════════════════
//  Página pública da parceria.
//
//  Existe para responder a uma pergunta legítima e desconfortável: "vocês
//  recebem por me mandar para lá?". Recebemos, e é dito na página. O que
//  torna a parceria defensável não é escondê-la — é a fronteira ser clara
//  e o utilizador nunca ficar preso a ela.
//
//  Enquanto a integração estiver desligada, a página explica o plano em vez
//  de anunciar um serviço que ainda não existe.
// ═══════════════════════════════════════════════════════════════════════

export const metadata: Metadata = {
  title: "ReciboCerto e FIZ: como funciona a parceria",
  description:
    "O ReciboCerto explica, calcula e prepara. A FIZ executa: faturação certificada, declarações e prazos. Onde acaba um e começa o outro, e o que acontece aos teus dados.",
  alternates: { canonical: "https://www.recibocerto.pt/integracoes/fiz" },
};

const NOSSO = [
  "Explicar a regra com a fonte oficial ao lado",
  "Calcular o teu líquido, com memória de cálculo",
  "Comparar enquadramentos e cenários",
  "Preparar documentos, checklists e decisões",
  "Mostrar o estado que a FIZ nos comunicar",
];

const DELES = [
  "Emitir faturas e recibos certificados",
  "Comunicar documentos à Autoridade Tributária",
  "Declaração periódica de IVA",
  "Segurança Social e IRS",
  "Lembretes das obrigações reais de cada contribuinte",
  "Revisão por contabilistas certificados",
];

const NUNCA = [
  "Emitir documentos fiscais em teu nome",
  "Submeter declarações",
  "Guardar credenciais da FIZ, das Finanças ou da Segurança Social",
  "Enviar dados sem tu escolheres, campo a campo, o que segue",
];

function Coluna({
  titulo,
  subtitulo,
  itens,
  tom,
  logo = false,
}: {
  titulo: string;
  subtitulo: string;
  itens: string[];
  tom: "nosso" | "deles";
  logo?: boolean;
}) {
  const nosso = tom === "nosso";
  return (
    <div
      className={`rounded-4xl border p-5 sm:p-6 ${
        nosso
          ? "border-brand/25 bg-brand-light/40 dark:bg-brand/10"
          : "border-fiz-200 bg-fiz-50"
      }`}
    >
      <div className="mb-1 flex items-center gap-2.5">
        {logo && <FizLogo size={30} className="flex-shrink-0 rounded-lg" decorativo />}
        <h2 className={`font-display text-lg font-semibold ${nosso ? "text-brand-dark" : "text-ink"}`}>
          {titulo}
        </h2>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{subtitulo}</p>
      <ul className="space-y-2">
        {itens.map((i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className={`mt-0.5 flex-shrink-0 ${nosso ? "text-brand" : "text-fiz-700"}`}>
              <Check size={15} />
            </span>
            <span className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function IntegracaoFizPage() {
  const ativa = fizAtiva();

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-cream dark:bg-stone-950">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
          {/* Cabeçalho */}
          <header className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <span className="font-display text-lg font-semibold text-brand-dark">ReciboCerto</span>
              <span aria-hidden className="text-stone-300">×</span>
              <FizLogo size={34} className="rounded-lg shadow-card" />
            </div>
            <h1 className="font-display display-2 font-semibold text-ink">
              Compreender aqui. Executar lá.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-500 dark:text-stone-400">
              Aquilo em que somos bons é explicar-te a regra, mostrar-te o número e deixar tudo
              preparado. A partir daí é preciso alguém certificado para emitir, declarar e
              acompanhar as obrigações — e é isso que a FIZ faz. Cada um no que faz melhor,
              sem repetires nada pelo caminho.
            </p>

            {!ativa && (
              <p className="mt-4 flex items-start gap-2 rounded-2xl border border-alert-border bg-alert-bg px-4 py-3 text-sm leading-relaxed text-alert-text">
                <Info size={15} className="mt-0.5 flex-shrink-0" />
                <span>
                  A integração ainda não está disponível. Esta página descreve o que foi acordado
                  desenhar — nada está ativo e nenhum dado é partilhado.
                </span>
              </p>
            )}
          </header>

          {/* A fronteira */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Coluna
              tom="nosso"
              titulo="O que fazemos"
              subtitulo="Grátis, e o Plus acrescenta organização e exportação."
              itens={NOSSO}
            />
            <Coluna
              tom="deles"
              logo
              titulo="O que a FIZ faz"
              subtitulo="Contratado diretamente com a FIZ, segundo as condições dela."
              itens={DELES}
            />
          </div>

          {/* O que nunca fazemos */}
          <section className="mb-8 rounded-4xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900 sm:p-6">
            <h2 className="mb-1 font-display text-lg font-semibold text-ink">
              O que o ReciboCerto nunca faz
            </h2>
            <p className="mb-4 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              Isto não é uma limitação temporária. É uma decisão de produto, e está garantida no
              código por testes que falham se alguém a violar.
            </p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {NUNCA.map((i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex-shrink-0 text-clay">
                    <Close size={15} />
                  </span>
                  <span className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">{i}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Dados */}
          <section className="mb-8 rounded-4xl border border-fiz-200 bg-fiz-50 p-5 sm:p-6">
            <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <Lock size={17} className="text-fiz-700" />O que acontece aos teus dados
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              Nada é partilhado por seres utilizador do ReciboCerto. A partilha só existe se
              escolheres continuar na FIZ — e, mesmo aí, escolhes campo a campo o que segue, num
              ecrã onde nada vem pré-selecionado.
            </p>
            <div className="rounded-2xl bg-white p-4 dark:bg-stone-900">
              <p className="mb-2 text-xs font-semibold text-stone-700 dark:text-stone-200">
                O que nunca é enviado, autorizes o que autorizares
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CAMPOS_NUNCA_ENVIADOS.map((c) => (
                  <span key={c} className="rounded-lg bg-clay-bg px-2 py-1 text-xs font-medium text-clay-text">
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
              <ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-brand" />
              <span>
                Detalhe completo, incluindo base legal e como reverter, na{" "}
                <Link href="/privacidade#fiz" className="font-semibold underline underline-offset-2 hover:text-brand">
                  Política de Privacidade
                </Link>
                .
              </span>
            </p>
          </section>

          {/* Comercial */}
          <section className="mb-8 rounded-4xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900 sm:p-6">
            <h2 className="mb-3 font-display text-lg font-semibold text-ink">A parte comercial</h2>
            <div className="space-y-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              <p>
                <strong className="text-stone-800 dark:text-stone-200">Sim, somos remunerados</strong>{" "}
                quando alguém contrata a FIZ através do ReciboCerto. Dizemo-lo em todos os sítios
                onde a ação aparece, e não só aqui.
              </p>
              <p>
                O que isso <em>não</em> muda: continuamos a explicar alternativas, as fontes oficiais
                continuam visíveis em cada guia, e a FIZ não tem qualquer influência sobre o que
                escrevemos. Se a resposta certa para ti for não contratar ninguém, é isso que o
                conteúdo vai dizer.
              </p>
              <p>
                O <strong className="text-stone-800 dark:text-stone-200">{PLUS.nome}</strong>, a{" "}
                {PLUS.precoMensal.toLocaleString("pt-PT", { style: "currency", currency: PLUS.moeda })}/mês,
                paga as ferramentas do ReciboCerto. Não paga nada da FIZ, e não é preciso tê-lo para
                ligar a conta ou enviar uma simulação.
              </p>
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/precos"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-brand-dark"
            >
              Ver os planos <ArrowRight size={15} />
            </Link>
            <Link
              href="/guias"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-300 dark:border-stone-700 dark:text-stone-200"
            >
              Começar pelos guias
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
