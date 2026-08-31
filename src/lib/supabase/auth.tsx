"use client";

// Autenticação do ReciboCerto (client-side, via Supabase Auth).
// Modelo: LOCAL por defeito; ao entrar, abre-se a porta à nuvem (a sincronização
// dos recibos é tratada no repositório, no passo seguinte). Sem login, a app
// funciona toda em localStorage — mantém a promessa "Sem registo".

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabaseConfigurado } from "./config";
import { definirCofre } from "@/lib/store/cofre";

// Carrega o cliente Supabase sob procura. Mantém o SDK (~200 KB) FORA do
// bundle inicial de todas as páginas — só é descarregado quando a nuvem está
// configurada e há mesmo trabalho de auth a fazer.
async function sb() {
  const { getSupabase } = await import("./client");
  return getSupabase();
}

type ClienteSupabase = Awaited<ReturnType<typeof sb>>;

/** Áreas que não podem tomar “anónimo” como resposta antes de validar sessão. */
function rotaExigeAuth(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/contabilista" ||
    pathname.startsWith("/contabilista/")
  );
}

/**
 * Deteta apenas a EXISTÊNCIA da sessão persistida, sem ler token ou perfil.
 * O SDK só é necessário quando há algo para restaurar, um callback OAuth,
 * uma rota privada ou uma ação explícita de conta.
 */
