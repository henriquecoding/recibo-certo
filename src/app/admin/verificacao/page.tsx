"use client";

// ═══════════════════════════════════════════════════════════════════════
//  CONSOLA DE VERIFICAÇÃO NA ORDEM
//  ---------------------------------------------------------------------
//  Aqui não há botão «marcar como verificado», e a ausência dele é o
//  desenho todo. Para confirmar é preciso escrever o que se leu no registo
//  público da Ordem — nome, número, exercício de profissão — e a consola
//  compara com a ficha antes de deixar avançar.
//
//  Parece burocracia. É o contrário: é o que faz o selo valer alguma
//  coisa. Um botão que carimba sem evidência transforma «verificado» na
//  opinião de quem estava de serviço nesse dia, e é isso que os clientes
//  do outro lado estão a ler como garantia.
//
//  O registo da Ordem está protegido por reCAPTCHA — é uma consulta
//  humana, e não uma API. Esta consola não tenta contorná-lo: leva a
//  pessoa lá, e recolhe o que ela viu.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useAvisos } from "@/components/ui/Avisos";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";
import {
  Check, ChevronDown, ChevronUp, Clock, ExternalLink, ShieldCheck, Warning,
} from "@/components/ui/Icons";
import {
  PASSOS_DA_CONSULTA, REGISTO_PUBLICO, compararComRegisto,
  type EstadoVerificacao,
} from "@/lib/contabilistas/verificacao";

interface LinhaFila {
  userId: string;
  nome: string;
  slug: string;
  occ: string | null;
  pedidoEm: string | null;
  estado: EstadoVerificacao;
  rotulo: string;
  metodo: string | null;
  diasAteCaducar: number | null;
  aExpirar: boolean;
}

const TOM: Record<EstadoVerificacao, "brand" | "alert" | "neutral" | "danger"> = {
  sem_numero: "neutral", informado: "neutral", em_analise: "alert",
  verificado: "brand", a_reconfirmar: "alert", recusado: "danger",
};

/** A ordem por que a fila se trabalha: quem espera primeiro, quem cai a seguir. */
const PRIORIDADE: Record<EstadoVerificacao, number> = {
  em_analise: 0, a_reconfirmar: 1, informado: 2, recusado: 3,
  verificado: 4, sem_numero: 5,
};

