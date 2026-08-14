"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ZONA DE RISCO — escolher exatamente o que sai, e o que fica
//  ---------------------------------------------------------------------
//  Antes eram seis botões fixos: recibos, vencimentos, cenários, perfil,
//  tudo, conta. Quem quisesse apagar as conversas e guardar os recibos não
//  tinha por onde — e «tudo» apagava cinco tabelas de vinte e oito, o que
//  era pior do que não oferecer nada, porque parecia que tinha apagado.
//
//  Agora a lista vem do catálogo (`lib/conta/catalogo.ts`) e o número à
//  frente de cada linha vem do inventário — o que a pessoa TEM, e não o
//  que poderia ter. Escolher às cegas não é escolher.
//
//  A confirmação continua a ser escrita à mão, e o campo SÓ ACEITA a frase
//  pedida. Não é teatro: o que se pretende é que ninguém apague nada sem
//  ler, e ler é o que acontece quando se tem de copiar. A caixa «preencher
//  por mim» existe para quem já leu; fica desmarcada por omissão, porque a
//  omissão tem de ser a que obriga a parar.
//
//  Vermelho pastel e separada do resto: uma secção que apaga coisas não
//  pode parecer-se com uma que as guarda.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/client";
import { Warning, Check, Spinner, Trash } from "@/components/ui/Icons";
import { confirmacaoValida, recortarAoPrefixo, alvoPorId } from "@/lib/conta/apagar";
import { CONJUNTOS, GRUPOS, type Conjunto } from "@/lib/conta/catalogo";

/** Chaves locais que deixam de fazer sentido depois de apagar na nuvem. */
const CHAVES_LOCAIS: Record<string, string[]> = {
  recibos: ["recibocerto:recibos"],
  vencimentos: ["recibocerto:vencimentos"],
  cenarios: ["recibocerto:cenarios:v1"],
  "perfil-fiscal": ["recibocerto:preferencias-fiscais"],
};

function limparLocal(ids: string[]) {
  if (typeof window === "undefined") return;
  for (const id of ids) {
    for (const c of CHAVES_LOCAIS[id] ?? []) {
      try { window.localStorage.removeItem(c); } catch { /* modo privado */ }
    }
  }
}

type Estado =
  | { tipo: "parado" }
  | { tipo: "a-apagar" }
  | { tipo: "feito"; resumo: string }
  | { tipo: "erro"; msg: string };

const ALVO_CONJUNTOS = alvoPorId("tudo")!;
const ALVO_CONTA = alvoPorId("conta")!;

