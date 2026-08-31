"use client";

import { useEffect, useState } from "react";

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

export interface PrazoSSResolvido {
  iso: string;
  rotulo: string;
  dias: number;
}

const SEM_PRAZOS: readonly string[] = [];

const isoDe = (ano: number, mes: number, dia: number) =>
  `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

const partes = (iso: string): [number, number, number] | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

/** Escolhe uma data sem depender do timezone usado para interpretar `YYYY-MM-DD`. */
export function resolverPrazoSSAtual(
  prazos: readonly string[],
  agora = new Date(),
): PrazoSSResolvido {
  const hoje = Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate());
  let escolhido = prazos
    .map((iso) => ({ iso, p: partes(iso) }))
    .filter((item): item is { iso: string; p: [number, number, number] } => Boolean(item.p))
    .find(({ p }) => Date.UTC(p[0], p[1] - 1, p[2]) >= hoje);

  // A lista cobre quatro anos em torno do ano fiscal. Se uma release ficar
  // publicada para além dessa janela, o prazo continua correto em vez de
  // congelar: dia 20 deste mês, ou do seguinte quando já passou.
  if (!escolhido) {
    let ano = agora.getFullYear();
    let mes = agora.getMonth() + 1;
    if (agora.getDate() > 20) {
      mes += 1;
      if (mes === 13) {
        mes = 1;
        ano += 1;
      }
    }
    escolhido = { iso: isoDe(ano, mes, 20), p: [ano, mes, 20] };
  }

  const [ano, mes, dia] = escolhido.p;
  const alvo = Date.UTC(ano, mes - 1, dia);
  return {
    iso: escolhido.iso,
    rotulo: `${dia} de ${MESES[mes - 1]}`,
    dias: Math.max(0, Math.ceil((alvo - hoje) / 86_400_000)),
  };
}

export function usePrazoSSAtual(prazos: readonly string[]) {
  const [prazo, setPrazo] = useState<PrazoSSResolvido | null>(null);
  useEffect(() => setPrazo(resolverPrazoSSAtual(prazos)), [prazos]);
  return prazo;
}

export function PrazoSSTexto({
  prazos,
  valor,
  fallback,
}: {
  prazos?: readonly string[];
  valor?: string;
  fallback: string;
}) {
  const atual = usePrazoSSAtual(prazos ?? SEM_PRAZOS);
  return <>{valor ?? atual?.rotulo ?? fallback}</>;
}
