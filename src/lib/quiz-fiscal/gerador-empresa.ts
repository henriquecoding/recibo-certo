/**
 * Banco de perguntas — EMPRESAS (sociedades, constituição e tributação).
 *
 * Três temas: criar empresa, legislação/sociedades e IRC & tributação.
 * As taxas fiscais (IRC, derrama, dividendos, RFAI/DLRR/SIFIDE) vêm de
 * `fiscal-data.ts` e os cenários de IRC são CALCULADOS, não inventados. Os
 * factos jurídicos (formas de sociedade, capital social, constituição) foram
 * verificados em fontes oficiais (CSC, IRN/gov.pt) e estão referenciados.
 */

import {
  IRC_TAXA_GERAL,
  IRC_TAXA_PME,
  IRC_LIMITE_PME,
  DERRAMA_MAX,
  DIVIDENDOS_TAXA,
  RFAI_TAXA_INTERIOR,
  RFAI_TAXA_LITORAL,
  RFAI_LIMITE_COLETA,
  DLRR_TAXA,
  DLRR_LIMITE_COLETA,
  SIFIDE_TAXA_BASE,
  SIFIDE_TAXA_INCREMENTAL,
  type SourceKey,
} from "../fiscal-data";
import { fonte, type QuizCategoria, type QuizPergunta } from "./types";

const cent = (n: number) => Math.round(n * 100) / 100;

