"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A BUSCA DO PAINEL — um campo no topo, uma paleta por trás
//  ---------------------------------------------------------------------
//  As quatro referências têm o mesmo campo no centro do topo, com o mesmo
//  texto e o mesmo atalho: «Pesquisar clientes, casos, documentos… ⌘K».
//  É o único elemento do topo que não muda de ecrã para ecrã.
//
//  ⚠️ Um campo que não procura nada é pior do que não ter campo nenhum:
//  promete uma coisa e não a cumpre. Por isso isto procura mesmo — nos
//  clientes, nos casos e nas tarefas de quem está autenticado, pelas
//  MESMAS portas do resto do painel (`fonte/*`), o que faz com que
//  funcione igual na demonstração e no painel real.
//
//  Os dados só são pedidos quando a paleta abre pela primeira vez. O topo
//  está em todos os ecrãs; carregar três listas a cada navegação seria
//  pagar por uma coisa que a maioria das visitas nunca usa.
// ═══════════════════════════════════════════════════════════════════════

import { useRouter } from "next/navigation";
import {
  useCallback, useEffect, useId, useMemo, useRef, useState,
  type ComponentType,
} from "react";
import { listarCasos } from "@/lib/contabilistas/fonte/casos";
import { meusClientes } from "@/lib/contabilistas/fonte/dados";
import { listarTarefas } from "@/lib/contabilistas/fonte/trabalho";
import { tratamentoDoCliente } from "@/lib/contabilistas/tipos";
import type { Painel } from "@/components/contabilistas/usarPainel";
import { Briefcase, Close, Search, Target, User } from "@/components/ui/Icons";
import styles from "@/app/contabilista/painel.module.css";

export const PLACEHOLDER_BUSCA = "Pesquisar clientes, casos, documentos…";

interface Destino {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
}

interface Resultado {
  chave: string;
  grupo: "Ir para" | "Clientes" | "Casos" | "Tarefas";
  titulo: string;
  detalhe?: string;
  href: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
}

