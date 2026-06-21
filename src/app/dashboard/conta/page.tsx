"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth";
import { useSubscricao } from "@/lib/stripe/subscription";
import { getSupabase } from "@/lib/supabase/client";
import {
  Check, Warning, History, BellAlert, ArrowLeft, ArrowRight,
  Lock, Eye, EyeOff,
} from "@/components/ui/Icons";

const campo =
  "w-full px-3.5 py-2.5 text-[16px] text-stone-800 dark:text-stone-100 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all";
const rotulo = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400";

export default function ContaPage() {
  const { user, carregado, disponivel, entrar, registar, sair } = useAuth();
  const [modo, setModo] = useState<"entrar" | "registar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [aProcessar, setAProcessar] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    setAProcessar(true);
    const r = modo === "entrar" ? await entrar(email, password) : await registar(email, password);
    setAProcessar(false);
    if (r.erro) {
      setErro(r.erro);
      return;
    }
    if (modo === "registar" && "confirmarEmail" in r && r.confirmarEmail) {
      setConfirmar(true);
    }
  };

  if (!disponivel) {
    return (
      <Wrapper>
        <div className="flex items-start gap-2.5 rounded-2xl border border-alert-border bg-alert-bg p-4">
          <span className="mt-0.5 flex-shrink-0 text-alert-text"><Warning size={14} /></span>
          <p className="text-sm leading-relaxed text-alert-text">
            A conta na nuvem ainda não está configurada neste ambiente. Continua a usar o ReciboCerto em modo local — os
            teus dados ficam guardados neste dispositivo.
          </p>
        </div>
      </Wrapper>
    );
  }

  if (!carregado) {
    return (
      <Wrapper>
        <div className="h-40 animate-pulse rounded-4xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900" />
      </Wrapper>
    );
  }

  if (user) {
    return (
      <Wrapper>
        <div className="space-y-5">
          {/* Sessão */}
          <div className="rounded-4xl border border-stone-100 bg-white p-7 shadow-card dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand">
                <Check size={20} />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Sessão iniciada</h2>
                <p className="truncate text-sm text-stone-500 dark:text-stone-400">{user.email}</p>
              </div>
            </div>

            <SecaoSubscricao />

            <div className="mt-5 space-y-2.5 border-t border-stone-100 pt-5 dark:border-stone-800">
              <Beneficio icon={<History size={16} />} texto="Os teus recibos vão ficar seguros na nuvem e em todos os dispositivos." />
              <Beneficio icon={<BellAlert size={16} />} texto="Alertas de prazos por email para nunca falhares um pagamento." />
            </div>

            <p className="mt-5 rounded-xl bg-cream p-3 text-xs leading-relaxed text-stone-500 dark:bg-stone-800 dark:text-stone-400">
              A tua conta está criada e pronta. Com o plano Pro, os teus recibos ficam sincronizados na nuvem em todos os dispositivos.
            </p>

            <button
              type="button"
              onClick={sair}
              className="mt-5 inline-flex justify-center rounded-2xl border border-stone-200 px-5 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-300 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-600"
            >
              Terminar sessão
            </button>
          </div>

          {/* Alterar password */}
          <SecaoPassword />
        </div>
      </Wrapper>
    );
  }

  if (confirmar) {
    return (
      <Wrapper>
        <div className="rounded-4xl border border-stone-100 bg-white p-7 shadow-card dark:border-stone-800 dark:bg-stone-900">
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-light text-brand">
            <Check size={20} />
          </span>
          <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">Confirma o teu email</h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            Enviámos um link de confirmação para <span className="font-semibold text-stone-700 dark:text-stone-200">{email}</span>. Abre-o
            para ativar a conta e depois volta aqui para entrar.
          </p>
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <div className="rounded-4xl border border-stone-100 bg-white p-7 shadow-card dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-5 inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1 dark:border-stone-700 dark:bg-stone-800">
          {([
            { id: "entrar", label: "Entrar" },
            { id: "registar", label: "Criar conta" },
          ] as const).map((o) => {
            const ativo = modo === o.id;
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={ativo}
                onClick={() => {
                  setModo(o.id);
                  setErro("");
                }}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${ativo ? "bg-white text-brand-dark shadow-card dark:bg-stone-700 dark:text-brand" : "text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"}`}
              >
                {o.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className={rotulo}>Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={campo}
              placeholder="o-teu@email.pt"
            />
          </div>
          <div>
            <label htmlFor="password" className={rotulo}>Password</label>
            <input
              id="password"
              type="password"
              autoComplete={modo === "entrar" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={campo}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {erro && (
            <div className="flex items-start gap-2 rounded-xl border border-alert-border bg-alert-bg p-3">
              <span className="mt-0.5 flex-shrink-0 text-alert-text"><Warning size={13} /></span>
              <span className="text-xs leading-relaxed text-alert-text">{erro}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={aProcessar}
            className="btn-shine inline-flex w-full justify-center rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float disabled:cursor-not-allowed disabled:opacity-60"
          >
            {aProcessar ? "A processar…" : modo === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs leading-relaxed text-stone-400">
          Criar conta é opcional e gratuito. Sem conta, o ReciboCerto continua a funcionar neste dispositivo.
        </p>
      </div>
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md">
      <Link href="/dashboard" className="mb-5 inline-flex items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-stone-700 dark:hover:text-stone-200">
        <ArrowLeft size={13} />
        Voltar ao painel
      </Link>
      <header className="mb-6">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-stone-400">Conta · Segurança</p>
        <h1 className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">Conta e segurança</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Gere a tua sessão e altera a tua password.</p>
      </header>
      {children}
    </div>
  );
}

function Beneficio({ icon, texto }: { icon: React.ReactNode; texto: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex-shrink-0 text-brand">{icon}</span>
      <span className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{texto}</span>
    </div>
  );
}

function SecaoSubscricao() {
  const { plano, status, abrirPortal } = useSubscricao();

  if (plano === "pro") {
    return (
      <div className="mt-5 flex items-center justify-between rounded-2xl border border-brand/20 bg-brand-light/50 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">Plano Pro</span>
            <span className="inline-flex items-center rounded-full bg-brand px-2 py-0.5 text-[9px] font-semibold text-white">
              {status === "active" ? "Ativo" : "A experimentar"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">Acesso a todas as funcionalidades.</p>
        </div>
        <button
          type="button"
          onClick={abrirPortal}
          className="flex items-center gap-1 text-xs font-semibold text-brand-dark transition-colors hover:underline dark:text-brand"
        >
          Gerir
          <ArrowRight size={11} />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-800">
      <div>
        <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">Plano Grátis</span>
        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">Passa ao Pro para desbloquear alertas, nuvem e exportação.</p>
      </div>
      <a
        href="/dashboard/upgrade"
        className="flex items-center gap-1 rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-shadow hover:shadow-glow"
      >
        Upgrade
        <ArrowRight size={11} />
      </a>
    </div>
  );
}

function SecaoPassword() {
  const [novaPassword, setNovaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [mostrarNova, setMostrarNova] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [aProcessar, setAProcessar] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (novaPassword.length < 6) {
      setMsg({ tipo: "erro", texto: "A password tem de ter pelo menos 6 caracteres." });
      return;
    }

    if (novaPassword !== confirmarPassword) {
      setMsg({ tipo: "erro", texto: "As passwords não coincidem." });
      return;
    }

    setAProcessar(true);
    try {
      const { error } = await getSupabase().auth.updateUser({ password: novaPassword });
      if (error) {
        const m = error.message.toLowerCase();
        let texto = error.message;
        if (m.includes("same password") || m.includes("different from the old")) {
          texto = "A nova password tem de ser diferente da atual.";
        } else if (m.includes("password should be at least")) {
          texto = "A password tem de ter pelo menos 6 caracteres.";
        } else if (m.includes("reauthentication") || m.includes("session")) {
          texto = "Por segurança, inicia sessão novamente antes de alterar a password.";
        }
        setMsg({ tipo: "erro", texto });
      } else {
        setMsg({ tipo: "sucesso", texto: "Password alterada com sucesso." });
        setNovaPassword("");
        setConfirmarPassword("");
      }
    } catch {
      setMsg({ tipo: "erro", texto: "Ocorreu um erro inesperado. Tenta novamente." });
    }
    setAProcessar(false);
  };

  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-7 shadow-card dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center gap-3 mb-5">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand">
          <Lock size={20} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Alterar password</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">Define uma nova password para a tua conta.</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="nova-password" className={rotulo}>Nova password</label>
          <div className="relative">
            <input
              id="nova-password"
              type={mostrarNova ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={6}
              value={novaPassword}
              onChange={(e) => setNovaPassword(e.target.value)}
              className={`${campo} pr-11`}
              placeholder="Mínimo 6 caracteres"
            />
            <button
              type="button"
              onClick={() => setMostrarNova((v) => !v)}
              aria-label={mostrarNova ? "Esconder password" : "Mostrar password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
            >
              {mostrarNova ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmar-password" className={rotulo}>Confirmar password</label>
          <div className="relative">
            <input
              id="confirmar-password"
              type={mostrarConfirmar ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              className={`${campo} pr-11`}
              placeholder="Repete a nova password"
            />
            <button
              type="button"
              onClick={() => setMostrarConfirmar((v) => !v)}
              aria-label={mostrarConfirmar ? "Esconder password" : "Mostrar password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
            >
              {mostrarConfirmar ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {msg && (
          <div className={`flex items-start gap-2 rounded-xl border p-3 ${
            msg.tipo === "sucesso"
              ? "border-brand/20 bg-brand-light"
              : "border-alert-border bg-alert-bg"
          }`}>
            <span className={`mt-0.5 flex-shrink-0 ${msg.tipo === "sucesso" ? "text-brand" : "text-alert-text"}`}>
              {msg.tipo === "sucesso" ? <Check size={13} /> : <Warning size={13} />}
            </span>
            <span className={`text-xs leading-relaxed ${msg.tipo === "sucesso" ? "text-brand-dark" : "text-alert-text"}`}>
              {msg.texto}
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={aProcessar}
          className="inline-flex w-full justify-center rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float disabled:cursor-not-allowed disabled:opacity-60"
        >
          {aProcessar ? "A alterar…" : "Alterar password"}
        </button>
      </form>
    </div>
  );
}
