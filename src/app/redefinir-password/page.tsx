"use client";

// ═══════════════════════════════════════════════════════════════════════
//  DEFINIR UMA PALAVRA-PASSE NOVA — RC-AUTH-002
//  ---------------------------------------------------------------------
//  O destino do link que a Supabase envia em `resetPasswordForEmail`.
//
//  Antes disto, quem entrava com email e palavra-passe e a esquecesse
//  não tinha caminho de volta: existia a MUDANÇA com sessão iniciada
//  (`/dashboard/conta`), que não serve para nada a quem não consegue
//  iniciar sessão. A conta ficava fechada e a única saída era criar
//  outra — e perder o histórico que a fazia valer a pena.
//
//  ── Como a sessão chega aqui ────────────────────────────────────────
//  O `supabase-js` traz `detectSessionInUrl` ligado: ao carregar a
//  página, lê o token do fragmento do URL e troca-o por uma sessão de
//  recuperação. É por isso que esta página espera pelo evento em vez de
//  desenhar já o formulário — pedir a palavra-passe antes de a sessão
//  existir daria um erro no fim, com o trabalho já feito.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { validarPassword } from "@/lib/validacao-password";
import { Check, ArrowRight } from "@/components/ui/Icons";
import { EMAIL_APOIO, mailtoApoio } from "@/lib/contacto";

type Estado = "a-verificar" | "pronto" | "sem-sessao" | "concluido";

export default function RedefinirPassword() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("a-verificar");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [aProcessar, setAProcessar] = useState(false);

  useEffect(() => {
    if (!supabaseConfigurado()) { setEstado("sem-sessao"); return; }
    const sb = getSupabase();
    let vivo = true;

    // Duas vias, porque a corrida entre elas é real: o evento pode
    // disparar antes de este efeito correr (link já processado) ou
    // depois (token ainda a ser trocado).
    const { data: sub } = sb.auth.onAuthStateChange((evento, sessao) => {
      if (!vivo) return;
      if (evento === "PASSWORD_RECOVERY" || sessao) setEstado("pronto");
    });
    void sb.auth.getSession().then(({ data }) => {
      if (!vivo) return;
      setEstado(data.session ? "pronto" : "sem-sessao");
    });

    return () => { vivo = false; sub.subscription.unsubscribe(); };
  }, []);

  const submeter = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    const erros = validarPassword(password);
    if (erros.length > 0) { setErro(erros[0].mensagem); return; }
    if (password !== confirmar) { setErro("As duas palavras-passe não coincidem."); return; }

    setAProcessar(true);
    const { error } = await getSupabase().auth.updateUser({ password });
    setAProcessar(false);

    if (error) {
      const m = error.message.toLowerCase();
      setErro(
        m.includes("same password") || m.includes("different from the old")
          ? "A palavra-passe nova tem de ser diferente da anterior."
          : m.includes("session") || m.includes("expired")
          ? "O link expirou. Pede outro a partir de «Esqueceste-te da palavra-passe?»."
          : error.message,
      );
      return;
    }

    setEstado("concluido");
    // Um momento a ler a confirmação antes de sair da página: mudar de
    // ecrã no mesmo instante deixa a dúvida de se resultou.
    setTimeout(() => router.push("/dashboard"), 1800);
  }, [password, confirmar, router]);

  const erroPw = password.length > 0 ? validarPassword(password) : [];

  return (
    <main className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col justify-center px-5 py-16">
      <div className="rounded-3xl border border-stone-200 bg-white p-7 shadow-soft dark:border-stone-800 dark:bg-stone-900">

        {estado === "a-verificar" && (
          <p role="status" className="text-center text-sm text-stone-500 dark:text-stone-400">
            A validar o link…
          </p>
        )}

        {estado === "sem-sessao" && (
          <>
            <h1 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
              Este link já não serve
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              Os links de recuperação expiram por segurança, e só podem ser usados uma vez.
              Pede um novo em «Esqueceste-te da palavra-passe?», no ecrã de entrada.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Voltar ao início <ArrowRight size={14} />
            </Link>
            <p className="mt-4 text-xs text-stone-400 dark:text-stone-500">
              Se continuar a falhar, escreve para{" "}
              {/* Sublinhado PERMANENTE, e não só no `hover`: dentro de um
                  bloco de texto a `text-stone-400` o verde da marca não chega
                  aos 3:1 contra o texto à volta, e a cor passa a ser a única
                  coisa que diz que aquilo é uma ligação (WCAG 1.4.1). É o
                  mesmo `underline underline-offset-2` que o resto do site já
                  usa nas ligações dentro de prosa. */}
              <a href={mailtoApoio("Não consigo recuperar a palavra-passe")} className="text-brand underline underline-offset-2 dark:text-brand-mint">
                {EMAIL_APOIO}
              </a>.
            </p>
          </>
        )}

        {estado === "concluido" && (
          <div className="text-center">
            <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white">
              <Check size={18} />
            </span>
            <h1 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
              Palavra-passe alterada
            </h1>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              Já estás com sessão iniciada. A levar-te ao painel…
            </p>
          </div>
        )}

        {estado === "pronto" && (
          <>
            <h1 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
              Define uma palavra-passe nova
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              A partir daqui, entras com esta. A anterior deixa de funcionar.
            </p>

            <form onSubmit={submeter} className="mt-5 space-y-3">
              <div>
                <label htmlFor="pw-nova" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Palavra-passe nova
                </label>
                <input
                  id="pw-nova"
                  type="password"
                  required
                  autoFocus
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-800 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                  placeholder="Min. 8 caract., 1 maiúscula, 1 número"
                />
                {password.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    <Requisito ok={!erroPw.some((e) => e.tipo === "comprimento")} texto="Mínimo 8 caracteres" />
                    <Requisito ok={!erroPw.some((e) => e.tipo === "maiuscula")} texto="1 letra maiúscula" />
                    <Requisito ok={!erroPw.some((e) => e.tipo === "numero")} texto="1 número" />
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="pw-confirmar" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Repetir
                </label>
                <input
                  id="pw-confirmar"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-800 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                  placeholder="A mesma, outra vez"
                />
              </div>

              {erro && (
                <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  {erro}
                </p>
              )}

              <button
                type="submit"
                disabled={aProcessar}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-all hover:shadow-float disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                {aProcessar ? "A guardar…" : "Guardar palavra-passe"}
                {!aProcessar && <ArrowRight size={14} />}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

function Requisito({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full ${ok ? "bg-brand text-white" : "border border-stone-300 dark:border-stone-600"}`}>
        {ok && <Check size={7} />}
      </span>
      <span className={`text-[10px] ${ok ? "text-brand-dark dark:text-brand-mint" : "text-stone-400"}`}>{texto}</span>
    </div>
  );
}