/** Sem acentos e em minúsculas: «josé» encontra-se escrevendo «jose». */
function simplificar(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export default function BuscaDoPainel({
  painel,
  destinos,
  contabilistaId,
}: {
  painel: Painel;
  destinos: Destino[];
  /** Vazio na demonstração: a loja em memória ignora quem pergunta. */
  contabilistaId: string;
}) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [indice, setIndice] = useState(0);
  const [dados, setDados] = useState<Resultado[] | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const idLista = useId();

  const carregar = useCallback(async () => {
    const [clientes, casos, tarefas] = await Promise.all([
      meusClientes(contabilistaId).catch(() => []),
      listarCasos().catch(() => []),
      listarTarefas(contabilistaId).catch(() => []),
    ]);
    const linhas: Resultado[] = [];
    for (const v of clientes) {
      if (v.estado === "terminado") continue;
      linhas.push({
        chave: `cliente-${v.id}`,
        grupo: "Clientes",
        titulo: tratamentoDoCliente(v),
        detalhe: v.estado === "pendente" ? "Pedido por responder" : v.emailCliente ?? undefined,
        href: painel.href("/contabilista/clientes"),
        Icon: User,
      });
    }
    for (const c of casos) {
      linhas.push({
        chave: `caso-${c.id}`,
        grupo: "Casos",
        titulo: c.assunto,
        detalhe: `${c.referencia} · ${c.nomeCompleto}`,
        href: `${painel.href("/contabilista/casos")}?caso=${c.id}`,
        Icon: Briefcase,
      });
    }
    for (const t of tarefas) {
      // O que já foi entregue não é o que se procura no meio do trabalho.
      if (t.estado === "entregue") continue;
      linhas.push({
        chave: `tarefa-${t.id}`,
        grupo: "Tarefas",
        titulo: t.titulo,
        detalhe: t.obrigacao ?? t.notas ?? undefined,
        href: painel.href("/contabilista/trabalho"),
        Icon: Target,
      });
    }
    setDados(linhas);
  }, [contabilistaId, painel]);

  function abrir() {
    setAberta(true);
    setConsulta("");
    setIndice(0);
    if (dados === null) void carregar();
  }

  // ⌘K / Ctrl+K em qualquer ecrã do painel, como as referências anunciam.
  // Ignorado enquanto se escreve noutro campo: o atalho não pode roubar
  // texto a quem está a preencher o perfil.
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey)) return;
      const alvo = e.target;
      const aEscrever =
        alvo instanceof HTMLInputElement ||
        alvo instanceof HTMLTextAreaElement ||
        (alvo instanceof HTMLElement && alvo.isContentEditable);
      if (aEscrever && alvo !== campo.current) return;
      e.preventDefault();
      abrir();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados]);

  useEffect(() => {
    if (aberta) campo.current?.focus();
  }, [aberta]);

  const resultados = useMemo<Resultado[]>(() => {
    const navegacao: Resultado[] = destinos.map((d) => ({
      chave: `ir-${d.href}`,
      grupo: "Ir para",
      titulo: d.label,
      href: painel.href(d.href),
      Icon: d.Icon,
    }));
    const termo = simplificar(consulta);
    if (!termo) return navegacao;
    const todos = [...navegacao, ...(dados ?? [])];
    return todos
      .filter((r) => simplificar(`${r.titulo} ${r.detalhe ?? ""}`).includes(termo))
      .slice(0, 24);
  }, [consulta, dados, destinos, painel]);

  useEffect(() => { setIndice(0); }, [consulta]);

  function escolher(r: Resultado | undefined) {
    if (!r) return;
    setAberta(false);
    router.push(r.href);
  }

  function aoTeclarNaPaleta(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setAberta(false); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setIndice((i) => {
        const n = resultados.length;
        if (n === 0) return 0;
        const proximo = e.key === "ArrowDown" ? (i + 1) % n : (i - 1 + n) % n;
        lista.current?.children[proximo]?.scrollIntoView({ block: "nearest" });
        return proximo;
      });
      return;
    }
    if (e.key === "Enter") { e.preventDefault(); escolher(resultados[indice]); }
  }

  return (
    <>
      {/* O gatilho. No telemóvel encolhe para o ícone: a 360px o campo
          inteiro deixava o título do ecrã sem espaço nenhum. */}
      <button
        type="button"
        onClick={abrir}
        className={styles.busca}
        aria-label="Pesquisar no painel"
        aria-keyshortcuts="Meta+K Control+K"
      >
        <Search size={16} className="shrink-0 text-stone-400" aria-hidden />
        <span className={styles.buscaTexto}>{PLACEHOLDER_BUSCA}</span>
        <kbd className={styles.buscaAtalho} aria-hidden>⌘K</kbd>
      </button>

      {aberta && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/45 px-3 pb-3 backdrop-blur-sm sm:items-start sm:pt-[12vh]"
          onClick={(e) => { if (e.target === e.currentTarget) setAberta(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pesquisar no painel"
            onKeyDown={aoTeclarNaPaleta}
            className="flex max-h-[80dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-lift dark:border-stone-800 dark:bg-stone-900"
            style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex shrink-0 items-center gap-2.5 border-b border-stone-100 px-4 dark:border-stone-800">
              <Search size={17} className="shrink-0 text-stone-400" aria-hidden />
              <input
                ref={campo}
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
                placeholder={PLACEHOLDER_BUSCA}
                aria-label="Termo de pesquisa"
                aria-controls={idLista}
                aria-autocomplete="list"
                role="combobox"
                aria-expanded
                className="min-w-0 flex-1 border-0 bg-transparent py-3.5 text-[0.9375rem] text-ink outline-none placeholder:text-stone-400 dark:text-stone-100"
              />
              <button
                type="button"
                onClick={() => setAberta(false)}
                className="focus-marca -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
                aria-label="Fechar pesquisa"
              >
                <Close size={16} aria-hidden />
              </button>
            </div>

            <ul id={idLista} ref={lista} role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
              {resultados.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-stone-500 dark:text-stone-400">
                  {dados === null
                    ? "A procurar…"
                    : `Sem resultados para «${consulta.trim()}».`}
                </li>
              )}
              {resultados.map((r, i) => {
                const primeiroDoGrupo = i === 0 || resultados[i - 1].grupo !== r.grupo;
                return (
                  <li key={r.chave}>
                    {primeiroDoGrupo && (
                      <p className="px-3 pb-1 pt-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-stone-400">
                        {r.grupo}
                      </p>
                    )}
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === indice}
                      onMouseEnter={() => setIndice(i)}
                      onClick={() => escolher(r)}
                      className={`flex w-full min-h-10 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                        i === indice
                          ? "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint"
                          : "text-stone-700 dark:text-stone-300"
                      }`}
                    >
                      <r.Icon size={15} className="shrink-0 opacity-70" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{r.titulo}</span>
                        {r.detalhe && (
                          <span className="block truncate text-xs text-stone-400">{r.detalhe}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
