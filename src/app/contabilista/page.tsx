"use client";

// Hoje — o que precisa de atenção agora: pedidos por responder, consultas do
// dia e partilhas por ler. Nada de números decorativos.
//
// A próxima consulta é o que fica maior, e traz consigo a única ação que faz
// sentido a partir daqui: confirmá-la. Confirmar abre uma porta e não fecha
// nenhuma — por isso não pergunta nada. O que fecha portas (cancelar, dar por
// realizada, registar falta) continua a viver na agenda, com a pergunta que
// lhe corresponde.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usarFicha, cabecalhoAuth } from "@/components/contabilistas/usarFicha";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import CabecalhoPainel from "@/components/contabilistas/CabecalhoPainel";
import {
  listarAgendamentos, listarPartilhas, meusClientes,
} from "@/lib/contabilistas/dados";
import type { Agendamento, Partilha, Vinculo } from "@/lib/contabilistas/tipos";
import { horaLocal, rotularDia, diaLocal, tempoAte } from "@/lib/contabilistas/agenda";
import { Calendar, User, PaperClip, Clock, Warning, Check } from "@/components/ui/Icons";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useAvisos } from "@/components/ui/Avisos";

export default function HojePage() {
  const { ficha, aCarregar } = usarFicha();
  const avisos = useAvisos();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [partilhas, setPartilhas] = useState<Partilha[]>([]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const carregar = useCallback(async (userId: string) => {
    const desde = new Date(Date.now() - 12 * 3600_000);
    try {
      const [a, p, v] = await Promise.all([
        listarAgendamentos({ contabilistaId: userId, desde }),
        listarPartilhas({ contabilistaId: userId }),
        meusClientes(userId),
      ]);
      setAgendamentos(a); setPartilhas(p); setVinculos(v);
    } catch (e) { setErro((e as Error).message); }
  }, []);

  useEffect(() => { if (ficha) void carregar(ficha.userId); }, [ficha, carregar]);

  const proximas = useMemo(
    () => agendamentos
      .filter((a) => (a.estado === "pedido" || a.estado === "confirmado") && new Date(a.fim).getTime() >= Date.now())
      .sort((a, b) => a.inicio.localeCompare(b.inicio)),
    [agendamentos],
  );

  const hoje = diaLocal(new Date());
  const deHoje = proximas.filter((a) => diaLocal(new Date(a.inicio)) === hoje);
  const porResponder = vinculos.filter((v) => v.estado === "pendente").length;
  const porLer = partilhas.filter((p) => p.estado === "enviada").length;
  const porConfirmar = proximas.filter((a) => a.estado === "pedido").length;

  async function confirmar(a: Agendamento) {
    if (!ficha) return;
    setOcupado(a.id);
    try {
      const res = await fetch("/api/contabilistas/consulta", {
        method: "PATCH",
        headers: await cabecalhoAuth(),
        body: JSON.stringify({ agendamentoId: a.id, estado: "confirmado" }),
      });
      const corpo = (await res.json()) as { erro?: string };
      if (!res.ok) { avisos.erro(corpo.erro ?? "Não foi possível confirmar."); return; }
      avisos.sucesso("Consulta confirmada.", { detalhe: "O cliente vê a confirmação na área dele." });
      await carregar(ficha.userId);
    } catch { avisos.erro("Falha de rede. Tenta outra vez."); }
    finally { setOcupado(null); }
  }

  if (aCarregar) return <Esqueleto />;
  if (!ficha) return null;

  const seguinte = proximas[0] ?? null;

  return (
    <div className="space-y-6">
      <CabecalhoPainel
        titulo="Hoje"
        descricao={
          deHoje.length === 0
            ? "Não tens consultas marcadas para hoje."
            : `${deHoje.length} ${deHoje.length === 1 ? "consulta hoje" : "consultas hoje"}.`
        }
      />

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

      {/* A seguir — a consulta mais próxima, com a ação que lhe pertence. */}
      {seguinte && (
        <section
          aria-labelledby="seguinte-titulo"
          className="rounded-4xl border border-brand/25 bg-brand-light/40 p-5 sm:p-6"
        >
          <p className="eyebrow">A seguir</p>
          <h2 id="seguinte-titulo" className="mt-1 font-display text-2xl text-ink first-letter:uppercase">
            {rotularDia(diaLocal(new Date(seguinte.inicio)))}
          </h2>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm tabular-nums text-stone-600">
            <Clock size={15} aria-hidden />
            {horaLocal(new Date(seguinte.inicio))} — {horaLocal(new Date(seguinte.fim))}
            <span className="text-stone-300" aria-hidden>·</span>
            {seguinte.modalidade === "online" ? "Online" : "Presencial"}
            <span className="text-stone-300" aria-hidden>·</span>
            <span className="font-medium text-stone-700">{tempoAte(seguinte.inicio)}</span>
          </p>

          {seguinte.assunto && (
            <p className="mt-3 rounded-2xl bg-white/70 px-4 py-3 text-sm leading-relaxed text-stone-700">
              {seguinte.assunto}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {seguinte.estado === "pedido" ? (
              <Button size="sm" disabled={ocupado === seguinte.id} onClick={() => confirmar(seguinte)}>
                <Check size={15} aria-hidden /> Confirmar
              </Button>
            ) : (
              <Badge tone="brand">Confirmada</Badge>
            )}
            <Link href="/contabilista/agenda">
              <Button size="sm" variant="secondary">Abrir a agenda</Button>
            </Link>
          </div>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Numero rotulo="Pedidos de cliente" valor={porResponder} href="/contabilista/clientes" Icon={User} />
        <Numero rotulo="Consultas por confirmar" valor={porConfirmar} href="/contabilista/agenda" Icon={Calendar} />
        <Numero rotulo="Partilhas por ler" valor={porLer} href="/contabilista/partilhas" Icon={PaperClip} />
      </div>

      <section aria-labelledby="proximas-titulo" className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
        <h2 id="proximas-titulo" className="font-display text-xl text-ink">Próximas consultas</h2>
        {proximas.length <= 1 ? (
          <div className="mt-4">
            <EstadoVazio
              Icon={Calendar}
              titulo={seguinte ? "Não há mais nada marcado" : "Nada marcado"}
              descricao={
                seguinte
                  ? "Depois desta, a agenda está livre. Os clientes marcam a partir do teu perfil público."
                  : "Quando um cliente marcar uma consulta, aparece aqui."
              }
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100">
            {proximas.slice(1, 7).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-800 first-letter:uppercase">
                    {rotularDia(diaLocal(new Date(a.inicio)))}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm tabular-nums text-stone-500">
                    <Clock size={14} aria-hidden />
                    {horaLocal(new Date(a.inicio))} — {horaLocal(new Date(a.fim))}
                    <span className="text-stone-300" aria-hidden>·</span>
                    {a.modalidade === "online" ? "Online" : "Presencial"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={a.estado === "confirmado" ? "brand" : "alert"}>
                    {a.estado === "confirmado" ? "Confirmada" : "Por confirmar"}
                  </Badge>
                  {a.estado === "pedido" && (
                    <Button size="sm" variant="ghost" disabled={ocupado === a.id} onClick={() => confirmar(a)}>
                      Confirmar
                    </Button>
                  )}
                </div>
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
  const exigeAtencao = valor > 0;
  return (
    <Link
      href={href}
      className={`rounded-4xl border bg-white p-5 shadow-card transition-shadow hover:shadow-lift ${
        exigeAtencao ? "border-brand/30" : "border-stone-200"
      }`}
    >
      <Icon size={18} className={exigeAtencao ? "text-brand" : "text-stone-300"} aria-hidden />
      <p className={`mt-3 font-display text-3xl tabular-nums ${exigeAtencao ? "text-ink" : "text-stone-300"}`}>
        {valor}
      </p>
      <p className="mt-0.5 text-sm text-stone-500">{rotulo}</p>
    </Link>
  );
}

function Esqueleto() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="h-3 w-28 animate-pulse rounded bg-stone-100" />
        <div className="h-10 w-40 animate-pulse rounded-xl bg-stone-100" />
      </div>
      <div className="h-40 animate-pulse rounded-4xl bg-stone-100" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-4xl bg-stone-100" />)}
      </div>
      <div className="h-64 animate-pulse rounded-4xl bg-stone-100" />
    </div>
  );
}