function haEvidenciaDeSessao() {
  try {
    const url = new URL(window.location.href);
    if (
      url.searchParams.has("code") ||
      url.searchParams.has("error_description") ||
      /(?:^|[#&])access_token=/.test(url.hash)
    ) {
      return true;
    }
    for (let indice = 0; indice < localStorage.length; indice += 1) {
      const chave = localStorage.key(indice) ?? "";
      if (/^sb-.+-auth-token$/.test(chave)) return true;
    }
  } catch {
    // Storage bloqueado significa que não há sessão restaurável por esta via.
  }
  return false;
}

type ModoModal = "entrar" | "criar";

interface AuthContexto {
  user: User | null;
  /** True quando o estado de sessão inicial já foi resolvido. */
  carregado: boolean;
  /** True se o Supabase está configurado (variáveis de ambiente presentes). */
  disponivel: boolean;
  entrar: (email: string, password: string) => Promise<{ erro?: string }>;
  registar: (email: string, password: string) => Promise<{ erro?: string; confirmarEmail?: boolean }>;
  sair: () => Promise<void>;
  entrarComGoogle: () => Promise<{ erro?: string }>;
  entrarComLinkedin: () => Promise<{ erro?: string }>;
  /** Estado do modal de autenticação global. */
  modalAberto: boolean;
  modoModal: ModoModal;
  abrirModal: (modo?: ModoModal) => void;
  fecharModal: () => void;
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
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [sessaoResolvida, setSessaoResolvida] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [modoModal, setModoModal] = useState<ModoModal>("entrar");
  const disponivel = supabaseConfigurado();
  const montado = useRef(false);
  const clientePromise = useRef<Promise<ClienteSupabase> | null>(null);
  const cancelarSubscricao = useRef<(() => void) | null>(null);

  // O cofre local segue quem está com sessão, e é aqui — num sítio só —
  // que essa ligação se faz. Enquanto as chaves eram globais, sair da
  // conta e outra pessoa entrar no mesmo browser mostrava-lhe os recibos
  // de quem tinha estado antes. Ver `store/cofre.ts`.
  useEffect(() => {
    definirCofre(user?.id ?? null);
  }, [user]);

  const ativarAuth = useCallback(async (): Promise<ClienteSupabase | null> => {
    if (!disponivel) {
      definirCofre(null);
      setSessaoResolvida(true);
      setCarregado(true);
      return null;
    }

    clientePromise.current ??= sb();
    try {
      const cliente = await clientePromise.current;
      if (!montado.current) return cliente;

      if (!cancelarSubscricao.current) {
        const { data: sub } = cliente.auth.onAuthStateChange((_evento, session) => {
          if (!montado.current) return;
          setUser(session?.user ?? null);
          setSessaoResolvida(true);
          setCarregado(true);
          if (session?.user) setModalAberto(false);
        });
        cancelarSubscricao.current = () => sub.subscription.unsubscribe();
      }

      const { data } = await cliente.auth.getSession();
      if (montado.current) {
        setUser(data.session?.user ?? null);
        setSessaoResolvida(true);
        setCarregado(true);
      }
      return cliente;
    } catch (erro) {
      clientePromise.current = null;
      if (montado.current) {
        setUser(null);
        setSessaoResolvida(true);
        setCarregado(true);
      }
      throw erro;
    }
  }, [disponivel]);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      cancelarSubscricao.current?.();
      cancelarSubscricao.current = null;
    };
  }, []);

  useEffect(() => {
    if (!disponivel) {
      definirCofre(null);
      setSessaoResolvida(true);
      setCarregado(true);
      return;
    }

    if (rotaExigeAuth(pathname) || haEvidenciaDeSessao()) {
      void ativarAuth().catch((erro) => console.error("[auth]", erro));
      return;
    }

    // Visitante público sem vestígio de sessão: a resposta é conhecida sem
    // descarregar 200+ KB, abrir ligação ou executar `getSession()`.
    definirCofre(null);
    setCarregado(true);
  }, [ativarAuth, disponivel, pathname]);

  const entrar = useCallback(async (email: string, password: string) => {
    try {
      const cliente = await ativarAuth();
      if (!cliente) return { erro: "Autenticação indisponível." };
      const { error } = await cliente.auth.signInWithPassword({ email: email.trim(), password });
      return error ? { erro: traduzErro(error.message) } : {};
    } catch (e) {
      return { erro: (e as Error).message };
    }
  }, [ativarAuth]);

  const registar = useCallback(async (email: string, password: string) => {
    try {
      const cliente = await ativarAuth();
      if (!cliente) return { erro: "Autenticação indisponível." };
      const { data, error } = await cliente.auth.signUp({ email: email.trim(), password });
      if (error) return { erro: traduzErro(error.message) };
      return { confirmarEmail: !data.session };
    } catch (e) {
      return { erro: (e as Error).message };
    }
  }, [ativarAuth]);

  const sair = useCallback(async () => {
    if (!disponivel) return;
    const cliente = await ativarAuth();
    await cliente?.auth.signOut();
  }, [ativarAuth, disponivel]);

  const entrarComGoogle = useCallback(async () => {
    try {
      const cliente = await ativarAuth();
      if (!cliente) return { erro: "Autenticação indisponível." };
      const { error } = await cliente.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      return error ? { erro: error.message } : {};
    } catch (e) {
      return { erro: (e as Error).message };
    }
  }, [ativarAuth]);

  const entrarComLinkedin = useCallback(async () => {
    try {
      const cliente = await ativarAuth();
      if (!cliente) return { erro: "Autenticação indisponível." };
      const { error } = await cliente.auth.signInWithOAuth({
        // Provedor "LinkedIn (OIDC)" do Supabase — chave `linkedin_oidc`
        // (o antigo `linkedin` está descontinuado).
        provider: "linkedin_oidc",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      return error ? { erro: error.message } : {};
    } catch (e) {
      return { erro: (e as Error).message };
    }
  }, [ativarAuth]);

  const abrirModal = useCallback((modo: ModoModal = "entrar") => {
    void ativarAuth().catch((erro) => console.error("[auth]", erro));
    setModoModal(modo);
    setModalAberto(true);
  }, [ativarAuth]);

  const fecharModal = useCallback(() => {
    setModalAberto(false);
  }, []);

  const carregadoNoContexto =
    disponivel && rotaExigeAuth(pathname) ? carregado && sessaoResolvida : carregado;
  const valor = useMemo<AuthContexto>(
    () => ({
      user,
      carregado: carregadoNoContexto,
      disponivel,
      entrar,
      registar,
      sair,
      entrarComGoogle,
      entrarComLinkedin,
      modalAberto,
      modoModal,
      abrirModal,
      fecharModal,
    }),
    [
      abrirModal,
      carregadoNoContexto,
      disponivel,
      entrar,
      entrarComGoogle,
      entrarComLinkedin,
      fecharModal,
      modalAberto,
      modoModal,
      registar,
      sair,
      user,
    ],
  );

  return (
    <Ctx.Provider value={valor}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthContexto {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth tem de ser usado dentro de <AuthProvider>.");
  return ctx;
}
