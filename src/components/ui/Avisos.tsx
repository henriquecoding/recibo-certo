"use client";

// ═══════════════════════════════════════════════════════════════════════
//  AVISOS — a resposta do produto a uma ação
//  ---------------------------------------------------------------------
//  Antes disto, cada ecrã tinha o seu `useState` de erro e o seu `useState`
//  de sucesso, desenhados como um parágrafo no topo da página. Isso falha
//  de duas maneiras concretas:
//
//   1. A pessoa carrega num botão que está a meio do ecrã e a resposta
//      aparece fora do campo de visão — no telemóvel, quase sempre.
//   2. Cada página inventa a sua própria linguagem para dizer a mesma
//      coisa, e o produto deixa de responder da mesma maneira.
//
//  A regra que isto entrega: TODA a ação tem resposta, e a resposta
//  aparece onde os olhos já estão — em baixo, por cima de tudo, sem roubar
//  o foco a ninguém.
//
//  Não é um `aria-modal`: um aviso nunca interrompe o teclado. Por isso
//  não passa pelo `CoordenadorOverlays` — não há invariante para partilhar.
//  Quem interrompe é o `Confirmar`, e esse coordena-se.
// ═══════════════════════════════════════════════════════════════════════

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { Check, Close, Info, Warning } from "@/components/ui/Icons";

export type TomAviso = "sucesso" | "erro" | "info";

export interface PedidoAviso {
  /** A frase principal. Curta, no que aconteceu — não no que se clicou. */
  texto: string;
  /** Uma segunda linha, para a consequência ou o próximo passo. */
  detalhe?: string;
  tom?: TomAviso;
  /** Uma ação, no máximo. Ex.: «Ver», «Anular». Fecha o aviso ao ser usada. */
  acao?: { texto: string; onClick: () => void };
  /** Milissegundos até desaparecer sozinho. `0` fica até ser fechado. */
  duracaoMs?: number;
}

interface Aviso {
  id: string;
  texto: string;
  detalhe?: string;
  tom: TomAviso;
  acao?: { texto: string; onClick: () => void };
  duracaoMs: number;
}

/**
 * Quanto tempo cada tom fica no ecrã.
 *
 * O erro fica mais tempo de propósito: é o único que a pessoa pode precisar
 * de reler, e o único cuja mensagem ela não estava à espera.
 */
const DURACAO: Record<TomAviso, number> = { sucesso: 5000, info: 6000, erro: 9000 };

/** Três chegam. Acima disso, uma pilha de avisos é ruído, não informação. */
const MAX_VISIVEIS = 3;

interface Contexto {
  avisar: (pedido: PedidoAviso) => string;
  fechar: (id: string) => void;
}

const ContextoAvisos = createContext<Contexto | null>(null);

export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const sequencia = useRef(0);

  const fechar = useCallback((id: string) => {
    setAvisos((atuais) => atuais.filter((a) => a.id !== id));
  }, []);

  const avisar = useCallback((pedido: PedidoAviso) => {
    const tom = pedido.tom ?? "info";
    sequencia.current += 1;
    const id = `aviso-${sequencia.current}`;
    setAvisos((atuais) =>
      [
        ...atuais,
        {
          id,
          tom,
          texto: pedido.texto,
          detalhe: pedido.detalhe,
          acao: pedido.acao,
          duracaoMs: pedido.duracaoMs ?? DURACAO[tom],
        },
      ].slice(-MAX_VISIVEIS),
    );
    return id;
  }, []);

  const valor = useMemo<Contexto>(() => ({ avisar, fechar }), [avisar, fechar]);

  return (
    <ContextoAvisos.Provider value={valor}>
      {children}
      <Pilha avisos={avisos} onFechar={fechar} />
    </ContextoAvisos.Provider>
  );
}

/**
 * Fora de um `AvisosProvider` os avisos não rebentam — não acontecem.
 *
 * É o mesmo princípio do `useOverlay`: um componente tem de poder ser
 * montado sozinho, num teste ou numa página isolada, sem arrastar a árvore
 * inteira atrás dele. O que se perde é o aviso; o que se ganha é não haver
 * um ecrã em branco por causa de uma mensagem de sucesso.
 */
