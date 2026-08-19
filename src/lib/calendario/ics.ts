// ═══════════════════════════════════════════════════════════════════════
//  ICS — o calendário que os outros calendários sabem ler
//  ---------------------------------------------------------------------
//  RFC 5545. Não há aqui nenhuma dependência nova, e é de propósito: o
//  formato são linhas de texto com regras chatas mas curtas, e uma
//  biblioteca para as escrever traria mais superfície do que resolve.
//
//  As regras que se seguem à risca, porque são as que partem calendários
//  quando se ignoram:
//
//   1. TERMINADOR CRLF. `\r\n`, sempre. O Outlook recusa ficheiros com
//      `\n` sozinho — não avisa, não abre.
//
//   2. DOBRA A 75 OCTETOS. Uma linha mais longa dobra-se, e a continuação
//      começa por um espaço. Conta-se em OCTETOS e não em caracteres: um
//      «ç» ocupa dois, e cortar a meio de um deles produz um ficheiro
//      inválido que o Google aceita e o Apple rejeita.
//
//   3. ESCAPE. Vírgula, ponto e vírgula e barra invertida têm significado;
//      a mudança de linha escreve-se `\n` literal. A ORDEM importa: a
//      barra invertida escapa-se primeiro, senão escapam-se as barras que
//      o próprio escape acabou de pôr.
//
//   4. TUDO EM UTC. Emite-se `...Z` e não se emite VTIMEZONE. Um bloco
//      VTIMEZONE mal escrito engana-se em 60 minutos durante metade do
//      ano; um instante em UTC não tem como se enganar, e é o calendário
//      de quem lê que o mostra na hora de parede certa.
//
//  O QUE ESTE MÓDULO NÃO FAZ
//  -------------------------
//  Não lê calendários de ninguém. A sincronização é de um sentido só —
//  daqui para fora. Ler o Google Calendar de alguém exigia OAuth, um
//  segredo do lado do servidor e acesso a tudo o que a pessoa tem na
//  agenda, incluindo o que não tem nada a ver com isto. Publicar um feed
//  que os calendários subscrevem dá o mesmo resultado prático sem pedir
//  nada disso.
// ═══════════════════════════════════════════════════════════════════════

export const CRLF = "\r\n";

/** Estados que um calendário externo entende. */
export type EstadoEvento = "confirmado" | "provisorio" | "cancelado";

export interface EventoICS {
  /** Estável e único. O mesmo evento tem de trazer sempre o mesmo. */
  uid: string;
  inicio: Date;
  fim: Date;
  titulo: string;
  descricao?: string;
  /** Morada, ou o endereço da chamada. */
  local?: string;
  /** Coordenadas, quando existem. Abrem o ponto certo no telemóvel. */
  lat?: number | null;
  lng?: number | null;
  estado?: EstadoEvento;
  /**
   * Sobe a cada alteração. Sem isto, o calendário que já viu o evento
   * ignora a versão nova — e a consulta fica na agenda à hora antiga.
   */
  sequencia?: number;
  /** Minutos antes para o alarme. Omitido = sem alarme. */
  alarmeMin?: number | null;
  criadoEm?: Date;
  atualizadoEm?: Date;
}

export interface OpcoesCalendario {
  /** O nome que aparece na lista de calendários de quem subscreve. */
  nome: string;
  descricao?: string;
  /** De quanto em quanto tempo se pede que voltem a ler. Em minutos. */
  atualizarACadaMin?: number;
}

/* ── As regras chatas, uma a uma ───────────────────────────────────── */

/**
 * Escapa um valor de texto.
 *
 * A barra invertida vem primeiro. Trocar a ordem faz com que o `\` que
 * este escape acabou de inserir seja escapado outra vez — e o resultado
 * é `\\n` onde devia estar `\n`.
 */
