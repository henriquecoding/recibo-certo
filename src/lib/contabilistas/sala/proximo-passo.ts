// ═══════════════════════════════════════════════════════════════════════
//  O PRÓXIMO PASSO
//  ---------------------------------------------------------------------
//  A pergunta que uma pessoa faz ao abrir a sala não é «o que aconteceu?».
//  É «tenho alguma coisa para fazer?». Tudo o resto — a linha do tempo, o
//  histórico, os números — só interessa depois de essa estar respondida.
//
//  Por isso isto é uma função pura e não uma decisão espalhada pela
//  interface. Um `if` dentro de um componente que decide mostrar um aviso é
//  uma regra que ninguém consegue testar nem enumerar; aqui as regras estão
//  todas no mesmo sítio, por ordem, e cada uma tem um teste.
//
//  DUAS DECISÕES DE DESENHO
//  ------------------------
//  1. UM passo, não uma lista. Cinco avisos ao mesmo tempo é o mesmo que
//     nenhum: a pessoa lê o primeiro e desiste. Os outros ficam a contagem
//     («e mais 3 por tratar»), que é informação sem ser exigência.
//
//  2. «Aguardar» é um estado legítimo e aparece com o mesmo destaque. A
//     ansiedade de quem não sabe se já pode descansar é o problema que
//     este produto existe para resolver — esconder «está do lado dele»
//     seria deixar a pessoa a inventar a resposta.
// ═══════════════════════════════════════════════════════════════════════

import type { EstadoVinculo } from "@/lib/contabilistas/tipos";
import { diasAtePrazo, pedidoPorFechar, type PedidoCliente } from "./tipos";

export type Papel = "cliente" | "contabilista";

/** O tom com que o bloco se pinta. Ver `BlocoProximoPasso`. */
export type TomDoPasso = "acao" | "espera" | "calma" | "atraso";

/**
 * O que a interface tem de saber para decidir. Um retrato, não uma ligação:
 * quem chama já tem estes dados carregados, e passá-los explicitamente é o
 * que torna cada regra testável com três linhas.
 */
export interface RetratoDaRelacao {
  papel: Papel;
  estadoVinculo: EstadoVinculo;
  pedidos: PedidoCliente[];
  consultas: { id: string; inicio: string; estado: string }[];
  /** Mensagens do OUTRO por ler. As próprias nunca contam. */
  mensagensPorLer: number;
  /** Só do lado do contabilista: o que o cliente enviou e ele ainda não abriu. */
  partilhasPorLer: number;
  /** Só do lado do cliente: consultas realizadas por liquidar, em cêntimos. */
  porPagarCents: number;
  agora: Date;
}

export interface ProximoPasso {
  /** Nome estável para medição. Nunca traduzido, nunca mostrado. */
  chave: string;
  titulo: string;
  detalhe: string | null;
  /** O que o botão diz. `null` quando não há nada a carregar. */
  cta: string | null;
  /** Para onde o botão leva, ou o nome de uma ação tratada pela página. */
  destino: string | null;
  tom: TomDoPasso;
  /** Quantas outras pendências ficaram por trás desta. */
  outras: number;
}

const NADA: ProximoPasso = {
  chave: "tudo_tratado",
  titulo: "Não há nada à tua espera",
  detalhe: "Quando houver alguma coisa a fazer, aparece aqui primeiro.",
  cta: null,
  destino: null,
  tom: "calma",
  outras: 0,
};

/**
 * Decide o que mostrar em cima.
 *
 * A ordem das regras É a especificação. Ler de cima para baixo é ler a
 * prioridade: o que tem prazo vem antes do que não tem, o que está do meu
 * lado vem antes do que está do lado do outro, e uma relação que ainda não
 * começou vem antes de tudo.
 */
export function proximoPasso(r: RetratoDaRelacao): ProximoPasso {
  const passos = r.papel === "cliente" ? passosDoCliente(r) : passosDoContabilista(r);
  if (passos.length === 0) return NADA;

  // As pendências que exigem ação contam para «e mais N»; as de espera não.
  // Dizer «e mais 2 à espera» transformava calma em ruído.
  const acionaveis = passos.filter((p) => p.tom === "acao" || p.tom === "atraso");
  return { ...passos[0], outras: Math.max(acionaveis.length - 1, 0) };
}

// ─── O lado do cliente ─────────────────────────────────────────────────

