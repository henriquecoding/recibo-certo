"use client";

// ═══════════════════════════════════════════════════════════════════════
//  SINO — o que aconteceu enquanto não estavas a olhar
//  ---------------------------------------------------------------------
//  Só mostra o que PEDE alguma coisa: uma mensagem para responder, um
//  pedido de vínculo para decidir, uma consulta para confirmar. Nada de
//  «alguém viu o teu perfil» — um sino que toca por tudo deixa de se ouvir.
//
//  Chega por Realtime. Sem sondagem: um `setInterval` a perguntar de dez em
//  dez segundos gasta o plano gratuito a fazer nada na maior parte das
//  vezes, e mesmo assim chega tarde.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { EASE } from "@/lib/motion";
import { useAuth } from "@/lib/supabase/auth";
import {
  escutarNotificacoes, listarNotificacoes, marcarNotificacaoLida,
  marcarTodasLidas, type Notificacao,
} from "@/lib/contabilistas/conversa";
import { BellAlert, Check, Close } from "@/components/ui/Icons";

export default function SinoNotificacoes() {
  const { user, carregado, disponivel } = useAuth();
  const [avisos, setAvisos] = useState<Notificacao[]>([]);
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  const porLer = avisos.filter((a) => !a.lidaEm).length;

  useEffect(() => {
    if (!carregado || !user || !disponivel) return;
    let vivo = true;
    listarNotificacoes()
      .then((l) => { if (vivo) setAvisos(l); })
      .catch(() => { /* sem sino é melhor do que com um erro por cima da app */ });
    return () => { vivo = false; };
  }, [carregado, user, disponivel]);

  useEffect(() => {
    if (!user || !disponivel) return;
    return escutarNotificacoes(user.id, (nova) => {
      setAvisos((atuais) => (atuais.some((a) => a.id === nova.id) ? atuais : [nova, ...atuais]));
    });
  }, [user, disponivel]);

  // Fechar ao clicar fora e com Escape.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  const abrir = useCallback(async (n: Notificacao) => {
    if (!n.lidaEm) {
      setAvisos((a) => a.map((x) => (x.id === n.id ? { ...x, lidaEm: new Date().toISOString() } : x)));
      void marcarNotificacaoLida(n.id);
    }
    setAberto(false);
  }, []);

  if (!carregado || !user || !disponivel) return null;

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        aria-label={porLer > 0 ? `Notificações: ${porLer} por ler` : "Notificações"}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
      >
        <BellAlert size={19} aria-hidden />
        {porLer > 0 && (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand px-1 text-[0.625rem] font-bold tabular-nums text-white"
          >
            {porLer > 9 ? "9+" : porLer}
          </span>
        )}
      </button>

      <AnimatePresence>
        {aberto && (
          <m.div
            role="dialog"
            aria-label="Notificações"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ duration: 0.25, ease: EASE }}
            // No telemóvel encosta às margens do ecrã em vez de sair por
            // fora; a partir de `sm` alinha pela direita do botão.
            className="fixed inset-x-3 top-16 z-50 max-h-[70dvh] overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-float sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-80"
          >
            <header className="flex items-center justify-between gap-2 border-b border-stone-100 px-4 py-3">
              <h2 className="font-display text-base text-ink">Notificações</h2>
              <span className="flex items-center gap-1">
                {porLer > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvisos((a) => a.map((x) => ({ ...x, lidaEm: x.lidaEm ?? new Date().toISOString() })));
                      void marcarTodasLidas();
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-dark hover:bg-brand-light"
                  >
                    <Check size={13} aria-hidden /> Marcar lidas
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  aria-label="Fechar"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 sm:hidden"
                >
                  <Close size={16} aria-hidden />
                </button>
              </span>
            </header>

            <div className="max-h-[calc(70dvh-3.25rem)] overflow-y-auto sm:max-h-80">
              {avisos.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm leading-relaxed text-stone-400">
                  Nada por aqui.<br />Avisamos-te quando houver.
                </p>
              ) : (
                <ul>
                  {avisos.map((n) => {
                    const conteudo = (
                      <>
                        <span className="flex items-start gap-2.5">
                          {!n.lidaEm && (
                            <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                          )}
                          <span className={`min-w-0 ${n.lidaEm ? "pl-[1.125rem]" : ""}`}>
                            <span className={`block text-sm ${n.lidaEm ? "text-stone-600" : "font-semibold text-stone-800"}`}>
                              {n.titulo}
                            </span>
                            {n.corpo && (
                              <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">{n.corpo}</span>
                            )}
                            <span className="mt-1 block text-xs text-stone-400">{quando(n.criadoEm)}</span>
                          </span>
                        </span>
                      </>
                    );
                    return (
                      <li key={n.id} className="border-b border-stone-100 last:border-0">
                        {n.url ? (
                          <Link href={n.url} onClick={() => void abrir(n)} className="block px-4 py-3 transition-colors hover:bg-cream">
                            {conteudo}
                          </Link>
                        ) : (
                          <button type="button" onClick={() => void abrir(n)} className="block w-full px-4 py-3 text-left transition-colors hover:bg-cream">
                            {conteudo}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** «há 5 min», «ontem», «12 ago». Relativo enquanto ajuda, absoluto depois. */
function quando(iso: string): string {
  const minutos = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  if (horas < 48) return "ontem";
  return new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short" }).format(new Date(iso));
}
