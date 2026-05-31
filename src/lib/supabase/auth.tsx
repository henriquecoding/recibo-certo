"use client";

// Autenticação do ReciboCerto (client-side, via Supabase Auth).
// Modelo: LOCAL por defeito; ao entrar, abre-se a porta à nuvem (a sincronização
// dos recibos é tratada no repositório, no passo seguinte). Sem login, a app
// funciona toda em localStorage — mantém a promessa "Sem registo".

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigurado } from "./client";

interface AuthContexto {
  user: User | null;
  /** True quando o estado de sessão inicial já foi resolvido. */
  carregado: boolean;
  /** True se o Supabase está configurado (variáveis de ambiente presentes). */
  disponivel: boolean;
  entrar: (email: string, password: string) => Promise<{ erro?: string }>;
  registar: (email: string, password: string) => Promise<{ erro?: string; confirmarEmail?: boolean }>;
  sair: () => Promise<void>;
}

const Ctx = createContext<AuthContexto | null>(null);

// Traduz as mensagens de erro mais comuns do Supabase para pt-PT.
function traduzErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou password incorretos.";
  if (m.includes("email not confirmed")) return "Confirma primeiro o teu email (vê a caixa de entrada).";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Já existe uma conta com este email. Tenta entrar.";
  if (m.includes("password should be at least")) return "A password tem de ter pelo menos 6 caracteres.";
  if (m.includes("unable to validate email") || m.includes("invalid email")) return "Email inválido.";
  if (m.includes("rate limit") || m.includes("too many")) return "Demasiadas tentativas. Tenta daqui a pouco.";
  return msg;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [carregado, setCarregado] = useState(false);
  const disponivel = supabaseConfigurado();

  useEffect(() => {
    if (!disponivel) {
      setCarregado(true);
      return;
    }
    const sb = getSupabase();
    let ativo = true;

    sb.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setUser(data.session?.user ?? null);
      setCarregado(true);
    });

    const { data: sub } = sb.auth.onAuthStateChange((_evento, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, [disponivel]);

  const entrar = async (email: string, password: string) => {
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
      return error ? { erro: traduzErro(error.message) } : {};
    } catch (e) {
      return { erro: (e as Error).message };
    }
  };

  const registar = async (email: string, password: string) => {
    try {
      const { data, error } = await getSupabase().auth.signUp({ email: email.trim(), password });
      if (error) return { erro: traduzErro(error.message) };
      // Sem sessão imediata → o projeto exige confirmação por email.
      return { confirmarEmail: !data.session };
    } catch (e) {
      return { erro: (e as Error).message };
    }
  };

  const sair = async () => {
    if (!disponivel) return;
    await getSupabase().auth.signOut();
  };

  return <Ctx.Provider value={{ user, carregado, disponivel, entrar, registar, sair }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthContexto {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth tem de ser usado dentro de <AuthProvider>.");
  return ctx;
}
