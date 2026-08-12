// ═══════════════════════════════════════════════════════════════════════
//  AGENDA — geração de horários livres, pura e determinística
//  ---------------------------------------------------------------------
//  O contabilista descreve a semana-tipo (`RegraDisponibilidade`), fecha dias
//  concretos (`Excecao`), e este módulo devolve os slots que sobram depois de
//  retirar o que já está marcado.
//
//  ⚠️ O que este módulo NÃO garante: que dois clientes não marcam o mesmo
//  horário. Entre ler os slots e gravar o agendamento passa tempo, e nesse
//  intervalo cabe outra pessoa. Essa garantia vive na base de dados, na
//  restrição de exclusão GIST de `agendamentos` (migração 042) — a segunda
//  transação falha ao escrever, não numa verificação que correu antes.
//  Aqui trata-se de não MOSTRAR horários ocupados; lá trata-se de não os
//  DEIXAR ocupar duas vezes. São problemas diferentes.
//
//  Fuso: Portugal continental muda a hora duas vezes por ano. «09:00» é uma
//  hora de parede, não um instante, e converter uma pela outra sem olhar ao
//  calendário engana-se em 60 minutos durante metade do ano.
// ═══════════════════════════════════════════════════════════════════════

export const FUSO_PT = "Europe/Lisbon";

/** Antecedência mínima, em horas, entre agora e o início de um slot. */
export const ANTECEDENCIA_MIN_HORAS = 12;

/** Até quantos dias para a frente a agenda pública mostra horários. */
export const JANELA_MAX_DIAS = 60;

export interface RegraDisponibilidade {
  /** 0 = domingo … 6 = sábado, no fuso do contabilista. */
  diaSemana: number;
  /** Hora de parede "HH:MM". */
  inicio: string;
  fim: string;
  /** Duração de cada consulta, em minutos. */
  duracaoMin: number;
  /** Pausa entre consultas, em minutos. */
  intervaloMin?: number;
}

export interface Excecao {
  /** Data local "AAAA-MM-DD". */
  data: string;
  /** Sem horas = dia inteiro fechado. Com horas = só aquele bocado. */
  inicio?: string;
  fim?: string;
  motivo?: string;
}

export interface Intervalo {
  /** Instantes ISO 8601. */
  inicio: string;
  fim: string;
}

export interface Slot {
  /** Instante ISO 8601 (UTC) — o que vai para a base de dados. */
  inicio: string;
  fim: string;
  /** Data local "AAAA-MM-DD", para agrupar por dia na interface. */
  dia: string;
  /** Hora de parede "HH:MM", para mostrar. */
  hora: string;
}

// ─── Fuso horário ──────────────────────────────────────────────────────

interface PartesLocais {
  ano: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  diaSemana: number;
}

const FORMATADORES = new Map<string, Intl.DateTimeFormat>();

function formatador(tz: string): Intl.DateTimeFormat {
  let f = FORMATADORES.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    FORMATADORES.set(tz, f);
  }
  return f;
}

const DIAS_CURTOS: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Decompõe um instante nas partes do relógio de parede de um fuso. */
export function partesLocais(instante: Date, tz: string = FUSO_PT): PartesLocais {
  const partes = formatador(tz).formatToParts(instante);
  const obter = (t: string) => partes.find((p) => p.type === t)?.value ?? "0";
  return {
    ano: Number(obter("year")),
    mes: Number(obter("month")),
    dia: Number(obter("day")),
    hora: Number(obter("hour")),
    minuto: Number(obter("minute")),
    diaSemana: DIAS_CURTOS[obter("weekday")] ?? 0,
  };
}

/** Desvio do fuso, em minutos, no instante dado. */
function desvioMinutos(instante: Date, tz: string): number {
  const p = partesLocais(instante, tz);
  const comoUTC = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto, 0);
  // Segundos e milissegundos não entram: o desvio é sempre múltiplo de minutos.
  const base = Math.floor(instante.getTime() / 60000) * 60000;
  return (comoUTC - base) / 60000;
}

/**
 * Converte uma hora de parede num instante.
 *
 * Duas passagens de propósito: o desvio depende do instante, e o instante
 * depende do desvio. A primeira estimativa pode cair do lado errado de uma
 * mudança de hora; a segunda corrige-a.
 */
