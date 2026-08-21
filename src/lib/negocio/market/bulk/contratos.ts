// ═══════════════════════════════════════════════════════════════════════
//  CONTRATOS PÚBLICOS → OBSERVAÇÕES
//  ---------------------------------------------------------------------
//  O que se conta e o que NÃO se conta.
//
//  Conta-se: quantos contratos foram efetivamente celebrados, por zona e
//  por tipo. É um sinal transacional a sério — não é um inquérito, não é
//  uma intenção, é dinheiro público que mudou de mãos e ficou registado.
//
//  Não se soma `precoContratual`. O relatório mestre é explícito: «o valor
//  anunciado de um contrato não é receita provável de uma pequena empresa
//  e não deve alimentar diretamente um forecast». Publicar «450 M€ em
//  contratos na tua zona» convidaria exatamente à leitura que a frase
//  proíbe — e o número seria verdadeiro, o que a torna pior.
//
//  Não se conta a quota de PME. O campo `adjudicatarioPMEs` traz NIFs e,
//  nos 246 978 contratos de 2025, NUNCA aparece como lista vazia: ou tem
//  NIFs (213 382) ou não existe (33 596). Ou seja, «ausente» tanto pode
//  significar «nenhuma PME» como «não declarado», e nada nos dados
//  distingue os dois casos. Publicar 86% como «quota adjudicada a PME»
//  seria construir um número sobre um palpite acerca do serializador da
//  fonte — errado de uma maneira que ninguém conseguiria ver.
//
//  Também não se contam adjudicatários únicos: um NIF por zona e por ano
//  aproxima-se depressa de identificar empresas concretas, e não é isso
//  que uma pessoa a decidir se abre atividade precisa de saber.
// ═══════════════════════════════════════════════════════════════════════

import type { MarketRegion } from "../geografia";
import { resolverLocalExecucao, type MapaDeConcelhos } from "./geografia-concelhos";

/** A forma mínima que este agregador lê de cada contrato. */
export interface ContratoBruto {
  Ano?: unknown;
  tipoContrato?: unknown;
  tipoprocedimento?: unknown;
  localExecucao?: unknown;
}

/**
 * Os tipos de contrato que interessam a quem presta serviços.
 *
 * Empreitadas e concessões ficam de fora: quem está a decidir se abre
 * atividade a recibos verdes não concorre a obras públicas, e incluí-las
 * inflacionaria a contagem com procedimentos de outra liga.
 */
export const TIPOS_DE_SERVICO: readonly string[] = Object.freeze([
  "Aquisição de serviços",
  "Aquisição de bens móveis",
  "Locação de bens móveis",
]);

/**
 * Procedimentos por onde alguém de fora consegue entrar.
 *
 * Isto é uma lista de PERMISSÃO, e a escolha é o ponto. A primeira versão
 * fazia o contrário — «tudo o que não seja ajuste direto nem consulta
 * prévia» — e o resultado, medido nos dados de 2025, era contar como
 * «aberto» 31 040 chamadas ao abrigo de acordo-quadro e 14 485
 * contratações excluídas. Nenhuma delas é uma porta: para uma chamada ao
 * abrigo de acordo-quadro é preciso já estar no acordo-quadro. O número
 * inflacionava 86 019 quando a resposta honesta era 39 691.
 *
 * Uma lista de permissão falha do lado seguro: um tipo de procedimento
 * novo fica de fora até alguém o olhar, em vez de entrar em silêncio.
 * O agregador guarda todos os tipos que viu, para que isso seja visível.
 */
export const PROCEDIMENTOS_ABERTOS: readonly string[] = Object.freeze([
  // Todas as variantes de concurso — público, limitado por prévia
  // qualificação, de conceção — e as suas formas simplificadas.
  "concurso",
  "diálogo concorrencial",
  "parceria para a inovação",
]);

export interface ResumoDeContratos {
  /** Ano de referência declarado nos próprios contratos. */
  ano: number;
  /** Contagens por zona, só de tipos relevantes para serviços. */
  porRegiao: ReadonlyMap<MarketRegion, ContagemRegional>;
  nacional: ContagemRegional;
  /**
   * Quantos dos contratos nacionais foram colocados em pelo menos uma
   * zona. É daqui que sai a completude das observações regionais — e é a
   * diferença entre publicar «68 216 no Norte» e publicar isso a fingir
   * que a soma das zonas dá o país.
   */
  localizados: number;
  /** Nomes de concelho que a fonte traz e o INE não reconhece, por contagem. */
  naoResolvidos: ReadonlyMap<string, number>;
  /** Todos os tipos de procedimento vistos, abertos ou não, com contagem. */
  procedimentos: ReadonlyMap<string, number>;
  descartes: DescartesDeContratos;
  totalLido: number;
}

export interface ContagemRegional {
  /** Contratos de serviços e bens celebrados. */
  contratos: number;
  /** Procedimentos abertos à concorrência (ver `PROCEDIMENTOS_ABERTOS`). */
  concursos: number;
}

export interface DescartesDeContratos {
  anoDiferente: number;
  tipoNaoRelevante: number;
  semConcelho: number;
  concelhoDesconhecido: number;
  concelhoAmbiguo: number;
}

