"use client";

// ═══════════════════════════════════════════════════════════════════════
//  MARCAR CONSULTA — escolher um dia, depois uma hora, e ver o que se pede
//  ---------------------------------------------------------------------
//  A primeira versão listava catorze dias seguidos, cada um com todas as
//  horas, num só scroll. Num telemóvel isso são vários ecrãs de botões
//  iguais, e a pessoa que quer «quinta de manhã» tem de os percorrer todos
//  para lá chegar.
//
//  O desenho passa a ter os dois passos separados, que é como uma pessoa
//  pensa numa marcação:
//
//    1. QUE DIA  — uma tira horizontal, com os dias sem vagas à vista mas
//                  fora de alcance, para se perceber que não é omissão.
//    2. QUE HORA — uma grelha só do dia escolhido.
//    3. O QUE SE PEDE — o resumo antes de confirmar, com a modalidade, o
//                  preço e o assunto. Nada é enviado antes deste passo.
//
//  A tira é um `tablist` a sério: setas para navegar, `Home`/`End` para os
//  extremos, e o painel das horas anunciado como o painel daquele dia.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import {
  FUSO_PT, instanteDeLocal, rotularDia, type Slot,
} from "@/lib/contabilistas/agenda";
import { eurosDeCents } from "@/lib/contabilistas/fidelidade";
import type { Contabilista, Modalidade } from "@/lib/contabilistas/tipos";
import Button from "@/components/ui/Button";
import { Calendar, Clock, Laptop, MapPin } from "@/components/ui/Icons";

export interface DiaComSlots {
  dia: string;
  slots: Slot[];
}

interface Props {
  cc: Contabilista;
  /** Dias com horários livres, já gerados e ordenados. */
  dias: DiaComSlots[];
  ocupado: boolean;
  /** Devolve `true` quando a consulta ficou pedida. A falhar, o que a pessoa escreveu fica onde está. */
  onMarcar: (escolha: { slot: Slot; modalidade: Modalidade; assunto: string }) => Promise<boolean>;
}

