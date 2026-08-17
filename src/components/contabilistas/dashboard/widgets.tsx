"use client";

/**
 * Os módulos do painel modular.
 *
 * Duas regras governam este ficheiro, e nenhuma delas é estética:
 *
 *  1. NENHUM módulo calcula. «Simulações recebidas» apresenta o que o
 *     cliente enviou — vem de `partilhas`, que são snapshots consentidos.
 *     Nenhum destes componentes lê `recibos`, `cenarios`,
 *     `recibos_vencimento` ou `preferencias_fiscais`, e o broker não tem
 *     por onde lhos dar. É a fronteira da migração 038 (§2.2, §7.5).
 *
 *  2. O tamanho muda a PROFUNDIDADE, não a escala (§8). Um módulo pequeno
 *     é um resumo, não um módulo grande espremido:
 *
 *        compact  → o essencial, uma linha ou um número
 *        normal   → resumo + próximos itens
 *        expanded → conteúdo operacional
 *        full     → quase a superfície dedicada
 *
 * A estrutura de cada cartão — que linha vem primeiro, onde fica a
 * contagem, onde fica a hora — é a da REFERÊNCIA A. Os dados são os
 * verdadeiros: a imagem manda no desenho, não no conteúdo.
 */

import Link from "next/link";
import { MODULOS, densidadeDe } from "@/lib/contabilistas/dashboard/modulos";
import type { WidgetDensity, WidgetType } from "@/lib/contabilistas/dashboard/tipos";
import { tratamentoDoCliente, type Vinculo } from "@/lib/contabilistas/tipos";
import { eurosDeCents, progresso } from "@/lib/contabilistas/fidelidade";
import {
  formatarComissao, vistaProgressao, type EstadoProgressao,
} from "@/lib/contabilistas/progressao/catalogo";
import type { EstadoTarefa, Tarefa } from "@/lib/contabilistas/fonte/trabalho";
import type { Agendamento, Partilha } from "@/lib/contabilistas/tipos";
import type { Caso } from "@/lib/contabilistas/fonte/casos";
import type { Notificacao } from "@/lib/contabilistas/fonte/conversa";
import type { PrazoAvaliado } from "@/lib/prazos";
import type { CartaoAberto } from "@/lib/contabilistas/fonte/dados";
import { ArrowRight, Check, Clock, Warning } from "@/components/ui/Icons";
import { CorpoVazio } from "./MolduraModulo";
import type { Broker, DadosDoDominio } from "./broker";
import type { DominioDados } from "@/lib/contabilistas/dashboard/modulos";

export interface PropsDoWidget {
  type: WidgetType;
  densidade: WidgetDensity;
  broker: Broker;
  /** Base onde o painel está aberto, para as ligações irem ao sítio certo. */
  href: (destino: string) => string;
}

/* ------------------------------------------------------------------ */
/* Utilidades de leitura                                               */
/* ------------------------------------------------------------------ */

/** Lê um domínio já carregado. `null` significa «ainda não» ou «falhou». */
function ler<K extends DominioDados>(
  broker: Broker, dominio: K,
): DadosDoDominio[K] | null {
  const e = broker.estado(dominio);
  return e.estado === "pronto" ? e.dados : null;
}

const quantos = (d: WidgetDensity, mapa: Record<WidgetDensity, number>) => mapa[d];

const HORA = new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit" });
const DIA_MES = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short" });

