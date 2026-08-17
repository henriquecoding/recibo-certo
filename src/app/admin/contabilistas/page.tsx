"use client";

// ═══════════════════════════════════════════════════════════════════════
//  Fila de candidaturas a conta de contabilista
//  ---------------------------------------------------------------------
//  Aprovar é o que CRIA a conta. Não há política de INSERT em
//  `contabilistas`: a linha nasce na rota de API, com a chave de serviço,
//  depois de o token de administração ser validado — e cada decisão fica
//  em `admin_auditoria`.
//
//  Recusar e suspender exigem motivo. Uma recusa sem explicação deixa a
//  pessoa sem saber o que corrigir, e ela pode voltar a candidatar-se.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useAvisos } from "@/components/ui/Avisos";
import { useConfirmar, type PedidoConfirmacao } from "@/components/ui/Confirmar";
import { BASE_DEMONSTRACAO } from "@/lib/contabilistas/demonstracao/rotas";
import {
  Check, Close, Eye, Lock, Mail, PaperClip, Warning, ChevronDown, ChevronUp, ShieldCheck,
} from "@/components/ui/Icons";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";

interface PedidoRow {
  id: string; user_id: string; nome: string; email_contacto: string;
  telefone: string | null; mensagem: string; credenciais: string | null;
  documentos: string[]; estado: string; motivo_decisao: string | null;
  criado_em: string; decidido_em: string | null;
}
interface ContaRow {
  user_id: string; slug: string; nome: string; estado: string; criado_em: string;
}

const TOM: Record<string, "brand" | "alert" | "neutral" | "danger"> = {
  pendente: "alert", em_analise: "alert", aprovado: "brand", recusado: "neutral",
  suspenso: "danger",
};

