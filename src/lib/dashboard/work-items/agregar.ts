// ═══════════════════════════════════════════════════════════════════════
//  ORDENAR, DEDUPLICAR E ESCOLHER A PRÓXIMA AÇÃO
//  ---------------------------------------------------------------------
//  Puro: recebe listas, devolve listas. Não lê o `localStorage`, não toca
//  em React e não importa motor nenhum — é por isso que se testa sem
//  browser e é por isso que a visão geral o pode chamar a cada render.
// ═══════════════════════════════════════════════════════════════════════

import type { EstadoTrabalho, ItemTrabalho, LeituraTrabalho, TipoTrabalho } from "./tipos";

/**
 * Mais recente primeiro, com desempate ESTÁVEL pelo id.
 *
 * Sem o desempate, dois itens gravados no mesmo milissegundo trocavam de
 * lugar entre renders — e uma lista que dança debaixo do dedo faz perder
 * o clique a quem está a tentar acertar-lhe.
 */
export function ordenar(itens: readonly ItemTrabalho[]): ItemTrabalho[] {
  return [...itens].sort((a, b) => {
    const d = Date.parse(b.atualizadoEm) - Date.parse(a.atualizadoEm);
    return d !== 0 ? d : a.id.localeCompare(b.id);
  });
}

/**
 * O estúdio de negócio tem UM rascunho. Quando esse projeto também foi
 * guardado como cenário, há duas leituras do mesmo trabalho — o rascunho
 * local e o cenário. Fica o mais recente: são o mesmo projeto, e mostrar
 * dois cartões iguais com datas diferentes é pior do que mostrar um.
 *
 * As contratações NÃO se deduplicam: dois planos de contratação são duas
 * decisões diferentes, mesmo que tenham nascido no mesmo sítio.
 */
export function deduplicar(itens: readonly ItemTrabalho[]): ItemTrabalho[] {
  const negocios = itens.filter((i) => i.tipo === "negocio");
  if (negocios.length <= 1) return [...itens];
  const vencedor = ordenar(negocios)[0];
  return itens.filter((i) => i.tipo !== "negocio" || i.id === vencedor.id);
}

/** Estados que significam «isto ainda está a acontecer». */
const EM_CURSO: ReadonlySet<EstadoTrabalho> = new Set<EstadoTrabalho>([
  "rascunho",
  "por-completar",
  "em-teste",
  "desatualizado",
]);

export const emCurso = (item: ItemTrabalho): boolean => EM_CURSO.has(item.estado);

export interface TrabalhoAgregado {
  /** Tudo, ordenado e deduplicado. */
  itens: ItemTrabalho[];
  /** O que se pode retomar — é isto que a secção «Continuar» mostra. */
  aRetomar: ItemTrabalho[];
  falhas: LeituraTrabalho["falhas"];
  temTrabalho: boolean;
}

export function agregar(leituras: readonly LeituraTrabalho[]): TrabalhoAgregado {
  const itens = ordenar(deduplicar(leituras.flatMap((l) => l.itens)));
  return {
    itens,
    aRetomar: itens.filter(emCurso),
    falhas: leituras.flatMap((l) => l.falhas),
    temTrabalho: itens.length > 0,
  };
}

/** O item mais recente de uma etapa — o que o cartão do workspace mostra. */
export function itemDaEtapa(itens: readonly ItemTrabalho[], tipo: TipoTrabalho): ItemTrabalho | null {
  return ordenar(itens.filter((i) => i.tipo === tipo))[0] ?? null;
}

// ─── «Agora»: uma ação, não cinco CTA a competir ───────────────────────

/**
 * O motivo pelo qual esta é A ação. É um ENUM, e é o único campo desta
 * decisão que pode ir para medição: nunca o título, nunca o id, nunca o
 * valor.
 */
export type MotivoAgora =
  | "prazo"
  | "leitura-falhou"
  | "trabalho-incompleto"
  | "preco-desatualizado"
  | "perfil-fiscal"
  | "primeiro-passo";

export interface AccaoAgora {
  motivo: MotivoAgora;
  titulo: string;
  descricao: string;
  label: string;
  href: string;
}

