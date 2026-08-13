"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { useSubscricao, type Modalidade } from "@/lib/stripe/subscription";
import Link from "next/link";
import { BellAlert, History, Wallet, Export, ChartProjection, Check, ArrowRight, Lock } from "@/components/ui/Icons";
import { PLUS, precoPlusFormatado, precoVitalicioFormatado } from "@/lib/entitlements";
import { textoLugares, type LugaresVitalicios } from "@/lib/plus/vitalicio";
import { fizAtiva } from "@/lib/fiz/flag";
import FizLogo from "@/components/fiz/FizLogo";

const BENEFICIOS = [
  {
    icon: <History size={22} />,
    titulo: "Histórico na nuvem",
    texto: "Os teus recibos seguros e sincronizados — do telemóvel ao portátil.",
  },
  {
    icon: <Wallet size={22} />,
    titulo: "Mealheiro fiscal automático",
    texto: "Quanto reservar este mês para IRS, Segurança Social e IVA, calculado por ti.",
  },
  {
    icon: <Export size={22} />,
    titulo: "Exportação CSV e PDF",
    texto: "Um clique e fica tudo pronto para entregares ao teu contabilista.",
  },
  {
    icon: <ChartProjection size={22} />,
    titulo: "Cenários de IRS guardados",
    texto: "Guarda e compara simulações ao longo do ano, sem recomeçar.",
  },
];

