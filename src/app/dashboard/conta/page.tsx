"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth";
import { useSubscricao } from "@/lib/stripe/subscription";
import { getSupabase } from "@/lib/supabase/client";
import { validarPassword, type ErroPassword } from "@/lib/validacao-password";
import { descreverEstado } from "@/lib/stripe/precos-autorizados";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Google, History, Linkedin, Lock, LogOut, ShieldCheck, Warning } from "@/components/ui/Icons";
import FizConnectionCard from "@/components/fiz/FizConnectionCard";

const campo =
  "w-full px-3.5 py-2.5 text-[16px] text-stone-800 dark:text-stone-100 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all";
const rotulo = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400";

export default function ContaPage() {
  const { user, carregado, disponivel, entrar, registar, sair, entrarComGoogle, entrarComLinkedin } = useAuth();
  const [modo, setModo] = useState<"entrar" | "registar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [aProcessar, setAProcessar] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErro("");

    if (modo === "registar") {
      const errosPassword = validarPassword(password);
      if (errosPassword.length > 0) {
        setErro(errosPassword[0].mensagem);
        return;
      }
    }

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
      <Wrapper largo>
        {/* ── Identidade: quem está aqui, e em que plano ─────────────── */}
        <section
          aria-labelledby="conta-sessao"
          className="mb-4 rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6"
        >
          <div className="flex flex-wrap items-center gap-4">
            <Inicial email={user.email ?? ""} />
            <div className="min-w-0 flex-1">
              <h2 id="conta-sessao" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
                <Check size={12} className="text-brand" /> Sessão iniciada
              </h2>
              <p className="mt-0.5 truncate text-[15px] font-semibold text-stone-800 dark:text-stone-100">
                {user.email}
              </p>
            </div>
            <button
              type="button"
              onClick={sair}
              className="inline-flex min-h-10 flex-shrink-0 items-center gap-1.5 rounded-2xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-800 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-600"
            >
              <LogOut size={14} /> Terminar sessão
            </button>
          </div>

          <SecaoSubscricao />

          {/* Um benefício, dito uma vez. Havia duas linhas a dizer o mesmo,
              mais um parágrafo a repeti-lo pela terceira vez (RC-P1-11). */}
          <div className="mt-5 grid gap-2.5 border-t border-stone-100 pt-5 dark:border-stone-800 sm:grid-cols-2">
            <Beneficio icon={<History size={16} />} texto="Histórico na nuvem, sincronizado em todos os dispositivos." />
            <Beneficio icon={<Check size={16} />} texto="Cenários ilimitados e exportações para o contabilista." />
          </div>
        </section>

        {/* ── Duas colunas no computador: segurança à esquerda, o resto
               à direita. Empilham no telemóvel, segurança primeiro. ──── */}
        <div className="grid items-start gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <SecaoPassword />

          <div className="space-y-4">
            {/* Ligação ao parceiro de execução fiscal. Só aparece quando a
                integração está ativa — e nunca depende do plano Plus. */}
            <FizConnectionCard />

            <section
              aria-labelledby="conta-perfil-fiscal"
              className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6"
            >
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
                <ShieldCheck size={18} />
              </span>
              <h2 id="conta-perfil-fiscal" className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                Perfil fiscal
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                As condições que fazem o painel falar de ti — início de atividade, regime de IVA,
                agregado. Precisam de sessão iniciada, e já a tens.
              </p>
              <Link
                href="/dashboard/perfil"
                className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-dark"
              >
                Rever o perfil fiscal <ArrowRight size={13} />
              </Link>
            </section>

            <section
              aria-labelledby="conta-privacidade"
              className="rounded-4xl border border-stone-100 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900/50 sm:p-6"
            >
              <h2 id="conta-privacidade" className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                Os teus dados
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                O que escreves nas calculadoras fica no teu dispositivo. A conta serve para
                sincronizar o que escolheres guardar — não para poderes calcular.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/privacidade"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600 transition-colors hover:border-brand hover:text-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                >
                  Política de privacidade
                </Link>
                <Link
                  href="/dashboard/cenarios"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600 transition-colors hover:border-brand hover:text-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                >
                  Cenários guardados
                </Link>
              </div>
            </section>
          </div>
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
              minLength={modo === "registar" ? 8 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={campo}
              placeholder={modo === "registar" ? "Min. 8 caract., 1 maiúscula, 1 número" : "A tua password"}
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

        {/* Os provedores já existiam no `useAuth` e não estavam em lado
            nenhum desta página: quem tinha entrado com o Google alguma vez
            não tinha por onde o voltar a fazer aqui. */}
        <div className="my-5 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">ou</span>
          <span className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={entrarComGoogle}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:border-stone-600"
          >
            <Google size={16} /> Google
          </button>
          <button
            type="button"
            onClick={entrarComLinkedin}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:border-stone-600"
          >
            <Linkedin size={16} /> LinkedIn
          </button>
        </div>

        <p className="mt-5 border-t border-stone-100 pt-4 text-center text-xs leading-relaxed text-stone-400 dark:border-stone-800">
          Criar conta é gratuito. As calculadoras, os simuladores e os guias funcionam sem conta — a
          sessão serve para teres um perfil fiscal e um histórico que persistem.
        </p>
      </div>
    </Wrapper>
  );
}