export function instanteDeLocal(
  ano: number,
  mes: number,
  dia: number,
  hora: number,
  minuto: number,
  tz: string = FUSO_PT
): Date {
  const ingenuo = Date.UTC(ano, mes - 1, dia, hora, minuto, 0);
  let desvio = desvioMinutos(new Date(ingenuo), tz);
  let t = ingenuo - desvio * 60000;
  desvio = desvioMinutos(new Date(t), tz);
  t = ingenuo - desvio * 60000;
  return new Date(t);
}

/** "AAAA-MM-DD" no fuso indicado. */
export function diaLocal(instante: Date, tz: string = FUSO_PT): string {
  const p = partesLocais(instante, tz);
  return `${p.ano}-${String(p.mes).padStart(2, "0")}-${String(p.dia).padStart(2, "0")}`;
}

/** "HH:MM" no fuso indicado. */
export function horaLocal(instante: Date, tz: string = FUSO_PT): string {
  const p = partesLocais(instante, tz);
  return `${String(p.hora).padStart(2, "0")}:${String(p.minuto).padStart(2, "0")}`;
}

/** "09:30" → 570 minutos. Devolve `null` se não for uma hora válida. */
export function minutosDeHora(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

// ─── Geração de slots ──────────────────────────────────────────────────

export interface OpcoesSlots {
  regras: RegraDisponibilidade[];
  excecoes?: Excecao[];
  /** Agendamentos que já ocupam a agenda. */
  ocupados?: Intervalo[];
  /** Início da janela de pesquisa. */
  de: Date;
  /** Fim da janela (inclusive, pelo dia local). */
  ate: Date;
  /** Instante de referência — injetado para o teste ser determinístico. */
  agora?: Date;
  antecedenciaHoras?: number;
  tz?: string;
}

function sobrepoe(aInicio: number, aFim: number, bInicio: number, bFim: number): boolean {
  return aInicio < bFim && bInicio < aFim;
}

/**
 * Devolve os horários livres, ordenados. Determinística: as mesmas entradas
 * dão sempre a mesma lista, o que a torna testável e auditável.
 */
export function gerarSlots(o: OpcoesSlots): Slot[] {
  const tz = o.tz ?? FUSO_PT;
  const agora = o.agora ?? new Date();
  const antecedencia = (o.antecedenciaHoras ?? ANTECEDENCIA_MIN_HORAS) * 3600_000;
  const limiteInferior = agora.getTime() + antecedencia;

  const ocupados = (o.ocupados ?? []).map((i) => ({
    inicio: Date.parse(i.inicio),
    fim: Date.parse(i.fim),
  })).filter((i) => Number.isFinite(i.inicio) && Number.isFinite(i.fim));

  // Exceções indexadas por dia. Um dia pode ter várias.
  const excecoesPorDia = new Map<string, Excecao[]>();
  for (const e of o.excecoes ?? []) {
    const lista = excecoesPorDia.get(e.data) ?? [];
    lista.push(e);
    excecoesPorDia.set(e.data, lista);
  }

  const regrasPorDia = new Map<number, RegraDisponibilidade[]>();
  for (const r of o.regras) {
    if (r.diaSemana < 0 || r.diaSemana > 6) continue;
    if (!Number.isFinite(r.duracaoMin) || r.duracaoMin <= 0) continue;
    const lista = regrasPorDia.get(r.diaSemana) ?? [];
    lista.push(r);
    regrasPorDia.set(r.diaSemana, lista);
  }

  const slots: Slot[] = [];
  const primeiro = partesLocais(o.de, tz);
  const ultimoDia = diaLocal(o.ate, tz);

  // Percorre dias de calendário LOCAIS. Somar 24 h a um instante salta um dia
  // nas mudanças de hora; somar 1 ao número do dia não.
  let cursor = { ano: primeiro.ano, mes: primeiro.mes, dia: primeiro.dia };

  for (let i = 0; i <= JANELA_MAX_DIAS; i++) {
    const dia = `${cursor.ano}-${String(cursor.mes).padStart(2, "0")}-${String(cursor.dia).padStart(2, "0")}`;
    if (dia > ultimoDia) break;

    // O dia da semana lê-se do meio-dia local: às 00:00 uma mudança de hora
    // pode empurrar o instante para o dia anterior.
    const meioDia = instanteDeLocal(cursor.ano, cursor.mes, cursor.dia, 12, 0, tz);
    const diaSemana = partesLocais(meioDia, tz).diaSemana;

    const excecoes = excecoesPorDia.get(dia) ?? [];
    const diaInteiroFechado = excecoes.some((e) => !e.inicio || !e.fim);

    if (!diaInteiroFechado) {
      for (const regra of regrasPorDia.get(diaSemana) ?? []) {
        const inicioMin = minutosDeHora(regra.inicio);
        const fimMin = minutosDeHora(regra.fim);
        if (inicioMin === null || fimMin === null || fimMin <= inicioMin) continue;

        const passo = regra.duracaoMin + Math.max(0, regra.intervaloMin ?? 0);

        for (let m = inicioMin; m + regra.duracaoMin <= fimMin; m += passo) {
          const inicio = instanteDeLocal(
            cursor.ano, cursor.mes, cursor.dia,
            Math.floor(m / 60), m % 60, tz
          );
          const fim = new Date(inicio.getTime() + regra.duracaoMin * 60000);

          if (inicio.getTime() < limiteInferior) continue;

          const chocaOcupado = ocupados.some((oc) =>
            sobrepoe(inicio.getTime(), fim.getTime(), oc.inicio, oc.fim)
          );
          if (chocaOcupado) continue;

          const chocaExcecao = excecoes.some((e) => {
            const eIni = e.inicio ? minutosDeHora(e.inicio) : null;
            const eFim = e.fim ? minutosDeHora(e.fim) : null;
            if (eIni === null || eFim === null) return false;
            return sobrepoe(m, m + regra.duracaoMin, eIni, eFim);
          });
          if (chocaExcecao) continue;

          slots.push({
            inicio: inicio.toISOString(),
            fim: fim.toISOString(),
            dia,
            hora: horaLocal(inicio, tz),
          });
        }
      }
    }

    // Avança um dia de calendário.
    const seguinte = new Date(Date.UTC(cursor.ano, cursor.mes - 1, cursor.dia + 1));
    cursor = {
      ano: seguinte.getUTCFullYear(),
      mes: seguinte.getUTCMonth() + 1,
      dia: seguinte.getUTCDate(),
    };
  }

  slots.sort((a, b) => a.inicio.localeCompare(b.inicio));
  // Duas regras no mesmo dia podem gerar o mesmo início; o cliente vê um só.
  return slots.filter((s, i, arr) => i === 0 || arr[i - 1].inicio !== s.inicio);
}

/** Agrupa os slots por dia local, preservando a ordem. */
export function agruparPorDia(slots: Slot[]): { dia: string; slots: Slot[] }[] {
  const mapa = new Map<string, Slot[]>();
  for (const s of slots) {
    const lista = mapa.get(s.dia) ?? [];
    lista.push(s);
    mapa.set(s.dia, lista);
  }
  return [...mapa.entries()].map(([dia, lista]) => ({ dia, slots: lista }));
}

/** "sábado, 15 de agosto" — o rótulo de um dia, em pt-PT. */
export function rotularDia(dia: string, tz: string = FUSO_PT): string {
  const [a, m, d] = dia.split("-").map(Number);
  const instante = instanteDeLocal(a, m, d, 12, 0, tz);
  return new Intl.DateTimeFormat("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: tz,
  }).format(instante);
}

