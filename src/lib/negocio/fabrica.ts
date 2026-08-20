// ═══════════════════════════════════════════════════════════════════════
//  FÁBRICA — os objetos vazios, num sítio só
//  ---------------------------------------------------------------------
//  Sem isto, cada componente que precisa de uma oferta nova escreve o seu
//  próprio literal — e ao terceiro há um que esquece `respondidos`, outro
//  que põe `versao: 1` como string e um terceiro que inventa um id com
//  `Date.now()` que colide quando se adicionam duas ofertas no mesmo
//  milissegundo.
//
//  Os valores por omissão daqui são pressupostos declarados: aparecem no
//  livro de pressupostos, e a interface diz que estão a ser assumidos.
// ═══════════════════════════════════════════════════════════════════════

import { cenarioPorChave } from "@/lib/pricing/perguntas";
import type { CenarioInicial } from "@/lib/pricing/tipos";
import type {
  CategoriaCustoEstrutura,
  CategoriaInvestimento,
  ContextoNegocio,
  CustoEstrutura,
  InvestimentoInicial,
  MaturidadeNegocio,
  OfertaNegocio,
  TrabalhadorPlaneado,
} from "./tipos";

export function uid(prefixo = "n"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefixo}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefixo}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Um negócio novo.
 *
 * O horizonte é 12 meses porque é o que a maior parte das pessoas
 * consegue projetar com honestidade; 36 meses de projeção sobre um
 * negócio que ainda não vendeu nada é ficção com três casas decimais.
 */
export function contextoNegocioVazio(
  maturidade: MaturidadeNegocio = "ideia",
): ContextoNegocio {
  const agora = new Date().toISOString();
  return {
    versao: 1,
    id: uid("neg"),
    maturidade,
    ofertas: [],
    estrutura: { overheadMensal: [], investimentosIniciais: [] },
    procura: { horizonteMeses: 12, modo: "simples" },
    fiscal: {
      // `nao_sei` é o estado honesto de quem ainda não decidiu — e é a
      // maioria de quem chega a este ecrã. Assumir «independente» seria
      // responder por ela à pergunta que a ferramenta existe para ajudar
      // a responder.
      //
      // ⚠️ EXCETO quem entrou por «Já tenho empresa» (§5). Essa pessoa já
      // respondeu: tem uma sociedade constituída. Voltar a perguntar-lhe
      // «como pensas operar?» seria transformar uma resposta dada numa
      // pergunta — exatamente o que §0 proíbe. E deixá-la em `nao_sei`
      // fazia a comparação e a conclusão nascerem incoerentes com a porta
      // por onde ela entrou.
      enquadramento: maturidade === "empresa_existente" ? "sociedade" : "nao_sei",
      // Quem já tem sociedade não vem escolher forma jurídica; vem
      // otimizar a que tem. A comparação continua disponível a pedido,
      // mas não é o eixo do percurso.
      compararAlternativas: maturidade !== "empresa_existente",
    },
    // A porta de entrada É uma resposta. Sem isto, o livro de pressupostos
    // pedia para sempre uma decisão que já tinha sido tomada no ato 0.
    respondidos: maturidade === "empresa_existente" ? ["enquadramento"] : [],
    meta: { criadoEm: agora, atualizadoEm: agora },
  };
}

/**
 * Uma oferta nova a partir de um cenário da pricing engine.
 *
 * O `ContextoPreco` vem inteiro do cenário — os mesmos valores por
 * omissão que a calculadora pública usa, e pela mesma razão: um exemplo
 * declarado ensina mais depressa do que um formulário vazio.
 */
export function novaOferta(
  cenario: CenarioInicial,
  opcoes: { nome?: string; volumeMes?: number } = {},
): OfertaNegocio {
  const definicao = cenarioPorChave(cenario);
  const pricing = definicao.contexto();

  return {
    id: uid("of"),
    nome: opcoes.nome?.trim() || definicao.rotulo,
    pricing,
    volume: {
      // O volume da própria pricing engine, para os dois não divergirem
      // logo à partida: é o mesmo número que forma o preço.
      esperadoMes: opcoes.volumeMes ?? pricing.volume.unidadesMes,
    },
    respondidos: [],
  };
}

export function novoCustoEstrutura(
  categoria: CategoriaCustoEstrutura,
  rotulo: string,
  mensal = 0,
): CustoEstrutura {
  return { id: uid("cst"), categoria, rotulo, mensal, escopo: "empresa" };
}

export function novoInvestimento(
  categoria: CategoriaInvestimento,
  rotulo: string,
  valor = 0,
): InvestimentoInicial {
  return { id: uid("inv"), categoria, rotulo, valor, mes: 0 };
}

export function novoTrabalhador(funcao = "", salarioBrutoMensal = 0): TrabalhadorPlaneado {
  return { id: uid("trb"), funcao, salarioBrutoMensal, meses: 14, entraNoMes: 0 };
}
