// ═══════════════════════════════════════════════════════════════════════
//  MOTOR DE VERIFICAÇÃO — o que o selo diz, e quando deixa de dizer
//  ---------------------------------------------------------------------
//  Antes disto a verificação era um booleano: `occ_verificado`. Um
//  booleano não consegue responder às três perguntas que um cliente faz
//  sem dar por isso ao ver o selo:
//
//      quem confirmou?   ·   confirmou como?   ·   isso ainda é verdade?
//
//  A terceira é a que parte tudo. Uma inscrição na Ordem pode ser
//  suspensa ou cancelada — a própria Ordem publica esses movimentos de
//  trimestre a trimestre (art. 21.º, n.º 2 do EOCC). Um carimbo eterno
//  dado em 2026 continuaria a dizer «verificado» em 2030 sobre alguém que
//  já não é membro, e nesse dia o selo passa a ser uma mentira com a
//  nossa assinatura.
//
//  Daí o desenho central deste ficheiro: TODA a verificação caduca. O que
//  varia com o método é quanto tempo dura e o que é preciso para a
//  renovar. É isso que faz o sistema ser sincronizado em vez de carimbado.
// ═══════════════════════════════════════════════════════════════════════

import { CEDULA, REGISTO_PUBLICO, SCAP_OCC, type FonteVerificacao } from "./fontes";
import { diagnosticarNumeroOCC } from "./identificadores";

// ─── Métodos ───────────────────────────────────────────────────────────

/**
 * Como é que o facto foi estabelecido. A ordem é a da força probatória, e
 * não é decorativa: `forcaDoMetodo` usa-a para decidir se uma verificação
 * nova substitui a que já lá está.
 */
export type MetodoVerificacao =
  /** SCAP: o próprio autorizou, a Ordem respondeu, e a resposta tem validade. */
  | "scap"
  /** Registo público consultado por uma pessoa da administração. */
  | "registo_publico"
  /** Documento (cédula, comprovativo) apresentado e conferido por uma pessoa. */
  | "documento";

export const METODOS: readonly MetodoVerificacao[] = ["scap", "registo_publico", "documento"];

export interface PerfilDoMetodo {
  id: MetodoVerificacao;
  /** O que o selo pode dizer quando foi obtido por aqui. */
  rotulo: string;
  /** Uma linha honesta sobre o que este método prova. */
  descricao: string;
  /** Quanto tempo vale, em dias, quando a fonte não indica validade própria. */
  validadeDias: number;
  /** É preciso uma pessoa da administração para o concluir? */
  exigeAdministracao: boolean;
  /** A pessoa verificada tem de participar activamente? */
  exigeConsentimento: boolean;
  fonte: FonteVerificacao;
}

/**
 * O catálogo dos métodos.
 *
 * As validades não são arbitrárias e valem a pena explicar:
 *
 *  - **SCAP — 180 dias.** É o tecto, não a regra: quando a resposta do
 *    SCAP traz `validity`, é essa data que manda (ver `validadeDaResposta`).
 *    O tecto existe para o caso de a Ordem devolver um atributo sem
 *    validade — nunca deve resultar num selo perpétuo.
 *
 *  - **Registo público — 90 dias.** Alinhado com o trimestre em que a
 *    Ordem publica suspensões e cancelamentos (art. 21.º, n.º 2). Quem
 *    saiu da Ordem aparece nessa lista dentro de um trimestre; um selo
 *    que dura um trimestre nunca sobrevive muito a essa publicação.
 *
 *  - **Documento — 90 dias.** Não é melhor do que a consulta ao registo,
 *    é pior: prova que existiu um documento, não que a inscrição está
 *    activa hoje. Dura o mesmo porque é o mesmo trimestre a correr.
 */
export const PERFIS_METODO: Record<MetodoVerificacao, PerfilDoMetodo> = {
  scap: {
    id: "scap",
    rotulo: "Confirmado pela Ordem (SCAP)",
    descricao:
      "O próprio autorizou a consulta com a Chave Móvel Digital ou o Cartão de " +
      "Cidadão, e a Ordem confirmou a qualidade de membro.",
    validadeDias: 180,
    exigeAdministracao: false,
    exigeConsentimento: true,
    fonte: SCAP_OCC,
  },
  registo_publico: {
    id: "registo_publico",
    rotulo: "Confirmado no registo público da Ordem",
    descricao:
      "A administração do Recibo Certo consultou o registo público da Ordem e " +
      "confirmou o nome e o número de inscrição.",
    validadeDias: 90,
    exigeAdministracao: true,
    exigeConsentimento: false,
    fonte: REGISTO_PUBLICO,
  },
  documento: {
    id: "documento",
    rotulo: "Documento conferido",
    descricao:
      "Foi apresentado um comprovativo de inscrição e conferido por uma pessoa. " +
      "Prova o documento, não o estado da inscrição hoje.",
    validadeDias: 90,
    exigeAdministracao: true,
    exigeConsentimento: true,
    fonte: CEDULA,
  },
};