/**
 * A moldura da página.
 *
 * Era `max-w-md` — uma coluna de 448px para tudo, incluindo o estado de
 * sessão iniciada, que tem identidade, plano, ligação ao parceiro e
 * segurança para mostrar. Três cartões empilhados numa faixa estreita, no
 * meio de um ecrã vazio, faziam a página parecer inacabada. A largura passa
 * a depender do que há para mostrar: o formulário de entrada continua
 * estreito (é uma tarefa só), a gestão da conta ganha espaço.
 */
function Wrapper({ children, largo = false }: { children: React.ReactNode; largo?: boolean }) {
  return (
    <div className={`mx-auto ${largo ? "max-w-4xl" : "max-w-md"}`}>
      <Link
        href="/dashboard"
        className="mb-5 inline-flex min-h-9 items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-stone-700 dark:hover:text-stone-200"
      >
        <ArrowLeft size={13} />
        Voltar ao painel
      </Link>
      <header className="mb-7">
        <p className="eyebrow mb-2 text-brand">Conta e segurança</p>
        <h1 className="font-display display-2 font-semibold text-ink text-balance">
          A tua conta, sem surpresas.
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-stone-500 dark:text-stone-400">
          Quem está com sessão iniciada, o que o teu plano inclui e como proteges o acesso.
        </p>
      </header>
      {children}
    </div>
  );
}

