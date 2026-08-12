"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ZONA DE RISCO — apagar dados, por partes ou por inteiro
//  ---------------------------------------------------------------------
//  Vermelho pastel e separada do resto, à maneira do GitHub: uma secção que
//  apaga coisas não pode parecer-se com uma que as guarda.
//
//  A confirmação é escrita à mão, e o campo SÓ ACEITA a frase pedida — uma
//  tecla que não corresponda não entra. Não é teatro: o que se pretende é
//  que ninguém apague nada sem ler o que está a apagar, e ler é o que
//  acontece quando se tem de copiar. A caixa «preencher por mim» existe
//  para quem já leu e não quer escrever; fica desmarcada por omissão,
//  porque a omissão tem de ser a que obriga a parar.
//
//  A frase e a validação vivem em `lib/conta/apagar.ts`, partilhadas com a
//  rota — e a rota valida outra vez, porque um pedido feito fora do browser
//  não passa por nada disto.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/client";
import { Warning, Check, Spinner, Trash } from "@/components/ui/Icons";
import {
  ALVOS, confirmacaoValida, recortarAoPrefixo, type DefinicaoAlvo,
} from "@/lib/conta/apagar";

/** Chaves locais que deixam de fazer sentido depois de apagar na nuvem. */
const CHAVES_LOCAIS: Record<string, string[]> = {
  recibos: ["recibocerto:recibos"],
  vencimentos: ["recibocerto:vencimentos"],
  cenarios: ["recibocerto:cenarios:v1"],
  "perfil-fiscal": ["recibocerto:preferencias-fiscais"],
};

function limparLocal(alvoId: string) {
  if (typeof window === "undefined") return;
  const chaves =
    alvoId === "tudo" || alvoId === "conta"
      ? Object.values(CHAVES_LOCAIS).flat()
      : (CHAVES_LOCAIS[alvoId] ?? []);
  for (const c of chaves) {
    try { window.localStorage.removeItem(c); } catch { /* modo privado */ }
  }
}

type Estado =
  | { tipo: "parado" }
  | { tipo: "a-apagar" }
  | { tipo: "feito"; alvo: string }
  | { tipo: "erro"; msg: string };

