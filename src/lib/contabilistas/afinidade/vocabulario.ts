// ═══════════════════════════════════════════════════════════════════════
//  O QUE CADA FERRAMENTA PEDE A UM CONTABILISTA
//  ---------------------------------------------------------------------
//  Esta tabela é a ponte entre dois catálogos que até aqui não se
//  conheciam: as dezassete ferramentas (`lib/ferramentas/catalogo.ts`) e as
//  dez áreas do eixo canónico (`contabilistas/catalogo.ts`).
//
//  ── Porque é que é escrita à mão e não derivada dos `topics` ──────────
//  Seria tentador mapear `topics` → áreas e acabar. Mas os `topics` foram
//  escritos para a PESQUISA — «prazos», «regioes», «custos» — e a pergunta
//  aqui é outra: de que profissional é que este cenário precisa. As duas
//  respostas divergem em quase metade dos casos. Um simulador de heranças
//  tem `topics: ["patrimonio", "imposto-selo", "heranca"]`, e o que ele
//  pede é uma pessoa que faça partilhas — que é a área, não os temas.
//
//  Uma correspondência editorial tem de poder ser lida e discutida linha a
//  linha. Derivá-la seria escondê-la.
//
//  ── O contrato ───────────────────────────────────────────────────────
//  `assertAfinidadeIntegra()` corre ao importar o índice do motor: uma
//  ferramenta do hub sem entrada aqui FALHA O BUILD. É o mesmo padrão de
//  `assertFiscalDataIntegrity()` e de `assertCatalogoFerramentas()` — a
//  regra vale por construção e não por disciplina.
// ═══════════════════════════════════════════════════════════════════════

import { FERRAMENTAS_ATIVAS, type ToolDefinition } from "@/lib/ferramentas";
import { AREAS, type AreaCanonica } from "../personalizacao/taxonomia";
import type { Necessidade, PesoDeArea } from "./tipos";

export interface PedidoDaFerramenta {
  /**
   * As áreas do eixo, com peso entre 0 e 1.
   *
   * `1` é «é disto que esta ferramenta trata». Os valores abaixo disso são
   * adjacências reais — quem faz IRS de independentes quase sempre faz
   * recibos verdes —, não uma tentativa de encher a lista.
   */
  areas: readonly PesoDeArea[];
  /**
   * As palavras próprias deste cenário, além dos `aliases` do catálogo.
   *
   * É contra esta lista que os termos escritos pelos contabilistas são
   * comparados. Servem para apanhar quem se descreve pela CLIENTELA
   * («criadores de conteúdo», «tvde») e não pela matéria fiscal — que é
   * exatamente quem o filtro de dez chips nunca soube encontrar.
   */
  vocabulario?: readonly string[];
}

const A = (area: AreaCanonica, peso: number): PesoDeArea => ({ area, peso });

