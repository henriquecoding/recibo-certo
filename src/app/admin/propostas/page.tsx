"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listarPropostas,
  atualizarEstadoProposta,
  eliminarProposta,
  type PropostaRow,
  type EstadoProposta,
} from "@/lib/supabase/admin";
import {
  Trash,
  Check,
  Close,
  Mail,
  ChevronDown,
  ChevronUp,
  Globe,
  Briefcase,
} from "@/components/ui/Icons";

const ESTADO_META: Record<
  EstadoProposta,
  { label: string; cor: string; texto: string }
> = {
  pendente: {
    label: "Pendente",
    cor: "bg-amber-100 border-amber-200",
    texto: "text-amber-700",
  },
  em_analise: {
    label: "Em análise",
    cor: "bg-blue-100 border-blue-200",
    texto: "text-blue-700",
  },
  contactado: {
    label: "Contactado",
    cor: "bg-violet-100 border-violet-200",
    texto: "text-violet-700",
  },
  aprovado: {
    label: "Aprovado",
    cor: "bg-emerald-100 border-emerald-200",
    texto: "text-emerald-700",
  },
  rejeitado: {
    label: "Rejeitado",
    cor: "bg-stone-100 border-stone-200",
    texto: "text-stone-500",
  },
};

const FILTROS: { valor: EstadoProposta | "todos"; label: string }[] = [
  { valor: "todos", label: "Todas" },
  { valor: "pendente", label: "Pendentes" },
  { valor: "em_analise", label: "Em análise" },
  { valor: "contactado", label: "Contactadas" },
  { valor: "aprovado", label: "Aprovadas" },
  { valor: "rejeitado", label: "Rejeitadas" },
];

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarMontante(min: number | null, max: number | null) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n.toLocaleString("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  if (min && max) return `${fmt(min)} — ${fmt(max)}`;
  if (min) return `A partir de ${fmt(min)}`;
  return `Até ${fmt(max!)}`;
}

