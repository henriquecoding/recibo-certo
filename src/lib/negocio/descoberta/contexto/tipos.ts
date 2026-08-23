// ═══════════════════════════════════════════════════════════════════════
//  CONTEXT ENGINE — quem é esta pessoa, a sério
//  ---------------------------------------------------------------------
//  O contexto anterior tinha seis campos: estrutura, entrega, capital em
//  três faixas, recorrência, um conjunto de competências sem nível, e uma
//  zona. Alguém com carrinha e cinco anos de logística era, para o motor,
//  indistinguível de alguém sem nada — bastava carregarem no mesmo chip.
//
//  Este ficheiro é o contrato do que o motor pode saber. Três regras que
//  o desenham:
//
//   1. **Tudo é opcional exceto o mínimo.** Uma pessoa tem de conseguir
//      uma primeira análise com cinco decisões. A profundidade é uma
//      escolha dela, não um portão.
//   2. **`undefined` significa «não perguntámos», nunca zero.** Um capital
//      por declarar não é capital nenhum, e um risco por declarar não é
//      aversão ao risco. A diferença decide se uma hipótese é eliminada
//      ou apenas não pontuada.
//   3. **Nada disto sai do dispositivo.** É a regra 8 das fronteiras, e é
//      anterior à barreira de PII: zona, competências, ativos, rendimento
//      pretendido e restrições são, em conjunto, identificadores.
// ═══════════════════════════════════════════════════════════════════════

import type { MarketRegion } from "@/lib/negocio/market/geografia";

// ── LOCALIZAÇÃO ──────────────────────────────────────────────────────

/** Densidade do território onde a pessoa opera. Muda o negócio, não só a copy. */
export type TipoTerritorio = "urbano" | "suburbano" | "rural";

/** Até onde o negócio pode chegar. É o eixo que separa local de nacional. */
export type AlcanceOperacional =
  | "bairro"
  | "concelho"
  | "regiao"
  | "nacional"
  | "internacional"
  | "online";

export interface ContextoLocalizacao {
  /** NUTS II — a lista fechada que a evidência sabe servir. */
  regiao: MarketRegion;
  /** Distrito, quando a pessoa o quiser dar. Lista fechada, nunca morada. */
  distrito?: string;
  territorio?: TipoTerritorio;
  alcance: AlcanceOperacional;
  /** Raio aceitável em quilómetros para trabalho presencial. */
  raioKm?: number;
  /** Aceita deslocar-se com regularidade? */
  disponibilidadeDeslocacao?: boolean;
  /** Aceitaria mudar de região por uma oportunidade? */
  aberturaMudarRegiao?: boolean;
}

// ── CAPITAL E ATIVOS ─────────────────────────────────────────────────

export interface ContextoCapital {
  /** O que existe hoje, em euros. `undefined` = não declarado. */
  disponivelAgora?: number;
  /** O teto absoluto, incluindo poupança que a pessoa não quer tocar já. */
  maximo?: number;
  /** Quanto consegue reinvestir por mês sem apertar. */
  mensal?: number;
  aberturaCredito?: boolean;
  aberturaInvestidores?: boolean;
  /** Precisa mesmo de começar sem praticamente nada? Restringe a sério. */
  precisaComecarSemCapital?: boolean;
}

/** Ativos que mudam o que é possível. A carrinha é o exemplo canónico. */
export type AtivoId =
  | "veiculo-ligeiro"
  | "veiculo-carga"
  | "espaco-comercial"
  | "armazem"
  | "terreno"
  | "cozinha-licenciada"
  | "oficina"
  | "ferramentas"
  | "equipamento-tecnico"
  | "computador"
  | "camara-video"
  | "stock"
  | "carta-conducao"
  | "carteira-clientes";

// ── TEMPO ────────────────────────────────────────────────────────────

export type Dedicacao = "integral" | "part-time" | "fins-de-semana" | "poucas-horas";

export interface ContextoTempo {
  dedicacao: Dedicacao;
  /** Horas por semana, quando a pessoa preferir dar o número. */
  horasSemana?: number;
  /** Em quantos meses quer começar. */
  prazoArranqueMeses?: number;
  /** Quanto tempo aguenta até à primeira receita. É uma restrição real. */
  prazoMaxPrimeiraReceitaMeses?: number;
}

// ── RENDIMENTO ───────────────────────────────────────────────────────