/** Maior é mais forte. Serve para não deixar um método fraco apagar um forte. */
export function forcaDoMetodo(m: MetodoVerificacao): number {
  return METODOS.length - METODOS.indexOf(m);
}

// ─── Estados ───────────────────────────────────────────────────────────

/**
 * O estado que a interface mostra.
 *
 * `a_reconfirmar` é o estado que justifica o ficheiro inteiro: a
 * verificação existiu, era boa, e passou o prazo. Não é o mesmo que nunca
 * ter sido verificado, e a pessoa não merece ser tratada como se fosse —
 * mas também não pode continuar a exibir um selo sobre um facto que já
 * ninguém confirmou.
 */
export type EstadoVerificacao =
  | "sem_numero"
  | "informado"
  | "em_analise"
  | "verificado"
  | "a_reconfirmar"
  | "recusado";

export interface RegistoVerificacao {
  metodo: MetodoVerificacao | null;
  /** Quando foi confirmado (ISO 8601). */
  confirmadoEm: string | null;
  /** Até quando vale (ISO 8601). Depois disto, `a_reconfirmar`. */
  validoAte: string | null;
  /** O número que foi confirmado — não o número actual da ficha. */
  numeroConfirmado: string | null;
  /** Quem confirmou: id de administrador, ou `"scap"`. */
  confirmadoPor: string | null;
  /** Um pedido em curso bloqueia novos pedidos e mostra «em análise». */
  pedidoEm: string | null;
  /** Motivo da recusa. Só existe quando houve recusa. */
  recusaMotivo: string | null;
  recusadoEm: string | null;
}

export const REGISTO_VAZIO: RegistoVerificacao = {
  metodo: null, confirmadoEm: null, validoAte: null, numeroConfirmado: null,
  confirmadoPor: null, pedidoEm: null, recusaMotivo: null, recusadoEm: null,
};

export interface EntradaMotor {
  /** O número que está na ficha AGORA. */
  numeroAtual: string | null;
  registo: RegistoVerificacao;
  /** Injectado para os testes serem determinísticos. */
  agora?: Date;
}

export interface LeituraVerificacao {
  estado: EstadoVerificacao;
  metodo: MetodoVerificacao | null;
  /** O que aparece no selo. Nunca «verificado» sem que o seja. */
  rotulo: string;
  /** A frase de contexto. `null` quando não há nada honesto a acrescentar. */
  detalhe: string | null;
  /** Dias que faltam para caducar. Negativo já não acontece: vira `a_reconfirmar`. */
  diasAteCaducar: number | null;
  /** A partir de quanto tempo antes se avisa que está a chegar ao fim. */
  aExpirar: boolean;
  /** Verdadeiro só no estado `verificado`. É o que a UI pode usar como selo. */
  selo: boolean;
  /** O que a pessoa pode fazer a seguir. */
  proximoPasso: ProximoPasso | null;
}

export type ProximoPasso =
  | { id: "escrever_numero"; rotulo: string }
  | { id: "pedir_verificacao"; rotulo: string }
  | { id: "aguardar"; rotulo: string }
  | { id: "renovar"; rotulo: string }
  | { id: "corrigir"; rotulo: string };

/** Quantos dias antes do fim se começa a avisar. Uma semana chega. */
export const DIAS_DE_AVISO = 14;

const DIA_MS = 86_400_000;

function dias(entre: Date, e: Date): number {
  return Math.floor((e.getTime() - entre.getTime()) / DIA_MS);
}

function iso(d: Date): string {
  return d.toISOString();
}

/**
 * Soma dias a uma data e devolve ISO. Exportada porque quem grava a
 * verificação (rota de API, migração de dados) tem de calcular a mesma
 * validade que este motor depois vai ler.
 */
export function validadeAPartirDe(inicio: Date, quantosDias: number): string {
  return iso(new Date(inicio.getTime() + quantosDias * DIA_MS));
}

