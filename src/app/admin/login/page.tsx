"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/client";
import { verificarAdmin } from "@/lib/supabase/admin";
import { CheckTrend, ArrowRight } from "@/components/ui/Icons";

export default function AdminLogin() {
  const router = useRouter();
  const { user, carregado, disponivel, entrar, registar, sair } = useAuth();
  const [email, setEmail] = useState("admin@recibocerto.pt");
  const [password, setPassword] = useState("");
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [aEnviar, setAEnviar] = useState(false);

  // Redireciona se já autenticado como admin
  useEffect(() => {
    if (!carregado || !user) return;
    verificarAdmin(user.id).then((ok) => {
      if (ok) router.replace("/admin");
    });
  }, [carregado, user, router]);

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setInfo("");
    setAEnviar(true);

    if (modo === "criar") {
      const res = await registar(email.trim(), password);
      if (res.erro) { setErro(res.erro); setAEnviar(false); return; }
      if (res.confirmarEmail) {
        setInfo("Conta criada. Confirma o teu email e volta a entrar. Se o projecto Supabase não exige confirmação, podes entrar já.");
        setModo("entrar");
        setAEnviar(false);
        return;
      }
    } else {
      const res = await entrar(email.trim(), password);
      if (res.erro) { setErro(res.erro); setAEnviar(false); return; }
    }

    // Verificar role após login/registo
    try {
      const { data } = await getSupabase().auth.getUser();
      if (!data.user) { setErro("Sessão não encontrada."); setAEnviar(false); return; }
      const ok = await verificarAdmin(data.user.id);
      if (!ok) {
        setErro("Esta conta não tem permissões de administrador.");
        await sair();
        setAEnviar(false);
        return;
      }
      router.replace("/admin");
    } catch (e) {
      setErro((e as Error).message);
      setAEnviar(false);
    }
  };

  if (!disponivel) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream p-6">
        <p className="max-w-sm text-center text-sm text-stone-500">
          Supabase não configurado. Define{" "}
          <code className="rounded bg-stone-100 px-1 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
          <code className="rounded bg-stone-100 px-1 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand shadow-glow">
            <CheckTrend size={22} className="text-white" />
          </div>
          <div className="text-center">
            <div className="font-display text-xl font-semibold text-stone-800">
              Recibo<span className="text-brand">Certo</span>
            </div>
            <div className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-stone-400">
              Área de administração
            </div>
          </div>
        </div>

        <div className="rounded-4xl border border-stone-100 bg-white p-8 shadow-card">
          <h1 className="mb-6 text-center text-base font-semibold text-stone-800">
            {modo === "entrar" ? "Entrar como admin" : "Criar conta de admin"}
          </h1>

          <form onSubmit={submeter} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-stone-500">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-stone-500">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
              />
            </div>

            {erro && (
              <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                {erro}
              </p>
            )}
            {info && (
              <p role="status" className="rounded-xl bg-brand-light px-3.5 py-2.5 text-xs text-brand-dark">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={aEnviar}
              className="btn-shine flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:shadow-float disabled:opacity-60"
            >
              {aEnviar ? "A processar…" : modo === "entrar" ? "Entrar" : "Criar conta"}
              {!aEnviar && <ArrowRight size={14} />}
            </button>
          </form>

          <div className="mt-5 border-t border-stone-100 pt-4 text-center">
            <button
              type="button"
              onClick={() => { setModo(modo === "entrar" ? "criar" : "entrar"); setErro(""); setInfo(""); }}
              className="text-xs text-stone-400 transition-colors hover:text-stone-600"
            >
              {modo === "entrar"
                ? "Primeira vez? Criar conta de admin"
                : "Já tenho conta — entrar"}
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-stone-400">
          <Link href="/" className="underline-offset-2 hover:underline">
            Voltar ao site público
          </Link>
        </p>
      </div>
    </div>
  );
}
