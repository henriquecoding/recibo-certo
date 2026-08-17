// ═══════════════════════════════════════════════════════════════════════
//  ONDE É A CONSULTA — o canal, não a frase
//  ---------------------------------------------------------------------
//  Uma consulta acontece nalgum sítio. Esse sítio é uma sala com uma porta
//  ou uma sala com um endereço, e nos dois casos a pergunta do cliente é a
//  mesma: «como é que eu chego lá?».
//
//  Até aqui a resposta era uma linha de texto que o contabilista escrevia à
//  mão e o cliente lia. Isso funciona para um link — clica-se e chega-se —
//  e falha para tudo o resto. «Rua de exemplo, 1 · Matosinhos» não abre em
//  lado nenhum, não sobrevive a uma gralha e obriga o cliente a fazer o
//  trabalho de adivinhar a que Matosinhos.
//
//  Este módulo é a gramática dessa resposta, e é puro de propósito: as
//  regras de o que é um link válido, de que plataforma é, e de como se
//  transforma um ponto num mapa que abre no telemóvel de qualquer pessoa
//  têm de ser testáveis sem montar um mapa.
//
//  ⚠️ A validação daqui NÃO é a fronteira de segurança. A base recusa
//  markup e esquemas executáveis em `local_ou_ligacao` desde a migração
//  `20260814181500_texto_seguro_painel_contabilista`. Aqui repete-se a
//  regra para dar resposta imediata a quem está a escrever — e porque um
//  campo que aceita `javascript:` e só se queixa depois de gravar é um
//  campo mal feito, mesmo quando a gravação falha.
// ═══════════════════════════════════════════════════════════════════════

/** O que o contabilista tem de preencher, conforme a modalidade. */
export type TipoCanal = "video" | "telefone" | "presencial";

/** Limite da coluna `local_ou_ligacao` (migração 042). */
export const MAX_LOCAL = 500;

// ─── Plataformas de videochamada ───────────────────────────────────────

export interface Plataforma {
  id: string;
  nome: string;
  /** Sufixos de domínio que a identificam sem margem para dúvida. */
  dominios: string[];
  /** O que mostrar por baixo do campo enquanto está vazio. */
  exemplo: string;
}

/**
 * O catálogo é fechado, e isso é uma escolha.
 *
 * Reconhecer a plataforma serve para duas coisas: dizer ao cliente onde vai
 * entrar antes de ele clicar, e apanhar o link errado antes de ele ser
 * enviado. Nenhuma delas precisa de conhecer todas as plataformas do mundo
 * — precisam de conhecer estas, e de não mentir sobre as outras.
 */
export const PLATAFORMAS: readonly Plataforma[] = [
  { id: "meet", nome: "Google Meet", dominios: ["meet.google.com"], exemplo: "https://meet.google.com/abc-defg-hij" },
  { id: "zoom", nome: "Zoom", dominios: ["zoom.us", "zoom.com"], exemplo: "https://zoom.us/j/000000000" },
  { id: "teams", nome: "Microsoft Teams", dominios: ["teams.microsoft.com", "teams.live.com"], exemplo: "https://teams.microsoft.com/l/meetup-join/…" },
  { id: "whereby", nome: "Whereby", dominios: ["whereby.com"], exemplo: "https://whereby.com/a-tua-sala" },
  { id: "jitsi", nome: "Jitsi Meet", dominios: ["meet.jit.si", "jitsi.org"], exemplo: "https://meet.jit.si/a-tua-sala" },
  { id: "webex", nome: "Webex", dominios: ["webex.com"], exemplo: "https://empresa.webex.com/meet/…" },
  { id: "skype", nome: "Skype", dominios: ["skype.com", "join.skype.com"], exemplo: "https://join.skype.com/…" },
] as const;

/** A plataforma de um link, ou `null` se não for nenhuma das conhecidas. */
export function plataformaDoLink(bruto: string): Plataforma | null {
  const anfitriao = anfitriaoDe(bruto);
  if (!anfitriao) return null;
  return (
    PLATAFORMAS.find((p) =>
      p.dominios.some((d) => anfitriao === d || anfitriao.endsWith(`.${d}`))
    ) ?? null
  );
}

