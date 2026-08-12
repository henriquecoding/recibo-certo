"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ADMINISTRAÇÃO · CONTAS
//  ---------------------------------------------------------------------
//  Lista, pesquisa, filtro por papel e detalhe de cada conta, com promoção
//  e despromoção.
//
//  O QUE ESTA PÁGINA NÃO MOSTRA, DE PROPÓSITO: conteúdo fiscal. Mostra
//  CONTAGENS — quantos recibos, quantos cenários — porque isso serve para
//  dar apoio. O conteúdo em si deixou de ser alcançável pela administração
//  na migração 038, e é o que sustenta a promessa de que só o dono acede
//  aos seus dados. Uma página de gestão de contas não precisa de ler o
//  salário de ninguém.
//
//  A guarda desta rota é dupla: o `AdminGuard` do layout trata do ecrã, e
//  a API valida o token e o papel do lado do servidor — porque quem chama
//  a API não passa pelo ecrã.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/auth";
import {
  Search, ShieldCheck, Check, Warning, Spinner, ArrowLeft, User, Sparkle,
} from "@/components/ui/Icons";
import type { ContaAdmin, AtoDeAdmin } from "@/app/api/admin/contas/route";

type Filtro = "todas" | "admin" | "user" | "plus";

// Num registo de auditoria, a hora conta tanto como o dia: «foi a 12 de
// agosto» não distingue dois atos da mesma tarde.
const dataHoraPT = (iso: string) =>
  new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));

const dataPT = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" })
        .format(new Date(iso))
    : "—";

// O registo cobre dois tipos de ato: os da própria secção de contas, escritos
// pela rota com o antes e o depois, e os do resto do painel, escritos por um
// gatilho da base de dados (migração 041) na forma `operacao:tabela`.
const OPERACAO: Record<string, string> = {
  insert: "criou",
  update: "alterou",
  delete: "apagou",
};
const TABELA: Record<string, string> = {
  site_feedback: "um reporte de feedback",
  quiz_question_reports: "um reporte do Quiz",
  email_waitlist: "um email da lista de espera",
  propostas_investidores: "uma proposta de investidor",
  admin_partners: "um parceiro",
  anuncios: "um anúncio",
  partner_placements: "uma superfície de parceiro",
  partner_creatives: "um criativo de parceiro",
};

function descreverAto(a: AtoDeAdmin): string {
  if (a.acao === "promover_admin") return "promoveu a administração";
  if (a.acao === "despromover_admin") return "removeu a administração de";
  const [op, tabela] = a.acao.split(":");
  if (op && tabela) {
    return `${OPERACAO[op] ?? op} ${TABELA[tabela] ?? tabela}`;
  }
  return a.acao;
}

