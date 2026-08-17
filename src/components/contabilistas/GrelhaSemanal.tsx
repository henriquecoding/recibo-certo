"use client";

// ═══════════════════════════════════════════════════════════════════════
//  AGENDA — a semana como grelha, não como lista
//  ---------------------------------------------------------------------
//  Uma lista responde a «o que tenho marcado». Uma grelha responde às
//  perguntas que um contabilista faz mesmo: onde é que tenho buracos, o
//  que é que tenho às terças de manhã, quanto tempo tenho entre as duas
//  da tarde e as quatro. Isso lê-se no ESPAÇO, e uma lista não tem espaço
//  — tem ordem.
//
//  Desenho:
//   · desktop — goteira de horas + sete colunas, cartões posicionados em
//     absoluto pela hora local, linha do «agora» a atravessar o dia de hoje;
//   · telemóvel — um dia de cada vez, com a mesma grelha e uma tira para
//     trocar de dia. Sete colunas a ~360px seriam 50px por dia: ilegível.
//
//  A cor diz o ESTADO, que é o que exige ação: por confirmar, confirmada,
//  fechada. A modalidade vai em ícone, porque é informação e não decisão.
//  E há uma legenda por baixo: um código de cores sem legenda é um código
//  que só quem o escreveu sabe ler.
//
//  Duas consultas à mesma hora dividem a coluna em vez de se taparem. Não
//  devia acontecer — a restrição GIST da migração 042 impede o duplo
//  agendamento — mas acontece com uma cancelada por baixo de uma nova, e
//  uma agenda que esconde uma consulta atrás de outra é pior do que uma
//  agenda apertada.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from "react";
import { m } from "motion/react";
import type { Agendamento, EstadoAgendamento } from "@/lib/contabilistas/tipos";
import {
  FUSO_PT, diaLocal, horaLocal, instanteDeLocal, minutosDeHora, rotularDia,
} from "@/lib/contabilistas/agenda";
import { ChevronLeft, ChevronRight, Clock, Laptop, MapPin } from "@/components/ui/Icons";

/** Altura de uma hora, em pixéis. Uma consulta de 30 min tem de caber. */
const ALTURA_HORA = 56;
const HORA_MIN_OMISSAO = 8;
const HORA_MAX_OMISSAO = 20;

/**
 * A cor de cada estado.
 *
 * `pedido` é o único que pede alguma coisa a alguém, e é o único com
 * contorno cheio. Os fechados esbatem-se: continuam lá, deixaram de
 * competir pela atenção.
 */
const TOM: Record<EstadoAgendamento, { caixa: string; texto: string; ponto: string }> = {
  pedido: {
    caixa: "border-categoria-areia-border bg-categoria-areia-bg",
    texto: "text-categoria-areia-text",
    ponto: "bg-categoria-areia-text",
  },
  confirmado: {
    caixa: "border-brand/30 bg-brand-light",
    texto: "text-brand-dark",
    ponto: "bg-brand",
  },
  realizada: {
    caixa: "border-categoria-lilas-border bg-categoria-lilas-bg",
    texto: "text-categoria-lilas-text",
    ponto: "bg-categoria-lilas-text",
  },
  nao_compareceu: {
    caixa: "border-clay-border bg-clay-bg",
    texto: "text-clay-text",
    ponto: "bg-clay",
  },
  cancelado_cliente: {
    caixa: "border-stone-200 bg-stone-50",
    texto: "text-stone-400",
    ponto: "bg-stone-300",
  },
  cancelado_contabilista: {
    caixa: "border-stone-200 bg-stone-50",
    texto: "text-stone-400",
    ponto: "bg-stone-300",
  },
};

const NOMES_CURTOS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

interface Props {
  agendamentos: Agendamento[];
  /** Qual consulta está a ser escrita agora — desliga-lhe o clique. */
  ocupado: string | null;
  /** Como tratar cada cliente. Sem isto, a grelha diz «quando» e não «quem». */
  nomeDoCliente?: (clienteId: string) => string;
  onAbrir: (a: Agendamento) => void;
}

