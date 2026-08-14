"use client";

// ═══════════════════════════════════════════════════════════════════════
//  TRIAGEM E REVISÃO — o trabalho da administração
//  ---------------------------------------------------------------------
//  Dois separadores, e a ordem entre eles não é arbitrária: uma mensagem
//  por rever tem alguém à espera do outro lado, e um caso por encaminhar
//  tem alguém à espera de resposta. A fila mais antiga aparece primeiro
//  nos dois — quem está à espera há mais tempo é quem foi menos servido.
//
//  Não há «editar». Aprovar, devolver ou recusar. Se for preciso tirar um
//  telemóvel do meio de uma frase, escreve-se a versão a encaminhar e o
//  original fica — a migração 051 impede o contrário, e este ecrã diz
//  porquê a quem está a rever.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import { useAvisos } from "@/components/ui/Avisos";
import Button from "@/components/ui/Button";
import {
  Briefcase, User, Clock, Check, Warning, Spinner, ArrowRight,
} from "@/components/ui/Icons";
import {
  filaDeTriagem, filaDeRevisao, obterContactos, encaminharCaso, reverMensagem,
  AREAS, URGENCIAS, euros,
  type Caso, type MensagemDoCaso,
} from "@/lib/contabilistas/casos";
import { listarContabilistas } from "@/lib/contabilistas/dados";
import type { Contabilista } from "@/lib/contabilistas/tipos";

type Separador = "rever" | "encaminhar";