export default function Marcacao({ cc, dias, ocupado, onMarcar }: Props) {
  const idBase = useId();
  const [diaEscolhido, setDiaEscolhido] = useState<string | null>(dias[0]?.dia ?? null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [modalidade, setModalidade] = useState<Modalidade>(
    cc.modalidades.includes("online") ? "online" : "presencial",
  );
  const [assunto, setAssunto] = useState("");
  const tiraRef = useRef<HTMLDivElement>(null);

  // A agenda recarrega depois de cada marcação: se o dia escolhido deixou
  // de ter horas (foi a última), escolhe-se o primeiro que ainda tem.
  useEffect(() => {
    if (dias.length === 0) { setDiaEscolhido(null); return; }
    setDiaEscolhido((atual) => (atual && dias.some((d) => d.dia === atual) ? atual : dias[0].dia));
  }, [dias]);

  // Uma hora que já não existe não pode continuar escolhida.
  useEffect(() => {
    setSlot((atual) => {
      if (!atual) return null;
      const doDia = dias.find((d) => d.dia === atual.dia);
      return doDia?.slots.some((s) => s.inicio === atual.inicio) ? atual : null;
    });
  }, [dias]);

  const horas = useMemo(
    () => dias.find((d) => d.dia === diaEscolhido)?.slots ?? [],
    [dias, diaEscolhido],
  );

  if (dias.length === 0) return null;

  /** Setas, `Home` e `End` percorrem a tira — o padrão de um `tablist`. */
  function navegar(e: React.KeyboardEvent<HTMLDivElement>) {
    const teclas = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!teclas.includes(e.key)) return;
    e.preventDefault();

    const i = dias.findIndex((d) => d.dia === diaEscolhido);
    const proximo =
      e.key === "Home" ? 0
      : e.key === "End" ? dias.length - 1
      : e.key === "ArrowRight" ? Math.min(dias.length - 1, i + 1)
      : Math.max(0, i - 1);

    const alvo = dias[proximo];
    if (!alvo) return;
    setDiaEscolhido(alvo.dia);
    setSlot(null);
    const botao = tiraRef.current?.querySelector<HTMLButtonElement>(`[data-dia="${alvo.dia}"]`);
    botao?.focus();
    botao?.scrollIntoView({ block: "nearest", inline: "center" });
  }

  return (
    <div className="space-y-5">
      {/* ── 1. O dia ────────────────────────────────────────────── */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="text-sm font-semibold text-stone-700">Escolhe o dia</h3>
          <p className="text-xs text-stone-400">Horas de Lisboa</p>
        </div>

        <div
          ref={tiraRef}
          role="tablist"
          aria-label="Dias com horários livres"
          onKeyDown={navegar}
          className="-mx-1 mt-2.5 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]"
        >
          {dias.map(({ dia, slots }) => {
            const escolhido = dia === diaEscolhido;
            const { semana, numero, mes } = partesDoDia(dia);
            return (
              <button
                key={dia}
                data-dia={dia}
                role="tab"
                type="button"
                id={`${idBase}-dia-${dia}`}
                aria-selected={escolhido}
                aria-controls={`${idBase}-horas`}
                tabIndex={escolhido ? 0 : -1}
                onClick={() => { setDiaEscolhido(dia); setSlot(null); }}
                className={`flex min-h-[4.5rem] w-[4.25rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border px-1 py-2 transition-colors ${
                  escolhido
                    ? "border-brand bg-brand text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                }`}
              >
                <span className="text-xs font-medium capitalize opacity-80">{semana}</span>
                <span className="font-display text-xl leading-none tabular-nums">{numero}</span>
                <span className="text-[0.625rem] uppercase tracking-wide opacity-70">{mes}</span>
                <span className={`text-[0.625rem] tabular-nums ${escolhido ? "text-white/80" : "text-stone-400"}`}>
                  {slots.length} {slots.length === 1 ? "hora" : "horas"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. A hora ───────────────────────────────────────────── */}
      <div
        role="tabpanel"
        id={`${idBase}-horas`}
        aria-labelledby={diaEscolhido ? `${idBase}-dia-${diaEscolhido}` : undefined}
      >
        <h3 className="text-sm font-semibold text-stone-700">
          {diaEscolhido ? <span className="first-letter:uppercase">{rotularDia(diaEscolhido)}</span> : "Escolhe a hora"}
        </h3>
        <ul className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {horas.map((s) => {
            const escolhido = slot?.inicio === s.inicio;
            return (
              <li key={s.inicio}>
                <button
                  type="button"
                  aria-pressed={escolhido}
                  onClick={() => setSlot(escolhido ? null : s)}
                  className={`w-full rounded-xl px-2 py-2.5 text-sm font-semibold tabular-nums transition-colors ${
                    escolhido
                      ? "bg-brand text-white shadow-glow"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  {s.hora}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── 3. O que se pede ────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {slot && (
          <m.div
            key="resumo"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4 rounded-4xl border border-brand/25 bg-brand-light/40 p-4 sm:p-5"
          >
            <div>
              <p className="eyebrow">O que vais pedir</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-lg text-ink">
                <Calendar size={17} className="text-brand-dark" aria-hidden />
                <span className="first-letter:uppercase">{rotularDia(slot.dia)}</span>
                <span className="text-stone-300" aria-hidden>·</span>
                <Clock size={16} className="text-brand-dark" aria-hidden />
                <span className="tabular-nums">{slot.hora}</span>
              </p>
              <p className="mt-1 text-sm text-stone-600">
                {cc.duracaoConsultaMin} minutos
                {cc.precoConsultaCents > 0 && ` · ${eurosDeCents(cc.precoConsultaCents)}`}
              </p>
            </div>

            {cc.modalidades.length > 1 && (
              <fieldset>
                <legend className="text-sm font-medium text-stone-600">Como queres ser atendido</legend>
                <div className="mt-2 flex gap-2">
                  {cc.modalidades.map((mod) => {
                    const Icon = mod === "online" ? Laptop : MapPin;
                    return (
                      <button
                        key={mod}
                        type="button"
                        aria-pressed={modalidade === mod}
                        onClick={() => setModalidade(mod)}
                        className={`inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium capitalize transition-colors ${
                          modalidade === mod ? "bg-brand text-white" : "bg-white text-stone-700 hover:bg-stone-100"
                        }`}
                      >
                        <Icon size={15} aria-hidden /> {mod}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <label className="block">
              <span className="text-sm font-medium text-stone-600">Assunto (opcional)</span>
              <textarea
                value={assunto}
                onChange={(e) => setAssunto(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="O que queres tratar nesta consulta."
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={async () => {
                  const feito = await onMarcar({ slot, modalidade, assunto });
                  if (feito) { setAssunto(""); setSlot(null); }
                }}
                disabled={ocupado}
              >
                {ocupado ? "A marcar…" : "Pedir consulta"}
              </Button>
              <button
                type="button"
                onClick={() => setSlot(null)}
                className="min-h-[2.5rem] text-sm font-medium text-stone-500 underline underline-offset-2 hover:text-stone-700"
              >
                Escolher outra hora
              </button>
            </div>

            <p className="text-xs leading-relaxed text-stone-500">
              Ficas com o pedido registado. A consulta só está confirmada quando o
              contabilista a confirmar — e avisamos-te na tua área.
            </p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** "2026-08-14" → { semana: "qui", numero: "14", mes: "ago" }. */
function partesDoDia(dia: string): { semana: string; numero: string; mes: string } {
  const [a, m, d] = dia.split("-").map(Number);
  // Meio-dia local: a formatação de um dia inteiro nunca cai no dia anterior
  // por causa de uma mudança de hora.
  const instante = instanteDeLocal(a, m, d, 12, 0);
  const formatar = (opcoes: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-PT", { ...opcoes, timeZone: FUSO_PT }).format(instante).replace(".", "");
  return {
    semana: formatar({ weekday: "short" }),
    numero: String(d),
    mes: formatar({ month: "short" }),
  };
}
