"use client";

import { useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { useSubscricao } from "@/lib/stripe/subscription";
import { BellAlert, History, Wallet, Export, ChartProjection, Check, ArrowRight, Lock } from "@/components/ui/Icons";

const BENEFICIOS = [
  {
    icon: <BellAlert size={22} />,
    titulo: "Alertas antes de cada prazo",
    texto: "Avisamos-te por email com antecedência. Nunca mais uma coima por esquecimento.",
  },
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
  const { plano, abrirCheckout, abrirPortal } = useSubscricao();
  const [anual, setAnual] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubscrever = async () => {
    setLoading(true);
    try {
      await abrirCheckout(anual ? "annual" : "monthly");
    } finally {
      setLoading(false);
    }
  };

  if (plano === "pro") {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-4xl border border-brand bg-white p-10 shadow-glow">
          <span className="inline-flex items-center rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
            Pro ativo
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold text-ink">Já tens o ReciboCerto Pro</h1>
          <p className="mt-2 text-sm text-stone-500">
            Obrigado por subscreveres. Tens acesso a todas as funcionalidades.
          </p>
          <button
            type="button"
            onClick={abrirPortal}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-300"
          >
            Gerir subscrição
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8 text-center">
        <div className="eyebrow mb-3 text-brand">ReciboCerto Pro</div>
        <h1 className="font-display text-3xl font-semibold text-stone-800">Deixa de te preocupar com prazos.</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-stone-500">
          Continuas a calcular e a simular de graça. O Pro trata da parte chata: avisa-te a tempo, guarda o teu
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
        {/* Toggle mensal/anual */}
        <div role="group" aria-label="Período de faturação" className="mb-5 inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 p-1">
          <button
            type="button"
            aria-pressed={!anual}
            onClick={() => setAnual(false)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${!anual ? "bg-white text-brand-dark shadow-card" : "text-stone-500 hover:text-stone-700"}`}
          >
            Mensal
          </button>
          <button
            type="button"
            aria-pressed={anual}
            onClick={() => setAnual(true)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${anual ? "bg-white text-brand-dark shadow-card" : "text-stone-500 hover:text-stone-700"}`}
          >
            Anual
            <span className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-semibold text-brand-dark">-33%</span>
          </button>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-4xl font-semibold text-ink tabular-nums">
            {anual ? "3,99 €" : "5,99 €"}
          </span>
          <span className="text-sm text-stone-400">por mês</span>
        </div>
        <p className="mt-1 text-xs text-stone-400">
          {anual ? "faturado 47,99 € por ano · poupa 33%" : "faturado mensalmente"}
        </p>

        {user ? (
          <button
            type="button"
            onClick={handleSubscrever}
            disabled={loading}
            className="btn-shine mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float disabled:opacity-50"
          >
            {loading ? "A preparar..." : "Subscrever o Pro"}
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
          Pagamento seguro via Stripe. Cancela quando quiseres.
        </p>

        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {["Cancela quando quiseres", "Sem compromisso", "Dados em servidores na UE"].map((g) => (
            <li key={g} className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500">
              <span className="text-brand"><Check size={13} /></span>
              {g}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-stone-400">
        <span className="text-stone-400"><Lock size={12} /></span>
        Tudo o que usas no plano Grátis continua grátis e sem limites.
      </p>
    </div>
  );
}