export default function TriagemDeCasos() {
  const avisos = useAvisos();
  const [separador, setSeparador] = useState<Separador>("rever");
  const [casos, setCasos] = useState<Caso[]>([]);
  const [mensagens, setMensagens] = useState<(MensagemDoCaso & { referencia?: string })[]>([]);
  const [contabilistas, setContabilistas] = useState<Contabilista[]>([]);
  const [aCarregar, setACarregar] = useState(true);

  const carregar = useCallback(async () => {
    const [c, m, cc] = await Promise.all([
      filaDeTriagem(), filaDeRevisao(), listarContabilistas(),
    ]);
    setCasos(c); setMensagens(m); setContabilistas(cc); setACarregar(false);
  }, []);

  useEffect(() => { carregar().catch(() => setACarregar(false)); }, [carregar]);

  if (aCarregar) {
    return (
      <div className="space-y-3">
        <div className="h-10 w-64 animate-pulse rounded-2xl bg-stone-100" />
        <div className="h-32 animate-pulse rounded-4xl bg-stone-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Administração</p>
        <h1 className="mt-1 font-display text-3xl leading-tight text-ink sm:text-4xl">
          Triagem de casos
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
          Nada segue de um lado para o outro sem passar por aqui. É isso que permite prometer
          que os contactos não saem — e obriga a que alguém leia.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Filas de trabalho"
        className="inline-flex rounded-2xl border border-stone-200 bg-white p-1"
      >
        {([
          ["rever", "Mensagens por rever", mensagens.length],
          ["encaminhar", "Casos por encaminhar", casos.length],
        ] as const).map(([id, texto, n]) => (
          <button
            key={id}
            role="tab"
            aria-selected={separador === id}
            onClick={() => setSeparador(id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              separador === id ? "bg-ink text-white" : "text-stone-500 hover:text-stone-800"
            }`}
          >
            {texto}
            {n > 0 && (
              <span className={`rounded-md px-1.5 py-0.5 text-[11px] tabular-nums ${
                separador === id ? "bg-white/20" : "bg-stone-100 text-stone-600"
              }`}>
                {n}
              </span>
            )}
          </button>
        ))}
      </div>

      {separador === "rever" ? (
        mensagens.length === 0 ? (
          <p className="rounded-4xl border border-dashed border-stone-200 bg-white/60 px-5 py-10 text-center text-sm text-stone-500">
            Não há nada por rever. A fila está vazia.
          </p>
        ) : (
          <ul className="space-y-3">
            {mensagens.map((m) => (
              <CartaoDeRevisao key={m.id} mensagem={m} aoDecidir={() => void carregar()} avisos={avisos} />
            ))}
          </ul>
        )
      ) : casos.length === 0 ? (
        <p className="rounded-4xl border border-dashed border-stone-200 bg-white/60 px-5 py-10 text-center text-sm text-stone-500">
          Não há casos por encaminhar.
        </p>
      ) : (
        <ul className="space-y-3">
          {casos.map((c) => (
            <CartaoDeTriagem
              key={c.id}
              caso={c}
              contabilistas={contabilistas}
              aoEncaminhar={() => void carregar()}
              avisos={avisos}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CartaoDeRevisao({
  mensagem, aoDecidir, avisos,
}: {
  mensagem: MensagemDoCaso & { referencia?: string };
  aoDecidir: () => void;
  avisos: ReturnType<typeof useAvisos>;
}) {
  const [nota, setNota] = useState("");
  const [redigido, setRedigido] = useState("");
  const [aRedigir, setARedigir] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function decidir(decisao: "aprovar" | "devolver" | "recusar") {
    setOcupado(decisao);
    const { erro } = await reverMensagem(
      mensagem.id, decisao,
      decisao === "aprovar" ? undefined : nota,
      decisao === "aprovar" && aRedigir ? redigido : undefined,
    );
    setOcupado(null);
    if (erro) { avisos.erro(erro); return; }
    avisos.sucesso(
      decisao === "aprovar" ? "Encaminhada."
        : decisao === "devolver" ? "Devolvida a quem escreveu."
        : "Não encaminhada.",
    );
    aoDecidir();
  }

  return (
    <li className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] tabular-nums text-stone-400">
          {mensagem.referencia ?? "—"}
        </span>
        <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
          {mensagem.autorPapel === "cliente" ? "Do cliente" : "Do contabilista"}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-stone-400">
          <Clock size={11} aria-hidden />
          {new Date(mensagem.criadoEm).toLocaleDateString("pt-PT", {
            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
          })}
        </span>
      </div>

      <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-cream/60 px-4 py-3 text-sm leading-relaxed text-stone-700">
        {mensagem.corpo}
      </p>

      <label className="mt-3 flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={aRedigir}
          onChange={(e) => { setARedigir(e.target.checked); if (e.target.checked && !redigido) setRedigido(mensagem.corpo); }}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-brand focus:ring-brand"
        />
        <span className="text-xs leading-relaxed text-stone-600">
          Encaminhar uma versão diferente — o original fica guardado tal como foi escrito, e o
          autor é avisado de que houve um ajuste.
        </span>
      </label>

      {aRedigir && (
        <textarea
          rows={4}
          value={redigido}
          onChange={(e) => setRedigido(e.target.value.slice(0, 4000))}
          aria-label="Versão a encaminhar"
          className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
        />
      )}

      <label htmlFor={`nota-${mensagem.id}`} className="mt-3 block text-xs font-semibold text-stone-700">
        Razão <span className="font-normal text-stone-400">— obrigatória para devolver ou recusar</span>
      </label>
      <input
        id={`nota-${mensagem.id}`}
        value={nota}
        onChange={(e) => setNota(e.target.value.slice(0, 500))}
        placeholder="Tira o número de telefone e volta a submeter."
        className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
      />

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={() => void decidir("aprovar")}
          disabled={ocupado !== null || (aRedigir && redigido.trim().length === 0)}
          className="w-full sm:w-auto"
        >
          {ocupado === "aprovar" ? <><Spinner size={14} /> …</> : <><Check size={14} aria-hidden /> Encaminhar</>}
        </Button>
        <Button
          variant="secondary"
          onClick={() => void decidir("devolver")}
          disabled={ocupado !== null || !nota.trim()}
          className="w-full sm:w-auto"
        >
          Devolver para corrigir
        </Button>
        <Button
          variant="ghost"
          onClick={() => void decidir("recusar")}
          disabled={ocupado !== null || !nota.trim()}
          className="w-full sm:w-auto"
        >
          Não encaminhar
        </Button>
      </div>
    </li>
  );
}

function CartaoDeTriagem({
  caso, contabilistas, aoEncaminhar, avisos,
}: {
  caso: Caso;
  contabilistas: Contabilista[];
  aoEncaminhar: () => void;
  avisos: ReturnType<typeof useAvisos>;
}) {
  const [contactos, setContactos] = useState<{ email: string; telefone: string | null; morada: string | null } | null>(null);
  const [escolhido, setEscolhido] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const area = AREAS.find((a) => a.id === caso.area);
  const urgencia = URGENCIAS.find((u) => u.id === caso.urgencia);
  const aprovados = contabilistas.filter((c) => c.estado === "aprovado");

  async function encaminhar() {
    if (!escolhido) return;
    setOcupado(true);
    const { erro } = await encaminharCaso(caso.id, escolhido);
    setOcupado(false);
    if (erro) { avisos.erro(erro); return; }
    avisos.sucesso("Caso encaminhado.");
    aoEncaminhar();
  }

  return (
    <li className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] tabular-nums text-stone-400">{caso.referencia}</span>
        {area && (
          <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
            {area.titulo}
          </span>
        )}
        {urgencia && caso.urgencia !== "normal" && (
          <span className="rounded-lg bg-alert-bg px-2 py-0.5 text-[11px] font-semibold text-alert-text">
            {urgencia.titulo}
          </span>
        )}
      </div>

      <h2 className="mt-1.5 font-display text-lg text-ink">{caso.assunto}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">{caso.situacao}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
        <span className="flex items-center gap-1.5"><User size={12} aria-hidden /> {caso.nomeCompleto}</span>
        <span className="tabular-nums">NIF {caso.nif}</span>
        {caso.orcamentoCents !== null && (
          <span className="tabular-nums">Orçamento: {euros(caso.orcamentoCents)}</span>
        )}
      </div>

      {/* Os contactos só aparecem a pedido. Não é teatro: são precisos
          poucas vezes, e o hábito de os ter sempre à vista é o que faz
          uma captura de ecrã tornar-se um problema. */}
      {contactos ? (
        <dl className="mt-3 grid gap-1 rounded-2xl bg-cream/60 px-4 py-3 text-xs text-stone-600">
          <div className="flex gap-2"><dt className="font-semibold">Email</dt><dd>{contactos.email}</dd></div>
          {contactos.telefone && (
            <div className="flex gap-2"><dt className="font-semibold">Telefone</dt><dd className="tabular-nums">{contactos.telefone}</dd></div>
          )}
          {contactos.morada && (
            <div className="flex gap-2"><dt className="font-semibold">Morada</dt><dd>{contactos.morada}</dd></div>
          )}
        </dl>
      ) : (
        <button
          type="button"
          onClick={() => void obterContactos(caso.id).then(setContactos)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-stone-800"
        >
          Mostrar contactos
        </button>
      )}

      <div className="mt-4 flex flex-col gap-2 border-t border-stone-100 pt-4 sm:flex-row sm:items-center">
        <label htmlFor={`cc-${caso.id}`} className="sr-only">Contabilista</label>
        <select
          id={`cc-${caso.id}`}
          value={escolhido}
          onChange={(e) => setEscolhido(e.target.value)}
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 sm:w-64"
        >
          <option value="">Encaminhar para…</option>
          {aprovados.map((c) => (
            <option key={c.userId} value={c.userId}>{c.nome}</option>
          ))}
        </select>
        <Button onClick={() => void encaminhar()} disabled={!escolhido || ocupado} className="w-full sm:w-auto">
          {ocupado ? <><Spinner size={14} /> …</> : <>Encaminhar <ArrowRight size={14} aria-hidden /></>}
        </Button>
      </div>
    </li>
  );
}
