import type { Metadata } from "next";
import Link from "next/link";
import { BellAlert, History, Wallet, Export, ChartProjection, Check, ArrowRight, Lock } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Passar ao Pro — ReciboCerto",
};

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
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-4xl font-semibold text-ink tabular-nums">5,99 €</span>
          <span className="text-sm text-stone-400">por mês</span>
        </div>
        <p className="mt-1 text-xs text-stone-400">ou 47,99 € por ano — poupa 33% (≈ 4,00 €/mês)</p>

        <Link
          href="/precos"
          className="btn-shine mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float"
        >
          Quero o preço de fundador
          <ArrowRight size={14} />
        </Link>
        <p className="mt-3 text-xs text-stone-400">
          O Pro chega em breve. Entra na lista e garantes o preço de fundador, com acesso antecipado.
        </p>

        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {["Sem cartão para entrar na lista", "Cancela quando quiseres", "Dados em servidores na UE"].map((g) => (
            <li key={g} className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500">
              <span className="text-brand"><Check size={13} /></span>
              {g}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-stone-400">
        <span className="text-stone-400"><Lock size={12} /></span>
        Enquanto não há Pro, tudo o que usas hoje continua grátis e sem limites.
      </p>
    </div>
  );
}