export type AmbicaoNegocio = "complemento" | "substituir-salario" | "crescer" | "escalar";

export interface ContextoRendimento {
  ambicao: AmbicaoNegocio;
  /** Mínimo mensal líquido abaixo do qual não vale a pena. */
  minimoMensal?: number;
  /** O alvo, quando existir. */
  alvoMensal?: number;
}

// ── COMPETÊNCIAS E EXPERIÊNCIA ───────────────────────────────────────

export type NivelCompetencia = "basico" | "intermedio" | "avancado";

/**
 * A relação da pessoa com uma área — separada do nível de propósito.
 *
 * «Sei fazer» e «já geri isto» são coisas diferentes, e «tenho contactos» é
 * a mais valiosa das seis para vender o primeiro serviço. Fundi-las num
 * booleano era deitar fora a informação que mais separa candidatos.
 */
export type TipoExperiencia =
  | "interesse"
  | "sei-fazer"
  | "trabalhei"
  | "geri"
  | "conheco-setor"
  | "tenho-contactos";

export interface CompetenciaDeclarada {
  id: string;
  nivel: NivelCompetencia;
  anos?: number;
  experiencia?: TipoExperiencia;
}

// ── EQUIPA ───────────────────────────────────────────────────────────

export type FormaEquipa = "sozinho" | "casal" | "familia" | "socios" | "equipa";

export interface ContextoEquipa {
  forma: FormaEquipa;
  /** Quantas pessoas, contando a própria. */
  pessoas?: number;
  /** Aceita contratar? É o que separa modelos que escalam dos que não. */
  disponibilidadeContratar?: boolean;
}

// ── PREFERÊNCIAS ─────────────────────────────────────────────────────

export type MercadoAlvo = "b2b" | "b2c" | "b2g" | "indiferente";
export type FormatoNegocio = "fisico" | "digital" | "hibrido";
export type NaturezaOferta = "servico" | "produto" | "intermediacao" | "producao" | "comercio";
export type PadraoReceita = "pontual" | "recorrente" | "contratos" | "indiferente";

export interface ContextoPreferencias {
  mercado: MercadoAlvo;
  formato: FormatoNegocio;
  /** Vazio = sem preferência declarada. */
  naturezas: readonly NaturezaOferta[];
  receita: PadraoReceita;
  /** Setores que interessam. Vazio = todos. */
  setoresPreferidos: readonly string[];
  /** Públicos com que a pessoa QUER trabalhar. */
  publicosPreferidos: readonly PublicoAlvo[];
}

export type PublicoAlvo =
  | "criancas"
  | "idosos"
  | "animais"
  | "empresas"
  | "turistas"
  | "familias"
  | "setor-publico"
  | "profissionais";

// ── RESTRIÇÕES ───────────────────────────────────────────────────────

/**
 * O que a pessoa NÃO quer ou NÃO pode fazer.
 *
 * Estas não são preferências fracas: eliminam. É a diferença entre um
 * motor que ordena e um motor que decide — e é o que faltava para alguém
 * poder dizer «não tenho carro» e deixar de ver rotas de entregas.
 */
export type RestricaoId =
  | "sem-empregados"
  | "sem-loja-fisica"
  | "sem-noites"
  | "sem-fins-de-semana"
  | "sem-stock"
  | "sem-redes-sociais"
  | "sem-porta-a-porta"
  | "sem-atividade-regulada"
  | "sem-carregar-peso"
  | "sem-carro"
  | "sem-financiamento"
  | "sem-alimentos"
  | "sem-atendimento-presencial"
  | "sem-deslocacoes"
  | "sem-trabalho-fisico";

// ── RISCO ────────────────────────────────────────────────────────────

export type PerfilRisco =
  | "muito-conservador"
  | "conservador"
  | "moderado"
  | "arrojado"
  | "muito-arrojado";

/**
 * As sete dimensões de risco, avaliadas em separado.
 *
 * Uma etiqueta só — «moderado» — esconde que a mesma pessoa pode aceitar
 * volatilidade de receita e não aceitar nenhum risco regulatório. Cada
 * dimensão tem a sua tolerância, e por omissão herda o perfil geral.
 */
export type DimensaoRisco =
  | "financeiro"
  | "procura"
  | "regulatorio"
  | "operacional"
  | "volatilidade"
  | "dependencia-clientes"
  | "sazonalidade"
  | "concorrencia";