export const AFINIDADE_POR_FERRAMENTA: Readonly<Record<string, PedidoDaFerramenta>> = {
  "recibos-verdes": {
    areas: [
      A("Recibos verdes", 1),
      A("IRS", 0.55),
      A("IVA", 0.35),
      A("Abertura de atividade", 0.25),
    ],
    vocabulario: ["freelancer", "prestacao de servicos", "tesouraria", "retencao na fonte"],
  },
  "simulador-irs": {
    areas: [
      A("IRS", 1),
      A("Recibos verdes", 0.4),
      A("Trabalhadores e salários", 0.3),
      A("Clientes internacionais", 0.2),
    ],
    vocabulario: ["modelo 3", "anexo b", "englobamento", "deducoes a coleta", "reembolso"],
  },
  "recibo-vencimento": {
    areas: [
      A("Trabalhadores e salários", 1),
      A("IRS", 0.5),
    ],
    vocabulario: ["processamento salarial", "subsidio de alimentacao", "duodecimos", "rh"],
  },
  "planeador-contratacao": {
    areas: [
      A("Trabalhadores e salários", 1),
      A("Sociedades e IRC", 0.35),
      A("Contabilidade organizada", 0.3),
      A("IRS", 0.25),
    ],
    vocabulario: [
      "contratacao", "custo patronal", "processamento salarial", "tsu",
      "apoios a contratacao", "pacote remuneratorio", "recursos humanos",
    ],
  },
  "regime-simplificado": {
    areas: [
      A("Recibos verdes", 1),
      A("IRS", 0.6),
      A("Contabilidade organizada", 0.45),
    ],
    vocabulario: ["coeficiente", "rendimento tributavel", "taxa efetiva"],
  },
  "seguranca-social": {
    areas: [
      A("Recibos verdes", 1),
      A("Trabalhadores e salários", 0.35),
    ],
    vocabulario: ["declaracao trimestral", "base de incidencia", "isencao do primeiro ano"],
  },
  "irs-jovem": {
    areas: [
      A("IRS", 1),
      A("Recibos verdes", 0.35),
      A("Trabalhadores e salários", 0.3),
    ],
    vocabulario: ["irs jovem", "primeiro emprego", "jovens"],
  },
  "comparar-regimes": {
    areas: [
      A("Contabilidade organizada", 1),
      A("Recibos verdes", 0.75),
      A("Sociedades e IRC", 0.7),
      A("IRS", 0.5),
    ],
    vocabulario: ["mudar de regime", "passar a empresa", "simplificado ou organizada"],
  },
  "simulador-empresa": {
    areas: [
      A("Sociedades e IRC", 1),
      A("Contabilidade organizada", 0.8),
      A("Trabalhadores e salários", 0.35),
    ],
    vocabulario: ["unipessoal", "lda", "constituicao de empresa", "dividendos", "derrama"],
  },
  "ato-isolado": {
    areas: [
      A("Abertura de atividade", 1),
      A("Recibos verdes", 0.7),
      A("IVA", 0.3),
    ],
    vocabulario: ["ato isolado", "abrir atividade", "trabalho pontual"],
  },
  "simulador-herancas": {
    areas: [
      A("Heranças e sucessões", 1),
      A("IRS", 0.25),
    ],
    vocabulario: ["partilha", "cabeca de casal", "imposto do selo", "obito", "doacao"],
  },
  "auditoria-recibo": {
    areas: [
      A("Trabalhadores e salários", 1),
      A("IRS", 0.4),
    ],
    vocabulario: ["recibo de vencimento", "descontos", "erro no recibo"],
  },
  "classificar-atividade": {
    areas: [
      A("Abertura de atividade", 1),
      A("Recibos verdes", 0.6),
      A("IRS", 0.3),
    ],
    vocabulario: ["cae", "codigo de atividade", "tabela do artigo 151", "alteracao de atividade"],
  },
  "payout-mor": {
    areas: [
      A("IVA", 1),
      A("Clientes internacionais", 0.7),
      A("Recibos verdes", 0.4),
    ],
    vocabulario: [
      "plataformas", "marketplace", "criadores de conteudo", "streaming",
      "autoliquidacao", "intracomunitario",
    ],
  },
  "mapa-contabilistas": {
    // A única ferramenta cuja matéria É a escolha de um profissional. Não
    // pede área nenhuma em especial — pede um contabilista. Por isso a
    // lista é larga e de peso baixo: serve para ordenar, não para excluir.
    areas: [
      A("Contabilidade organizada", 0.5),
      A("IRS", 0.45),
      A("Recibos verdes", 0.45),
      A("Sociedades e IRC", 0.4),
    ],
    vocabulario: ["avenca", "honorarios", "contabilista certificado"],
  },
  "descobrir-negocio": {
    areas: [
      A("Abertura de atividade", 1),
      A("Sociedades e IRC", 0.65),
      A("Recibos verdes", 0.5),
      A("Contabilidade organizada", 0.35),
    ],
    vocabulario: ["comecar um negocio", "plano de negocio", "viabilidade", "empreendedorismo"],
  },
  "calcular-preco": {
    areas: [
      A("Contabilidade organizada", 0.7),
      A("IVA", 0.65),
      A("Recibos verdes", 0.6),
      A("Sociedades e IRC", 0.4),
    ],
    vocabulario: ["margem", "markup", "estrutura de custos", "ponto de equilibrio", "tabela de precos"],
  },
};

