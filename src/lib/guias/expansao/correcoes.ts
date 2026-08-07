// ═══════════════════════════════════════════════════════════════════════
//  DIVERGÊNCIAS FACE AO PACOTE DE EXPANSÃO
//  ---------------------------------------------------------------------
//  O pacote entrou como fonte de verdade, e é. Mas «fonte de verdade» não
//  é «infalível»: o próprio pacote avisa que os campos `dados` e
//  `base_legal` são pontos de partida verificados à data e manda confirmar
//  a redação em vigor antes de publicar. Foi o que se fez — e em alguns
//  pontos a redação em vigor diz outra coisa.
//
//  Cada divergência fica registada AQUI, com o que o pacote dizia, o que a
//  fonte diz, e a data em que se foi lá ver. Duas razões:
//
//    · corrigir em silêncio dentro do ficheiro gerado apagava o rasto — na
//      próxima geração a correção desaparecia e ninguém saberia porquê;
//    · quem revir isto a seguir precisa de saber que a diferença é
//      deliberada e onde a confirmar.
//
//  Duas ações possíveis:
//    "corrigir" → há valor certo, verificado na fonte. Publica-se o certo.
//    "reter"    → não há confirmação. NÃO se publica. Some do site, fica
//                 aqui e sai no relatório de `guias:expansao` como
//                 trabalho por fazer.
// ═══════════════════════════════════════════════════════════════════════

export interface CorrecaoAoPacote {
  slug: string;
  /** `label` da entrada de `dados` a que a divergência respeita. */
  dado: string;
  /** O que o pacote entregou, literalmente. */
  noPacote: string;
  /** O valor verificado. Ausente quando a ação é "reter". */
  verificado?: string;
  /** Substitui a nota do pacote quando esta deixou de fazer sentido.
      Uma entrada corrigida que continue a mostrar «confirmar percentagens»
      diz ao leitor que o número é provisório depois de ele ter deixado de
      o ser — e a nota é o que se lê a seguir ao valor. */
  notaVerificada?: string;
  acao: "corrigir" | "reter";
  /** Porque é que diverge, e onde se confirma. Escrito para quem revê. */
  motivo: string;
  /** Chave de `LEGAL_SOURCES` onde a verificação foi feita. */
  fonte: string;
  verificadoEm: string;
}

const EM = "2026-08-06";

export const CORRECOES_AO_PACOTE: CorrecaoAoPacote[] = [
  {
    slug: "imi",
    dado: "Prazo — IMI entre 100 € e 500 €",
    noPacote: "maio e agosto",
    verificado: "maio e novembro",
    notaVerificada: "duas prestações · art. 120.º, n.º 1, al. b) CIMI",
    acao: "corrigir",
    motivo:
      "O art. 120.º, n.º 1, al. b) do CIMI, na redação da Lei n.º 71/2018, diz «em duas prestações, nos meses de maio e novembro». Agosto só entra no escalão seguinte — o das três prestações, que é maio, agosto e novembro. Publicar «maio e agosto» levava quem paga em duas prestações a marcar a segunda com três meses de antecedência e a estranhar não ter nota de cobrança.",
    fonte: "CIMI-120",
    verificadoEm: EM,
  },
  {
    slug: "imi",
    dado: "Isenção temporária (HPP)",
    noPacote: "3 anos — VPT ≤ 125 000 € e rendimento do agregado ≤ 153 300 €",
    acao: "reter",
    motivo:
      "A isenção temporária de habitação própria e permanente não vive no CIMI, e nenhum dos seis artigos que o pacote dá como base legal deste guia a prevê: o art. 11.º-A do CIMI é a isenção PERMANENTE de baixos rendimentos, com limiares expressos em múltiplos do IAS (2,3 × 14 IAS de rendimento, 10 × 14 IAS de VPT global) e não em euros fixos. Os 125 000 € e os 153 300 € pertencem ao regime do Estatuto dos Benefícios Fiscais, que não foi possível verificar neste levantamento. Ficam de fora até haver artigo confirmado — dois números redondos com ar de certeza são precisamente o que ninguém vai confirmar.",
    fonte: "CIMI-11A",
    verificadoEm: EM,
  },
  {
    slug: "arrendamento-categoria-f",
    dado: "Reduções",
    noPacote: "por contratos de duração mais longa (confirmar percentagens e durações na redação em vigor)",
    verificado: "−10 pontos (5 a 10 anos) · −15 pontos (10 a 20) · −20 pontos (20 ou mais)",
    notaVerificada: "pontos percentuais sobre a taxa autónoma, em arrendamento para habitação permanente · art. 72.º, n.os 3 a 5 CIRS",
    acao: "corrigir",
    motivo:
      "O pacote marcou este valor para confirmar e a confirmação foi feita: os n.os 3, 4 e 5 do art. 72.º do CIRS, na redação da Lei n.º 56/2023, fixam reduções em PONTOS PERCENTUAIS sobre a taxa autónoma, e não em percentagem dela. A diferença é material — 10 pontos sobre 25% dá 15%, enquanto «menos 10%» daria 22,5%. Cada renovação de igual duração nos contratos de 5 a 10 anos acrescenta 2 pontos, com o teto de 10 pontos para o conjunto das renovações.",
    fonte: "cirs72",
    verificadoEm: EM,
  },
  {
    slug: "alojamento-local",
    dado: "Coeficiente — zonas de contenção",
    noPacote: "0,50 (confirmar delimitação municipal aplicável)",
    verificado: "0,50",
    notaVerificada: "alojamento local em moradia ou apartamento localizado em área de contenção · art. 31.º, n.º 1, al. h) CIRS. A delimitação das áreas é municipal e muda: verifica-a por morada, na câmara do teu concelho.",
    acao: "corrigir",
    motivo:
      "O coeficiente está confirmado: a al. h) do n.º 1 do art. 31.º do CIRS, aditada pela Lei n.º 2/2020, fixa 0,50 para o alojamento local em moradia ou apartamento localizado em área de contenção. O que continua a variar — e é o que o pacote mandava confirmar — é a DELIMITAÇÃO das áreas, que é municipal. Reter o coeficiente por causa da delimitação seria esconder um valor certo por causa de um dado que nunca será fixo; a nota passa a dizer isso ao leitor.",
    fonte: "cirs31",
    verificadoEm: EM,
  },
];

const POR_SLUG = new Map<string, CorrecaoAoPacote[]>();
for (const c of CORRECOES_AO_PACOTE) {
  const lista = POR_SLUG.get(c.slug) ?? [];
  lista.push(c);
  POR_SLUG.set(c.slug, lista);
}

export const correcoesDoGuia = (slug: string): CorrecaoAoPacote[] => POR_SLUG.get(slug) ?? [];
