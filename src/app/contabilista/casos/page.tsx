"use client";

// ═══════════════════════════════════════════════════════════════════════
//  CASOS — o painel de quem responde
//  ---------------------------------------------------------------------
//  O contabilista vê a referência, o nome, o NIF e a situação. Não vê
//  email, telefone nem morada, e isso não é uma omissão desta página: é
//  a tabela `caso_contactos`, a que ele não chega por caminho nenhum
//  (migração 051). Se um dia alguém acrescentar aqui um `select` distraído,
//  não vem nada — porque não há nada para vir.
//
//  Está dito no ecrã, e não escondido: quem responde tem de perceber que a
//  relação vive aqui dentro, e porquê.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import { usarFicha } from "@/components/contabilistas/usarFicha";
import CabecalhoPainel from "@/components/contabilistas/CabecalhoPainel";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import EsqueletoPainel from "@/components/contabilistas/EsqueletoPainel";
import Button from "@/components/ui/Button";
import { useAvisos } from "@/components/ui/Avisos";
import {
  Briefcase, Lock, User, Spinner, Check, Clock, ShieldCheck,
} from "@/components/ui/Icons";
import {
  listarCasos, listarMensagensDoCaso, listarPropostas, submeterMensagem,
  enviarProposta, AREAS, URGENCIAS, euros,
  type Caso, type MensagemDoCaso, type Proposta,
} from "@/lib/contabilistas/casos";