export default function GrelhaSemanal({ agendamentos, ocupado, nomeDoCliente, onAbrir }: Props) {
  const [ancora, setAncora] = useState(() => diaLocal(new Date()));
  const [diaMovel, setDiaMovel] = useState(() => diaLocal(new Date()));
  const [agora, setAgora] = useState(() => new Date());
  const corpoRef = useRef<HTMLDivElement>(null);

  // A linha do «agora» tem de andar. De minuto a minuto chega — e uma
  // agenda aberta o dia todo não pode ficar a mentir sobre as horas.
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const dias = useMemo(() => diasDaSemana(ancora), [ancora]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, Agendamento[]>();
    for (const a of agendamentos) {
      const dia = diaLocal(new Date(a.inicio));
      mapa.set(dia, [...(mapa.get(dia) ?? []), a]);
    }
    for (const lista of mapa.values()) lista.sort((x, y) => x.inicio.localeCompare(y.inicio));
    return mapa;
  }, [agendamentos]);

  // A janela de horas segue o que existe: uma agenda que só tem consultas
  // às 9 não precisa de mostrar a madrugada, e uma que tem uma às 21 não
  // pode escondê-la.
  const { horaMin, horaMax } = useMemo(() => {
    let min = HORA_MIN_OMISSAO;
    let max = HORA_MAX_OMISSAO;
    for (const dia of dias) {
      for (const a of porDia.get(dia) ?? []) {
        const i = Math.floor((minutosDeHora(horaLocal(new Date(a.inicio))) ?? 0) / 60);
        const f = Math.ceil((minutosDeHora(horaLocal(new Date(a.fim))) ?? 0) / 60);
        min = Math.min(min, i);
        max = Math.max(max, f || 24);
      }
    }
    return { horaMin: Math.max(0, min), horaMax: Math.min(24, Math.max(max, min + 4)) };
  }, [dias, porDia]);

  const horas = useMemo(
    () => Array.from({ length: horaMax - horaMin }, (_, i) => horaMin + i),
    [horaMin, horaMax],
  );

  const hoje = diaLocal(agora);
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const semanaTemHoje = dias.includes(hoje);

  // Canceladas não contam: dizer «5 consultas» quando três foram desmarcadas
  // é dar uma semana cheia a quem tem uma semana vazia.
  const vivasNaSemana = useMemo(
    () =>
      dias.reduce(
        (n, dia) => n + (porDia.get(dia) ?? []).filter((a) => !a.estado.startsWith("cancelado")).length,
        0
      ),
    [dias, porDia]
  );

  // Ao abrir, a vista começa perto da hora a que se trabalha, não à
  // meia-noite. Sem isto, uma agenda das 8 às 20 abre sempre no cimo.
  useEffect(() => {
    const alvo = (Math.max(horaMin, Math.min(horaMax - 2, 8)) - horaMin) * ALTURA_HORA;
    corpoRef.current?.scrollTo({ top: alvo });
  }, [horaMin, horaMax]);

  function mover(semanas: number) {
    const [a, m, d] = ancora.split("-").map(Number);
    const t = new Date(Date.UTC(a, m - 1, d) + semanas * 7 * 86400_000);
    setAncora(isoDeUTC(t));
  }

  return (
    <div className="overflow-hidden rounded-4xl border border-stone-200 bg-white shadow-card">
      {/* ── Cabeçalho: que semana, e como sair dela ─────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="font-display text-lg leading-tight text-ink sm:text-xl">
            {rotuloSemana(dias)}
          </h2>
          <p className="mt-0.5 text-xs text-stone-400">
            {vivasNaSemana === 0
              ? "Sem consultas esta semana"
              : `${vivasNaSemana} ${vivasNaSemana === 1 ? "consulta" : "consultas"} · horas de Lisboa`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => mover(-1)}
            aria-label="Semana anterior"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
          >
            <ChevronLeft size={17} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => { setAncora(diaLocal(new Date())); setDiaMovel(diaLocal(new Date())); }}
            className="min-h-[2.25rem] rounded-xl border border-stone-200 px-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => mover(1)}
            aria-label="Semana seguinte"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
          >
            <ChevronRight size={17} aria-hidden />
          </button>
        </div>
      </div>

      {/* ── Telemóvel: tira de dias ─────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-stone-100 px-3 py-2.5 lg:hidden">
        {dias.map((dia) => {
          const escolhido = dia === diaMovel;
          const quantos = (porDia.get(dia) ?? []).length;
          return (
            <button
              key={dia}
              type="button"
              aria-pressed={escolhido}
              onClick={() => setDiaMovel(dia)}
              className={`flex min-h-[3.5rem] w-[3.25rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border transition-colors ${
                escolhido
                  ? "border-brand bg-brand text-white"
                  : dia === hoje
                    ? "border-brand/40 bg-brand-light/50 text-brand-dark"
                    : "border-stone-200 bg-white text-stone-600"
              }`}
            >
              <span className="text-[0.625rem] font-medium uppercase opacity-80">{diaCurto(dia)}</span>
              <span className="font-display text-base leading-none tabular-nums">{Number(dia.slice(-2))}</span>
              <span className={`h-1 w-1 rounded-full ${quantos > 0 ? (escolhido ? "bg-white" : "bg-brand") : "bg-transparent"}`} aria-hidden />
            </button>
          );
        })}
      </div>

      {/* ── Cabeçalho das colunas (desktop) ─────────────────────────── */}
      <div className="hidden border-b border-stone-100 lg:grid" style={{ gridTemplateColumns: `3.5rem repeat(7, 1fr)` }}>
        <div />
        {dias.map((dia) => (
          <div
            key={dia}
            className={`border-l border-stone-100 px-2 py-2.5 text-center ${dia === hoje ? "bg-brand/[0.07] dark:bg-brand/[0.12]" : ""}`}
          >
            <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-stone-400">{diaCurto(dia)}</p>
            <p className={`font-display text-lg leading-tight tabular-nums ${dia === hoje ? "text-brand-dark" : "text-ink"}`}>
              {Number(dia.slice(-2))}
            </p>
          </div>
        ))}
      </div>

      {/* ── Corpo ──────────────────────────────────────────────────── */}
      <div ref={corpoRef} className="max-h-[34rem] overflow-y-auto">
        {/*
          Duas colunas no telemóvel (goteira + o dia escolhido), oito no
          desktop (goteira + sete dias). Os dias não escolhidos são
          `hidden`, por isso não ocupam célula nenhuma — é o que faz a
          mesma grelha servir os dois tamanhos sem a duplicar.

          O `pt-2.5` existe para o primeiro rótulo de hora, que fica meio
          passo acima da sua linha: sem folga, ficava cortado pelo topo.
        */}
        <div className="relative grid grid-cols-[3rem_1fr] pt-2.5 lg:grid-cols-[3.5rem_repeat(7,1fr)]">
          {/* Goteira das horas */}
          <div className="sticky left-0 z-10 col-start-1 bg-white">
            {horas.map((h) => (
              <div key={h} className="relative border-b border-stone-100" style={{ height: ALTURA_HORA }}>
                <span className="absolute -top-2 right-1.5 bg-white px-1 text-[0.6875rem] tabular-nums text-stone-400 sm:right-2">
                  {String(h).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {/* Uma coluna no telemóvel, sete no desktop */}
          {dias.map((dia) => {
            const visivelNoMovel = dia === diaMovel;
            return (
              <Coluna
                key={dia}
                dia={dia}
                hoje={dia === hoje}
                lista={porDia.get(dia) ?? []}
                horas={horas}
                horaMin={horaMin}
                minutosAgora={semanaTemHoje && dia === hoje ? minutosAgora : null}
                ocupado={ocupado}
                nomeDoCliente={nomeDoCliente}
                onAbrir={onAbrir}
                className={visivelNoMovel ? "" : "hidden lg:block"}
              />
            );
          })}
        </div>
      </div>

      {/* ── Legenda ────────────────────────────────────────────────── */}
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-stone-100 px-4 py-2.5 sm:px-5">
        {LEGENDA.map(({ estado, rotulo }) => (
          <li key={estado} className="flex items-center gap-1.5 text-[0.6875rem] text-stone-500">
            <span className={`h-2 w-2 rounded-full ${TOM[estado].ponto}`} aria-hidden />
            {rotulo}
          </li>
        ))}
      </ul>
    </div>
  );
}

const LEGENDA: { estado: EstadoAgendamento; rotulo: string }[] = [
  { estado: "pedido", rotulo: "Por confirmar" },
  { estado: "confirmado", rotulo: "Confirmada" },
  { estado: "realizada", rotulo: "Realizada" },
  { estado: "cancelado_cliente", rotulo: "Cancelada" },
  { estado: "nao_compareceu", rotulo: "Não compareceu" },
];

function Coluna({
  dia, hoje, lista, horas, horaMin, minutosAgora, ocupado, nomeDoCliente, onAbrir, className,
}: {
  dia: string;
  hoje: boolean;
  lista: Agendamento[];
  horas: number[];
  horaMin: number;
  minutosAgora: number | null;
  ocupado: string | null;
  nomeDoCliente?: (clienteId: string) => string;
  onAbrir: (a: Agendamento) => void;
  className: string;
}) {
  const disposicao = useMemo(() => distribuir(lista), [lista]);

  return (
    <div className={`relative border-l border-stone-100 ${hoje ? "bg-brand/[0.05] dark:bg-brand/[0.09]" : ""} ${className}`}>
      {horas.map((h) => (
        <div key={h} className="border-b border-stone-100" style={{ height: ALTURA_HORA }} />
      ))}

      {minutosAgora !== null && (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
          style={{ top: ((minutosAgora - horaMin * 60) / 60) * ALTURA_HORA }}
          aria-hidden
        >
          <span className="h-1.5 w-1.5 rounded-full bg-clay" />
          <span className="h-px flex-1 bg-clay/60" />
        </div>
      )}

      {disposicao.map(({ agendamento: a, coluna, colunas }) => {
        const inicio = minutosDeHora(horaLocal(new Date(a.inicio))) ?? 0;
        const fim = minutosDeHora(horaLocal(new Date(a.fim))) ?? inicio + 60;
        const topo = ((inicio - horaMin * 60) / 60) * ALTURA_HORA;
        // Uma consulta de 15 minutos daria 14px e nenhum texto legível.
        const altura = Math.max(((fim - inicio) / 60) * ALTURA_HORA, 34);
        const tom = TOM[a.estado] ?? TOM.cancelado_cliente;
        const fechada = a.estado.startsWith("cancelado");
        const nome = nomeDoCliente?.(a.clienteId);
        // Duas ao mesmo tempo repartem a largura em vez de se taparem.
        const largura = 100 / colunas;

        return (
          <m.button
            key={a.id}
            type="button"
            layout
            disabled={ocupado === a.id}
            onClick={() => onAbrir(a)}
            style={{
              top: topo,
              height: altura,
              left: `calc(${coluna * largura}% + 0.25rem)`,
              width: `calc(${largura}% - 0.5rem)`,
            }}
            className={`absolute overflow-hidden rounded-xl border px-2 py-1 text-left transition-shadow hover:shadow-lift disabled:opacity-60 ${tom.caixa}`}
          >
            <span className={`flex items-center gap-1 text-[0.6875rem] font-semibold tabular-nums ${tom.texto}`}>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tom.ponto}`} aria-hidden />
              {horaLocal(new Date(a.inicio))}
              {a.modalidade === "online"
                ? <Laptop size={11} className="shrink-0 opacity-70" aria-label="Online" />
                : <MapPin size={11} className="shrink-0 opacity-70" aria-label="Presencial" />}
            </span>
            {/* Quem, antes de o quê: numa agenda cheia é o nome que
                identifica a consulta, não o assunto. */}
            {altura > 44 && (nome || a.assunto) && (
              <span className={`mt-0.5 block truncate text-[0.6875rem] font-medium leading-tight ${tom.texto} ${fechada ? "line-through" : ""}`}>
                {nome ?? a.assunto}
              </span>
            )}
            {altura > 62 && nome && a.assunto && (
              <span className={`block truncate text-[0.625rem] leading-tight opacity-75 ${tom.texto}`}>
                {a.assunto}
              </span>
            )}
            <span className="sr-only">
              {rotularDia(dia)}, {horaLocal(new Date(a.inicio))}
              {nome ? `, ${nome}` : ""} — {rotuloEstado(a.estado)}
            </span>
          </m.button>
        );
      })}

      {lista.length === 0 && (
        <p className="pointer-events-none absolute inset-x-0 top-2 text-center text-[0.6875rem] text-stone-300 lg:hidden">
          <Clock size={12} className="mx-auto mb-1" aria-hidden />
          Sem consultas neste dia
        </p>
      )}
    </div>
  );
}

// ─── Sobreposições ─────────────────────────────────────────────────────

interface Posicionada {
  agendamento: Agendamento;
  /** Índice da faixa vertical em que a consulta é desenhada. */
  coluna: number;
  /** Quantas faixas o grupo sobreposto a que pertence ocupa. */
  colunas: number;
}

/**
 * Reparte a largura da coluna entre consultas que se sobrepõem no tempo.
 *
 * A restrição GIST da migração 042 impede duas consultas ABERTAS ao mesmo
 * tempo, mas não impede uma cancelada por baixo de uma nova — e antes disto
 * a segunda ficava desenhada exatamente por cima da primeira, com a de
 * baixo invisível e clicável só por acidente.
 *
 * O algoritmo é o mínimo que resolve o caso: varre por ordem de início,
 * fecha um grupo sempre que uma consulta começa depois de todas as
 * anteriores acabarem, e dentro do grupo dá a cada uma a primeira faixa
 * livre.
 */
export function distribuir(lista: Agendamento[]): Posicionada[] {
  const ordenada = [...lista].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const saida: Posicionada[] = [];

  let grupo: { pos: Posicionada; fim: number }[] = [];
  let fimDoGrupo = -Infinity;

  const fecharGrupo = () => {
    const colunas = Math.max(1, ...grupo.map((g) => g.pos.coluna + 1));
    for (const g of grupo) {
      g.pos.colunas = colunas;
      saida.push(g.pos);
    }
    grupo = [];
    fimDoGrupo = -Infinity;
  };

  for (const a of ordenada) {
    const inicio = Date.parse(a.inicio);
    const fim = Date.parse(a.fim);
    if (grupo.length > 0 && inicio >= fimDoGrupo) fecharGrupo();

    // A primeira faixa cuja última consulta já acabou.
    const ocupadas = new Set(grupo.filter((g) => g.fim > inicio).map((g) => g.pos.coluna));
    let coluna = 0;
    while (ocupadas.has(coluna)) coluna += 1;

    const pos: Posicionada = { agendamento: a, coluna, colunas: 1 };
    grupo.push({ pos, fim });
    fimDoGrupo = Math.max(fimDoGrupo, fim);
  }
  if (grupo.length > 0) fecharGrupo();

  return saida;
}

// ─── Datas ─────────────────────────────────────────────────────────────

/** Os sete dias da semana (segunda a domingo) que contém `ancora`. */
export function diasDaSemana(ancora: string): string[] {
  const [a, m, d] = ancora.split("-").map(Number);
  const base = Date.UTC(a, m - 1, d);
  const semana = new Date(base).getUTCDay(); // 0 = domingo
  const segunda = base - ((semana + 6) % 7) * 86400_000;
  return Array.from({ length: 7 }, (_, i) => isoDeUTC(new Date(segunda + i * 86400_000)));
}

function isoDeUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function diaCurto(dia: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  const semana = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return NOMES_CURTOS[(semana + 6) % 7];
}

/** «11 – 17 de agosto» — ou com os dois meses, quando a semana os atravessa. */
function rotuloSemana(dias: string[]): string {
  const primeiro = dias[0];
  const ultimo = dias[dias.length - 1];
  const mes = (dia: string) => {
    const [a, m, d] = dia.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-PT", { month: "long", timeZone: FUSO_PT })
      .format(instanteDeLocal(a, m, d, 12, 0));
  };
  const n = (dia: string) => Number(dia.slice(-2));
  return mes(primeiro) === mes(ultimo)
    ? `${n(primeiro)} – ${n(ultimo)} de ${mes(ultimo)}`
    : `${n(primeiro)} de ${mes(primeiro)} – ${n(ultimo)} de ${mes(ultimo)}`;
}

function rotuloEstado(estado: EstadoAgendamento): string {
  return estado === "pedido" ? "Por confirmar"
    : estado === "confirmado" ? "Confirmada"
    : estado === "realizada" ? "Realizada"
    : estado === "nao_compareceu" ? "Não compareceu"
    : "Cancelada";
}