export default function AdminPropostas() {
  const [lista, setLista] = useState<PropostaRow[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<EstadoProposta | "todos">("todos");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notasEdit, setNotasEdit] = useState<Record<string, string>>({});

  const carregar = () =>
    listarPropostas()
      .then(setLista)
      .catch((e: Error) => setErro(e.message))
      .finally(() => setCarregado(true));

  useEffect(() => {
    carregar();
  }, []);

  const filtrada = useMemo(
    () =>
      filtro === "todos" ? lista : lista.filter((r) => r.estado === filtro),
    [lista, filtro]
  );

  const contagem = useMemo(() => {
    const base: Record<EstadoProposta, number> = {
      pendente: 0,
      em_analise: 0,
      contactado: 0,
      aprovado: 0,
      rejeitado: 0,
    };
    for (const r of lista) base[r.estado]++;
    return base;
  }, [lista]);

  const mudarEstado = async (id: string, estado: EstadoProposta) => {
    const notas = notasEdit[id];
    const { erro: e } = await atualizarEstadoProposta(id, estado, notas);
    if (e) {
      setErro(e);
      return;
    }
    setLista((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              estado,
              notas_admin: notas ?? r.notas_admin,
              atualizado_em: new Date().toISOString(),
            }
          : r
      )
    );
  };

  const apagar = async (id: string) => {
    const { erro: e } = await eliminarProposta(id);
    if (e) {
      setErro(e);
      return;
    }
    setLista((prev) => prev.filter((r) => r.id !== id));
    setConfirmDelete(null);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <p className="eyebrow mb-1 text-brand">Administração</p>
        <h1 className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">
          Propostas de investidores
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {carregado
            ? `${lista.length} proposta${lista.length !== 1 ? "s" : ""} · ${contagem.pendente} por rever`
            : "A carregar…"}
        </p>
      </header>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const ativo = filtro === f.valor;
          const n =
            f.valor === "todos" ? lista.length : contagem[f.valor];
          return (
            <button
              key={f.valor}
              type="button"
              onClick={() => setFiltro(f.valor)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-all ${
                ativo
                  ? "bg-brand text-white"
                  : "border border-stone-200 bg-white text-stone-600 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              }`}
            >
              {f.label}
              <span
                className={`rounded-full px-1.5 text-[11px] ${
                  ativo
                    ? "bg-white/20"
                    : "bg-stone-100 text-stone-500 dark:bg-stone-700"
                }`}
              >
                {carregado ? n : "—"}
              </span>
            </button>
          );
        })}
      </div>

      {erro && (
        <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {erro}
        </div>
      )}

      {!carregado ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-stone-100 bg-white dark:border-stone-700 dark:bg-stone-800"
            />
          ))}
        </div>
      ) : filtrada.length === 0 ? (
        <div className="rounded-4xl border border-dashed border-stone-200 bg-white py-16 text-center dark:border-stone-700 dark:bg-stone-900">
          <Briefcase
            size={20}
            className="mx-auto mb-2 text-stone-300 dark:text-stone-600"
          />
          <p className="text-sm text-stone-400">
            Sem propostas nesta vista.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtrada.map((r) => {
            const em = ESTADO_META[r.estado];
            const aberto = expandido === r.id;
            const montante = formatarMontante(
              r.montante_minimo,
              r.montante_maximo
            );

            return (
              <li
                key={r.id}
                className="rounded-2xl border border-stone-100 bg-white shadow-card dark:border-stone-700 dark:bg-stone-800/50"
              >
                {/* Cabeçalho */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandido(aberto ? null : r.id)
                  }
                  className="flex w-full items-start gap-3 p-4 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${em.cor} ${em.texto}`}
                      >
                        {em.label}
                      </span>
                      <span className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
                        {r.nome}
                      </span>
                      {r.empresa && (
                        <span className="truncate text-xs text-stone-400">
                          {r.empresa}
                          {r.cargo ? ` · ${r.cargo}` : ""}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-400">
                      <span className="inline-flex items-center gap-1">
                        <Mail size={11} />
                        {r.email}
                      </span>
                      {r.telefone && <span>{r.telefone}</span>}
                      {montante && (
                        <span className="font-semibold text-brand">
                          {montante}
                        </span>
                      )}
                      <span className="tabular-nums">
                        {formatarData(r.submetido_em)}
                      </span>
                    </div>
                  </div>
                  <span className="mt-1 shrink-0 text-stone-300">
                    {aberto ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </span>
                </button>

                {/* Detalhes expandidos */}
                {aberto && (
                  <div className="border-t border-stone-100 px-4 pb-4 pt-3 dark:border-stone-700">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Campo
                        label="Interesse"
                        valor={r.interesse}
                      />
                      <Campo
                        label="Horizonte"
                        valor={r.horizonte}
                      />
                      <Campo
                        label="Experiência"
                        valor={r.experiencia_investimento}
                      />
                      <Campo
                        label="Setores"
                        valor={r.setores_interesse}
                      />
                      <Campo
                        label="Como conheceu"
                        valor={r.como_conheceu}
                      />
                      {r.website && (
                        <Campo
                          label="Website"
                          valor={r.website}
                          link
                        />
                      )}
                      {r.linkedin && (
                        <Campo
                          label="LinkedIn"
                          valor={r.linkedin}
                          link
                        />
                      )}
                    </div>
                    {r.mensagem && (
                      <div className="mt-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                          Mensagem
                        </div>
                        <p className="mt-1 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600 dark:bg-stone-700/50 dark:text-stone-300">
                          {r.mensagem}
                        </p>
                      </div>
                    )}

                    {/* Notas admin */}
                    <div className="mt-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                        Notas internas
                      </div>
                      <textarea
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 placeholder:text-stone-300 focus:border-brand focus:ring-1 focus:ring-brand dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
                        placeholder="Adicionar notas sobre esta proposta…"
                        value={
                          notasEdit[r.id] ?? r.notas_admin ?? ""
                        }
                        onChange={(e) =>
                          setNotasEdit((prev) => ({
                            ...prev,
                            [r.id]: e.target.value,
                          }))
                        }
                      />
                    </div>

                    {/* Ações */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {r.estado !== "em_analise" && (
                        <AcaoBtn
                          onClick={() =>
                            mudarEstado(r.id, "em_analise")
                          }
                          label="Em análise"
                        />
                      )}
                      {r.estado !== "contactado" && (
                        <AcaoBtn
                          onClick={() =>
                            mudarEstado(r.id, "contactado")
                          }
                          label="Contactado"
                          icon={<Mail size={12} />}
                        />
                      )}
                      {r.estado !== "aprovado" && (
                        <AcaoBtn
                          onClick={() =>
                            mudarEstado(r.id, "aprovado")
                          }
                          label="Aprovar"
                          icon={<Check size={12} />}
                          cor="emerald"
                        />
                      )}
                      {r.estado !== "rejeitado" && (
                        <AcaoBtn
                          onClick={() =>
                            mudarEstado(r.id, "rejeitado")
                          }
                          label="Rejeitar"
                          icon={<Close size={12} />}
                        />
                      )}
                      {r.estado !== "pendente" && (
                        <AcaoBtn
                          onClick={() =>
                            mudarEstado(r.id, "pendente")
                          }
                          label="Reabrir"
                        />
                      )}

                      {/* Link email direto */}
                      <a
                        href={`mailto:${r.email}?subject=${encodeURIComponent("ReciboCerto — Proposta de investimento")}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300"
                      >
                        <Mail size={12} />
                        Enviar email
                      </a>

                      <div className="ml-auto">
                        {confirmDelete === r.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => apagar(r.id)}
                              className="rounded-lg bg-red-500 px-2 py-1 text-xs font-semibold text-white hover:bg-red-600"
                            >
                              Apagar
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDelete(null)
                              }
                              className="rounded-lg px-2 py-1 text-xs text-stone-400 hover:text-stone-600"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            aria-label="Eliminar proposta"
                            onClick={() =>
                              setConfirmDelete(r.id)
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-300 transition-all hover:bg-red-50 hover:text-red-400"
                          >
                            <Trash size={14} />
                          </button>
                        )}
                      </div>
                    </div>
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

function Campo({
  label,
  valor,
  link,
}: {
  label: string;
  valor: string | null;
  link?: boolean;
}) {
  if (!valor) return null;
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
        {label}
      </div>
      {link ? (
        <a
          href={valor.startsWith("http") ? valor : `https://${valor}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 inline-flex items-center gap-1 text-sm text-brand hover:underline"
        >
          <Globe size={12} />
          {valor}
        </a>
      ) : (
        <p className="mt-0.5 text-sm text-stone-700 dark:text-stone-200">
          {valor}
        </p>
      )}
    </div>
  );
}

function AcaoBtn({
  onClick,
  label,
  icon,
  cor,
}: {
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  cor?: "emerald";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
        cor === "emerald"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
