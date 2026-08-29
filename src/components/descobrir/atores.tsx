"use client";

import { Anel, Ficha, PalcoContexto, type FichaEmCena } from "@/components/palco/atores";
import type { Ponto } from "@/components/palco/medida";

// ═══════════════════════════════════════════════════════════════════════
//  OS ATORES DA MESA DE DECISÃO — só o que é desta cena
//  ---------------------------------------------------------------------
//  A mecânica — a ficha com relógio próprio (o que torna a pausa real), o
//  anel de impacto e o contexto do palco — vive em
//  `components/palco/atores.tsx`, partilhada com o palco do preço. Estava
//  aqui duplicada byte a byte: as mesmas três fases (12% / 88%), a mesma
//  Bézier quadrática, o mesmo `paradoRef`.
//
//  O que fica é a única coisa que NÃO é partilhável: o significado das
//  cores. Aqui `areia` é uma FRONTEIRA e `azul` é uma FONTE; no preço,
//  `areia` é o IVA e `clay` é o que sai da fatura. São vocabulários
//  diferentes e devem continuar a ser — unificá-los seria unificar duas
//  coisas que só por acaso se parecem.
// ═══════════════════════════════════════════════════════════════════════

/** O contexto do palco, com o nome que esta cena já usava. */
export const EstadoPalcoDescobrir = PalcoContexto;

export type TomFichaDescobrir = "contexto" | "fronteira" | "fonte" | "prova" | "hipotese";

const SOMBRA = "shadow-[0_8px_28px_rgba(4,36,28,.24)]";

/**
 *   contexto  · o que a pessoa traz
 *   fronteira · o que não pode acontecer, e por isso elimina
 *   fonte     · o que alguém mediu mesmo
 *   prova     · o que ainda falta e vira teste
 *   hipotese  · a conclusão que sobreviveu
 */
const TOM: Record<TomFichaDescobrir, string> = {
  contexto: `border-brand-mint/70 bg-[#dff7ef] text-brand-deep ${SOMBRA}`,
  fronteira: `border-[#e7c98e]/80 bg-[#fff3cf] text-[#6b4e13] ${SOMBRA}`,
  fonte: `border-[#9fc8e7]/80 bg-[#eaf5fd] text-[#21597e] ${SOMBRA}`,
  prova: `border-clay-border bg-clay-bg text-clay-text ${SOMBRA}`,
  hipotese: "border-brand bg-brand text-white shadow-[0_12px_36px_rgba(23,126,94,.38)]",
};

const COR_DO_ANEL: Record<TomFichaDescobrir, string> = {
  contexto: "border-brand-mint",
  fronteira: "border-[#e7c98e]",
  fonte: "border-[#8fc1e4]",
  prova: "border-clay-border",
  hipotese: "border-brand-mint",
};

export interface FichaDescobrirEmCena {
  id: string;
  origem: Ponto;
  destino: Ponto;
  rotulo: string;
  tom: TomFichaDescobrir;
  duracao?: number;
}

/** A ficha partilhada, com o tom desta cena já resolvido em classes. */
export function FichaDescobrir({
  ficha,
  aoChegar,
  aoSair,
}: {
  ficha: FichaDescobrirEmCena;
  aoChegar: (ficha: FichaDescobrirEmCena) => void;
  aoSair: (id: string) => void;
}) {
  const partilhada: FichaEmCena = { ...ficha, tom: TOM[ficha.tom] };
  return (
    <Ficha
      ficha={partilhada}
      // A cena de «Descobrir» precisa da ficha inteira ao chegar (para
      // marcar a chegada e guardar o tom do anel); a partilhada entrega o
      // id, que é o que qualquer palco tem. A tradução vive aqui.
      aoChegar={() => aoChegar(ficha)}
      aoSair={aoSair}
    />
  );
}

export function AnelImpactoDescobrir({ em, tom }: { em: Ponto; tom: TomFichaDescobrir }) {
  return <Anel em={em} cor={COR_DO_ANEL[tom]} />;
}
