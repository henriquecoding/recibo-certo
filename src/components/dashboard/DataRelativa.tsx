"use client";

// ─────────────────────────────────────────────────────────────────────────
//  «Há 2 dias» — com a data absoluta por baixo, e num `<time>`.
//
//  Uma data relativa sozinha é ambígua para quem volta ao painel passado
//  um mês, e é ilegível para um leitor de ecrã que a anuncie fora de
//  contexto. O `datetime` leva o ISO completo; o `title` leva a data por
//  extenso; o que se vê é a leitura rápida.
//
//  Renderiza vazio até montar: `new Date()` no servidor e no cliente dá
//  respostas diferentes e a hidratação acusaria a diferença.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

function relativa(iso: string, agora: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const minutos = Math.round((agora - t) / 60000);
  if (minutos < 1) return "agora mesmo";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.round(dias / 30);
  return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
}

export default function DataRelativa({ iso, className = "" }: { iso: string; className?: string }) {
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => setAgora(Date.now()), [iso]);

  if (agora === null) return null;
  const absoluta = new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });

  return (
    <time
      dateTime={iso}
      title={absoluta}
      className={`text-xs text-stone-500 dark:text-stone-400 ${className}`}
    >
      {relativa(iso, agora)}
    </time>
  );
}
