import Link from "next/link";
import {
  Wallet,
  Building,
  Scale,
  Gauge,
  Swap,
  ShieldCheck,
  Search,
  MapPin,
  ShoppingBag,
  BookOpen,
  Trophy,
  ArrowRight,
} from "@/components/ui/Icons";
import type { ComponentType } from "react";

type IconType = ComponentType<{ size?: number; className?: string }>;

interface Recurso {
  href: string;
  titulo: string;
  desc: string;
  icon: IconType;
}
interface Bloco {
  titulo: string;
  recursos: Recurso[];
}

// Surfaces TODO o site dentro do dashboard — para o utilizador ver, num só
// sítio, os simuladores, as ferramentas e os guias (não só os recibos verdes).
const BLOCOS: Bloco[] = [
  {
    titulo: "Simuladores & decisores",
    recursos: [
      { href: "/ferramentas/recibo-vencimento", titulo: "Recibo de vencimento", desc: "Do bruto ao líquido por conta de outrem", icon: Wallet },
      { href: "/?modo=empresa", titulo: "Abrir empresa", desc: "Líquido via sociedade: IRC + dividendos", icon: Building },
      { href: "/?modo=comparar", titulo: "Comparar cenários", desc: "Recibos verdes vs contrato vs empresa", icon: Scale },
      { href: "/ferramentas/regime-simplificado", titulo: "Regime simplificado", desc: "Coeficiente, tributável e IRS estimado", icon: Gauge },
      { href: "/ferramentas/ato-isolado", titulo: "Ato isolado ou atividade", desc: "Descobre o que faz sentido para ti", icon: Swap },
    ],
  },
  {
    titulo: "Ferramentas",
    recursos: [
      { href: "/ferramentas/auditoria-recibo", titulo: "Auditoria do recibo", desc: "Confirma se o teu recibo está certo", icon: ShieldCheck },
      { href: "/ferramentas/classificar-atividade", titulo: "Classificar atividade", desc: "Retenção, coeficiente e SS por profissão", icon: Search },
      { href: "/ferramentas/mapa-contabilistas", titulo: "Mapa de contabilistas", desc: "Preço médio por região, num mapa", icon: MapPin },
      { href: "/ferramentas/payout-mor", titulo: "Recibo Merchant of Record", desc: "Paddle / Lemon Squeezy em 5 passos", icon: ShoppingBag },
    ],
  },
  {
    titulo: "Aprender",
    recursos: [
      { href: "/guias", titulo: "Guias fiscais", desc: "IRS, IVA, Segurança Social e mais", icon: BookOpen },
      { href: "/quiz-fiscal", titulo: "Quiz Fiscal", desc: "Testa-te com base legal e fontes", icon: Trophy },
    ],
  },
];

export default function HubRecursos() {
  return (
    <section aria-labelledby="hub-recursos" className="mt-10">
      <div className="mb-4">
        <h2 id="hub-recursos" className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
          Explorar tudo o que tens
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Para além dos recibos verdes: simuladores, ferramentas e guias — agora também a partir daqui.
        </p>
      </div>

      <div className="space-y-6">
        {BLOCOS.map((bloco) => (
          <div key={bloco.titulo}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">{bloco.titulo}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bloco.recursos.map((r) => {
                const Icon = r.icon;
                return (
                  <Link
                    key={r.href}
                    href={r.href}
                    className="group flex items-start gap-3 rounded-2xl border border-stone-100 bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift dark:border-stone-800 dark:bg-stone-900"
                  >
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-sm font-semibold text-stone-800 dark:text-stone-100">
                        {r.titulo}
                        <ArrowRight size={13} className="flex-shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">{r.desc}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