export function escaparTexto(v: string): string {
  return v
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Dobra uma linha a 75 octetos, contando em octetos e não em caracteres.
 *
 * O corte nunca cai a meio de um caractere multibyte: mede-se o tamanho
 * codificado de cada caractere antes de o acrescentar. Um «ç» que não
 * caiba nos octetos que sobram passa inteiro para a linha seguinte.
 */
export function dobrarLinha(linha: string, limite = 75): string {
  const bytes = (c: string) => new TextEncoder().encode(c).length;
  if (new TextEncoder().encode(linha).length <= limite) return linha;

  const partes: string[] = [];
  let atual = "";
  let conta = 0;
  // A continuação gasta um octeto com o espaço inicial.
  let tecto = limite;

  for (const c of linha) {
    const n = bytes(c);
    if (conta + n > tecto) {
      partes.push(atual);
      atual = c;
      conta = n;
      tecto = limite - 1;
    } else {
      atual += c;
      conta += n;
    }
  }
  if (atual) partes.push(atual);

  return partes[0] + partes.slice(1).map((p) => `${CRLF} ${p}`).join("");
}

/** «20260819T090000Z» — o instante, em UTC. */
export function instanteUTC(d: Date): string {
  const p = (n: number, casas = 2) => String(n).padStart(casas, "0");
  return (
    `${p(d.getUTCFullYear(), 4)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

const ESTADO_ICS: Record<EstadoEvento, string> = {
  confirmado: "CONFIRMED",
  provisorio: "TENTATIVE",
  cancelado: "CANCELLED",
};

/* ── O calendário ──────────────────────────────────────────────────── */

function linhasDoEvento(e: EventoICS, agora: Date): string[] {
  const l: string[] = ["BEGIN:VEVENT"];

  l.push(`UID:${e.uid}`);
  l.push(`DTSTAMP:${instanteUTC(e.atualizadoEm ?? agora)}`);
  l.push(`DTSTART:${instanteUTC(e.inicio)}`);
  l.push(`DTEND:${instanteUTC(e.fim)}`);
  l.push(`SUMMARY:${escaparTexto(e.titulo)}`);

  if (e.descricao) l.push(`DESCRIPTION:${escaparTexto(e.descricao)}`);
  if (e.local) l.push(`LOCATION:${escaparTexto(e.local)}`);

  // GEO exige as duas. Meia coordenada é um ponto no mar.
  if (typeof e.lat === "number" && typeof e.lng === "number") {
    l.push(`GEO:${e.lat.toFixed(6)};${e.lng.toFixed(6)}`);
  }

  l.push(`STATUS:${ESTADO_ICS[e.estado ?? "confirmado"]}`);
  l.push(`SEQUENCE:${Math.max(0, Math.trunc(e.sequencia ?? 0))}`);
  if (e.criadoEm) l.push(`CREATED:${instanteUTC(e.criadoEm)}`);
  if (e.atualizadoEm) l.push(`LAST-MODIFIED:${instanteUTC(e.atualizadoEm)}`);

  // Um evento cancelado com alarme toca para avisar de uma coisa que não
  // vai acontecer. Por isso o alarme só entra no que continua de pé.
  if (e.alarmeMin != null && e.alarmeMin > 0 && e.estado !== "cancelado") {
    l.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escaparTexto(e.titulo)}`,
      `TRIGGER:-PT${Math.trunc(e.alarmeMin)}M`,
      "END:VALARM",
    );
  }

  l.push("END:VEVENT");
  return l;
}

/**
 * Monta o ficheiro inteiro.
 *
 * `agora` é injetado para o teste ser determinístico: um `DTSTAMP` com a
 * hora do relógio torna a saída diferente a cada execução, e um teste que
 * compara texto passa a ser impossível de escrever.
 */
export function construirCalendario(
  eventos: EventoICS[],
  o: OpcoesCalendario,
  agora: Date = new Date(),
): string {
  const linhas: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Recibo Certo//Agenda//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escaparTexto(o.nome)}`,
  ];

  if (o.descricao) linhas.push(`X-WR-CALDESC:${escaparTexto(o.descricao)}`);

  // As duas dizem a mesma coisa a leitores diferentes: `REFRESH-INTERVAL`
  // é a norma, `X-PUBLISHED-TTL` é o que o Outlook lê. É uma sugestão nos
  // dois casos — o Google relê quando lhe apetece, e não há como o obrigar.
  if (o.atualizarACadaMin && o.atualizarACadaMin > 0) {
    const m = Math.trunc(o.atualizarACadaMin);
    linhas.push(`REFRESH-INTERVAL;VALUE=DURATION:PT${m}M`);
    linhas.push(`X-PUBLISHED-TTL:PT${m}M`);
  }

  for (const e of eventos) linhas.push(...linhasDoEvento(e, agora));
  linhas.push("END:VCALENDAR");

  return linhas.map((l) => dobrarLinha(l)).join(CRLF) + CRLF;
}

/* ── Ligações de adição rápida ─────────────────────────────────────── */

/** «20260819T090000Z», sem separadores — o que o Google espera no URL. */
function paraGoogle(d: Date): string {
  return instanteUTC(d);
}

/**
 * O URL que abre o Google Calendar com o evento já preenchido.
 *
 * Não é sincronização: é uma cópia, feita no instante em que se carrega.
 * Se a consulta mudar de hora, aquela cópia não muda com ela — e é por
 * isso que a interface oferece isto AO LADO da subscrição, e não em vez
 * dela.
 */
export function linkGoogle(e: EventoICS): string {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.titulo,
    dates: `${paraGoogle(e.inicio)}/${paraGoogle(e.fim)}`,
  });
  if (e.descricao) p.set("details", e.descricao);
  if (e.local) p.set("location", e.local);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** O equivalente no Outlook web. */
export function linkOutlook(e: EventoICS): string {
  const p = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: e.titulo,
    startdt: e.inicio.toISOString(),
    enddt: e.fim.toISOString(),
  });
  if (e.descricao) p.set("body", e.descricao);
  if (e.local) p.set("location", e.local);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p.toString()}`;
}

/**
 * O endereço de subscrição, no esquema `webcal:`.
 *
 * É o mesmo URL com outro esquema, e é isso que faz a diferença: com
 * `https` o telemóvel descarrega um ficheiro e importa uma cópia morta;
 * com `webcal` o iOS e o macOS oferecem-se para SUBSCREVER, que é o que
 * mantém a agenda em dia.
 */
export function linkWebcal(urlHttps: string): string {
  return urlHttps.replace(/^https?:\/\//, "webcal://");
}