function passosDoCliente(r: RetratoDaRelacao): ProximoPasso[] {
  const out: ProximoPasso[] = [];

  if (r.estadoVinculo === "pendente" || r.estadoVinculo === "convidado") {
    out.push({
      chave: "aguarda_aceitacao",
      titulo: "O teu pedido está a ser visto",
      detalhe: "Assim que for aceite, podes marcar consulta e enviar simulações.",
      cta: null, destino: null, tom: "espera", outras: 0,
    });
    return out;
  }

  // 1. O que foi pedido, por prazo. É o único sítio onde alguém está
  //    mesmo à espera de uma pessoa concreta fazer uma coisa concreta.
  const abertos = r.pedidos
    .filter((p) => p.estado === "aberto")
    .sort(porPrazo(r.agora));

  for (const p of abertos) {
    const dias = p.prazo ? diasAtePrazo(p.prazo, r.agora) : null;
    const atrasado = dias !== null && dias < 0;
    out.push({
      chave: atrasado ? "pedido_atrasado" : "pedido_aberto",
      titulo: p.titulo,
      detalhe: descreverPrazo(dias, p.obrigatorio),
      cta: "Responder",
      destino: `pedido:${p.id}`,
      tom: atrasado ? "atraso" : "acao",
      outras: 0,
    });
  }

  // 2. Dinheiro por liquidar. Vem antes da consulta futura porque é uma
  //    dívida a correr, e depois dos pedidos porque um prazo fiscal
  //    perdido custa mais do que um pagamento adiado.
  if (r.porPagarCents > 0) {
    out.push({
      chave: "por_pagar",
      titulo: "Tens uma consulta por pagar",
      detalhe: "O pagamento é feito aqui, na plataforma.",
      cta: "Pagar agora",
      destino: "pagamento",
      tom: "acao",
      outras: 0,
    });
  }

  const futuras = consultasFuturas(r);
  const confirmada = futuras.find((c) => c.estado === "confirmado");
  const pedida = futuras.find((c) => c.estado === "pedido");

  if (confirmada) {
    out.push({
      chave: "consulta_confirmada",
      titulo: "Tens consulta marcada",
      detalhe: quandoLegivel(confirmada.inicio, r.agora),
      cta: "Ver detalhes",
      destino: `consulta:${confirmada.id}`,
      tom: "espera",
      outras: 0,
    });
  } else if (pedida) {
    out.push({
      chave: "consulta_por_confirmar",
      titulo: "À espera de confirmação da consulta",
      detalhe: quandoLegivel(pedida.inicio, r.agora),
      cta: null, destino: null, tom: "espera", outras: 0,
    });
  }

  if (r.mensagensPorLer > 0) {
    out.push({
      chave: "mensagem_por_ler",
      titulo:
        r.mensagensPorLer === 1
          ? "Tens uma mensagem por ler"
          : `Tens ${r.mensagensPorLer} mensagens por ler`,
      detalhe: null,
      cta: "Abrir a conversa",
      destino: "conversa",
      tom: "acao",
      outras: 0,
    });
  }

  // 3. Só quando não há mais nada: o convite a marcar. Empurrar isto para
  //    cima de uma pendência real seria vender em vez de ajudar.
  if (r.estadoVinculo === "ativo" && futuras.length === 0 && out.length === 0) {
    out.push({
      chave: "sem_consulta",
      titulo: "Ainda não tens consulta marcada",
      detalhe: "Podes marcar quando precisares — não há mínimo nem obrigação.",
      cta: "Marcar consulta",
      destino: "marcar",
      tom: "calma",
      outras: 0,
    });
  }

  return out;
}

// ─── O lado do contabilista ────────────────────────────────────────────

