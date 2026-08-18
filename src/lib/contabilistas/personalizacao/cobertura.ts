// ═══════════════════════════════════════════════════════════════════════
//  COBERTURA — onde é que a pessoa atende, dito como ela atende
//  ---------------------------------------------------------------------
//  O perfil tinha um distrito e um concelho. Isso descreve bem quem tem
//  escritório num sítio e não sai de lá, e descreve mal toda a gente:
//
//   · quem atende online em todo o país ficava agarrado a um distrito;
//   · quem cobre a Grande Lisboa tinha de escolher entre Lisboa e Sintra;
//   · quem atende no Porto e em Braga não conseguia dizer as duas coisas.
//
//  O motor tem quatro modos. Nenhum é «o certo» — o certo é o que
//  corresponde à verdade de cada pessoa, e é isso que a torna encontrável
//  por quem procura perto de si.
//
//  Uma decisão que não é óbvia: não há raios em quilómetros. Um raio
//  precisa de coordenadas de quem procura e de quem atende, e o diretório
//  filtra por concelho — um raio prometido e depois arredondado ao
//  concelho é uma precisão fingida. Concelhos e distritos dizem a verdade
//  sobre o que o sistema sabe mesmo fazer.
// ═══════════════════════════════════════════════════════════════════════

import { DISTRITOS } from "../catalogo";

export type ModoCobertura =
  /** Um sítio só. O escritório, e pronto. */
  | "local"
  /** Vários concelhos, escolhidos à mão. */
  | "concelhos"
  /** Um ou mais distritos inteiros. */
  | "distritos"
  /** Todo o país. Só faz sentido com atendimento online. */
  | "pais";

export const MODOS: readonly ModoCobertura[] = ["local", "concelhos", "distritos", "pais"];

export interface Cobertura {
  modo: ModoCobertura;
  /** A base de `local`: o distrito e o concelho do escritório. */
  distrito: string | null;
  concelho: string | null;
  /** Para `concelhos`: os concelhos servidos. Texto livre, normalizado. */
  concelhos: string[];
  /** Para `distritos`: nomes do catálogo fechado. */
  distritos: string[];
  /** Uma nota da própria pessoa. «Desloco-me a partir de meio dia de trabalho.» */
  nota: string | null;
}

export const COBERTURA_VAZIA: Cobertura = {
  modo: "local", distrito: null, concelho: null, concelhos: [], distritos: [], nota: null,
};

export const MAX_CONCELHOS = 12;
export const MAX_NOTA = 160;

// ─── Validação ─────────────────────────────────────────────────────────

export interface ProblemaCobertura {
  campo: "modo" | "distrito" | "concelho" | "concelhos" | "distritos" | "nota";
  mensagem: string;
}

/**
 * Valida a cobertura contra as modalidades de atendimento.
 *
 * O cruzamento com as modalidades é o ponto todo. «Todo o país» só é
 * verdade para quem atende online; declará-lo em atendimento exclusivamente
 * presencial promete deslocações que ninguém tenciona fazer, e quem
 * pesquisar em Bragança vai encontrar um escritório em Faro.
 */
export function validarCobertura(
  c: Cobertura,
  modalidades: readonly string[]
): ProblemaCobertura[] {
  const p: ProblemaCobertura[] = [];
  const online = modalidades.includes("online");
  const presencial = modalidades.includes("presencial");

  if (!MODOS.includes(c.modo)) {
    return [{ campo: "modo", mensagem: "Modo de cobertura desconhecido." }];
  }

  if (c.modo === "pais" && !online) {
    p.push({
      campo: "modo",
      mensagem: "«Todo o país» precisa de atendimento online — sem ele, não é verdade.",
    });
  }

  if (presencial && !c.distrito && c.modo !== "pais") {
    p.push({
      campo: "distrito",
      mensagem: "Quem atende presencialmente precisa de dizer onde.",
    });
  }

  if (c.distrito && !DISTRITOS.includes(c.distrito as (typeof DISTRITOS)[number])) {
    p.push({ campo: "distrito", mensagem: "Distrito fora da lista." });
  }

  if (c.modo === "concelhos") {
    if (c.concelhos.length === 0) {
      p.push({ campo: "concelhos", mensagem: "Escolhe pelo menos um concelho." });
    }
    if (c.concelhos.length > MAX_CONCELHOS) {
      p.push({
        campo: "concelhos",
        mensagem: `No máximo ${MAX_CONCELHOS} concelhos. Acima disso, escolhe distritos.`,
      });
    }
  }

  if (c.modo === "distritos") {
    if (c.distritos.length === 0) {
      p.push({ campo: "distritos", mensagem: "Escolhe pelo menos um distrito." });
    }
    const desconhecido = c.distritos.find(
      (d) => !DISTRITOS.includes(d as (typeof DISTRITOS)[number])
    );
    if (desconhecido) {
      p.push({ campo: "distritos", mensagem: `«${desconhecido}» não é um distrito da lista.` });
    }
  }

  if (c.nota && c.nota.length > MAX_NOTA) {
    p.push({ campo: "nota", mensagem: `A nota cabe em ${MAX_NOTA} caracteres.` });
  }

  return p;
}

