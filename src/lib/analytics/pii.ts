// ═══════════════════════════════════════════════════════════════════════
//  A LISTA DE DADOS PROIBIDOS — e a barreira que a faz cumprir
//  ---------------------------------------------------------------------
//  §8.2: «Excluir valores salariais, NIF, documentos e texto livre de
//  analytics. Recolher apenas baldes quando indispensável.» §19.1 pede uma
//  lista de dados proibidos explícita, e o alvo do dia 14 é «zero PII
//  indevida».
//
//  Uma lista num documento não impede nada. Esta é uma BARREIRA: corre em
//  cada evento, antes de sair do dispositivo, e recusa o evento inteiro se
//  encontrar um dado proibido. Recusar o evento — e não limpá-lo em
//  silêncio — é deliberado: um evento que chega mutilado dá um número
//  errado sem ninguém saber; um evento recusado aparece na consola em
//  desenvolvimento e obriga a corrigir a chamada.
//
//  A barreira é dupla porque as duas metades falham de maneiras
//  diferentes:
//    · por CHAVE — apanha o campo com nome honesto (`nif`, `salario`);
//    · por FORMA — apanha o campo com nome inocente que transporta um NIF
//      na mesma (`ref: "512345678"`). É esta a que salva.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Fragmentos de nome de campo que nunca podem entrar num evento. A
 * comparação é por inclusão e sem acentos: `valorLiquido`, `valor_liquido`
 * e `VALOR-LÍQUIDO` são todos apanhados por "liquido".
 */
export const CHAVES_PROIBIDAS: readonly string[] = [
  // Identificação direta
  "nif", "niss", "cartaocidadao", "passaporte", "iban", "nib",
  "email", "telefone", "telemovel", "morada", "codigopostal", "nome",
  "apelido", "datanascimento", "avatar",
  // Valores fiscais e financeiros em bruto
  "salario", "vencimento", "rendimento", "bruto", "liquido", "valor",
  "montante", "faturacao", "imposto", "retencao",
  "reembolso", "coleta", "deducao", "patrimonio", "saldo",
  // Documentos e texto livre
  "documento", "ficheiro", "anexo", "comentario", "mensagem",
  "descricao", "observacoes", "notas", "texto", "pesquisa",
  "feedback",
];

/**
 * Chaves cujo VALOR é, por contrato, um identificador opaco ou um rótulo
 * fechado que nós próprios geramos: `click_id`, `result_version`,
 * `elapsed_bucket`. Não são inspecionadas nem por nome nem por forma —
 * inspecioná-las só produziria falsos positivos (um UUID pode conter, por
 * acaso, onze dígitos seguidos).
 *
 * A isenção é estreita de propósito: só vale para valores escalares. Um
 * objeto chamado `dados_id` continua a ser percorrido campo a campo.
 */
const CHAVES_OPACAS = /_(id|version|bucket)$/;

/** Um NIF/NISS português: 9 ou 11 dígitos isolados. */
const PADRAO_NUMERO_IDENTIFICADOR = /(?<!\d)(\d{9}|\d{11})(?!\d)/;
const PADRAO_EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PADRAO_IBAN = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/;
/** Texto suficientemente longo para ser prosa escrita por alguém. */
const LIMITE_TEXTO_LIVRE = 120;

export interface ResultadoPII {
  ok: boolean;
  /** Que campo falhou e porquê — a mensagem que o programador vai ler. */
  motivo?: string;
}

function normalizar(chave: string): string {
  return chave
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** O fragmento proibido presente no nome da chave, ou `null`. */
export function fragmentoProibido(chave: string): string | null {
  const limpa = normalizar(chave);
  return CHAVES_PROIBIDAS.find((p) => limpa.includes(p)) ?? null;
}

function formaProibida(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  if (PADRAO_EMAIL.test(valor)) return "parece um endereço de email";
  if (PADRAO_IBAN.test(valor)) return "parece um IBAN";
  if (PADRAO_NUMERO_IDENTIFICADOR.test(valor)) {
    return "contém um número de 9 ou 11 dígitos (NIF/NISS?)";
  }
  if (valor.length > LIMITE_TEXTO_LIVRE) {
    return `tem mais de ${LIMITE_TEXTO_LIVRE} caracteres (texto livre?)`;
  }
  return null;
}

/**
 * Verifica um payload de evento. Percorre em profundidade porque um
 * objeto aninhado esconde tão bem como um de topo.
 */
export function verificarSemPII(props: unknown, caminho = ""): ResultadoPII {
  if (props === null || props === undefined) return { ok: true };

  if (Array.isArray(props)) {
    for (let i = 0; i < props.length; i++) {
      const r = verificarSemPII(props[i], `${caminho}[${i}]`);
      if (!r.ok) return r;
    }
    return { ok: true };
  }

  if (typeof props === "object") {
    for (const [chave, valor] of Object.entries(props as Record<string, unknown>)) {
      const onde = caminho ? `${caminho}.${chave}` : chave;
      const escalar = valor === null || typeof valor !== "object";

      if (CHAVES_OPACAS.test(chave) && escalar) continue;

      const proibido = fragmentoProibido(chave);
      if (proibido) {
        return {
          ok: false,
          motivo: `campo "${onde}" contém "${proibido}" — usar um balde (ver eventos.ts) ou remover`,
        };
      }
      const r = verificarSemPII(valor, onde);
      if (!r.ok) return r;
    }
    return { ok: true };
  }

  const forma = formaProibida(props);
  if (forma) return { ok: false, motivo: `valor de "${caminho || "raiz"}" ${forma}` };
  return { ok: true };
}
