// ═══════════════════════════════════════════════════════════════════════
//  ONTOLOGIA — a ponte entre o que a pessoa sabe fazer e o que o Estado
//  já conta
//  ---------------------------------------------------------------------
//  O motor sabia compor hipóteses e sabia ler procura. Não sabia ler
//  OFERTA, e por isso a leitura de lacuna era sempre «por apurar» — o que
//  é honesto e não é uma resposta. Faltava o outro termo da subtração.
//
//  Isto é esse termo. Cada capacidade do grafo declara as divisões da CAE
//  que identificam QUEM JÁ FAZ AQUILO por conta própria em Portugal. Com
//  isso, o indicador do INE «Empresas por NUTS 2024 e Atividade económica
//  (Divisão)» passa a ser legível pelo motor: quantos operadores existem
//  na zona, na atividade que esta hipótese ocuparia.
//
//  ── PORQUE É AQUI QUE ISTO VIVE, E NÃO NUM CONECTOR ────────────────
//  Um conector traz números. Esta tabela é uma AFIRMAÇÃO EDITORIAL: diz
//  que quem limpa espaços por conta própria se inscreve na divisão 81 e
//  não na 96. É discutível, é revisível, e por isso está escrita num
//  sítio onde se lê e se contesta — não enterrada numa query.
//
//  ── AS QUATRO REGRAS QUE ISTO RESPEITA ─────────────────────────────
//
//   1. **A divisão tem de existir no indicador.** Não se inventa código:
//      `negocio-descoberta-ontologia.test.ts` confronta cada divisão com
//      a lista publicada pelo INE, guardada em `divisoes-cae.ts`.
//
//   2. **Só divisões em que o operador SE INSCREVERIA.** A tentação é
//      juntar tudo o que soa parecido e obter um número maior. Um número
//      maior aqui significa «mais concorrência» e empurra a hipótese para
//      baixo: inflacionar isto não é otimismo, é sabotagem silenciosa.
//
//   3. **Uma divisão larga é declarada como larga.** A 96 («outras
//      atividades de serviços pessoais») apanha cabeleireiros, lavandarias
//      e agências funerárias no mesmo saco. Quando a divisão é muito mais
//      larga do que a hipótese, `precisao` di-lo, e a leitura que sai ao
//      ecrã carrega esse aviso em vez de o esconder.
//
//   4. **Sem CAE credível, sem leitura.** `cae: []` é uma resposta
//      legítima e frequente: há capacidades que ninguém regista como
//      atividade autónoma. Nesses casos o motor continua a dizer «por
//      apurar» — que era o que dizia antes, e continua a ser verdade.
//
//  Fonte da nomenclatura: INE, indicador 0014449 (Empresas por
//  Localização geográfica NUTS 2024 e Atividade económica, Divisão —
//  CAE Rev. 3), Sistema de contas integradas das empresas.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Quão bem a divisão CAE cerca a hipótese.
 *
 * Entra no cálculo (uma divisão larga não pode produzir a mesma confiança
 * que uma justa) e entra no ecrã (a pessoa tem de saber que «2 706
 * empresas no Algarve» conta mais gente do que os seus concorrentes).
 */
export type PrecisaoCae = "justa" | "larga";

export interface ConceitoOperador {
  /** A capacidade do grafo que este conceito descreve. */
  capacidadeId: string;
  /** Divisões da CAE em que um operador desta capacidade se inscreve. */
  cae: readonly string[];
  precisao: PrecisaoCae;
  /**
   * O que a divisão apanha para além desta hipótese. Vai ao ecrã quando
   * `precisao` é `larga` — é a limitação, e limitações publicam-se.
   */
  ressalva?: string;
}

