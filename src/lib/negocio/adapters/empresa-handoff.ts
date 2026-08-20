// ═══════════════════════════════════════════════════════════════════════
//  NEGÓCIO → SIMULADOR DE EMPRESA: o handoff
//  ---------------------------------------------------------------------
//  §8 do relatório, e é a lacuna mais cara de todas: a ligação entre o
//  Estúdio e o Simulador de Empresa era um `<Link>`. A pessoa acabava de
//  definir faturação, ofertas, custos, pessoas, estrutura, região,
//  investimentos e volumes — e chegava a campos vazios.
//
//  «Navegar para outra engine não deve destruir contexto que essa engine
//  consegue reutilizar.»
//
//  ── AS TRÊS COISAS QUE ESTE FICHEIRO EXISTE PARA NÃO ERRAR ─────────
//
//  ① A DUPLA CONTAGEM (§14). `paraEmpresa()` entrega `despesasOper =
//    custosOperacionaisAno`, que já inclui a estrutura — está certo para
//    UMA chamada agregada ao motor. Copiá-lo para o handoff e preencher
//    `custosEstrutura` ao lado contava a estrutura duas vezes. O
//    invariante está em código, e há um teste que o prende:
//
//        despesasOper + custosEstrutura === custosOperacionaisAno
//
//  ② O QUE NÃO SE INVENTA (§16-18). Tipo de sociedade, salário do
//    gerente, dividendos, englobamento, viatura, RFAI, SIFIDE, imóvel e
//    residência do fundador NÃO saem de um modelo comercial. Um
//    trabalhador NUNCA vira gerente: são naturezas diferentes, e a equipa
//    entra em custos de pessoal. Um investimento de 20 000 € NÃO é
//    20 000 € de RFAI elegível — é uma pergunta para a fase seguinte.
//
//  ③ A LOCALIZAÇÃO (§111). Um `Regiao` das autónomas tem parâmetros
//    fiscais próprios e conhecidos; «continente» não é um município. Onde
//    não há município, o campo fica PENDENTE em vez de ser preenchido com
//    o primeiro da lista.
//
//  ── E NÃO CARREGA O MOTOR ──────────────────────────────────────────
//  §77: preparar o handoff é transformação de dados. Este ficheiro não
//  importa `fiscal-empresa.ts` — importa só os TIPOS do snapshot. O motor
//  continua a carregar no chunk do simulador, onde é preciso.
// ═══════════════════════════════════════════════════════════════════════

import { parametrosFiscaisPorRegiao } from "@/lib/incentivos-regioes";
import { cent, num } from "@/lib/pricing/numeros";
import type { SnapshotEmpresaGuiada } from "@/lib/empresa/snapshot";
import type {
  CategoriaCustoEstrutura,
  ContextoNegocio,
  ResultadoNegocio,
} from "../tipos";

// ─── Proveniência ──────────────────────────────────────────────────────

/**
 * De onde veio um número. §67: «proveniência é o antídoto para o
 * preenchimento mágico».
 *
 * `utilizador` — a pessoa escreveu-o;
 * `derivado`   — saiu de contas sobre o que ela escreveu;
 * `assumido`   — é um valor por omissão nosso, e diz-se;
 * `importado`  — chegou de outra ferramenta (é o que o simulador vê).
 */
export type OrigemCampo = "utilizador" | "derivado" | "assumido" | "importado";

export interface ProvenienciaCampo {
  origem: OrigemCampo;
  /** Uma frase que explica o número a quem o lê pela primeira vez. */
  texto: string;
}

/** Um campo que o Estúdio NÃO pode responder — e que o simulador vai pedir. */
export interface CampoEmpresaPendente {
  chave: string;
  rotulo: string;
  /** Porque é que isto não podia vir do modelo comercial. */
  porque: string;
}

export type SeveridadeHandoff = "info" | "atencao";

export interface HandoffAviso {
  id: string;
  severidade: SeveridadeHandoff;
  texto: string;
}

/**
 * O estado de completude entre ferramentas (§65).
 *
 * `pronto`    — receita e custos suficientemente definidos;
 * `parcial`   — dá para continuar, mas há premissas relevantes por fechar;
 * `bloqueado` — não há sequer volume de negócios utilizável.
 */
export type EstadoHandoff = "pronto" | "parcial" | "bloqueado";

/** Uma linha da estrutura, para o simulador poder explicar o total (§83). */
export interface LinhaEstruturaHandoff {
  categoria: CategoriaCustoEstrutura;
  rotulo: string;
  valorAnual: number;
}

export interface HandoffNegocioEmpresaV1 {
  versao: 1;
  estado: EstadoHandoff;