/**
 * «daqui a 3 horas», «amanhã», «daqui a 5 dias» — ou «a decorrer».
 *
 * Uma data por extenso obriga a pessoa a fazer a conta de cabeça. Isto
 * responde à pergunta que ela está mesmo a fazer, que é «tenho de me
 * despachar?». Puro e com `agora` injetável, para ser testável.
 */
export function tempoAte(inicioISO: string, agora: Date = new Date()): string {
  const minutos = Math.round((new Date(inicioISO).getTime() - agora.getTime()) / 60_000);
  if (minutos <= 0) return "a decorrer";
  if (minutos < 60) return `daqui a ${minutos} min`;

  const horas = Math.round(minutos / 60);
  if (horas < 24) return `daqui a ${horas} ${horas === 1 ? "hora" : "horas"}`;

  const dias = Math.round(horas / 24);
  if (dias === 1) return "amanhã";
  return `daqui a ${dias} dias`;
}

/** A semana-tipo por omissão de um perfil novo: dias úteis, 09–13 e 14–18. */
export function disponibilidadePorOmissao(duracaoMin = 60): RegraDisponibilidade[] {
  const regras: RegraDisponibilidade[] = [];
  for (let d = 1; d <= 5; d++) {
    regras.push({ diaSemana: d, inicio: "09:00", fim: "13:00", duracaoMin });
    regras.push({ diaSemana: d, inicio: "14:00", fim: "18:00", duracaoMin });
  }
  return regras;
}

export const NOMES_DIAS = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado",
] as const;