/**
 * A leitura única do estado de verificação.
 *
 * Uma só função para o editor do contabilista, o perfil público, o cartão
 * do diretório e a consola de administração. Se cada um decidisse por si,
 * o mesmo perfil apareceria verificado num sítio e por verificar noutro —
 * e o selo deixaria de valer o pixel que ocupa.
 */
export function lerVerificacao(e: EntradaMotor): LeituraVerificacao {
  const agora = e.agora ?? new Date();
  const r = e.registo;
  const numero = diagnosticarNumeroOCC(e.numeroAtual).normalizado;

  // ── Sem número não há nada a verificar ────────────────────────────
  if (!numero) {
    return {
      estado: "sem_numero", metodo: null,
      rotulo: "Sem número de inscrição",
      detalhe: "O número de inscrição na Ordem é o que permite confirmar-te.",
      diasAteCaducar: null, aExpirar: false, selo: false,
      proximoPasso: { id: "escrever_numero", rotulo: "Escrever o número" },
    };
  }

  // ── Uma recusa fica visível até o número mudar ─────────────────────
  //  Sem isto, recusar não teria efeito prático: bastava voltar a pedir.
  if (r.recusadoEm && r.numeroConfirmado === numero) {
    return {
      estado: "recusado", metodo: null,
      rotulo: "Verificação recusada",
      detalhe: r.recusaMotivo ?? "A administração não conseguiu confirmar este número.",
      diasAteCaducar: null, aExpirar: false, selo: false,
      proximoPasso: { id: "corrigir", rotulo: "Corrigir o número" },
    };
  }

  // ── Uma verificação só vale para o número que foi verificado ───────
  //  O trigger da base de dados já limpa a verificação quando o número
  //  muda; esta guarda existe para o motor dar a mesma resposta mesmo
  //  quando lê dados que ainda não passaram por lá (rascunho no editor).
  const doMesmoNumero = r.numeroConfirmado !== null && r.numeroConfirmado === numero;

  if (r.confirmadoEm && r.metodo && doMesmoNumero) {
    const fim = r.validoAte ? new Date(r.validoAte) : null;
    const restam = fim ? dias(agora, fim) : null;

    if (restam !== null && restam < 0) {
      return {
        estado: "a_reconfirmar", metodo: r.metodo,
        rotulo: "Verificação por reconfirmar",
        detalhe:
          "A confirmação junto da Ordem tem prazo. Passou o prazo desta, e o " +
          "selo desaparece do perfil público até haver uma nova.",
        diasAteCaducar: restam, aExpirar: false, selo: false,
        proximoPasso: { id: "renovar", rotulo: "Pedir nova verificação" },
      };
    }

    const perfil = PERFIS_METODO[r.metodo];
    return {
      estado: "verificado", metodo: r.metodo,
      rotulo: perfil.rotulo,
      detalhe: perfil.descricao,
      diasAteCaducar: restam,
      aExpirar: restam !== null && restam <= DIAS_DE_AVISO,
      selo: true,
      proximoPasso:
        restam !== null && restam <= DIAS_DE_AVISO
          ? { id: "renovar", rotulo: "Renovar a verificação" }
          : null,
    };
  }

  // ── Pedido em curso ────────────────────────────────────────────────
  if (r.pedidoEm) {
    return {
      estado: "em_analise", metodo: null,
      rotulo: "Verificação em análise",
      detalhe: "O pedido está na fila da administração. Não é preciso fazer mais nada.",
      diasAteCaducar: null, aExpirar: false, selo: false,
      proximoPasso: { id: "aguardar", rotulo: "Em análise" },
    };
  }

  // ── Tem número, não tem verificação ───────────────────────────────
  return {
    estado: "informado", metodo: null,
    rotulo: "Nº de inscrição informado",
    detalhe:
      "O número aparece no perfil como informado por ti. Passa a «confirmado» " +
      "quando for verificado junto da Ordem.",
    diasAteCaducar: null, aExpirar: false, selo: false,
    proximoPasso: { id: "pedir_verificacao", rotulo: "Pedir verificação" },
  };
}

// ─── Transições ────────────────────────────────────────────────────────

export interface Confirmacao {
  metodo: MetodoVerificacao;
  numero: string;
  /** Quem confirmou. `"scap"` quando foi o próprio sistema. */
  por: string;
  /** Validade indicada pela fonte, quando existe (o SCAP indica). */
  validadeDaFonte?: string | null;
  agora?: Date;
}

export interface ResultadoTransicao {
  ok: boolean;
  registo: RegistoVerificacao;
  /** Porque é que foi recusada, quando `ok` é falso. */
  motivo: string | null;
}

