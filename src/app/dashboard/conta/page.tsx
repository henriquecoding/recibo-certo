"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth";
import { Check, Warning, History, BellAlert, ArrowLeft } from "@/components/ui/Icons";

const campo =
  "w-full px-3.5 py-2.5 text-[16px] text-stone-800 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all";
const rotulo = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-stone-500";

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

  // ── Supabase não configurado ──
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
        <div className="h-40 animate-pulse rounded-4xl border border-stone-100 bg-white shadow-card" />
      </Wrapper>
    );
  }

  // ── Sessão iniciada ──
  if (user) {
    return (
      <Wrapper>
        <div className="rounded-4xl border border-stone-100 bg-white p-7 shadow-card">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand">
              <Check size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-stone-800">Sessão iniciada</h2>
              <p className="truncate text-sm text-stone-500">{user.email}</p>
            </div>
          </div>

          <div className="mt-5 space-y-2.5 border-t border-stone-100 pt-5">
            <Beneficio icon={<History size={16} />} texto="Os teus recibos vão ficar seguros na nuvem e em todos os dispositivos." />
            <Beneficio icon={<BellAlert size={16} />} texto="Em breve: alertas de prazos por email para nunca falhares um pagamento." />
          </div>

          <p className="mt-5 rounded-xl bg-cream p-3 text-xs leading-relaxed text-stone-500">
            A sincronização automática dos recibos está a ser ligada. Para já, a tua conta está criada e pronta.
          </p>

          <button
            type="button"
            onClick={sair}
            className="mt-5 inline-flex justify-center rounded-2xl border border-stone-200 px-5 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-300"
          >
            Terminar sessão
          </button>
        </div>
      </Wrapper>
    );
  }

  // ── Email enviado (confirmação) ──
  if (confirmar) {
    return (
      <Wrapper>
        <div className="rounded-4xl border border-stone-100 bg-white p-7 shadow-card">
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-light text-brand">
            <Check size={20} />
          </span>
          <h2 className="font-display text-xl font-semibold text-stone-800">Confirma o teu email</h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            Enviámos um link de confirmação para <span className="font-semibold text-stone-700">{email}</span>. Abre-o
            para ativar a conta e depois volta aqui para entrar.
          </p>
        </div>
      </Wrapper>
    );
  }

  // ── Formulário entrar / registar ──
  return (
    <Wrapper>
      <div className="rounded-4xl border border-stone-100 bg-white p-7 shadow-card">
        <div className="mb-5 inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1">
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
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${ativo ? "bg-white text-brand-dark shadow-card" : "text-stone-500 hover:text-stone-700"}`}
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
      <Link href="/dashboard" className="mb-5 inline-flex items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-stone-700">
        <ArrowLeft size={13} />
        Voltar ao painel
      </Link>
      <header className="mb-6">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-stone-400">Conta · Sincronização</p>
        <h1 className="font-display text-3xl font-semibold text-stone-800">Conta na nuvem</h1>
        <p className="mt-1 text-sm text-stone-500">Entra para guardares os teus recibos na nuvem e em todos os dispositivos.</p>
      </header>
      {children}
    </div>
  );
}

function Beneficio({ icon, texto }: { icon: React.ReactNode; texto: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex-shrink-0 text-brand">{icon}</span>
      <span className="text-sm leading-relaxed text-stone-600">{texto}</span>
    </div>
  );
}
