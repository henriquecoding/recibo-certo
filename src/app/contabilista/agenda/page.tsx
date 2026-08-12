"use client";

// Agenda — consultas e semana-tipo.
//
// Marcar uma consulta como realizada é o que carimba o cartão, e por isso não
// é uma escrita normal: passa por /api/contabilistas/consulta, que confirma a
// identidade e chama `carimbar_consulta` com a chave de serviço.

import { useCallback, useEffect, useMemo, useState } from "react";
import { usarFicha, cabecalhoAuth } from "@/components/contabilistas/usarFicha";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import {
  listarAgendamentos, obterDisponibilidade, guardarDisponibilidade,
} from "@/lib/contabilistas/dados";
import type { Agendamento, EstadoAgendamento } from "@/lib/contabilistas/tipos";
import {
  NOMES_DIAS, diaLocal, horaLocal, minutosDeHora, rotularDia,
  type RegraDisponibilidade,
} from "@/lib/contabilistas/agenda";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useAvisos } from "@/components/ui/Avisos";
import { useConfirmar, type PedidoConfirmacao } from "@/components/ui/Confirmar";
import { Calendar, Check, Clock, Close, Gift, Plus, Trash } from "@/components/ui/Icons";

const ROTULO_ESTADO: Record<EstadoAgendamento, { texto: string; tom: "brand" | "alert" | "neutral" | "danger" }> = {
  pedido: { texto: "Por confirmar", tom: "alert" },
  confirmado: { texto: "Confirmada", tom: "brand" },
  realizada: { texto: "Realizada", tom: "neutral" },
  cancelado_cliente: { texto: "Cancelada pelo cliente", tom: "neutral" },
  cancelado_contabilista: { texto: "Cancelada por ti", tom: "neutral" },
  nao_compareceu: { texto: "Não compareceu", tom: "danger" },
};

/**
 * A pergunta antes de cada transição — e o silêncio onde não é precisa.
 *
 * Confirmar uma consulta é construtivo e reversível: não se pergunta nada.
 * As outras três fecham portas, e uma delas (`realizada`) escreve um
 * carimbo que não se descarimba — é a única escrita deste ecrã que a
 * pessoa não consegue desfazer sozinha.
 */
function perguntaDe(estado: EstadoAgendamento, fidelidadeAtiva: boolean): PedidoConfirmacao | null {
  if (estado === "realizada") {
    return {
      titulo: "Marcar esta consulta como realizada?",
      descricao: fidelidadeAtiva
        ? "Fica registada como feita e carimba o cartão de fidelidade deste cliente."
        : "Fica registada como feita.",
      consequencias: fidelidadeAtiva
        ? ["O carimbo não se retira.", "Se o cartão ficar completo, é emitido um cupão de desconto."]
        : undefined,
      confirmar: "Marcar realizada",
    };
  }
  if (estado === "cancelado_contabilista") {
    return {
      titulo: "Cancelar esta consulta?",
      descricao: "O cliente vê o cancelamento na área dele.",
      consequencias: ["O horário volta a ficar livre para outra pessoa.", "Não carimba o cartão."],
      confirmar: "Cancelar consulta",
      cancelar: "Voltar atrás",
      tom: "perigo",
    };
  }
  if (estado === "nao_compareceu") {
    return {
      titulo: "Registar que o cliente não compareceu?",
      descricao: "A consulta fecha sem carimbo, e o registo fica visível para os dois.",
      confirmar: "Registar falta",
      tom: "perigo",
    };
  }
  return null;
}

const FEITO: Partial<Record<EstadoAgendamento, string>> = {
  confirmado: "Consulta confirmada.",
  realizada: "Consulta registada como realizada.",
  cancelado_contabilista: "Consulta cancelada.",
  nao_compareceu: "Falta registada.",
};