function vazia(): ContagemRegional {
  return { contratos: 0, concursos: 0 };
}

const texto = (valor: unknown): string => (typeof valor === "string" ? valor : "");

/**
 * Um contrato serve se ALGUM dos tipos declarados for de serviços.
 *
 * `tipoContrato` é sempre um array e 1 838 contratos de 2025 declaram mais
 * do que um tipo. Olhar só para o primeiro fazia um contrato de
 * «Empreitadas | Aquisição de serviços» desaparecer da contagem por causa
 * da ordem por que a fonte escreveu os dois rótulos.
 */
function ehDeServicos(tipoContrato: unknown): boolean {
  const tipos = Array.isArray(tipoContrato) ? tipoContrato : [tipoContrato];
  return tipos.some((tipo) => TIPOS_DE_SERVICO.includes(texto(tipo)));
}

/** Um procedimento publicitado, aberto a quem quiser apresentar proposta. */
export function ehConcurso(tipoProcedimento: string): boolean {
  const normalizado = tipoProcedimento.trim().toLowerCase();
  if (!normalizado) return false;
  return PROCEDIMENTOS_ABERTOS.some((aberto) => normalizado.startsWith(aberto));
}

export interface AcumuladorDeContratos {
  aceitar(contrato: ContratoBruto): void;
  concluir(): ResumoDeContratos;
}

/**
 * Acumula contrato a contrato, sem guardar nenhum.
 *
 * É deliberado que este objeto não retenha os registos: são quase 250 mil
 * por ano, e nada do que a ferramenta publica precisa de um contrato
 * individual. O que fica é a contagem.
 */
export function acumularContratos(
  ano: number,
  mapa: MapaDeConcelhos,
): AcumuladorDeContratos {
  const porRegiao = new Map<MarketRegion, ContagemRegional>();
  const nacional = vazia();
  const naoResolvidos = new Map<string, number>();
  const procedimentos = new Map<string, number>();
  const descartes: DescartesDeContratos = {
    anoDiferente: 0,
    tipoNaoRelevante: 0,
    semConcelho: 0,
    concelhoDesconhecido: 0,
    concelhoAmbiguo: 0,
  };
  let totalLido = 0;
  let localizados = 0;

  return {
    aceitar(contrato) {
      totalLido += 1;

      if (Number(contrato.Ano) !== ano) {
        descartes.anoDiferente += 1;
        return;
      }
      if (!ehDeServicos(contrato.tipoContrato)) {
        descartes.tipoNaoRelevante += 1;
        return;
      }

      const tipoProcedimento = texto(contrato.tipoprocedimento).trim();
      procedimentos.set(tipoProcedimento, (procedimentos.get(tipoProcedimento) ?? 0) + 1);
      const concurso = ehConcurso(tipoProcedimento);

      // O nacional conta sempre: um contrato sem concelho legível continua
      // a ser um contrato que aconteceu em Portugal.
      nacional.contratos += 1;
      if (concurso) nacional.concursos += 1;

      const locais = Array.isArray(contrato.localExecucao) ? contrato.localExecucao : [];
      if (locais.length === 0) {
        descartes.semConcelho += 1;
        return;
      }

      // Um contrato com vários locais conta uma vez em cada zona
      // distinta, e nunca duas vezes na mesma: é uma execução que acontece
      // mesmo em dois sítios, não dois contratos.
      const zonas = new Set<MarketRegion>();
      let falhou: ResumoFalha | null = null;
      let nomeFalhado = "";
      for (const local of locais) {
        const resolucao = resolverLocalExecucao(String(local), mapa);
        if (resolucao.estado === "resolvido") zonas.add(resolucao.regiao);
        else if (!falhou) {
          falhou = resolucao.estado;
          nomeFalhado = resolucao.estado === "sem-concelho" ? "" : resolucao.nome;
        }
      }

      if (zonas.size === 0) {
        if (falhou === "concelho-desconhecido") descartes.concelhoDesconhecido += 1;
        else if (falhou === "concelho-ambiguo") descartes.concelhoAmbiguo += 1;
        else descartes.semConcelho += 1;
        // Os nomes que a fonte usa e o INE não reconhece são uma contagem
        // a desaparecer sem ninguém dar por isso. Ficam à vista de quem
        // corre o job, para se poder decidir se vale a pena tratá-los.
        if (nomeFalhado) naoResolvidos.set(nomeFalhado, (naoResolvidos.get(nomeFalhado) ?? 0) + 1);
        return;
      }

      localizados += 1;

      for (const zona of zonas) {
        const contagem = porRegiao.get(zona) ?? vazia();
        contagem.contratos += 1;
        if (concurso) contagem.concursos += 1;
        porRegiao.set(zona, contagem);
      }
    },

    concluir() {
      return {
        ano,
        porRegiao,
        nacional,
        localizados,
        naoResolvidos,
        procedimentos,
        descartes,
        totalLido,
      };
    },
  };
}

type ResumoFalha = "sem-concelho" | "concelho-desconhecido" | "concelho-ambiguo";