// ─── Como se lê ────────────────────────────────────────────────────────

function juntar(itens: readonly string[]): string {
  if (itens.length === 0) return "";
  if (itens.length === 1) return itens[0];
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/**
 * A frase que aparece no perfil e no cartão do diretório.
 *
 * Uma só função para os dois sítios — se cada um a construísse, o cartão
 * diria «Porto» e o perfil «Porto e Braga» sobre a mesma pessoa.
 */
export function descreverCobertura(c: Cobertura, modalidades: readonly string[]): string {
  const online = modalidades.includes("online");
  const presencial = modalidades.includes("presencial");

  const base = (() => {
    switch (c.modo) {
      case "pais":
        return "Todo o país";
      case "distritos":
        return c.distritos.length ? juntar(c.distritos) : "Sem território definido";
      case "concelhos":
        return c.concelhos.length ? juntar(c.concelhos) : "Sem território definido";
      case "local":
      default: {
        if (c.concelho && c.distrito) return `${c.concelho}, ${c.distrito}`;
        return c.concelho ?? c.distrito ?? "Sem território definido";
      }
    }
  })();

  if (online && !presencial) return `Online — ${base.toLowerCase() === "todo o país" ? "todo o país" : base}`;
  if (online && presencial) return `${base} · presencial e online`;
  return base;
}

/**
 * Os concelhos e distritos por que este perfil deve ser encontrado.
 *
 * É o que o diretório vai indexar. `distritos` inclui sempre o distrito
 * do escritório: quem cobre a Grande Lisboa a partir de Sintra continua a
 * ser de Lisboa, e não aparecer no próprio distrito seria absurdo.
 */
export function alcanceDaCobertura(c: Cobertura): {
  distritos: string[];
  concelhos: string[];
  nacional: boolean;
} {
  const distritos = new Set<string>();
  const concelhos = new Set<string>();

  if (c.distrito) distritos.add(c.distrito);
  if (c.concelho) concelhos.add(c.concelho);

  if (c.modo === "distritos") for (const d of c.distritos) distritos.add(d);
  if (c.modo === "concelhos") for (const x of c.concelhos) concelhos.add(x);

  return {
    distritos: [...distritos],
    concelhos: [...concelhos],
    nacional: c.modo === "pais",
  };
}

/** Este perfil serve quem procura neste concelho? */
export function cobreConcelho(c: Cobertura, procurado: string): boolean {
  if (c.modo === "pais") return true;
  const alvo = normalizar(procurado);
  if (!alvo) return false;

  const alcance = alcanceDaCobertura(c);
  if (alcance.concelhos.some((x) => normalizar(x) === alvo)) return true;
  // Um distrito inteiro cobre os concelhos que lá estão, mas o motor não
  // tem a lista concelho→distrito, e inventá-la seria dados fabricados.
  // Por isso só bate quando o nome procurado É o do distrito — que é o
  // caso real de capitais de distrito como Porto, Braga ou Faro.
  return alcance.distritos.some((x) => normalizar(x) === alvo);
}

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

// ─── Persistência ──────────────────────────────────────────────────────

export function lerCobertura(bruto: unknown): Cobertura {
  if (!bruto || typeof bruto !== "object") return { ...COBERTURA_VAZIA };
  const o = bruto as Record<string, unknown>;
  const modo = typeof o.modo === "string" && MODOS.includes(o.modo as ModoCobertura)
    ? (o.modo as ModoCobertura)
    : "local";

  return {
    modo,
    distrito: typeof o.distrito === "string" && o.distrito ? o.distrito : null,
    concelho: typeof o.concelho === "string" && o.concelho ? o.concelho : null,
    concelhos: textos(o.concelhos, MAX_CONCELHOS),
    distritos: textos(o.distritos, DISTRITOS.length).filter((d) =>
      DISTRITOS.includes(d as (typeof DISTRITOS)[number])
    ),
    nota: typeof o.nota === "string" && o.nota.trim() ? o.nota.trim().slice(0, MAX_NOTA) : null,
  };
}

function textos(bruto: unknown, max: number): string[] {
  if (!Array.isArray(bruto)) return [];
  const out: string[] = [];
  const vistos = new Set<string>();
  for (const x of bruto) {
    if (typeof x !== "string") continue;
    const limpo = x.replace(/\s+/g, " ").trim().slice(0, 60);
    const k = normalizar(limpo);
    if (!limpo || vistos.has(k)) continue;
    vistos.add(k);
    out.push(limpo);
    if (out.length >= max) break;
  }
  return out;
}

export function escreverCobertura(c: Cobertura): Record<string, unknown> {
  return {
    modo: c.modo,
    distrito: c.distrito,
    concelho: c.concelho,
    // Só se grava a lista do modo activo. Guardar concelhos de um modo
    // que já não está escolhido faz reaparecer território antigo quando
    // alguém volta a trocar de modo meses depois.
    concelhos: c.modo === "concelhos" ? c.concelhos.slice(0, MAX_CONCELHOS) : [],
    distritos: c.modo === "distritos" ? c.distritos : [],
    nota: c.nota,
  };
}
