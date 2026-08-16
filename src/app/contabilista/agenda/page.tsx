"use client";

// Agenda — consultas e semana-tipo.
//
// Marcar uma consulta como realizada é o que carimba o cartão, e por isso não
// é uma escrita normal: `concluir_consulta` conclui e carimba na mesma
// transação, com a identidade de quem pede e as regras do lado da base de
// dados. Se o carimbo falhar, a consulta não fica concluída.

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { usarFicha } from "@/components/contabilistas/usarFicha";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import GrelhaSemanal from "@/components/contabilistas/GrelhaSemanal";
import VistaMes from "@/components/contabilistas/VistaMes";
import DetalheConsulta from "@/components/contabilistas/DetalheConsulta";
import CabecalhoPainel from "@/components/contabilistas/CabecalhoPainel";
import EsqueletoPainel from "@/components/contabilistas/EsqueletoPainel";
import ConcluirConsulta, { type ConclusaoEscolhida } from "@/components/contabilistas/ConcluirConsulta";
import {
  listarAgendamentos, obterDisponibilidade, guardarDisponibilidade, meusClientes,
  decidirConsulta,
  meusCupoes,
  type CupaoLido,
} from "@/lib/contabilistas/fonte/dados";
import type { Agendamento, EstadoAgendamento, Vinculo } from "@/lib/contabilistas/tipos";
import { tratamentoDoCliente } from "@/lib/contabilistas/tipos";
import {
  NOMES_DIAS, minutosDeHora, type RegraDisponibilidade,
} from "@/lib/contabilistas/agenda";
import Button from "@/components/ui/Button";
import { useAvisos } from "@/components/ui/Avisos";
import { useConfirmar, type PedidoConfirmacao } from "@/components/ui/Confirmar";
import { Calendar, Plus, Trash } from "@/components/ui/Icons";
import Separadores, { PainelDoSeparador } from "@/components/contabilistas/Separadores";
import { usarRascunhoSujo } from "@/components/contabilistas/usarRascunhoSujo";

