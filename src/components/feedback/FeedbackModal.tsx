"use client";

// Modal global da Central de Feedback. Montado uma vez (no layout) e aberto por
// qualquer parte do site através do evento `recibocerto:feedback:abrir`
// (opcionalmente com { tipo, area } no detail). O envio é lazy — o SDK do
// Supabase só entra quando o utilizador submete.

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import { Lightbulb, Warning, Info, Heart, Close, Check, Zap, Mail, ShieldCheck } from "@/components/ui/Icons";
import { useAuth } from "@/lib/supabase/auth";
import type { TipoFeedback } from "@/lib/supabase/feedback";
import { contemCodigo, emailValido } from "@/lib/feedback-sanitize";
import { EVENTO_ABRIR_FEEDBACK } from "@/components/feedback/abrir";

interface AberturaDetalhe {
  tipo?: TipoFeedback;
  area?: string;
}

const TIPOS: { id: TipoFeedback; label: string; desc: string; Icon: typeof Lightbulb }[] = [
  { id: "sugestao", label: "Sugestão", desc: "Uma ideia", Icon: Lightbulb },
  { id: "erro", label: "Reportar erro", desc: "Algo partido", Icon: Warning },
  { id: "duvida", label: "Dúvida", desc: "Uma pergunta", Icon: Info },
  { id: "mensagem", label: "Mensagem", desc: "Elogio ou outro", Icon: Heart },
];

const MAX = 4000;