export default function AgendaPage() {
  const { ficha, aCarregar } = usarFicha();
  const avisos = useAvisos();
  const confirmar = useConfirmar();
  const [aba, setAba] = useState<"consultas" | "semana">("consultas");
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const carregar = useCallback(async (id: string) => {
    try {
      setAgendamentos(await listarAgendamentos({
        contabilistaId: id, desde: new Date(Date.now() - 90 * 86400_000),
      }));
    } catch (e) { avisos.erro((e as Error).message); }
  }, [avisos]);

  useEffect(() => { if (ficha) void carregar(ficha.userId); }, [ficha, carregar]);

  async function mudarEstado(a: Agendamento, estado: EstadoAgendamento) {
    if (!ficha) return;

    const pergunta = perguntaDe(estado, ficha.fidelidadeAtiva);
    if (pergunta && !(await confirmar(pergunta))) return;

    setOcupado(a.id);
    try {
      const res = await fetch("/api/contabilistas/consulta", {
        method: "PATCH",
        headers: await cabecalhoAuth(),
        body: JSON.stringify({ agendamentoId: a.id, estado }),
      });
      const corpo = (await res.json()) as {
        erro?: string;
        fidelidade?: { completou?: boolean; carimbos?: number; meta?: number; percentagem?: number } | null;
      };
      if (!res.ok) { avisos.erro(corpo.erro ?? "Não foi possível atualizar."); return; }

      const f = corpo.fidelidade;
      if (f?.completou) {
        avisos.sucesso("Cartão completo.", {
          detalhe: `Foi emitido um cupão de ${f.percentagem}% para este cliente.`,
          duracaoMs: 9000,
        });
      } else if (f && typeof f.carimbos === "number") {
        avisos.sucesso("Consulta registada.", { detalhe: `Cartão em ${f.carimbos} de ${f.meta}.` });
      } else {
        avisos.sucesso(FEITO[estado] ?? "Agenda atualizada.");
      }
      await carregar(ficha.userId);
    } catch { avisos.erro("Falha de rede. Tenta outra vez."); }
    finally { setOcupado(null); }
  }

  if (aCarregar) return <div className="h-96 animate-pulse rounded-4xl bg-stone-100" aria-busy="true" />;
  if (!ficha) return null;

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Painel de gestão</p>
        <h1 className="mt-1 font-display text-3xl text-ink sm:text-4xl">Agenda</h1>
      </header>

      <div role="tablist" aria-label="Secções da agenda" className="flex gap-1.5 overflow-x-auto">
        {([["consultas", "Consultas"], ["semana", "Semana-tipo"]] as const).map(([id, txt]) => (
          <button
            key={id}
            role="tab"
            aria-selected={aba === id}
            onClick={() => setAba(id)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              aba === id ? "bg-brand text-white" : "bg-white text-stone-600 hover:bg-stone-100"
            }`}
          >
            {txt}
          </button>
        ))}
      </div>

      {aba === "consultas" ? (
        <Consultas
          agendamentos={agendamentos}
          ocupado={ocupado}
          onEstado={mudarEstado}
          fidelidadeAtiva={ficha.fidelidadeAtiva}
        />
      ) : (
        <SemanaTipo contabilistaId={ficha.userId} duracaoOmissao={ficha.duracaoConsultaMin} />
      )}
    </div>
  );
}

function Consultas({
  agendamentos, ocupado, onEstado, fidelidadeAtiva,
}: {
  agendamentos: Agendamento[];
  ocupado: string | null;
  onEstado: (a: Agendamento, e: EstadoAgendamento) => void;
  fidelidadeAtiva: boolean;
}) {
  const agora = Date.now();
  const { futuras, passadas } = useMemo(() => {
    const f: Agendamento[] = [], p: Agendamento[] = [];
    for (const a of agendamentos) (new Date(a.inicio).getTime() >= agora ? f : p).push(a);
    return { futuras: f, passadas: p.reverse() };
  }, [agendamentos, agora]);

  if (agendamentos.length === 0) {
    return (
      <EstadoVazio
        Icon={Calendar}
        titulo="Ainda não há consultas"
        descricao="Os teus clientes marcam a partir do teu perfil público. Define primeiro a semana-tipo para haver horários livres."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Grupo titulo="A seguir" lista={futuras} ocupado={ocupado} onEstado={onEstado} fidelidadeAtiva={fidelidadeAtiva} />
      <Grupo titulo="Passadas" lista={passadas.slice(0, 30)} ocupado={ocupado} onEstado={onEstado} fidelidadeAtiva={fidelidadeAtiva} />
    </div>
  );
}

function Grupo({
  titulo, lista, ocupado, onEstado, fidelidadeAtiva,
}: {
  titulo: string; lista: Agendamento[]; ocupado: string | null;
  onEstado: (a: Agendamento, e: EstadoAgendamento) => void; fidelidadeAtiva: boolean;
}) {
  if (lista.length === 0) return null;
  return (
    <section aria-labelledby={`grupo-${titulo}`}>
      <h2 id={`grupo-${titulo}`} className="font-display text-xl text-ink">{titulo}</h2>
      <ul className="mt-3 space-y-3">
        {lista.map((a) => {
          const meta = ROTULO_ESTADO[a.estado];
          const jaComecou = new Date(a.inicio).getTime() <= Date.now();
          const terminada = a.estado.startsWith("cancelado") || a.estado === "realizada" || a.estado === "nao_compareceu";
          return (
            <li key={a.id} className="rounded-4xl border border-stone-200 bg-white p-4 shadow-card sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-stone-800">{rotularDia(diaLocal(new Date(a.inicio)))}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm tabular-nums text-stone-500">
                    <Clock size={14} aria-hidden />
                    {horaLocal(new Date(a.inicio))} — {horaLocal(new Date(a.fim))}
                    <span className="text-stone-300">·</span>
                    {a.modalidade === "online" ? "Online" : "Presencial"}
                  </p>
                </div>
                <Badge tone={meta.tom}>{meta.texto}</Badge>
              </div>

              {a.assunto && (
                <p className="mt-2.5 rounded-2xl bg-cream px-3.5 py-2.5 text-sm leading-relaxed text-stone-600">
                  {a.assunto}
                </p>
              )}

              {!terminada && (
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {a.estado === "pedido" && (
                    <Button size="sm" disabled={ocupado === a.id} onClick={() => onEstado(a, "confirmado")}>
                      <Check size={15} aria-hidden /> Confirmar
                    </Button>
                  )}
                  {jaComecou && (
                    <Button
                      size="sm"
                      variant={a.estado === "confirmado" ? "primary" : "secondary"}
                      disabled={ocupado === a.id}
                      onClick={() => onEstado(a, "realizada")}
                      title={fidelidadeAtiva ? "Carimba o cartão de fidelidade" : undefined}
                    >
                      <Gift size={15} aria-hidden /> Marcar realizada
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={ocupado === a.id} onClick={() => onEstado(a, "cancelado_contabilista")}>
                    <Close size={15} aria-hidden /> Cancelar
                  </Button>
                  {jaComecou && (
                    <Button size="sm" variant="ghost" disabled={ocupado === a.id} onClick={() => onEstado(a, "nao_compareceu")}>
                      Não compareceu
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SemanaTipo({ contabilistaId, duracaoOmissao }: { contabilistaId: string; duracaoOmissao: number }) {
  const avisos = useAvisos();
  const confirmar = useConfirmar();
  const [regras, setRegras] = useState<RegraDisponibilidade[]>([]);
  const [estado, setEstado] = useState<"a-ler" | "pronto" | "a-guardar">("a-ler");
  const [erro, setErro] = useState<string | null>(null);
  const [porGuardar, setPorGuardar] = useState(false);

  useEffect(() => {
    let vivo = true;
    obterDisponibilidade(contabilistaId)
      .then((r) => { if (vivo) { setRegras(r); setEstado("pronto"); } })
      .catch((e: Error) => { if (vivo) { setErro(e.message); setEstado("pronto"); } });
    return () => { vivo = false; };
  }, [contabilistaId]);

  function acrescentar(dia: number) {
    setPorGuardar(true);
    setRegras((r) => [...r, { diaSemana: dia, inicio: "09:00", fim: "13:00", duracaoMin: duracaoOmissao }]);
  }
  function remover(i: number) { setPorGuardar(true); setRegras((r) => r.filter((_, j) => j !== i)); }
  function editar(i: number, campo: keyof RegraDisponibilidade, valor: string | number) {
    setPorGuardar(true);
    setRegras((r) => r.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)));
  }

  async function guardar() {
    setErro(null);
    // Os erros de formulário ficam JUNTO do formulário. Um aviso que
    // desaparece sozinho não serve para dizer «corrige esta hora».
    for (const r of regras) {
      const i = minutosDeHora(r.inicio), f = minutosDeHora(r.fim);
      if (i === null || f === null) { setErro("Há uma hora mal escrita. Usa o formato 09:00."); return; }
      if (f <= i) { setErro("A hora de fim tem de ser depois da hora de início."); return; }
      if (f - i < r.duracaoMin) { setErro("O intervalo é mais curto do que a duração da consulta."); return; }
    }

    // Guardar uma semana vazia é fechar a agenda ao público. É legítimo —
    // férias, agenda cheia — mas não deve acontecer por distração.
    if (regras.length === 0) {
      const ok = await confirmar({
        titulo: "Guardar a semana sem nenhum período?",
        descricao: "Sem horários publicados, ninguém consegue marcar consulta contigo.",
        consequencias: ["As consultas já marcadas mantêm-se.", "Podes voltar a abrir horários quando quiseres."],
        confirmar: "Guardar assim",
        tom: "perigo",
      });
      if (!ok) return;
    }

    setEstado("a-guardar");
    const { erro: e } = await guardarDisponibilidade(contabilistaId, regras);
    setEstado("pronto");
    if (e) { setErro(e); return; }
    setPorGuardar(false);
    avisos.sucesso("Semana-tipo guardada.", {
      detalhe: regras.length === 0
        ? "Ficaste sem horários publicados."
        : "Os clientes já veem estes horários no teu perfil.",
    });
  }

  if (estado === "a-ler") return <div className="h-64 animate-pulse rounded-4xl bg-stone-100" aria-busy="true" />;

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-stone-500">
        A semana-tipo gera os horários que os clientes veem. Podes ter mais do que
        um período por dia — manhã e tarde, por exemplo.
      </p>

      {erro && (
        <p role="alert" className="rounded-2xl bg-clay-bg px-4 py-3 text-sm text-clay-text">{erro}</p>
      )}

      <div className="space-y-3">
        {NOMES_DIAS.map((nome, dia) => {
          const doDia = regras.map((r, i) => ({ r, i })).filter(({ r }) => r.diaSemana === dia);
          return (
            <div key={dia} className="rounded-4xl border border-stone-200 bg-white p-4 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-stone-800">{nome}</h3>
                <Button size="sm" variant="ghost" onClick={() => acrescentar(dia)}>
                  <Plus size={15} aria-hidden /> Período
                </Button>
              </div>
              {doDia.length === 0 ? (
                <p className="mt-2 text-sm text-stone-400">Fechado</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {doDia.map(({ r, i }) => (
                    <li key={i} className="flex flex-wrap items-end gap-2.5">
                      <Campo rotulo="Das" id={`ini-${i}`} valor={r.inicio} onChange={(v) => editar(i, "inicio", v)} />
                      <Campo rotulo="Às" id={`fim-${i}`} valor={r.fim} onChange={(v) => editar(i, "fim", v)} />
                      <label className="flex flex-col gap-1 text-xs font-medium text-stone-500">
                        Duração
                        <select
                          value={r.duracaoMin}
                          onChange={(e) => editar(i, "duracaoMin", Number(e.target.value))}
                          className="min-h-[2.25rem] rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                        >
                          {[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => remover(i)}
                        aria-label={`Remover período das ${r.inicio} às ${r.fim} de ${nome}`}
                        className="inline-flex min-h-[2.25rem] min-w-[2.25rem] items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-clay-text"
                      >
                        <Trash size={16} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Fica colado ao fundo do ecrã: numa semana com sete cartões, o
          botão de guardar não pode viver só no fim do scroll. Acima da
          navegação de telemóvel, que também mora no fundo. */}
      <div className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-lift backdrop-blur lg:bottom-4">
        <Button onClick={guardar} disabled={estado === "a-guardar"}>
          {estado === "a-guardar" ? "A guardar…" : "Guardar semana-tipo"}
        </Button>
        <span role="status" className="text-sm text-stone-500">
          {porGuardar ? "Tens alterações por guardar." : "Está tudo guardado."}
        </span>
      </div>
    </div>
  );
}

function Campo({
  rotulo, id, valor, onChange,
}: { rotulo: string; id: string; valor: string; onChange: (v: string) => void }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-xs font-medium text-stone-500">
      {rotulo}
      <input
        id={id}
        type="time"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[2.25rem] rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-sm tabular-nums text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}