function quando(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const d = new Date(t);
  const hoje = new Date();
  const dias = Math.floor(
    (new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86_400_000,
  );
  if (dias <= 0) return "Hoje";
  if (dias === 1) return "Ontem";
  return DIA_MES.format(d);
}

function diasAte(dataISO: string): number {
  const alvo = new Date(`${dataISO}T00:00:00`);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

/** Iniciais para o círculo de identidade, como a referência mostra. */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Primitivas visuais partilhadas                                      */
/* ------------------------------------------------------------------ */

const LINHA = "flex items-start gap-2.5 py-1.5";
const SUB = "truncate text-[0.6875rem] text-stone-400";
const TITULO_LINHA = "truncate text-xs font-medium text-stone-700";

function Contagem({ n, tom = "brand" }: { n: number; tom?: "brand" | "alert" }) {
  return (
    <span
      className={`ml-auto inline-flex min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1.5 text-[0.6875rem] font-bold tabular-nums ${
        tom === "alert"
          ? "bg-alert-bg text-alert-text"
          : "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint"
      }`}
    >
      {n}
    </span>
  );
}

function Circulo({ texto }: { texto: string }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-categoria-azul-bg text-[0.625rem] font-bold text-categoria-azul-text dark:bg-sky-500/15 dark:text-sky-300">
      {texto}
    </span>
  );
}

function VerTudo({ href, texto = "Ver tudo" }: { href: string; texto?: string }) {
  return (
    <Link
      href={href}
      className="focus-marca mt-1.5 inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-brand-dark hover:underline dark:text-brand-mint"
    >
      {texto} <ArrowRight size={11} aria-hidden />
    </Link>
  );
}

/* ================================================================== */
/* AGD — Agenda de hoje                                                */
/* ================================================================== */

const COR_DO_ESTADO: Record<string, string> = {
  pedido: "bg-alert",
  confirmado: "bg-brand",
  realizada: "bg-stone-300",
  cancelado_cliente: "bg-clay",
  cancelado_contabilista: "bg-clay",
  nao_compareceu: "bg-clay",
};

const ROTULO_DO_ESTADO: Record<string, string> = {
  pedido: "Por confirmar",
  confirmado: "Confirmada",
  realizada: "Realizada",
  cancelado_cliente: "Cancelada",
  cancelado_contabilista: "Cancelada",
  nao_compareceu: "Faltou",
};

function AgendaHoje({ densidade, broker, href }: PropsDoWidget) {
  const agenda = ler(broker, "agenda");
  const clientes = ler(broker, "clientes");
  if (!agenda) return null;

  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  const doDia = agenda
    .filter((a) => Date.parse(a.inicio) <= hoje.getTime())
    .slice(0, quantos(densidade, { compact: 1, normal: 3, expanded: 6, full: 8 }));

  if (doDia.length === 0) {
    return <CorpoVazio texto="Sem consultas para hoje." />;
  }

  const nome = (a: Agendamento) => {
    const v = clientes?.find((c) => c.clienteId === a.clienteId);
    return v ? tratamentoDoCliente(v) : "Cliente";
  };

  return (
    <div>
      <ul className="divide-y divide-stone-100 dark:divide-stone-800">
        {doDia.map((a) => (
          <li key={a.id} className={LINHA}>
            <span className="mt-1 shrink-0 text-[0.6875rem] font-bold tabular-nums text-stone-500">
              {HORA.format(new Date(a.inicio))}
            </span>
            <span
              aria-hidden
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${COR_DO_ESTADO[a.estado] ?? "bg-stone-300"}`}
            />
            <span className="min-w-0 flex-1">
              <span className={`block ${TITULO_LINHA}`}>{a.assunto?.trim() || "Consulta"}</span>
              {densidade !== "compact" && (
                <span className={`block ${SUB}`}>
                  {nome(a)} · {a.modalidade === "online" ? "Online" : "Presencial"}
                </span>
              )}
            </span>
            <span className="shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 text-[0.625rem] font-semibold text-stone-500">
              {ROTULO_DO_ESTADO[a.estado] ?? a.estado}
            </span>
          </li>
        ))}
      </ul>
      {densidade !== "compact" && <VerTudo href={href("/contabilista/agenda")} texto="Ver agenda" />}
    </div>
  );
}

/* ================================================================== */
/* ATN — Precisam de atenção                                           */
/* ================================================================== */

/**
 * Só ações verdadeiras (§7.2). A ordenação é a da especificação —
 * vencido, hoje, amanhã, sem resposta há mais tempo — e NÃO há score
 * artificial: cada linha diz o que é e porque está aqui.
 */
function PrecisamAtencao({ densidade, broker, href }: PropsDoWidget) {
  const atencao = ler(broker, "atencao");
  const clientes = ler(broker, "clientes");
  if (!atencao) return null;

  const linhas: { chave: string; nome: string; razao: string; n: number; destino: string }[] = [];

  for (const v of (clientes ?? []).filter((c) => c.estado === "pendente")) {
    linhas.push({
      chave: `v-${v.id}`, nome: tratamentoDoCliente(v),
      razao: "Pedido de acompanhamento por responder", n: 1,
      destino: "/contabilista/clientes",
    });
  }
  if (atencao.consultasPorConfirmar > 0) {
    linhas.push({
      chave: "consultas", nome: "Agenda",
      razao: "Consultas por confirmar", n: atencao.consultasPorConfirmar,
      destino: "/contabilista/agenda",
    });
  }
  if (atencao.partilhasPorLer > 0) {
    linhas.push({
      chave: "partilhas", nome: "Partilhas",
      razao: "Enviadas e ainda não abertas", n: atencao.partilhasPorLer,
      destino: "/contabilista/partilhas",
    });
  }

  if (linhas.length === 0) {
    return <CorpoVazio texto="Nada à espera de resposta." />;
  }

  return (
    <ul className="divide-y divide-stone-100 dark:divide-stone-800">
      {linhas.slice(0, quantos(densidade, { compact: 2, normal: 4, expanded: 7, full: 10 })).map((l) => (
        <li key={l.chave}>
          <Link href={href(l.destino)} className={`${LINHA} focus-marca w-full rounded-lg hover:bg-stone-50 dark:hover:bg-white/[0.03]`}>
            <Circulo texto={iniciais(l.nome)} />
            <span className="min-w-0 flex-1">
              <span className={`block ${TITULO_LINHA}`}>{l.nome}</span>
              <span className="block truncate text-[0.6875rem] text-alert-text dark:text-amber-300">
                {l.razao}
              </span>
            </span>
            <Contagem n={l.n} tom="alert" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ================================================================== */
/* PRZ — Prazos próximos                                               */
/* ================================================================== */

/** Pastéis por CATEGORIA, não por urgência (§7.3). */
const COR_DA_CATEGORIA: Record<string, string> = {
  iva: "bg-categoria-azul-bg text-categoria-azul-text dark:bg-sky-500/15 dark:text-sky-300",
  irs: "bg-categoria-lilas-bg text-categoria-lilas-text dark:bg-violet-500/15 dark:text-violet-300",
  ss: "bg-categoria-areia-bg text-categoria-areia-text dark:bg-amber-500/15 dark:text-amber-300",
  outros: "bg-categoria-rosa-bg text-categoria-rosa-text dark:bg-rose-500/15 dark:text-rose-300",
};

function PrazosProximos({ densidade, broker }: PropsDoWidget) {
  const prazos = ler(broker, "prazos");
  if (!prazos) return null;
  const lista = prazos.slice(0, quantos(densidade, { compact: 1, normal: 4, expanded: 6, full: 8 }));
  if (lista.length === 0) return <CorpoVazio texto="Sem prazos nas próximas semanas." />;

  return (
    <ul className="divide-y divide-stone-100 dark:divide-stone-800">
      {lista.map((p: PrazoAvaliado) => {
        const dias = diasAte(p.data);
        const d = new Date(`${p.data}T00:00:00`);
        return (
          <li key={p.id} className={LINHA}>
            {/* O bloco dia+mês da referência A. */}
            <span className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg leading-none ${COR_DA_CATEGORIA[p.categoria] ?? COR_DA_CATEGORIA.outros}`}>
              <span className="text-xs font-bold tabular-nums">{d.getDate()}</span>
              <span className="text-[0.5rem] font-bold uppercase tracking-wide opacity-80">
                {d.toLocaleDateString("pt-PT", { month: "short" }).replace(".", "")}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block ${TITULO_LINHA}`}>{p.titulo}</span>
              {densidade !== "compact" && <span className={`block ${SUB}`}>{p.motivo}</span>}
            </span>
            <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[0.625rem] font-semibold tabular-nums text-stone-500">
              {dias <= 0 ? "hoje" : dias === 1 ? "1 dia" : `${dias} dias`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ================================================================== */
/* PAR / SIM — Partilhas e Simulações recebidas                        */
/* ================================================================== */

const TIPOS_DE_SIMULACAO = new Set([
  "simulador_irs", "recibo_vencimento", "simulador_empresa",
  "comparador_regimes", "simulador_herancas", "resumo_anual",
]);

const ROTULO_DA_PARTILHA: Record<string, string> = {
  simulador_irs: "Simulação de IRS",
  recibos_verdes: "Recibos verdes",
  recibo_vencimento: "Recibo de vencimento",
  comparador_regimes: "Comparação de regimes",
  simulador_empresa: "Simulação de empresa",
  simulador_herancas: "Simulação de heranças",
  cenario_guardado: "Cenário guardado",
  resumo_anual: "Resumo anual",
};

function ListaDePartilhas({
  densidade, broker, href, apenasSimulacoes,
}: PropsDoWidget & { apenasSimulacoes: boolean }) {
  const partilhas = ler(broker, "partilhas");
  const clientes = ler(broker, "clientes");
  if (!partilhas) return null;

  const lista = partilhas
    .filter((p: Partilha) => (apenasSimulacoes ? TIPOS_DE_SIMULACAO.has(p.tipo) : true))
    .slice(0, quantos(densidade, { compact: 2, normal: 3, expanded: 6, full: 9 }));

  if (lista.length === 0) {
    return (
      <CorpoVazio
        texto={apenasSimulacoes
          ? "Ainda não recebeste simulações. Aparecem aqui quando um cliente as enviar."
          : "Ainda não recebeste partilhas."}
      />
    );
  }

  const nome = (p: Partilha) => {
    const v = clientes?.find((c) => c.clienteId === p.clienteId);
    return v ? tratamentoDoCliente(v) : "Cliente";
  };

  return (
    <div>
      <ul className="divide-y divide-stone-100 dark:divide-stone-800">
        {lista.map((p) => (
          <li key={p.id}>
            <Link
              href={href("/contabilista/partilhas")}
              className={`${LINHA} focus-marca w-full rounded-lg hover:bg-stone-50 dark:hover:bg-white/[0.03]`}
            >
              <span className="min-w-0 flex-1">
                <span className={`block ${TITULO_LINHA}`}>{nome(p)}</span>
                <span className={`block ${SUB}`}>
                  {p.titulo?.trim() || ROTULO_DA_PARTILHA[p.tipo] || "Partilha"}
                </span>
              </span>
              <span className="shrink-0 text-[0.625rem] text-stone-400">{quando(p.criadoEm)}</span>
              {/* O ponto verde da referência: por abrir. */}
              {p.estado === "enviada" && (
                <span aria-label="Nova" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              )}
            </Link>
          </li>
        ))}
      </ul>
      {densidade !== "compact" && <VerTudo href={href("/contabilista/partilhas")} />}
    </div>
  );
}

/* ================================================================== */
/* DOC — Documentos por rever                                          */
/* ================================================================== */

function DocumentosRever({ densidade, broker, href }: PropsDoWidget) {
  const casos = ler(broker, "documentos");
  if (!casos) return null;

  // Agrupa por estado do caso: é o que existe hoje sem inventar um
  // repositório fiscal novo (§7.6).
  const porEstado = new Map<string, number>();
  for (const c of casos as Caso[]) {
    if (c.estado === "fechado" || c.estado === "recusado") continue;
    porEstado.set(c.estado, (porEstado.get(c.estado) ?? 0) + 1);
  }

  const ROTULO: Record<string, string> = {
    rascunho: "Rascunhos por submeter",
    submetido: "Submetidos, por triar",
    em_triagem: "Em triagem",
    encaminhado: "Encaminhados, à espera de proposta",
    com_proposta: "Com proposta enviada",
    aceite: "Aceites, por começar",
  };

  const linhas = [...porEstado.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, quantos(densidade, { compact: 2, normal: 3, expanded: 6, full: 8 }));

  if (linhas.length === 0) return <CorpoVazio texto="Nada por rever." />;

  return (
    <div>
      <ul className="space-y-0.5">
        {linhas.map(([estado, n]) => (
          <li key={estado}>
            <Link
              href={href("/contabilista/casos")}
              className="focus-marca flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-stone-50 dark:hover:bg-white/[0.03]"
            >
              <span className={`min-w-0 flex-1 ${TITULO_LINHA}`}>{ROTULO[estado] ?? estado}</span>
              <Contagem n={n} />
            </Link>
          </li>
        ))}
      </ul>
      {densidade !== "compact" && <VerTudo href={href("/contabilista/casos")} texto="Ver casos" />}
    </div>
  );
}

/* ================================================================== */
/* ATV — Atividade da semana                                           */
/* ================================================================== */

/**
 * Métricas úteis, não vanity (§7.7). O gráfico só existe em L/XL — em S
 * e M os números sozinhos dizem mais do que uma linha de sete pontos com
 * 40px de altura.
 */
function AtividadeSemana({ densidade, broker }: PropsDoWidget) {
  const atividade = ler(broker, "atividade");
  if (!atividade) return null;

  const { tarefas, casos } = atividade;
  const entregues = tarefas.filter((t: Tarefa) => t.estado === "entregue").length;
  const abertas = tarefas.filter((t: Tarefa) => t.estado !== "entregue").length;
  const casosVivos = (casos as Caso[]).filter((c) => c.estado !== "fechado" && c.estado !== "recusado").length;

  const tiles = [
    { rotulo: "Tarefas concluídas", valor: entregues },
    { rotulo: "Tarefas abertas", valor: abertas },
    { rotulo: "Casos ativos", valor: casosVivos },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <dl className="grid grid-cols-3 gap-1.5">
        {tiles.map((t) => (
          <div key={t.rotulo} className="rounded-xl bg-cream/70 px-2 py-1.5 dark:bg-white/[0.03]">
            <dt className="truncate text-[0.5625rem] font-semibold uppercase tracking-wide text-stone-400">
              {t.rotulo}
            </dt>
            <dd className="font-display text-lg leading-tight text-ink tabular-nums">{t.valor}</dd>
          </div>
        ))}
      </dl>

      {(densidade === "expanded" || densidade === "full") && (
        <GraficoSemana tarefas={tarefas} />
      )}
    </div>
  );
}

/**
 * Sete barras, uma por dia, com as tarefas entregues nesse dia.
 *
 * Barras e não uma linha: com sete pontos e alturas pequenas, uma linha
 * lê-se pior e obriga a eixos que roubam o espaço do próprio dado.
 */
function GraficoSemana({ tarefas }: { tarefas: Tarefa[] }) {
  const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const hoje = new Date();
  const contagem = DIAS.map((_, i) => {
    const d = new Date(hoje);
    // Segunda como primeiro dia da semana.
    const desloc = (hoje.getDay() + 6) % 7;
    d.setDate(hoje.getDate() - desloc + i);
    const chave = d.toISOString().slice(0, 10);
    return tarefas.filter((t) => t.estado === "entregue" && t.prazo === chave).length;
  });
  const maximo = Math.max(1, ...contagem);

  return (
    <div className="min-h-0 flex-1">
      <div className="flex h-full min-h-[3.5rem] items-end gap-1.5">
        {contagem.map((n, i) => (
          <div key={DIAS[i]} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md bg-brand/70 dark:bg-brand/60"
              style={{ height: `${Math.max(4, (n / maximo) * 100)}%` }}
              role="img"
              aria-label={`${DIAS[i]}: ${n} ${n === 1 ? "tarefa" : "tarefas"}`}
            />
            <span className="text-[0.5rem] font-medium text-stone-400">{DIAS[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/* AVS — Centro de avisos                                              */
/* ================================================================== */

/**
 * Resumo ACIONÁVEL, não o feed cronológico — esse é o sino (§7.8).
 * Por isso agrupa por tipo e mostra uma ação, em vez de listar tudo por
 * ordem de chegada.
 */
function CentroAvisos({ densidade, broker, href }: PropsDoWidget) {
  const avisos = ler(broker, "avisos");
  const prazos = ler(broker, "prazos");
  if (!avisos) return null;

  const porLer = (avisos as Notificacao[]).filter((n) => !n.lidaEm);
  const proximo = prazos?.[0];
  const cartoes: { chave: string; rotulo: string; titulo: string; corpo: string; acao: string; destino: string; tom: "alert" | "azul" }[] = [];

  if (proximo) {
    const dias = diasAte(proximo.data);
    cartoes.push({
      chave: "prazo", rotulo: "Prazo aproxima-se", titulo: proximo.titulo,
      corpo: dias <= 0 ? "Termina hoje." : `Faltam ${dias} ${dias === 1 ? "dia" : "dias"}.`,
      acao: "Ver prazos", destino: "/contabilista/agenda", tom: "alert",
    });
  }
  if (porLer.length > 0) {
    cartoes.push({
      chave: "avisos", rotulo: "Avisos por ler", titulo: `${porLer.length} ${porLer.length === 1 ? "aviso" : "avisos"}`,
      corpo: porLer[0].titulo, acao: "Abrir lista", destino: "/contabilista/clientes", tom: "azul",
    });
  }

  if (cartoes.length === 0) return <CorpoVazio texto="Sem avisos por tratar." />;

  return (
    <ul className="space-y-1.5">
      {cartoes.slice(0, quantos(densidade, { compact: 1, normal: 2, expanded: 3, full: 4 })).map((c) => (
        <li
          key={c.chave}
          className={`rounded-xl px-2.5 py-2 ${
            c.tom === "alert"
              ? "border border-alert-border bg-alert-bg dark:border-amber-500/20 dark:bg-amber-500/10"
              : "border border-categoria-azul-border bg-categoria-azul-bg dark:border-sky-500/20 dark:bg-sky-500/10"
          }`}
        >
          <p className={`text-[0.5625rem] font-bold uppercase tracking-wider ${
            c.tom === "alert" ? "text-alert-text dark:text-amber-300" : "text-categoria-azul-text dark:text-sky-300"
          }`}>
            {c.rotulo}
          </p>
          <p className="mt-0.5 truncate text-xs font-semibold text-ink">{c.titulo}</p>
          <p className="truncate text-[0.6875rem] text-stone-500">{c.corpo}</p>
          <Link
            href={href(c.destino)}
            className="focus-marca mt-1 inline-flex items-center gap-1 text-[0.625rem] font-bold text-brand-dark hover:underline dark:text-brand-mint"
          >
            {c.acao} <ArrowRight size={10} aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ================================================================== */
/* TRB — Estado do trabalho                                            */
/* ================================================================== */

const COLUNAS_TRABALHO: { estado: EstadoTarefa; titulo: string }[] = [
  { estado: "por_tratar", titulo: "Por tratar" },
  { estado: "espera_cliente", titulo: "A aguardar cliente" },
  { estado: "em_curso", titulo: "Em análise" },
  { estado: "entregue", titulo: "Concluído" },
];

/**
 * Em S/M são contagens; em L/XL é o Kanban da referência A — quatro
 * colunas com o número no cabeçalho, os primeiros cartões, e «+ N
 * tarefas» no fim de cada coluna.
 *
 * O «+ N» resolve a altura sem scroll interno por coluna: o módulo tem a
 * altura que a grelha lhe deu, e o excedente é dito em vez de escondido.
 */
function EstadoTrabalho({ densidade, broker, href }: PropsDoWidget) {
  const tarefas = ler(broker, "trabalho");
  const clientes = ler(broker, "clientes");
  if (!tarefas) return null;

  const porEstado = (e: EstadoTarefa) => (tarefas as Tarefa[]).filter((t) => t.estado === e);

  if (densidade === "compact" || densidade === "normal") {
    return (
      <ul className="space-y-0.5">
        {COLUNAS_TRABALHO.map((c) => (
          <li key={c.estado} className="flex items-center gap-2 py-1">
            <span className={`min-w-0 flex-1 ${TITULO_LINHA}`}>{c.titulo}</span>
            <Contagem n={porEstado(c.estado).length} />
          </li>
        ))}
      </ul>
    );
  }

  const porColuna = densidade === "full" ? 4 : 2;
  const nomeDe = (t: Tarefa) => {
    const v = clientes?.find((c: Vinculo) => c.id === t.vinculoId);
    return v ? tratamentoDoCliente(v) : null;
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {COLUNAS_TRABALHO.map((c) => {
          const lista = porEstado(c.estado);
          const mostradas = lista.slice(0, porColuna);
          const resto = lista.length - mostradas.length;
          return (
            <div key={c.estado} className="min-w-0 rounded-xl bg-cream/70 p-1.5 dark:bg-white/[0.03]">
              <p className="flex items-center gap-1.5 px-1 pb-1">
                <span className="truncate text-[0.625rem] font-bold uppercase tracking-wide text-stone-500">
                  {c.titulo}
                </span>
                <span className="ml-auto shrink-0 text-[0.625rem] font-bold tabular-nums text-stone-400">
                  {lista.length}
                </span>
              </p>
              <ul className="space-y-1">
                {mostradas.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-lg border border-stone-200/70 bg-white px-1.5 py-1"
                  >
                    <span className="block truncate text-[0.6875rem] font-medium text-stone-700">
                      {t.titulo}
                    </span>
                    {nomeDe(t) && (
                      <span className="block truncate text-[0.5625rem] text-stone-400">{nomeDe(t)}</span>
                    )}
                  </li>
                ))}
                {mostradas.length === 0 && (
                  <li className="px-1 py-1 text-[0.5625rem] text-stone-400">Nada aqui.</li>
                )}
              </ul>
              {resto > 0 && (
                <Link
                  href={href("/contabilista/trabalho")}
                  className="focus-marca mt-1 block px-1 text-[0.5625rem] font-semibold text-brand-dark hover:underline dark:text-brand-mint"
                >
                  + {resto} {resto === 1 ? "tarefa" : "tarefas"}
                </Link>
              )}
            </div>
          );
        })}
      </div>
      <VerTudo href={href("/contabilista/trabalho")} texto="Abrir quadro de trabalho" />
    </div>
  );
}

/* ================================================================== */
/* CLI / CAS / RSK / COM / RES                                         */
/* ================================================================== */

function Clientes({ densidade, broker, href }: PropsDoWidget) {
  const clientes = ler(broker, "clientes");
  if (!clientes) return null;
  const ativos = clientes.filter((v) => v.estado === "ativo");
  const pendentes = clientes.filter((v) => v.estado === "pendente");

  return (
    <div>
      <dl className="grid grid-cols-2 gap-1.5">
        <div className="rounded-xl bg-cream/70 px-2 py-1.5 dark:bg-white/[0.03]">
          <dt className="text-[0.5625rem] font-semibold uppercase tracking-wide text-stone-400">Ativos</dt>
          <dd className="font-display text-lg leading-tight text-ink tabular-nums">{ativos.length}</dd>
        </div>
        <div className="rounded-xl bg-cream/70 px-2 py-1.5 dark:bg-white/[0.03]">
          <dt className="text-[0.5625rem] font-semibold uppercase tracking-wide text-stone-400">Por responder</dt>
          <dd className="font-display text-lg leading-tight text-ink tabular-nums">{pendentes.length}</dd>
        </div>
      </dl>
      {densidade !== "compact" && (
        <ul className="mt-1.5 divide-y divide-stone-100 dark:divide-stone-800">
          {ativos.slice(0, quantos(densidade, { compact: 0, normal: 3, expanded: 6, full: 8 })).map((v) => (
            <li key={v.id} className={LINHA}>
              <Circulo texto={iniciais(tratamentoDoCliente(v))} />
              <span className={`min-w-0 flex-1 ${TITULO_LINHA}`}>{tratamentoDoCliente(v)}</span>
            </li>
          ))}
        </ul>
      )}
      <VerTudo href={href("/contabilista/clientes")} />
    </div>
  );
}

const ROTULO_CASO: Record<string, string> = {
  rascunho: "Rascunho", submetido: "Submetido", em_triagem: "Em triagem",
  encaminhado: "Encaminhado", com_proposta: "Com proposta",
  aceite: "Aceite", recusado: "Recusado", fechado: "Fechado",
};

function ListaDeCasos({ densidade, broker, href, soEmRisco }: PropsDoWidget & { soEmRisco: boolean }) {
  const casos = ler(broker, "casos");
  if (!casos) return null;

  // «Risco» é a definição conservadora, sem score inventado: parado há
  // mais de 7 dias e ainda por fechar.
  //
  // O instante de referência é `submetidoEm ?? criadoEm`, porque é o mais
  // recente que a tabela tem — `casos` não guarda data de última
  // alteração. Um caso movimentado ontem sem mudar de estado pode
  // aparecer aqui, e é por isso que a coluna de última movimentação é a
  // primeira coisa a acrescentar quando esta definição for afinada.
  const PARADO_DIAS = 7;
  const lista = (casos as Caso[])
    .filter((c) => {
      if (c.estado === "fechado" || c.estado === "recusado") return false;
      if (!soEmRisco) return true;
      const t = Date.parse(c.submetidoEm ?? c.criadoEm);
      if (!Number.isFinite(t)) return false;
      return (Date.now() - t) / 86_400_000 > PARADO_DIAS;
    })
    .slice(0, quantos(densidade, { compact: 2, normal: 4, expanded: 7, full: 10 }));

  if (lista.length === 0) {
    return <CorpoVazio texto={soEmRisco ? "Nenhum caso parado." : "Sem casos abertos."} />;
  }

  return (
    <div>
      <ul className="divide-y divide-stone-100 dark:divide-stone-800">
        {lista.map((c) => (
          <li key={c.id}>
            <Link href={href("/contabilista/casos")} className={`${LINHA} focus-marca w-full rounded-lg hover:bg-stone-50 dark:hover:bg-white/[0.03]`}>
              {soEmRisco && <Warning size={13} className="mt-0.5 shrink-0 text-alert-text dark:text-amber-300" aria-hidden />}
              <span className="min-w-0 flex-1">
                <span className={`block ${TITULO_LINHA}`}>{c.assunto || c.referencia}</span>
                <span className={`block ${SUB}`}>{c.referencia} · {ROTULO_CASO[c.estado] ?? c.estado}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <VerTudo href={href("/contabilista/casos")} />
    </div>
  );
}

/**
 * Comunicações recentes — QUEM e QUANDO, nunca o corpo.
 *
 * `contabilista_mensagens` é privada às duas partes do vínculo. Mostrar o
 * conteúdo num painel que pode estar aberto num ecrã partilhado é uma
 * fuga que ninguém pediu; o conteúdo abre na conversa.
 */
function ComunicacoesRecentes({ densidade, broker, href }: PropsDoWidget) {
  const notas = ler(broker, "mensagens");
  if (!notas) return null;
  const lista = (notas as Notificacao[]).slice(
    0, quantos(densidade, { compact: 2, normal: 4, expanded: 7, full: 10 }),
  );
  if (lista.length === 0) return <CorpoVazio texto="Sem comunicações recentes." />;

  // A descrição deste módulo no registry promete que «o conteúdo abre na
  // conversa» — e não abria: as linhas não eram clicáveis e o `href` que
  // este componente recebe não era usado em lado nenhum. Um cartão que
  // mostra quem falou e não deixa responder é um beco.
  return (
    <div>
      <ul className="divide-y divide-stone-100 dark:divide-stone-800">
        {lista.map((n) => {
          const linha = (
            <>
              <span className="min-w-0 flex-1">
                <span className={`block ${TITULO_LINHA}`}>{n.titulo}</span>
                <span className={`block ${SUB}`}>{quando(n.criadoEm)}</span>
              </span>
              {!n.lidaEm && (
                <span aria-label="Por ler" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              )}
            </>
          );
          return (
            <li key={n.id}>
              {n.url ? (
                <Link
                  href={href(n.url)}
                  className={`${LINHA} focus-marca w-full rounded-lg hover:bg-stone-50 dark:hover:bg-white/[0.03]`}
                >
                  {linha}
                </Link>
              ) : (
                <span className={LINHA}>{linha}</span>
              )}
            </li>
          );
        })}
      </ul>
      <VerTudo href={href("/contabilista/clientes")} texto="Ver clientes" />
    </div>
  );
}

/**
 * O resumo por cliente.
 *
 * As contagens vêm agregadas do servidor (`resumo_clientes_do_contabilista`),
 * as mesmas que a página de clientes mostra. Antes eram recompostas aqui a
 * partir de `clientes` + `agenda`, e `agenda` é «de hoje em diante, de
 * qualquer estado»: a coluna «Consultas» contava a agenda futura — canceladas
 * incluídas — enquanto a página contava as realizadas. A mesma palavra, dois
 * números, e nenhuma forma de a pessoa saber qual acreditar.
 *
 * As tarefas continuam a vir de `trabalho`, porque «tarefas abertas» é
 * mesmo uma contagem de estado e não entra na agregação do resumo.
 */
function ResumoPorCliente({ densidade, broker, href }: PropsDoWidget) {
  const resumo = ler(broker, "resumo_clientes");
  const tarefas = ler(broker, "trabalho");
  if (!resumo) return null;

  const lista = resumo
    .filter((r) => r.vinculo.estado === "ativo")
    .slice(0, quantos(densidade, { compact: 3, normal: 5, expanded: 8, full: 12 }));

  if (lista.length === 0) return <CorpoVazio texto="Sem clientes ativos." />;

  // A última consulta só entra quando há largura para ela: o tamanho muda a
  // profundidade, não a escala (§8).
  const comUltima = densidade === "expanded" || densidade === "full";

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[22rem] text-left">
        <thead>
          <tr className="text-[0.5625rem] font-bold uppercase tracking-wide text-stone-400">
            <th scope="col" className="py-1 pr-2">Cliente</th>
            <th scope="col" className="py-1 pr-2 text-right">Tarefas</th>
            <th scope="col" className="py-1 text-right">Realizadas</th>
            {comUltima && <th scope="col" className="py-1 pl-2 text-right">Última</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
          {lista.map((r) => {
            const nTarefas = (tarefas ?? []).filter(
              (t: Tarefa) => t.vinculoId === r.vinculo.id && t.estado !== "entregue",
            ).length;
            return (
              <tr key={r.vinculo.id}>
                <td className="max-w-[10rem] truncate py-1.5 pr-2 text-xs font-medium text-stone-700">
                  {tratamentoDoCliente(r.vinculo)}
                </td>
                <td className="py-1.5 pr-2 text-right text-xs tabular-nums text-stone-500">{nTarefas}</td>
                <td className="py-1.5 text-right text-xs tabular-nums text-stone-500">
                  {r.consultasRealizadas}
                </td>
                {comUltima && (
                  <td className="py-1.5 pl-2 text-right text-[0.6875rem] tabular-nums text-stone-400">
                    {r.ultima ? quando(r.ultima) : "—"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <VerTudo href={href("/contabilista/clientes")} />
    </div>
  );
}

/* ================================================================== */
/* FID / PRG                                                           */
/* ================================================================== */

function Fidelidade({ broker, href }: PropsDoWidget) {
  const cartoes = ler(broker, "fidelidade");
  if (!cartoes) return null;
  const lista = cartoes as CartaoAberto[];
  if (lista.length === 0) return <CorpoVazio texto="Sem cartões em curso." />;

  const perto = [...lista]
    .map((c) => ({ ...c, p: progresso(c.carimbos, c.meta) }))
    .sort((a, b) => b.p.fracao - a.p.fracao)
    .slice(0, 3);

  return (
    <div>
      <p className="text-xs text-stone-500">
        <strong className="font-semibold text-ink tabular-nums">{lista.length}</strong>{" "}
        {lista.length === 1 ? "cartão em curso" : "cartões em curso"}
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {perto.map((c) => (
          <li key={c.clienteId}>
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[0.6875rem] text-stone-500">
                {c.carimbos} de {c.meta} · {c.descontoPct}%
              </span>
              <span className="shrink-0 text-[0.625rem] tabular-nums text-stone-400">
                {c.p.faltam === 0 ? "completo" : `faltam ${c.p.faltam}`}
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(c.p.fracao * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <VerTudo href={href("/contabilista/fidelidade")} texto="Ver fidelidade" />
    </div>
  );
}

/**
 * PRG — o widget da Progressão.
 *
 * ⚠️ Mostra a comissão e o próximo patamar, e mais nada. O Checkout NÃO
 * vive dentro de um widget: um pagamento iniciado a partir de um cartão
 * que se pode arrastar e redimensionar é a pior superfície possível para
 * uma decisão sobre dinheiro. A compra abre na superfície dedicada.
 */
function ProgressaoComissao({ broker, href }: PropsDoWidget) {
  const estado = ler(broker, "progressao");
  if (!estado) return null;
  const v = vistaProgressao(estado as EstadoProgressao);

  return (
    <div>
      <p className="flex items-baseline gap-1.5">
        <span className="font-display text-3xl leading-none text-ink tabular-nums">
          {formatarComissao(v.atual.comissaoBps).replace("%", "")}
        </span>
        <span className="font-display text-lg leading-none text-stone-400">%</span>
        <span className="ml-auto text-[0.625rem] font-semibold text-stone-400">
          {v.atual.titulo} · {v.efetivo} de 6
        </span>
      </p>
      <p className="mt-1 text-[0.6875rem] text-stone-500">de comissão atual</p>

      {v.proximo && (
        <>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.round(v.progressoNoIntervalo * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[0.6875rem] text-stone-500">
            Faltam <strong className="font-semibold text-ink tabular-nums">{v.xpEmFalta} XP</strong>{" "}
            para {formatarComissao(v.proximo.comissaoBps)}.
          </p>
        </>
      )}
      <VerTudo href={href("/contabilista/progressao")} texto="Ver progressão" />
    </div>
  );
}

/* ================================================================== */
/* O mapa                                                              */
/* ================================================================== */

type Componente = (p: PropsDoWidget) => React.ReactElement | null;

const CORPOS: Record<WidgetType, Componente> = {
  agenda_hoje: AgendaHoje,
  precisam_atencao: PrecisamAtencao,
  prazos_proximos: PrazosProximos,
  partilhas_recebidas: (p) => <ListaDePartilhas {...p} apenasSimulacoes={false} />,
  simulacoes_recebidas: (p) => <ListaDePartilhas {...p} apenasSimulacoes />,
  documentos_rever: DocumentosRever,
  atividade_semana: AtividadeSemana,
  centro_avisos: CentroAvisos,
  estado_trabalho: EstadoTrabalho,
  clientes: Clientes,
  casos: (p) => <ListaDeCasos {...p} soEmRisco={false} />,
  fidelidade: Fidelidade,
  progressao_comissao: ProgressaoComissao,
  casos_em_risco: (p) => <ListaDeCasos {...p} soEmRisco />,
  comunicacoes_recentes: ComunicacoesRecentes,
  resumo_por_cliente: ResumoPorCliente,
};

/** O corpo de um módulo, escolhido pelo tipo e pela geometria. */
export default function CorpoDoModulo({
  type, colSpan, rowSpan, broker, href,
}: {
  type: WidgetType;
  colSpan: number;
  rowSpan: number;
  broker: Broker;
  /**
   * Não é lida aqui — existe para o `memo` de `GrelhaEdicao` ver que algo
   * mudou. Os widgets leem o broker imperativamente e por isso nenhuma
   * outra prop se mexe quando os dados chegam. Removê-la volta a congelar
   * os módulos em modo de edição.
   */
  versao?: number;
  href: (destino: string) => string;
}) {
  const Corpo = CORPOS[type];
  const densidade = densidadeDe(colSpan, rowSpan);
  return <Corpo type={type} densidade={densidade} broker={broker} href={href} />;
}

export { MODULOS };