export default function CasosDoContabilista() {
  const { ficha, aCarregar } = usarFicha();
  const avisos = useAvisos();

  const [casos, setCasos] = useState<Caso[]>([]);
  const [aberto, setAberto] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MensagemDoCaso[]>([]);
  const [propostas, setPropostas] = useState<Proposta[]>([]);

  const carregar = useCallback(async () => {
    setCasos(await listarCasos());
  }, []);

  useEffect(() => { if (ficha) void carregar(); }, [ficha, carregar]);

  const abrir = useCallback(async (id: string) => {
    if (aberto === id) { setAberto(null); return; }
    setAberto(id);
    const [m, p] = await Promise.all([listarMensagensDoCaso(id), listarPropostas(id)]);
    setMensagens(m); setPropostas(p);
  }, [aberto]);

  if (aCarregar) return <EsqueletoPainel />;
  if (!ficha) return null;

  return (
    <div className="space-y-6">
      <CabecalhoPainel
        titulo="Casos"
        descricao="Pedidos que nos chegaram e que te foram encaminhados. Respondes com uma proposta."
      />

      {/* Porque é que não há um telefone nesta página. Dito uma vez, no
          sítio certo, em vez de nunca. */}
      <p className="flex items-start gap-2.5 rounded-2xl bg-brand-light px-4 py-3 text-xs leading-relaxed text-brand-dark">
        <ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          Recebes o nome e o NIF, que é o que precisas para trabalhar. Os contactos ficam
          connosco — a conversa passa por aqui e por revisão nossa. Quando a proposta for aceite,
          abre-se a conversa direta e a agenda.
        </span>
      </p>

      {casos.length === 0 ? (
        <EstadoVazio
          Icon={Briefcase}
          titulo="Ainda não te encaminhámos nenhum caso"
          descricao="Quando chegar um pedido da tua área, aparece aqui e avisamos-te. Mantém o perfil e a disponibilidade em dia — é o que usamos para decidir a quem encaminhar."
        />
      ) : (
        <ul className="space-y-3">
          {casos.map((c) => {
            const area = AREAS.find((a) => a.id === c.area);
            const urgencia = URGENCIAS.find((u) => u.id === c.urgencia);
            const estaAberto = aberto === c.id;
            return (
              <li key={c.id} className="overflow-hidden rounded-4xl border border-stone-200 bg-white shadow-card">
                <button
                  type="button"
                  aria-expanded={estaAberto}
                  onClick={() => void abrir(c.id)}
                  className="w-full px-5 py-4 text-left transition-colors hover:bg-cream/40 sm:px-6"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] tabular-nums text-stone-400">
                      {c.referencia}
                    </span>
                    {area && (
                      <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
                        {area.titulo}
                      </span>
                    )}
                    {urgencia && c.urgencia !== "normal" && (
                      <span className="rounded-lg bg-alert-bg px-2 py-0.5 text-[11px] font-semibold text-alert-text">
                        {urgencia.titulo}
                      </span>
                    )}
                  </div>

                  <h2 className="mt-1.5 font-display text-lg text-ink">{c.assunto}</h2>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                    <span className="flex items-center gap-1.5">
                      <User size={12} aria-hidden /> {c.nomeCompleto}
                    </span>
                    <span className="tabular-nums">NIF {c.nif}</span>
                    {c.orcamentoCents !== null && (
                      <span className="tabular-nums">Orçamento indicado: {euros(c.orcamentoCents)}</span>
                    )}
                  </div>
                </button>

                {estaAberto && (
                  <div className="border-t border-stone-100 px-5 py-5 sm:px-6">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">
                      A situação, nas palavras da pessoa
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                      {c.situacao}
                    </p>

                    <p className="mt-3 flex items-center gap-1.5 text-[11px] text-stone-400">
                      <Lock size={12} aria-hidden />
                      Sem contactos: falas por aqui, e o que escreveres passa por revisão.
                    </p>

                    {mensagens.length > 0 && (
                      <div className="mt-5">
                        <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">
                          Mensagens
                        </h3>
                        <ul className="mt-2 space-y-3">
                          {mensagens.map((m) => (
                            <li key={m.id} className="rounded-2xl bg-cream/50 px-4 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-stone-700">
                                  {m.autorPapel === "contabilista" ? "Tu" : c.nomeCompleto}
                                </span>
                                <span className="text-[11px] tabular-nums text-stone-400">
                                  {new Date(m.criadoEm).toLocaleDateString("pt-PT", {
                                    day: "numeric", month: "short",
                                  })}
                                </span>
                                {m.autorPapel === "contabilista" && m.estado === "submetida" && (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-500">
                                    <Clock size={10} aria-hidden /> À espera de revisão
                                  </span>
                                )}
                                {m.autorPapel === "contabilista" && m.estado === "aprovada" && (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-brand-light px-1.5 py-0.5 text-[10px] font-semibold text-brand-dark">
                                    <Check size={10} aria-hidden /> Encaminhada
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                                {m.corpoEncaminhado ?? m.corpo}
                              </p>
                              {m.notaRevisao && (
                                <p className="mt-2 rounded-xl bg-alert-bg px-3 py-2 text-[11px] leading-relaxed text-alert-text">
                                  {m.notaRevisao}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <ResponderAoCaso
                      caso={c}
                      contabilistaId={ficha.userId}
                      propostas={propostas}
                      aoMudar={() => void abrir(c.id)}
                      avisos={avisos}
                    />
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

/** Escrever uma mensagem, ou enviar a proposta. */
function ResponderAoCaso({
  caso, contabilistaId, propostas, aoMudar, avisos,
}: {
  caso: Caso;
  contabilistaId: string;
  propostas: Proposta[];
  aoMudar: () => void;
  avisos: ReturnType<typeof useAvisos>;
}) {
  const [modo, setModo] = useState<"nada" | "mensagem" | "proposta">("nada");
  const [texto, setTexto] = useState("");
  const [corpo, setCorpo] = useState("");
  const [valor, setValor] = useState("");
  const [ivaIncluido, setIvaIncluido] = useState(false);
  const [prazo, setPrazo] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const minhas = propostas.filter((p) => p.contabilistaId === contabilistaId);
  const emJogo = minhas.some((p) => p.estado === "enviada" || p.estado === "lida");

  async function escrever() {
    setOcupado(true);
    const { erro } = await submeterMensagem(caso.id, contabilistaId, "contabilista", texto);
    setOcupado(false);
    if (erro) { avisos.erro(erro); return; }
    setTexto(""); setModo("nada");
    avisos.sucesso("Mensagem submetida.", {
      detalhe: "Vai ser lida antes de seguir para o cliente.",
    });
    aoMudar();
  }

  async function propor() {
    setOcupado(true);
    const { erro } = await enviarProposta({
      casoId: caso.id,
      contabilistaId,
      corpo,
      valorCents: Math.round(Number(valor.replace(",", ".")) * 100),
      ivaIncluido,
      prazoExecucao: prazo || undefined,
    });
    setOcupado(false);
    if (erro) { avisos.erro(erro); return; }
    setCorpo(""); setValor(""); setPrazo(""); setModo("nada");
    avisos.sucesso("Proposta enviada.", {
      detalhe: "A pessoa só pode decidir depois de a ler até ao fim.",
    });
    aoMudar();
  }

  if (modo === "nada") {
    return (
      <div className="mt-5 flex flex-col gap-2 border-t border-stone-100 pt-5 sm:flex-row">
        <Button onClick={() => setModo("proposta")} className="w-full sm:w-auto">
          {emJogo ? "Enviar proposta nova" : "Enviar proposta"}
        </Button>
        <Button variant="secondary" onClick={() => setModo("mensagem")} className="w-full sm:w-auto">
          Fazer uma pergunta
        </Button>
        {emJogo && (
          <p className="self-center text-[11px] leading-relaxed text-stone-400">
            Uma proposta nova não substitui a anterior: as duas ficam, e a pessoa escolhe.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-stone-200 bg-cream/40 p-4">
      {modo === "mensagem" ? (
        <>
          <label htmlFor={`msg-${caso.id}`} className="block text-sm font-semibold text-stone-700">
            A tua pergunta
          </label>
          <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
            Passa por revisão antes de seguir. Não peças contactos — não são encaminhados, e a
            mensagem volta para trás.
          </p>
          <textarea
            id={`msg-${caso.id}`}
            rows={4}
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, 4000))}
            className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => void escrever()} disabled={!texto.trim() || ocupado} className="w-full sm:w-auto">
              {ocupado ? <><Spinner size={14} /> A submeter…</> : "Submeter para revisão"}
            </Button>
            <Button variant="ghost" onClick={() => setModo("nada")} className="w-full sm:w-auto">
              Cancelar
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-stone-700">A proposta</p>
          <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
            Depois de enviada não se reescreve — se quiseres mudar alguma coisa, envias outra e a
            pessoa vê as duas.
          </p>

          <label htmlFor={`corpo-${caso.id}`} className="mt-3 block text-sm font-semibold text-stone-700">
            O que propões fazer
          </label>
          <textarea
            id={`corpo-${caso.id}`}
            rows={6}
            value={corpo}
            onChange={(e) => setCorpo(e.target.value.slice(0, 20000))}
            placeholder="Descreve o trabalho, o que está incluído e o que não está. É isto que a pessoa tem de ler até ao fim antes de poder decidir."
            className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
          />

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`valor-${caso.id}`} className="block text-sm font-semibold text-stone-700">
                Valor
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  id={`valor-${caso.id}`}
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ""))}
                  className="w-28 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm tabular-nums focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                />
                <span className="text-sm text-stone-500">euros</span>
              </div>
              <label className="mt-2 flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={ivaIncluido}
                  onChange={(e) => setIvaIncluido(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-brand focus:ring-brand"
                />
                <span className="text-xs text-stone-600">IVA incluído</span>
              </label>
            </div>

            <div>
              <label htmlFor={`prazo-${caso.id}`} className="block text-sm font-semibold text-stone-700">
                Prazo
              </label>
              <input
                id={`prazo-${caso.id}`}
                value={prazo}
                onChange={(e) => setPrazo(e.target.value.slice(0, 200))}
                placeholder="Duas semanas"
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => void propor()}
              disabled={corpo.trim().length < 20 || !valor || ocupado}
              className="w-full sm:w-auto"
            >
              {ocupado ? <><Spinner size={14} /> A enviar…</> : "Enviar proposta"}
            </Button>
            <Button variant="ghost" onClick={() => setModo("nada")} className="w-full sm:w-auto">
              Cancelar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
