"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { Wallet, BellAlert, Receipt, Check, ArrowRight, ArrowLeft } from "@/components/ui/Icons";
import Button from "@/components/ui/Button";
import { EASE } from "@/lib/motion";

interface Passo {
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
  pontos?: { icon: React.ReactNode; texto: string }[];
}

const PASSOS: Passo[] = [
  {
    icon: <Wallet size={26} />,
    titulo: "Bem-vindo ao teu copiloto financeiro",
    descricao:
      "O ReciboCerto mostra-te quanto do teu dinheiro é mesmo teu — e quanto pertence ao Estado. Sem folhas de cálculo, sem surpresas.",
  },
  {
    icon: <BellAlert size={26} />,
    titulo: "Vê o dinheiro, não os impostos",
    descricao: "Três coisas que fazemos por ti, automaticamente:",
    pontos: [
      { icon: <Wallet size={16} />, texto: "Separamos o que é teu do que é do Estado" },
      { icon: <Check size={16} />, texto: "Dizemos-te quanto reservar para IRS, SS e IVA" },
      { icon: <BellAlert size={16} />, texto: "Avisamos-te dos prazos antes que sejam multa" },
    ],
  },
  {
    icon: <Receipt size={26} />,
    titulo: "Começa pelo teu primeiro recibo",
    descricao:
      "Regista um recibo e vê na hora quanto fica disponível para gastar. Os teus dados ficam só neste dispositivo — mais tarde, com o Pro, podes guardá-los na nuvem e receber alertas dos prazos por email.",
  },
];

export default function Onboarding({ onConcluir }: { onConcluir: () => void }) {
  const [passo, setPasso] = useState(0);
  const [dir, setDir] = useState(1);
  const ultimo = passo === PASSOS.length - 1;
  const p = PASSOS[passo];

  const avancar = () => {
    setDir(1);
    setPasso((s) => Math.min(s + 1, PASSOS.length - 1));
  };
  const recuar = () => {
    setDir(-1);
    setPasso((s) => Math.max(s - 1, 0));
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="relative overflow-hidden rounded-4xl border border-stone-100 bg-white p-8 shadow-card sm:p-10">
        <div className="grain pointer-events-none absolute inset-0 -z-10 opacity-50" aria-hidden />

        <AnimatePresence mode="wait" custom={dir}>
          <m.div
            key={passo}
            custom={dir}
            initial={{ opacity: 0, x: dir * 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -32 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
              {p.icon}
            </div>
            <h2 className="font-display text-2xl font-semibold text-stone-800">{p.titulo}</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">{p.descricao}</p>

            {p.pontos && (
              <ul className="mt-5 space-y-3">
                {p.pontos.map((pt) => (
                  <li key={pt.texto} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
                      {pt.icon}
                    </span>
                    <span className="text-sm text-stone-600">{pt.texto}</span>
                  </li>
                ))}
              </ul>
            )}
          </m.div>
        </AnimatePresence>

        {/* Stepper + ações */}
        <div className="mt-8 flex items-center justify-between">
          <div className="flex gap-1.5" role="tablist" aria-label="Progresso">
            {PASSOS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === passo ? "w-6 bg-brand" : "w-1.5 bg-stone-200"}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {passo > 0 && (
              <Button variant="ghost" size="sm" onClick={recuar}>
                <ArrowLeft size={14} /> Voltar
              </Button>
            )}
            {!ultimo ? (
              <Button variant="primary" size="md" onClick={avancar}>
                Continuar <ArrowRight size={14} />
              </Button>
            ) : (
              <Link href="/dashboard/recibos" onClick={onConcluir}>
                <Button variant="primary" size="md">
                  <Receipt size={16} /> Registar recibo
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <button type="button" onClick={onConcluir} className="text-xs font-medium text-stone-400 transition-colors hover:text-stone-600">
          Saltar introdução
        </button>
      </div>
    </div>
  );
}