/** Inicial do email, para dar rosto à sessão sem pedir uma fotografia. */
function Inicial({ email }: { email: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand text-lg font-bold uppercase text-white shadow-glow"
    >
      {email.trim().charAt(0) || "?"}
    </span>
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

/**
 * Estado da subscrição, por estado real.
 *
 * Mostrava "A experimentar" para tudo o que não fosse `active` — incluindo um
 * pagamento em atraso e uma subscrição cancelada (RC-P1-11). A tradução vive
 * agora numa máquina de estados explícita, com o período de graça escrito.
 */
function SecaoSubscricao() {
  const { status, abrirPortal } = useSubscricao();
  const { user } = useAuth();
  const d = descreverEstado(status, !!user);

  const tom = {
    positivo: { moldura: "border-brand/20 bg-brand-light/50", badge: "bg-brand text-white" },
    aviso: { moldura: "border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20", badge: "bg-amber-500 text-white" },
    alerta: { moldura: "border-alert-border bg-alert-bg", badge: "bg-alert-text text-white" },
    neutro: { moldura: "border-stone-100 bg-stone-50 dark:border-stone-800 dark:bg-stone-800", badge: "bg-stone-400 text-white" },
  }[d.tom];

  return (
    <div className={`mt-5 flex flex-wrap items-start justify-between gap-3 rounded-2xl border px-4 py-3 ${tom.moldura}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">
            {d.temAcesso ? "Plano Plus" : "Plano Grátis"}
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${tom.badge}`}>
            {d.etiqueta}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{d.mensagem}</p>
      </div>
      {d.temAcesso || d.requerAcao ? (
        <button
          type="button"
          onClick={abrirPortal}
          className="flex min-h-9 flex-shrink-0 items-center gap-1 text-xs font-semibold text-brand-dark transition-colors hover:underline dark:text-brand"
        >
          {d.requerAcao ? "Resolver agora" : "Gerir"}
          <ArrowRight size={11} />
        </button>
      ) : (
        <a
          href="/dashboard/upgrade"
          className="flex min-h-9 flex-shrink-0 items-center gap-1 rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-shadow hover:shadow-glow"
        >
          Upgrade
          <ArrowRight size={11} />
        </a>
      )}
    </div>
  );
}

function SecaoPassword() {
  const { user } = useAuth();
  const [passwordAtual, setPasswordAtual] = useState("");
  const [novaPassword, setNovaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [mostrarAtual, setMostrarAtual] = useState(false);
  const [mostrarNova, setMostrarNova] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [aProcessar, setAProcessar] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  const errosNova = novaPassword.length > 0 ? validarPassword(novaPassword) : [];

  /**
   * Contas só de OAuth (Google e afins) não têm password no Supabase.
   * Mostrar-lhes um formulário que começa por pedir "a tua password atual" é
   * pedir algo que não existe — e o pedido falhava sempre (RC-P1-11).
   */
  const identidades = (user?.identities ?? []) as { provider?: string }[];
  const soOAuth = identidades.length > 0 && !identidades.some((i) => i.provider === "email");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!passwordAtual) {
      setMsg({ tipo: "erro", texto: "Introduz a tua password atual." });
      return;
    }

    const erros = validarPassword(novaPassword);
    if (erros.length > 0) {
      setMsg({ tipo: "erro", texto: erros[0].mensagem });
      return;
    }

    if (novaPassword !== confirmarPassword) {
      setMsg({ tipo: "erro", texto: "As passwords não coincidem." });
      return;
    }

    setAProcessar(true);
    try {
      const sb = getSupabase();
      const { error: loginErr } = await sb.auth.signInWithPassword({
        email: user?.email ?? "",
        password: passwordAtual,
      });
      if (loginErr) {
        setMsg({ tipo: "erro", texto: "A password atual está incorreta." });
        setAProcessar(false);
        return;
      }

      const { error } = await sb.auth.updateUser({ password: novaPassword });
      if (error) {
        const m = error.message.toLowerCase();
        let texto = error.message;
        if (m.includes("same password") || m.includes("different from the old")) {
          texto = "A nova password tem de ser diferente da atual.";
        } else if (m.includes("reauthentication") || m.includes("session")) {
          texto = "Por segurança, inicia sessão novamente antes de alterar a password.";
        }
        setMsg({ tipo: "erro", texto });
      } else {
        setMsg({ tipo: "sucesso", texto: "Password alterada com sucesso." });
        setPasswordAtual("");
        setNovaPassword("");
        setConfirmarPassword("");
      }
    } catch {
      setMsg({ tipo: "erro", texto: "Ocorreu um erro inesperado. Tenta novamente." });
    }
    setAProcessar(false);
  };

  if (soOAuth) {
    const nomeProvedor = identidades[0]?.provider ?? "provedor externo";
    return (
      <div className="rounded-4xl border border-stone-100 bg-white p-7 shadow-card dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand">
            <Lock size={20} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Segurança da conta</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">A tua sessão é gerida fora do ReciboCerto.</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          Entraste com <strong className="capitalize">{nomeProvedor}</strong>, por isso não há password para alterar
          aqui. A palavra-passe e a verificação em duas etapas são geridas na tua conta {nomeProvedor}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-7 shadow-card dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center gap-3 mb-5">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand">
          <Lock size={20} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Alterar password</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">Introduz a tua password atual e define uma nova.</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* Password atual */}
        <div>
          <label htmlFor="password-atual" className={rotulo}>Password atual</label>
          <div className="relative">
            <input
              id="password-atual"
              type={mostrarAtual ? "text" : "password"}
              autoComplete="current-password"
              required
              value={passwordAtual}
              onChange={(e) => setPasswordAtual(e.target.value)}
              className={`${campo} pr-11`}
              placeholder="A tua password atual"
            />
            <button
              type="button"
              onClick={() => setMostrarAtual((v) => !v)}
              aria-label={mostrarAtual ? "Esconder password" : "Mostrar password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
            >
              {mostrarAtual ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Nova password */}
        <div>
          <label htmlFor="nova-password" className={rotulo}>Nova password</label>
          <div className="relative">
            <input
              id="nova-password"
              type={mostrarNova ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={novaPassword}
              onChange={(e) => setNovaPassword(e.target.value)}
              className={`${campo} pr-11`}
              placeholder="Min. 8 caract., 1 maiúscula, 1 número"
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
          {/* Indicadores de requisitos */}
          {novaPassword.length > 0 && (
            <div className="mt-2 space-y-1">
              <RequisitoPw ok={!errosNova.some((e) => e.tipo === "comprimento")} texto="Mínimo 8 caracteres" />
              <RequisitoPw ok={!errosNova.some((e) => e.tipo === "maiuscula")} texto="Pelo menos 1 letra maiúscula" />
              <RequisitoPw ok={!errosNova.some((e) => e.tipo === "numero")} texto="Pelo menos 1 número" />
            </div>
          )}
        </div>

        {/* Confirmar nova password */}
        <div>
          <label htmlFor="confirmar-password" className={rotulo}>Confirmar nova password</label>
          <div className="relative">
            <input
              id="confirmar-password"
              type={mostrarConfirmar ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
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

function RequisitoPw({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full ${ok ? "bg-brand text-white" : "border border-stone-300 dark:border-stone-600"}`}>
        {ok && <Check size={8} />}
      </span>
      <span className={`text-[11px] ${ok ? "text-brand-dark dark:text-brand" : "text-stone-400"}`}>{texto}</span>
    </div>
  );
}