  origem: {
    tipo: "negocio";
    contextoId: string;
    nome?: string;
    criadoEm: string;
  };

  prefill: Partial<SnapshotEmpresaGuiada>;

  /** Decomposição do total de estrutura. O motor usa o total; a UI explica-o. */
  estrutura: LinhaEstruturaHandoff[];

  proveniencia: Record<string, ProvenienciaCampo>;
  pendentes: CampoEmpresaPendente[];
  avisos: HandoffAviso[];
}

// ─── Os campos que a fase societária tem de resolver ───────────────────

/**
 * §16. Cada um destes é uma DECISÃO, não uma dedução — e cada um deles,
 * inventado, mudava o resultado no sentido agradável sem ninguém dar por
 * isso.
 */
const PENDENTES_SEMPRE: readonly CampoEmpresaPendente[] = [
  {
    chave: "tipoSociedade",
    rotulo: "Tipo de sociedade",
    porque: "Unipessoal ou por quotas muda responsabilidade e obrigações — não sai das contas.",
  },
  {
    chave: "perfilFundador",
    rotulo: "Perfil do fundador",
    porque: "Residência fiscal e IFICI são da pessoa, não do negócio.",
  },
  {
    chave: "salGerenteMensal",
    rotulo: "Remuneração da gerência",
    porque:
      "É uma decisão societária, com efeitos em IRC, Segurança Social e IRS. O salário de quem contratas não serve de resposta.",
  },
  {
    chave: "distribuirDividendos",
    rotulo: "Dividendos",
    porque: "Distribuir ou reter o lucro muda o imposto total — e depende do que precisas de levantar.",
  },
  {
    chave: "tipoViatura",
    rotulo: "Viatura e tributação autónoma",
    porque: "A tributação autónoma depende do tipo de viatura e dos encargos, que o modelo comercial não conhece.",
  },
  {
    chave: "beneficios",
    rotulo: "Benefícios fiscais (RFAI, SIFIDE)",
    porque:
      "Ter investimento declarado não torna esse investimento elegível. A elegibilidade tem condições próprias.",
  },
];

// ─── O adapter ─────────────────────────────────────────────────────────

/**
 * Constrói o handoff a partir do negócio que a pessoa acabou de montar.
 *
 * Função PURA: não lê nem escreve armazenamento, não navega, não mede.
 * Quem guarda é `store/handoff-negocio-empresa.ts`; quem consome é o
 * simulador. Assim a transformação é testável sem browser — e é a
 * transformação que tem o invariante que mais custa partir.
 */
