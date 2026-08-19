"use client";

// Os meus casos. A lista é curta de propósito — quem tem um caso aberto
// quer saber em que pé está, e não navegar por um arquivo.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import Button from "@/components/ui/Button";
import { ArrowRight, Briefcase, Plus, Clock } from "@/components/ui/Icons";
import {
  listarCasos, estadoDoCasoLegivel, AREAS, type Caso,
} from "@/lib/contabilistas/casos";

/** A cor diz o que é preciso fazer, e não o que aconteceu. */
const TOM: Record<string, string> = {
  com_proposta: "bg-brand-light text-brand-dark",
  aceite: "bg-brand-light text-brand-dark",
  encaminhado: "bg-stone-100 text-stone-600",
  em_triagem: "bg-stone-100 text-stone-600",
  submetido: "bg-stone-100 text-stone-600",
  recusado: "bg-stone-100 text-stone-400",
  fechado: "bg-stone-100 text-stone-400",
  rascunho: "bg-alert-bg text-alert-text",
};

export default function MeusCasos() {
  const { user, carregado } = useAuth();
  const [casos, setCasos] = useState<Caso[] | null>(null);

  useEffect(() => {
    if (!carregado) return;
    if (!user) { setCasos([]); return; }
    listarCasos().then(setCasos).catch(() => setCasos([]));
  }, [user, carregado]);

  if (!carregado || casos === null) {
    return (
      <div className="space-y-3">
        <div className="h-10 w-48 animate-pulse rounded-2xl bg-stone-100" />
        <div className="h-28 animate-pulse rounded-4xl bg-stone-100" />
        <div className="h-28 animate-pulse rounded-4xl bg-stone-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="eyebrow">Acompanhamento</p>
          <h1 className="mt-1 font-display text-3xl leading-tight text-ink sm:text-4xl">
            Os meus casos
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
            Descreve o que precisas, escolhe a quem o queres enviar, e fala
            diretamente com quem responder.
          </p>
        </div>
        <Link href="/dashboard/casos/novo" className="shrink-0">
          <Button><Plus size={14} aria-hidden /> Descrever um caso</Button>
        </Link>
      </header>

      {casos.length === 0 ? (
        <EstadoVazio
          Icon={Briefcase}
          titulo="Ainda não descreveste nenhum caso"
          descricao="Diz o que precisas de resolver e escolhe até três contabilistas certificados para o verem. É gratuito, e não precisas do Plus."
          acao={
            <Link href="/dashboard/casos/novo">
              <Button><Plus size={14} aria-hidden /> Descrever um caso</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {casos.map((c) => {
            const { titulo, explicacao } = estadoDoCasoLegivel(c.estado);
            const area = AREAS.find((a) => a.id === c.area);
            return (
              <li key={c.id}>
                <Link
                  href={`/dashboard/casos/${c.id}`}
                  className="block rounded-4xl border border-stone-200 bg-white p-5 shadow-card transition-shadow hover:shadow-lift"
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] tabular-nums text-stone-400">
                          {c.referencia}
                        </span>
                        {area && (
                          <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
                            {area.titulo}
                          </span>
                        )}
                        <span className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold ${TOM[c.estado] ?? "bg-stone-100 text-stone-600"}`}>
                          {titulo}
                        </span>
                      </div>
                      <h2 className="mt-1.5 truncate font-display text-lg text-ink">{c.assunto}</h2>
                      <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{explicacao}</p>
                    </div>
                    <ArrowRight size={16} className="mt-1 shrink-0 text-stone-300" aria-hidden />
                  </div>

                  {c.submetidoEm && (
                    <p className="mt-3 flex items-center gap-1.5 text-[11px] text-stone-400">
                      <Clock size={12} aria-hidden />
                      Enviado a {new Date(c.submetidoEm).toLocaleDateString("pt-PT", {
                        day: "numeric", month: "long",
                      })}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
