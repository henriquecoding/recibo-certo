"use client";

import { useEffect, useRef, type RefObject } from "react";
import { m } from "motion/react";
import { Pause, Play } from "@/components/ui/Icons";

// ═════════════════════════════════════════════════════════════════════════
//  PALCO DAS DEMONSTRAÇÕES — peças partilhadas
//  ---------------------------------------------------------------------
//  Nasceu da `DemoIRS`, quando o mesmo desenho passou a ser preciso no Hero
//  e na página de investidores. Em vez de o copiar três vezes (foi assim que
//  a «Situação de IVA» acabou com três implementações divergentes), vive
//  aqui uma só vez.
//
//  REGRA DURA: este ficheiro é SÓ INTERFACE. Não importa `fiscal.ts`,
//  `fiscal-iva.ts` nem `fiscal-data.ts`. O Hero está acima da dobra e não é
//  carregado em diferido — arrastar o motor fiscal para aqui punha-o no
//  bundle inicial de toda a gente, que é precisamente o que o cálculo no
//  servidor (`src/app/page.tsx`) existe para evitar.
// ═════════════════════════════════════════════════════════════════════════

export const EASE_PALCO = [0.16, 1, 0.3, 1] as const;

// ── Formatação ───────────────────────────────────────────────────────────

export const eur0 = (n: number) =>
  new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

export const eurNeg = (n: number) => `− ${eur0(Math.abs(n))}`;
export const eurPos = (n: number) => `+ ${eur0(Math.abs(n))}`;
export const pctInteiro = (n: number) => `${Math.round(n)}%`;
export const num = (n: number, casas = 2) =>
  n.toLocaleString("pt-PT", { minimumFractionDigits: casas, maximumFractionDigits: casas });

// ── Variantes: cada ato entra com as suas linhas em cascata ──────────────

export const palco = {
  entra: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const linha = {
  oculto: { opacity: 0, y: 8 },
  entra: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_PALCO } },
};

// ── Título de ato ────────────────────────────────────────────────────────

export function TituloAto({ children, nota }: { children: React.ReactNode; nota?: string }) {
  return (
    <m.div variants={linha} className="mb-2.5 flex items-baseline justify-between gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">{children}</span>
      {nota && <span className="flex-shrink-0 text-[10px] font-medium text-stone-400">{nota}</span>}
    </m.div>
  );
}

// ── Botão de pausa ───────────────────────────────────────────────────────
//  Conteúdo que se move sozinho tem de poder ser parado (WCAG 2.2.2). A
//  pausa ao passar o rato não chega: não existe em ecrã tátil nem para quem
//  navega por teclado.

export function BotaoPausa({
  parado,
  onAlternar,
  className = "",
}: {
  parado: boolean;
  onAlternar: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onAlternar}
      aria-label={parado ? "Retomar a demonstração" : "Pausar a demonstração"}
      className={`flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 dark:border-stone-700 dark:text-stone-400 ${className}`}
    >
      {parado ? <Play size={11} /> : <Pause size={11} />}
    </button>
  );
}

// ── Régua de atos ────────────────────────────────────────────────────────

export interface AtoDaRegua {
  id: string;
  /** Curto — cabe por baixo da barra, em maiúsculas pequenas. */
  rotulo: string;
  /** Frase inteira, para o leitor de ecrã. */
  legenda: string;
}

export function ReguaDeAtos({
  atos,
  indiceAtivo,
  barraRef,
  estatico,
  onIr,
  className = "",
}: {
  atos: AtoDaRegua[];
  indiceAtivo: number;
  /** A barra do ato ativo é escrita por `ref`, pelo relógio. */
  barraRef: RefObject<HTMLSpanElement | null>;
  /** `prefers-reduced-motion`: a barra do ato ativo aparece já cheia. */
  estatico: boolean;
  onIr: (idx: number) => void;
  className?: string;
}) {
  return (
    <ol className={`flex gap-1 ${className}`}>
      {atos.map((a, idx) => (
        <li key={a.id} className="flex-1">
          <button
            type="button"
            onClick={() => onIr(idx)}
            aria-current={idx === indiceAtivo ? "step" : undefined}
            aria-label={`Passo ${idx + 1} de ${atos.length}: ${a.legenda}`}
            className="group block w-full py-1 focus-visible:outline-none"
          >
            <span className="block h-1 w-full overflow-hidden rounded-full bg-stone-200 group-focus-visible:ring-2 group-focus-visible:ring-brand group-focus-visible:ring-offset-2 dark:bg-stone-700">
              <span
                ref={idx === indiceAtivo ? barraRef : undefined}
                className="block h-full w-full origin-left rounded-full bg-brand"
                style={{
                  transform: `scaleX(${idx < indiceAtivo || (idx === indiceAtivo && estatico) ? 1 : 0})`,
                }}
              />
            </span>
            <span
              className={`mt-1 block truncate text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                idx === indiceAtivo ? "text-brand-dark dark:text-brand" : "text-stone-300 dark:text-stone-600"
              }`}
            >
              {a.rotulo}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

// ── Relógio do palco ─────────────────────────────────────────────────────

/**
 * Uma única fonte de tempo por demonstração: o mesmo `requestAnimationFrame`
 * que enche a barra é o que decide quando o ato acaba.
 *
 * Foi uma decisão deliberada, não uma conveniência. Com duas fontes — um
 * `setTimeout` para avançar e uma animação CSS para a barra — bastava uma
 * pausa para as duas se separarem: a barra continuava a correr enquanto o
 * temporizador estava suspenso, e a partir daí o corte deixava de coincidir
 * com o fim da barra.
 *
 * O progresso vive num `ref` e é escrito diretamente no DOM. Pô-lo em estado
 * seriam sessenta renderizações por segundo do cartão inteiro, com os
 * contadores e os gráficos todos lá dentro.
 *
 * @param chave  muda → o relógio reinicia do zero (novo ato, novo perfil).
 */
export function useRelogioDePalco({
  duracaoMs,
  chave,
  parado,
  aoTerminar,
}: {
  duracaoMs: number;
  chave: string | number;
  parado: boolean;
  aoTerminar: () => void;
}): RefObject<HTMLSpanElement | null> {
  const barraRef = useRef<HTMLSpanElement>(null);
  const progresso = useRef(0);

  // O callback vive num ref para que uma identidade nova não reinicie o
  // relógio a meio do ato.
  const terminarRef = useRef(aoTerminar);
  terminarRef.current = aoTerminar;

  useEffect(() => {
    progresso.current = 0;
    if (barraRef.current) barraRef.current.style.transform = "scaleX(0)";
  }, [chave]);

  useEffect(() => {
    if (parado || duracaoMs <= 0) return;
    let raf = 0;
    let ultimo = performance.now();
    const passo = (agora: number) => {
      progresso.current = Math.min(1, progresso.current + (agora - ultimo) / duracaoMs);
      ultimo = agora;
      if (barraRef.current) barraRef.current.style.transform = `scaleX(${progresso.current})`;
      if (progresso.current >= 1) {
        terminarRef.current();
        return;
      }
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [parado, duracaoMs, chave]);

  return barraRef;
}
