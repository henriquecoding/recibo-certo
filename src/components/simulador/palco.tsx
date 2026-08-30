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
      <span className="texto-mini font-bold uppercase tracking-wider text-stone-400">{children}</span>
      {nota && <span className="flex-shrink-0 texto-micro font-medium text-stone-400">{nota}</span>}
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
      // 36px no telemóvel e 28 a partir de `sm:`. Este botão é a única forma
      // de parar uma animação num ecrã tátil (WCAG 2.2.2 — não há `hover` num
      // dedo), e estava a 28×28: abaixo do alvo mínimo do design system, num
      // canto do cartão, para uma pessoa que já está a tentar travar algo que
      // se mexe. O rato acerta em 28; o polegar não.
      className={`flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 dark:border-stone-700 dark:text-stone-400 sm:h-7 sm:w-7 ${className}`}
    >
      {parado ? <Play size={13} /> : <Pause size={13} />}
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
        // `min-w-0` — sem isto a régua deixava de caber quando os rótulos
        // subiram de 9px para o piso de 12: um item de flex não encolhe
        // abaixo do seu min-content, e `truncate` é `whitespace-nowrap`,
        // portanto o min-content de cada passo é a PALAVRA INTEIRA. A 320px
        // «Coletável» sozinho pedia mais do que a coluna tinha, e a régua
        // empurrava o cartão da demo para fora do ecrã. Com `min-w-0` os
        // quatro passos voltam a repartir a largura em partes iguais e o
        // `truncate` faz o que promete.
        <li key={a.id} className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onIr(idx)}
            aria-current={idx === indiceAtivo ? "step" : undefined}
            aria-label={`Passo ${idx + 1} de ${atos.length}: ${a.legenda}`}
            // A régua é navegável — cada passo leva ao seu ato. Tinha 30px de
            // altura, e o que se toca não é a barra de 1px: é a coluna
            // inteira. `min-h-[36px]` no telemóvel dá-lhe o alvo que ela já
            // pedia sem o dizer, sem mudar nada do que se vê.
            className="group block min-h-[36px] w-full py-1 focus-visible:outline-none sm:min-h-0"
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
              className={`mt-1 block truncate texto-micro font-semibold uppercase tracking-wide transition-colors ${
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
