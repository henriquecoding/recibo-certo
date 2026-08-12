"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listarContabilistas } from "@/lib/contabilistas/dados";
import { DISTRITOS, ESPECIALIDADES } from "@/lib/contabilistas/catalogo";
import { eurosDeCents } from "@/lib/contabilistas/fidelidade";
import type { Contabilista } from "@/lib/contabilistas/tipos";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import Badge from "@/components/ui/Badge";
import { Briefcase, MapPin, Search, Gift, Warning } from "@/components/ui/Icons";

export default function DiretorioCliente() {
  const [lista, setLista] = useState<Contabilista[]>([]);
  const [estado, setEstado] = useState<"a-ler" | "pronto" | "erro">("a-ler");
  const [erro, setErro] = useState("");
  const [procura, setProcura] = useState("");
  const [distrito, setDistrito] = useState("");
  const [especialidade, setEspecialidade] = useState("");

  useEffect(() => {
    let vivo = true;
    listarContabilistas()
      .then((l) => { if (vivo) { setLista(l); setEstado("pronto"); } })
      .catch((e: Error) => {
        if (vivo) {
          // Sem Supabase configurado o diretório não existe — dizê-lo é melhor
          // do que mostrar uma lista vazia que parece «não há ninguém».
          setErro(e.message); setEstado("erro");
        }
      });
    return () => { vivo = false; };
  }, []);

  const filtrada = useMemo(() => {
    const p = procura.trim().toLowerCase();
    return lista.filter((c) => {
      if (distrito && c.distrito !== distrito) return false;
      if (especialidade && !c.especialidades.includes(especialidade)) return false;
      if (!p) return true;
      return (
        c.nome.toLowerCase().includes(p) ||
        (c.concelho ?? "").toLowerCase().includes(p) ||
        (c.distrito ?? "").toLowerCase().includes(p) ||
        c.especialidades.some((e) => e.toLowerCase().includes(p))
      );
    });
  }, [lista, procura, distrito, especialidade]);

  if (estado === "a-ler") {
    return (
      <div className="mt-8 grid gap-4 sm:grid-cols-2" aria-busy="true">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-4xl bg-stone-100" />)}
      </div>
    );
  }

  if (estado === "erro") {
    return (
      <p role="alert" className="mt-8 flex items-start gap-2 rounded-2xl bg-alert-bg px-4 py-3 text-sm text-alert-text">
        <Warning size={16} className="mt-0.5 shrink-0" aria-hidden />
        O diretório não está disponível de momento. {erro}
      </p>
    );
  }

  return (
    <>
      <div className="mt-8 space-y-3">
        <label htmlFor="procura" className="sr-only">Procurar contabilista</label>
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden />
          <input
            id="procura"
            value={procura}
            onChange={(e) => setProcura(e.target.value)}
            placeholder="Nome, concelho ou área"
            className="min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-11 pr-3.5 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className="sr-only" htmlFor="distrito">Distrito</label>
          <select
            id="distrito"
            value={distrito}
            onChange={(e) => setDistrito(e.target.value)}
            className="min-h-[2.75rem] rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="">Todos os distritos</option>
            {DISTRITOS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <label className="sr-only" htmlFor="area">Área</label>
          <select
            id="area"
            value={especialidade}
            onChange={(e) => setEspecialidade(e.target.value)}
            className="min-h-[2.75rem] rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="">Todas as áreas</option>
            {ESPECIALIDADES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      <p role="status" className="mt-4 text-sm text-stone-500">
        {filtrada.length === 0
          ? "Nenhum resultado."
          : `${filtrada.length} ${filtrada.length === 1 ? "contabilista" : "contabilistas"}.`}
      </p>

      {filtrada.length === 0 ? (
        <div className="mt-4">
          <EstadoVazio
            Icon={Briefcase}
            titulo={lista.length === 0 ? "O diretório ainda está a começar" : "Sem resultados para estes filtros"}
            descricao={
              lista.length === 0
                ? "Ainda não há contabilistas aprovados. Se és contabilista, podes ser dos primeiros."
                : "Tenta alargar a procura ou limpar os filtros."
            }
          />
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {filtrada.map((c) => (
            <li key={c.userId}>
              <Link
                href={`/contabilistas/${c.slug}`}
                className="flex h-full flex-col rounded-4xl border border-stone-200 bg-white p-5 shadow-card transition-shadow hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 font-display text-xl text-ink">{c.nome}</h2>
                  {!c.aceitaNovosClientes && <Badge tone="neutral">Sem vagas</Badge>}
                </div>

                {(c.concelho || c.distrito) && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-stone-500">
                    <MapPin size={14} aria-hidden />
                    {[c.concelho, c.distrito].filter(Boolean).join(", ")}
                  </p>
                )}

                {c.bio && (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-stone-600">{c.bio}</p>
                )}

                {c.especialidades.length > 0 && (
                  <ul className="mt-3.5 flex flex-wrap gap-1.5">
                    {c.especialidades.slice(0, 3).map((e) => (
                      <li key={e} className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                        {e}
                      </li>
                    ))}
                    {c.especialidades.length > 3 && (
                      <li className="px-1 py-1 text-xs text-stone-400">+{c.especialidades.length - 3}</li>
                    )}
                  </ul>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-4 text-sm">
                  {c.precoConsultaCents > 0 && (
                    <span className="font-semibold tabular-nums text-stone-800">
                      {eurosDeCents(c.precoConsultaCents)} <span className="font-normal text-stone-400">/ consulta</span>
                    </span>
                  )}
                  {c.fidelidadeAtiva && (
                    <span className="flex items-center gap-1.5 text-brand-dark">
                      <Gift size={14} aria-hidden />
                      {c.fidelidadeDescontoPct}% ao fim de {c.fidelidadeMeta}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
