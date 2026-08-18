// ═══════════════════════════════════════════════════════════════════════
//  IDENTIFICADORES — o que dá para saber sem perguntar a ninguém
//  ---------------------------------------------------------------------
//  Duas funções, e uma distinção que atravessa toda esta pasta:
//
//      FORMATO  ≠  VERIFICAÇÃO
//
//  Saber que «12345» tem forma de número de membro não diz nada sobre a
//  existência do membro 12345. Saber que um NIF passa o dígito de
//  controlo não diz que é o NIF daquela pessoa. São filtros de erro de
//  escrita, e é assim que a interface tem de os apresentar.
//
//  Por isso não há aqui nenhuma função chamada `validar…` que devolva
//  `true`: devolvem um diagnóstico, e o diagnóstico mais forte possível
//  é «plausível».
// ═══════════════════════════════════════════════════════════════════════

export type Plausibilidade = "vazio" | "plausivel" | "improvavel";

export interface Diagnostico {
  plausibilidade: Plausibilidade;
  /** A forma canónica, para gravar e comparar. `null` se não der. */
  normalizado: string | null;
  /** O que dizer a quem está a escrever. `null` quando não há nada a dizer. */
  aviso: string | null;
}

// ─── Número de membro da Ordem ─────────────────────────────────────────

/**
 * O comprimento máximo aceite.
 *
 * A Ordem não publica nem a regra de formação nem um dígito de controlo
 * do número de membro, e este ficheiro não inventa nenhum. Sete dígitos é
 * uma folga deliberada sobre a ordem de grandeza dos números em
 * circulação: serve para apanhar quem colou um NIF ou um telefone no
 * campo errado, e não para decidir quem existe.
 */
const OCC_MAX_DIGITOS = 7;

/**
 * Forma canónica do número de membro: só dígitos, sem zeros à esquerda.
 *
 * Normalizar é o que torna a comparação com o registo público possível —
 * «012345», «12345» e «12 345» são o mesmo membro, e sem esta função a
 * verificação falharia por causa de um espaço.
 */
export function normalizarNumeroOCC(bruto: string | null | undefined): string | null {
  if (!bruto) return null;
  const digitos = bruto.replace(/\D+/g, "").replace(/^0+/, "");
  if (!digitos) return null;
  return digitos;
}

export function diagnosticarNumeroOCC(bruto: string | null | undefined): Diagnostico {
  const cru = (bruto ?? "").trim();
  if (!cru) return { plausibilidade: "vazio", normalizado: null, aviso: null };

  const normalizado = normalizarNumeroOCC(cru);
  if (!normalizado) {
    return {
      plausibilidade: "improvavel",
      normalizado: null,
      aviso: "O número de inscrição na Ordem é composto por dígitos.",
    };
  }

  if (/[A-Za-z]/.test(cru)) {
    return {
      plausibilidade: "improvavel",
      normalizado,
      aviso: "O número de inscrição não tem letras. Confirma o que copiaste.",
    };
  }

  if (normalizado.length > OCC_MAX_DIGITOS) {
    return {
      plausibilidade: "improvavel",
      normalizado,
      aviso:
        normalizado.length === 9
          ? "Isto parece um NIF, não o número de inscrição na Ordem."
          : "Número demasiado longo para uma inscrição na Ordem.",
    };
  }

  return { plausibilidade: "plausivel", normalizado, aviso: null };
}

// ─── NIF ───────────────────────────────────────────────────────────────

/**
 * Dígito de controlo do NIF português (módulo 11).
 *
 * Ao contrário do número de membro, este algoritmo é público e
 * determinístico: os oito primeiros dígitos são multiplicados por 9…2, a
 * soma é reduzida módulo 11, e o nono dígito é 0 quando o resto é 0 ou 1,
 * ou 11 menos o resto nos restantes casos.
 *
 * Continua a não ser uma verificação de identidade — apanha gralhas, não
 * impostores. Só é usado quando o método de verificação escolhido precisa
 * de cruzar o NIF (o SCAP identifica o cidadão pelo documento).
 */
export function nifTemDigitoValido(bruto: string | null | undefined): boolean {
  const d = (bruto ?? "").replace(/\D+/g, "");
  if (d.length !== 9) return false;
  if (/^(\d)\1{8}$/.test(d)) return false;

  let soma = 0;
  for (let i = 0; i < 8; i += 1) soma += Number(d[i]) * (9 - i);
  const resto = soma % 11;
  const controlo = resto < 2 ? 0 : 11 - resto;
  return controlo === Number(d[8]);
}

export function diagnosticarNIF(bruto: string | null | undefined): Diagnostico {
  const cru = (bruto ?? "").trim();
  if (!cru) return { plausibilidade: "vazio", normalizado: null, aviso: null };

  const digitos = cru.replace(/\D+/g, "");
  if (digitos.length !== 9) {
    return {
      plausibilidade: "improvavel",
      normalizado: digitos || null,
      aviso: "Um NIF tem nove dígitos.",
    };
  }
  if (!nifTemDigitoValido(digitos)) {
    return {
      plausibilidade: "improvavel",
      normalizado: digitos,
      aviso: "Este NIF não passa o dígito de controlo. Confirma os números.",
    };
  }
  return { plausibilidade: "plausivel", normalizado: digitos, aviso: null };
}

// ─── Nomes ─────────────────────────────────────────────────────────────

/**
 * Forma comparável de um nome próprio.
 *
 * Sem acentos, sem pontuação, sem espaços a mais, em minúsculas. Serve
 * para a comparação com o registo público não falhar por causa de um
 * «Nogueira» escrito «NOGUEIRA» ou de um «José» sem acento.
 */
export function normalizarNome(bruto: string | null | undefined): string {
  return (bruto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** As partículas que não distinguem ninguém e atrapalham a comparação. */
const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e", "d"]);

/** Os pedaços significativos de um nome, já normalizados. */
export function pedacosDoNome(bruto: string | null | undefined): string[] {
  return normalizarNome(bruto).split(" ").filter((p) => p && !PARTICULAS.has(p));
}