export default function AdminVerificacaoPage() {
  const avisos = useAvisos();
  const [fila, setFila] = useState<LinhaFila[]>([]);
  const [aLer, setALer] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cabecalho = useCallback(async (): Promise<Record<string, string>> => {
    const { data } = await getSupabase().auth.getSession();
    const token = data.session?.access_token;
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, []);

  const carregar = useCallback(async () => {
    setALer(true);
    setErro(null);
    try {
      const r = await fetch("/api/admin/verificacao", { headers: await cabecalho() });
      const j = (await r.json()) as { fila?: LinhaFila[]; erro?: string };
      if (!r.ok) { setErro(j.erro ?? "Não foi possível carregar a fila."); setFila([]); }
      else setFila(j.fila ?? []);
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setALer(false);
    }
  }, [cabecalho]);

  useEffect(() => { void carregar(); }, [carregar]);

  const ordenada = useMemo(
    () => [...fila].sort((a, b) => PRIORIDADE[a.estado] - PRIORIDADE[b.estado]),
    [fila]
  );
  const porTratar = ordenada.filter((l) => PRIORIDADE[l.estado] <= 2).length;

  async function decidir(userId: string, corpo: Record<string, unknown>) {
    setOcupado(userId);
    try {
      const r = await fetch("/api/admin/verificacao", {
        method: "PATCH",
        headers: await cabecalho(),
        body: JSON.stringify({ userId, ...corpo }),
      });
      const j = (await r.json()) as { erro?: string; ok?: boolean };
      if (!r.ok || !j.ok) {
        avisos.erro("Não foi possível registar a decisão.", { detalhe: j.erro });
        return;
      }
      avisos.sucesso(
        corpo.decisao === "confirmar" ? "Inscrição confirmada." : "Verificação recusada."
      );
      setAberto(null);
      await carregar();
    } finally {
      setOcupado(null);
    }
  }

  return (
    <>
      <CabecalhoAdmin
        titulo="Verificação na Ordem"
        descricao={
          aLer
            ? "A carregar a fila…"
            : porTratar === 0
              ? "Nada por confirmar de momento."
              : `${porTratar} ${porTratar === 1 ? "ficha" : "fichas"} à espera de confirmação ou renovação.`
        }
        acao={
          <a
            href={REGISTO_PUBLICO.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-dark underline underline-offset-2"
          >
            Abrir o registo público <ExternalLink size={14} aria-hidden />
          </a>
        }
      />

      <section className="mb-6 rounded-3xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Como se confirma</h2>
        <ol className="mt-2 space-y-1.5">
          {PASSOS_DA_CONSULTA.map((passo, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-stone-600">
              <span
                aria-hidden
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold tabular-nums text-stone-500"
              >
                {i + 1}
              </span>
              {passo}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs leading-relaxed text-stone-500">
          {REGISTO_PUBLICO.baseLegal}. A pesquisa da Ordem está protegida por
          reCAPTCHA: é uma consulta humana, e não há forma legítima de a
          automatizar. A confirmação automática virá do SCAP, quando houver
          protocolo com a AMA.
        </p>
      </section>

      {erro && (
        <p className="mb-4 rounded-2xl bg-clay-bg px-4 py-3 text-sm text-clay-text">{erro}</p>
      )}

      {aLer ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-3xl bg-stone-100" />
          ))}
        </div>
      ) : ordenada.length === 0 ? (
        <p className="rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
          Nenhuma conta aprovada tem número de inscrição na ficha.
        </p>
      ) : (
        <ul className="space-y-3">
          {ordenada.map((l) => (
            <li key={l.userId} className="rounded-3xl border border-stone-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{l.nome}</span>
                    <Badge tone={TOM[l.estado]}>{l.rotulo}</Badge>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
                    <span className="tabular-nums">OCC n.º {l.occ}</span>
                    <Link
                      href={`/contabilistas/${l.slug}`}
                      target="_blank"
                      className="underline underline-offset-2"
                    >
                      ver perfil
                    </Link>
                    {l.diasAteCaducar !== null && l.estado === "verificado" && (
                      <span className={`inline-flex items-center gap-1 ${l.aExpirar ? "text-alert-text" : ""}`}>
                        <Clock size={13} aria-hidden />
                        {l.diasAteCaducar} dias
                      </span>
                    )}
                    {l.pedidoEm && l.estado === "em_analise" && (
                      <span>pediu a {new Date(l.pedidoEm).toLocaleDateString("pt-PT")}</span>
                    )}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAberto(aberto === l.userId ? null : l.userId)}
                  aria-expanded={aberto === l.userId}
                >
                  {aberto === l.userId ? "Fechar" : "Confirmar"}
                  {aberto === l.userId
                    ? <ChevronUp size={14} className="ml-1.5" aria-hidden />
                    : <ChevronDown size={14} className="ml-1.5" aria-hidden />}
                </Button>
              </div>

              {aberto === l.userId && (
                <FormularioConfirmacao
                  linha={l}
                  ocupado={ocupado === l.userId}
                  aoDecidir={(corpo) => decidir(l.userId, corpo)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * O formulário de confirmação.
 *
 * A comparação corre a cada tecla e é a mesma função que o servidor volta
 * a correr antes de gravar. Mostrar aqui o que vai acontecer poupa o
 * pedido recusado — e ver PORQUE não bate é o que permite corrigir em vez
 * de desistir.
 */
function FormularioConfirmacao({
  linha, ocupado, aoDecidir,
}: {
  linha: LinhaFila;
  ocupado: boolean;
  aoDecidir: (corpo: Record<string, unknown>) => void;
}) {
  const [nome, setNome] = useState("");
  const [numero, setNumero] = useState(linha.occ ?? "");
  const [exercicio, setExercicio] = useState("");
  const [motivo, setMotivo] = useState("");

  const comparacao = useMemo(
    () => compararComRegisto({ nome: linha.nome, numero: linha.occ }, { nome, numero, exercicio: exercicio || null }),
    [linha.nome, linha.occ, nome, numero, exercicio]
  );

  const preenchido = Boolean(nome.trim() && numero.trim());

  return (
    <div className="border-t border-stone-100 bg-stone-50/60 p-4">
      <p className="text-sm text-stone-600">
        Escreve o que o registo da Ordem devolveu, tal como aparece lá.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Campo rotulo="Nome no registo" id={`nome-${linha.userId}`} valor={nome} aoMudar={setNome} />
        <Campo rotulo="Nº de membro" id={`num-${linha.userId}`} valor={numero} aoMudar={setNumero} />
        <Campo
          rotulo="Exercício profissão"
          id={`ex-${linha.userId}`}
          valor={exercicio}
          aoMudar={setExercicio}
          ajuda="Ex.: Ativo"
        />
      </div>

      {preenchido && (
        <ul className="mt-3 space-y-1">
          {comparacao.notas.map((n, i) => (
            <li key={i} className="flex items-start gap-1.5 text-sm text-stone-600">
              <Warning size={13} className="mt-0.5 shrink-0 text-alert-text" aria-hidden />
              {n}
            </li>
          ))}
          <li
            className={`flex items-start gap-1.5 text-sm font-medium ${
              comparacao.podeConfirmar ? "text-brand-dark" : "text-clay-text"
            }`}
          >
            {comparacao.podeConfirmar
              ? <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden />
              : <Warning size={14} className="mt-0.5 shrink-0" aria-hidden />}
            {comparacao.podeConfirmar
              ? "O registo confirma esta ficha."
              : "Com isto não se pode confirmar."}
          </li>
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={!comparacao.podeConfirmar || ocupado}
          onClick={() =>
            aoDecidir({
              decisao: "confirmar",
              metodo: "registo_publico",
              leitura: { nome, numero, exercicio: exercicio || null },
            })
          }
        >
          <Check size={14} className="mr-1.5" aria-hidden />
          {ocupado ? "A gravar…" : "Confirmar inscrição"}
        </Button>
      </div>

      <div className="mt-4 border-t border-stone-200 pt-3">
        <label htmlFor={`motivo-${linha.userId}`} className="block text-sm font-medium text-stone-700">
          Recusar, e porquê
        </label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <input
            id={`motivo-${linha.userId}`}
            type="text"
            value={motivo}
            maxLength={500}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: o registo não devolve ninguém com este número."
            className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <Button
            variant="ghost"
            size="sm"
            disabled={motivo.trim().length < 10 || ocupado}
            onClick={() => aoDecidir({ decisao: "recusar", motivo })}
          >
            Recusar
          </Button>
        </div>
        <p className="mt-1 text-xs text-stone-500">
          O motivo aparece ao contabilista — sem ele, ninguém sabe o que corrigir.
        </p>
      </div>
    </div>
  );
}

function Campo({
  rotulo, id, valor, aoMudar, ajuda,
}: {
  rotulo: string; id: string; valor: string; aoMudar: (v: string) => void; ajuda?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="block text-sm font-medium text-stone-700">{rotulo}</span>
      {ajuda && <span className="block text-xs text-stone-400">{ajuda}</span>}
      <input
        id={id}
        type="text"
        value={valor}
        maxLength={200}
        onChange={(e) => aoMudar(e.target.value)}
        className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </label>
  );
}