function eur(n: number): string {
  return `${cent(n).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}
function eurInt(n: number): string {
  return `${Math.round(n).toLocaleString("pt-PT")} €`;
}
function pct(n: number): string {
  return `${(n * 100).toLocaleString("pt-PT", { maximumFractionDigits: 2 })}%`;
}

interface Opt {
  texto: string;
  porque: string;
}

function montar(
  id: string,
  categoria: QuizCategoria,
  dificuldade: 1 | 2 | 3,
  pergunta: string,
  correta: Opt,
  distratores: Opt[],
  legalBasis: string,
  fonteKey: SourceKey,
  seed: number
): QuizPergunta {
  const vistos = new Set([correta.texto]);
  const limpos: Opt[] = [];
  for (const d of distratores) {
    if (!vistos.has(d.texto)) {
      vistos.add(d.texto);
      limpos.push(d);
    }
    if (limpos.length === 3) break;
  }
  let extra = 1;
  const fillers = [
    "Nenhuma das anteriores",
    "Depende apenas do volume de negócios",
    "É decidido livremente, sem regra legal",
    "Apenas com autorização da Autoridade Tributária",
  ];
  while (limpos.length < 3) {
    const texto = fillers[extra - 1] ?? `Opção ${extra}`;
    if (!vistos.has(texto)) {
      vistos.add(texto);
      limpos.push({ texto, porque: "Não corresponde à regra aplicável." });
    }
    extra++;
  }
  const pos = seed % 4;
  const opcoes = [...limpos];
  opcoes.splice(pos, 0, correta);
  return { id, categoria, dificuldade, pergunta, opcoes, correta: pos, legalBasis, fonte: fonte(fonteKey) };
}

// Valores reais reutilizados
const T_GERAL = IRC_TAXA_GERAL.value; // 0,19
const T_PME = IRC_TAXA_PME.value; // 0,15
const LIM_PME = IRC_LIMITE_PME.value; // 50 000
const T_DERRAMA = DERRAMA_MAX.value; // 0,015
const T_DIV = DIVIDENDOS_TAXA.value; // 0,28
const CAPITAL_SA = 50000;

/** IRC de uma PME: 15% até 50.000 €, 19% no excedente. */
function ircPME(materia: number): number {
  return cent(Math.min(materia, LIM_PME) * T_PME + Math.max(0, materia - LIM_PME) * T_GERAL);
}

const acc: QuizPergunta[] = [];

// Tabela de formas jurídicas (factos verificados — CSC / IRN).
const TIPOS = [
  {
    nome: "sociedade por quotas",
    sigla: "Lda.",
    socios: "2 sócios",
    capital: "1 € por sócio (sem mínimo fixo)",
    resp: "limitada ao capital social",
    divisao: "quotas",
    admin: "a gerência",
  },
  {
    nome: "sociedade unipessoal por quotas",
    sigla: "Unipessoal, Lda.",
    socios: "1 sócio",
    capital: "1 €",
    resp: "limitada ao capital social",
    divisao: "uma única quota",
    admin: "a gerência",
  },
  {
    nome: "sociedade anónima",
    sigla: "S.A.",
    socios: "5 acionistas (ou 1, se for sociedade)",
    capital: "50.000 €",
    resp: "limitada ao valor das ações",
    divisao: "ações",
    admin: "o conselho de administração",
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════
//  TEMA 1 — Criar empresa
// ═══════════════════════════════════════════════════════════════════════
let n = 0;

const criConceptuais: Array<[1 | 2 | 3, string, Opt, Opt[], string, SourceKey]> = [
  [
    1,
    "Numa sociedade por quotas, qual é o capital social mínimo legal exigido?",
    { texto: "Não há mínimo fixo — 1 € por sócio (quota ≥ 1 €)", porque: "Correto. Desde 2011 não há capital mínimo: cada quota tem de ser ≥ 1 €." },
    [
      { texto: eurInt(5000), porque: "O mínimo de 5.000 € foi eliminado em 2011." },
      { texto: eurInt(CAPITAL_SA), porque: "50.000 € é o mínimo da sociedade anónima." },
      { texto: eurInt(1000), porque: "Não existe esse mínimo legal." },
    ],
    "CSC — capital das sociedades por quotas (quota ≥ 1 €)",
    "csc",
  ],
  [
    1,
    "Qual é o capital social mínimo de uma sociedade anónima (SA)?",
    { texto: eurInt(CAPITAL_SA), porque: "Correto. A SA exige um capital social mínimo de 50.000 €." },
    [
      { texto: eurInt(5000), porque: "Não corresponde ao mínimo da SA." },
      { texto: eurInt(1), porque: "1 € por sócio é a regra das sociedades por quotas." },
      { texto: eurInt(25000), porque: "O mínimo legal da SA é 50.000 €." },
    ],
    "CSC — capital social mínimo da sociedade anónima",
    "csc",
  ],
  [
    1,
    "Quantos sócios, no mínimo, tem uma sociedade por quotas (não unipessoal)?",
    { texto: "2 sócios", porque: "Correto. A sociedade por quotas exige no mínimo 2 sócios." },
    [
      { texto: "1 sócio", porque: "Com 1 sócio é uma unipessoal por quotas." },
      { texto: "3 sócios", porque: "Bastam 2 sócios." },
      { texto: "5 sócios", porque: "5 é o mínimo da sociedade anónima." },
    ],
    "CSC — número mínimo de sócios (sociedade por quotas)",
    "csc",
  ],
  [
    1,
    "Quantos sócios tem uma sociedade unipessoal por quotas?",
    { texto: "1 sócio", porque: "Correto. A unipessoal por quotas tem um único sócio." },
    [
      { texto: "2 sócios", porque: "Com 2 já seria uma sociedade por quotas plural." },
      { texto: "Entre 1 e 5", porque: "Por definição é unipessoal — 1 sócio." },
      { texto: "Pelo menos 3", porque: "Tem apenas 1 sócio." },
    ],
    "CSC — sociedade unipessoal por quotas",
    "csc",
  ],
  [
    2,
    "Qual é o número mínimo de acionistas de uma sociedade anónima (regra geral)?",
    { texto: "5 acionistas", porque: "Correto. A SA exige, em regra, no mínimo 5 acionistas (ou 1, se o sócio único for uma sociedade)." },
    [
      { texto: "2 acionistas", porque: "2 é o mínimo das sociedades por quotas." },
      { texto: "1 acionista (sempre)", porque: "Só com 1 se este for uma sociedade." },
      { texto: "3 acionistas", porque: "A regra geral é 5 acionistas." },
    ],
    "CSC — número mínimo de acionistas (SA)",
    "csc",
  ],
  [
    2,
    "O serviço «Empresa na Hora» permite constituir uma sociedade de que forma?",
    { texto: "Presencialmente, num balcão, num único atendimento", porque: "Correto. A Empresa na Hora constitui a sociedade de imediato, com pactos pré-aprovados." },
    [
      { texto: "Apenas por escritura num notário privado", porque: "Dispensa a escritura tradicional." },
      { texto: "Só ao fim de 30 dias de análise", porque: "É imediata — «na hora»." },
      { texto: "Exclusivamente por correio", porque: "É presencial e imediata (ou online)." },
    ],
    "Constituição imediata — Empresa na Hora (IRN)",
    "empresaConstituicao",
  ],
  [
    2,
    "Na «Empresa Online», optar por um pacto social pré-aprovado torna a constituição mais barata?",
    { texto: "Sim — o pacto pré-aprovado fica mais barato", porque: "Correto. Com pacto pré-aprovado a Empresa Online custa menos do que com pacto próprio." },
    [
      { texto: "Não, o preço é igual nos dois casos", porque: "O pré-aprovado tem custo mais baixo." },
      { texto: "Não, o pacto próprio é mais barato", porque: "É o pré-aprovado que fica mais barato." },
      { texto: "Só é possível com pacto próprio", porque: "Há a opção, mais económica, de pacto pré-aprovado." },
    ],
    "Empresa Online — pacto pré-aprovado vs. próprio",
    "empresaConstituicao",
  ],
  [
    2,
    "Um Empresário em Nome Individual (ENI) responde pelas dívidas da atividade de que forma?",
    { texto: "Com todo o seu património pessoal (responsabilidade ilimitada)", porque: "Correto. No ENI não há separação entre património pessoal e da atividade." },
    [
      { texto: "Só até ao capital social investido", porque: "Não há capital social autónomo." },
      { texto: "Nunca responde pessoalmente", porque: "Responde com todo o património pessoal." },
      { texto: "Apenas até 50.000 €", porque: "A responsabilidade é ilimitada." },
    ],
    "Empresário em Nome Individual — responsabilidade ilimitada",
    "empresaConstituicao",
  ],
  [
    2,
    "Como são tributados os rendimentos de um Empresário em Nome Individual (ENI)?",
    { texto: "Em IRS, na categoria B", porque: "Correto. O ENI não é sociedade: tributa em IRS (categoria B), não em IRC." },
    [
      { texto: "Em IRC, como uma sociedade", porque: "O IRC aplica-se a sociedades." },
      { texto: "Não paga imposto sobre o rendimento", porque: "Paga IRS sobre o rendimento da atividade." },
      { texto: "Em IVA apenas", porque: "O IVA é sobre o consumo, não o rendimento." },
    ],
    "ENI — tributação em IRS (categoria B)",
    "empresaConstituicao",
  ],
  [
    1,
    "O que identifica de forma única uma empresa (pessoa coletiva) perante a administração?",
    { texto: "O NIPC (Número de Identificação de Pessoa Coletiva)", porque: "Correto. As empresas são identificadas pelo NIPC, atribuído no registo." },
    [
      { texto: "O NIF do gerente", porque: "Identifica o gerente, não a empresa." },
      { texto: "O n.º de Segurança Social do sócio", porque: "Identifica a pessoa singular." },
      { texto: "O IBAN da empresa", porque: "É a conta bancária, não o identificador fiscal." },
    ],
    "Registo Nacional de Pessoas Coletivas — NIPC",
    "empresaConstituicao",
  ],
  [
    3,
    "Numa sociedade por quotas, qual é o valor nominal mínimo de cada quota?",
    { texto: "1 €", porque: "Correto. Cada quota tem de ter valor nominal ≥ 1 €." },
    [
      { texto: "5 €", porque: "O mínimo por quota é 1 €." },
      { texto: "0,01 € (1 cêntimo)", porque: "1 cêntimo é o mínimo das ações de uma SA, não das quotas." },
      { texto: "100 €", porque: "Não há mínimo de 100 € por quota." },
    ],
    "CSC — valor nominal mínimo da quota",
    "csc",
  ],
  [
    3,
    "Numa sociedade anónima, qual é o valor nominal mínimo de cada ação?",
    { texto: "1 cêntimo (0,01 €)", porque: "Correto. As ações têm valor nominal mínimo de 1 cêntimo." },
    [
      { texto: "1 €", porque: "1 € é o mínimo das quotas." },
      { texto: "5 €", porque: "Não corresponde ao mínimo das ações." },
      { texto: "50 €", porque: "Não corresponde ao mínimo das ações." },
    ],
    "CSC — valor nominal mínimo da ação",
    "csc",
  ],
  [
    2,
    "Para começar a faturar, uma empresa tem de cumprir que passo junto da Autoridade Tributária?",
    { texto: "Apresentar a declaração de início de atividade", porque: "Correto. Após a constituição, declara-se o início de atividade na AT." },
    [
      { texto: "Pagar logo o IRC do ano todo", porque: "O IRC apura-se no fim do exercício, não no início." },
      { texto: "Distribuir dividendos aos sócios", porque: "Os dividendos só existem se houver lucros." },
      { texto: "Registar uma marca europeia", porque: "O registo de marca é opcional e distinto da declaração de início." },
    ],
    "Início de atividade junto da AT",
    "empresaConstituicao",
  ],
];
criConceptuais.forEach(([dif, p, c, d, lb, fk], i) => {
  acc.push(montar(`emp-cri-c${i}`, "empresa_criacao", dif, p, c, d, lb, fk, n++));
});

// Capital social parametrizado — sociedade por quotas com N sócios = N × 1 €
[2, 3, 4, 5, 6, 7, 8, 9, 10].forEach((socios, i) => {
  acc.push(
    montar(
      `emp-cri-cap-${i}`,
      "empresa_criacao",
      1,
      `Uma sociedade por quotas com ${socios} sócios, cada um com a quota mínima legal, tem que capital social mínimo?`,
      { texto: eurInt(socios), porque: `Correto. Cada quota ≥ 1 €, logo ${socios} × 1 € = ${eurInt(socios)}.` },
      [
        { texto: eurInt(socios * 5000), porque: "Multiplica pelo antigo mínimo de 5.000 €, já eliminado." },
        { texto: eurInt(5000), porque: "O mínimo de 5.000 € deixou de existir em 2011." },
        { texto: eurInt(CAPITAL_SA), porque: "50.000 € é o mínimo da SA." },
      ],
      "CSC — capital = nº de sócios × 1 €",
      "csc",
      n++
    )
  );
});

// Falta de capital para a SA (50.000 €) — calculado
[5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000].forEach((reunido, i) => {
  const falta = CAPITAL_SA - reunido;
  acc.push(
    montar(
      `emp-cri-sa-${i}`,
      "empresa_criacao",
      3,
      `Quer constituir uma SA e já reuniu ${eurInt(reunido)} de capital. Quanto falta para o mínimo legal?`,
      { texto: eurInt(falta), porque: `Correto. 50.000 € − ${eurInt(reunido)} = ${eurInt(falta)}.` },
      [
        { texto: eurInt(reunido), porque: "É o que já tem, não o que falta." },
        { texto: eurInt(CAPITAL_SA), porque: "Ignora o que já foi reunido." },
        { texto: eurInt(Math.max(1, CAPITAL_SA - reunido * 2)), porque: "Não corresponde à diferença para o mínimo de 50.000 €." },
      ],
      "CSC — capital mínimo da SA (50.000 €)",
      "csc",
      n++
    )
  );
});

// Estruturadas por tipo (criação) — capital e nº de sócios
TIPOS.forEach((t, i) => {
  acc.push(
    montar(
      `emp-cri-tipo-cap-${i}`,
      "empresa_criacao",
      1,
      `Qual é o capital social mínimo de uma ${t.nome}?`,
      { texto: t.capital, porque: `Correto. Uma ${t.nome} tem como capital mínimo ${t.capital}.` },
      TIPOS.filter((o) => o.capital !== t.capital).map((o) => ({
        texto: o.capital,
        porque: `${o.capital} é o capital mínimo de uma ${o.nome}.`,
      })),
      "CSC — capital social por tipo de sociedade",
      "csc",
      n++
    ),
    montar(
      `emp-cri-tipo-soc-${i}`,
      "empresa_criacao",
      1,
      `Qual é o número mínimo de sócios de uma ${t.nome}?`,
      { texto: t.socios, porque: `Correto. Uma ${t.nome} exige ${t.socios}.` },
      TIPOS.filter((o) => o.socios !== t.socios).map((o) => ({
        texto: o.socios,
        porque: `${o.socios} é o mínimo de uma ${o.nome}.`,
      })),
      "CSC — número mínimo de sócios por tipo",
      "csc",
      n++
    )
  );
});

// ═══════════════════════════════════════════════════════════════════════
//  TEMA 2 — Legislação & sociedades
// ═══════════════════════════════════════════════════════════════════════
n = 0;

// Estruturadas por tipo (legislação) — responsabilidade, divisão de capital, administração, sigla
TIPOS.forEach((t, i) => {
  acc.push(
    montar(
      `emp-leg-resp-${i}`,
      "empresa_legislacao",
      2,
      `Numa ${t.nome}, até onde vai, em regra, a responsabilidade dos sócios?`,
      { texto: t.resp.charAt(0).toUpperCase() + t.resp.slice(1), porque: `Correto. Numa ${t.nome} a responsabilidade é ${t.resp}.` },
      [
        { texto: "Ilimitada, com todo o património pessoal", porque: "Essa é a regra do ENI, não desta sociedade." },
        { texto: "Limitada a metade do capital", porque: "A responsabilidade liga-se ao capital/ações, não a metade." },
        { texto: "Inexistente — só a empresa responde sempre", porque: "Há limites legais; a regra é a limitação ao capital." },
      ],
      "CSC — responsabilidade dos sócios por tipo",
      "csc",
      n++
    ),
    montar(
      `emp-leg-div-${i}`,
      "empresa_legislacao",
      1,
      `Numa ${t.nome}, o capital social divide-se em quê?`,
      { texto: t.divisao.charAt(0).toUpperCase() + t.divisao.slice(1), porque: `Correto. O capital de uma ${t.nome} divide-se em ${t.divisao}.` },
      [
        { texto: t.divisao.includes("quota") ? "Ações" : "Quotas", porque: "É a divisão do capital de outro tipo de sociedade." },
        { texto: "Obrigações", porque: "As obrigações são títulos de dívida, não a divisão do capital." },
        { texto: "Lotes", porque: "Não é a designação legal." },
      ],
      "CSC — divisão do capital por tipo",
      "csc",
      n++
    ),
    montar(
      `emp-leg-adm-${i}`,
      "empresa_legislacao",
      2,
      `Qual é o órgão de administração típico de uma ${t.nome}?`,
      { texto: t.admin.charAt(0).toUpperCase() + t.admin.slice(1), porque: `Correto. Uma ${t.nome} é administrada por ${t.admin}.` },
      [
        { texto: t.admin.includes("gerência") ? "O conselho de administração" : "A gerência", porque: "É o órgão de administração de outro tipo de sociedade." },
        { texto: "A assembleia de credores", porque: "Não é um órgão de administração societária." },
        { texto: "O conselho fiscal", porque: "É um órgão de fiscalização, não de administração." },
      ],
      "CSC — administração por tipo de sociedade",
      "csc",
      n++
    ),
    montar(
      `emp-leg-sigla-${i}`,
      "empresa_legislacao",
      1,
      `Que sigla identifica, na firma, uma ${t.nome}?`,
      { texto: t.sigla, porque: `Correto. Uma ${t.nome} usa a sigla «${t.sigla}».` },
      TIPOS.filter((o) => o.sigla !== t.sigla).map((o) => ({
        texto: o.sigla,
        porque: `«${o.sigla}» identifica uma ${o.nome}.`,
      })),
      "CSC — firma e siglas das sociedades",
      "csc",
      n++
    )
  );
});

const legConceptuais: Array<[1 | 2 | 3, string, Opt, Opt[], string, SourceKey]> = [
  [
    3,
    "Que diploma regula os tipos de sociedade, o capital social e os órgãos sociais em Portugal?",
    { texto: "O Código das Sociedades Comerciais (CSC)", porque: "Correto. O CSC (DL 262/86) é a lei-quadro das sociedades comerciais." },
    [
      { texto: "O Código do IRC", porque: "Regula a tributação das pessoas coletivas, não a forma." },
      { texto: "O Código do Trabalho", porque: "Regula as relações laborais." },
      { texto: "O Código do IVA", porque: "Regula o imposto sobre o consumo." },
    ],
    "Código das Sociedades Comerciais (DL 262/86)",
    "csc",
  ],
  [
    3,
    "Qual destas formas implica responsabilidade ilimitada do titular pelas dívidas?",
    { texto: "Empresário em Nome Individual (ENI)", porque: "Correto. No ENI o titular responde com todo o património pessoal." },
    [
      { texto: "Sociedade unipessoal por quotas", porque: "Tem responsabilidade limitada, mesmo com 1 sócio." },
      { texto: "Sociedade anónima", porque: "Os acionistas respondem até ao valor das ações." },
      { texto: "Sociedade por quotas", porque: "A responsabilidade é, em regra, limitada ao capital." },
    ],
    "Formas jurídicas — responsabilidade ilimitada (ENI)",
    "empresaConstituicao",
  ],
  [
    2,
    "Uma sociedade anónima é, em regra, obrigada a ter que órgão de fiscalização?",
    { texto: "Conselho fiscal ou fiscal único (com ROC)", porque: "Correto. A SA tem de ter fiscalização própria (conselho fiscal ou fiscal único)." },
    [
      { texto: "Nenhum — dispensa fiscalização", porque: "A SA está sujeita a fiscalização obrigatória." },
      { texto: "Apenas a Autoridade Tributária", porque: "A AT fiscaliza impostos; a sociedade tem órgão próprio." },
      { texto: "Uma assembleia de trabalhadores", porque: "Não é um órgão de fiscalização societária." },
    ],
    "CSC — fiscalização da sociedade anónima",
    "csc",
  ],
  [
    2,
    "Quem representa e vincula uma sociedade por quotas perante terceiros?",
    { texto: "O(s) gerente(s)", porque: "Correto. A gerência representa e obriga a sociedade nos termos do pacto." },
    [
      { texto: "Qualquer sócio, individualmente", porque: "Só vincula quem tiver poderes de gerência." },
      { texto: "O contabilista certificado", porque: "Trata da contabilidade, não vincula a sociedade." },
      { texto: "A Conservatória do Registo Comercial", porque: "Regista atos, não representa a sociedade." },
    ],
    "CSC — representação pela gerência",
    "csc",
  ],
  [
    2,
    "Qual destas NÃO é uma forma de sociedade prevista no Código das Sociedades Comerciais?",
    { texto: "Sociedade de rendimento garantido", porque: "Correto. Não existe esse tipo legal; é uma designação inventada." },
    [
      { texto: "Sociedade por quotas", porque: "É um dos tipos previstos no CSC." },
      { texto: "Sociedade anónima", porque: "É um dos tipos previstos no CSC." },
      { texto: "Sociedade em nome coletivo", porque: "É um dos tipos previstos no CSC." },
    ],
    "CSC — tipos de sociedade comercial",
    "csc",
  ],
  [
    1,
    "A assembleia geral de uma sociedade é o órgão que faz o quê?",
    { texto: "Reúne os sócios para deliberar (ex.: aprovar contas)", porque: "Correto. A assembleia geral é o órgão deliberativo dos sócios." },
    [
      { texto: "Gere o dia-a-dia da empresa", porque: "A gestão corrente cabe à gerência/administração." },
      { texto: "Fiscaliza as contas em exclusivo", porque: "A fiscalização cabe ao conselho fiscal/ROC." },
      { texto: "Cobra os impostos da empresa", porque: "Os impostos são cobrados pela AT." },
    ],
    "CSC — assembleia geral (órgão deliberativo)",
    "csc",
  ],
  [
    3,
    "A distribuição de lucros aos sócios (dividendos) depende, em regra, de quê?",
    { texto: "De haver lucros distribuíveis e deliberação dos sócios", porque: "Correto. Só se distribuem lucros existentes e mediante deliberação social." },
    [
      { texto: "É automática todos os meses", porque: "Depende de lucros e de deliberação, não é automática." },
      { texto: "Da autorização da Segurança Social", porque: "A SS não autoriza distribuição de lucros." },
      { texto: "Do número de trabalhadores", porque: "Não depende do número de trabalhadores." },
    ],
    "CSC — distribuição de lucros",
    "csc",
  ],
  [
    2,
    "Uma sociedade por quotas pode ter apenas 1 sócio?",
    { texto: "Sim, sob a forma de sociedade unipessoal por quotas", porque: "Correto. Com 1 sócio a forma é a unipessoal por quotas." },
    [
      { texto: "Não, precisa sempre de 2 ou mais", porque: "Existe a figura unipessoal, com 1 sócio." },
      { texto: "Só se for uma SA", porque: "A unipessoal por quotas permite 1 sócio sem ser SA." },
      { texto: "Apenas com autorização judicial", porque: "Não é preciso autorização judicial." },
    ],
    "CSC — sociedade unipessoal por quotas",
    "csc",
  ],
];
legConceptuais.forEach(([dif, p, c, d, lb, fk], i) => {
  acc.push(montar(`emp-leg-c${i}`, "empresa_legislacao", dif, p, c, d, lb, fk, n++));
});

// ═══════════════════════════════════════════════════════════════════════
//  TEMA 3 — IRC & tributação
// ═══════════════════════════════════════════════════════════════════════
n = 0;

const fisConceptuais: Array<[1 | 2 | 3, string, Opt, Opt[], string, SourceKey]> = [
  [
    1,
    "Qual é a taxa geral de IRC em Portugal continental em 2026?",
    { texto: pct(T_GERAL), porque: `Correto. A taxa geral de IRC é ${pct(T_GERAL)} em 2026 (reduzida de 20% pelo OE2026).` },
    [
      { texto: pct(0.21), porque: "21% era a taxa de anos anteriores." },
      { texto: pct(0.2), porque: "20% vigorou antes; o OE2026 reduziu para 19%." },
      { texto: pct(T_PME), porque: "15% é a taxa reduzida das PME." },
    ],
    "Art. 87.º CIRC — taxa geral 2026",
    "art87circ",
  ],
  [
    1,
    "Que imposto sobre o rendimento pagam as sociedades (pessoas coletivas)?",
    { texto: "IRC", porque: "Correto. As sociedades pagam IRC sobre os seus lucros." },
    [
      { texto: "IRS", porque: "O IRS é das pessoas singulares." },
      { texto: "IMI", porque: "O IMI é sobre imóveis." },
      { texto: "IUC", porque: "O IUC é sobre veículos." },
    ],
    "IRC — imposto sobre o rendimento das pessoas coletivas",
    "art87circ",
  ],
  [
    2,
    "A taxa reduzida de IRC para PME aplica-se a que parte da matéria coletável?",
    { texto: `${pct(T_PME)} sobre os primeiros ${eurInt(LIM_PME)}`, porque: `Correto. As PME aplicam ${pct(T_PME)} aos primeiros ${eurInt(LIM_PME)}; o excedente vai à taxa geral.` },
    [
      { texto: `${pct(T_PME)} sobre toda a matéria coletável`, porque: "A taxa reduzida só abrange os primeiros 50.000 €." },
      { texto: `${pct(T_GERAL)} sobre os primeiros ${eurInt(LIM_PME)}`, porque: "Nos primeiros 50.000 € a taxa PME é 15%." },
      { texto: `${pct(T_PME)} sobre os primeiros ${eurInt(25000)}`, porque: "O limiar é 50.000 €, não 25.000 €." },
    ],
    "Art. 87.º CIRC — taxa reduzida PME (15% até 50.000 €)",
    "art87circ",
  ],
  [
    2,
    "Qual é a taxa máxima legal da derrama municipal sobre o lucro tributável?",
    { texto: pct(T_DERRAMA), porque: `Correto. A derrama municipal tem o limite máximo de ${pct(T_DERRAMA)}.` },
    [
      { texto: pct(0.05), porque: "5% excede o máximo legal." },
      { texto: pct(0.03), porque: "Acima do máximo de 1,5%." },
      { texto: pct(T_GERAL), porque: "19% é o IRC, não a derrama." },
    ],
    "Derrama municipal — taxa máxima legal (1,5%)",
    "art87circ",
  ],
  [
    2,
    "Quando uma sociedade distribui dividendos a um sócio pessoa singular, qual é a taxa liberatória de IRS?",
    { texto: pct(T_DIV), porque: `Correto. Os dividendos estão sujeitos a taxa liberatória de ${pct(T_DIV)} (Art. 71.º CIRS).` },
    [
      { texto: pct(T_GERAL), porque: "19% é o IRC da sociedade, não a dos dividendos." },
      { texto: pct(0.25), porque: "Não corresponde à taxa dos dividendos." },
      { texto: pct(0.2), porque: "Não corresponde à taxa liberatória de 28%." },
    ],
    "Art. 71.º CIRS — taxa liberatória sobre dividendos",
    "art71cirs",
  ],
  [
    2,
    "Qual é a principal declaração anual de apuramento do IRC de uma sociedade?",
    { texto: "A Declaração Modelo 22", porque: "Correto. O IRC apura-se na Declaração Modelo 22, entregue anualmente." },
    [
      { texto: "A Declaração Modelo 3", porque: "A Modelo 3 é do IRS das pessoas singulares." },
      { texto: "A declaração periódica de IVA", porque: "Apura o IVA, não o IRC." },
      { texto: "A DMR", porque: "Reporta retenções, não apura o IRC." },
    ],
    "IRC — declaração de rendimentos (Modelo 22)",
    "ircObrigacoes",
  ],
  [
    2,
    "A IES (Informação Empresarial Simplificada) serve sobretudo para quê?",
    { texto: "Entregar de uma só vez obrigações de contas e fiscais anuais", porque: "Correto. A IES centraliza, num único envio, a prestação de contas e várias obrigações anuais." },
    [
      { texto: "Pagar o IVA mensal", porque: "O IVA paga-se na declaração periódica própria." },
      { texto: "Registar trabalhadores na Segurança Social", porque: "Isso faz-se na Segurança Social Direta." },
      { texto: "Pedir o NIPC da empresa", porque: "O NIPC obtém-se no registo." },
    ],
    "IES/DA — Informação Empresarial Simplificada",
    "ircObrigacoes",
  ],
  [
    3,
    "O que é a tributação autónoma em IRC?",
    { texto: "Imposto sobre certas despesas (ex.: viaturas, representação), à parte do lucro", porque: "Correto. Incide sobre encargos específicos, mesmo sem lucro (Art. 88.º CIRC)." },
    [
      { texto: "Uma segunda taxa sobre todo o lucro tributável", porque: "Incide sobre despesas específicas, não sobre o lucro global." },
      { texto: "Um desconto automático no IRC a pagar", porque: "É um imposto adicional, não um desconto." },
      { texto: "A derrama estadual", porque: "São figuras distintas." },
    ],
    "Art. 88.º CIRC — tributação autónoma",
    "art88circ",
  ],
  [
    3,
    "O RFAI traduz-se em que benefício?",
    { texto: `Crédito de IRC sobre o investimento elegível (${pct(RFAI_TAXA_INTERIOR.value)} no interior, ${pct(RFAI_TAXA_LITORAL.value)} no litoral)`, porque: `Correto. O RFAI dá um crédito de IRC: ${pct(RFAI_TAXA_INTERIOR.value)} no interior e ${pct(RFAI_TAXA_LITORAL.value)} em Lisboa/Algarve.` },
    [
      { texto: "Uma isenção total e permanente de IRC", porque: "É um crédito limitado à coleta, não isenção total." },
      { texto: "Uma redução do IVA das compras", porque: "É um benefício em IRC, não em IVA." },
      { texto: "Um subsídio a fundo perdido", porque: "É um crédito dedutível à coleta, não um subsídio." },
    ],
    "Art. 23.º CFI — RFAI (crédito de IRC)",
    "occRFAI",
  ],
  [
    3,
    "A dedução do RFAI à coleta de IRC está, em regra, limitada a que percentagem da coleta?",
    { texto: pct(RFAI_LIMITE_COLETA.value), porque: `Correto. O RFAI deduz-se até ${pct(RFAI_LIMITE_COLETA.value)} da coleta (100% nos primeiros 3 anos).` },
    [
      { texto: pct(DLRR_LIMITE_COLETA.value), porque: "25% é o limite da DLRR." },
      { texto: pct(1), porque: "O limite geral é 50% (100% só nos primeiros 3 anos)." },
      { texto: pct(0.1), porque: "Não corresponde ao limite do RFAI." },
    ],
    "Art. 24.º CFI — limite de dedução do RFAI (50%)",
    "occRFAI",
  ],
  [
    3,
    "Na DLRR, qual é a percentagem dos lucros retidos e reinvestidos que é dedutível?",
    { texto: pct(DLRR_TAXA.value), porque: `Correto. A DLRR deduz ${pct(DLRR_TAXA.value)} dos lucros retidos e reinvestidos.` },
    [
      { texto: pct(DLRR_LIMITE_COLETA.value), porque: "25% é o limite face à coleta, não a percentagem dos lucros." },
      { texto: pct(RFAI_TAXA_INTERIOR.value), porque: "30% é a taxa do RFAI no interior." },
      { texto: pct(SIFIDE_TAXA_BASE.value), porque: "32,5% é a taxa base do SIFIDE." },
    ],
    "Art. 29.º CFI — DLRR (10% dos lucros)",
    "occDLRR",
  ],
  [
    3,
    "Qual é a taxa base do SIFIDE II sobre as despesas de I&D do período?",
    { texto: pct(SIFIDE_TAXA_BASE.value), porque: `Correto. O SIFIDE II dá um crédito de ${pct(SIFIDE_TAXA_BASE.value)} das despesas de I&D (taxa base).` },
    [
      { texto: pct(SIFIDE_TAXA_INCREMENTAL.value), porque: "50% é a taxa incremental, não a base." },
      { texto: pct(DLRR_TAXA.value), porque: "10% é a DLRR." },
      { texto: pct(T_GERAL), porque: "19% é a taxa de IRC." },
    ],
    "Art. 36.º CFI — SIFIDE II (taxa base 32,5%)",
    "occSIFIDE",
  ],
];
const fisFaceis: Array<[1, string, Opt, Opt[], string, SourceKey]> = [
  [
    1,
    "Sobre que valor incide o IRC de uma sociedade?",
    { texto: "Sobre o lucro (matéria coletável)", porque: "Correto. O IRC incide sobre o lucro tributável apurado, não sobre as vendas brutas." },
    [
      { texto: "Sobre o total das vendas", porque: "Incide sobre o lucro, não sobre o volume de vendas." },
      { texto: "Sobre o capital social", porque: "O capital social não é a base do IRC." },
      { texto: "Sobre o número de trabalhadores", porque: "Não é uma base do IRC." },
    ],
    "IRC — incide sobre o lucro tributável",
    "art87circ",
  ],
  [
    1,
    "Os dividendos são o quê?",
    { texto: "A parte do lucro distribuída aos sócios", porque: "Correto. Dividendos são lucros distribuídos aos sócios/acionistas." },
    [
      { texto: "O salário dos trabalhadores", porque: "O salário é remuneração do trabalho, não dividendo." },
      { texto: "Um imposto municipal", porque: "Isso seria a derrama, não dividendos." },
      { texto: "Uma dívida ao banco", porque: "Não é uma dívida; é distribuição de lucro." },
    ],
    "Dividendos — distribuição de lucros",
    "art71cirs",
  ],
  [
    1,
    "Uma empresa com prejuízo no ano paga IRC sobre o lucro?",
    { texto: "Não — sem lucro tributável não há IRC sobre o lucro", porque: "Correto. Sem lucro não há coleta de IRC sobre o lucro (pode haver tributação autónoma de despesas)." },
    [
      { texto: "Sim, paga sempre 19% das vendas", porque: "O IRC incide sobre o lucro, não sobre as vendas." },
      { texto: "Sim, paga 15% do capital social", porque: "O IRC não incide sobre o capital social." },
      { texto: "Sim, paga o dobro no ano seguinte", porque: "Não existe essa regra." },
    ],
    "IRC — sem lucro não há coleta sobre o lucro",
    "art87circ",
  ],
  [
    1,
    "A derrama municipal é um imposto a favor de quem?",
    { texto: "Do município onde a empresa gera o lucro", porque: "Correto. A derrama municipal reverte para o município." },
    [
      { texto: "Da Segurança Social", porque: "A derrama não é uma contribuição para a SS." },
      { texto: "Da União Europeia", porque: "É um imposto municipal português." },
      { texto: "Dos sócios", porque: "É um imposto, não um rendimento dos sócios." },
    ],
    "Derrama municipal — receita do município",
    "art87circ",
  ],
  [
    1,
    "Que entidade cobra o IRC?",
    { texto: "A Autoridade Tributária (AT)", porque: "Correto. O IRC é administrado e cobrado pela Autoridade Tributária." },
    [
      { texto: "A Segurança Social", porque: "Cobra contribuições, não o IRC." },
      { texto: "O Banco de Portugal", porque: "Não cobra impostos." },
      { texto: "A Câmara Municipal", porque: "Recebe a derrama, mas o IRC é da AT." },
    ],
    "IRC — administrado pela Autoridade Tributária",
    "art87circ",
  ],
  [
    1,
    "Os benefícios fiscais ao investimento (RFAI, DLRR, SIFIDE) reduzem o quê?",
    { texto: "O IRC a pagar (deduzem-se à coleta)", porque: "Correto. São créditos/deduções à coleta de IRC, reduzindo o imposto a pagar." },
    [
      { texto: "O IVA das vendas", porque: "São benefícios em IRC, não em IVA." },
      { texto: "A TSU dos trabalhadores", porque: "Não reduzem a Segurança Social." },
      { texto: "O capital social mínimo", porque: "Não têm relação com o capital social." },
    ],
    "Benefícios fiscais ao investimento — dedução à coleta de IRC",
    "cfi",
  ],
];
[...fisConceptuais, ...fisFaceis].forEach(([dif, p, c, d, lb, fk], i) => {
  acc.push(montar(`emp-fis-c${i}`, "empresa_fiscalidade", dif as 1 | 2 | 3, p, c, d, lb, fk, n++));
});

// Cenários — IRC PME calculado
const MATERIAS = [
  10000, 15000, 20000, 25000, 30000, 40000, 50000, 60000, 75000, 90000, 100000,
  120000, 150000, 180000, 200000, 250000, 35000, 45000, 70000, 130000, 300000,
];
MATERIAS.forEach((m, i) => {
  const irc = ircPME(m);
  acc.push(
    montar(
      `emp-fis-irc-${i}`,
      "empresa_fiscalidade",
      2,
      `Uma PME tem ${eurInt(m)} de matéria coletável. Qual é o IRC (15% até ${eurInt(LIM_PME)}, 19% no excedente)?`,
      { texto: eur(irc), porque: `Correto. ${eurInt(Math.min(m, LIM_PME))} × 15%${m > LIM_PME ? ` + ${eurInt(m - LIM_PME)} × 19%` : ""} = ${eur(irc)}.` },
      [
        { texto: eur(cent(m * T_GERAL)), porque: "Aplica 19% a tudo, ignorando os 15% nos primeiros 50.000 €." },
        { texto: eur(cent(m * T_PME)), porque: "Aplica 15% a tudo, mas acima de 50.000 € a taxa é 19%." },
        { texto: eur(cent(m * 0.21)), porque: "Usa 21%, que já não vigora em 2026." },
      ],
      "Art. 87.º CIRC — IRC PME (15% até 50.000 €, 19% acima)",
      "art87circ",
      n++
    ),
    montar(
      `emp-fis-liq-${i}`,
      "empresa_fiscalidade",
      3,
      `Uma PME com ${eurInt(m)} de matéria coletável paga ${eur(irc)} de IRC. Quanto sobra de lucro depois do IRC?`,
      { texto: eur(cent(m - irc)), porque: `Correto. ${eurInt(m)} − ${eur(irc)} = ${eur(cent(m - irc))}.` },
      [
        { texto: eur(irc), porque: "É o IRC pago, não o lucro que sobra." },
        { texto: eur(m), porque: "É a matéria coletável antes do IRC." },
        { texto: eur(cent(m - m * T_GERAL)), porque: "Desconta 19% a tudo, ignorando a taxa reduzida das PME." },
      ],
      "Lucro após IRC = matéria coletável − IRC",
      "art87circ",
      n++
    )
  );
});

// Cenários — dividendos (28%)
const DIVS = [
  5000, 10000, 15000, 20000, 30000, 40000, 50000, 80000, 100000, 150000,
  2500, 7500, 12000, 25000, 60000, 90000,
];
DIVS.forEach((d, i) => {
  const imp = cent(d * T_DIV);
  acc.push(
    montar(
      `emp-fis-div-${i}`,
      "empresa_fiscalidade",
      1,
      `Um sócio pessoa singular recebe ${eurInt(d)} de dividendos. Quanto é retido a título de IRS (taxa liberatória de 28%)?`,
      { texto: eur(imp), porque: `Correto. ${eurInt(d)} × 28% = ${eur(imp)}.` },
      [
        { texto: eur(cent(d * T_GERAL)), porque: "Usa 19% (IRC), não os 28% dos dividendos." },
        { texto: eur(cent(d * 0.25)), porque: "Usa 25%; a taxa é 28%." },
        { texto: eur(cent(d * 0.5)), porque: "50% não corresponde a nenhuma taxa dos dividendos." },
      ],
      "Art. 71.º CIRS — dividendos (28%)",
      "art71cirs",
      n++
    )
  );
});

// Cenários — derrama municipal (1,5%)
const LUCROS_DERRAMA = [
  20000, 30000, 40000, 60000, 80000, 100000, 150000, 250000,
  25000, 50000, 70000, 120000, 200000, 35000, 45000, 55000, 90000, 175000,
];
LUCROS_DERRAMA.forEach((l, i) => {
  const der = cent(l * T_DERRAMA);
  acc.push(
    montar(
      `emp-fis-der-${i}`,
      "empresa_fiscalidade",
      2,
      `Lucro tributável de ${eurInt(l)} num município com derrama à taxa máxima. Quanto é a derrama municipal (1,5%)?`,
      { texto: eur(der), porque: `Correto. ${eurInt(l)} × 1,5% = ${eur(der)}.` },
      [
        { texto: eur(cent(l * T_GERAL)), porque: "19% é o IRC, não a derrama." },
        { texto: eur(cent(l * 0.03)), porque: "3% excede o máximo de 1,5%." },
        { texto: eur(cent(l * T_PME)), porque: "15% é a taxa de IRC PME, não a derrama." },
      ],
      "Derrama municipal — 1,5% do lucro tributável",
      "art87circ",
      n++
    )
  );
});

// ── Reforço de CRIAÇÃO — mais factos e aritmética de capital ──────────
n = 0;
const criConceptuais2: Array<[1 | 2 | 3, string, Opt, Opt[], string, SourceKey]> = [
  [
    1,
    "O documento que define as regras de funcionamento de uma sociedade chama-se?",
    { texto: "Pacto social (estatutos)", porque: "Correto. O pacto social/estatutos define objeto, capital, órgãos e regras da sociedade." },
    [
      { texto: "Recibo verde", porque: "É um documento de faturação de independentes." },
      { texto: "Declaração Modelo 22", porque: "É a declaração anual de IRC." },
      { texto: "Certidão de óbito", porque: "Nada tem a ver com a sociedade." },
    ],
    "CSC — pacto social / estatutos",
    "csc",
  ],
  [
    2,
    "Onde fica registada a constituição de uma sociedade comercial?",
    { texto: "No Registo Comercial (Conservatória)", porque: "Correto. A constituição é sujeita a registo comercial, do qual resulta a certidão permanente." },
    [
      { texto: "Na Segurança Social Direta", porque: "Aí inscrevem-se trabalhadores, não se regista a sociedade." },
      { texto: "No Banco de Portugal", porque: "Não é onde se regista a constituição." },
      { texto: "Na junta de freguesia", porque: "Não tem competência para o registo comercial." },
    ],
    "Registo Comercial — constituição da sociedade",
    "empresaConstituicao",
  ],
  [
    2,
    "O que comprova, de forma atualizada, a existência e os dados de uma empresa?",
    { texto: "A certidão permanente do registo comercial", porque: "Correto. A certidão permanente é o comprovativo atualizado do registo da empresa." },
    [
      { texto: "O recibo de vencimento do gerente", porque: "Comprova a remuneração, não a empresa." },
      { texto: "A fatura mais recente", porque: "Não comprova o registo da sociedade." },
      { texto: "O cartão de cidadão do sócio", porque: "Identifica a pessoa singular." },
    ],
    "Certidão permanente do registo comercial",
    "empresaConstituicao",
  ],
  [
    1,
    "Antes de usar um nome, a empresa precisa de obter o quê?",
    { texto: "Um certificado de admissibilidade de firma (ou usar nome pré-aprovado)", porque: "Correto. A firma tem de ser admissível; na Empresa na Hora usam-se nomes de uma bolsa pré-aprovada." },
    [
      { texto: "Uma licença de exportação", porque: "Não é necessária para o nome." },
      { texto: "Um seguro de saúde", porque: "Nada tem a ver com a firma." },
      { texto: "Uma patente", porque: "A patente protege invenções, não é o nome da firma." },
    ],
    "Firma — certificado de admissibilidade / nome pré-aprovado",
    "empresaConstituicao",
  ],
  [
    3,
    "Quem detém efetivamente uma sociedade deve, em regra, ser declarado em que registo?",
    { texto: "No Registo Central do Beneficiário Efetivo (RCBE)", porque: "Correto. O RCBE identifica as pessoas singulares que detêm ou controlam a sociedade." },
    [
      { texto: "No registo predial", porque: "É para imóveis, não para beneficiários efetivos." },
      { texto: "No registo automóvel", porque: "É para veículos." },
      { texto: "Não existe esse registo", porque: "O RCBE existe e é obrigatório." },
    ],
    "RCBE — Registo Central do Beneficiário Efetivo",
    "empresaConstituicao",
  ],
];
criConceptuais2.forEach(([dif, p, c, d, lb, fk], i) => {
  acc.push(montar(`emp-cri-c2-${i}`, "empresa_criacao", dif, p, c, d, lb, fk, n++));
});

// Aritmética de capital — valor de cada quota (capital repartido por sócios)
const CAP_QUOTA = [
  { cap: 100, soc: 2 }, { cap: 1000, soc: 2 }, { cap: 1000, soc: 4 },
  { cap: 5000, soc: 5 }, { cap: 10000, soc: 2 }, { cap: 10000, soc: 4 },
  { cap: 6000, soc: 3 }, { cap: 20000, soc: 5 }, { cap: 3000, soc: 3 },
  { cap: 12000, soc: 4 }, { cap: 2000, soc: 2 }, { cap: 30000, soc: 6 },
  { cap: 500, soc: 2 }, { cap: 4000, soc: 4 }, { cap: 9000, soc: 3 },
  { cap: 15000, soc: 5 }, { cap: 8000, soc: 2 }, { cap: 50000, soc: 5 },
  { cap: 7500, soc: 3 }, { cap: 24000, soc: 6 }, { cap: 1500, soc: 3 },
  { cap: 40000, soc: 8 }, { cap: 18000, soc: 6 }, { cap: 25000, soc: 5 },
  { cap: 2400, soc: 4 }, { cap: 36000, soc: 9 }, { cap: 14000, soc: 7 },
  { cap: 6000, soc: 6 }, { cap: 16000, soc: 4 }, { cap: 21000, soc: 7 },
];
CAP_QUOTA.forEach((x, i) => {
  const q = cent(x.cap / x.soc);
  acc.push(
    montar(
      `emp-cri-q-${i}`,
      "empresa_criacao",
      i % 2 === 0 ? 2 : 3,
      `Uma sociedade por quotas tem capital de ${eurInt(x.cap)} repartido igualmente por ${x.soc} sócios. Qual é o valor de cada quota?`,
      { texto: eur(q), porque: `Correto. ${eurInt(x.cap)} ÷ ${x.soc} = ${eur(q)}.` },
      [
        { texto: eurInt(x.cap), porque: "É o capital total, não o valor de cada quota." },
        { texto: eur(cent(x.cap / (x.soc + 1))), porque: `Divide por ${x.soc + 1}, mas só há ${x.soc} sócios.` },
        { texto: eur(cent(x.cap * x.soc)), porque: "Multiplica em vez de dividir pelo número de sócios." },
      ],
      "Capital social repartido em quotas",
      "csc",
      n++
    ),
    montar(
      `emp-cri-qt-${i}`,
      "empresa_criacao",
      1,
      `Numa sociedade por quotas, ${x.soc} sócios entram cada um com uma quota de ${eur(q)}. Qual é o capital social total?`,
      { texto: eurInt(x.cap), porque: `Correto. ${x.soc} × ${eur(q)} = ${eurInt(x.cap)}.` },
      [
        { texto: eur(q), porque: "É a quota de um sócio, não o capital total." },
        { texto: eur(cent(q * (x.soc + 1))), porque: `Conta ${x.soc + 1} sócios em vez de ${x.soc}.` },
        { texto: eur(cent(x.cap / x.soc)), porque: "Volta a dividir; o total é a soma das quotas." },
      ],
      "Capital social = soma das quotas",
      "csc",
      n++
    )
  );
});

// ── Reforço de LEGISLAÇÃO — mais tipos/factos e aritmética de ações ───
n = 0;
const legConceptuais2: Array<[1 | 2 | 3, string, Opt, Opt[], string, SourceKey]> = [
  [
    3,
    "Numa sociedade em nome coletivo, como respondem os sócios pelas dívidas sociais?",
    { texto: "De forma ilimitada e solidária", porque: "Correto. Na sociedade em nome coletivo os sócios respondem ilimitada e solidariamente." },
    [
      { texto: "Apenas até ao capital subscrito", porque: "Essa é a regra das sociedades por quotas." },
      { texto: "Só até ao valor das ações", porque: "As ações existem na SA, não na sociedade em nome coletivo." },
      { texto: "Nunca respondem pessoalmente", porque: "Respondem ilimitada e solidariamente." },
    ],
    "CSC — sociedade em nome coletivo",
    "csc",
  ],
  [
    3,
    "Numa sociedade em comandita, como se distingue a responsabilidade dos sócios?",
    { texto: "Comanditados respondem ilimitadamente; comanditários, de forma limitada", porque: "Correto. Os comanditados respondem como na em nome coletivo; os comanditários só pela entrada." },
    [
      { texto: "Todos respondem de forma limitada", porque: "Os comanditados respondem ilimitadamente." },
      { texto: "Todos respondem ilimitadamente", porque: "Os comanditários têm responsabilidade limitada." },
      { texto: "Nenhum responde pessoalmente", porque: "Os comanditados respondem ilimitadamente." },
    ],
    "CSC — sociedade em comandita",
    "csc",
  ],
  [
    2,
    "O conjunto de bens e direitos com que cada sócio contribui para a sociedade chama-se?",
    { texto: "Entrada (de capital ou em espécie)", porque: "Correto. As entradas formam o capital social; podem ser em dinheiro ou em espécie." },
    [
      { texto: "Dividendo", porque: "O dividendo é o lucro distribuído, não a contribuição inicial." },
      { texto: "Derrama", porque: "É um imposto municipal sobre o lucro." },
      { texto: "Coima", porque: "É uma sanção, não uma contribuição." },
    ],
    "CSC — entradas dos sócios",
    "csc",
  ],
  [
    1,
    "O local oficial onde a sociedade tem a sua administração designa-se?",
    { texto: "Sede social", porque: "Correto. A sede social é o domicílio estatutário da sociedade." },
    [
      { texto: "Filial", porque: "A filial é uma extensão, não a sede." },
      { texto: "Armazém", porque: "Não é o conceito jurídico de sede." },
      { texto: "Balcão único", porque: "Não corresponde à sede social." },
    ],
    "CSC — sede social",
    "csc",
  ],
  [
    2,
    "A atividade que a empresa se propõe exercer, indicada no pacto, chama-se?",
    { texto: "Objeto social", porque: "Correto. O objeto social descreve a atividade da sociedade no pacto." },
    [
      { texto: "Capital social", porque: "É o valor das entradas, não a atividade." },
      { texto: "Firma", porque: "É o nome da sociedade." },
      { texto: "Quórum", porque: "É o número mínimo para deliberar." },
    ],
    "CSC — objeto social",
    "csc",
  ],
  [
    3,
    "As deliberações dos sócios são tomadas, em regra, em que órgão?",
    { texto: "Na assembleia geral", porque: "Correto. As deliberações sociais tomam-se em assembleia geral de sócios." },
    [
      { texto: "No conselho fiscal", porque: "É um órgão de fiscalização, não deliberativo." },
      { texto: "Na Autoridade Tributária", porque: "A AT não delibera pela sociedade." },
      { texto: "No registo comercial", porque: "Regista atos, não delibera." },
    ],
    "CSC — deliberações em assembleia geral",
    "csc",
  ],
  [
    2,
    "Uma quota de uma sociedade por quotas, em regra, transmite-se livremente como uma ação?",
    { texto: "Não — a cessão de quotas tem normalmente de respeitar o consentimento da sociedade", porque: "Correto. A cessão de quotas a estranhos depende, em regra, do consentimento da sociedade." },
    [
      { texto: "Sim, é sempre totalmente livre", porque: "A cessão de quotas é, em regra, condicionada." },
      { texto: "Nunca é possível transmitir uma quota", porque: "É possível, mas com requisitos." },
      { texto: "Só com autorização do tribunal", porque: "Depende da sociedade, não do tribunal." },
    ],
    "CSC — cessão de quotas",
    "csc",
  ],
];
legConceptuais2.forEach(([dif, p, c, d, lb, fk], i) => {
  acc.push(montar(`emp-leg-c2-${i}`, "empresa_legislacao", dif, p, c, d, lb, fk, n++));
});

// Aritmética de ações — nº de ações = capital ÷ valor nominal
const CAP_ACAO = [
  { cap: 50000, vn: 1 }, { cap: 60000, vn: 1 }, { cap: 100000, vn: 1 },
  { cap: 50000, vn: 5 }, { cap: 100000, vn: 5 }, { cap: 50000, vn: 10 },
  { cap: 200000, vn: 10 }, { cap: 75000, vn: 5 }, { cap: 120000, vn: 1 },
  { cap: 80000, vn: 2 }, { cap: 150000, vn: 5 }, { cap: 50000, vn: 2 },
  { cap: 90000, vn: 1 }, { cap: 250000, vn: 5 }, { cap: 60000, vn: 2 },
  { cap: 100000, vn: 10 }, { cap: 70000, vn: 1 }, { cap: 200000, vn: 5 },
  { cap: 50000, vn: 25 }, { cap: 150000, vn: 10 }, { cap: 300000, vn: 5 },
  { cap: 65000, vn: 1 }, { cap: 80000, vn: 5 }, { cap: 110000, vn: 2 },
  { cap: 95000, vn: 5 }, { cap: 50000, vn: 50 }, { cap: 130000, vn: 1 },
  { cap: 250000, vn: 10 }, { cap: 55000, vn: 5 }, { cap: 180000, vn: 2 },
  { cap: 70000, vn: 10 }, { cap: 85000, vn: 5 }, { cap: 50000, vn: 4 },
  { cap: 140000, vn: 1 }, { cap: 90000, vn: 2 }, { cap: 160000, vn: 5 },
];
CAP_ACAO.forEach((x, i) => {
  const num = Math.round(x.cap / x.vn);
  acc.push(
    montar(
      `emp-leg-acao-${i}`,
      "empresa_legislacao",
      i % 2 === 0 ? 2 : 3,
      `Uma SA com capital de ${eurInt(x.cap)} dividido em ações de valor nominal ${eur(x.vn)}. Quantas ações tem?`,
      { texto: num.toLocaleString("pt-PT"), porque: `Correto. ${eurInt(x.cap)} ÷ ${eur(x.vn)} = ${num.toLocaleString("pt-PT")} ações.` },
      [
        { texto: Math.round(x.cap / (x.vn * 2)).toLocaleString("pt-PT"), porque: "Usa o dobro do valor nominal indicado." },
        { texto: Math.round(x.cap * x.vn).toLocaleString("pt-PT"), porque: "Multiplica em vez de dividir pelo valor nominal." },
        { texto: x.cap.toLocaleString("pt-PT"), porque: "Confunde o capital com o número de ações." },
      ],
      "CSC — ações = capital ÷ valor nominal",
      "csc",
      n++
    ),
    montar(
      `emp-leg-cap-${i}`,
      "empresa_legislacao",
      1,
      `Uma SA emitiu ${num.toLocaleString("pt-PT")} ações de valor nominal ${eur(x.vn)}. Qual é o capital social?`,
      { texto: eurInt(x.cap), porque: `Correto. ${num.toLocaleString("pt-PT")} × ${eur(x.vn)} = ${eurInt(x.cap)}.` },
      [
        { texto: eur(x.vn), porque: "É o valor de uma ação, não o capital total." },
        { texto: eurInt(Math.round(x.cap / x.vn)), porque: "É o número de ações, não o capital." },
        { texto: eurInt(x.cap * 2), porque: "Não corresponde ao produto nº de ações × valor nominal." },
      ],
      "CSC — capital = nº de ações × valor nominal",
      "csc",
      n++
    )
  );
});

export const PERGUNTAS_EMPRESA: QuizPergunta[] = acc;