export default function AdminContabilistasPage() {
  const avisos = useAvisos();
  const confirmar = useConfirmar();
  const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
  const [contas, setContas] = useState<ContaRow[]>([]);
  const [aLer, setALer] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cabecalho = useCallback(async (): Promise<Record<string, string>> => {
    const { data } = await getSupabase().auth.getSession();
    const token = data.session?.access_token;
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, []);

  const carregar = useCallback(async () => {
    setALer(true); setErro(null);
    try {
      const res = await fetch("/api/admin/contabilistas", { headers: await cabecalho() });
      const corpo = (await res.json()) as { erro?: string; pedidos?: PedidoRow[]; contas?: ContaRow[] };
      if (!res.ok) { setErro(corpo.erro ?? "Não foi possível carregar."); return; }
      setPedidos(corpo.pedidos ?? []); setContas(corpo.contas ?? []);
    } catch { setErro("Falha de rede."); }
    finally { setALer(false); }
  }, [cabecalho]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function decidir(
    corpo: Record<string, unknown>,
    chave: string,
    opcoes: { pergunta?: PedidoConfirmacao; feito: string },
  ) {
    if (opcoes.pergunta && !(await confirmar(opcoes.pergunta))) return;

    setOcupado(chave); setErro(null);
    try {
      const res = await fetch("/api/admin/contabilistas", {
        method: "PATCH", headers: await cabecalho(), body: JSON.stringify(corpo),
      });
      const r = (await res.json()) as { erro?: string };
      if (!res.ok) { avisos.erro(r.erro ?? "Não foi possível concluir."); return; }
      avisos.sucesso(opcoes.feito);
      await carregar();
    } catch { avisos.erro("Falha de rede."); }
    finally { setOcupado(null); }
  }

  async function verDocumento(caminho: string) {
    const { data, error } = await getSupabase()
      .storage.from("contabilista-documentos").createSignedUrl(caminho, 300);
    if (error || !data) { avisos.erro("Não foi possível abrir o documento."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const abertos = pedidos.filter((p) => p.estado === "pendente" || p.estado === "em_analise");
  const decididos = pedidos.filter((p) => p.estado === "aprovado" || p.estado === "recusado");

  return (
    <div className="space-y-6">
      <CabecalhoAdmin
        titulo="Contabilistas"
        descricao="Só a administração aprova quem entra no painel de gestão. Aprovar cria a conta; recusar e suspender exigem motivo, e ficam registados na auditoria."
      />

      {/* Ver o painel do outro lado sem ser preciso a conta de ninguém.
          A fronteira da migração 038 mantém-se de pé: isto não abre o painel
          de um contabilista real — abre o mesmo painel com dados inventados. */}
      <Link
        href={BASE_DEMONSTRACAO}
        className="group flex items-start gap-3.5 rounded-4xl border border-brand/25 bg-brand-light/40 p-5 transition-shadow hover:shadow-lift dark:border-brand/30 dark:bg-brand/10"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-brand-dark dark:bg-stone-950/60 dark:text-brand-mint">
          <Eye size={19} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-stone-800 transition-colors group-hover:text-brand-dark dark:text-stone-100">
            Abrir o painel de gestão em demonstração
          </span>
          <span className="mt-0.5 block text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            Os mesmos ecrãs, as mesmas regras e as mesmas mensagens que o contabilista vê —
            com um consultório inventado. Não mostra dados de ninguém.
          </span>
        </span>
      </Link>

      {erro && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-clay-bg px-4 py-3 text-sm text-clay-text">
          <Warning size={16} className="mt-0.5 shrink-0" aria-hidden /> {erro}
        </p>
      )}

      {aLer ? (
        <div className="h-64 animate-pulse rounded-4xl bg-stone-100" aria-busy="true" />
      ) : (
        <>
          <section aria-labelledby="abertos-titulo">
            <h2 id="abertos-titulo" className="font-display text-xl text-ink">
              Por decidir ({abertos.length})
            </h2>
            {abertos.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-400">
                Nada à espera.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {abertos.map((p) => {
                  const expandido = aberto === p.id;
                  return (
                    <li key={p.id} className="rounded-4xl border border-stone-200 bg-white shadow-card">
                      <button
                        type="button"
                        onClick={() => setAberto(expandido ? null : p.id)}
                        aria-expanded={expandido}
                        className="flex w-full items-center justify-between gap-3 p-4 text-left sm:p-5"
                      >
                        <span className="min-w-0">
                          <span className="block font-semibold text-stone-800">{p.nome}</span>
                          <span className="mt-0.5 block truncate text-sm text-stone-500">
                            {p.email_contacto} ·{" "}
                            {new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(new Date(p.criado_em))}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <Badge tone={TOM[p.estado] ?? "neutral"}>
                            {p.estado === "em_analise" ? "Em análise" : "Pendente"}
                          </Badge>
                          {expandido ? <ChevronUp size={18} className="text-stone-400" aria-hidden /> : <ChevronDown size={18} className="text-stone-400" aria-hidden />}
                        </span>
                      </button>

                      {expandido && (
                        <div className="space-y-4 border-t border-stone-100 p-4 sm:p-5">
                          <div>
                            <h3 className="text-xs font-medium uppercase tracking-wide text-stone-400">Justificação</h3>
                            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-stone-700">{p.mensagem}</p>
                          </div>

                          {p.credenciais && (
                            <div>
                              <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-stone-400">
                                <Lock size={12} aria-hidden /> Credenciais protegidas
                              </h3>
                              <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-cream px-4 py-3 font-mono text-sm text-stone-800">
                                {p.credenciais}
                              </pre>
                            </div>
                          )}

                          {p.documentos.length > 0 && (
                            <div>
                              <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-stone-400">
                                <PaperClip size={12} aria-hidden /> Documentos ({p.documentos.length})
                              </h3>
                              <ul className="mt-2 space-y-1.5">
                                {p.documentos.map((d) => (
                                  <li key={d}>
                                    <button
                                      type="button"
                                      onClick={() => void verDocumento(d)}
                                      className="w-full truncate rounded-xl bg-cream px-3.5 py-2 text-left text-sm text-stone-700 underline underline-offset-2 hover:bg-stone-100"
                                    >
                                      {d.split("/").pop()}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {p.telefone && (
                            <p className="flex items-center gap-1.5 text-sm text-stone-600">
                              <Mail size={14} className="text-stone-400" aria-hidden /> {p.telefone}
                            </p>
                          )}

                          <label className="block">
                            <span className="text-sm font-medium text-stone-600">
                              Motivo (obrigatório para recusar)
                            </span>
                            <textarea
                              value={motivos[p.id] ?? ""}
                              onChange={(e) => setMotivos((m) => ({ ...m, [p.id]: e.target.value }))}
                              rows={2}
                              className="mt-1.5 w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                              placeholder="O que falta, ou porque não avança."
                            />
                          </label>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              disabled={ocupado === p.id}
                              onClick={() =>
                                decidir({ pedidoId: p.id, decisao: "aprovar", motivo: motivos[p.id] }, p.id, {
                                  feito: `${p.nome} passou a ter conta de contabilista.`,
                                  pergunta: {
                                    titulo: `Aprovar ${p.nome}?`,
                                    descricao: "Aprovar cria a conta e abre o painel de gestão a esta pessoa.",
                                    consequencias: [
                                      "Passa a poder receber clientes, marcar consultas e emitir cupões.",
                                      "Não ganha acesso aos dados fiscais de ninguém — só ao que cada cliente lhe enviar.",
                                      "A decisão fica na auditoria, com quem a tomou.",
                                    ],
                                    confirmar: "Aprovar e criar conta",
                                  },
                                })
                              }
                            >
                              <Check size={15} aria-hidden /> Aprovar e criar conta
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={ocupado === p.id}
                              onClick={() => {
                                // A recusa sem motivo é rejeitada pelo servidor. Dizê-lo
                                // aqui poupa uma ida ao servidor para ouvir «falta o motivo».
                                if ((motivos[p.id] ?? "").trim().length < 5) {
                                  avisos.erro("Escreve o motivo antes de recusar.", {
                                    detalhe: "É o que a pessoa vai ler para saber o que corrigir.",
                                  });
                                  return;
                                }
                                void decidir({ pedidoId: p.id, decisao: "recusar", motivo: motivos[p.id] }, p.id, {
                                  feito: "Candidatura recusada.",
                                  pergunta: {
                                    titulo: `Recusar a candidatura de ${p.nome}?`,
                                    descricao: "A pessoa recebe o motivo que escreveste e pode corrigir e voltar a candidatar-se.",
                                    confirmar: "Recusar candidatura",
                                    tom: "perigo",
                                  },
                                });
                              }}
                            >
                              <Close size={15} aria-hidden /> Recusar
                            </Button>
                            {p.estado === "pendente" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={ocupado === p.id}
                                onClick={() =>
                                  decidir({ pedidoId: p.id, decisao: "em_analise" }, p.id, {
                                    feito: "Candidatura marcada como em análise.",
                                  })
                                }
                              >
                                Marcar em análise
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="contas-titulo">
            <h2 id="contas-titulo" className="font-display text-xl text-ink">
              Contas ({contas.length})
            </h2>
            {contas.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-400">
                Ainda não há contas de contabilista.
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {contas.map((c) => (
                  <li key={c.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-semibold text-stone-800">
                        {c.estado === "aprovado" && <ShieldCheck size={15} className="text-brand" aria-hidden />}
                        {c.nome}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-stone-400">/contabilistas/{c.slug}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={TOM[c.estado] ?? "neutral"}>{c.estado}</Badge>
                      {c.estado === "aprovado" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={ocupado === c.user_id}
                          onClick={() => {
                            const motivo = motivos[c.user_id] ?? "";
                            if (motivo.trim().length < 5) {
                              avisos.erro("Escreve o motivo da suspensão no campo desta conta.");
                              setMotivos((m) => ({ ...m, [c.user_id]: motivo }));
                              return;
                            }
                            void decidir({ userId: c.user_id, decisao: "suspender", motivo }, c.user_id, {
                              feito: `${c.nome} ficou suspenso.`,
                              pergunta: {
                                titulo: `Suspender ${c.nome}?`,
                                descricao: "O painel de gestão fecha-se imediatamente para esta pessoa.",
                                consequencias: [
                                  "O perfil sai do diretório e ninguém lhe pode marcar consulta.",
                                  "Os clientes atuais mantêm o que já lhe enviaram.",
                                  "Podes reativar a conta a qualquer momento.",
                                ],
                                confirmar: "Suspender conta",
                                tom: "perigo",
                              },
                            });
                          }}
                        >
                          Suspender
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={ocupado === c.user_id}
                          onClick={() =>
                            decidir({ userId: c.user_id, decisao: "reativar" }, c.user_id, {
                              feito: `${c.nome} voltou a ter acesso ao painel.`,
                            })
                          }
                        >
                          Reativar
                        </Button>
                      )}
                    </div>
                    {c.estado === "aprovado" && (
                      <label className="w-full">
                        <span className="sr-only">Motivo da suspensão de {c.nome}</span>
                        <input
                          value={motivos[c.user_id] ?? ""}
                          onChange={(e) => setMotivos((m) => ({ ...m, [c.user_id]: e.target.value }))}
                          placeholder="Motivo, caso vás suspender"
                          className="min-h-[2.25rem] w-full rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                        />
                      </label>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {decididos.length > 0 && (
            <p className="text-sm text-stone-400">
              {decididos.length} {decididos.length === 1 ? "candidatura já decidida" : "candidaturas já decididas"}.
              O histórico completo está na auditoria.
            </p>
          )}
        </>
      )}
    </div>
  );
}