function anfitriaoDe(bruto: string): string | null {
  try {
    return new URL(bruto.trim()).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

// ─── Validação de uma ligação ──────────────────────────────────────────

export interface LigacaoExaminada {
  /** O link normalizado, pronto a gravar. Vazio quando não é utilizável. */
  valor: string;
  /** Impede a gravação e explica porquê. */
  erro: string | null;
  /** Deixa gravar, mas o cliente merece saber. */
  aviso: string | null;
  plataforma: Plataforma | null;
}

const ESQUEMAS_PROIBIDOS = /^\s*(javascript|vbscript|data|file|blob)\s*:/i;

/**
 * Examina o que foi escrito no campo da ligação.
 *
 * Aceita o que as pessoas escrevem mesmo — «meet.google.com/abc» sem
 * esquema — e devolve-o completo. Recusa o que não é uma morada de rede, e
 * avisa sobre `http://`, que num link de chamada é quase sempre um engano
 * de quem copiou de um sítio antigo.
 */
export function examinarLigacao(bruto: string): LigacaoExaminada {
  const texto = bruto.trim();
  const vazio: LigacaoExaminada = { valor: "", erro: null, aviso: null, plataforma: null };
  if (!texto) return vazio;

  if (ESQUEMAS_PROIBIDOS.test(texto)) {
    return { ...vazio, erro: "Isso não é um endereço de chamada." };
  }
  if (/[<>{}]/.test(texto)) {
    return { ...vazio, erro: "O endereço não pode conter código nem sinais de marcação." };
  }

  // Sem esquema, assume-se o seguro. Ninguém escreve o «https://» de cor.
  const comEsquema = /^[a-z][a-z0-9+.-]*:/i.test(texto) ? texto : `https://${texto}`;

  let url: URL;
  try {
    url = new URL(comEsquema);
  } catch {
    return { ...vazio, erro: "Não parece um endereço válido. Copia o link da sala da chamada." };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ...vazio, erro: "Só se aceitam endereços http(s)." };
  }
  // Um anfitrião sem ponto é «localhost» ou uma palavra solta: o cliente
  // clicava e não ia a lado nenhum.
  if (!url.hostname.includes(".")) {
    return { ...vazio, erro: "Falta o domínio. Copia o link inteiro da sala." };
  }
  if (url.href.length > MAX_LOCAL) {
    return { ...vazio, erro: `O endereço é demasiado longo (máximo ${MAX_LOCAL} caracteres).` };
  }

  return {
    valor: url.href,
    erro: null,
    aviso:
      url.protocol === "http:"
        ? "Este endereço não é seguro (http). Confirma que copiaste o link certo."
        : null,
    plataforma: plataformaDoLink(url.href),
  };
}

// ─── Telefone ──────────────────────────────────────────────────────────

/**
 * Um número que se possa marcar, escrito como se lê.
 *
 * Não valida o país nem o operador: valida que há dígitos suficientes para
 * ser um número e nenhum caractere que não pertença a um. Um número
 * português sem indicativo recebe o `+351` — é o que torna o link `tel:`
 * marcável a partir de fora do país.
 */
export function examinarTelefone(bruto: string): { valor: string; erro: string | null } {
  const texto = bruto.trim();
  if (!texto) return { valor: "", erro: null };
  if (!/^[+()\d\s.-]+$/.test(texto)) {
    return { valor: "", erro: "Um número de telefone só tem dígitos, espaços e o sinal +." };
  }

  const digitos = texto.replace(/[^\d+]/g, "");
  const nacional = digitos.replace(/^\+?351/, "");
  if (!digitos.startsWith("+") && nacional.length !== 9) {
    return { valor: "", erro: "Um número português tem nove dígitos. Com indicativo de outro país, começa com +." };
  }
  if (digitos.replace(/\D/g, "").length < 6) {
    return { valor: "", erro: "Faltam dígitos neste número." };
  }

  return { valor: digitos.startsWith("+") ? digitos : `+351${nacional}`, erro: null };
}

/** «+351 912 345 678» — o mesmo número, legível. */
export function formatarTelefone(numero: string): string {
  const pt = /^\+351(\d{9})$/.exec(numero);
  if (pt) return `+351 ${pt[1].slice(0, 3)} ${pt[1].slice(3, 6)} ${pt[1].slice(6)}`;
  return numero;
}

/** Prefixo que marca um local como número de telefone dentro do campo. */
export const PREFIXO_TEL = "tel:";

export function ehTelefone(local: string): boolean {
  return local.trim().toLowerCase().startsWith(PREFIXO_TEL);
}

export function numeroDe(local: string): string {
  return local.trim().slice(PREFIXO_TEL.length);
}

// ─── Morada verificada ─────────────────────────────────────────────────

export interface PontoNoMapa {
  lat: number;
  lng: number;
}

/**
 * Coordenadas que existem à face da Terra, e não no meio do Atlântico por
 * distração. O ponto (0, 0) é rejeitado de propósito: é o que sai de um
 * campo por preencher, e fica a 500 km da costa da Guiné.
 */
export function pontoValido(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" && typeof lng === "number" &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/** Caixa que contém Portugal continental, Açores e Madeira, com folga. */
const CAIXA_PT = { latMin: 29.5, latMax: 42.5, lngMin: -32.5, lngMax: -5.5 };

export function dentroDePortugal(p: PontoNoMapa): boolean {
  return (
    p.lat >= CAIXA_PT.latMin && p.lat <= CAIXA_PT.latMax &&
    p.lng >= CAIXA_PT.lngMin && p.lng <= CAIXA_PT.lngMax
  );
}

/** «41,16532, -8,65241» — cinco casas chegam para acertar na porta. */
export function formatarCoordenadas(p: PontoNoMapa): string {
  const n = (v: number) => v.toFixed(5).replace(".", ",");
  return `${n(p.lat)}, ${n(p.lng)}`;
}

/**
 * Os sítios para onde se pode mandar quem quer ir lá ter.
 *
 * Com ponto, o destino é o ponto: a aplicação de mapas abre exatamente onde
 * o contabilista pôs o pino, sem voltar a interpretar a morada. Sem ponto
 * (linhas anteriores à migração do local verificado), sobra a pesquisa pelo
 * texto — que é o que se tinha antes, e é honesto dizê-lo na interface.
 */
export function ligacoesDeMapa(
  morada: string,
  ponto: PontoNoMapa | null
): { google: string; apple: string; osm: string; exato: boolean } {
  if (ponto && pontoValido(ponto.lat, ponto.lng)) {
    const c = `${ponto.lat},${ponto.lng}`;
    return {
      google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c)}`,
      apple: `https://maps.apple.com/?ll=${encodeURIComponent(c)}&q=${encodeURIComponent(morada || "Consulta")}`,
      osm: `https://www.openstreetmap.org/?mlat=${ponto.lat}&mlon=${ponto.lng}#map=18/${ponto.lat}/${ponto.lng}`,
      exato: true,
    };
  }
  const q = encodeURIComponent(morada);
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${q}`,
    apple: `https://maps.apple.com/?q=${q}`,
    osm: `https://www.openstreetmap.org/search?query=${q}`,
    exato: false,
  };
}

