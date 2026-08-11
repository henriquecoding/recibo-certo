"use client";

import { useState, useEffect, useRef } from "react";
import { m, AnimatePresence } from "motion/react";
import { Close, ArrowRight, User, Google, Linkedin, Check } from "@/components/ui/Icons";
import { useAuth } from "@/lib/supabase/auth";
import { validarPassword } from "@/lib/validacao-password";
import { useModalA11y } from "@/hooks/useModalA11y";
import { useOverlay } from "@/components/overlays/CoordenadorOverlays";

export default function AuthModal() {
  const {
    modalAberto: querAbrir, modoModal, fecharModal,
    entrar, registar, entrarComGoogle, entrarComLinkedin,
    disponivel,
  } = useAuth();

  // A vaga do coordenador: nunca dois `aria-modal` ao mesmo tempo.
  const modalAberto = useOverlay("auth", querAbrir, { modal: true, iniciadoPeloUtilizador: true });

  const [modo, setModo] = useState<"entrar" | "criar">(modoModal);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [aEnviar, setAEnviar] = useState(false);
  const [oauthEmCurso, setOauthEmCurso] = useState<"google" | "linkedin" | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Sincroniza o modo quando o modal abre
  useEffect(() => {
    if (modalAberto) {
      setModo(modoModal);
      setErro("");
      setInfo("");
      setEmail("");
      setPassword("");
      setTimeout(() => emailRef.current?.focus(), 100);
    }
  }, [modalAberto, modoModal]);

  // Escape + scroll-lock + focus-trap + restauro de foco.
  useModalA11y(modalAberto, fecharModal, dialogRef);

  const errosPw = modo === "criar" && password.length > 0 ? validarPassword(password) : [];

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setInfo("");

    if (modo === "criar") {
      const erros = validarPassword(password);
      if (erros.length > 0) { setErro(erros[0].mensagem); return; }
    }

    setAEnviar(true);

    if (modo === "criar") {
      const res = await registar(email.trim(), password);
      if (res.erro) { setErro(res.erro); setAEnviar(false); return; }
      if (res.confirmarEmail) {
        setInfo("Conta criada! Confirma o teu email para ativares a conta.");
        setModo("entrar");
        setAEnviar(false);
        return;
      }
    } else {
      const res = await entrar(email.trim(), password);
      if (res.erro) { setErro(res.erro); setAEnviar(false); return; }
    }
    setAEnviar(false);
  }

  async function handleGoogle() {
    setErro("");
    setOauthEmCurso("google");
    const res = await entrarComGoogle();
    if (res.erro) { setErro(res.erro); setOauthEmCurso(null); }
  }

  async function handleLinkedin() {
    setErro("");
    setOauthEmCurso("linkedin");
    const res = await entrarComLinkedin();
    if (res.erro) { setErro(res.erro); setOauthEmCurso(null); }
  }

  if (!disponivel) return null;

  return (
    <AnimatePresence>
      {modalAberto && (
        <>
          <m.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[8000] bg-black/50 backdrop-blur-sm"
            onClick={fecharModal}
            aria-hidden
          />

          {/* Contentor de posição — folha inferior no telemóvel, centrado no desktop. */}
          <div className="pointer-events-none fixed inset-0 z-[8001] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <m.div
            key="modal"
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal
            aria-labelledby="auth-modal-titulo"
            className="pointer-events-auto flex max-h-[90dvh] w-full max-w-sm flex-col overflow-hidden rounded-t-4xl bg-white shadow-float outline-none dark:bg-stone-900 sm:rounded-4xl"
          >
            {/* Puxador (folha inferior, só no telemóvel) */}
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-stone-200 dark:bg-stone-700 sm:hidden" aria-hidden />
            {/* Cabeçalho */}
            <div className="relative flex shrink-0 flex-col items-center px-8 pt-5 pb-5 border-b border-stone-100 dark:border-stone-800 sm:pt-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand shadow-glow mb-3">
                <User size={20} className="text-white" />
              </div>
              <h2 id="auth-modal-titulo" className="font-display text-[18px] font-semibold text-stone-800 dark:text-stone-100">
                {modo === "entrar" ? "Bem-vindo de volta" : "Criar conta grátis"}
              </h2>
              <p className="mt-1 text-[12px] text-stone-400 dark:text-stone-500 text-center">
                {modo === "entrar"
                  ? "Entra para sincronizar os teus dados na nuvem."
                  : "Cria conta para guardar e aceder em qualquer dispositivo."}
              </p>
              <button
                type="button"
                onClick={fecharModal}
                aria-label="Fechar"
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:hover:bg-stone-800"
              >
                <Close size={16} />
              </button>
            </div>

            {/* Corpo scrollável — min-h-0 essencial para o overflow dentro do flex column */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="px-8 py-6 space-y-3">
              {/* Google */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={!!oauthEmCurso || aEnviar}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition-all hover:bg-stone-50 hover:border-stone-300 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
              >
                <Google size={18} className="text-stone-600 dark:text-stone-300" />
                {oauthEmCurso === "google" ? "A redirecionar…" : "Continuar com Google"}
              </button>

              {/* LinkedIn */}
              <button
                type="button"
                onClick={handleLinkedin}
                disabled={!!oauthEmCurso || aEnviar}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition-all hover:bg-stone-50 hover:border-stone-300 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
              >
                <Linkedin size={18} className="text-stone-600 dark:text-stone-300" />
                {oauthEmCurso === "linkedin" ? "A redirecionar…" : "Continuar com LinkedIn"}
              </button>

              {/* Divisor */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
                <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500">ou</span>
                <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
              </div>

              {/* Formulário email/password */}
              <form onSubmit={submeter} className="space-y-3">
                <div>
                  <label htmlFor="auth-email" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Email
                  </label>
                  <input
                    ref={emailRef}
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-800 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-brand"
                    placeholder="o-teu@email.pt"
                  />
                </div>
                <div>
                  <label htmlFor="auth-password" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Password
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                    minLength={modo === "criar" ? 8 : 1}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-800 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-brand"
                    placeholder={modo === "criar" ? "Min. 8 caract., 1 maiúscula, 1 número" : "A tua password"}
                  />
                  {modo === "criar" && password.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      <ReqPw ok={!errosPw.some((e) => e.tipo === "comprimento")} texto="Mínimo 8 caracteres" />
                      <ReqPw ok={!errosPw.some((e) => e.tipo === "maiuscula")} texto="1 letra maiúscula" />
                      <ReqPw ok={!errosPw.some((e) => e.tipo === "numero")} texto="1 número" />
                    </div>
                  )}
                </div>

                {erro && (
                  <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
                    {erro}
                  </p>
                )}
                {info && (
                  <p role="status" className="rounded-xl bg-brand-light px-3.5 py-2.5 text-xs text-brand-dark dark:bg-brand/10 dark:text-brand">
                    {info}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={aEnviar || !!oauthEmCurso}
                  className="btn-shine flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:shadow-float disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  {aEnviar ? "A processar…" : modo === "entrar" ? "Entrar" : "Criar conta"}
                  {!aEnviar && <ArrowRight size={14} />}
                </button>
              </form>
            </div>

            {/* Rodapé — alternar modo */}
            <div className="px-8 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-1 text-center">
              <button
                type="button"
                onClick={() => { setModo(prev => prev === "entrar" ? "criar" : "entrar"); setErro(""); setInfo(""); }}
                className="text-[12px] text-stone-400 transition-colors hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
              >
                {modo === "entrar"
                  ? "Não tens conta? Cria uma grátis"
                  : "Já tens conta? Entra aqui"}
              </button>
            </div>
            </div>
          </m.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function ReqPw({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full ${ok ? "bg-brand text-white" : "border border-stone-300 dark:border-stone-600"}`}>
        {ok && <Check size={7} />}
      </span>
      <span className={`text-[10px] ${ok ? "text-brand-dark dark:text-brand" : "text-stone-400"}`}>{texto}</span>
    </div>
  );
}
