"use client";

// Partilhas recebidas. Cada uma é uma cópia que o cliente enviou de
// propósito; abrir marca como vista, e o cliente pode revogar a qualquer
// momento — a partir daí desaparece daqui, sem depender deste ecrã.

import { useCallback, useEffect, useState } from "react";
import { usarFicha } from "@/components/contabilistas/usarFicha";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import { listarPartilhas, marcarPartilhaVista } from "@/lib/contabilistas/dados";
import { ROTULO_PARTILHA } from "@/lib/contabilistas/vinculo";
import type { Partilha } from "@/lib/contabilistas/tipos";
import Badge from "@/components/ui/Badge";
import { PaperClip, ChevronDown, ChevronUp, Warning } from "@/components/ui/Icons";

export default function PartilhasPage() {
  const { ficha, aCarregar } = usarFicha();
  const [lista, setLista] = useState<Partilha[]>([]);
  const [aberto, setAberto] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (id: string) => {
    try { setLista(await listarPartilhas({ contabilistaId: id })); }
    catch (e) { setErro((e as Error).message); }
  }, []);

  useEffect(() => { if (ficha) void carregar(ficha.userId); }, [ficha, carregar]);

  async function abrir(p: Partilha) {
    if (aberto === p.id) { setAberto(null); return; }
    setAberto(p.id);
    if (p.estado === "enviada" && ficha) {
      await marcarPartilhaVista(p.id);
      setLista((l) => l.map((x) => (x.id === p.id ? { ...x, estado: "vista" } : x)));
    }
  }

  if (aCarregar) return <div className="h-96 animate-pulse rounded-4xl bg-stone-100" aria-busy="true" />;
  if (!ficha) return null;

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Painel de gestão</p>
        <h1 className="mt-1 font-display text-3xl text-ink sm:text-4xl">Partilhas</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
          Simulações que os teus clientes te enviaram. São cópias do que estava no
          ecrã no momento do envio — não acompanham alterações posteriores.
        </p>
      </header>

      {erro && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-clay-bg px-4 py-3 text-sm text-clay-text">
          <Warning size={16} className="mt-0.5 shrink-0" aria-hidden /> {erro}
        </p>
      )}

      {lista.length === 0 ? (
        <EstadoVazio
          Icon={PaperClip}
          titulo="Nada recebido"
          descricao="Quando um cliente te enviar uma simulação a partir de uma ferramenta do site, ela aparece aqui."
        />
      ) : (
        <ul className="space-y-3">
          {lista.map((p) => {
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
                    {p.estado === "enviada" && <Badge tone="brand">Nova</Badge>}
                    {expandido ? <ChevronUp size={18} className="text-stone-400" aria-hidden /> : <ChevronDown size={18} className="text-stone-400" aria-hidden />}
                  </span>
                </button>

                {expandido && (
                  <div className="border-t border-stone-100 p-4 sm:p-5">
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
                )}
              </li>
            );
          })}
        </ul>
      )}
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