// ─── O local, lido de uma consulta ─────────────────────────────────────

export interface LocalDaConsulta {
  tipo: TipoCanal;
  /** O texto que se grava e que o cliente lê. */
  texto: string;
  ponto: PontoNoMapa | null;
  plataforma: Plataforma | null;
  /** Número já formatado, quando o canal é telefone. */
  telefone: string | null;
  /** Endereço clicável: o link da chamada, ou `tel:`. */
  ligacao: string | null;
}

/**
 * Lê o que está guardado e diz o que é.
 *
 * A modalidade manda: uma consulta presencial com um link no campo é um
 * erro de quem escreveu, não uma consulta online. O que este leitor faz é
 * não fingir que sabe mais do que sabe.
 */
export function lerLocal(
  modalidade: "presencial" | "online",
  local: string | null | undefined,
  lat?: number | null,
  lng?: number | null
): LocalDaConsulta | null {
  const texto = (local ?? "").trim();
  if (!texto) return null;

  if (modalidade === "online") {
    if (ehTelefone(texto)) {
      const numero = numeroDe(texto);
      return {
        tipo: "telefone",
        texto: formatarTelefone(numero),
        ponto: null,
        plataforma: null,
        telefone: formatarTelefone(numero),
        ligacao: `${PREFIXO_TEL}${numero}`,
      };
    }
    const exame = examinarLigacao(texto);
    return {
      tipo: "video",
      texto: exame.valor || texto,
      ponto: null,
      plataforma: exame.plataforma,
      telefone: null,
      // Um valor que não passa no exame não vira `href`: mostra-se como
      // texto e mais nada.
      ligacao: exame.erro ? null : exame.valor,
    };
  }

  const ponto = pontoValido(lat, lng) ? { lat: lat as number, lng: lng as number } : null;
  return { tipo: "presencial", texto, ponto, plataforma: null, telefone: null, ligacao: null };
}

/** O nome do sítio onde a chamada acontece, para a interface do cliente. */
export function nomeDoCanal(l: LocalDaConsulta): string {
  if (l.tipo === "telefone") return "Chamada telefónica";
  if (l.tipo === "presencial") return "Presencial";
  return l.plataforma?.nome ?? "Videochamada";
}

/**
 * Uma morada legível a partir do que o geocodificador devolve.
 *
 * O Nominatim devolve a morada inteira até ao país, e o país é ruído para
 * quem já sabe que a consulta é em Portugal. Ficam as partes que ajudam a
 * chegar lá: rua e número, localidade, código postal.
 */
export function moradaCurta(nomeCompleto: string): string {
  const partes = nomeCompleto.split(",").map((p) => p.trim()).filter(Boolean);
  const semPais = partes.filter((p) => !/^portugal$/i.test(p));
  if (semPais.length <= 4) return semPais.join(", ");
  // As duas primeiras identificam a porta; as duas últimas, a localidade.
  return [...semPais.slice(0, 2), ...semPais.slice(-2)].join(", ");
}