export default function ContasPage() {
  const { user } = useAuth();
  const [contas, setContas] = useState<ContaAdmin[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [registo, setRegisto] = useState<AtoDeAdmin[]>([]);
  const [aberta, setAberta] = useState<string | null>(null);
  const [aGuardar, setAGuardar] = useState<string | null>(null);

  const token = useCallback(async () => {
    const { data } = await getSupabase().auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const carregar = useCallback(async () => {
    setErro(null);
    const t = await token();
    if (!t) { setErro("Sessão expirada."); return; }
    const res = await fetch("/api/admin/contas", { headers: { Authorization: `Bearer ${t}` } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setErro(json?.erro ?? "Falha ao carregar."); return; }
    setContas(json.contas as ContaAdmin[]);
    setRegisto((json.registo ?? []) as AtoDeAdmin[]);
  }, [token]);

  useEffect(() => { void carregar(); }, [carregar]);

  const mudarPapel = useCallback(
    async (id: string, role: "admin" | "user") => {
      setAGuardar(id);
      setErro(null);
      try {
        const t = await token();
        const res = await fetch("/api/admin/contas", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
          body: JSON.stringify({ id, role }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) { setErro(json?.erro ?? "Não foi possível alterar."); return; }
        await carregar();
      } finally {
        setAGuardar(null);
      }
    },
    [token, carregar],
  );

  const visiveis = useMemo(() => {
    if (!contas) return [];
    const termo = q.trim().toLowerCase();
    return contas.filter((c) => {
      if (filtro === "admin" && c.role !== "admin") return false;
      if (filtro === "user" && c.role !== "user") return false;
      if (filtro === "plus" && c.plano !== "plus") return false;
      if (!termo) return true;
      return (
        c.email.toLowerCase().includes(termo) ||
        (c.nome ?? "").toLowerCase().includes(termo)
      );
    });
  }, [contas, q, filtro]);

  const detalhe = contas?.find((c) => c.id === aberta) ?? null;

  /* ── Detalhe ────────────────────────────────────────────────────── */
  if (detalhe) {
    const eu = detalhe.id === user?.id;
    return (
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => setAberta(null)}
          className="mb-5 inline-flex min-h-9 items-center gap-2 text-sm text-stone-400 transition-colors hover:text-stone-700 dark:hover:text-stone-200"
        >
          <ArrowLeft size={14} /> Voltar às contas
        </button>

        <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
          <div className="flex flex-wrap items-start gap-4">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-brand text-xl font-bold uppercase text-white">
              {(detalhe.nome ?? detalhe.email).charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100">
                {detalhe.nome ?? detalhe.email.split("@")[0]}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Etiqueta role={detalhe.role} />
                {detalhe.plano === "plus" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-dark dark:bg-brand/15 dark:text-brand">
                    <Sparkle size={10} /> Plus{detalhe.origemPlus ? ` · ${detalhe.origemPlus}` : ""}
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 break-all text-sm text-stone-500 dark:text-stone-400">{detalhe.email}</p>
            </div>

            {eu ? (
              <span className="rounded-xl bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                É a tua conta
              </span>
            ) : (
              <button
                type="button"
                disabled={aGuardar === detalhe.id}
                onClick={() => mudarPapel(detalhe.id, detalhe.role === "admin" ? "user" : "admin")}
                className={`inline-flex min-h-10 flex-shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  detalhe.role === "admin"
                    ? "border border-clay-border bg-white text-clay-text hover:bg-clay-bg dark:bg-stone-900"
                    : "bg-brand text-white hover:bg-brand-dark"
                }`}
              >
                {aGuardar === detalhe.id ? <Spinner size={14} /> : <ShieldCheck size={14} />}
                {detalhe.role === "admin" ? "Remover administração" : "Promover a admin"}
              </button>
            )}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-stone-100 pt-5 text-sm dark:border-stone-800 sm:grid-cols-3">
            <Facto rotulo="Juntou-se em" valor={dataPT(detalhe.criadoEm)} />
            <Facto rotulo="Último acesso" valor={dataPT(detalhe.ultimoAcesso)} />
            <Facto
              rotulo="Email"
              valor={detalhe.emailConfirmado ? "Confirmado" : "Por confirmar"}
              tom={detalhe.emailConfirmado ? "ok" : "aviso"}
            />
          </dl>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Bloco n={detalhe.totais.recibos} rotulo="Recibos verdes" />
          <Bloco n={detalhe.totais.vencimentos} rotulo="Vencimentos" />
          <Bloco n={detalhe.totais.cenarios} rotulo="Cenários" />
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-stone-50 px-4 py-3 text-xs leading-relaxed text-stone-500 dark:bg-stone-800/60 dark:text-stone-400">
          <ShieldCheck size={13} className="mt-0.5 flex-shrink-0" />
          Só contagens. O conteúdo destes registos não é acessível à administração — a página de
          privacidade promete que só o dono lá chega, e as políticas da base de dados aplicam-no.
        </p>
      </div>
    );
  }

  /* ── Lista ──────────────────────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">Contas</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Quem tem conta, em que plano está e quem administra.
        </p>
      </header>

      {erro ? (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-2xl bg-alert-bg px-4 py-3 text-sm text-alert-text">
          <Warning size={14} className="mt-0.5 flex-shrink-0" /> {erro}
        </p>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <label htmlFor="busca-contas" className="sr-only">Pesquisar contas</label>
          <input
            id="busca-contas"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar por nome ou email…"
            className="w-full rounded-2xl border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
        </div>
        <label htmlFor="filtro-contas" className="sr-only">Filtrar por tipo</label>
        <select
          id="filtro-contas"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as Filtro)}
          className="rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-stone-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 sm:w-52"
        >
          <option value="todas">Todas</option>
          <option value="admin">Administração</option>
          <option value="user">Membros</option>
          <option value="plus">Com Plus</option>
        </select>
      </div>

      <p aria-live="polite" className="mb-3 text-xs text-stone-400">
        {contas === null ? "A carregar…" : `${visiveis.length} ${visiveis.length === 1 ? "conta" : "contas"}`}
      </p>

      {contas === null ? (
        <div className="h-64 animate-pulse rounded-4xl border border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900" />
      ) : visiveis.length === 0 ? (
        <div className="rounded-4xl border border-dashed border-stone-200 bg-white p-10 text-center dark:border-stone-700 dark:bg-stone-900">
          <p className="text-sm text-stone-500 dark:text-stone-400">Nenhuma conta corresponde a esta procura.</p>
        </div>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-4xl border border-stone-100 bg-white shadow-card dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
          {visiveis.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setAberta(c.id)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand dark:hover:bg-stone-800/60 sm:px-5"
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-sm font-bold uppercase text-brand-dark dark:bg-brand/15 dark:text-brand">
                  {(c.nome ?? c.email).charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
                    {c.nome ?? c.email.split("@")[0]}
                  </span>
                  <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{c.email}</span>
                </span>
                {c.plano === "plus" ? (
                  <span className="hidden flex-shrink-0 rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold uppercase text-brand-dark dark:bg-brand/15 dark:text-brand sm:inline">
                    Plus
                  </span>
                ) : null}
                <Etiqueta role={c.role} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
          Registo de administração
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Todos os atos de administração: mudanças de papel, e o que foi criado,
          alterado ou apagado no painel. Guarda quem, o quê e quando — nunca o
          conteúdo das linhas. Escrito pela base de dados e não editável por
          ninguém, nem por quem administra.
        </p>

        {registo.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-stone-200 px-4 py-5 text-center text-sm text-stone-400 dark:border-stone-700">
            Ainda não há atos registados.
          </p>
        ) : (
          <ol className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-4xl border border-stone-100 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
            {registo.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-3 text-sm sm:px-5">
                <span className="font-semibold text-stone-700 dark:text-stone-200">
                  {a.ator_email ?? "conta apagada"}
                </span>
                <span className="text-stone-500 dark:text-stone-400">{descreverAto(a)}</span>
                {a.alvo_email ? (
                  <span className="font-semibold text-stone-700 dark:text-stone-200">{a.alvo_email}</span>
                ) : null}
                <time dateTime={a.criado_em} className="ml-auto flex-shrink-0 tabular-nums text-xs text-stone-400">
                  {dataHoraPT(a.criado_em)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Etiqueta({ role }: { role: "admin" | "user" }) {
  return role === "admin" ? (
    <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-clay-border bg-clay-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-clay-text">
      <ShieldCheck size={10} /> Administração
    </span>
  ) : (
    <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-stone-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-stone-500 dark:border-stone-700 dark:text-stone-400">
      <User size={10} /> Membro
    </span>
  );
}

function Facto({ rotulo, valor, tom }: { rotulo: string; valor: string; tom?: "ok" | "aviso" }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">{rotulo}</dt>
      <dd className={`mt-0.5 flex items-center gap-1 text-sm ${tom === "aviso" ? "text-alert-text" : "text-stone-700 dark:text-stone-300"}`}>
        {tom === "ok" ? <Check size={12} className="text-brand" /> : null}
        {tom === "aviso" ? <Warning size={12} /> : null}
        {valor}
      </dd>
    </div>
  );
}

function Bloco({ n, rotulo }: { n: number; rotulo: string }) {
  return (
    <div className="rounded-3xl border border-stone-100 bg-white p-4 text-center shadow-card dark:border-stone-800 dark:bg-stone-900">
      <div className="font-display text-2xl font-semibold tabular-nums text-ink">{n}</div>
      <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-stone-400">{rotulo}</div>
    </div>
  );
}