function passosDoContabilista(r: RetratoDaRelacao): ProximoPasso[] {
  const out: ProximoPasso[] = [];

  if (r.estadoVinculo === "pendente" || r.estadoVinculo === "convidado") {
    out.push({
      chave: "vinculo_por_decidir",
      titulo: "Esta pessoa pediu para ser tua cliente",
      detalhe: "Aceitar abre a conversa, a agenda e as partilhas.",
      cta: "Decidir",
      destino: "decidir",
      tom: "acao",
      outras: 0,
    });
    return out;
  }

  // 1. O que o cliente já respondeu e está à espera de ser olhado. É a
  //    pendência mais cara de todas: alguém fez o que lhe foi pedido e
  //    está à espera. Deixá-la para trás ensina a não responder depressa.
  const respondidos = r.pedidos
    .filter((p) => p.estado === "respondido")
    .sort((a, b) => (a.respondidoEm ?? "").localeCompare(b.respondidoEm ?? ""));

  for (const p of respondidos) {
    out.push({
      chave: "pedido_respondido",
      titulo: `Resposta a «${p.titulo}»`,
      detalhe: "O cliente já respondeu. Falta veres e dares por tratado.",
      cta: "Ver a resposta",
      destino: `pedido:${p.id}`,
      tom: "acao",
      outras: 0,
    });
  }

  if (r.mensagensPorLer > 0) {
    out.push({
      chave: "mensagem_por_ler",
      titulo:
        r.mensagensPorLer === 1
          ? "Uma mensagem por ler"
          : `${r.mensagensPorLer} mensagens por ler`,
      detalhe: null,
      cta: "Abrir a conversa",
      destino: "conversa",
      tom: "acao",
      outras: 0,
    });
  }

  const porConfirmar = consultasFuturas(r).filter((c) => c.estado === "pedido");
  for (const c of porConfirmar) {
    out.push({
      chave: "consulta_por_confirmar",
      titulo: "Consulta por confirmar",
      detalhe: quandoLegivel(c.inicio, r.agora),
      cta: "Confirmar",
      destino: `consulta:${c.id}`,
      tom: "acao",
      outras: 0,
    });
  }

  if (r.partilhasPorLer > 0) {
    out.push({
      chave: "partilha_por_ler",
      titulo:
        r.partilhasPorLer === 1
          ? "Uma simulação por abrir"
          : `${r.partilhasPorLer} simulações por abrir`,
      detalhe: "O cliente partilhou contigo e ainda não abriste.",
      cta: "Ver",
      destino: "partilhas",
      tom: "acao",
      outras: 0,
    });
  }

  // Os pedidos que estão do lado do cliente aparecem como espera: é a
  // resposta a «já pedi isto ou não?», que é a pergunta que faz alguém
  // pedir a mesma coisa duas vezes.
  const aguardar = r.pedidos.filter((p) => p.estado === "aberto");
  if (aguardar.length > 0 && out.length === 0) {
    out.push({
      chave: "aguarda_cliente",
      titulo:
        aguardar.length === 1
          ? `À espera de «${aguardar[0].titulo}»`
          : `À espera de ${aguardar.length} respostas do cliente`,
      detalhe: descreverPrazo(
        aguardar[0].prazo ? diasAtePrazo(aguardar[0].prazo, r.agora) : null,
        aguardar[0].obrigatorio,
      ),
      cta: null, destino: null, tom: "espera", outras: 0,
    });
  }

  return out;
}

// ─── Utensílios ────────────────────────────────────────────────────────

function consultasFuturas(r: RetratoDaRelacao) {
  const agora = r.agora.getTime();
  return r.consultas
    .filter(
      (c) =>
        new Date(c.inicio).getTime() >= agora &&
        (c.estado === "pedido" || c.estado === "confirmado"),
    )
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
}

/** Sem prazo vai para o fim: o que tem data marcada é o que aperta. */
function porPrazo(agora: Date) {
  return (a: PedidoCliente, b: PedidoCliente) => {
    if (a.prazo && b.prazo) return diasAtePrazo(a.prazo, agora) - diasAtePrazo(b.prazo, agora);
    if (a.prazo) return -1;
    if (b.prazo) return 1;
    return a.criadoEm.localeCompare(b.criadoEm);
  };
}

/**
 * O prazo dito como uma pessoa o diria.
 *
 * «Faltam 0 dias» não é português. «Hoje» é.
 */
export function descreverPrazo(dias: number | null, obrigatorio: boolean): string | null {
  if (dias === null) return obrigatorio ? null : "Quando puderes.";
  if (dias < -1) return `Estava para há ${Math.abs(dias)} dias.`;
  if (dias === -1) return "Era para ontem.";
  if (dias === 0) return "É para hoje.";
  if (dias === 1) return "É para amanhã.";
  if (dias <= 7) return `Faltam ${dias} dias.`;
  return `Faltam ${dias} dias — há tempo.`;
}

function quandoLegivel(iso: string, agora: Date): string {
  const d = new Date(iso);
  const dias = Math.round(
    (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) -
      Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate())) /
      86_400_000,
  );
  const hora = new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit" }).format(d);
  if (dias === 0) return `Hoje às ${hora}`;
  if (dias === 1) return `Amanhã às ${hora}`;
  const data = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long" }).format(d);
  return `${data} às ${hora}`;
}

/**
 * Quantas pendências há ao todo, para o contador do cabeçalho.
 *
 * Conta o que EXIGE alguém, não o que existe: um pedido à espera do outro
 * lado não é uma pendência minha, e contá-lo dava um número que não desce
 * quando eu trabalho.
 */
export function contarPendencias(r: RetratoDaRelacao): number {
  const passos = r.papel === "cliente" ? passosDoCliente(r) : passosDoContabilista(r);
  return passos.filter((p) => p.tom === "acao" || p.tom === "atraso").length;
}

/** Os pedidos que ainda contam, do mais urgente para o menos. */
export function pedidosPorTratar(pedidos: PedidoCliente[], agora: Date): PedidoCliente[] {
  return pedidos.filter(pedidoPorFechar).sort(porPrazo(agora));
}