export default function ZonaDeRisco() {
  const { user, sair } = useAuth();
  const [aberto, setAberto] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [auto, setAuto] = useState(false);
  const [estado, setEstado] = useState<Estado>({ tipo: "parado" });

  const fechar = useCallback(() => {
    setAberto(null);
    setTexto("");
    setAuto(false);
  }, []);

  const apagar = useCallback(
    async (alvo: DefinicaoAlvo) => {
      setEstado({ tipo: "a-apagar" });
      try {
        const { data } = await getSupabase().auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          setEstado({ tipo: "erro", msg: "A sessão expirou. Entra outra vez." });
          return;
        }
        const res = await fetch("/api/conta/apagar", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ alvo: alvo.id, confirmacao: texto }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setEstado({ tipo: "erro", msg: json?.erro ?? "Não foi possível apagar." });
          return;
        }
        limparLocal(alvo.id);
        setEstado({ tipo: "feito", alvo: alvo.titulo });
        fechar();
        if (alvo.id === "conta") {
          await sair();
          window.location.href = "/";
          return;
        }
        // O resto da aplicação lê estes dados em memória; recarregar é a
        // forma honesta de garantir que ninguém fica a ver o que já não há.
        setTimeout(() => window.location.reload(), 1200);
      } catch {
        setEstado({ tipo: "erro", msg: "Não foi possível contactar o servidor." });
      }
    },
    [texto, fechar, sair],
  );

  if (!user) return null;

  return (
    <section
      aria-labelledby="zona-risco"
      className="mt-6 overflow-hidden rounded-4xl border border-clay-border bg-clay-bg/40 dark:bg-clay-bg/20"
    >
      <div className="border-b border-clay-border px-5 py-4 sm:px-6">
        <h2 id="zona-risco" className="flex items-center gap-2 text-sm font-bold text-clay-text">
          <Warning size={15} /> Zona de risco
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-clay-text/80">
          Tudo o que está aqui é imediato e não tem forma de voltar atrás. Exporta o que quiseres
          guardar antes de apagar.
        </p>
      </div>

      {estado.tipo === "feito" ? (
        <p role="status" className="mx-5 mt-4 flex items-center gap-2 rounded-2xl bg-brand-light px-4 py-2.5 text-xs font-semibold text-brand-dark sm:mx-6">
          <Check size={13} /> {estado.alvo} — feito.
        </p>
      ) : null}
      {estado.tipo === "erro" ? (
        <p role="alert" className="mx-5 mt-4 flex items-start gap-2 rounded-2xl bg-alert-bg px-4 py-2.5 text-xs leading-relaxed text-alert-text sm:mx-6">
          <Warning size={13} className="mt-0.5 flex-shrink-0" /> {estado.msg}
        </p>
      ) : null}

      <ul className="divide-y divide-clay-border/60">
        {ALVOS.map((alvo) => {
          const estaAberto = aberto === alvo.id;
          const prontoParaApagar = confirmacaoValida(alvo, texto);
          return (
            <li key={alvo.id} className="px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className={`text-sm font-semibold ${alvo.irreversivelTotal ? "text-clay-text" : "text-stone-800 dark:text-stone-100"}`}>
                    {alvo.titulo}
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                    {alvo.descricao}
                  </p>
                </div>
                <button
                  type="button"
                  aria-expanded={estaAberto}
                  onClick={() => (estaAberto ? fechar() : (setAberto(alvo.id), setTexto(""), setAuto(false), setEstado({ tipo: "parado" })))}
                  className="inline-flex min-h-9 flex-shrink-0 items-center gap-1.5 rounded-xl border border-clay-border bg-white px-3.5 py-2 text-xs font-semibold text-clay-text transition-colors hover:bg-clay-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-text dark:bg-stone-900"
                >
                  <Trash size={13} /> {estaAberto ? "Cancelar" : alvo.acao}
                </button>
              </div>

              {estaAberto ? (
                <div className="mt-4 rounded-2xl border border-clay-border bg-white p-4 dark:bg-stone-900">
                  <label
                    htmlFor={`conf-${alvo.id}`}
                    className="block text-xs leading-relaxed text-stone-600 dark:text-stone-300"
                  >
                    Para confirmar, escreve{" "}
                    <strong className="select-all font-mono text-clay-text">{alvo.confirmacao}</strong>
                  </label>

                  <input
                    id={`conf-${alvo.id}`}
                    type="text"
                    value={texto}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={alvo.confirmacao}
                    aria-describedby={`ajuda-${alvo.id}`}
                    // Só entra o que corresponde à frase. Uma tecla errada
                    // não produz erro nenhum — simplesmente não entra.
                    onChange={(e) => setTexto(recortarAoPrefixo(alvo, e.target.value))}
                    className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 font-mono text-sm text-stone-800 placeholder:text-stone-300 focus:border-clay-text focus:outline-none focus:ring-2 focus:ring-clay-text/25 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                  />
                  <p id={`ajuda-${alvo.id}`} className="mt-1.5 text-[11px] text-stone-400">
                    O campo só aceita esta frase — não é possível escrever outra coisa.
                  </p>

                  <label className="mt-3 flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={auto}
                      onChange={(e) => {
                        setAuto(e.target.checked);
                        setTexto(e.target.checked ? alvo.confirmacao : "");
                      }}
                      className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-stone-300 text-clay-text focus:ring-clay-text"
                    />
                    <span className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                      Preencher a confirmação por mim — já li o que vai ser apagado.
                    </span>
                  </label>

                  <button
                    type="button"
                    disabled={!prontoParaApagar || estado.tipo === "a-apagar"}
                    onClick={() => apagar(alvo)}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-clay-text px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                  >
                    {estado.tipo === "a-apagar" ? <><Spinner size={14} /> A apagar…</> : <><Trash size={14} /> {alvo.acao}</>}
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