/**
 * O que uma ferramenta pede, já na forma que o motor consome.
 *
 * Junta a tabela acima aos `aliases` do próprio catálogo — que são, por
 * definição, «a linguagem comum e os erros frequentes de quem procura». Se
 * um contabilista escreveu no perfil a mesma palavra que as pessoas usam
 * para procurar a ferramenta, isso é um sinal e não uma coincidência.
 */
export function necessidadeDaFerramenta(
  ferramenta: ToolDefinition,
  local: { distrito?: string | null; concelho?: string | null } = {},
): Necessidade {
  const pedido = AFINIDADE_POR_FERRAMENTA[ferramenta.id];

  const areas = [...(pedido?.areas ?? [])].sort((a, b) => b.peso - a.peso);
  const vocabulario = [
    ...(pedido?.vocabulario ?? []),
    ...ferramenta.aliases,
    ...ferramenta.topics.map((t) => t.replace(/-/g, " ")),
  ];

  return {
    origem: ferramenta.id,
    rotulo: ferramenta.title,
    areas,
    // Sem duplicados: o mesmo termo contado duas vezes inflacionava a
    // dimensão dos termos próprios sem provar nada de novo.
    vocabulario: [...new Set(vocabulario.map((v) => v.trim()).filter(Boolean))],
    distrito: local.distrito ?? null,
    concelho: local.concelho ?? null,
  };
}

// ─── Integridade ───────────────────────────────────────────────────────

export function validarAfinidade(
  ferramentas: ToolDefinition[] = FERRAMENTAS_ATIVAS,
): string[] {
  const erros: string[] = [];
  const conhecidas = new Set(ferramentas.map((f) => f.id));

  for (const f of ferramentas) {
    const pedido = AFINIDADE_POR_FERRAMENTA[f.id];
    if (!pedido) {
      erros.push(
        `A ferramenta «${f.id}» não diz que áreas pede a um contabilista. ` +
          "Acrescenta-a a AFINIDADE_POR_FERRAMENTA — sem isso, o fim da página fica sem ninguém.",
      );
      continue;
    }
    if (pedido.areas.length === 0) {
      erros.push(`«${f.id}» declara zero áreas. Uma lista vazia não ordena nada.`);
    }
    const vistas = new Set<string>();
    for (const { area, peso } of pedido.areas) {
      if (!AREAS.includes(area)) {
        erros.push(`«${f.id}» pede a área «${area}», que não está no eixo canónico.`);
      }
      if (vistas.has(area)) erros.push(`«${f.id}» repete a área «${area}».`);
      vistas.add(area);
      if (!(peso > 0) || peso > 1) {
        erros.push(`«${f.id}» dá à área «${area}» o peso ${peso}. Tem de estar entre 0 (exclusive) e 1.`);
      }
    }
    if (!pedido.areas.some((a) => a.peso >= 0.5)) {
      erros.push(
        `«${f.id}» não tem nenhuma área com peso ≥ 0,5. Uma ferramenta sem área principal ` +
          "ordena toda a gente da mesma maneira, que é o mesmo que não ordenar.",
      );
    }
  }

  for (const id of Object.keys(AFINIDADE_POR_FERRAMENTA)) {
    if (!conhecidas.has(id)) {
      erros.push(`AFINIDADE_POR_FERRAMENTA tem «${id}», que não é uma ferramenta ativa do hub.`);
    }
  }

  return erros;
}

export function assertAfinidadeIntegra(): void {
  const erros = validarAfinidade();
  if (erros.length > 0) {
    throw new Error(`Motor de afinidade inconsistente:\n  · ${erros.join("\n  · ")}`);
  }
}