export function criarHandoffEmpresa(
  contexto: ContextoNegocio,
  negocio: ResultadoNegocio,
): HandoffNegocioEmpresaV1 {
  // ── ① Os custos, separados como a UI do simulador os pede ───────
  //  `despesasOper` = o que anda com a faturação.
  //  `custosEstrutura` = o que se paga mesmo num mês sem vendas.
  //  A soma é, por construção, `custosOperacionaisAno`.
  const despesasOper = cent(negocio.custosVariaveisMes * 12);
  const custosEstrutura = cent((negocio.overheadMes + negocio.custoTrabalhadoresMes) * 12);

  const faturacaoAnual = negocio.receitaSemIVAAno;
  const jaTemSociedade = contexto.maturidade === "empresa_existente";

  const prefill: Partial<SnapshotEmpresaGuiada> = {
    versao: 2,
    faturacaoAnual,
    // Já vem líquido de IVA. Dizer o contrário faria o simulador dividir
    // outra vez por 1,23 e tirar 19% à faturação sem nenhum sinal.
    faturacaoComIva: false,
    despesasOper,
    custosEstrutura,
  };

  const proveniencia: Record<string, ProvenienciaCampo> = {
    faturacaoAnual: {
      origem: "derivado",
      texto: descreverFaturacao(contexto, negocio),
    },
    faturacaoComIva: {
      origem: "derivado",
      texto: "O IVA ficou de fora: nunca foi receita, é do Estado a passar pela conta.",
    },
    despesasOper: {
      origem: "derivado",
      texto: "Custos que andam com a faturação — fornecedores, matérias, comissões.",
    },
    custosEstrutura: {
      origem: "derivado",
      texto: descreverEstrutura(negocio),
    },
  };

  const avisos: HandoffAviso[] = [];
  const pendentes: CampoEmpresaPendente[] = [...PENDENTES_SEMPRE];

  // ── ② A empresa já existe? (§84) ────────────────────────────────
  if (jaTemSociedade) {
    prefill.jaTemEmpresa = "sim";
    prefill.incluirConstituicao = false;
    proveniencia.jaTemEmpresa = {
      origem: "utilizador",
      texto: "Do teu percurso — indicaste à entrada que a empresa já existe.",
    };
    proveniencia.incluirConstituicao = {
      origem: "derivado",
      texto: "Sem custo de constituição: a sociedade já está constituída.",
    };
  } else {
    // §85: quem ainda vai abrir decide o tipo e a constituição lá.
    pendentes.push({
      chave: "incluirConstituicao",
      rotulo: "Custos de constituição",
      porque: "Ainda não tens sociedade: os custos de abrir fazem parte da decisão, e é lá que se contam.",
    });
  }

  // ── ③ A região, se for uma que tenha parâmetros próprios (§15) ──
  const regiao = contexto.fiscal.regiao;
  if (regiao === "madeira" || regiao === "acores") {
    const params = parametrosFiscaisPorRegiao(regiao);
    prefill.localizacao = params;
    prefill.localNome = params.nome;
    prefill.rfaiRegiao = params.rfaiTipo;
    proveniencia.localizacao = {
      origem: "utilizador",
      texto: `Do teu percurso — declaraste ${params.nome}.`,
    };
  } else {
    // §116: continente não é um município, e a derrama é municipal.
    pendentes.push({
      chave: "localizacao",
      rotulo: "Localização da sede",
      porque:
        "O projeto não tinha localização municipal. A derrama e os benefícios de interior dependem dela — não aplicámos nenhuma.",
    });
  }

  // ── ④ Investimento declarado ≠ benefício fiscal (§17) ───────────
  const investimento = totalInvestimento(contexto);
  if (investimento > 0) {
    avisos.push({
      id: "investimento-nao-e-beneficio",
      severidade: "info",
      texto: `Tens ${fmtEuros(
        investimento,
      )} de investimento declarado no projeto. Isso NÃO é automaticamente elegível para RFAI ou SIFIDE — a elegibilidade tem condições próprias, e é aqui que se verifica.`,
    });
  }

  // ── ⑤ A equipa é custo de pessoal, nunca gerência (§18) ─────────
  if (negocio.custoTrabalhadoresMes > 0) {
    avisos.push({
      id: "equipa-nao-e-gerencia",
      severidade: "info",
      texto: `Os ${fmtEuros(
        cent(negocio.custoTrabalhadoresMes * 12),
      )}/ano de quem tens contratado entraram nos custos de estrutura. A remuneração da gerência é uma decisão à parte e continua por decidir.`,
    });
  }

  // ── ⑥ Os defaults deixam de ser factos (§81-82) ─────────────────
  const contabilidade = valorDaCategoria(contexto, "contabilidade");
  if (contabilidade > 0) {
    avisos.push({
      id: "estrutura-substitui-defaults",
      severidade: "info",
      texto: `A tua estrutura já inclui contabilidade (${fmtEuros(
        cent(contabilidade * 12),
      )}/ano). Não somámos as estimativas padrão por cima.`,
    });
  }

  // ── ⑦ Avisos sobre o que ainda é frágil ─────────────────────────
  if (negocio.confianca === "exploratorio") {
    avisos.push({
      id: "confianca-exploratoria",
      severidade: "atencao",
      texto:
        "Os números do projeto vêm quase todos de exemplos. Vale a pena confirmá-los antes de decidir a estrutura da sociedade sobre eles.",
    });
  }

  return {
    versao: 1,
    estado: estadoDe(faturacaoAnual, negocio),
    origem: {
      tipo: "negocio",
      contextoId: contexto.id,
      nome: contexto.nome?.trim() || undefined,
      criadoEm: new Date().toISOString(),
    },
    prefill,
    estrutura: decomporEstrutura(contexto, negocio),
    proveniencia,
    pendentes,
    avisos,
  };
}

/**
 * A soma que NÃO PODE FALHAR (§14, §98).
 *
 * Exportada de propósito: é o invariante do handoff inteiro, e um teste
 * que o verifica vale mais do que qualquer comentário. Se um dia alguém
 * passar `custosOperacionaisAno` para `despesasOper` «porque é o que o
 * adapter da empresa faz», isto reprova antes de chegar ao ecrã.
 */
export function custosDoHandoffFecham(
  handoff: HandoffNegocioEmpresaV1,
  negocio: ResultadoNegocio,
  tolerancia = 0.02,
): boolean {
  const soma = num(handoff.prefill.despesasOper) + num(handoff.prefill.custosEstrutura);
  return Math.abs(soma - negocio.custosOperacionaisAno) <= tolerancia;
}

/** Vale a pena mostrar o convite de continuidade? */
export function handoffUtilizavel(h: HandoffNegocioEmpresaV1): boolean {
  return h.estado !== "bloqueado";
}

// ─── Auxiliares ────────────────────────────────────────────────────────

