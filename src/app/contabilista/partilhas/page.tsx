"use client";

// Partilhas recebidas. Cada uma é uma cópia que o cliente enviou de
// propósito; abrir marca como vista, e o cliente pode revogar a qualquer
// momento — a partir daí desaparece daqui, sem depender deste ecrã.

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { usarFicha } from "@/components/contabilistas/usarFicha";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import CabecalhoPainel from "@/components/contabilistas/CabecalhoPainel";
import { listarPartilhas, marcarPartilhaVista } from "@/lib/contabilistas/dados";
import { ROTULO_PARTILHA } from "@/lib/contabilistas/vinculo";
import type { Partilha } from "@/lib/contabilistas/tipos";
import Badge from "@/components/ui/Badge";
import { PaperClip, ChevronDown, ChevronUp, Warning, PenLine } from "@/components/ui/Icons";

type Filtro = "todas" | "novas";

export default function PartilhasPage() {
  const { ficha, aCarregar } = usarFicha();
  const [lista, setLista] = useState<Partilha[]>([]);
  const [aberto, setAberto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (id: string) => {
    try { setLista(await listarPartilhas({ contabilistaId: id })); }
    catch (e) { setErro((e as Error).message); }
  }, []);

  useEffect(() => { if (ficha) void carregar(ficha.userId); }, [ficha, carregar]);

  const novas = useMemo(() => lista.filter((p) => p.estado === "enviada").length, [lista]);
  const visiveis = useMemo(
    () => (filtro === "novas" ? lista.filter((p) => p.estado === "enviada") : lista),
    [lista, filtro],
  );

  async function abrir(p: Partilha) {
    if (aberto === p.id) { setAberto(null); return; }
    setAberto(p.id);
    if (p.estado === "enviada" && ficha) {
      await marcarPartilhaVista(p.id);
      setLista((l) => l.map((x) => (x.id === p.id ? { ...x, estado: "vista" } : x)));
    }
  }

  if (aCarregar) return <Esqueleto />;
  if (!ficha) return null;

  return (
    <div className="space-y-6">
      <CabecalhoPainel
        titulo="Partilhas"
        descricao="Simulações que os teus clientes te enviaram. São cópias do que estava no ecrã no momento do envio — não acompanham alterações posteriores."
      />

      {erro && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-clay-bg px-4 py-3 text-sm text-clay-text">
          <Warning size={16} className="mt-0.5 shrink-0" aria-hidden /> {erro}
        </p>
      )}

      {lista.length > 0 && (
        <div role="group" aria-label="Filtrar partilhas" className="flex gap-1.5">
          {([["todas", `Todas (${lista.length})`], ["novas", `Por ler (${novas})`]] as const).map(([id, txt]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filtro === id}
              onClick={() => setFiltro(id)}
              className={`min-h-[2.25rem] shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                filtro === id ? "bg-brand text-white" : "bg-white text-stone-600 hover:bg-stone-100"
              }`}
            >
              {txt}
            </button>
          ))}
        </div>
      )}

      {lista.length === 0 ? (
        <EstadoVazio
          Icon={PaperClip}
          titulo="Nada recebido"
          descricao="Quando um cliente te enviar uma simulação a partir de uma ferramenta do site, ela aparece aqui."
        />
      ) : visiveis.length === 0 ? (
        <p className="rounded-4xl border border-stone-200 bg-white px-5 py-8 text-center text-sm text-stone-500">
          Leste tudo. Não há partilhas por ler.
        </p>
      ) : (
        <ul className="space-y-3">
          {visiveis.map((p) => {
            const expandido = aberto === p.id;
            return (
              <li key={p.id} className="rounded-4xl border border-stone-200 bg-white shadow-card">
                <button
                  type="button"
                  onClick={() => void abrir(p)}
                  aria-expanded={expandido}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left sm:p-5"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-stone-800">{p.titulo}</span>
                    <span className="mt-0.5 block text-sm text-stone-500">
                      {ROTULO_PARTILHA[p.tipo]} ·{" "}
                      {new Intl.DateTimeFormat("pt-PT", { dateStyle: "long" }).format(new Date(p.criadoEm))}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {p.nota && (
                      <PenLine size={15} className="text-stone-400" aria-label="Tem uma nota do cliente" />
                    )}
                    {p.estado === "enviada" && <Badge tone="brand">Nova</Badge>}
                    {expandido ? <ChevronUp size={18} className="text-stone-400" aria-hidden /> : <ChevronDown size={18} className="text-stone-400" aria-hidden />}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {expandido && (
                    <m.div
                      key="corpo"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-stone-100 p-4 sm:p-5">
                        {/* A nota do cliente vem primeiro: é a única linha
                            escrita por uma pessoa, e diz por onde começar. */}
                        {p.nota && (
                          <p className="mb-4 flex items-start gap-2.5 rounded-2xl bg-cream px-4 py-3 text-sm leading-relaxed text-stone-700">
                            <PenLine size={15} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
                            <span className="whitespace-pre-line">{p.nota}</span>
                          </p>
                        )}

                        <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                          {Object.entries(p.conteudo).map(([chave, valor]) => (
                            <div key={chave} className="min-w-0 border-b border-stone-100 pb-2 last:border-0">
                              <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">
                                {humanizar(chave)}
                              </dt>
                              <dd className="mt-0.5 break-words text-sm tabular-nums text-stone-800">
                                {formatar(valor)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                        <p className="mt-4 text-xs text-stone-400">
                          Consentimento registado na versão {p.consentimentoVersao}.
                        </p>
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * O esqueleto tem a FORMA do que vem a seguir — cabeçalho, filtros, três
 * cartões. Um retângulo cinzento genérico diz «espera»; isto diz «espera, e
 * o que vem é uma lista».
 */
function Esqueleto() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-stone-100" />
        <div className="h-9 w-44 animate-pulse rounded-xl bg-stone-100" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-9 w-28 animate-pulse rounded-xl bg-stone-100" />
        <div className="h-9 w-28 animate-pulse rounded-xl bg-stone-100" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-4xl bg-stone-100" />)}
      </div>
    </div>
  );
}

/** "rendimentoBruto" → "Rendimento bruto". */
function humanizar(chave: string): string {
  const s = chave.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatar(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(v);
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}
