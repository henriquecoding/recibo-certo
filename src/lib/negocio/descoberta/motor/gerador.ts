// ═══════════════════════════════════════════════════════════════════════
//  GERADOR — onde a lista fechada deixa de existir
//  ---------------------------------------------------------------------
//  O motor antigo era `catalogo.map(fit).sort()`. Este compõe:
//
//     problema × modelo de receita × forma de entrega × zona
//
//  a partir das capacidades que o contexto alcança. Nenhum destes
//  candidatos está escrito em lado nenhum: o que está escrito são os
//  átomos, e a combinação nasce aqui.
//
//  ── PORQUE NÃO HÁ IA AQUI ──────────────────────────────────────────
//  Gerar dossiers com um LLM reintroduziria exatamente o problema que
//  este produto se orgulha de ter resolvido: premissas editoriais sem
//  proveniência apresentadas como factos. A composição é determinística —
//  o mesmo contexto produz o mesmo conjunto, e há um teste que o obriga.
//
//  ── O TÍTULO ───────────────────────────────────────────────────────
//  Composto, e não copiado. Quando existe um dossier curado para o par
//  (problema, modelo), o título vem de lá porque uma pessoa o escreveu
//  melhor. Para os outros — a maioria — é montado a partir da capacidade
//  dominante, do cliente e do modelo, em português que se lê.
// ═══════════════════════════════════════════════════════════════════════

import { marketRegionLabel, type MarketRegion } from "@/lib/negocio/market/geografia";
import type { OpportunityContext } from "../contexto/tipos";
import {
  capacidadesAlcancadas,
  modelosDoProblema,
  problemasAlcancaveis,
  type CapacidadeAlcancada,
} from "../conhecimento/grafo";
import { referenciaCurada } from "../conhecimento/seeds";
import type { Capacidade, ModeloReceita, Problema } from "../conhecimento/tipos";
import type { FormaEntrega } from "./tipos";

export interface CandidatoBruto {
  id: string;
  titulo: string;
  promessa: string;
  problema: Problema;
  modelo: ModeloReceita;
  entrega: FormaEntrega;
  regiao: MarketRegion;
  capacidades: readonly CapacidadeAlcancada[];
  /** A capacidade que mais pesa nesta composição. Decide o título. */
  dominante: Capacidade;
  seedTemplateId?: string;
}

/** As formas de entrega que um par (problema, capacidades) admite. */
function entregasPossiveis(capacidades: readonly CapacidadeAlcancada[]): readonly FormaEntrega[] {
  const presencial = capacidades.some((item) => item.capacidade.presencial);
  const remota = capacidades.some((item) => !item.capacidade.presencial);
  if (presencial && remota) return ["presencial", "hibrido", "remoto"];
  if (presencial) return ["presencial", "hibrido"];
  return ["remoto", "hibrido"];
}

/**
 * O título composto.
 *
 * Regra de escrita: começa pelo VERBO da capacidade, nomeia o cliente, e
 * só depois o modelo. «Rotas de recolha e entrega para oficinas, por
 * avença» lê-se; «Serviço B2B de logística» não diz nada a ninguém.
 */
function comporTitulo(
  dominante: Capacidade,
  problema: Problema,
  modelo: ModeloReceita,
): string {
  const cliente = problema.clientes[0] ?? "quem tem este problema";
  const clienteEmMinuscula = cliente.charAt(0).toLocaleLowerCase("pt-PT") + cliente.slice(1);
  const sufixo: Readonly<Record<string, string>> = {
    avenca: ", por avença mensal",
    projeto: ", por projeto",
    hora: ", por sessão",
    "contrato-anual": ", com contrato anual",
    "producao-propria": ", com produto próprio",
    "venda-direta": ", em venda direta",
    "loja-online": ", com loja online operada",
    intermediacao: ", com fee de coordenação",
    "produto-digital": ", como produto digital",
    "equipa-operacional": ", com equipa de reforço",
    "espaco-proprio": ", em espaço próprio",
    "lote-recorrente": ", por lote recorrente",
  };
  // Alguns rótulos já contêm «para» («Escrever para vender», «Vender a
  // empresas»): encadear outro produzia «Escrever para vender para
  // profissionais». Nesses casos o cliente entra depois de dois pontos.
  const encadeia = / para | a empresas$/.test(dominante.rotulo);
  return encadeia
    ? `${dominante.rotulo}: ${clienteEmMinuscula}${sufixo[modelo.id] ?? ""}`
    : `${dominante.rotulo} para ${clienteEmMinuscula}${sufixo[modelo.id] ?? ""}`;
}

function comporPromessa(problema: Problema, modelo: ModeloReceita): string {
  return `${problema.porqueDoi} ${modelo.comoSeCobra}`;
}