function estadoDe(faturacaoAnual: number, negocio: ResultadoNegocio): EstadoHandoff {
  if (faturacaoAnual <= 0) return "bloqueado";
  if (negocio.confianca === "exploratorio") return "parcial";
  // Sem estrutura nenhuma declarada, o resultado que a sociedade vai
  // tributar está por cima da verdade — dá para continuar, mas diz-se.
  if (negocio.overheadMes + negocio.custoTrabalhadoresMes <= 0) return "parcial";
  return "pronto";
}

function descreverFaturacao(contexto: ContextoNegocio, negocio: ResultadoNegocio): string {
  const n = negocio.ofertas.length;
  const temBase = (contexto.base?.volumeAnual ?? 0) > 0;

  if (n === 0 && temBase) return "O volume de negócios anual que declaraste no projeto.";
  if (n === 0) return "Volume de negócios do projeto.";

  const daOfertas = `Calculado a partir de ${n} ${n === 1 ? "oferta" : "ofertas"} × volume esperado × 12 meses.`;
  return temBase ? `${daOfertas} Inclui o volume que declaraste em bloco.` : daOfertas;
}

function descreverEstrutura(negocio: ResultadoNegocio): string {
  const partes: string[] = [];
  if (negocio.overheadMes > 0) partes.push("custos de manter o negócio aberto");
  if (negocio.custoTrabalhadoresMes > 0) partes.push("custo de quem tens contratado");
  if (partes.length === 0) return "Não declaraste estrutura no projeto.";
  return `Soma dos teus ${partes.join(" e ")}.`;
}

function totalInvestimento(contexto: ContextoNegocio): number {
  return cent(
    (contexto.estrutura?.investimentosIniciais ?? []).reduce((s, i) => s + Math.max(0, num(i.valor)), 0),
  );
}

/** Quanto pesa uma categoria no overhead que conta para o negócio. */
function valorDaCategoria(contexto: ContextoNegocio, categoria: CategoriaCustoEstrutura): number {
  return cent(
    (contexto.estrutura?.overheadMensal ?? [])
      .filter((c) => c.categoria === categoria && c.escopo !== "oferta")
      .reduce((s, c) => s + Math.max(0, num(c.mensal)), 0),
  );
}

/**
 * A estrutura linha a linha (§83).
 *
 * O motor continua a receber o total; isto é para a interface poder dizer
 * DE ONDE vem o total. Um número de 27 400 € sem decomposição é um número
 * que ninguém consegue confirmar — e o que não se confirma, não se corrige.
 */
function decomporEstrutura(
  contexto: ContextoNegocio,
  negocio: ResultadoNegocio,
): LinhaEstruturaHandoff[] {
  const linhas: LinhaEstruturaHandoff[] = (contexto.estrutura?.overheadMensal ?? [])
    .filter((c) => c.escopo !== "oferta" && num(c.mensal) > 0)
    .map((c) => ({
      categoria: c.categoria,
      rotulo: c.rotulo,
      valorAnual: cent(num(c.mensal) * 12),
    }));

  if (negocio.custoTrabalhadoresMes > 0) {
    linhas.push({
      categoria: "pessoal",
      rotulo: "Equipa (já com encargos)",
      valorAnual: cent(negocio.custoTrabalhadoresMes * 12),
    });
  }

  return linhas;
}

/**
 * Euros para uma frase de interface.
 *
 * Local de propósito: `@/lib/format` é uma dependência de UI, e este
 * ficheiro tem de continuar a poder ser importado por quem só quer o
 * contrato — §77, sem arrastar nada.
 */
function fmtEuros(v: number): string {
  return `${Math.round(v).toLocaleString("pt-PT")} €`;
}

/** As chaves do prefill que a interface deve mostrar como «vamos levar». */
export const CAMPOS_DO_HANDOFF: readonly { chave: string; rotulo: string }[] = [
  { chave: "faturacaoAnual", rotulo: "Volume de negócios" },
  { chave: "despesasOper", rotulo: "Custos da atividade" },
  { chave: "custosEstrutura", rotulo: "Custos de estrutura" },
  { chave: "localizacao", rotulo: "Região" },
  { chave: "jaTemEmpresa", rotulo: "A empresa já existe" },
  { chave: "incluirConstituicao", rotulo: "Custos de constituição" },
];

/** As linhas de «vamos levar», já filtradas pelo que existe mesmo. */
export function levamos(
  h: HandoffNegocioEmpresaV1,
): { chave: string; rotulo: string; proveniencia: ProvenienciaCampo }[] {
  return CAMPOS_DO_HANDOFF.flatMap(({ chave, rotulo }) => {
    const p = h.proveniencia[chave];
    return p ? [{ chave, rotulo, proveniencia: p }] : [];
  });
}