export default function ZonaDeRisco() {
  const { user, sair } = useAuth();
  const [inventario, setInventario] = useState<Record<string, number> | null>(null);
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set());
  const [aConfirmar, setAConfirmar] = useState<"conjuntos" | "conta" | null>(null);
  const [texto, setTexto] = useState("");
  const [auto, setAuto] = useState(false);
  const [estado, setEstado] = useState<Estado>({ tipo: "parado" });

  // O inventário. Sem ele a lista aparece na mesma, mas sem os números —
  // é melhor do que não aparecer, e é o que acontece se a rede falhar.
  useEffect(() => {
    if (!user) return;
    let vivo = true;
    (async () => {
      try {
        const { data } = await getSupabase().auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;
        const res = await fetch("/api/conta/apagar", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = (await res.json()) as { inventario?: Record<string, number> };
        if (vivo && json.inventario) setInventario(json.inventario);
      } catch { /* fica sem números */ }
    })();
    return () => { vivo = false; };
  }, [user]);

  const temAlgo = useCallback(
    (c: Conjunto) => inventario === null || (inventario[c.id] ?? 0) > 0,
    [inventario],
  );

  /** Os grupos com alguma coisa dentro. Um grupo vazio não se mostra. */
  const grupos = useMemo(
    () =>
      GRUPOS.map((g) => ({
        ...g,
        conjuntos: CONJUNTOS.filter((c) => c.grupo === g.id && !c.retido),
      })).filter((g) => g.conjuntos.some(temAlgo)),
    [temAlgo],
  );

  const retidos = useMemo(() => CONJUNTOS.filter((c) => c.retido), []);

  const alternar = useCallback((id: string) => {
    setEscolhidos((antes) => {
      const novo = new Set(antes);
      if (novo.has(id)) novo.delete(id); else novo.add(id);
      return novo;
    });
  }, []);

  const fechar = useCallback(() => {
    setAConfirmar(null);
    setTexto("");
    setAuto(false);
  }, []);

  const apagar = useCallback(
    async (modo: "conjuntos" | "conta") => {
      setEstado({ tipo: "a-apagar" });
      const ids = modo === "conta" ? [] : [...escolhidos];
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
          body: JSON.stringify(
            modo === "conta"
              ? { alvo: "conta", confirmacao: texto }
              : { conjuntos: ids, confirmacao: texto },
          ),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setEstado({ tipo: "erro", msg: json?.erro ?? "Não foi possível apagar." });
          return;
        }

        if (modo === "conta") {
          await sair();
          window.location.href = "/";
          return;
        }

        limparLocal(ids);
        // O número de linhas, e não «feito»: quem apaga quer saber quanto.
        const linhas = Object.values((json?.linhas ?? {}) as Record<string, number>)
          .reduce((a, b) => a + b, 0);
        setEstado({
          tipo: "feito",
          resumo: linhas === 1 ? "Um registo apagado." : `${linhas} registos apagados.`,
        });
        fechar();
        setEscolhidos(new Set());
        // O resto da aplicação lê estes dados em memória; recarregar é a
        // forma honesta de garantir que ninguém fica a ver o que já não há.
        setTimeout(() => window.location.reload(), 1600);
      } catch {
        setEstado({ tipo: "erro", msg: "Não foi possível contactar o servidor." });
      }
    },
    [escolhidos, texto, fechar, sair],
  );

  if (!user) return null;

  const alvo = aConfirmar === "conta" ? ALVO_CONTA : ALVO_CONJUNTOS;
  const pronto = confirmacaoValida(alvo, texto);
  const nEscolhidos = escolhidos.size;

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
          Escolhe exatamente o que queres apagar. Tudo o que está aqui é imediato e não tem forma
          de voltar atrás — exporta antes o que quiseres guardar.
        </p>
      </div>

      {estado.tipo === "feito" ? (
        <p role="status" className="mx-5 mt-4 flex items-center gap-2 rounded-2xl bg-brand-light px-4 py-2.5 text-xs font-semibold text-brand-dark sm:mx-6">
          <Check size={13} /> {estado.resumo}
        </p>
      ) : null}
      {estado.tipo === "erro" ? (
        <p role="alert" className="mx-5 mt-4 flex items-start gap-2 rounded-2xl bg-alert-bg px-4 py-2.5 text-xs leading-relaxed text-alert-text sm:mx-6">
          <Warning size={13} className="mt-0.5 flex-shrink-0" /> {estado.msg}
        </p>
      ) : null}

      {grupos.length === 0 && inventario !== null ? (
        <p className="px-5 py-6 text-xs leading-relaxed text-stone-500 sm:px-6 dark:text-stone-400">
          Não tens nada guardado na nuvem. Não há nada para apagar aqui.
        </p>
      ) : null}

      <div className="divide-y divide-clay-border/60">
        {grupos.map((g) => (
          <fieldset key={g.id} className="px-5 py-4 sm:px-6">
            <legend className="text-xs font-bold uppercase tracking-wide text-clay-text/70">
              {g.titulo}
            </legend>
            <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">{g.descricao}</p>

            <ul className="mt-3 space-y-1">
              {g.conjuntos.map((c) => {
                const quantos = inventario?.[c.id];
                const vazio = inventario !== null && (quantos ?? 0) === 0;
                return (
                  <li key={c.id}>
                    <label
                      className={`flex items-start gap-3 rounded-2xl px-3 py-2.5 transition-colors ${
                        vazio
                          ? "opacity-45"
                          : "cursor-pointer hover:bg-white/70 dark:hover:bg-stone-900/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={vazio}
                        checked={escolhidos.has(c.id)}
                        onChange={() => alternar(c.id)}
                        className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-stone-300 text-clay-text focus:ring-clay-text disabled:cursor-not-allowed"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                            {c.titulo}
                          </span>
                          {quantos !== undefined ? (
                            <span className="text-[11px] tabular-nums text-stone-500 dark:text-stone-400">
                              {vazio ? "nada guardado" : quantos === 1 ? "1 registo" : `${quantos} registos`}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                          {c.descricao}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}
      </div>

      {/* O que não se apaga a pedido, e porquê. Dizê-lo é parte de ser honesto. */}
      {retidos.length > 0 ? (
        <div className="border-t border-clay-border/60 px-5 py-4 sm:px-6">
          <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            O que fica, e porquê
          </h3>
          <ul className="mt-2 space-y-1.5">
            {retidos.map((c) => (
              <li key={c.id} className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                <strong className="font-semibold text-stone-700 dark:text-stone-300">{c.titulo}</strong>
                {" — "}{c.retido}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Apagar o escolhido */}
      {grupos.length > 0 ? (
        <div className="border-t border-clay-border bg-white/60 px-5 py-4 sm:px-6 dark:bg-stone-900/40">
          {aConfirmar === "conjuntos" ? (
            <Confirmacao
              alvo={ALVO_CONJUNTOS}
              texto={texto}
              setTexto={setTexto}
              auto={auto}
              setAuto={setAuto}
              pronto={pronto}
              aApagar={estado.tipo === "a-apagar"}
              onCancelar={fechar}
              onApagar={() => apagar("conjuntos")}
              acao={`Apagar ${nEscolhidos === 1 ? "1 coisa" : `${nEscolhidos} coisas`}`}
            />
          ) : (
            <button
              type="button"
              disabled={nEscolhidos === 0}
              onClick={() => { setAConfirmar("conjuntos"); setTexto(""); setAuto(false); setEstado({ tipo: "parado" }); }}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-clay-text px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              <Trash size={14} />
              {nEscolhidos === 0
                ? "Escolhe o que apagar"
                : `Apagar ${nEscolhidos === 1 ? "1 coisa" : `${nEscolhidos} coisas`}`}
            </button>
          )}
        </div>
      ) : null}

      {/* A conta. Outra ordem de grandeza, e por isso outro sítio. */}
      <div className="border-t-2 border-clay-border px-5 py-4 sm:px-6">
        <h3 className="text-sm font-semibold text-clay-text">Apagar a conta definitivamente</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
          Apaga tudo o que está em cima, os ficheiros que enviaste e a própria conta. Cancelamos a
          subscrição por ti — não continuas a ser cobrado. Perdes o acesso imediatamente e não há
          forma de reverter.
        </p>

        {aConfirmar === "conta" ? (
          <div className="mt-3">
            <Confirmacao
              alvo={ALVO_CONTA}
              texto={texto}
              setTexto={setTexto}
              auto={auto}
              setAuto={setAuto}
              pronto={pronto}
              aApagar={estado.tipo === "a-apagar"}
              onCancelar={fechar}
              onApagar={() => apagar("conta")}
              acao="Apagar a conta"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setAConfirmar("conta"); setTexto(""); setAuto(false); setEstado({ tipo: "parado" }); }}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-clay-border bg-white px-5 py-3 text-sm font-semibold text-clay-text transition-colors hover:bg-clay-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-text sm:w-auto dark:bg-stone-900"
          >
            <Trash size={14} /> Apagar a conta
          </button>
        )}
      </div>
    </section>
  );
}

function Confirmacao(p: {
  alvo: { id: string; confirmacao: string };
  texto: string;
  setTexto: (s: string) => void;
  auto: boolean;
  setAuto: (b: boolean) => void;
  pronto: boolean;
  aApagar: boolean;
  acao: string;
  onCancelar: () => void;
  onApagar: () => void;
}) {
  return (
    <div className="rounded-2xl border border-clay-border bg-white p-4 dark:bg-stone-900">
      <label
        htmlFor={`conf-${p.alvo.id}`}
        className="block text-xs leading-relaxed text-stone-600 dark:text-stone-300"
      >
        Para confirmar, escreve{" "}
        <strong className="select-all font-mono text-clay-text">{p.alvo.confirmacao}</strong>
      </label>

      <input
        id={`conf-${p.alvo.id}`}
        type="text"
        value={p.texto}
        autoComplete="off"
        spellCheck={false}
        placeholder={p.alvo.confirmacao}
        aria-describedby={`ajuda-${p.alvo.id}`}
        // Só entra o que corresponde à frase. Uma tecla errada não produz
        // erro nenhum — simplesmente não entra.
        onChange={(e) => p.setTexto(recortarAoPrefixo(p.alvo as never, e.target.value))}
        className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 font-mono text-sm text-stone-800 placeholder:text-stone-300 focus:border-clay-text focus:outline-none focus:ring-2 focus:ring-clay-text/25 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
      />
      <p id={`ajuda-${p.alvo.id}`} className="mt-1.5 text-[11px] text-stone-400">
        O campo só aceita esta frase — não é possível escrever outra coisa.
      </p>

      <label className="mt-3 flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={p.auto}
          onChange={(e) => {
            p.setAuto(e.target.checked);
            p.setTexto(e.target.checked ? p.alvo.confirmacao : "");
          }}
          className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-stone-300 text-clay-text focus:ring-clay-text"
        />
        <span className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
          Preencher a confirmação por mim — já li o que vai ser apagado.
        </span>
      </label>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={!p.pronto || p.aApagar}
          onClick={p.onApagar}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-clay-text px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {p.aApagar ? <><Spinner size={14} /> A apagar…</> : <><Trash size={14} /> {p.acao}</>}
        </button>
        <button
          type="button"
          onClick={p.onCancelar}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
