// ═══════════════════════════════════════════════════════════════════════
//  O CONTRATO DE «TRABALHO EM CURSO»
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ A CAMADA QUE FALTAVA                                                 │
//  │                                                                     │
//  │ As funcionalidades cresceram em três camadas independentes:          │
//  │                                                                     │
//  │   catálogo   para ENCONTRAR ferramentas                              │
//  │   cofres     para PRESERVAR privacidade                              │
//  │   cenários   para GUARDAR resultados escolhidos                      │
//  │                                                                     │
//  │ Nenhuma delas responde à pergunta com que se abre o painel: «onde é  │
//  │ que eu ia?». Sem uma quarta camada, a única forma de integrar        │
//  │ Descobrir e Preços na visão geral era copiar componentes para lá ou  │
//  │ acrescentar links — as duas coisas que tornariam a página mais       │
//  │ longa e menos decisiva.                                              │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ISTO É UMA PROJEÇÃO PARA INTERFACE, NÃO UMA STORE NOVA.
//
//  Não contém o perfil de descoberta, o contexto de preço, notas,
//  entrevistas nem qualquer payload fiscal. Contém o que um cartão precisa
//  para dizer o que é, quando foi, em que estado está e para onde continua.
//  Se algum dia alguém precisar de mais do que isto num cartão, o sítio
//  certo é a rota do workspace — não este tipo.
//
//  REGRA DE FRONTEIRA: nem este ficheiro nem os adaptadores podem importar
//  `lib/negocio/descoberta/**`, `lib/negocio/market/**` ou `lib/pricing/**`.
//  A visão geral pagaria os bundles dos motores para desenhar três cartões.
//  Coberto por `dashboard-trabalho.test.ts`.
// ═══════════════════════════════════════════════════════════════════════

/** A etapa a que o item pertence. Alinhado com as secções da navegação. */
export type TipoTrabalho =
  | "descoberta"
  | "preco"
  | "negocio"
  | "contratacao"
  /** Simulações guardadas que não são nenhuma das etapas acima. */
  | "cenario";

export type EstadoTrabalho =
  /** Começado, sem nada respondido ainda. */
  | "rascunho"
  /** Começado e a meio: falta responder. */
  | "por-completar"
  /** Dá para ler um resultado e decidir. */
  | "pronto"
  /** Uma hipótese com provas a ser recolhidas. */
  | "em-teste"
  /** Guardado com regras/motor anteriores aos de hoje. */
  | "desatualizado"
  /** O que está guardado não se consegue ler. */
  | "ilegivel"
  /** Fechado: foi guardado como resultado. */
  | "concluido";

export interface ItemTrabalho {
  /** Estável entre leituras — é por ele que se deduplica local/nuvem. */
  id: string;
  tipo: TipoTrabalho;
  /** O nome que a PESSOA deu, ou um rótulo genérico. Nunca inventado. */
  titulo: string;
  subtitulo?: string;
  /** ISO. Ordena a lista e alimenta o `<time datetime>` do cartão. */
  atualizadoEm: string;
  /**
   * Só quando os DOIS números são conhecidos sem chamar um motor. Um
   * denominador inventado é pior do que não ter barra nenhuma.
   */
  progresso?: { feitos: number; total: number };
  estado: EstadoTrabalho;
  href: string;
  /** Onde ISTO está — e é o que o cartão diz, em texto. */
  fonte: "dispositivo" | "conta";
  proximaAccao: { label: string; href: string };
  /** Um número que ajude a reconhecer o item. Já formatado. */
  metrica?: { label: string; valor: string };
  versaoEsquema: number;
}

/** Rótulos de estado, em pt-PT. A interface não escreve estados à mão. */
export const ROTULO_ESTADO: Readonly<Record<EstadoTrabalho, string>> = {
  rascunho: "Começado",
  "por-completar": "Por completar",
  pronto: "Pronto para rever",
  "em-teste": "Em teste",
  desatualizado: "Regras mudaram",
  ilegivel: "Não foi possível ler",
  concluido: "Guardado",
};

export const ROTULO_TIPO: Readonly<Record<TipoTrabalho, string>> = {
  descoberta: "Descobrir",
  preco: "Preço",
  negocio: "Projeto de negócio",
  contratacao: "Contratação",
  cenario: "Simulação",
};

/** Chave de ícone (`components/ferramentas/icon-map.tsx`) por tipo. */
export const ICONE_TIPO: Readonly<Record<TipoTrabalho, string>> = {
  descoberta: "Lightbulb",
  preco: "Coin",
  negocio: "ChartProjection",
  contratacao: "Briefcase",
  cenario: "Receipt",
};

/**
 * Quando uma leitura local falha, isto é o que se sabe — e o que a
 * interface tem de mostrar em vez de «não tens nada».
 *
 * ┌───────────────────────────────────────────────────────────────────┐
 * │ UM ESTADO CORROMPIDO NÃO É UM ESTADO VAZIO                         │
 * │                                                                   │
 * │ As stores devolvem `[]` ou `null` a qualquer estranheza, e essa    │
 * │ decisão está certa para elas: um cofre ilegível nunca pode impedir │
 * │ a ferramenta de abrir. Mas o painel, ao herdar esse silêncio,      │
 * │ dizia à pessoa que o trabalho dela não existia — que é o pior      │
 * │ diagnóstico possível para «existe e não consegui lê-lo».          │
 * └───────────────────────────────────────────────────────────────────┘
 */
export interface FalhaLeitura {
  dominio: string;
  /** Versão do esquema encontrada, quando foi possível chegar a ela. */
  versaoEncontrada?: number;
}

export interface LeituraTrabalho {
  itens: ItemTrabalho[];
  falhas: FalhaLeitura[];
}

export const LEITURA_VAZIA: LeituraTrabalho = { itens: [], falhas: [] };