export const CONCEITOS_OPERADOR: readonly ConceitoOperador[] = Object.freeze([
  {
    capacidadeId: "rota-recolha-entrega",
    cae: ["53"],
    precisao: "justa",
    ressalva: undefined,
  },
  {
    capacidadeId: "transporte-carga",
    cae: ["49"],
    precisao: "larga",
    ressalva:
      "A divisão 49 inclui transporte de passageiros e transporte por condutas, não só mercadorias.",
  },
  {
    capacidadeId: "limpar-e-repor",
    cae: ["81"],
    precisao: "larga",
    ressalva:
      "A divisão 81 junta limpeza de edifícios com plantação e manutenção de jardins.",
  },
  {
    capacidadeId: "organizar-processos",
    cae: ["82"],
    precisao: "larga",
    ressalva:
      "A divisão 82 apanha todo o apoio administrativo a empresas, dos call centers às feiras.",
  },
  {
    capacidadeId: "montar-ferramentas-digitais",
    cae: ["62"],
    precisao: "justa",
  },
  {
    capacidadeId: "tratar-dados",
    cae: ["63"],
    precisao: "larga",
    ressalva:
      "A divisão 63 inclui portais e agências noticiosas além do tratamento de dados.",
  },
  {
    capacidadeId: "construir-software",
    cae: ["62"],
    precisao: "justa",
  },
  {
    capacidadeId: "instalar-configurar",
    cae: ["43", "33"],
    precisao: "larga",
    ressalva:
      "Junta instalação em obra (43) com instalação industrial de máquinas (33).",
  },
  {
    capacidadeId: "reparar-equipamento",
    cae: ["95", "33"],
    precisao: "justa",
  },
  {
    capacidadeId: "intervencao-eletrica",
    cae: ["43"],
    precisao: "larga",
    ressalva:
      "A divisão 43 é toda a construção especializada — canalização, pinturas e demolições incluídas.",
  },
  {
    capacidadeId: "executar-obra",
    cae: ["43", "41"],
    precisao: "larga",
    ressalva: "Inclui promoção imobiliária e construção de edifícios completos.",
  },
  {
    capacidadeId: "coordenar-fornecedores",
    cae: ["82", "70"],
    precisao: "larga",
    ressalva: "Apanha consultoria de gestão e sedes sociais no mesmo agregado.",
  },
  {
    capacidadeId: "acompanhar-pessoas",
    cae: ["88"],
    precisao: "justa",
  },
  {
    capacidadeId: "ensinar-e-treinar",
    cae: ["85"],
    precisao: "larga",
    ressalva: "A divisão 85 é a educação inteira, do ensino básico à formação profissional.",
  },
  {
    capacidadeId: "cuidar-animais",
    cae: ["96", "75"],
    precisao: "larga",
    ressalva:
      "Junta atividades veterinárias (75) com «outros serviços pessoais» (96), onde os cuidados a animais são uma fração pequena.",
  },
  {
    capacidadeId: "produzir-alimentos",
    cae: ["10", "56"],
    precisao: "larga",
    ressalva: "Inclui toda a indústria alimentar e toda a restauração.",
  },
  {
    capacidadeId: "trabalhar-terreno",
    cae: ["01"],
    precisao: "larga",
    ressalva: "A divisão 01 é a agricultura e produção animal inteiras.",
  },
  {
    capacidadeId: "receber-e-guiar",
    cae: ["79"],
    precisao: "justa",
  },
  {
    capacidadeId: "produzir-conteudo",
    cae: ["59", "73"],
    precisao: "larga",
    ressalva: "Junta produção audiovisual com publicidade e estudos de mercado.",
  },
  {
    capacidadeId: "escrever-para-vender",
    cae: ["73", "58"],
    precisao: "larga",
    ressalva: "Junta publicidade com atividades de edição.",
  },
  {
    capacidadeId: "tratar-requisitos-formais",
    cae: ["69"],
    precisao: "larga",
    ressalva: "A divisão 69 é dominada por advogados e contabilistas.",
  },
  {
    capacidadeId: "vender-para-empresas",
    cae: ["73"],
    precisao: "larga",
    ressalva: "A divisão 73 é sobretudo publicidade e estudos de mercado.",
  },

  // ── SEM DIVISÃO CREDÍVEL, E ISSO É UMA RESPOSTA ──────────────────
  //  Estas capacidades não têm uma divisão da CAE em que o operador se
  //  inscreveria de forma reconhecível. Declarar uma qualquer daria um
  //  número — e um número errado aqui empurra hipóteses boas para baixo
  //  ou más para cima. `cae: []` mantém a leitura em «por apurar», que é
  //  o que o motor já dizia e continua a ser verdade.
  { capacidadeId: "operar-no-local", cae: [], precisao: "larga" },
  { capacidadeId: "gerir-operacao", cae: [], precisao: "larga" },
  { capacidadeId: "atender-balcao", cae: [], precisao: "larga" },

  // ── OS CONCEITOS DAS CAPACIDADES NOVAS ──────────────────────────────
  //  Divisões confirmadas contra o próprio indicador do INE (0014449, que
  //  publica 99 divisões) e não de memória. Todas `larga`, e as ressalvas
  //  dizem porquê — é o que limita a confiança a média, desde que
  //  `precisao` deixou de ser decorativa.
  {
    capacidadeId: "tratar-espacos-verdes",
    cae: ["81"],
    precisao: "larga",
    // A mesma divisão da limpeza, e é esse o ponto: o INE não as separa.
    // Contar jardineiros aqui conta também limpeza de edifícios.
    ressalva:
      "A divisão 81 junta plantação e manutenção de jardins com limpeza de edifícios — a contagem inclui as duas.",
  },
  {
    capacidadeId: "cuidar-da-imagem",
    cae: ["96"],
    precisao: "larga",
    ressalva:
      "A divisão 96 são «outras atividades de serviços pessoais»: além de cabeleireiro e estética, inclui lavandarias e agências funerárias.",
  },
  {
    capacidadeId: "orientar-treino",
    cae: ["93"],
    precisao: "larga",
    ressalva:
      "A divisão 93 abrange atividades desportivas, de diversão e recreativas — de ginásios a parques de diversões.",
  },
  {
    capacidadeId: "arranjar-texteis",
    cae: ["14"],
    precisao: "larga",
    ressalva:
      "A divisão 14 é a indústria do vestuário inteira: a confeção domina a contagem e os arranjos são uma fração dela.",
  },
  {
    capacidadeId: "registar-em-imagem",
    cae: ["74"],
    precisao: "larga",
    ressalva:
      "A divisão 74 junta fotografia com design, tradução e outras consultorias técnicas.",
  },
  {
    capacidadeId: "atrair-clientes",
    cae: ["73"],
    precisao: "larga",
    ressalva:
      "A divisão 73 é publicidade e estudos de mercado, e inclui agências de qualquer dimensão.",
  },
]);

export const CONCEITO_POR_CAPACIDADE = new Map(
  CONCEITOS_OPERADOR.map((item) => [item.capacidadeId, item]),
);

/** Todas as divisões que a ontologia usa — o que o conector precisa de ir buscar. */
export const DIVISOES_USADAS: readonly string[] = Object.freeze([
  ...new Set(CONCEITOS_OPERADOR.flatMap((item) => item.cae)),
].sort());
