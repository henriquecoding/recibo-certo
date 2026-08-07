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
const EM_PROFISSOES = "2026-08-07";

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
  {
    slug: "ppr-irs",
    dado: "Taxa sobre o rendimento em resgate nas condições legais",
    noPacote: "8,6%",
    verificado: "8%",
    notaVerificada: "dois quintos do rendimento, tributados autonomamente a 20% · art. 21.º, n.º 3, al. b) EBF",
    acao: "corrigir",
    motivo:
      "O art. 21.º do EBF tem dois regimes de resgate e o pacote misturou-os. DENTRO das situações definidas na lei (n.º 3, al. b)), a matéria coletável é constituída por dois quintos do rendimento e a tributação é autónoma à taxa de 20% — dois quintos de 20% dão 8%. FORA delas (n.º 5), o rendimento é tributado autonomamente a 21,5%, e sem a redução a dois quintos. Os 8,6% do pacote são exatamente dois quintos de 21,5%: a fração de um regime aplicada à taxa do outro. Nenhum dos dois casos dá esse número.",
    fonte: "EBF-21",
    verificadoEm: EM,
  },
  {
    slug: "formadores-explicadores",
    dado: "Isenção de IVA",
    noPacote: "formação profissional em condições legalmente definidas",
    verificado:
      "formação profissional reconhecida · lições sobre matérias do ensino escolar ou superior",
    notaVerificada:
      "são duas isenções distintas: a formação profissional exige reconhecimento ministerial (art. 9.º, n.º 10) CIVA); as explicações são isentas pela natureza do serviço, sem reconhecimento nem limite de volume (art. 9.º, n.º 11) CIVA)",
    acao: "corrigir",
    motivo:
      "O pacote descreve a isenção do art. 9.º só na parte da formação profissional, e a resposta curta do guia diz que «explicações particulares e formação não certificada seguem a regra geral, com a isenção do art. 53.º enquanto o volume o permitir». Não é assim para as explicações: o n.º 11) do art. 9.º, na redação da Lei n.º 82/2023, isenta expressamente «as prestações de serviços que consistam em lições ministradas sobre matérias do ensino escolar ou superior». É isenção pela natureza da operação e não depende de reconhecimento nem de volume de negócios — um explicador que ultrapasse os 15 000 € continua isento, e enquadrá-lo no art. 53.º levava-o a liquidar IVA que a lei não lhe pede. A distinção importa nas duas direções: quem dá formação profissional SEM reconhecimento não cabe no n.º 10) e cai, esse sim, na regra geral.",
    fonte: "CIVA-9",
    verificadoEm: EM_PROFISSOES,
  },
  {
    slug: "profissionais-saude",
    dado: "Isenção de IVA",
    noPacote: "prestações de serviços de saúde",
    verificado:
      "serviços prestados no exercício das profissões de médico, odontologista, psicólogo, parteiro, enfermeiro e outras profissões paramédicas",
    notaVerificada:
      "a isenção do art. 9.º, n.º 1) CIVA é pela PROFISSÃO de quem presta, não pelo rótulo do serviço; o n.º 2) acrescenta os estabelecimentos hospitalares e clínicas e o n.º 3) os protésicos dentários. É isenção incompleta: não dá direito a dedução do IVA suportado.",
    acao: "corrigir",
    motivo:
      "«Prestações de serviços de saúde» sugere um critério material — se é saúde, é isento — e o art. 9.º não funciona assim. O n.º 1) enumera profissões, e a porta de entrada de quem não é médico, odontologista, psicólogo, parteiro ou enfermeiro é a cláusula «outras profissões paramédicas», cujo alcance é delimitado por regulamentação e não por senso comum. A diferença apanha exatamente as atividades de fronteira que mais crescem — nutrição, osteopatia, terapias diversas —, onde o profissional que assume a isenção pelo tema do serviço pode estar a deixar de liquidar imposto devido.",
    fonte: "CIVA-9",
    verificadoEm: EM_PROFISSOES,
  },
  {
    slug: "regularizacao-voluntaria",
    dado: "Prazo de regularização após pedido",
    noPacote: "15 dias",
    verificado: "30 dias",
    notaVerificada:
      "a contar da notificação da coima reduzida; no mesmo prazo tem de ficar regularizada a situação tributária · art. 30.º, n.º 3, al. a) RGIT",
    acao: "corrigir",
    motivo:
      "A al. a) do n.º 3 do art. 30.º do RGIT, na redação da Lei n.º 7/2021, faz depender o direito à redução «do pagamento nos 30 dias posteriores à notificação da coima reduzida pela entidade competente e da regularização da situação tributária do infrator no mesmo prazo». Não há nenhum prazo de 15 dias nesta norma. O erro é benigno para quem o siga — pagar cedo não prejudica ninguém — mas publicar um prazo que não existe põe em dúvida os outros dois números do mesmo guia, que estão certos.",
    fonte: "RGIT-30",
    verificadoEm: EM_PROFISSOES,
  },
  {
    slug: "insolvencia-pessoal",
    dado: "Período de cessão",
    noPacote: "3 anos",
    acao: "reter",
    motivo:
      "O período de cessão é fixado no Código da Insolvência e da Recuperação de Empresas e foi objeto de alterações legislativas. O CIRE não tem página de articulado verificável no Portal das Finanças, e não foi possível confirmar a redação em vigor nesta revisão. É o número que estrutura toda a decisão de quem pondera este caminho — publicá-lo sem confirmação seria o pior sítio para o fazer. O guia diz que o prazo existe, diz onde o confirmar, e não o inventa.",
    fonte: "CIRE",
    verificadoEm: EM_PROFISSOES,
  },
  {
    slug: "insolvencia-pessoal",
    dado: "Dívidas fiscais e à Segurança Social",
    noPacote: "em regra não abrangidas pela exoneração",
    acao: "reter",
    motivo:
      "O próprio pacote avisa que «há jurisprudência divergente quanto à exoneração de créditos tributários — apresentar como questão em aberto, não como regra fechada», e depois publica-a como dado. As duas coisas não podem coexistir. O que está verificado é a norma de onde a tese nasce: o Art. 30.º, n.os 2 e 3 da LGT, que declara o crédito tributário indisponível e manda essa regra prevalecer sobre qualquer legislação especial — o que inclui o CIRE. É isso que o guia mostra, com a divergência assumida e a recomendação de levar o caso a um advogado. Uma regra dada como fechada num tema que os tribunais não fecharam é pior do que não dizer nada.",
    fonte: "lgt30",
    verificadoEm: EM_PROFISSOES,
  },
];

const POR_SLUG = new Map<string, CorrecaoAoPacote[]>();
for (const c of CORRECOES_AO_PACOTE) {
  const lista = POR_SLUG.get(c.slug) ?? [];
  lista.push(c);
  POR_SLUG.set(c.slug, lista);
}

export const correcoesDoGuia = (slug: string): CorrecaoAoPacote[] => POR_SLUG.get(slug) ?? [];