export function useAvisos() {
  const ctx = useContext(ContextoAvisos);

  return useMemo(() => {
    const avisar = ctx?.avisar ?? (() => "");
    return {
      avisar,
      sucesso: (texto: string, extra?: Omit<PedidoAviso, "texto" | "tom">) =>
        avisar({ ...extra, texto, tom: "sucesso" }),
      erro: (texto: string, extra?: Omit<PedidoAviso, "texto" | "tom">) =>
        avisar({ ...extra, texto, tom: "erro" }),
      info: (texto: string, extra?: Omit<PedidoAviso, "texto" | "tom">) =>
        avisar({ ...extra, texto, tom: "info" }),
      fechar: ctx?.fechar ?? (() => {}),
    };
  }, [ctx]);
}

// ── Desenho ────────────────────────────────────────────────────────────

const TOM: Record<TomAviso, { Icon: typeof Check; chip: string; borda: string }> = {
  sucesso: { Icon: Check, chip: "bg-brand-light text-brand-dark", borda: "border-brand/25" },
  erro: { Icon: Warning, chip: "bg-clay-bg text-clay-text", borda: "border-clay-border" },
  info: { Icon: Info, chip: "bg-stone-100 text-stone-500", borda: "border-stone-200" },
};

function Pilha({ avisos, onFechar }: { avisos: Aviso[]; onFechar: (id: string) => void }) {
  return (
    <div
      // A barra de navegação de telemóvel vive no fundo do ecrã em três
      // superfícies diferentes (site, painel, contabilista). O espaço em
      // baixo é reservado sempre: um aviso escondido atrás da navegação é
      // um aviso que não existe.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[9600] flex flex-col items-center gap-2 px-3 pb-[calc(4.75rem+env(safe-area-inset-bottom))] sm:items-end sm:px-5 sm:pb-5"
    >
      {avisos.map((aviso) => (
        <Cartao key={aviso.id} aviso={aviso} onFechar={onFechar} />
      ))}
    </div>
  );
}

function Cartao({ aviso, onFechar }: { aviso: Aviso; onFechar: (id: string) => void }) {
  const [pausado, setPausado] = useState(false);
  const { Icon, chip, borda } = TOM[aviso.tom];

  // O relógio para enquanto o rato ou o teclado estiverem em cima: ninguém
  // deve perder uma mensagem por estar a lê-la.
  useEffect(() => {
    if (aviso.duracaoMs <= 0 || pausado) return;
    const t = setTimeout(() => onFechar(aviso.id), aviso.duracaoMs);
    return () => clearTimeout(t);
  }, [aviso.id, aviso.duracaoMs, pausado, onFechar]);

  return (
    <div
      // `alert` interrompe o leitor de ecrã; `status` espera pela pausa.
      // Um erro depois de uma ação destrutiva não pode esperar.
      role={aviso.tom === "erro" ? "alert" : "status"}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      className={`rc-aviso-entrada pointer-events-auto flex w-full max-w-[26rem] items-start gap-3 rounded-2xl border bg-white px-4 py-3 shadow-float ${borda}`}
    >
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${chip}`}>
        <Icon size={15} aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-stone-800">{aviso.texto}</p>
        {aviso.detalhe && (
          <p className="mt-0.5 text-sm leading-relaxed text-stone-500">{aviso.detalhe}</p>
        )}
        {aviso.acao && (
          <button
            type="button"
            onClick={() => { aviso.acao?.onClick(); onFechar(aviso.id); }}
            className="mt-1.5 min-h-[2.25rem] text-sm font-semibold text-brand-dark underline underline-offset-2 hover:text-brand"
          >
            {aviso.acao.texto}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onFechar(aviso.id)}
        aria-label="Fechar aviso"
        className="-mr-1 -mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
      >
        <Close size={15} aria-hidden />
      </button>
    </div>
  );
}
