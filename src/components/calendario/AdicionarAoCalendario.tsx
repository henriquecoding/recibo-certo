"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ADICIONAR ESTA CONSULTA AO CALENDÁRIO
//  ---------------------------------------------------------------------
//  Isto NÃO é sincronização, e o texto diz isso — uma cópia feita agora
//  não sabe que a consulta mudou de hora amanhã. A sincronização a sério
//  é a subscrição, e vive em `SincronizarCalendario`.
//
//  Existe na mesma porque resolve o momento em que a pessoa está a olhar
//  para uma data e pensa «não me posso esquecer disto». Obrigá-la a ir
//  configurar um feed nesse instante é perder o instante.
//
//  O `.ics` é gerado no browser, a partir de um `Blob`. Não passa pelo
//  servidor porque não precisa: tudo o que entra no ficheiro já está no
//  ecrã de quem carrega no botão.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import {
  construirCalendario, linkGoogle, linkOutlook, type EventoICS,
} from "@/lib/calendario/ics";
import { CalendarSync, Download, ExternalLink, Google } from "@/components/ui/Icons";

export default function AdicionarAoCalendario({
  id,
  inicio,
  fim,
  titulo,
  descricao,
  local,
  className = "",
}: {
  id: string;
  /** Instantes ISO 8601. */
  inicio: string;
  fim: string;
  titulo: string;
  descricao?: string;
  local?: string | null;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  // Fechar ao carregar fora e com Escape. Um menu que só fecha no próprio
  // botão fica aberto por cima do que a pessoa quer ler a seguir.
  useEffect(() => {
    if (!aberto) return;
    function fora(e: MouseEvent) {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", escape);
    };
  }, [aberto]);

  const evento: EventoICS = {
    uid: `agendamento-${id}@recibocerto.pt`,
    inicio: new Date(inicio),
    fim: new Date(fim),
    titulo,
    descricao,
    local: local ?? undefined,
    alarmeMin: 60,
  };

  function descarregar() {
    const ics = construirCalendario([evento], { nome: "Recibo Certo" });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "consulta.ics";
    a.click();
    // Sem isto, o Blob fica na memória do separador até ele fechar.
    URL.revokeObjectURL(url);
    setAberto(false);
  }

  return (
    <div ref={caixa} className={`relative inline-block ${className}`}>
      <button
        type="button"
        aria-expanded={aberto}
        aria-haspopup="menu"
        onClick={() => setAberto((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <CalendarSync size={13} aria-hidden /> Pôr no calendário
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1.5 w-64 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-lift"
        >
          <a
            role="menuitem"
            href={linkGoogle(evento)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setAberto(false)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <Google size={14} aria-hidden /> Google Calendar
            <ExternalLink size={10} className="ml-auto text-stone-400" aria-hidden />
          </a>
          <a
            role="menuitem"
            href={linkOutlook(evento)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setAberto(false)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <CalendarSync size={14} aria-hidden /> Outlook
            <ExternalLink size={10} className="ml-auto text-stone-400" aria-hidden />
          </a>
          <button
            role="menuitem"
            type="button"
            onClick={descarregar}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-stone-700 transition-colors hover:bg-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <Download size={14} aria-hidden /> Apple, ou outro (.ics)
          </button>

          <p className="px-3 pb-1 pt-2 text-[10px] leading-relaxed text-stone-400">
            Isto copia a consulta como ela está agora. Se mudar de hora, a cópia não
            muda — para isso, subscreve a agenda inteira.
          </p>
        </div>
      )}
    </div>
  );
}
