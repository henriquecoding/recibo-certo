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
];

const POR_SLUG = new Map<string, CorrecaoAoPacote[]>();
for (const c of CORRECOES_AO_PACOTE) {
  const lista = POR_SLUG.get(c.slug) ?? [];
  lista.push(c);
  POR_SLUG.set(c.slug, lista);
}

export const correcoesDoGuia = (slug: string): CorrecaoAoPacote[] => POR_SLUG.get(slug) ?? [];