const ABAS_AGENDA = [
  { id: "semana" as const, rotulo: "Semana" },
  { id: "mes" as const, rotulo: "Mês" },
  { id: "tipo" as const, rotulo: "Semana-tipo" },
];

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
  const [aba, setAba] = useState<"semana" | "mes" | "tipo">("semana");
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [aberta, setAberta] = useState<Agendamento | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [porConcluir, setPorConcluir] = useState<
    { agendamento: Agendamento; beneficios: CupaoLido[] } | null
  >(null);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);

  /** O nome que o cliente deu neste vínculo, ou um identificador curto. */
  const nomeDoCliente = useCallback(
    (clienteId: string) => {
      const v = vinculos.find((x) => x.clienteId === clienteId);
      return tratamentoDoCliente(v ?? { nomeCliente: null, clienteId });
    },
    [vinculos]
  );

  const carregar = useCallback(async (id: string) => {
    try {
      const [ags, vins] = await Promise.all([
        listarAgendamentos({ contabilistaId: id, desde: new Date(Date.now() - 90 * 86400_000) }),
        meusClientes(id),
      ]);
      setAgendamentos(ags);
      setVinculos(vins);
    } catch (e) { avisos.erro((e as Error).message); }
  }, [avisos]);

  useEffect(() => { if (ficha) void carregar(ficha.userId); }, [ficha, carregar]);

  /**
   * Dar por REALIZADA passa por um diálogo, e não por uma confirmação.
   *
   * A Fidelidade V2 exige o preço real: `concluir_consulta` recusa com
   * `preco_obrigatorio` sem ele. Uma pergunta de sim/não não consegue
   * recolher um valor — por isso este estado, e não um `confirmar`.
   */
  async function pedirConclusao(a: Agendamento) {
    if (!ficha) return;
    const todos = await meusCupoes({ contabilistaId: ficha.userId }).catch(() => []);
    setPorConcluir({
      agendamento: a,
      beneficios: todos.filter((c) => c.clienteId === a.clienteId && c.estado === "disponivel"),
    });
  }

  async function mudarEstado(
    a: Agendamento,
    estado: EstadoAgendamento,
    localOuLigacao?: string,
    conclusao?: ConclusaoEscolhida,
  ) {
    if (!ficha) return;

    // «Realizada» sem preço nunca chega à RPC: abre o diálogo primeiro.
    if (estado === "realizada" && !conclusao) { await pedirConclusao(a); return; }

    const pergunta = estado === "realizada" ? null : perguntaDe(estado, ficha.fidelidadeAtiva);
    if (pergunta && !(await confirmar(pergunta))) return;

    setOcupado(a.id);
    try {
      const { erro, fidelidade: f } = await decidirConsulta(
        a.id, estado, localOuLigacao?.trim() || undefined,
        conclusao ? { precoCents: conclusao.precoCents, cupaoId: conclusao.cupaoId } : undefined,
      );
      if (erro) { avisos.erro(erro); return; }

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
      setPorConcluir(null);
      await carregar(ficha.userId);
    } catch { avisos.erro("Falha de rede. Tenta outra vez."); }
    finally { setOcupado(null); }
  }

  if (aCarregar) return <EsqueletoPainel forma="lista" />;
  if (!ficha) return null;

  return (
    <div className="space-y-6">
      <CabecalhoPainel
        titulo="Agenda"
        descricao="As consultas marcadas e os horários que os clientes veem no teu perfil."
      />

      {/* Semana e mês respondem a perguntas diferentes: a semana a «o que
          tenho na quinta às três?», o mês a «como está o mês?». Não é a
          mesma vista com mais dias, e por isso são dois separadores. */}
      <Separadores
        itens={ABAS_AGENDA}
        ativo={aba}
        onEscolher={setAba}
        etiqueta="Secções da agenda"
        painelId="agenda-painel"
      />

      <PainelDoSeparador id="agenda-painel">
        {aba === "semana" || aba === "mes" ? (
          // ⚠️ O estado vazio não pode substituir a grelha: um contabilista
          // que já definiu a semana-tipo e ainda não tem marcações precisa
          // de VER os horários que publicou. Antes, sem consultas, tanto a
          // semana como o mês desapareciam por completo.
          <>
            {agendamentos.length === 0 && (
              <div className="mb-4">
                <EstadoVazio
                  Icon={Calendar}
                  titulo="Ainda não há consultas marcadas"
                  descricao="Os teus clientes marcam a partir do teu perfil público. Define a semana-tipo para haver horários livres."
                />
              </div>
            )}
            {aba === "mes" ? (
              <VistaMes agendamentos={agendamentos} onAbrir={(a) => setAberta(a)} />
            ) : (
              <GrelhaSemanal
                agendamentos={agendamentos}
                ocupado={ocupado}
                onAbrir={(a) => setAberta(a)}
              />
            )}
          </>
        ) : (
          <SemanaTipo contabilistaId={ficha.userId} duracaoOmissao={ficha.duracaoConsultaMin} />
        )}
      </PainelDoSeparador>

      {/* A folha da consulta escolhida. As perguntas antes do irreversível
          continuam em `mudarEstado` — a folha só pede a ação. */}
      <AnimatePresence>
        {aberta && (
          <DetalheConsulta
            key={aberta.id}
            consulta={agendamentos.find((a) => a.id === aberta.id) ?? aberta}
            ocupado={ocupado === aberta.id}
            fidelidadeAtiva={ficha.fidelidadeAtiva}
            nomeCliente={nomeDoCliente(aberta.clienteId)}
            onEstado={async (a, estado, local) => {
              await mudarEstado(a, estado, local);
              setAberta(null);
            }}
            onFechar={() => setAberta(null)}
          />
        )}
      </AnimatePresence>

      {/* O diálogo do preço. Vive DENTRO da raiz do ecrã: fora dela o
          `return` ficava com dois elementos de topo. */}
      {porConcluir && (
        <ConcluirConsulta
          nomeCliente={nomeDoCliente(porConcluir.agendamento.clienteId)}
          precoSugeridoCents={ficha.precoConsultaCents}
          beneficios={porConcluir.beneficios}
          aGuardar={ocupado === porConcluir.agendamento.id}
          onCancelar={() => setPorConcluir(null)}
          onConfirmar={(escolha) =>
            void mudarEstado(porConcluir.agendamento, "realizada", undefined, escolha)
          }
        />
      )}
    </div>
  );
}

function SemanaTipo({ contabilistaId, duracaoOmissao }: { contabilistaId: string; duracaoOmissao: number }) {
  const avisos = useAvisos();
  const confirmar = useConfirmar();
  const [regras, setRegras] = useState<RegraDisponibilidade[]>([]);
  const [estado, setEstado] = useState<"a-ler" | "pronto" | "a-guardar">("a-ler");
  const [erro, setErro] = useState<string | null>(null);
  const [porGuardar, setPorGuardar] = useState(false);

  usarRascunhoSujo({
    sujo: porGuardar,
    descricao: "Mudaste a semana-tipo e ainda não a guardaste.",
  });

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