export default function UpgradePage() {
  const { user } = useAuth();
  const { plano, vitalicio, carregado: planoCarregado, abrirCheckout, abrirPortal } = useSubscricao();
  const [loading, setLoading] = useState(false);
  const [modalidade, setModalidade] = useState<Modalidade>("mensal");
  const [lugares, setLugares] = useState<LugaresVitalicios | null>(null);

  // A página de planos liga para cá com a modalidade escolhida. Lê-se do
  // `window` e não de `useSearchParams` para a rota continuar estática — o
  // mesmo motivo que governa os filtros do hub de ferramentas.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("modalidade");
    if (q === "vitalicio") setModalidade("vitalicio");
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/vitalicio/lugares")
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => { if (active && result) setLugares(result as LugaresVitalicios); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const [erro, setErro] = useState<string | null>(null);
  const vitalicioIndisponivel = !lugares || lugares.verificado === false || lugares.esgotado;

  const handleSubscrever = async () => {
    if (modalidade === "vitalicio" && vitalicioIndisponivel) return;
    setLoading(true);
    setErro(null);
    try {
      const r = await abrirCheckout(modalidade);
      if (r?.erro) {
        setErro(r.erro);
        // Se o vitalício esgotou, a única opção que resta é o mensal — e é
        // melhor deixá-la já escolhida do que obrigar a perceber sozinho.
        if (r.esgotado) setModalidade("mensal");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!planoCarregado) {
    return (
      <div aria-busy="true" className="mx-auto max-w-lg rounded-4xl border border-stone-100 bg-white p-10 text-center text-sm text-stone-500 shadow-card">
        A confirmar o teu plano…
      </div>
    );
  }

  if (plano === "plus") {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-4xl border border-brand bg-white p-10 shadow-glow">
          <span className="inline-flex items-center rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
            Plus ativo
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
            {vitalicio ? "Tens acesso vitalício ao Plus" : "Já tens o Recibo Certo Plus"}
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            {vitalicio
              ? "Foi um pagamento único: não há renovação nem subscrição para cancelar."
              : "Obrigado por subscreveres. Tens acesso a todas as funcionalidades."}
          </p>
          <button
            type="button"
            onClick={abrirPortal}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-300"
          >
            {vitalicio ? "Ver pagamentos" : "Gerir subscrição"}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8 text-center">
        <div className="eyebrow mb-3 text-brand">{PLUS.nome}</div>
        <h1 className="font-display text-3xl font-semibold text-stone-800">Deixa de te preocupar com prazos.</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-stone-500">
          Continuas a calcular e a simular de graça. O Plus trata da parte chata: guarda-te a tempo, guarda o teu
          histórico na nuvem e prepara tudo para o teu contabilista.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {BENEFICIOS.map((b) => (
          <div key={b.titulo} className="flex items-start gap-4 rounded-4xl border border-stone-100 bg-white p-6 shadow-card">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand">
              {b.icon}
            </span>
            <div>
              <h2 className="text-sm font-semibold text-stone-800">{b.titulo}</h2>
              <p className="mt-1 text-sm leading-relaxed text-stone-500">{b.texto}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Preço + CTA */}
      <div className="mt-6 flex flex-col items-center rounded-4xl border border-brand bg-white p-8 text-center shadow-glow">
        {/* Um só Plus. O seletor Mensal/Anual foi removido: a página de
            planos promete "um plano só, sem escadaria" e o seletor era
            precisamente uma escadaria. O valor vem de `PLUS` — estava
            escrito à mão aqui, e em desacordo com a página pública. */}
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-4xl font-semibold text-ink tabular-nums">
            {modalidade === "vitalicio" ? precoVitalicioFormatado() : precoPlusFormatado()}
          </span>
          <span className="text-sm text-stone-400">
            {modalidade === "vitalicio" ? "uma vez" : "por mês"}
          </span>
        </div>
        <p className="mt-1 text-xs text-stone-400">
          {modalidade === "vitalicio"
            ? "pagamento único · sem renovação"
            : "faturado mensalmente"}
        </p>

        {/* Trocar de modalidade sem sair da página. É a MESMA coisa a ser
            paga de duas maneiras, por isso não é uma escolha de plano. */}
        <div
          role="radiogroup"
          aria-label="Como queres pagar o Plus"
          className="mt-5 inline-flex gap-1 rounded-2xl border border-stone-200 bg-stone-50 p-1 dark:border-stone-700 dark:bg-stone-800/60"
        >
          {([
            { id: "mensal", label: "Todos os meses" },
            { id: "vitalicio", label: "Uma vez, vitalício" },
          ] as const).map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={modalidade === o.id}
              onClick={() => { setModalidade(o.id); setErro(null); }}
              className={`min-h-10 rounded-xl px-4 text-[13px] font-semibold transition-colors ${
                modalidade === o.id
                  ? "bg-white text-brand-dark shadow-card dark:bg-stone-700 dark:text-brand"
                  : "text-stone-500 hover:text-stone-700 dark:text-stone-400"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {modalidade === "vitalicio" ? (
          <p className={`mt-3 text-xs font-medium ${lugares?.verificado !== false && lugares?.esgotado ? "text-alert-text" : "text-stone-500"}`}>
            {lugares ? textoLugares(lugares) : "A confirmar os lugares fundadores disponíveis…"}
          </p>
        ) : null}
        {modalidade === "vitalicio" && lugares?.verificado !== false && !lugares?.esgotado ? (
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-stone-400">
            Este pagamento fundador ajuda a financiar a evolução do Recibo Certo.
          </p>
        ) : null}

        {erro ? (
          <p role="alert" className="mt-4 max-w-sm rounded-2xl bg-alert-bg px-4 py-2.5 text-xs leading-relaxed text-alert-text">
            {erro}
          </p>
        ) : null}

        {user ? (
          <button
            type="button"
            onClick={handleSubscrever}
            disabled={loading || (modalidade === "vitalicio" && vitalicioIndisponivel)}
            className="btn-shine mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float disabled:opacity-50"
          >
            {loading
              ? "A preparar..."
              : modalidade === "vitalicio"
                ? !lugares
                  ? "A confirmar lugares..."
                  : lugares.verificado === false
                    ? "Temporariamente indisponível"
                    : lugares.esgotado ? "Lugares esgotados" : "Comprar o vitalício"
                : "Subscrever o Plus"}
            {!loading && <ArrowRight size={14} />}
          </button>
        ) : (
          <a
            href="/dashboard/conta"
            className="btn-shine mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float"
          >
            Entra para subscrever
            <ArrowRight size={14} />
          </a>
        )}

        <p className="mt-3 text-xs text-stone-400">
          {modalidade === "vitalicio"
            ? "Cobrança imediata e única via Stripe. 14 dias para pedir reembolso."
            : "Cobrança imediata via Stripe. Cancela quando quiseres; 14 dias para pedir reembolso."}
        </p>

        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {(modalidade === "vitalicio"
            ? ["Sem renovação", "1000 lugares fundadores", "Dados em servidores na UE"]
            : ["Cancela quando quiseres", "Sem trial", "Dados em servidores na UE"]
          ).map((g) => (
            <li key={g} className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500">
              <span className="text-brand"><Check size={13} /></span>
              {g}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-stone-400">
        <span className="text-stone-400"><Lock size={12} /></span>
        As calculadoras, os simuladores e os guias do plano Grátis continuam grátis.
      </p>

      {/* A fronteira dita na página onde se paga. É aqui que a confusão sai
          cara: alguém pode subscrever a pensar que compra faturação
          certificada. Nota discreta, sem botão que compita com o de
          subscrever — o destino é explicativo. */}
      {fizAtiva() && (
        <aside className="mx-auto mt-8 max-w-xl rounded-3xl border border-fiz-200 bg-fiz-50 px-5 py-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-200">
            <FizLogo size={16} className="flex-shrink-0 rounded-[0.25em]" decorativo />
            O que o Plus não é
          </p>
          <ul className="mt-2 space-y-1.5">
            {PLUS.naoInclui.map((n) => (
              <li key={n} className="flex items-start gap-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                <span aria-hidden className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-fiz-400" />
                {n}
              </li>
            ))}
          </ul>
          <Link
            href="/integracoes/fiz"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-fiz-900 underline underline-offset-2 hover:text-fiz-700"
          >
            Quem trata da execução fiscal
            <ArrowRight size={12} />
          </Link>
        </aside>
      )}
    </div>
  );
}