/**
 * Aplica uma confirmação ao registo.
 *
 * Duas regras, e ambas existem por causa do mesmo risco — o de um método
 * fraco poder degradar ou prolongar um selo forte:
 *
 *  1. Um método mais fraco não substitui um mais forte ainda válido. Um
 *     documento conferido à pressa não pode passar por cima de uma
 *     confirmação do SCAP que ainda está de pé.
 *  2. A validade nunca ultrapassa o tecto do método. Se a fonte indicar
 *     uma data mais longe do que o tecto, ganha o tecto; se indicar uma
 *     mais próxima, ganha a fonte. O selo nunca dura mais do que aquilo
 *     que quem o emitiu garantiu.
 */
export function confirmar(
  atual: RegistoVerificacao,
  c: Confirmacao
): ResultadoTransicao {
  const agora = c.agora ?? new Date();
  const numero = diagnosticarNumeroOCC(c.numero).normalizado;

  if (!numero) {
    return { ok: false, registo: atual, motivo: "Número de inscrição inválido." };
  }

  const aindaValida =
    atual.metodo !== null &&
    atual.numeroConfirmado === numero &&
    atual.validoAte !== null &&
    new Date(atual.validoAte).getTime() > agora.getTime();

  if (aindaValida && atual.metodo && forcaDoMetodo(c.metodo) < forcaDoMetodo(atual.metodo)) {
    return {
      ok: false,
      registo: atual,
      motivo:
        `Já existe uma verificação mais forte (${PERFIS_METODO[atual.metodo].rotulo}) ` +
        "dentro do prazo. Não é substituída por uma mais fraca.",
    };
  }

  const perfil = PERFIS_METODO[c.metodo];
  const tecto = validadeAPartirDe(agora, perfil.validadeDias);
  const daFonte = c.validadeDaFonte ?? null;
  const validoAte =
    daFonte && new Date(daFonte).getTime() < new Date(tecto).getTime() ? daFonte : tecto;

  return {
    ok: true,
    motivo: null,
    registo: {
      metodo: c.metodo,
      confirmadoEm: iso(agora),
      validoAte,
      numeroConfirmado: numero,
      confirmadoPor: c.por,
      pedidoEm: null,
      recusaMotivo: null,
      recusadoEm: null,
    },
  };
}

export function recusar(
  atual: RegistoVerificacao,
  p: { numero: string; motivo: string; agora?: Date }
): ResultadoTransicao {
  const agora = p.agora ?? new Date();
  const numero = diagnosticarNumeroOCC(p.numero).normalizado;
  const motivo = p.motivo.trim();

  if (!numero) return { ok: false, registo: atual, motivo: "Número de inscrição inválido." };
  if (motivo.length < 10) {
    // Uma recusa sem explicação deixa a pessoa sem saber o que corrigir —
    // a mesma regra que a fila de candidaturas já impõe.
    return { ok: false, registo: atual, motivo: "A recusa tem de explicar o que falhou." };
  }

  return {
    ok: true,
    motivo: null,
    registo: {
      ...REGISTO_VAZIO,
      numeroConfirmado: numero,
      recusaMotivo: motivo.slice(0, 500),
      recusadoEm: iso(agora),
    },
  };
}

/** Regista que a pessoa pediu verificação. Não confirma nada. */
export function pedir(
  atual: RegistoVerificacao,
  p: { numero: string; agora?: Date }
): ResultadoTransicao {
  const agora = p.agora ?? new Date();
  const numero = diagnosticarNumeroOCC(p.numero).normalizado;
  if (!numero) return { ok: false, registo: atual, motivo: "Escreve o número de inscrição primeiro." };
  if (atual.pedidoEm) return { ok: false, registo: atual, motivo: "Já existe um pedido em análise." };

  const leitura = lerVerificacao({ numeroAtual: numero, registo: atual, agora });
  if (leitura.estado === "verificado" && !leitura.aExpirar) {
    return { ok: false, registo: atual, motivo: "A verificação está válida. Não é preciso pedir outra." };
  }

  return {
    ok: true,
    motivo: null,
    // Um pedido novo limpa a recusa anterior: a pessoa está a tentar de
    // novo, e manter a recusa visível ao lado de um pedido em análise
    // dava duas mensagens contrárias no mesmo ecrã.
    registo: { ...atual, pedidoEm: iso(agora), recusaMotivo: null, recusadoEm: null },
  };
}