/**
 * A zona em que este candidato é proposto.
 *
 * Se o problema é nacional, é a zona da pessoa. Se o problema só existe
 * nalgumas zonas e a pessoa fixou uma delas, é essa. Se a pessoa não
 * fixou zona, propõe-se `portugal` e a interface diz que a leitura é
 * nacional — nunca se escolhe uma região por ela.
 */
function zonaDoCandidato(problema: Problema, contexto: OpportunityContext): MarketRegion | null {
  const { regiao } = contexto.localizacao;
  const nacional = problema.regioes.includes("portugal");
  if (nacional) return regiao;
  if (regiao === "portugal") return "portugal";
  return problema.regioes.includes(regiao) ? regiao : null;
}

export interface OpcoesGeracao {
  /**
   * Incluir capacidades que a pessoa NÃO alcança por falta de ativo.
   *
   * É o que alimenta a secção «fora do teu perfil»: hipóteses que
   * exigiriam uma mudança concreta e nomeável, em vez de desaparecerem.
   */
  incluirForaDePerfil?: boolean;
  /** Teto de segurança. O produto cartesiano cresce depressa. */
  maximo?: number;
}

export interface ResultadoGeracao {
  candidatos: readonly CandidatoBruto[];
  /** Quantas combinações foram consideradas antes de qualquer filtro. */
  combinacoesConsideradas: number;
  /**
   * Capacidades que a pessoa alcançaria se tivesse o ativo em falta.
   *
   * Quem transforma isto em «declara este meio e abres N hipóteses» é o
   * pipeline: só ele sabe quantas hipóteses sobrevivem à deduplicação e
   * à diversificação, e o número prometido tem de ser o que aparece.
   */
  capacidadesBloqueadasPorAtivo: readonly CapacidadeAlcancada[];
}

/**
 * Gera candidatos a partir do contexto.
 *
 * A ordem de composição é deliberada e determinística: problemas na ordem
 * do grafo, modelos na ordem declarada pelo problema, entregas na ordem
 * presencial → híbrido → remoto. O mesmo contexto produz sempre a mesma
 * sequência, o que torna o resto do pipeline reproduzível.
 */
export function generateCandidates(
  contexto: OpportunityContext,
  opcoes: OpcoesGeracao = {},
): ResultadoGeracao {
  const { incluirForaDePerfil = false, maximo = 400 } = opcoes;

  const comAtivos = capacidadesAlcancadas(contexto, { exigirAtivos: true });
  const semExigirAtivos = capacidadesAlcancadas(contexto, { exigirAtivos: false });
  const idsComAtivos = new Set(comAtivos.map((item) => item.capacidade.id));
  const bloqueadasPorAtivo = semExigirAtivos.filter(
    (item) => !idsComAtivos.has(item.capacidade.id) && item.ativosEmFalta.length > 0,
  );

  const base = incluirForaDePerfil ? semExigirAtivos : comAtivos;
  const candidatos: CandidatoBruto[] = [];
  let combinacoes = 0;

  for (const { problema, capacidades } of problemasAlcancaveis(base)) {
    const regiao = zonaDoCandidato(problema, contexto);
    if (regiao === null) continue;

    // A capacidade dominante é a de maior cobertura — a que a pessoa
    // domina melhor entre as que este problema pede.
    const dominante = capacidades[0]!.capacidade;

    for (const modelo of modelosDoProblema(problema)) {
      for (const entrega of entregasPossiveis(capacidades)) {
        combinacoes += 1;
        if (candidatos.length >= maximo) continue;

        // Uma composição incoerente não chega a nascer: um modelo que
        // exige loja física não se entrega remotamente, e um que exige
        // stock não se compõe com entrega remota pura.
        if (entrega === "remoto" && (modelo.precisaLojaFisica || modelo.precisaStock)) continue;
        if (entrega === "presencial" && modelo.id === "produto-digital") continue;

        const curado = referenciaCurada(problema.id, modelo.id);
        candidatos.push({
          id: `${problema.id}::${modelo.id}::${entrega}::${regiao}`,
          titulo: curado?.template.title ?? comporTitulo(dominante, problema, modelo),
          promessa: curado?.template.promise ?? comporPromessa(problema, modelo),
          problema,
          modelo,
          entrega,
          regiao,
          capacidades,
          dominante,
          seedTemplateId: curado?.template.id,
        });
      }
    }
  }

  return {
    candidatos,
    combinacoesConsideradas: combinacoes,
    capacidadesBloqueadasPorAtivo: bloqueadasPorAtivo,
  };
}

/** Rótulo em pt-PT da forma de entrega. */
export const ROTULO_ENTREGA: Readonly<Record<FormaEntrega, string>> = Object.freeze({
  presencial: "Presencial",
  hibrido: "Híbrido",
  remoto: "Remoto",
});

/** Descreve a zona de um candidato para a interface, sem inventar cobertura. */
export function descreverZona(regiao: MarketRegion): string {
  return regiao === "portugal" ? "Todo o país" : marketRegionLabel(regiao);
}