export default function FeedbackModal() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoFeedback>("sugestao");
  const [mensagem, setMensagem] = useState("");
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [areaOrigem, setAreaOrigem] = useState<string>("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const repor = useCallback(() => {
    setTipo("sugestao");
    setMensagem("");
    setEmail("");
    setNome("");
    setErro("");
    setSucesso(false);
    setEnviando(false);
  }, []);

  const fechar = useCallback(() => setAberto(false), []);

  // Abertura por evento global (header desktop, chrome móvel, contextos do site).
  useEffect(() => {
    function abrir(e: Event) {
      const det = (e as CustomEvent<AberturaDetalhe>).detail;
      repor();
      if (det?.tipo) setTipo(det.tipo);
      setAreaOrigem(det?.area || pathname || "");
      setAberto(true);
    }
    window.addEventListener(EVENTO_ABRIR_FEEDBACK, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_FEEDBACK, abrir);
  }, [pathname, repor]);

  // Foco no campo de mensagem + fechar com Esc + bloquear scroll de fundo.
  useEffect(() => {
    if (!aberto) return;
    const t = setTimeout(() => textRef.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") fechar(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [aberto, fechar]);

  async function submeter() {
    setErro("");
    const msg = mensagem.trim();
    if (msg.length < 4) { setErro("Escreve um pouco mais para podermos ajudar."); return; }
    // Segurança: nada de código, HTML ou scripts.
    if (contemCodigo(mensagem)) {
      setErro("Por segurança, não incluas código, HTML ou scripts na mensagem.");
      return;
    }
    if (!emailValido(email)) { setErro("O email indicado não parece válido."); return; }
    setEnviando(true);
    const { enviarFeedback } = await import("@/lib/supabase/feedback");
    const { erro: e } = await enviarFeedback({
      tipo, mensagem: msg, area: areaOrigem, nome, email, userId: user?.id ?? null,
    });
    setEnviando(false);
    if (e) { setErro(e); return; }
    setSucesso(true);
  }

  const tipoAtual = TIPOS.find((t) => t.id === tipo) ?? TIPOS[0];

  return (
    <AnimatePresence>
      {aberto && (
        <div className="fixed inset-0 z-[9100]" role="dialog" aria-modal="true" aria-labelledby="feedback-titulo">
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
            onClick={fechar}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
            <m.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-4xl border border-stone-200/80 bg-white shadow-float dark:border-stone-800 dark:bg-stone-900 sm:rounded-4xl"
            >
              {/* Puxador (folha inferior, telemóvel) */}
              <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-stone-200 dark:bg-stone-700 sm:hidden" aria-hidden />

              {/* Cabeçalho (fixo) */}
              <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-3 pt-4 sm:px-6 sm:pt-5">
                <div className="min-w-0">
                  <h2 id="feedback-titulo" className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
                    {sucesso ? "Recebido. Obrigado!" : "Ajuda-nos a melhorar"}
                  </h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                    {sucesso ? "A tua mensagem chegou à equipa." : "Sugestão, erro, dúvida ou só uma mensagem."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fechar}
                  aria-label="Fechar"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
                >
                  <Close size={16} />
                </button>
              </div>

              {/* Banner de XP — sempre visível, no topo (não fica escondido em scroll) */}
              {!sucesso && (
                <div className="mx-5 mb-1 flex shrink-0 items-center gap-3 rounded-2xl bg-gradient-to-br from-brand to-brand-dark px-4 py-3 text-white shadow-glow sm:mx-6">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                    <Zap size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold leading-tight">Ganha XP no Quiz Fiscal</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-white/85">
                      {user
                        ? "Se a equipa validar o teu contributo, recebes XP automaticamente."
                        : "Inicia sessão antes de enviar para receberes XP quando for validado."}
                    </p>
                  </div>
                </div>
              )}

              {sucesso ? (
                <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-2 text-center">
                  <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-light text-brand">
                    <Check size={30} />
                  </span>
                  <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                    A equipa do ReciboCerto vai analisar a tua {tipoAtual.label.toLowerCase()}. Se for válida e concreta,
                    entra no nosso plano de melhorias.
                  </p>
                  <div className={`mt-4 flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-left text-xs leading-relaxed ${user ? "border-brand/20 bg-brand-light/60 text-brand-dark dark:bg-brand/10 dark:text-brand" : "border-stone-200 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-400"}`}>
                    <Zap size={15} className="mt-0.5 shrink-0 text-brand" />
                    {user
                      ? "Tens sessão iniciada — se a equipa validar este contributo, ganhas XP no Quiz Fiscal."
                      : "Da próxima vez, inicia sessão antes de enviar: contributos validados dão XP no Quiz Fiscal."}
                  </div>
                  <button
                    type="button"
                    onClick={fechar}
                    className="btn-shine mt-6 w-full rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <>
                  {/* Corpo scrollável (apenas tipos + mensagem + contacto) */}
                  <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 sm:px-6">
                    {/* Tipo */}
                    <fieldset>
                      <legend className="mb-2 text-xs font-semibold text-stone-500 dark:text-stone-400">O que queres enviar?</legend>
                      <div className="grid grid-cols-2 gap-2">
                        {TIPOS.map((t) => {
                          const ativo = t.id === tipo;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setTipo(t.id)}
                              aria-pressed={ativo}
                              className={`flex items-center gap-2.5 rounded-2xl border p-2.5 text-left transition-all ${
                                ativo
                                  ? "border-brand bg-brand-light/60 ring-1 ring-brand dark:bg-brand/10"
                                  : "border-stone-200 hover:border-stone-300 dark:border-stone-700 dark:hover:border-stone-600"
                              }`}
                            >
                              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${ativo ? "bg-brand text-white" : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"}`}>
                                <t.Icon size={15} />
                              </span>
                              <span className="min-w-0">
                                <span className={`block text-[13px] font-semibold leading-tight ${ativo ? "text-brand-dark dark:text-brand" : "text-stone-800 dark:text-stone-100"}`}>{t.label}</span>
                                <span className="block truncate text-[11px] text-stone-400">{t.desc}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    {/* Mensagem */}
                    <label htmlFor="fb-msg" className="mb-1.5 mt-4 block text-xs font-semibold text-stone-500 dark:text-stone-400">
                      A tua mensagem
                    </label>
                    <textarea
                      id="fb-msg"
                      ref={textRef}
                      value={mensagem}
                      onChange={(e) => setMensagem(e.target.value.slice(0, MAX))}
                      rows={4}
                      placeholder="Conta-nos com o máximo de detalhe possível…"
                      className="w-full resize-none rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                    />
                    <div className="mt-1 flex items-center justify-between text-[11px] text-stone-400">
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck size={12} className="text-brand" /> Sem código nem HTML, por segurança.
                      </span>
                      <span className="tabular-nums">{mensagem.length}/{MAX}</span>
                    </div>

                    {/* Contacto (só anónimos) */}
                    {!user && (
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          maxLength={80}
                          placeholder="Nome (opcional)"
                          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                        />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          maxLength={160}
                          placeholder="Email para resposta (opcional)"
                          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                        />
                      </div>
                    )}

                    {erro && (
                      <p className="mt-3 flex items-start gap-2 rounded-xl border border-alert-border bg-alert-bg px-3 py-2 text-xs text-alert-text">
                        <Warning size={13} className="mt-0.5 shrink-0" /> {erro}
                      </p>
                    )}
                  </div>

                  {/* Rodapé (fixo) — Enviar sempre visível */}
                  <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-stone-100 px-5 pb-[max(1.1rem,env(safe-area-inset-bottom))] pt-3 dark:border-stone-800 sm:px-6">
                    <button
                      type="button"
                      onClick={fechar}
                      className="rounded-2xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={submeter}
                      disabled={enviando}
                      className="btn-shine inline-flex items-center gap-1.5 rounded-2xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:bg-brand-dark hover:shadow-float disabled:opacity-60"
                    >
                      <Mail size={15} /> {enviando ? "A enviar…" : "Enviar"}
                    </button>
                  </div>
                </>
              )}
            </m.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