export interface ContextoRisco {
  perfil: PerfilRisco;
  /** Tolerâncias específicas que divergem do perfil geral. */
  toleranciaPorDimensao?: Partial<Record<DimensaoRisco, PerfilRisco>>;
}

// ── O CONTRATO ───────────────────────────────────────────────────────

/**
 * Estrutura fiscal em que a pessoa pensa arrancar. Herda o vocabulário do
 * resto do produto de propósito: é a mesma decisão que o comparador toma.
 */
export type EstruturaPretendida = "recibos-verdes" | "empresa" | "por-decidir";

export interface OpportunityContext {
  /** Sobe quando o contrato muda de forma incompatível. */
  versao: 1;
  localizacao: ContextoLocalizacao;
  capital: ContextoCapital;
  ativos: readonly AtivoId[];
  tempo: ContextoTempo;
  rendimento: ContextoRendimento;
  competencias: readonly CompetenciaDeclarada[];
  equipa: ContextoEquipa;
  preferencias: ContextoPreferencias;
  restricoes: readonly RestricaoId[];
  risco: ContextoRisco;
  estrutura: EstruturaPretendida;
}

/**
 * O contexto mínimo viável — cinco decisões.
 *
 * Não é um contexto vazio: é o que a interface propõe antes de a pessoa
 * responder a alguma coisa, e é deliberadamente NEUTRO. Um capital por
 * declarar fica `undefined` e não elimina nada; um risco «moderado» é a
 * única posição que não empurra o resultado para nenhum dos lados.
 */
export const CONTEXTO_INICIAL: OpportunityContext = Object.freeze({
  versao: 1,
  localizacao: { regiao: "portugal", alcance: "regiao" },
  capital: {},
  ativos: [],
  tempo: { dedicacao: "part-time" },
  rendimento: { ambicao: "complemento" },
  competencias: [],
  equipa: { forma: "sozinho" },
  preferencias: {
    mercado: "indiferente",
    formato: "hibrido",
    naturezas: [],
    receita: "indiferente",
    setoresPreferidos: [],
    publicosPreferidos: [],
  },
  restricoes: [],
  risco: { perfil: "moderado" },
  estrutura: "por-decidir",
} as const);

// ── Leituras derivadas, usadas por vários motores ────────────────────

const ORDEM_RISCO: Readonly<Record<PerfilRisco, number>> = {
  "muito-conservador": 0,
  conservador: 1,
  moderado: 2,
  arrojado: 3,
  "muito-arrojado": 4,
};

/** A tolerância de uma dimensão, em escala 0–4. Herda o perfil geral. */
export function toleranciaDe(contexto: OpportunityContext, dimensao: DimensaoRisco): number {
  const especifica = contexto.risco.toleranciaPorDimensao?.[dimensao];
  return ORDEM_RISCO[especifica ?? contexto.risco.perfil];
}

/**
 * O teto de capital que a pessoa aceita mesmo.
 *
 * `undefined` quando nada foi declarado — e quem chama TEM de distinguir
 * isso de zero. Devolver `Infinity` por omissão faria uma hipótese de
 * 40 000 € passar o filtro de quem não disse nada, que é exatamente o
 * comportamento que se quer evitar; devolver 0 eliminaria tudo.
 */
export function tetoDeCapital(contexto: OpportunityContext): number | undefined {
  const { disponivelAgora, maximo, aberturaCredito } = contexto.capital;
  if (contexto.capital.precisaComecarSemCapital) return 500;
  const base = maximo ?? disponivelAgora;
  if (base === undefined) return undefined;
  // Crédito não multiplica o teto: alarga-o de forma declarada. Sem isto,
  // marcar «aceito crédito» abria a porta a qualquer investimento.
  return aberturaCredito ? base * 2 : base;
}

/** Horas por semana declaradas, ou o que a dedicação implica. */
export function horasSemanais(contexto: OpportunityContext): number {
  if (contexto.tempo.horasSemana !== undefined) return contexto.tempo.horasSemana;
  switch (contexto.tempo.dedicacao) {
    case "integral":
      return 40;
    case "part-time":
      return 20;
    case "fins-de-semana":
      return 12;
    case "poucas-horas":
      return 6;
  }
}

