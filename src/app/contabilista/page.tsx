"use client";

// Hoje — o que precisa de atenção agora: pedidos por responder, consultas do
// dia e partilhas por ler. Nada de números decorativos.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usarFicha } from "@/components/contabilistas/usarFicha";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import {
  listarAgendamentos, listarPartilhas, meusClientes,
} from "@/lib/contabilistas/dados";
import type { Agendamento, Partilha, Vinculo } from "@/lib/contabilistas/tipos";
import { horaLocal, rotularDia, diaLocal } from "@/lib/contabilistas/agenda";
import { Calendar, User, PaperClip, Clock, Warning } from "@/components/ui/Icons";
import Badge from "@/components/ui/Badge";

export default function HojePage() {
  const { ficha, aCarregar } = usarFicha();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [partilhas, setPartilhas] = useState<Partilha[]>([]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!ficha) return;
    let vivo = true;
    const desde = new Date(Date.now() - 12 * 3600_000);
    Promise.all([
      listarAgendamentos({ contabilistaId: ficha.userId, desde }),
      listarPartilhas({ contabilistaId: ficha.userId }),
      meusClientes(ficha.userId),
    ])
      .then(([a, p, v]) => { if (vivo) { setAgendamentos(a); setPartilhas(p); setVinculos(v); } })
      .catch((e: Error) => { if (vivo) setErro(e.message); });
    return () => { vivo = false; };
  }, [ficha]);

  const proximas = useMemo(
    () => agendamentos.filter((a) => a.estado === "pedido" || a.estado === "confirmado").slice(0, 6),
    [agendamentos]
  );
  const porResponder = vinculos.filter((v) => v.estado === "pendente").length;
  const porLer = partilhas.filter((p) => p.estado === "enviada").length;
  const porConfirmar = agendamentos.filter((a) => a.estado === "pedido").length;

  if (aCarregar) return <Esqueleto />;
  if (!ficha) return null;

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Painel de gestão</p>
        <h1 className="mt-1 font-display text-3xl text-ink sm:text-4xl">Hoje</h1>
      </header>

      {erro && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-alert-bg px-4 py-3 text-sm text-alert-text">
          <Warning size={16} className="mt-0.5 shrink-0" aria-hidden /> {erro}
        </p>
      )}

      {!ficha.fidelidadeAtiva && (
        <p className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
          O cartão de fidelidade está desligado.{" "}
          <Link href="/contabilista/fidelidade" className="font-semibold text-brand-dark underline underline-offset-2">
            Configura o preço e a percentagem
          </Link>{" "}
          para começar a carimbar consultas.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Numero rotulo="Pedidos de cliente" valor={porResponder} href="/contabilista/clientes" Icon={User} />
        <Numero rotulo="Consultas por confirmar" valor={porConfirmar} href="/contabilista/agenda" Icon={Calendar} />
        <Numero rotulo="Partilhas por ler" valor={porLer} href="/contabilista/partilhas" Icon={PaperClip} />
      </div>

      <section aria-labelledby="proximas-titulo" className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
        <h2 id="proximas-titulo" className="font-display text-xl text-ink">Próximas consultas</h2>
        {proximas.length === 0 ? (
          <div className="mt-4">
            <EstadoVazio
              Icon={Calendar}
              titulo="Nada marcado"
              descricao="Quando um cliente marcar uma consulta, aparece aqui."
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100">
            {proximas.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-800">
                    {rotularDia(diaLocal(new Date(a.inicio)))}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm tabular-nums text-stone-500">
                    <Clock size={14} aria-hidden />
                    {horaLocal(new Date(a.inicio))} — {horaLocal(new Date(a.fim))}
                    <span className="text-stone-300">·</span>
                    {a.modalidade === "online" ? "Online" : "Presencial"}
                  </p>
                </div>
                <Badge tone={a.estado === "confirmado" ? "brand" : "alert"}>
                  {a.estado === "confirmado" ? "Confirmada" : "Por confirmar"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/contabilista/agenda"
          className="mt-4 inline-block text-sm font-semibold text-brand-dark underline underline-offset-2"
        >
          Ver a agenda toda
        </Link>
      </section>
    </div>
  );
}

function Numero({
  rotulo, valor, href, Icon,
}: {
  rotulo: string; valor: number; href: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card transition-shadow hover:shadow-lift"
    >
      <Icon size={18} className="text-stone-400" aria-hidden />
      <p className="mt-3 font-display text-3xl tabular-nums text-ink">{valor}</p>
      <p className="mt-0.5 text-sm text-stone-500">{rotulo}</p>
    </Link>
  );
}

function Esqueleto() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-10 w-40 animate-pulse rounded-xl bg-stone-100" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-4xl bg-stone-100" />)}
      </div>
      <div className="h-64 animate-pulse rounded-4xl bg-stone-100" />
    </div>
  );
}