export interface SinaisAgora {
  /** O prazo aplicável mais próximo, quando falta uma semana ou menos. */
  prazo?: { titulo: string; dias: number } | null;
  /** O perfil fiscal está preenchido ao ponto de os números serem fiáveis. */
  perfilFiscalCompleto?: boolean;
  /** Já há recibos registados — muda o primeiro passo sugerido. */
  temRecibos?: boolean;
}

/**
 * A ORDEM É A DECISÃO. Cada degrau só se avalia se o de cima não respondeu.
 *
 *   1. um prazo que se aproxima (é o único que tem multa do outro lado)
 *   2. trabalho que existe e não se consegue ler
 *   3. o que está a meio, pelo mais recente
 *   4. um preço guardado com regras que já mudaram
 *   5. o perfil fiscal por completar
 *   6. o primeiro passo, conforme o que a pessoa já tem
 *
 * Tudo isto se decide com estados e categorias locais. Nenhum texto livre,
 * nenhum valor, e nada disto sai do dispositivo.
 */
export function accaoAgora(agregado: TrabalhoAgregado, sinais: SinaisAgora = {}): AccaoAgora {
  const { prazo, perfilFiscalCompleto, temRecibos } = sinais;

  if (prazo && prazo.dias <= 7) {
    return {
      motivo: "prazo",
      titulo: prazo.dias <= 0 ? "Tens um prazo em atraso" : "Tens um prazo a fechar",
      descricao:
        prazo.dias <= 0
          ? `${prazo.titulo} — a data-limite já passou.`
          : `${prazo.titulo} — ${prazo.dias === 1 ? "falta 1 dia" : `faltam ${prazo.dias} dias`}.`,
      label: "Ver prazos",
      href: "/dashboard/prazos",
    };
  }

  if (agregado.falhas.length > 0) {
    return {
      motivo: "leitura-falhou",
      titulo: "Há trabalho guardado que não conseguimos ler",
      descricao:
        "Os dados continuam no dispositivo. Podes exportá-los em bruto antes de qualquer outra coisa — nada foi apagado.",
      label: "Ver o que aconteceu",
      href: "/dashboard/conta",
    };
  }

  const incompleto = agregado.aRetomar.find((i) => i.estado !== "desatualizado");
  if (incompleto) {
    return {
      motivo: "trabalho-incompleto",
      titulo: "Continua de onde ficaste",
      descricao: `${incompleto.titulo}${incompleto.subtitulo ? ` — ${incompleto.subtitulo}` : ""}.`,
      label: incompleto.proximaAccao.label,
      href: incompleto.proximaAccao.href,
    };
  }

  const desatualizado = agregado.itens.find((i) => i.estado === "desatualizado");
  if (desatualizado) {
    return {
      motivo: "preco-desatualizado",
      titulo: "Um preço teu foi calculado com regras anteriores",
      descricao: `${desatualizado.titulo} — vê o que mudou antes de o usares outra vez.`,
      label: desatualizado.proximaAccao.label,
      href: desatualizado.proximaAccao.href,
    };
  }

  if (perfilFiscalCompleto === false) {
    return {
      motivo: "perfil-fiscal",
      titulo: "Completa o perfil fiscal",
      descricao: "Sem ele, os números do painel são uma estimativa parcial e a saúde fiscal não se pode calcular.",
      label: "Completar perfil",
      href: "/dashboard/perfil",
    };
  }

  return temRecibos
    ? {
        motivo: "primeiro-passo",
        titulo: "Regista o próximo recibo",
        descricao: "É o que mantém o disponível para gastar, as reservas e os prazos a dizer a verdade.",
        label: "Registar recibo",
        href: "/dashboard/recibos-verdes",
      }
    : {
        motivo: "primeiro-passo",
        titulo: "O que queres resolver primeiro?",
        descricao: "Descobrir o que vender, pôr preço ao que já fazes, ou registar o primeiro recibo.",
        label: "Descobrir uma oportunidade",
        href: "/dashboard/descobrir",
      };
}