/** Quantas pessoas o negócio pode contar hoje. */
export function pessoasDisponiveis(contexto: OpportunityContext): number {
  if (contexto.equipa.pessoas !== undefined) return Math.max(1, contexto.equipa.pessoas);
  switch (contexto.equipa.forma) {
    case "sozinho":
      return 1;
    case "casal":
      return 2;
    case "familia":
      return 3;
    case "socios":
      return 2;
    case "equipa":
      return 4;
  }
}

export function temRestricao(contexto: OpportunityContext, id: RestricaoId): boolean {
  return contexto.restricoes.includes(id);
}

/** O nível de uma competência declarada, em escala 0–3 (0 = não tem). */
export function nivelDe(contexto: OpportunityContext, competenciaId: string): number {
  const declarada = contexto.competencias.find((item) => item.id === competenciaId);
  if (!declarada) return 0;
  return declarada.nivel === "avancado" ? 3 : declarada.nivel === "intermedio" ? 2 : 1;
}

/**
 * O mesmo nível em [0, 1], para PONDERAR em vez de testar.
 *
 * O configurador pergunta básico / intermédio / avançado desde sempre, e
 * o grafo lia a resposta como um booleano — `nivelDe(...) > 0`. Alguém
 * com dez anos de canalização e alguém que mexeu uma vez num sifão
 * produziam a mesma cobertura, o mesmo fit e a mesma posição na lista.
 *
 * A escala não começa em zero de propósito: quem declara «básico» SABE
 * fazer, e vale 0,6 do que sabe quem domina. Começar em 0,33 castigava
 * quem responde com honestidade — e é exatamente essa pessoa que a
 * ferramenta tem de servir bem.
 */
export function forcaDe(contexto: OpportunityContext, competenciaId: string): number {
  const declarada = contexto.competencias.find((item) => item.id === competenciaId);
  if (!declarada) return 0;
  return declarada.nivel === "avancado" ? 1 : declarada.nivel === "intermedio" ? 0.8 : 0.6;
}

/**
 * Quanto vale a relação declarada com uma área, em [0, 1].
 *
 * Seis valores, e o comentário que os introduziu dizia que «tenho
 * contactos» é o mais valioso dos seis para vender o primeiro serviço.
 * Estava certo, e durante todo esse tempo o campo não era lido por uma
 * única linha do motor. Passa a ser: é a diferença entre saber fazer e
 * ter a quem vender, e é a que decide se o primeiro mês tem receita.
 */
const PESO_EXPERIENCIA: Readonly<Record<TipoExperiencia, number>> = Object.freeze({
  "tenho-contactos": 1,
  geri: 0.9,
  trabalhei: 0.75,
  "conheco-setor": 0.6,
  "sei-fazer": 0.45,
  interesse: 0.2,
});

/**
 * A força da experiência numa competência, com os anos a somar.
 *
 * `undefined` devolve 0,35 e não zero: não declarar não é não ter, e o
 * campo é opcional no formulário. Os anos valem no máximo mais 0,15, com
 * teto aos cinco — a diferença entre um e cinco anos é grande, a
 * diferença entre dez e vinte não é o que decide um negócio novo.
 */
export function experienciaForca(
  contexto: OpportunityContext,
  competenciaId: string,
): number | null {
  const declarada = contexto.competencias.find((item) => item.id === competenciaId);
  if (!declarada) return null;
  const base = declarada.experiencia === undefined ? 0.35 : PESO_EXPERIENCIA[declarada.experiencia];
  const anos = declarada.anos ?? 0;
  return Math.min(1, base + 0.15 * Math.min(1, anos / 5));
}

/**
 * O nível de escalabilidade que cada ambição pressupõe, em 0–3.
 *
 * `ambicao` estava recolhida com quatro respostas e não era lida em lado
 * nenhum. Não serve para estimar receita — isso o motor recusa fazer —
 * mas serve para uma afirmação estrutural e verificável: um modelo que
 * troca horas por dinheiro (escalabilidade 0) não escala, e propô-lo a
 * quem disse «quero escalar» é propor o contrário do que foi pedido.
 */
export const ESCALABILIDADE_PRETENDIDA: Readonly<Record<AmbicaoNegocio, number>> = Object.freeze({
  complemento: 0,
  "substituir-salario": 1,
  crescer: 2,
  escalar: 3,
});

/** A pessoa tem contactos ou experiência de gestão nesta competência? */
export function experienciaDe(
  contexto: OpportunityContext,
  competenciaId: string,
): TipoExperiencia | undefined {
  return contexto.competencias.find((item) => item.id === competenciaId)?.experiencia;
}
