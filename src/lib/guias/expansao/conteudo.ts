// ═══════════════════════════════════════════════════════════════════════
//  CONTEÚDO DA EXPANSÃO EDITORIAL 2026
//  ---------------------------------------------------------------------
//  A metade PESADA de cada guia — só importada do servidor. Tudo aqui vem
//  do pacote verificado, palavra por palavra. Nada foi reescrito.
//
//  `dados` guarda TAMBÉM as entradas que o pacote marcou para confirmar.
//  Guardar não é publicar: `porConfirmar` fica a `true`, a página filtra-as
//  e `guias:expansao` lista-as como trabalho por fazer. Apagá-las era
//  perder o rasto de uma verificação pendente; publicá-las era exatamente
//  o que a regra 3 do pacote proíbe.
// ═══════════════════════════════════════════════════════════════════════

/** Um valor do ano fiscal citado pelo guia. */
export interface DadoAnual {
  label: string;
  valor: string;
  nota: string;
  /** O pacote marcou-o como ponto de partida NÃO verificado. Não publicar
      sem verificação nova na redação em vigor. */
  porConfirmar: boolean;
}

export interface ConteudoExpansao {
  aplicaSe: string[];
  naoAplicaSe: string[];
  /** Plano dos H2 fixado pelo pacote. É o índice do corpo redigido. */
  estruturaH2: string[];
  oQuePreparar: string[];
  dados: DadoAnual[];
  /** Bloqueadores e cuidados do pacote. São condição de publicação, não
      sugestões: `guias:expansao` verifica que nenhum ficou por tratar. */
  avisos: string[];
}

export const CONTEUDO_EXPANSAO: Record<string, ConteudoExpansao> = {
  "imi": {
    aplicaSe: [
      "És proprietário de um imóvel em Portugal.",
      "Recebeste a nota de cobrança do IMI e queres perceber a conta.",
      "Compraste casa e queres saber se tens direito a isenção.",
    ],
    naoAplicaSe: [
      "És arrendatário — o IMI é do senhorio.",
      "Estás a comprar e queres saber o imposto da compra: isso é IMT.",
    ],
    estruturaH2: [
      "A conta: VPT × taxa municipal",
      "Onde encontrar o teu VPT",
      "As taxas variam por município — e mudam todos os anos",
      "Prazos: uma, duas ou três prestações",
      "Isenção temporária de três anos",
      "Isenção permanente para baixos rendimentos",
      "Se discordas do VPT",
    ],
    oQuePreparar: [
      "Caderneta predial atualizada, com o VPT.",
      "Taxa de IMI do teu município para o ano em causa.",
      "Confirmar se a morada fiscal corresponde à habitação própria permanente.",
      "Nota de cobrança recebida da AT.",
    ],
    dados: [
      { label: "Prazo — IMI até 100 €", valor: "maio", nota: "prestação única", porConfirmar: false },
      { label: "Prazo — IMI entre 100 € e 500 €", valor: "maio e agosto", nota: "duas prestações", porConfirmar: false },
      { label: "Prazo — IMI superior a 500 €", valor: "maio, agosto e novembro", nota: "três prestações", porConfirmar: false },
      { label: "Isenção temporária (HPP)", valor: "3 anos", nota: "VPT ≤ 125 000 € e rendimento do agregado ≤ 153 300 €", porConfirmar: false },
      { label: "Sujeito passivo", valor: "proprietário a 31 de dezembro", nota: "art. 113.º CIMI", porConfirmar: false },
    ],
    avisos: [
      "As taxas municipais são fixadas anualmente por cada município e comunicadas à AT — não hardcodar; ligar a uma tabela atualizável.",
      "Os limiares de isenção são atualizados com frequência pelo Orçamento do Estado.",
    ],
  },
  "imt": {
    aplicaSe: [
      "Vais comprar um imóvel em Portugal.",
      "Queres saber se a isenção jovem se aplica ao teu caso.",
      "Estás a orçamentar o custo total da compra além do preço.",
    ],
    naoAplicaSe: [
      "Já és proprietário e queres o imposto anual: isso é IMI.",
      "A transmissão é gratuita (herança ou doação): aí é imposto do selo.",
    ],
    estruturaH2: [
      "Sobre que valor incide",
      "Os escalões e a parcela a abater",
      "Habitação própria permanente vs. secundária",
      "A isenção para jovens até 35 anos",
      "Quando se paga — e porque é antes da escritura",
      "O selo de 0,8% que se soma",
      "Casos em que o IMT é devolvido",
    ],
    oQuePreparar: [
      "Preço acordado e VPT do imóvel (o maior dos dois é a base).",
      "Finalidade: habitação própria permanente, secundária ou outra.",
      "Idade e histórico de propriedade, se vais invocar a isenção jovem.",
      "Guia de pagamento emitida antes da escritura.",
    ],
    dados: [
      { label: "Isenção jovem — total", valor: "até 330 539 €", nota: "≤35 anos, 1.ª habitação própria e permanente", porConfirmar: false },
      { label: "Isenção jovem — parcial", valor: "330 539 € a 660 982 €", nota: "", porConfirmar: false },
      { label: "Imposto do Selo na escritura", valor: "0,8%", nota: "taxa fixa, sem escalões", porConfirmar: false },
      { label: "Base tributável", valor: "maior entre preço e VPT", nota: "art. 12.º CIMT", porConfirmar: false },
    ],
    avisos: [
      "Os escalões são atualizados anualmente pelo Orçamento do Estado — manter numa tabela versionada por ano.",
      "Confirmar sempre os limiares da isenção jovem na redação em vigor do art. 9.º CIMT e no OE do ano.",
    ],
  },
  "imposto-selo-compra-casa": {
    aplicaSe: [
      "Vais comprar casa, com ou sem crédito.",
      "Queres somar o custo real da operação além do preço.",
    ],
    naoAplicaSe: [
      "A transmissão é gratuita — vê o guia de heranças e doações.",
    ],
    estruturaH2: [
      "Selo da transmissão: 0,8% sobre a escritura",
      "Selo do crédito: incide sobre o capital e varia com o prazo",
      "Quem liquida cada um",
      "Como entram na conta final da compra",
    ],
    oQuePreparar: [
      "Valor da escritura e valor do capital financiado.",
      "Prazo do crédito.",
      "Simulação do banco com todos os encargos.",
    ],
    dados: [
      { label: "Selo sobre a escritura", valor: "0,8%", nota: "sobre o valor que serve de base ao IMT", porConfirmar: false },
    ],
    avisos: [
      "As verbas da Tabela Geral do Imposto do Selo devem ser citadas pela verba concreta (1.1 para transmissões onerosas, 17 para operações financeiras) — confirmar a numeração em vigor antes de publicar.",
    ],
  },
  "aimi": {
    aplicaSe: [
      "Tens mais do que um imóvel, ou um de valor patrimonial elevado.",
      "Recebeste liquidação de AIMI e queres perceber a base.",
      "Queres saber se a opção conjunta compensa.",
    ],
    naoAplicaSe: [
      "Só tens um imóvel de valor patrimonial baixo.",
      "Os prédios são comerciais, industriais ou de serviços — estão fora da incidência objetiva.",
    ],
    estruturaH2: [
      "O que entra na soma e o que fica de fora",
      "A dedução por sujeito passivo",
      "A opção conjunta e o efeito de duplicação",
      "As taxas por escalão",
      "Quando é liquidado e pago",
      "Dedução em IRC para quem tem os imóveis numa sociedade",
    ],
    oQuePreparar: [
      "Lista de todos os prédios urbanos e respetivos VPT a 1 de janeiro.",
      "Estado civil e decisão sobre tributação conjunta.",
      "Caderneta predial de cada imóvel.",
    ],
    dados: [
      { label: "Incidência objetiva", valor: "prédios urbanos habitacionais e terrenos para construção", nota: "art. 135.º-B CIMI", porConfirmar: false },
      { label: "Liquidação", valor: "junho", nota: "art. 135.º-G CIMI", porConfirmar: false },
      { label: "Pagamento", valor: "setembro", nota: "art. 135.º-H CIMI", porConfirmar: false },
    ],
    avisos: [
      "Os montantes da dedução e os escalões de taxa devem ser lidos do art. 135.º-C e 135.º-F na redação em vigor — não replicar de memória.",
    ],
  },
  "mais-valias-imoveis": {
    aplicaSe: [
      "Vendeste ou vais vender um imóvel.",
      "Queres saber se o reinvestimento te livra do imposto.",
      "Estás a preencher o Anexo G.",
    ],
    naoAplicaSe: [
      "O imóvel foi adquirido antes de 1 de janeiro de 1989 — há regra de não sujeição própria.",
      "O que vendeste foram ações ou cripto — vê o guia de mais-valias mobiliárias.",
    ],
    estruturaH2: [
      "A fórmula: realização menos aquisição corrigida menos encargos",
      "O coeficiente de desvalorização da moeda",
      "Porque só metade é tributada",
      "Isenção por reinvestimento: requisitos e prazos",
      "Reinvestimento parcial é isenção proporcional",
      "O que conta como encargo (e a prova que a AT aceita)",
      "Como se declara no Anexo G",
    ],
    oQuePreparar: [
      "Escritura de compra e escritura de venda, com datas e valores.",
      "Faturas de obras de valorização dos últimos 12 anos.",
      "Encargos com a compra e a venda (IMT, selo, mediação, registo).",
      "Comprovativo de que era habitação própria permanente e por quanto tempo.",
    ],
    dados: [
      { label: "Parte tributada da mais-valia", valor: "50%", nota: "regra geral para imóveis, art. 43.º CIRS", porConfirmar: false },
      { label: "Habitação própria permanente antes da venda", valor: "12 meses", nota: "prazo reduzido face aos anteriores 24 meses", porConfirmar: false },
      { label: "Reinvestimento parcial", valor: "isenção proporcional", nota: "", porConfirmar: false },
    ],
    avisos: [
      "O prazo de HPP prévio e os prazos de reinvestimento (anterior e posterior) devem ser lidos do art. 10.º CIRS na redação em vigor.",
      "O OE2026 introduz reinvestimento em imóveis destinados a arrendamento habitacional a renda moderada — CONFIRMAR redação final antes de publicar.",
      "Os coeficientes de desvalorização da moeda são publicados por portaria anual.",
    ],
  },
  "vpt-reavaliacao": {
    aplicaSe: [
      "Achas o teu IMI desproporcionado face ao imóvel.",
      "O imóvel não é reavaliado há três anos ou mais.",
      "Vais comprar e queres saber que VPT vais herdar.",
    ],
    naoAplicaSe: [
      "Queres contestar a nota de cobrança em si — isso é reclamação da liquidação, não da matriz.",
    ],
    estruturaH2: [
      "A fórmula e os seis fatores",
      "Onde consultar o VPT atual",
      "Quando compensa pedir a reavaliação — e quando não",
      "Como se pede no Portal das Finanças",
      "Prazos e efeitos: a partir de quando conta",
      "Reclamação das matrizes",
    ],
    oQuePreparar: [
      "Caderneta predial com o VPT e a data da última avaliação.",
      "Ano de construção e eventuais obras.",
      "Área bruta privativa e dependente.",
    ],
    dados: [
      { label: "Periodicidade do pedido", valor: "de 3 em 3 anos", nota: "", porConfirmar: false },
      { label: "Efeitos", valor: "para o futuro", nota: "não devolve IMI já pago", porConfirmar: false },
    ],
    avisos: [
    ],
  },
  "arrendamento-categoria-f": {
    aplicaSe: [
      "Recebes rendas de um imóvel.",
      "Estás a decidir a duração do contrato de arrendamento.",
      "Queres saber se compensa englobar.",
    ],
    naoAplicaSe: [
      "A atividade é de alojamento local — aí é Categoria B.",
      "Sublocas — o regime tem especificidades próprias.",
    ],
    estruturaH2: [
      "Rendimento bruto e rendimento líquido",
      "A taxa autónoma de 25%",
      "A escada de reduções por duração do contrato",
      "Englobar ou não englobar",
      "Perdas prediais e o reporte",
      "Como se declara no Anexo F",
    ],
    oQuePreparar: [
      "Contratos de arrendamento com datas de início e duração.",
      "Recibos de renda eletrónicos emitidos no ano.",
      "Faturas de despesas suportadas com o imóvel.",
      "IMI pago relativo ao imóvel arrendado.",
    ],
    dados: [
      { label: "Taxa autónoma — regra geral", valor: "25%", nota: "art. 72.º CIRS", porConfirmar: false },
      { label: "Reduções", valor: "por contratos de duração mais longa", nota: "confirmar percentagens e durações na redação em vigor", porConfirmar: true },
    ],
    avisos: [
      "ALTERAÇÃO EM CURSO: o OE2026 prevê taxa reduzida para contratos de renda moderada. NÃO publicar percentagens sem confirmar a redação final publicada em Diário da República.",
      "As percentagens de redução por duração do contrato mudaram várias vezes desde 2019 — ler sempre o art. 72.º CIRS em vigor.",
    ],
  },
  "despesas-senhorio": {
    aplicaSe: [
      "Recebes rendas e queres reduzir o rendimento tributável.",
      "Fizeste obras e não sabes onde as declarar.",
    ],
    naoAplicaSe: [
      "Estás em alojamento local — as regras de despesa são as da Categoria B.",
    ],
    estruturaH2: [
      "A regra geral do art. 41.º CIRS",
      "IMI, condomínio e seguros",
      "Conservação e manutenção vs. valorização",
      "O que fica de fora",
      "Onde vão as obras que não deduzes aqui",
      "Prova documental exigida",
    ],
    oQuePreparar: [
      "Faturas com NIF a identificar o imóvel.",
      "Nota de cobrança do IMI.",
      "Atas e avisos de condomínio.",
      "Distinção entre obras de conservação e de valorização.",
    ],
    dados: [
      { label: "Regra", valor: "gastos efetivamente suportados e pagos", nota: "art. 41.º CIRS", porConfirmar: false },
    ],
    avisos: [
    ],
  },
  "recibo-renda-modelo-44": {
    aplicaSe: [
      "Recebes rendas de habitação ou comércio.",
      "Estás dispensado de emitir recibo e queres saber o que entregar em vez disso.",
    ],
    naoAplicaSe: [
      "Não recebes rendimentos prediais.",
    ],
    estruturaH2: [
      "Quem emite recibo eletrónico",
      "Quem está dispensado — e porquê",
      "O que a dispensa não dispensa",
      "Prazos de emissão e de comunicação",
      "Erros e substituição de recibos",
    ],
    oQuePreparar: [
      "Acesso ao Portal das Finanças com senha ativa.",
      "Dados do contrato e do inquilino (NIF).",
      "Valores recebidos por mês.",
    ],
    dados: [
      { label: "Comunicação anual", valor: "declaração própria de rendas", nota: "para quem está dispensado de emitir recibo eletrónico", porConfirmar: false },
    ],
    avisos: [
      "Confirmar o artigo exato da obrigação de emissão de recibo de renda eletrónico (art. 115.º CIRS) e o número da declaração anual antes de publicar — não foi possível verificar a página .aspx desse artigo neste levantamento.",
    ],
  },
  "alojamento-local": {
    aplicaSe: [
      "Exploras ou vais explorar um imóvel em alojamento local.",
      "Recebes através de Airbnb, Booking ou plataforma equivalente.",
      "Queres perceber se compensa face ao arrendamento clássico.",
    ],
    naoAplicaSe: [
      "Arrendas com contrato de arrendamento habitacional — aí é Categoria F.",
      "És apenas proprietário e cedeste a exploração a terceiro — o enquadramento é outro.",
    ],
    estruturaH2: [
      "Registo: o número de AL vem antes de tudo",
      "Porque é Categoria B e não Categoria F",
      "O coeficiente de 0,35 e o que ele já assume",
      "Zonas de contenção e a agravação",
      "IVA: isenção do art. 53.º e a taxa aplicável",
      "Taxa turística municipal",
      "Obrigações não fiscais que costumam falhar",
    ],
    oQuePreparar: [
      "Número de registo de AL.",
      "CAE correspondente à atividade.",
      "Registo de dormidas e receitas por plataforma.",
      "Confirmação de se o imóvel está em zona de contenção.",
      "Regulamento da taxa turística do município.",
    ],
    dados: [
      { label: "Coeficiente — regime simplificado", valor: "0,35", nota: "exploração de moradia ou apartamento", porConfirmar: false },
      { label: "Coeficiente — zonas de contenção", valor: "0,50", nota: "confirmar delimitação municipal aplicável", porConfirmar: true },
      { label: "Limiar de contabilidade organizada", valor: "200 000 € de rendimento anual", nota: "regra geral da Categoria B", porConfirmar: false },
    ],
    avisos: [
      "O regime jurídico do AL foi alterado em 2023 (Lei 56/2023) e em 2024 (DL 76/2024) — validar o quadro em vigor à data de publicação.",
      "A delimitação de zonas de contenção é municipal e muda; ligar a fonte municipal em vez de fixar uma lista.",
    ],
  },
  "al-vs-arrendamento": {
    aplicaSe: [
      "Tens um imóvel e estás a decidir o que fazer com ele.",
      "Queres comparar o líquido dos dois regimes.",
    ],
    naoAplicaSe: [
      "Já decidiste e queres executar — vai direto ao guia do regime escolhido.",
    ],
    estruturaH2: [
      "Os dois regimes lado a lado",
      "O que muda no IRS",
      "O que muda na Segurança Social",
      "Custos operacionais que não aparecem na tabela",
      "Risco e ocupação",
      "Um exemplo com números",
    ],
    oQuePreparar: [
      "Receita estimada em cada cenário.",
      "Custos operacionais do AL (limpeza, plataformas, licenças).",
      "Enquadramento atual em Segurança Social.",
    ],
    dados: [
      { label: "Categoria B (AL) — coeficiente", valor: "0,35", nota: "", porConfirmar: false },
      { label: "Categoria F — taxa autónoma", valor: "25%", nota: "regra geral", porConfirmar: false },
    ],
    avisos: [
      "Guia de comparação — deve ser recalculado sempre que mudem o coeficiente do AL ou a taxa da Categoria F.",
    ],
  },
  "imovel-empresa-ou-pessoal": {
    aplicaSe: [
      "Tens uma sociedade e vais comprar um imóvel.",
      "Queres perceber o custo total do ciclo, não só o da compra.",
    ],
    naoAplicaSe: [
      "Não tens sociedade — a decisão não se coloca.",
    ],
    estruturaH2: [
      "O que se deduz do lado da empresa",
      "AIMI e a ausência de dedução pessoal",
      "A mais-valia em IRC quando vendes",
      "Tirar o imóvel da empresa: o segundo IMT",
      "Uso pessoal de imóvel da empresa",
      "Quando faz mesmo sentido",
    ],
    oQuePreparar: [
      "Objeto social e atividade real da sociedade.",
      "Horizonte de detenção do imóvel.",
      "Plano de utilização (arrendamento, sede, uso pessoal).",
    ],
    dados: [
    ],
    avisos: [
    ],
  },
  "herdar-imovel": {
    aplicaSe: [
      "Herdaste ou vais herdar um imóvel.",
      "És cabeça de casal e tens obrigações declarativas.",
    ],
    naoAplicaSe: [
      "A transmissão é onerosa (compra) — vê o guia do IMT.",
    ],
    estruturaH2: [
      "Quem está isento e quem não está",
      "A participação à AT e o prazo",
      "O que acontece ao IMI",
      "Herança indivisa: como se declara",
      "Vender depois: qual é o valor de aquisição",
      "Quando entra o Anexo G",
    ],
    oQuePreparar: [
      "Certidão de óbito e habilitação de herdeiros.",
      "Caderneta predial de cada imóvel.",
      "Identificação e NIF de todos os herdeiros.",
      "Participação Modelo 1 do Imposto do Selo.",
    ],
    dados: [
      { label: "Taxa geral — transmissões gratuitas", valor: "10%", nota: "", porConfirmar: false },
      { label: "Isentos", valor: "cônjuge/unido de facto, ascendentes e descendentes", nota: "art. 6.º CIS", porConfirmar: false },
      { label: "Prazo da participação", valor: "até ao fim do 3.º mês seguinte à transmissão", nota: "art. 26.º CIS", porConfirmar: false },
    ],
    avisos: [
      "Confirmar o prazo exato da participação na redação em vigor do art. 26.º CIS.",
    ],
  },
  "anexo-j": {
    aplicaSe: [
      "Tens conta ou corretora fora de Portugal.",
      "Recebeste rendimentos com origem no estrangeiro.",
      "Trabalhaste parte do ano noutro país.",
    ],
    naoAplicaSe: [
      "Não és residente fiscal em Portugal.",
      "Todos os teus rendimentos têm origem e pagador em Portugal.",
    ],
    estruturaH2: [
      "Residência fiscal e tributação do rendimento mundial",
      "O que vai a cada quadro",
      "A obrigação de identificar contas no estrangeiro",
      "Imposto pago lá fora e crédito de imposto cá",
      "Conversão cambial e datas",
      "Erros que geram divergências automáticas",
    ],
    oQuePreparar: [
      "Extratos anuais de cada instituição estrangeira.",
      "Comprovativos de imposto retido no estrangeiro.",
      "IBAN/identificação de cada conta e país.",
      "Código do país de origem de cada rendimento.",
    ],
    dados: [
      { label: "Regra", valor: "residentes tributados pelo rendimento mundial", nota: "art. 15.º CIRS", porConfirmar: false },
    ],
    avisos: [
      "A numeração dos quadros do Anexo J muda quase todos os anos — não fixar números de quadro sem confirmar no formulário do ano em causa publicado pela AT.",
    ],
  },
  "corretoras-estrangeiras-irs": {
    aplicaSe: [
      "Investes através de corretora sediada fora de Portugal.",
      "Recebeste dividendos ou vendeste posições no ano.",
    ],
    naoAplicaSe: [
      "Investes só através de banco ou corretora portuguesa — aí a informação já vai pré-preenchida.",
    ],
    estruturaH2: [
      "Porque não vem pré-preenchido",
      "O relatório fiscal: o que pedir a cada corretora",
      "Mais-valias: regra FIFO e conversão cambial",
      "Dividendos e retenção na origem",
      "Identificar a conta, mesmo sem rendimentos",
      "Comissões e o que abate",
      "Checklist final antes de submeter",
    ],
    oQuePreparar: [
      "Relatório fiscal anual de cada corretora.",
      "Histórico completo de compras (para apurar o custo de aquisição).",
      "Comprovativo de retenção na fonte no país de origem.",
      "Taxas de câmbio das datas relevantes.",
    ],
    dados: [
      { label: "Taxa — mais-valias mobiliárias", valor: "28%", nota: "taxa especial, com opção de englobamento", porConfirmar: false },
      { label: "Taxa — dividendos", valor: "28%", nota: "", porConfirmar: false },
    ],
    avisos: [
      "Não nomear corretoras em afirmações normativas; usar como exemplos de fluxo operacional.",
      "Verificar a regra de imputação (FIFO) no art. 43.º CIRS antes de a afirmar.",
    ],
  },
  "dividendos-irs": {
    aplicaSe: [
      "Recebeste dividendos de ações ou fundos.",
      "Estás a decidir se englobas.",
    ],
    naoAplicaSe: [
      "Não tens rendimentos de capitais.",
    ],
    estruturaH2: [
      "O que é uma taxa liberatória",
      "O que muda quando englobas",
      "O englobamento é uma decisão global, não seletiva",
      "Dividendos estrangeiros: a conta é outra",
      "Quando compensa — e como testar",
      "Onde se assinala a opção",
    ],
    oQuePreparar: [
      "Total de dividendos recebidos e imposto retido.",
      "Rendimento coletável estimado do agregado.",
      "Simulação nas duas hipóteses.",
    ],
    dados: [
      { label: "Taxa liberatória", valor: "28%", nota: "art. 71.º CIRS", porConfirmar: false },
      { label: "Englobamento", valor: "opcional e global", nota: "art. 22.º CIRS", porConfirmar: false },
    ],
    avisos: [
      "Confirmar a regra de englobamento parcial de lucros distribuídos (art. 40.º-A CIRS) antes de publicar percentagens.",
    ],
  },
  "rendimentos-capitais-categoria-e": {
    aplicaSe: [
      "Tens depósitos a prazo, certificados de aforro ou obrigações.",
      "Recebeste juros de fonte estrangeira.",
    ],
    naoAplicaSe: [
      "O ganho veio da venda do ativo e não de juros — isso é mais-valia, Categoria G.",
    ],
    estruturaH2: [
      "O que é Categoria E",
      "Pagador português: retenção liberatória",
      "Pagador estrangeiro: Anexo J",
      "Englobar ou não",
      "Certificados do Estado",
      "A fronteira com a Categoria G",
    ],
    oQuePreparar: [
      "Extratos com juros creditados no ano.",
      "Comprovativos de retenção.",
      "Identificação do pagador e do país.",
    ],
    dados: [
      { label: "Taxa", valor: "28%", nota: "", porConfirmar: false },
    ],
    avisos: [
    ],
  },
  "credito-imposto-estrangeiro": {
    aplicaSe: [
      "Recebeste rendimento estrangeiro com imposto retido na origem.",
      "Tens dividendos de ações estrangeiras.",
    ],
    naoAplicaSe: [
      "Não houve retenção no estrangeiro.",
      "Não és residente fiscal em Portugal.",
    ],
    estruturaH2: [
      "A regra do art. 81.º CIRS",
      "O duplo limite: imposto português e taxa da convenção",
      "Retenção acima da convenção: recupera-se lá, não cá",
      "Documentos que a AT aceita como prova",
      "Quando o crédito se perde",
      "Exemplo com dividendos",
    ],
    oQuePreparar: [
      "Comprovativo oficial do imposto retido no estrangeiro.",
      "Texto da convenção aplicável ao país em causa.",
      "Valor bruto do rendimento antes de retenção.",
    ],
    dados: [
      { label: "Limite", valor: "o menor entre imposto pago lá e imposto português sobre esse rendimento", nota: "art. 81.º CIRS", porConfirmar: false },
    ],
    avisos: [
      "Cada convenção tem taxas máximas próprias — nunca generalizar a partir de um país.",
    ],
  },
  "etf-irs": {
    aplicaSe: [
      "Investes em ETFs ou fundos.",
      "Estás a escolher entre versão de acumulação e de distribuição.",
    ],
    naoAplicaSe: [
      "Investes apenas em ações individuais.",
    ],
    estruturaH2: [
      "Acumulação vs. distribuição",
      "Fundos domiciliados em Portugal",
      "Fundos domiciliados fora",
      "Mais-valias na alienação",
      "Onde entra cada caso na declaração",
      "O efeito do diferimento",
    ],
    oQuePreparar: [
      "Identificação e domicílio de cada fundo.",
      "Relatório fiscal da corretora.",
      "Histórico de compras e reinvestimentos.",
    ],
    dados: [
      { label: "Taxa de referência", valor: "28%", nota: "mais-valias e rendimentos de capitais", porConfirmar: false },
    ],
    avisos: [
      "O regime dos organismos de investimento coletivo tem especificidades (DL 7/2015) — confirmar antes de afirmar o tratamento de fundos nacionais.",
    ],
  },
  "ppr-irs": {
    aplicaSe: [
      "Tens ou vais subscrever um PPR.",
      "Estás a pensar resgatar antes da reforma.",
    ],
    naoAplicaSe: [
      "Não usas produtos de poupança-reforma.",
    ],
    estruturaH2: [
      "A dedução à coleta e os limites por idade",
      "As condições legais de resgate",
      "A taxa reduzida sobre o rendimento",
      "Resgate fora das condições: devolver com agravamento",
      "O PPR e a herança",
      "Quando o benefício fiscal não chega para justificar o produto",
    ],
    oQuePreparar: [
      "Extrato do PPR com entregas por ano.",
      "Idade à data de cada entrega.",
      "Motivo do resgate e prova documental, se invocares condição legal.",
    ],
    dados: [
      { label: "Taxa sobre o rendimento em resgate nas condições legais", valor: "8,6%", nota: "", porConfirmar: false },
      { label: "Resgate fora das condições", valor: "devolução das deduções acrescida de 10% por cada ano decorrido", nota: "", porConfirmar: false },
    ],
    avisos: [
      "Os limites de dedução por escalão etário são atualizados pelo Orçamento do Estado — ler o art. 21.º EBF em vigor.",
    ],
  },
  "cripto-staking-mining": {
    aplicaSe: [
      "Recebes recompensas de staking ou de validação.",
      "Fazes mining.",
      "Recebeste airdrops com valor de mercado.",
    ],
    naoAplicaSe: [
      "Apenas compras e vendes — vê o guia da regra dos 365 dias.",
    ],
    estruturaH2: [
      "As três categorias possíveis e porque isso importa",
      "Remuneração passiva vs. atividade habitual",
      "Mining: quando passa a ser atividade",
      "Airdrops e o momento do facto tributário",
      "O impacto em Segurança Social",
      "Registo e prova: o que guardar",
    ],
    oQuePreparar: [
      "Histórico completo de recompensas com data e valor de mercado.",
      "Identificação das plataformas usadas.",
      "Avaliação de se a atividade é habitual.",
    ],
    dados: [
    ],
    avisos: [
      "PONTO SENSÍVEL: as fontes divergem entre Categoria B e Categoria E para staking. Fundamentar no art. 5.º CIRS (rendimentos de capitais provenientes de criptoativos) e no art. 3.º CIRS, e citar doutrina/informação vinculativa da AT em vez de opinião de terceiros.",
      "Rever semestralmente — doutrina em consolidação.",
    ],
  },
  "cripto-365-dias": {
    aplicaSe: [
      "Vendeste criptoativos durante o ano.",
      "Converteste cripto em moeda com curso legal.",
      "Usas exchanges estrangeiras.",
    ],
    naoAplicaSe: [
      "Só compraste e mantiveste, sem qualquer alienação.",
    ],
    estruturaH2: [
      "O que conta como alienação",
      "A contagem dos 365 dias",
      "Isento mas declarável: porquê",
      "Exchange nacional vs. estrangeira e o anexo que muda",
      "Método de imputação e prova do custo",
      "Perdas: o que se aproveita",
    ],
    oQuePreparar: [
      "Histórico completo de transações por exchange.",
      "Datas de aquisição de cada lote.",
      "Valor em euros à data de cada operação.",
      "Identificação das exchanges e países.",
    ],
    dados: [
      { label: "Detenção inferior a 365 dias", valor: "tributada", nota: "taxa especial de 28%, com opção de englobamento", porConfirmar: false },
      { label: "Detenção igual ou superior a 365 dias", valor: "excluída de tributação", nota: "mantém-se a obrigação declarativa", porConfirmar: false },
    ],
    avisos: [
      "Confirmar no formulário do ano em causa quais os quadros do Anexo G, G1 e J aplicáveis — a numeração muda.",
      "A exclusão dos 365 dias não abrange criptoativos que sejam valores mobiliários — assinalar a exceção.",
    ],
  },
  "reporte-menos-valias": {
    aplicaSe: [
      "Fechaste o ano com saldo negativo em mais-valias.",
      "Tiveste perdas num ano e ganhos no seguinte.",
    ],
    naoAplicaSe: [
      "Nunca tiveste saldo negativo.",
    ],
    estruturaH2: [
      "Como se apura o saldo do ano",
      "A condição do englobamento",
      "Quantos anos dura o reporte",
      "O que não se reporta",
      "Ordem de imputação",
      "O que declarar em cada ano",
    ],
    oQuePreparar: [
      "Apuramento do saldo de cada ano.",
      "Declarações dos anos anteriores.",
      "Registo da opção pelo englobamento.",
    ],
    dados: [
    ],
    avisos: [
      "Confirmar o prazo de reporte no art. 55.º CIRS em vigor antes de indicar número de anos.",
    ],
  },
  "residencia-fiscal": {
    aplicaSe: [
      "Mudaste de país durante o ano.",
      "Passas temporadas em Portugal sem cá viver todo o ano.",
      "Queres saber onde declaras os teus rendimentos.",
    ],
    naoAplicaSe: [
      "Vives e trabalhas em Portugal o ano inteiro — és residente, sem dúvida.",
    ],
    estruturaH2: [
      "Os critérios do art. 16.º CIRS",
      "Contar 183 dias: qual o período de referência",
      "O critério da habitação",
      "Residência parcial: o ano dividido em dois",
      "Dupla residência e a regra de desempate da convenção",
      "O que muda em concreto quando és residente",
    ],
    oQuePreparar: [
      "Registo de entradas e saídas do país.",
      "Contratos de arrendamento ou escritura de habitação.",
      "Comprovativo de residência fiscal noutro país, se aplicável.",
      "Domicílio fiscal registado no Portal das Finanças.",
    ],
    dados: [
      { label: "Critério temporal", valor: "mais de 183 dias, seguidos ou interpolados, em qualquer período de 12 meses", nota: "art. 16.º CIRS", porConfirmar: false },
      { label: "Efeito de ser residente", valor: "tributação pelo rendimento mundial", nota: "art. 15.º CIRS", porConfirmar: false },
    ],
    avisos: [
      "Distinguir claramente residência fiscal (art. 16.º CIRS) de domicílio fiscal (art. 19.º LGT) e de autorização de residência — são três coisas diferentes e confundem-se sempre.",
    ],
  },
  "primeiro-ano-fiscal-portugal": {
    aplicaSe: [
      "Mudaste-te para Portugal este ano ou no ano passado.",
      "Estás a planear a mudança e queres a ordem correta.",
    ],
    naoAplicaSe: [
      "Sempre residiste em Portugal.",
    ],
    estruturaH2: [
      "Passo 1: NIF e representação, se aplicável",
      "Passo 2: registo e domicílio fiscal",
      "Passo 3: quando começas a ser residente",
      "Passo 4: regimes a que podes aceder e respetivos prazos",
      "A primeira Modelo 3: o que muda",
      "Erros que criam divergências logo no primeiro ano",
    ],
    oQuePreparar: [
      "NIF atribuído e senha do Portal das Finanças.",
      "Data efetiva de início de residência.",
      "Documento de residência ou certificado de registo de cidadão da UE.",
      "Rendimentos obtidos antes e depois da mudança, separados.",
    ],
    dados: [
    ],
    avisos: [
      "O prazo de inscrição no IFICI é curto e perde-se — confirmar a data-limite em vigor no art. 58.º-A EBF e na regulamentação antes de publicar.",
    ],
  },
  "sair-de-portugal": {
    aplicaSe: [
      "Vais emigrar ou já emigraste.",
      "Deixaste Portugal e não comunicaste a alteração.",
    ],
    naoAplicaSe: [
      "Vais estar fora temporariamente sem perder a residência habitual.",
    ],
    estruturaH2: [
      "Comunicar a alteração de domicílio fiscal",
      "Residência parcial no ano da saída",
      "O que continua a ser tributado em Portugal",
      "Representante fiscal: quando é preciso",
      "Planos de ações e o efeito da saída",
      "Obrigações que ficam pendentes",
    ],
    oQuePreparar: [
      "Data efetiva de saída.",
      "Nova morada e país de destino.",
      "Nomeação de representante fiscal, se exigível.",
      "Lista de rendimentos e ativos com ligação a Portugal.",
    ],
    dados: [
    ],
    avisos: [
      "A perda de residência como facto tributário em planos de opções resulta da Lei 21/2023 — confirmar o regime aplicável ao plano concreto.",
    ],
  },
  "convencao-dupla-tributacao": {
    aplicaSe: [
      "Tens rendimentos com ligação a dois países.",
      "Queres saber se a retenção que te fizeram estava certa.",
    ],
    naoAplicaSe: [
      "Todos os teus rendimentos são de fonte portuguesa e resides em Portugal.",
    ],
    estruturaH2: [
      "O que uma convenção faz e o que não faz",
      "Onde encontrar a convenção do país em causa",
      "Os artigos que interessam por tipo de rendimento",
      "Taxas máximas de retenção na fonte",
      "Método do crédito vs. método da isenção",
      "Estabelecimento estável: a armadilha de quem trabalha remoto",
    ],
    oQuePreparar: [
      "País da fonte do rendimento.",
      "Texto da convenção aplicável.",
      "Tipo de rendimento e artigo correspondente.",
      "Certificado de residência fiscal.",
    ],
    dados: [
    ],
    avisos: [
      "Nunca generalizar taxas: cada convenção tem as suas. Ligar sempre à lista oficial da AT.",
    ],
  },
  "modelo-21-rfi": {
    aplicaSe: [
      "És não residente e faturas a clientes portugueses.",
      "És empresa portuguesa e pagas a um fornecedor estrangeiro.",
      "Levaram-te retenção que a convenção não permitia.",
    ],
    naoAplicaSe: [
      "Ambas as partes são residentes em Portugal.",
    ],
    estruturaH2: [
      "O que o formulário faz",
      "Quem preenche o quê",
      "O certificado de residência: o documento decisivo",
      "Validade e renovação anual",
      "O que acontece se chegar tarde",
      "Reembolso quando a retenção já foi feita",
    ],
    oQuePreparar: [
      "Formulário RFI adequado ao tipo de rendimento.",
      "Certificado de residência fiscal emitido no país de residência.",
      "Identificação da convenção aplicável.",
      "Data do pagamento ou colocação à disposição.",
    ],
    dados: [
      { label: "Validade do certificado", valor: "anual", nota: "tem de ser renovado todos os anos", porConfirmar: false },
    ],
    avisos: [
      "Existem vários formulários RFI (21 a 24) consoante o tipo de rendimento — indicar qual se aplica a cada caso e ligar à página oficial de formulários.",
    ],
  },
  "nomada-digital-d8": {
    aplicaSe: [
      "Tens ou vais pedir visto de residência para trabalho remoto.",
      "Vives em Portugal e trabalhas para clientes ou empregador de fora.",
    ],
    naoAplicaSe: [
      "Estás em Portugal em estadia curta sem intenção de residir.",
    ],
    estruturaH2: [
      "Visto, autorização de residência e residência fiscal",
      "Quando começas a ser tributado cá",
      "Empregado de empresa estrangeira vs. prestador de serviços",
      "Segurança Social: onde descontas",
      "Regimes de que podes beneficiar",
      "Erros comuns no primeiro ano",
    ],
    oQuePreparar: [
      "Data de início de permanência efetiva.",
      "Natureza do vínculo (contrato de trabalho estrangeiro ou prestação de serviços).",
      "País onde a Segurança Social está a ser paga.",
      "Certificado A1 ou equivalente, se aplicável.",
    ],
    dados: [
    ],
    avisos: [
      "Não fazer afirmações sobre requisitos de imigração (rendimento mínimo, documentos) sem fonte AIMA — o guia deve ficar no perímetro fiscal e contributivo.",
    ],
  },
  "programa-regressar": {
    aplicaSe: [
      "Vives no estrangeiro e vais voltar.",
      "Voltaste recentemente e queres saber se ainda estás em prazo.",
    ],
    naoAplicaSe: [
      "Nunca deixaste de ser residente fiscal em Portugal.",
      "Já beneficias de outro regime incompatível.",
    ],
    estruturaH2: [
      "Quem é elegível",
      "O requisito de não residência prévia",
      "O que é excluído e o que não é",
      "Duração do benefício",
      "Compatibilidade com outros regimes",
      "Como se pede e onde se assinala",
    ],
    oQuePreparar: [
      "Prova de residência fiscal no estrangeiro nos anos anteriores.",
      "Data de regresso e de inscrição como residente.",
      "Situação tributária regularizada.",
    ],
    dados: [
      { label: "Exclusão", valor: "50% dos rendimentos das categorias A e B", nota: "", porConfirmar: false },
      { label: "Requisito", valor: "não ter sido residente nos anos anteriores exigidos pela norma", nota: "confirmar número de anos na redação em vigor", porConfirmar: true },
      { label: "Janela", valor: "tornar-se residente nos anos abrangidos pelo regime", nota: "confirmar anos elegíveis", porConfirmar: true },
    ],
    avisos: [
      "ALTA MANUTENÇÃO: a janela de elegibilidade é fixada por diploma e tem sido prorrogada ano a ano. Confirmar sempre os anos elegíveis e a duração antes de publicar ou renovar.",
    ],
  },
  "remoto-empresa-estrangeira": {
    aplicaSe: [
      "Vives em Portugal e o teu pagador está no estrangeiro.",
      "Estás a negociar a forma do vínculo.",
    ],
    naoAplicaSe: [
      "O teu empregador é português.",
    ],
    estruturaH2: [
      "As três estruturas",
      "Recibos verdes: o mais simples e o mais exposto",
      "Contrato direto com empresa estrangeira registada cá",
      "Employer of Record: o que compras com a margem",
      "Segurança Social: onde se desconta em cada caso",
      "Requalificação: o risco que sobra para os dois lados",
      "IVA nos serviços a clientes fora de Portugal",
    ],
    oQuePreparar: [
      "País de estabelecimento do pagador.",
      "Natureza real da relação (horário, subordinação, meios).",
      "Se há certificado A1 ou destacamento.",
      "Volume anual estimado, para efeitos de IVA.",
    ],
    dados: [
    ],
    avisos: [
      "Ligar ao guia existente falsos-recibos-verdes — o teste de subordinação é o mesmo e não deve ser duplicado.",
    ],
  },
  "representante-fiscal": {
    aplicaSe: [
      "Tens NIF português e vives fora.",
      "Vais emigrar e manter património ou rendimentos cá.",
      "Pediram-te para seres representante fiscal de alguém.",
    ],
    naoAplicaSe: [
      "Resides em Portugal.",
    ],
    estruturaH2: [
      "Quando a nomeação é obrigatória",
      "A dispensa para residentes na UE e EEE",
      "O que o representante faz",
      "O que o representante arrisca",
      "Como se nomeia e como se cessa",
      "Alternativa: adesão às notificações eletrónicas",
    ],
    oQuePreparar: [
      "País de domicílio fiscal.",
      "Tipo de rendimentos ou património em Portugal.",
      "Aceitação escrita do representante.",
      "Acesso às notificações eletrónicas.",
    ],
    dados: [
      { label: "Dispensa", valor: "domicílio na UE, Noruega, Islândia e Listenstaine", nota: "", porConfirmar: false },
    ],
    avisos: [
      "Confirmar a lista de países dispensados na redação em vigor do art. 19.º LGT.",
    ],
  },
  "nao-residentes-irs": {
    aplicaSe: [
      "Não resides em Portugal mas tens cá rendimentos ou imóveis.",
      "Vendeste um imóvel em Portugal sendo não residente.",
    ],
    naoAplicaSe: [
      "És residente fiscal em Portugal.",
    ],
    estruturaH2: [
      "O que é rendimento de fonte portuguesa",
      "As taxas aplicáveis por categoria",
      "Porque não há deduções",
      "Mais-valias imobiliárias de não residentes",
      "Quando há obrigação de entregar declaração",
      "O papel da convenção",
    ],
    oQuePreparar: [
      "Prova de residência fiscal noutro país.",
      "Lista de rendimentos de fonte portuguesa.",
      "Convenção aplicável.",
      "Representante fiscal, se exigível.",
    ],
    dados: [
      { label: "Âmbito", valor: "apenas rendimentos obtidos em território português", nota: "art. 15.º CIRS", porConfirmar: false },
    ],
    avisos: [
      "As taxas variam por categoria — não afirmar uma taxa única de 25% sem qualificar a categoria.",
    ],
  },
  "tvde-motorista": {
    aplicaSe: [
      "Exerces esta atividade a título independente em Portugal.",
      "Estás a abrir atividade e não sabes que código escolher.",
    ],
    naoAplicaSe: [
      "És trabalhador por conta de outrem nesta profissão — o teu guia é o do recibo de vencimento.",
    ],
    estruturaH2: [
      "Abrir atividade: CAE e enquadramento",
      "Coeficiente aplicável e o que ele já assume",
      "IVA: isenção, regime normal e a taxa dos serviços",
      "Segurança Social sobre o rendimento relevante",
      "Despesas: combustível, aluguer da viatura, plataforma",
      "Seguros obrigatórios",
      "O que guardar para justificar tudo",
    ],
    oQuePreparar: [
      "Contratos com o operador de plataforma.",
      "Extratos mensais de ganhos por plataforma.",
      "Faturas de combustível, manutenção e aluguer da viatura.",
      "Apólices de seguro exigidas para a atividade.",
    ],
    dados: [
      { label: "Regime simplificado", valor: "coeficiente conforme o enquadramento da atividade", nota: "confirmar CAE aplicável", porConfirmar: true },
      { label: "Isenção de IVA", valor: "volume de negócios até 15 000 €", nota: "art. 53.º CIVA", porConfirmar: false },
    ],
    avisos: [
      "O código CAE e o enquadramento no art. 151.º CIRS determinam coeficiente e retenção — verificar caso a caso e nunca generalizar por nome de profissão.",
    ],
  },
  "estafeta-plataformas": {
    aplicaSe: [
      "Exerces esta atividade a título independente em Portugal.",
      "Estás a abrir atividade e não sabes que código escolher.",
    ],
    naoAplicaSe: [
      "És trabalhador por conta de outrem nesta profissão — o teu guia é o do recibo de vencimento.",
    ],
    estruturaH2: [
      "Abrir atividade e escolher o CAE",
      "O rendimento relevante e a base de incidência",
      "A isenção do primeiro ano e o que vem depois",
      "IVA: quando ainda não é preciso",
      "Despesas que efetivamente contam",
      "Sinais de que a relação é, na verdade, subordinada",
    ],
    oQuePreparar: [
      "Extratos de ganhos por plataforma.",
      "Data de início de atividade.",
      "Registo de despesas com veículo e equipamento.",
    ],
    dados: [
      { label: "Isenção de contribuições", valor: "12 meses no início de atividade", nota: "automática", porConfirmar: false },
      { label: "Taxa contributiva", valor: "21,4% sobre a base de incidência", nota: "", porConfirmar: false },
      { label: "Base de incidência", valor: "70% do rendimento de prestação de serviços", nota: "", porConfirmar: false },
    ],
    avisos: [
      "O código CAE e o enquadramento no art. 151.º CIRS determinam coeficiente e retenção — verificar caso a caso e nunca generalizar por nome de profissão.",
    ],
  },
  "criadores-de-conteudo": {
    aplicaSe: [
      "Exerces esta atividade a título independente em Portugal.",
      "Estás a abrir atividade e não sabes que código escolher.",
    ],
    naoAplicaSe: [
      "És trabalhador por conta de outrem nesta profissão — o teu guia é o do recibo de vencimento.",
    ],
    estruturaH2: [
      "Abrir atividade: que código usar",
      "Rendimento de plataformas estrangeiras",
      "Patrocínios e conteúdos pagos",
      "Permutas e ofertas: o valor de mercado",
      "IVA: localização do serviço e o cliente fora de Portugal",
      "O que guardar como prova",
      "Quando compensa passar a sociedade",
    ],
    oQuePreparar: [
      "Extratos de cada plataforma de monetização.",
      "Contratos de patrocínio.",
      "Registo de produtos recebidos e respetivo valor de mercado.",
      "Faturas emitidas a marcas nacionais e estrangeiras.",
    ],
    dados: [
      { label: "Isenção de IVA", valor: "até 15 000 € de volume de negócios", nota: "art. 53.º CIVA", porConfirmar: false },
      { label: "Rendimento mundial", valor: "residentes declaram receita de plataformas estrangeiras", nota: "art. 15.º CIRS", porConfirmar: false },
    ],
    avisos: [
      "O código CAE e o enquadramento no art. 151.º CIRS determinam coeficiente e retenção — verificar caso a caso e nunca generalizar por nome de profissão.",
    ],
  },
  "plataformas-subscricao": {
    aplicaSe: [
      "Exerces esta atividade a título independente em Portugal.",
      "Estás a abrir atividade e não sabes que código escolher.",
    ],
    naoAplicaSe: [
      "És trabalhador por conta de outrem nesta profissão — o teu guia é o do recibo de vencimento.",
    ],
    estruturaH2: [
      "Abrir atividade e o código a usar",
      "Quem é o teu cliente para efeitos de IVA",
      "Serviços prestados por via eletrónica",
      "Quando a plataforma age como fornecedor",
      "O regime de isenção e os seus limites",
      "Privacidade: o que consta e o que não consta",
    ],
    oQuePreparar: [
      "Extratos da plataforma com detalhe de origem.",
      "Termos contratuais da plataforma quanto a IVA.",
      "Registo de faturação emitida.",
    ],
    dados: [
      { label: "Isenção de IVA", valor: "até 15 000 €", nota: "art. 53.º CIVA", porConfirmar: false },
    ],
    avisos: [
      "O código CAE e o enquadramento no art. 151.º CIRS determinam coeficiente e retenção — verificar caso a caso e nunca generalizar por nome de profissão.",
    ],
  },
  "freelancer-tecnologia": {
    aplicaSe: [
      "Exerces esta atividade a título independente em Portugal.",
      "Estás a abrir atividade e não sabes que código escolher.",
    ],
    naoAplicaSe: [
      "És trabalhador por conta de outrem nesta profissão — o teu guia é o do recibo de vencimento.",
    ],
    estruturaH2: [
      "Art. 151.º ou CAE: o que determina o enquadramento",
      "O impacto do coeficiente no imposto final",
      "Retenção na fonte em cada caso",
      "Clientes na UE e fora da UE",
      "Quando a sociedade passa a compensar",
      "A regra dos 15% de despesas",
    ],
    oQuePreparar: [
      "Descrição real dos serviços prestados.",
      "Código de atividade atualmente registado.",
      "Faturação anual e distribuição por país do cliente.",
    ],
    dados: [
      { label: "Coeficiente — tabela do art. 151.º", valor: "0,75", nota: "", porConfirmar: false },
      { label: "Coeficiente — outros serviços com CAE", valor: "0,35", nota: "", porConfirmar: false },
      { label: "Retenção na fonte", valor: "varia com o enquadramento", nota: "art. 101.º CIRS", porConfirmar: false },
    ],
    avisos: [
      "O código CAE e o enquadramento no art. 151.º CIRS determinam coeficiente e retenção — verificar caso a caso e nunca generalizar por nome de profissão.",
    ],
  },
  "profissionais-saude": {
    aplicaSe: [
      "Exerces esta atividade a título independente em Portugal.",
      "Estás a abrir atividade e não sabes que código escolher.",
    ],
    naoAplicaSe: [
      "És trabalhador por conta de outrem nesta profissão — o teu guia é o do recibo de vencimento.",
    ],
    estruturaH2: [
      "A isenção do art. 9.º CIVA",
      "Quem está abrangido",
      "O que faz cair a isenção",
      "Coeficiente e retenção na fonte",
      "Seguro de responsabilidade civil obrigatório",
      "Faturação e sigilo: o que consta da fatura",
    ],
    oQuePreparar: [
      "Cédula profissional e inscrição na ordem respetiva.",
      "Descrição das atividades efetivamente prestadas.",
      "Apólice de responsabilidade civil profissional.",
    ],
    dados: [
      { label: "Isenção de IVA", valor: "prestações de serviços de saúde", nota: "art. 9.º CIVA — isenção incompleta, sem direito a dedução", porConfirmar: false },
    ],
    avisos: [
      "O código CAE e o enquadramento no art. 151.º CIRS determinam coeficiente e retenção — verificar caso a caso e nunca generalizar por nome de profissão.",
    ],
  },
  "formadores-explicadores": {
    aplicaSe: [
      "Exerces esta atividade a título independente em Portugal.",
      "Estás a abrir atividade e não sabes que código escolher.",
    ],
    naoAplicaSe: [
      "És trabalhador por conta de outrem nesta profissão — o teu guia é o do recibo de vencimento.",
    ],
    estruturaH2: [
      "Formação certificada vs. não certificada",
      "A isenção do art. 9.º e os seus requisitos",
      "Quando se aplica antes a isenção do art. 53.º",
      "Coeficiente e retenção",
      "Faturar a escolas, empresas e particulares",
      "Entidade formadora certificada: o que muda",
    ],
    oQuePreparar: [
      "Certificação da entidade formadora, se existir.",
      "Natureza da formação prestada.",
      "Contratos com entidades formadoras.",
    ],
    dados: [
      { label: "Isenção de IVA", valor: "formação profissional em condições legalmente definidas", nota: "art. 9.º CIVA", porConfirmar: false },
    ],
    avisos: [
      "O código CAE e o enquadramento no art. 151.º CIRS determinam coeficiente e retenção — verificar caso a caso e nunca generalizar por nome de profissão.",
    ],
  },
  "artistas-direitos-autor": {
    aplicaSe: [
      "Exerces esta atividade a título independente em Portugal.",
      "Estás a abrir atividade e não sabes que código escolher.",
    ],
    naoAplicaSe: [
      "És trabalhador por conta de outrem nesta profissão — o teu guia é o do recibo de vencimento.",
    ],
    estruturaH2: [
      "O que é propriedade intelectual para o art. 58.º EBF",
      "Titular originário: o requisito que exclui cessionários",
      "O que fica de fora (obras publicitárias, arquitetura)",
      "O limite do benefício",
      "Coeficiente aplicável na Categoria B",
      "Retenção na fonte específica",
    ],
    oQuePreparar: [
      "Prova de titularidade originária dos direitos.",
      "Contratos de edição, licenciamento ou cessão.",
      "Discriminação entre rendimentos de direitos e de prestação de serviços.",
    ],
    dados: [
      { label: "Benefício", valor: "exclusão parcial de tributação dos rendimentos de propriedade intelectual", nota: "art. 58.º EBF, com limite", porConfirmar: false },
      { label: "Excluídas", valor: "obras escritas sem carácter literário, artístico ou científico, obras de arquitetura e obras publicitárias", nota: "", porConfirmar: false },
    ],
    avisos: [
      "O código CAE e o enquadramento no art. 151.º CIRS determinam coeficiente e retenção — verificar caso a caso e nunca generalizar por nome de profissão.",
    ],
  },
  "mediacao-comissoes": {
    aplicaSe: [
      "Exerces esta atividade a título independente em Portugal.",
      "Estás a abrir atividade e não sabes que código escolher.",
    ],
    naoAplicaSe: [
      "És trabalhador por conta de outrem nesta profissão — o teu guia é o do recibo de vencimento.",
    ],
    estruturaH2: [
      "Enquadramento e coeficiente",
      "Quando emitir a fatura",
      "IVA sobre comissões",
      "Retenção na fonte",
      "Seguro de responsabilidade civil obrigatório",
      "Comissões partilhadas e subcontratação",
    ],
    oQuePreparar: [
      "Contratos de mediação e acordos de comissão.",
      "Datas de celebração e de recebimento.",
      "Apólice de responsabilidade civil.",
    ],
    dados: [
      { label: "Prazo de emissão da fatura", valor: "regra do art. 36.º CIVA", nota: "", porConfirmar: false },
    ],
    avisos: [
      "O código CAE e o enquadramento no art. 151.º CIRS determinam coeficiente e retenção — verificar caso a caso e nunca generalizar por nome de profissão.",
    ],
  },
  "arquitetos-engenheiros": {
    aplicaSe: [
      "Exerces esta atividade a título independente em Portugal.",
      "Estás a abrir atividade e não sabes que código escolher.",
    ],
    naoAplicaSe: [
      "És trabalhador por conta de outrem nesta profissão — o teu guia é o do recibo de vencimento.",
    ],
    estruturaH2: [
      "Enquadramento no art. 151.º CIRS",
      "Coeficiente e retenção",
      "Faturação por fases e adiantamentos",
      "IVA nos projetos",
      "Seguro de responsabilidade civil profissional",
      "Trabalhos para entidades públicas",
    ],
    oQuePreparar: [
      "Contratos de prestação de serviços com faseamento.",
      "Apólice de responsabilidade civil profissional.",
      "Inscrição na ordem respetiva.",
    ],
    dados: [
      { label: "Coeficiente", valor: "0,75", nota: "profissões da tabela do art. 151.º CIRS", porConfirmar: false },
    ],
    avisos: [
      "O código CAE e o enquadramento no art. 151.º CIRS determinam coeficiente e retenção — verificar caso a caso e nunca generalizar por nome de profissão.",
    ],
  },
  "herancas-imposto-selo": {
    aplicaSe: [
      "Recebeste ou vais receber uma herança.",
      "És cabeça de casal.",
      "Não sabes se tens de declarar apesar de estares isento.",
    ],
    naoAplicaSe: [
      "A transmissão é onerosa — vê os guias de IMT e mais-valias.",
    ],
    estruturaH2: [
      "Quem está isento e quem paga",
      "A taxa de 10% e sobre que valor incide",
      "A participação Modelo 1 e o prazo",
      "Quem entrega: cabeça de casal e herdeiros",
      "Herança indivisa e rendimentos que ela gere",
      "O que muda no IRS dos herdeiros",
    ],
    oQuePreparar: [
      "Certidão de óbito e habilitação de herdeiros.",
      "Relação completa dos bens e respetivos valores.",
      "NIF de todos os herdeiros.",
      "Modelo 1 do Imposto do Selo.",
    ],
    dados: [
      { label: "Taxa geral", valor: "10%", nota: "", porConfirmar: false },
      { label: "Isentos", valor: "cônjuge ou unido de facto, ascendentes e descendentes", nota: "art. 6.º CIS", porConfirmar: false },
      { label: "Prazo da participação", valor: "até ao fim do 3.º mês seguinte à transmissão", nota: "art. 26.º CIS", porConfirmar: false },
    ],
    avisos: [
      "Confirmar o prazo e a competência de entrega no art. 26.º e 28.º CIS em vigor.",
    ],
  },
  "doacoes": {
    aplicaSe: [
      "Estás a pensar doar bens a filhos ou netos.",
      "Queres comparar doar agora com deixar em testamento.",
    ],
    naoAplicaSe: [
      "A transmissão é onerosa.",
    ],
    estruturaH2: [
      "O imposto do selo nas duas vias",
      "Imóveis doados e o IMT",
      "O valor de aquisição que o donatário herda",
      "Efeitos sucessórios: colação e legítima",
      "Usufruto e nua-propriedade",
      "Quando doar faz mesmo sentido",
    ],
    oQuePreparar: [
      "Identificação dos bens e valores.",
      "Grau de parentesco entre doador e donatário.",
      "Escritura ou documento particular autenticado.",
      "Participação Modelo 1.",
    ],
    dados: [
      { label: "Taxa geral do selo", valor: "10%", nota: "com isenção para família direta", porConfirmar: false },
    ],
    avisos: [
      "Matéria com forte componente de direito civil — manter o guia no perímetro fiscal e remeter o resto para advogado.",
    ],
  },
  "divorcio-irs": {
    aplicaSe: [
      "Divorciaste-te ou separaste-te judicialmente.",
      "Estás a preencher o primeiro IRS depois da separação.",
    ],
    naoAplicaSe: [
      "Continuas casado e vais optar por tributação conjunta ou separada — vê esse guia.",
    ],
    estruturaH2: [
      "O estado civil que conta é o de 31 de dezembro",
      "Quem declara os dependentes",
      "Despesas de saúde e educação: como se repartem",
      "A casa de morada de família",
      "Pensão de alimentos: quem deduz",
      "Bens partilhados e mais-valias futuras",
    ],
    oQuePreparar: [
      "Sentença ou acordo de divórcio.",
      "Regulação do exercício das responsabilidades parentais.",
      "Acordo de partilha, se existir.",
      "Comunicação dos dependentes feita à AT.",
    ],
    dados: [
      { label: "Data de referência", valor: "31 de dezembro", nota: "determina o estado civil declarado", porConfirmar: false },
    ],
    avisos: [
    ],
  },
  "pensao-alimentos-irs": {
    aplicaSe: [
      "Pagas pensão de alimentos a filhos ou ex-cônjuge.",
      "Recebes pensão de alimentos.",
    ],
    naoAplicaSe: [
      "A transferência resulta de acordo informal, sem homologação.",
    ],
    estruturaH2: [
      "O requisito que decide tudo: sentença ou homologação",
      "A dedução de 20% e a ausência de limite",
      "O lado de quem recebe",
      "Filhos que também são dependentes: a incompatibilidade",
      "Prova de pagamento que a AT aceita",
      "Onde se declara em cada caso",
    ],
    oQuePreparar: [
      "Sentença ou acordo homologado.",
      "Comprovativos bancários de cada pagamento.",
      "NIF de quem recebe.",
      "Confirmação de que o filho não está a ser declarado como dependente.",
    ],
    dados: [
      { label: "Dedução", valor: "20% das importâncias comprovadamente suportadas", nota: "art. 83.º-A CIRS", porConfirmar: false },
      { label: "Limite", valor: "sem limite máximo", nota: "", porConfirmar: false },
    ],
    avisos: [
      "Sublinhar a incompatibilidade entre deduzir alimentos e declarar o mesmo filho como dependente — é o erro mais frequente.",
    ],
  },
  "guarda-partilhada-irs": {
    aplicaSe: [
      "Tens filhos em guarda partilhada.",
      "O outro progenitor declarou de forma diferente da tua.",
    ],
    naoAplicaSe: [
      "Tens guarda exclusiva.",
    ],
    estruturaH2: [
      "O que se comunica e onde",
      "O prazo anual",
      "Percentagem de repartição das despesas",
      "O que acontece quando as comunicações divergem",
      "Residência alternada e o seu efeito",
      "Corrigir depois do prazo",
    ],
    oQuePreparar: [
      "Regulação das responsabilidades parentais.",
      "Acordo sobre a percentagem de repartição.",
      "Confirmação de que o outro progenitor comunicou o mesmo.",
      "Acesso ao Portal das Finanças.",
    ],
    dados: [
      { label: "Prazo de comunicação", valor: "até ao final de fevereiro", nota: "anual e por ambos os progenitores", porConfirmar: false },
      { label: "Divergência ou omissão", valor: "repartição supletiva de 50%/50%", nota: "", porConfirmar: false },
    ],
    avisos: [
    ],
  },
  "dependentes-irs": {
    aplicaSe: [
      "Tens filhos a estudar ou a começar a trabalhar.",
      "O teu filho teve um trabalho de verão.",
    ],
    naoAplicaSe: [
      "Não tens dependentes.",
    ],
    estruturaH2: [
      "Quem é dependente para o IRS",
      "O limite de rendimentos do dependente",
      "Estudantes e o requisito de formação",
      "Dependentes com deficiência",
      "O efeito nas deduções à coleta",
      "Quando compensa sair do agregado",
    ],
    oQuePreparar: [
      "Idade e situação escolar de cada dependente.",
      "Rendimentos auferidos pelo dependente no ano.",
      "Atestado multiuso, se aplicável.",
    ],
    dados: [
    ],
    avisos: [
      "O limite de rendimentos do dependente é indexado e atualizado — ler o art. 13.º CIRS em vigor.",
    ],
  },
  "deficiencia-irs": {
    aplicaSe: [
      "Tu ou um dependente têm incapacidade atestada.",
      "Tens despesas de acompanhamento ou educação especial.",
    ],
    naoAplicaSe: [
      "Não há atestado multiuso emitido.",
    ],
    estruturaH2: [
      "O atestado multiuso: o documento que abre tudo",
      "O grau de incapacidade exigido",
      "Exclusão parcial de rendimentos",
      "Deduções específicas que se acumulam",
      "Despesas com acompanhamento",
      "Como se declara",
    ],
    oQuePreparar: [
      "Atestado multiuso válido e o grau de incapacidade.",
      "Faturas de despesas específicas.",
      "Comprovativos de educação especial ou acompanhamento.",
    ],
    dados: [
    ],
    avisos: [
      "Os montantes e o grau mínimo de incapacidade são atualizados — ler o CIRS e o EBF em vigor, e não replicar valores de artigos de imprensa.",
    ],
  },
  "ascendentes-lares": {
    aplicaSe: [
      "Tens pais ou avós a teu cargo.",
      "Pagas lar ou apoio domiciliário.",
    ],
    naoAplicaSe: [
      "O ascendente tem rendimentos próprios acima do limite.",
    ],
    estruturaH2: [
      "Requisitos para ser ascendente a cargo",
      "O limite de rendimento",
      "A dedução por ascendente",
      "Despesas com lares e o seu teto",
      "Faturas que contam e faturas que não contam",
    ],
    oQuePreparar: [
      "Comprovativo de comunhão de habitação.",
      "Rendimentos do ascendente no ano.",
      "Faturas do lar com NIF do sujeito passivo.",
    ],
    dados: [
    ],
    avisos: [
    ],
  },
  "reformado-recibos-verdes": {
    aplicaSe: [
      "És reformado e queres continuar a trabalhar por conta própria.",
      "Já passas recibos verdes e passaste a receber pensão.",
    ],
    naoAplicaSe: [
      "Recebes prestação incompatível com o exercício de atividade.",
    ],
    estruturaH2: [
      "Acumulação: o que a lei permite",
      "O regime contributivo do pensionista",
      "Pensão e Categoria B somam-se no englobamento",
      "Retenção na fonte em cada rendimento",
      "Pensões de invalidez: as restrições",
      "O efeito sobre a própria pensão",
    ],
    oQuePreparar: [
      "Tipo de pensão que recebes.",
      "Rendimento anual estimado da atividade.",
      "Enquadramento contributivo atual na Segurança Social.",
    ],
    dados: [
      { label: "Dedução específica das pensões", valor: "4 350,24 €", nota: "art. 53.º CIRS", porConfirmar: false },
    ],
    avisos: [
      "Confirmar as regras de isenção contributiva de pensionistas no Código Contributivo em vigor — variam com o tipo e o valor da pensão.",
    ],
  },
  "irs-pensionistas": {
    aplicaSe: [
      "Recebes pensão de velhice, invalidez ou sobrevivência.",
      "Acumulas pensão com outros rendimentos.",
    ],
    naoAplicaSe: [
      "Ainda estás no ativo e não recebes pensão.",
    ],
    estruturaH2: [
      "O que é Categoria H",
      "A dedução específica de valor fixo",
      "Retenção na fonte sobre pensões",
      "Mínimo de existência",
      "Pensões do estrangeiro",
      "Acumulação com trabalho",
    ],
    oQuePreparar: [
      "Declaração anual da entidade pagadora da pensão.",
      "Comprovativo de retenções.",
      "Documentos de pensões estrangeiras, se aplicável.",
    ],
    dados: [
      { label: "Dedução específica", valor: "4 350,24 €", nota: "valor fixo, art. 53.º CIRS", porConfirmar: false },
    ],
    avisos: [
    ],
  },
  "reforma-independentes": {
    aplicaSe: [
      "Trabalhas por conta própria e queres saber o que estás a construir.",
      "Estás a decidir se ajustas a base de incidência para baixo.",
    ],
    naoAplicaSe: [
      "És trabalhador por conta de outrem exclusivamente.",
    ],
    estruturaH2: [
      "Como se forma o direito à pensão",
      "Prazo de garantia",
      "O que conta como remuneração registada",
      "O efeito do ajuste de ±25%",
      "Períodos de isenção e o seu custo futuro",
      "Onde consultar a tua carreira contributiva",
    ],
    oQuePreparar: [
      "Extrato de carreira contributiva na Segurança Social Direta.",
      "Histórico de bases de incidência declaradas.",
      "Anos de descontos acumulados.",
    ],
    dados: [
      { label: "Taxa contributiva", valor: "21,4%", nota: "", porConfirmar: false },
      { label: "Base de incidência", valor: "70% do rendimento de prestação de serviços", nota: "20% na venda de bens", porConfirmar: false },
      { label: "Ajuste na declaração trimestral", valor: "±25% em intervalos de 5%", nota: "", porConfirmar: false },
    ],
    avisos: [
      "Não publicar fórmulas de cálculo de pensão sem as validar na regulamentação em vigor — a taxa de formação e o fator de sustentabilidade mudam.",
    ],
  },
  "pensao-estrangeira": {
    aplicaSe: [
      "Recebes pensão de outro país e vives em Portugal.",
      "Regressaste a Portugal depois de trabalhar no estrangeiro.",
    ],
    naoAplicaSe: [
      "Toda a tua pensão é de origem portuguesa.",
    ],
    estruturaH2: [
      "Residência determina onde declaras",
      "O artigo das pensões na convenção",
      "Pensões públicas: a exceção",
      "Crédito de imposto ou isenção",
      "Onde se declara",
      "Regimes de que podes beneficiar",
    ],
    oQuePreparar: [
      "Documento da entidade pagadora estrangeira.",
      "Convenção aplicável ao país de origem.",
      "Comprovativo de imposto pago no estrangeiro.",
      "Natureza da pensão: pública ou privada.",
    ],
    dados: [
    ],
    avisos: [
    ],
  },
  "reforma-antecipada": {
    aplicaSe: [
      "Estás a ponderar reformar-te antes da idade normal de acesso.",
      "Tens carreira contributiva longa.",
    ],
    naoAplicaSe: [
      "Vais reformar-te na idade normal de acesso.",
    ],
    estruturaH2: [
      "Idade normal de acesso e como se atualiza",
      "Fator de sustentabilidade",
      "Penalização por antecipação",
      "Regimes com dispensa de penalização",
      "Carreiras muito longas",
      "Fazer as contas antes de decidir",
    ],
    oQuePreparar: [
      "Extrato de carreira contributiva.",
      "Idade e anos de descontos.",
      "Simulação de pensão na Segurança Social Direta.",
    ],
    dados: [
    ],
    avisos: [
      "SEM BASE LEGAL NO CATÁLOGO: o regime de flexibilização da idade de pensão consta do DL 187/2007 e das portarias anuais do fator de sustentabilidade. Localizar, verificar por HTTP e acrescentar ao catálogo antes de escrever este guia.",
      "A idade normal de acesso e o fator de sustentabilidade são fixados por portaria anual — este guia exige revisão todos os anos e não deve conter valores fixos no corpo do texto.",
    ],
  },
  "saf-t-faturacao": {
    aplicaSe: [
      "Emites faturas com programa certificado.",
      "És sujeito passivo de IVA com obrigação de comunicação.",
    ],
    naoAplicaSe: [
      "Emites tudo no Portal das Finanças — nesse caso a comunicação é automática.",
    ],
    estruturaH2: [
      "O que é o SAF-T e o que contém",
      "Quem é obrigado a comunicar",
      "O prazo mensal",
      "Meses sem faturação",
      "Comunicar por webservice, ficheiro ou manualmente",
      "O que falha e como se corrige",
      "SAF-T da contabilidade: obrigação distinta",
    ],
    oQuePreparar: [
      "Programa de faturação certificado e atualizado.",
      "Credenciais de comunicação à AT.",
      "Confirmação de que todas as séries estão comunicadas.",
    ],
    dados: [
      { label: "Prazo", valor: "até ao dia 5 do mês seguinte", nota: "comunicação dos documentos do mês anterior", porConfirmar: false },
      { label: "Meses sem faturação", valor: "comunicação na mesma", nota: "", porConfirmar: false },
    ],
    avisos: [
      "O prazo já foi alterado várias vezes (dia 5, 8, 12). Confirmar o prazo em vigor no DL 28/2019 antes de publicar.",
      "Distinguir claramente SAF-T de faturação (mensal) de SAF-T da contabilidade (anual, com entrada em vigor diferida).",
    ],
  },
  "atcud-qr-code": {
    aplicaSe: [
      "Emites faturas ou outros documentos fiscalmente relevantes.",
      "Vais criar uma nova série.",
    ],
    naoAplicaSe: [
      "Não emites documentos fiscalmente relevantes.",
    ],
    estruturaH2: [
      "O que é o ATCUD",
      "Registar uma série e obter o código de validação",
      "O que o QR code contém",
      "Onde têm de aparecer no documento",
      "Documentos sem ATCUD: consequências",
      "Mudança de programa ou de ano",
    ],
    oQuePreparar: [
      "Séries a utilizar no período.",
      "Código de validação obtido no Portal das Finanças.",
      "Programa de faturação capaz de gerar ATCUD e QR.",
    ],
    dados: [
    ],
    avisos: [
    ],
  },
  "faturacao-eletronica": {
    aplicaSe: [
      "Emites faturas a empresas ou ao Estado.",
      "Estás a escolher software de faturação para os próximos anos.",
    ],
    naoAplicaSe: [
      "Não emites documentos fiscalmente relevantes.",
    ],
    estruturaH2: [
      "As três obrigações que se confundem",
      "PDF: até quando vale",
      "Formato estruturado e assinatura eletrónica qualificada",
      "Faturação eletrónica com entidades públicas",
      "SAF-T da contabilidade",
      "O que fazer agora e o que pode esperar",
    ],
    oQuePreparar: [
      "Tipo de clientes (B2B, B2C, B2G).",
      "Capacidades do software atual.",
      "Calendário aplicável ao teu caso.",
    ],
    dados: [
    ],
    avisos: [
      "MÁXIMA PRIORIDADE DE VERIFICAÇÃO: as datas foram sucessivamente adiadas por diplomas anuais. NÃO publicar datas sem as confirmar no DL 28/2019 consolidado e no diploma de adiamento mais recente. Marcar o guia para revisão a cada Orçamento do Estado.",
    ],
  },
  "programa-faturacao-certificado": {
    aplicaSe: [
      "Estás a começar e queres saber se precisas de software.",
      "Cresceste e não sabes se já ultrapassaste o limiar.",
    ],
    naoAplicaSe: [
      "Já usas programa certificado e não pretendes mudar.",
    ],
    estruturaH2: [
      "Os critérios de obrigatoriedade",
      "Faturar no Portal das Finanças: quando ainda dá",
      "O que muda quando passas o limiar",
      "Escolher software certificado",
      "Mudar de programa a meio do ano",
      "Conservação de documentos",
    ],
    oQuePreparar: [
      "Volume de negócios do ano anterior.",
      "Número de documentos emitidos.",
      "Necessidades de integração e de exportação SAF-T.",
    ],
    dados: [
    ],
    avisos: [
      "Os limiares de volume de negócios e de número de faturas foram alterados várias vezes — confirmar no DL 28/2019 em vigor.",
    ],
  },
  "nota-de-credito": {
    aplicaSe: [
      "Emitiste uma fatura com erro.",
      "O cliente devolveu bens ou cancelou o serviço.",
      "Faltou o NIF na fatura.",
    ],
    naoAplicaSe: [
      "A fatura ainda não foi emitida nem comunicada.",
    ],
    estruturaH2: [
      "Anular ou retificar: o critério",
      "Erros no valor ou na taxa: nota de crédito",
      "Erros no NIF ou no nome: substituição",
      "O que a nota de crédito tem de conter",
      "Regularização do IVA e a prova exigida",
      "Prazos para regularizar",
    ],
    oQuePreparar: [
      "Número e data do documento a corrigir.",
      "Motivo da correção.",
      "Comprovativo de que o cliente tomou conhecimento.",
      "Séries e ATCUD do documento retificativo.",
    ],
    dados: [
      { label: "Regra", valor: "documento comunicado à AT corrige-se por nota de crédito", nota: "", porConfirmar: false },
      { label: "Regularização de IVA a favor do sujeito passivo", valor: "exige prova de que o adquirente tomou conhecimento", nota: "art. 78.º CIVA", porConfirmar: false },
    ],
    avisos: [
      "Os arts. 78.º-A a 78.º-D CIVA (créditos incobráveis) não têm página própria no Portal das Finanças — usar o PDF oficial do Código como fonte.",
    ],
  },
  "declaracao-periodica-iva": {
    aplicaSe: [
      "Estás no regime normal de IVA, mensal ou trimestral.",
      "Renunciaste à isenção do art. 53.º.",
    ],
    naoAplicaSe: [
      "Estás isento pelo art. 53.º e não renunciaste.",
    ],
    estruturaH2: [
      "Mensal ou trimestral: o que determina",
      "Os prazos de entrega e de pagamento",
      "As férias fiscais de agosto",
      "IVA liquidado: onde entra cada operação",
      "IVA dedutível e as exclusões",
      "Regularizações",
      "Crédito de imposto: reportar ou pedir reembolso",
      "Declaração de substituição",
    ],
    oQuePreparar: [
      "Registo completo de faturas emitidas e recebidas do período.",
      "IVA suportado com documento válido.",
      "Notas de crédito e regularizações.",
      "Meio de pagamento e referência.",
    ],
    dados: [
      { label: "Prazo de entrega", valor: "até ao dia 20 do 2.º mês seguinte ao período", nota: "art. 41.º CIVA", porConfirmar: false },
      { label: "Prazo de pagamento", valor: "até ao dia 25 do mês da entrega", nota: "", porConfirmar: false },
      { label: "Obrigações que caem em agosto", valor: "transitam para setembro", nota: "", porConfirmar: false },
    ],
    avisos: [
      "Os prazos concretos de cada trimestre variam com fins de semana e feriados — gerar a partir de calendário, não fixar no texto.",
    ],
  },
  "declaracao-recapitulativa": {
    aplicaSe: [
      "Prestas serviços a clientes empresariais noutro país da UE.",
      "Fazes transmissões intracomunitárias de bens.",
    ],
    naoAplicaSe: [
      "Os teus clientes são todos portugueses ou de fora da UE.",
    ],
    estruturaH2: [
      "Quem é obrigado a entregar",
      "Periodicidade: mensal ou trimestral",
      "O que se declara e com que código",
      "Relação com o VIES",
      "Relação com a declaração periódica",
      "Erros e substituição",
    ],
    oQuePreparar: [
      "Número de IVA válido no VIES de cada cliente.",
      "Valor das operações por cliente e por período.",
      "Confirmação da natureza da operação (bens ou serviços).",
    ],
    dados: [
    ],
    avisos: [
      "Sublinhar que a obrigação existe mesmo para quem está no regime de isenção do art. 53.º — é o ponto que gera mais incumprimento.",
    ],
  },
  "modelo-10": {
    aplicaSe: [
      "Pagaste rendimentos sujeitos a IRS a residentes.",
      "Fizeste retenções na fonte a prestadores de serviços.",
    ],
    naoAplicaSe: [
      "Todos os rendimentos que pagaste já foram declarados na DMR.",
    ],
    estruturaH2: [
      "O que se declara na Modelo 10",
      "A fronteira com a DMR",
      "Prazo de entrega",
      "Quem tem obrigação",
      "Erros mais comuns",
      "Substituição",
    ],
    oQuePreparar: [
      "Mapa de rendimentos pagos por beneficiário.",
      "Retenções efetuadas e entregues.",
      "NIF de cada beneficiário.",
    ],
    dados: [
    ],
    avisos: [
      "Confirmar o prazo de entrega (habitualmente janeiro/fevereiro) na portaria em vigor.",
    ],
  },
  "modelo-30": {
    aplicaSe: [
      "Pagas serviços, royalties ou juros a entidades estrangeiras.",
      "Contratas prestadores fora de Portugal.",
    ],
    naoAplicaSe: [
      "Todos os teus fornecedores são residentes em Portugal.",
    ],
    estruturaH2: [
      "Que pagamentos geram obrigação",
      "Retenção na fonte: taxas internas",
      "Dispensa ou redução ao abrigo de convenção",
      "O papel do RFI e do certificado de residência",
      "Prazo de entrega da Modelo 30",
      "Consequências de não reter",
    ],
    oQuePreparar: [
      "Identificação fiscal do beneficiário e país.",
      "Natureza do rendimento pago.",
      "Formulário RFI e certificado de residência, se aplicável.",
      "Comprovativo de retenção entregue.",
    ],
    dados: [
    ],
    avisos: [
      "Quem não retém responde pelo imposto — sublinhar a responsabilidade do substituto tributário.",
    ],
  },
  "dmr-dmis": {
    aplicaSe: [
      "Tens trabalhadores ou pagas rendimentos de trabalho dependente.",
      "Praticas operações sujeitas a imposto do selo.",
    ],
    naoAplicaSe: [
      "Não tens trabalhadores nem operações sujeitas a selo.",
    ],
    estruturaH2: [
      "DMR: o que declara e quando",
      "DMIS: o que declara e quando",
      "A duplicação com a Segurança Social",
      "Meses sem movimento",
      "Coimas por falta de entrega",
    ],
    oQuePreparar: [
      "Processamento salarial do mês.",
      "Retenções efetuadas.",
      "Operações sujeitas a imposto do selo.",
    ],
    dados: [
    ],
    avisos: [
      "Confirmar prazos exatos nas portarias aplicáveis.",
    ],
  },
  "declaracao-trimestral-ss": {
    aplicaSe: [
      "És trabalhador independente com obrigação declarativa trimestral.",
      "Queres reduzir ou aumentar a contribuição mensal.",
    ],
    naoAplicaSe: [
      "Estás isento de contribuir e de declarar.",
    ],
    estruturaH2: [
      "O que se declara e em que prazo",
      "Rendimento relevante e base de incidência",
      "A taxa contributiva",
      "O ajuste de ±25% em degraus de 5%",
      "O que o ajuste custa no futuro",
      "Falta de entrega: consequências",
    ],
    oQuePreparar: [
      "Rendimento faturado no trimestre.",
      "Acesso à Segurança Social Direta.",
      "Decisão sobre o ajuste da base.",
      "Efeito pretendido na proteção social.",
    ],
    dados: [
      { label: "Prazo de entrega", valor: "entre o dia 1 e o dia 30 do mês seguinte ao trimestre", nota: "", porConfirmar: false },
      { label: "Taxa contributiva", valor: "21,4%", nota: "", porConfirmar: false },
      { label: "Base de incidência", valor: "70% do rendimento de prestação de serviços", nota: "20% na venda de bens", porConfirmar: false },
      { label: "Ajuste voluntário", valor: "±25%, em intervalos de 5%", nota: "", porConfirmar: false },
    ],
    avisos: [
      "Ligar explicitamente ao efeito na proteção social — baixar a base reduz subsídios de doença, parentalidade e pensão.",
    ],
  },
  "oss-iva": {
    aplicaSe: [
      "Vendes a particulares noutros Estados-membros.",
      "Prestas serviços eletrónicos a consumidores da UE.",
    ],
    naoAplicaSe: [
      "Só vendes a empresas com número VIES válido.",
      "Só vendes em Portugal.",
    ],
    estruturaH2: [
      "Onde é devido o IVA nas vendas B2C",
      "O limiar comunitário e o que conta para ele",
      "Registar-se no OSS",
      "O que se declara e com que periodicidade",
      "Taxas de cada país",
      "Faturação e conservação de registos",
      "Quando o OSS não serve",
    ],
    oQuePreparar: [
      "Volume de vendas B2C por país da UE.",
      "Natureza das operações (bens ou serviços eletrónicos).",
      "Registo no OSS no Portal das Finanças.",
      "Taxas de IVA aplicáveis em cada país de destino.",
    ],
    dados: [
    ],
    avisos: [
      "Confirmar o limiar comunitário em vigor antes de publicar valores.",
      "Distinguir OSS União de OSS não-União.",
    ],
  },
  "ioss": {
    aplicaSe: [
      "Vendes bens importados de países terceiros a consumidores da UE.",
      "Fazes dropshipping.",
    ],
    naoAplicaSe: [
      "Só vendes bens já em livre prática na UE.",
    ],
    estruturaH2: [
      "O que o IOSS resolve",
      "O limiar de valor intrínseco",
      "Quem se pode registar",
      "Plataformas como sujeito passivo presumido",
      "Declaração e pagamento",
      "Quando não se aplica",
    ],
    oQuePreparar: [
      "Fluxo logístico e origem dos bens.",
      "Valor intrínseco por remessa.",
      "Registo IOSS e intermediário, se aplicável.",
    ],
    dados: [
      { label: "Limiar de valor intrínseco", valor: "150 €", nota: "remessas importadas, sem impostos especiais de consumo", porConfirmar: false },
    ],
    avisos: [
    ],
  },
  "vies": {
    aplicaSe: [
      "Vais faturar a empresas noutro Estado-membro.",
      "Compras serviços a fornecedores da UE.",
    ],
    naoAplicaSe: [
      "Só tens clientes e fornecedores nacionais.",
    ],
    estruturaH2: [
      "O que é o VIES",
      "Como te registas em Portugal",
      "Validar o número do cliente e guardar prova",
      "O que acontece se o número não for válido",
      "Relação com a declaração recapitulativa",
      "Isento do art. 53.º também precisa",
    ],
    oQuePreparar: [
      "Declaração de alterações para inscrição no VIES.",
      "Número de IVA de cada cliente da UE.",
      "Print da validação com data.",
    ],
    dados: [
    ],
    avisos: [
      "Sublinhar que quem está no regime de isenção do art. 53.º também tem de se registar no VIES para operações intracomunitárias.",
    ],
  },
  "autoliquidacao-iva": {
    aplicaSe: [
      "Prestas serviços a empresas noutro Estado-membro.",
      "Compras serviços a fornecedores estrangeiros.",
      "Trabalhas em setores com autoliquidação interna.",
      "Fazes empreitadas de construção ou reabilitação de habitação.",
    ],
    naoAplicaSe: [
      "Todas as tuas operações são internas e sem regime especial.",
    ],
    estruturaH2: [
      "Onde se localiza o serviço",
      "B2B intracomunitário: a regra geral",
      "A menção obrigatória na fatura",
      "Como declaras quando és o adquirente",
      "Autoliquidação interna (construção civil, sucatas)",
      "O que mudou a 1 de julho de 2026",
      "A empreitada de habitação à taxa reduzida (verba 2.42)",
      "Erros que geram liquidação adicional",
    ],
    oQuePreparar: [
      "Estatuto do cliente (empresa ou particular) e país.",
      "Validação VIES.",
      "Menção legal correta na fatura.",
      "Campos da declaração periódica a preencher.",
    ],
    dados: [
    ],
    avisos: [
      "A menção deve reproduzir a fórmula legal — indicar a redação exata exigida pelo CIVA e não uma tradução livre.",
      "Desde 1 de julho de 2026, a inversão do sujeito passivo na construção civil já não depende só de o adquirente ter direito à dedução: nas empreitadas da verba 2.42 aplica-se mesmo a quem não deduz.",
      "A taxa reduzida da verba 2.42 confirma-se depois da obra. Se as condições falharem, o imposto é regularizado a favor do Estado, com juros compensatórios.",
    ],
  },
  "renunciar-isencao-iva": {
    aplicaSe: [
      "Estás isento e vais fazer investimento relevante.",
      "Os teus clientes são empresas que deduzem IVA.",
    ],
    naoAplicaSe: [
      "Vendes sobretudo a consumidores finais.",
      "Não tens IVA suportado significativo.",
    ],
    estruturaH2: [
      "O que a isenção do art. 53.º custa",
      "Quem beneficia da renúncia",
      "Como se opta",
      "O período mínimo de permanência",
      "Voltar atrás",
      "Fazer a conta antes de decidir",
    ],
    oQuePreparar: [
      "IVA suportado estimado no próximo ano.",
      "Perfil dos clientes (empresas ou particulares).",
      "Declaração de alterações.",
    ],
    dados: [
      { label: "Limiar da isenção", valor: "15 000 € de volume de negócios anual em território nacional", nota: "art. 53.º CIVA", porConfirmar: false },
    ],
    avisos: [
    ],
  },
  "mudar-regime-iva": {
    aplicaSe: [
      "Passaste ou vais passar os 15 000 € de volume de negócios.",
      "Estás quase no limiar e queres antecipar-te.",
    ],
    naoAplicaSe: [
      "Estás confortavelmente abaixo do limiar.",
    ],
    estruturaH2: [
      "Como se conta o volume de negócios",
      "O prazo para a declaração de alterações",
      "A partir de quando liquidas IVA",
      "A regra dos 25% e o efeito imediato",
      "O que fazer às faturas já emitidas",
      "Regularizar IVA suportado antes da mudança",
    ],
    oQuePreparar: [
      "Volume de negócios acumulado do ano.",
      "Data em que o limiar foi ultrapassado.",
      "Declaração de alterações submetida.",
      "Atualização do software de faturação.",
    ],
    dados: [
      { label: "Limiar", valor: "15 000 € de volume de negócios anual em território nacional", nota: "art. 53.º CIVA", porConfirmar: false },
      { label: "Ultrapassagem superior a 25% do limiar", valor: "efeito imediato na mudança de regime", nota: "art. 58.º CIVA", porConfirmar: false },
    ],
    avisos: [
      "O art. 53.º e o art. 58.º CIVA foram alterados pelo DL 35/2025 e pelo DL 97/2026 — ler sempre a redação em vigor no PDF oficial do Código.",
    ],
  },
  "regime-isencao-ue": {
    aplicaSe: [
      "Vendes ou prestas serviços noutros países da UE e ficarias abaixo dos limiares locais.",
      "Recebeste indicação de que precisas de registo de IVA noutro país.",
    ],
    naoAplicaSe: [
      "Só operas em Portugal.",
    ],
    estruturaH2: [
      "O que mudou em 2025",
      "O limiar de volume de negócios na União",
      "A notificação prévia ao Estado de estabelecimento",
      "O número individual com sufixo EX",
      "Obrigações declarativas do regime",
      "Quando deixa de se aplicar",
      "Diferença face ao OSS",
    ],
    oQuePreparar: [
      "Volume de negócios total na União Europeia.",
      "Estados-membros onde pretendes aplicar a isenção.",
      "Notificação prévia submetida.",
      "Confirmação da atribuição do número EX.",
    ],
    dados: [
      { label: "Limiar de volume de negócios na União", valor: "100 000 €", nota: "condição do regime transfronteiriço", porConfirmar: false },
      { label: "Limiar nacional", valor: "15 000 €", nota: "art. 53.º CIVA", porConfirmar: false },
      { label: "Identificação", valor: "número individual com sufixo EX", nota: "", porConfirmar: false },
    ],
    avisos: [
      "GUIA NOVO E POUCO COBERTO EM PORTUGUÊS — grande oportunidade editorial.",
      "Base legal: arts. 52.º-A, 52.º-B, 53.º e 58.º-A CIVA, na redação do DL 35/2025, de 24 de março, com última atualização pelo DL 97/2026, de 20/05 e Declaração de Retificação n.º 26/2026/1, de 13/07. As páginas .aspx dos arts. 52.º-A/58.º-A não existem no Portal das Finanças — usar o PDF oficial do Código como fonte.",
    ],
  },
  "coimas-fiscais": {
    aplicaSe: [
      "Falhaste um prazo declarativo.",
      "Recebeste notificação de contraordenação.",
      "Detetaste um erro antes de a AT o detetar.",
    ],
    naoAplicaSe: [
      "Estás a discutir o imposto em si — isso é reclamação ou impugnação.",
    ],
    estruturaH2: [
      "Que infrações geram coima",
      "Os montantes do RGIT",
      "Negligência e dolo",
      "Redução por regularização voluntária",
      "Dispensa de coima",
      "Quando já não há redução possível",
      "Pagar ou defender-se",
    ],
    oQuePreparar: [
      "Identificação da obrigação em falta e do período.",
      "Data da regularização voluntária.",
      "Notificação recebida, se existir.",
      "Pedido de redução apresentado dentro do prazo.",
    ],
    dados: [
      { label: "Falta ou atraso de declarações", valor: "150 € a 3 750 €", nota: "art. 116.º RGIT", porConfirmar: false },
      { label: "Redução por regularização antes de ação da AT", valor: "12,5% do montante mínimo legal", nota: "art. 30.º RGIT", porConfirmar: false },
      { label: "Valor mínimo após redução", valor: "25 €", nota: "", porConfirmar: false },
    ],
    avisos: [
      "Os montantes e as percentagens de redução constam dos arts. 29.º, 30.º e 116.º RGIT — ler a redação em vigor, que já mudou.",
      "Distinguir dispensa (art. 29.º) de redução (art. 30.º).",
    ],
  },
  "regularizacao-voluntaria": {
    aplicaSe: [
      "Detetaste uma obrigação em falta.",
      "Sabes que há um erro e a AT ainda não te contactou.",
    ],
    naoAplicaSe: [
      "Já foste notificado de contraordenação ou de inspeção — as regras são outras, mas ainda há margem.",
    ],
    estruturaH2: [
      "O que conta como regularização voluntária",
      "A janela: antes de quê, exatamente",
      "Percentagens de redução por momento",
      "O pedido: quando é preciso e quando é implícito",
      "Pagar em 15 dias",
      "O que fazer se já houve inspeção",
    ],
    oQuePreparar: [
      "Declaração ou prestação em falta.",
      "Comprovativo da data de entrega.",
      "Pedido de redução, se exigido.",
      "Meio de pagamento pronto.",
    ],
    dados: [
      { label: "Redução antes de qualquer ação da AT", valor: "12,5% do mínimo legal", nota: "art. 30.º RGIT", porConfirmar: false },
      { label: "Prazo de regularização após pedido", valor: "15 dias", nota: "", porConfirmar: false },
    ],
    avisos: [
    ],
  },
  "declaracao-substituicao": {
    aplicaSe: [
      "Entregaste o IRS e detetaste um erro.",
      "Recebeste uma divergência da AT.",
    ],
    naoAplicaSe: [
      "Ainda estás dentro do prazo normal de entrega — basta entregar de novo.",
    ],
    estruturaH2: [
      "Substituição dentro do prazo normal",
      "Substituição fora do prazo",
      "Correções a favor do Estado",
      "Correções a teu favor e o prazo de reclamação",
      "Revisão oficiosa: a via esquecida",
      "Efeito em coimas e juros",
    ],
    oQuePreparar: [
      "Declaração original submetida.",
      "Identificação exata do erro.",
      "Documentos de suporte da correção.",
      "Nota de liquidação, se já emitida.",
    ],
    dados: [
    ],
    avisos: [
      "Confirmar os prazos do art. 59.º CPPT e do art. 78.º LGT na redação em vigor antes de indicar números.",
    ],
  },
  "inspecao-tributaria": {
    aplicaSe: [
      "Recebeste carta-aviso ou ordem de serviço.",
      "Estás em procedimento inspetivo.",
    ],
    naoAplicaSe: [
      "Recebeste apenas um pedido de esclarecimento pontual — é procedimento diferente.",
    ],
    estruturaH2: [
      "Carta-aviso e ordem de serviço: o que definem",
      "Âmbito e extensão da inspeção",
      "O prazo do procedimento e as suas prorrogações",
      "Deveres de colaboração — e os seus limites",
      "Projeto de relatório e audição prévia",
      "Relatório final e liquidação",
      "Regularizar durante a inspeção",
    ],
    oQuePreparar: [
      "Ordem de serviço com âmbito e período.",
      "Contabilidade e documentos do período inspecionado.",
      "Prazo de audição prévia e data-limite.",
      "Apoio de contabilista certificado ou advogado.",
    ],
    dados: [
    ],
    avisos: [
      "Matéria que exige revisão especializada — marcar o guia como 'Em revisão' e incluir o aviso de confirmação com contabilista.",
      "O Regime Complementar do Procedimento de Inspeção Tributária e Aduaneira (RCPITA, DL 413/98) é a fonte principal e não foi possível verificar página .aspx dedicada — localizar e verificar antes de publicar.",
    ],
  },
  "irs-fora-do-prazo": {
    aplicaSe: [
      "Não entregaste o IRS dentro do prazo.",
      "Recebeste notificação por falta de entrega.",
    ],
    naoAplicaSe: [
      "Estás dentro do prazo — entrega já e evita tudo isto.",
    ],
    estruturaH2: [
      "O que acontece quando não entregas",
      "A liquidação oficiosa da AT",
      "A coima e a redução por entrega voluntária",
      "Juros compensatórios",
      "O reembolso fica retido",
      "Passos concretos para regularizar",
    ],
    oQuePreparar: [
      "Todos os documentos de rendimento do ano.",
      "Confirmação de que não houve notificação prévia.",
      "Entrega da declaração em falta.",
      "Pedido de redução da coima.",
    ],
    dados: [
      { label: "Coima base", valor: "150 € a 3 750 €", nota: "art. 116.º RGIT", porConfirmar: false },
      { label: "Com regularização voluntária", valor: "12,5% do mínimo, com piso de 25 €", nota: "art. 30.º RGIT", porConfirmar: false },
    ],
    avisos: [
    ],
  },
  "insolvencia-pessoal": {
    aplicaSe: [
      "Tens dívidas que não consegues pagar.",
      "Estás a ponderar apresentar-te à insolvência.",
    ],
    naoAplicaSe: [
      "A tua dificuldade é pontual — há vias mais baratas, como o plano prestacional.",
    ],
    estruturaH2: [
      "O que é a exoneração do passivo restante",
      "O período de cessão",
      "Rendimento indisponível e o que fica para ti",
      "Dívidas fiscais e à Segurança Social",
      "Efeito nas execuções em curso",
      "Alternativas antes de chegar aqui",
    ],
    oQuePreparar: [
      "Relação completa de credores e dívidas.",
      "Rendimentos e despesas essenciais.",
      "Património.",
      "Apoio jurídico — matéria judicial.",
    ],
    dados: [
      { label: "Período de cessão", valor: "3 anos", nota: "", porConfirmar: false },
      { label: "Dívidas fiscais e à Segurança Social", valor: "em regra não abrangidas pela exoneração", nota: "", porConfirmar: false },
    ],
    avisos: [
      "Matéria judicial: enquadrar claramente como informação e remeter para advogado.",
      "Há jurisprudência divergente quanto à exoneração de créditos tributários — apresentar como questão em aberto, não como regra fechada.",
    ],
  },
  "sifide": {
    aplicaSe: [
      "A tua empresa desenvolve produto ou tecnologia.",
      "Tens equipa técnica afeta a desenvolvimento.",
    ],
    naoAplicaSe: [
      "A tua atividade não envolve investigação nem desenvolvimento experimental.",
    ],
    estruturaH2: [
      "O que conta como I&D",
      "Taxa base e taxa incremental",
      "Despesas elegíveis",
      "A candidatura e o prazo",
      "Reporte para anos seguintes",
      "Cumulação com outros benefícios",
      "A prova que a ANI exige",
    ],
    oQuePreparar: [
      "Projetos de I&D documentados.",
      "Afetação de pessoal e horas.",
      "Faturas de despesas elegíveis.",
      "Candidatura no prazo.",
    ],
    dados: [
    ],
    avisos: [
      "O SIFIDE consta do Código Fiscal do Investimento (CFI), não do EBF — verificar e citar o CFI antes de publicar. As taxas mudam com frequência.",
    ],
  },
  "rfai": {
    aplicaSe: [
      "Vais investir em equipamento ou instalações produtivas.",
      "A tua atividade está nos setores elegíveis.",
    ],
    naoAplicaSe: [
      "O investimento é em ativos excluídos (viaturas ligeiras de passageiros, mobiliário de conforto).",
    ],
    estruturaH2: [
      "Setores e regiões elegíveis",
      "Aplicações relevantes e ativos excluídos",
      "Taxas de dedução por região",
      "A obrigação de criação de emprego",
      "Período mínimo de manutenção",
      "Reporte e limites",
      "Documentação de suporte",
    ],
    oQuePreparar: [
      "Plano de investimento com ativos discriminados.",
      "Mapa de criação de postos de trabalho.",
      "Enquadramento regional.",
      "Dossiê fiscal do benefício.",
    ],
    dados: [
    ],
    avisos: [
      "O RFAI consta do Código Fiscal do Investimento (CFI) — verificar e citar o CFI, não o EBF. As taxas variam por região e mudaram recentemente.",
    ],
  },
  "ice-capitalizacao": {
    aplicaSe: [
      "Vais aumentar capital ou reter lucros.",
      "Queres reduzir a dependência de financiamento bancário.",
    ],
    naoAplicaSe: [
      "Distribuis sistematicamente todo o resultado.",
    ],
    estruturaH2: [
      "O que são aumentos líquidos de capital próprio",
      "O que conta e o que se abate",
      "A taxa de dedução e a sua majoração",
      "O período de aplicação",
      "O que acontece se distribuíres depois",
      "Cumulação com outros benefícios",
    ],
    oQuePreparar: [
      "Evolução do capital próprio nos últimos exercícios.",
      "Deliberações de aumento de capital ou de retenção de lucros.",
      "Cálculo do aumento líquido elegível.",
    ],
    dados: [
    ],
    avisos: [
      "A taxa do ICE e a majoração para PME foram alteradas em orçamentos recentes — ler o art. 43.º-D EBF em vigor.",
    ],
  },
  "stock-options": {
    aplicaSe: [
      "A tua empresa quer atribuir opções a trabalhadores.",
      "Recebeste opções e queres saber quando pagas imposto.",
    ],
    naoAplicaSe: [
      "O plano não cumpre os requisitos do regime — aí aplica-se a regra geral da Categoria A.",
    ],
    estruturaH2: [
      "Quem é elegível: entidade e beneficiário",
      "Os três momentos de tributação",
      "A taxa aplicável e o desconto face à regra geral",
      "O período mínimo de detenção",
      "Sair de Portugal: o facto tributário esquecido",
      "Obrigações declarativas da empresa",
      "O que fazer se o plano não for elegível",
    ],
    oQuePreparar: [
      "Regulamento do plano de opções.",
      "Certificação da empresa como startup, se aplicável.",
      "Datas de atribuição, vesting e exercício.",
      "Documentação de suporte para a AT.",
    ],
    dados: [
      { label: "Momentos de tributação", valor: "alienação, transmissão gratuita ou perda da residência fiscal", nota: "Lei n.º 21/2023", porConfirmar: false },
      { label: "Regime", valor: "tributação diferida com taxa reduzida", nota: "confirmar percentagem na redação em vigor", porConfirmar: true },
    ],
    avisos: [
      "O regime foi alargado a fundadores e gestores por alteração posterior — confirmar o âmbito subjetivo em vigor.",
      "A taxa efetiva depende do regime concreto: verificar a Lei 21/2023 consolidada e as alterações ao CIRS antes de publicar percentagens.",
    ],
  },
  "apoios-contratacao-iefp": {
    aplicaSe: [
      "Vais contratar e queres saber que apoio se aplica.",
      "Contrataste recentemente e queres verificar elegibilidade.",
    ],
    naoAplicaSe: [
      "A contratação não cumpre os requisitos de vínculo ou de perfil do candidato.",
    ],
    estruturaH2: [
      "As medidas em vigor e a quem se dirigem",
      "Valores indexados ao IAS",
      "Requisitos do vínculo e do trabalhador",
      "Obrigação de manutenção do posto",
      "Janelas de candidatura",
      "Cumulação com outros apoios",
      "Devolução em caso de incumprimento",
    ],
    oQuePreparar: [
      "Perfil do candidato e inscrição no IEFP.",
      "Tipo de contrato a celebrar.",
      "Situação contributiva e tributária regularizada.",
      "Candidatura submetida no prazo.",
    ],
    dados: [
      { label: "IAS 2026", valor: "537,13 €", nota: "indexante de referência dos apoios", porConfirmar: false },
    ],
    avisos: [
      "ALTA MANUTENÇÃO: as medidas mudam de nome e de valor quase todos os anos. Ligar sempre à página oficial do IEFP e não fixar valores no corpo do texto.",
    ],
  },
  "suprimentos-prestacoes-suplementares": {
    aplicaSe: [
      "Vais injetar dinheiro na tua empresa.",
      "Queres reaver dinheiro que já injetaste.",
    ],
    naoAplicaSe: [
      "A entrada é aumento de capital social formal — o regime é outro.",
    ],
    estruturaH2: [
      "A diferença de natureza",
      "Onde cada um é registado",
      "Imposto do selo sobre o financiamento",
      "Juros: dedutibilidade e tributação no sócio",
      "Reembolso: liberdade vs. condições",
      "O efeito no ICE e nos rácios",
      "Qual escolher em cada situação",
    ],
    oQuePreparar: [
      "Deliberação social adequada à figura escolhida.",
      "Contrato de suprimento, se aplicável.",
      "Cálculo do imposto do selo devido.",
      "Registo contabilístico correto.",
    ],
    dados: [
    ],
    avisos: [
      "Confirmar a verba aplicável da Tabela Geral do Imposto do Selo para operações financeiras antes de publicar taxas.",
    ],
  },
  "obrigacoes-societarias": {
    aplicaSe: [
      "Tens uma sociedade, mesmo que sem atividade.",
      "Precisas de certidão para banco, apoio ou concurso.",
    ],
    naoAplicaSe: [
      "És empresário em nome individual sem sociedade.",
    ],
    estruturaH2: [
      "RCBE: o que é e quando se atualiza",
      "Certidão permanente e a sua validade",
      "Assembleia geral anual e ata",
      "Prestação e depósito de contas",
      "O que trava quando falta algum destes",
      "Sociedades sem atividade",
    ],
    oQuePreparar: [
      "Código de acesso à certidão permanente.",
      "Declaração de RCBE atualizada.",
      "Ata de aprovação de contas.",
      "Comprovativo de depósito de contas.",
    ],
    dados: [
    ],
    avisos: [
      "A obrigação de confirmação anual do RCBE já foi alterada — verificar o regime em vigor (Lei 89/2017 e alterações).",
    ],
  },
  "viatura-empresa": {
    aplicaSe: [
      "Vais adquirir viatura para a atividade.",
      "Estás a decidir entre compra, renting e uso da viatura pessoal.",
    ],
    naoAplicaSe: [
      "A atividade não exige deslocação.",
    ],
    estruturaH2: [
      "Comprar: amortizações e limites",
      "Tributação autónoma e as taxas por escalão",
      "O agravamento quando há prejuízo fiscal",
      "Renting e locação financeira",
      "IVA: quando é dedutível",
      "Viatura pessoal e os 0,40 €/km",
      "Viaturas elétricas e híbridas",
      "A comparação em números",
    ],
    oQuePreparar: [
      "Quilometragem anual estimada em serviço.",
      "Preço de aquisição e tipo de motorização.",
      "Resultado fiscal previsto (afeta o agravamento).",
      "Comparação dos três cenários.",
    ],
    dados: [
      { label: "Quilómetros em viatura própria", valor: "0,40 €/km", nota: "limite isento de tributação", porConfirmar: false },
      { label: "Ajudas de custo e km não faturados a clientes", valor: "tributação autónoma de 5%", nota: "", porConfirmar: false },
    ],
    avisos: [
      "As taxas de tributação autónoma por escalão de custo de aquisição e por motorização mudaram recentemente — ler o art. 88.º CIRC em vigor.",
      "A exclusão do direito à dedução de IVA em viaturas de turismo consta do art. 21.º CIVA — verificar a página oficial antes de citar.",
    ],
  },
  "amortizacoes-equipamento": {
    aplicaSe: [
      "Compraste equipamento, software ou fizeste obras.",
      "Estás a preparar o encerramento de contas.",
    ],
    naoAplicaSe: [
      "Todos os teus gastos são correntes e consumidos no exercício.",
    ],
    estruturaH2: [
      "Gasto corrente vs. ativo depreciável",
      "Taxas máximas por tipo de ativo",
      "Método das quotas constantes",
      "Bens de reduzido valor",
      "Obras em edifícios arrendados",
      "Ativos intangíveis e software",
      "O que a AT não aceita",
    ],
    oQuePreparar: [
      "Faturas de aquisição com data e valor.",
      "Classificação do ativo.",
      "Mapa de depreciações do exercício.",
    ],
    dados: [
    ],
    avisos: [
      "As taxas constam do Decreto Regulamentar n.º 25/2009 — verificar e citar o diploma antes de publicar tabelas.",
    ],
  },
  "contrato-a-termo": {
    aplicaSe: [
      "Assinaste ou vais assinar contrato a prazo.",
      "O teu contrato já foi renovado várias vezes.",
    ],
    naoAplicaSe: [
      "Tens contrato sem termo.",
    ],
    estruturaH2: [
      "Termo certo e termo incerto",
      "Os motivos admissíveis",
      "A exigência de forma escrita e de motivo concreto",
      "Durações e renovações máximas",
      "O que acontece quando o termo é inválido",
      "Compensação no fim do contrato",
      "Preferência na admissão",
    ],
    oQuePreparar: [
      "Cópia do contrato com o motivo invocado.",
      "Datas de início, renovações e termo.",
      "Registo das funções efetivamente exercidas.",
    ],
    dados: [
    ],
    avisos: [
      "Citar artigos concretos do Código do Trabalho (arts. 139.º e seguintes) depois de confirmar a numeração na versão consolidada do DRE.",
    ],
  },
  "periodo-experimental": {
    aplicaSe: [
      "Começaste um trabalho há pouco tempo.",
      "Vais contratar e queres saber as regras.",
    ],
    naoAplicaSe: [
      "Já ultrapassaste o período experimental.",
    ],
    estruturaH2: [
      "O que é o período experimental",
      "Durações por tipo de contrato e categoria",
      "Denúncia sem justa causa",
      "Aviso prévio: 7 e 30 dias",
      "Exclusão ou redução por acordo escrito",
      "Direitos que se mantêm",
    ],
    oQuePreparar: [
      "Contrato escrito e cláusula de período experimental.",
      "Data de início efetivo de funções.",
      "Categoria e nível de complexidade das funções.",
    ],
    dados: [
      { label: "Contratos com duração inferior a 6 meses", valor: "15 dias de período experimental", nota: "", porConfirmar: false },
      { label: "Aviso prévio se já durou mais de 60 dias", valor: "7 dias", nota: "", porConfirmar: false },
      { label: "Aviso prévio se já durou mais de 120 dias", valor: "30 dias", nota: "", porConfirmar: false },
    ],
    avisos: [
      "Confirmar as durações por categoria nos arts. 111.º a 114.º do Código do Trabalho na versão consolidada.",
    ],
  },
  "teletrabalho": {
    aplicaSe: [
      "Trabalhas ou vais trabalhar a partir de casa.",
      "Estás a negociar a compensação de despesas.",
    ],
    naoAplicaSe: [
      "És trabalhador independente — o regime é contratual, não laboral.",
    ],
    estruturaH2: [
      "O acordo escrito e o que tem de conter",
      "Despesas acrescidas: o que o empregador suporta",
      "Igualdade de direitos e de retribuição",
      "Direito à desconexão",
      "Reversibilidade nos primeiros 30 dias",
      "Trabalhadores com filhos: o direito próprio",
      "Controlo e privacidade",
    ],
    oQuePreparar: [
      "Acordo de teletrabalho escrito.",
      "Comprovativos de despesas acrescidas (energia, comunicações).",
      "Equipamento fornecido e por quem.",
    ],
    dados: [
      { label: "Reversibilidade", valor: "30 dias para qualquer das partes denunciar o acordo", nota: "", porConfirmar: false },
    ],
    avisos: [
      "O regime do teletrabalho foi revisto pela Lei 83/2021 e pela Agenda do Trabalho Digno — confirmar os arts. 165.º e seguintes do CT na versão consolidada.",
    ],
  },
  "ajudas-de-custo-km": {
    aplicaSe: [
      "Recebes ajudas de custo ou reembolso de quilómetros.",
      "Recebes subsídio de refeição em dinheiro ou em cartão.",
      "És empregador e queres saber o custo real.",
    ],
    naoAplicaSe: [
      "Não recebes nem pagas este tipo de abono.",
    ],
    estruturaH2: [
      "A lógica: compensação de despesa, não remuneração",
      "Subsídio de refeição: dinheiro vs. cartão",
      "Quilómetros em viatura própria",
      "Ajudas de custo em território nacional e no estrangeiro",
      "O que acontece ao excesso",
      "Tributação autónoma do lado da empresa",
      "Prova documental exigida",
    ],
    oQuePreparar: [
      "Boletins de itinerário com data, destino e motivo.",
      "Quilometragem e matrícula da viatura.",
      "Modalidade de pagamento do subsídio de refeição.",
    ],
    dados: [
      { label: "Subsídio de refeição em dinheiro", valor: "6,15 €/dia", nota: "limite isento", porConfirmar: false },
      { label: "Subsídio de refeição em cartão ou vale", valor: "10,46 €/dia", nota: "limite isento", porConfirmar: false },
      { label: "Quilómetros em viatura própria", valor: "0,40 €/km", nota: "limite isento", porConfirmar: false },
      { label: "Ajudas de custo e km não faturados a clientes", valor: "tributação autónoma de 5%", nota: "do lado da empresa", porConfirmar: false },
    ],
    avisos: [
      "Os limites são fixados por portaria e atualizados — manter numa tabela por ano e não no corpo do texto.",
      "Confirmar o valor das ajudas de custo em território nacional e no estrangeiro na portaria em vigor.",
    ],
  },
  "formacao-40-horas": {
    aplicaSe: [
      "És trabalhador por conta de outrem.",
      "És empregador e queres saber a obrigação.",
    ],
    naoAplicaSe: [
      "És trabalhador independente.",
    ],
    estruturaH2: [
      "O direito às horas anuais",
      "Formação certificada e o que conta",
      "O crédito de horas quando a formação não acontece",
      "Utilização do crédito pelo trabalhador",
      "Pagamento na cessação do contrato",
      "Trabalhador-estudante e imputação",
      "Contraordenação para a empresa",
    ],
    oQuePreparar: [
      "Registo de formação recebida por ano.",
      "Certificados de formação.",
      "Contagem do crédito de horas acumulado.",
    ],
    dados: [
      { label: "Mínimo anual", valor: "40 horas de formação contínua", nota: "Código do Trabalho", porConfirmar: false },
      { label: "Conversão em crédito de horas", valor: "ao fim de 2 anos sem formação", nota: "", porConfirmar: false },
    ],
    avisos: [
      "Confirmar o número de horas e o prazo de conversão no art. 131.º do Código do Trabalho na versão consolidada — o número já foi 35 e é hoje 40.",
    ],
  },
  "banco-de-horas": {
    aplicaSe: [
      "A empresa quer implementar banco de horas ou adaptabilidade.",
      "Fazes horas a mais que não são pagas como suplementares.",
    ],
    naoAplicaSe: [
      "O teu horário é fixo e sem regimes de flexibilidade.",
    ],
    estruturaH2: [
      "Adaptabilidade e banco de horas: a diferença",
      "Como se instituem: IRCT, acordo individual ou grupo",
      "Limites de acréscimo diário e semanal",
      "Como se compensa o tempo prestado",
      "O que continua a ser trabalho suplementar",
      "Cessação do regime e acertos",
    ],
    oQuePreparar: [
      "Instrumento que institui o regime.",
      "Registo de tempos de trabalho.",
      "Saldo do banco de horas.",
    ],
    dados: [
    ],
    avisos: [
      "Confirmar limites nos arts. 204.º a 208.º-B do Código do Trabalho — houve alterações recentes, incluindo à admissibilidade do banco de horas individual.",
    ],
  },
  "trabalhador-estudante": {
    aplicaSe: [
      "Trabalhas e estudas ao mesmo tempo.",
      "Vais fazer exames e precisas de faltar.",
    ],
    naoAplicaSe: [
      "Não estás inscrito em estabelecimento de ensino.",
    ],
    estruturaH2: [
      "Requisitos para ter o estatuto",
      "Dispensa de horário de trabalho",
      "Faltas para provas de avaliação",
      "Férias e licenças sem retribuição",
      "Imputação às horas de formação",
      "Perda do estatuto por falta de aproveitamento",
    ],
    oQuePreparar: [
      "Comprovativo de matrícula e frequência.",
      "Calendário de avaliações.",
      "Comunicação ao empregador nos prazos legais.",
      "Comprovativo de aproveitamento do ano anterior.",
    ],
    dados: [
    ],
    avisos: [
      "Confirmar arts. 89.º a 96.º do Código do Trabalho na versão consolidada.",
    ],
  },
  "despedimento": {
    aplicaSe: [
      "Foste despedido ou recebeste comunicação de intenção.",
      "És empregador e precisas de conhecer o procedimento.",
    ],
    naoAplicaSe: [
      "O contrato cessou por acordo ou por caducidade — vê o guia do fim do contrato.",
    ],
    estruturaH2: [
      "As modalidades e o que as distingue",
      "Despedimento por facto imputável ao trabalhador",
      "Extinção do posto de trabalho",
      "Inadaptação",
      "Despedimento coletivo",
      "Procedimento e nulidades frequentes",
      "Prazos de impugnação",
      "Compensações devidas",
    ],
    oQuePreparar: [
      "Comunicação escrita recebida e respetiva data.",
      "Nota de culpa e resposta, se houver processo disciplinar.",
      "Contrato e recibos dos últimos meses.",
      "Apoio jurídico — os prazos são curtos.",
    ],
    dados: [
    ],
    avisos: [
      "Matéria judicial com prazos preclusivos — enquadrar como informação e remeter para advogado.",
      "Confirmar prazos de impugnação e procedimento nos arts. 338.º e seguintes do Código do Trabalho.",
    ],
  },
  "assedio-trabalho": {
    aplicaSe: [
      "Estás a ser alvo de comportamentos hostis e repetidos no trabalho.",
      "És responsável de RH e precisas de saber os deveres da empresa.",
    ],
    naoAplicaSe: [
      "O conflito é pontual e não configura assédio — o enquadramento é outro.",
    ],
    estruturaH2: [
      "O que a lei considera assédio",
      "Deveres de prevenção da empresa",
      "Reunir prova: o que serve e o que não serve",
      "Queixa interna e canal de denúncia",
      "Queixa à ACT",
      "Rescisão com justa causa e indemnização",
      "Proteção contra retaliação",
    ],
    oQuePreparar: [
      "Registo cronológico dos episódios, com datas.",
      "Comunicações escritas, mensagens e e-mails.",
      "Testemunhas.",
      "Queixa formal apresentada e resposta obtida.",
    ],
    dados: [
    ],
    avisos: [
      "Tema sensível — incluir nota de apoio e evitar prometer desfechos. Confirmar arts. 29.º e 331.º do Código do Trabalho.",
    ],
  },
  "fct-fgct": {
    aplicaSe: [
      "És empregador com contratos abrangidos.",
      "O teu contrato cessou e queres saber se há valor a receber.",
    ],
    naoAplicaSe: [
      "O teu contrato é anterior ao regime e não foi abrangido.",
    ],
    estruturaH2: [
      "O que são o FCT e o FGCT",
      "Quem está abrangido",
      "Quanto a empresa deposita",
      "Como se mobiliza na cessação",
      "O que o trabalhador recebe diretamente",
      "Encerramento da empresa",
    ],
    oQuePreparar: [
      "Adesão da empresa aos fundos.",
      "Data de início do contrato.",
      "Comprovativos de entregas mensais.",
      "Documentos de cessação do contrato.",
    ],
    dados: [
    ],
    avisos: [
      "O regime consta da Lei 70/2013 — verificar e citar antes de publicar.",
    ],
  },
  "acidente-de-trabalho": {
    aplicaSe: [
      "Sofreste um acidente ao serviço ou no percurso.",
      "És empregador e precisas de saber as obrigações.",
    ],
    naoAplicaSe: [
      "O acidente não tem qualquer relação com o trabalho.",
    ],
    estruturaH2: [
      "O que é acidente de trabalho (incluindo in itinere)",
      "O seguro obrigatório",
      "Participação do acidente e prazos",
      "Prestações: tratamento, indemnização e pensões",
      "Graus de incapacidade",
      "O processo no tribunal do trabalho",
      "Trabalhadores independentes",
    ],
    oQuePreparar: [
      "Participação do acidente à seguradora.",
      "Relatórios clínicos e boletim de alta.",
      "Recibos de vencimento anteriores ao acidente.",
      "Apólice de seguro em vigor.",
    ],
    dados: [
    ],
    avisos: [
    ],
  },
  "seguro-acidentes-independentes": {
    aplicaSe: [
      "Trabalhas por conta própria.",
      "Exerces atividade com risco físico.",
    ],
    naoAplicaSe: [
      "És exclusivamente trabalhador por conta de outrem — o seguro é do empregador.",
    ],
    estruturaH2: [
      "A obrigação legal",
      "O que o seguro cobre",
      "O que a Segurança Social já cobre e o que não cobre",
      "Base de cálculo do prémio",
      "Consequências de não ter seguro",
      "Distinção face à responsabilidade civil profissional",
    ],
    oQuePreparar: [
      "Rendimento anual a segurar.",
      "Descrição real da atividade e riscos.",
      "Apólice em vigor.",
      "Comparação de propostas.",
    ],
    dados: [
      { label: "Obrigação", valor: "transferência da responsabilidade por acidentes de trabalho", nota: "Lei n.º 98/2009", porConfirmar: false },
    ],
    avisos: [
    ],
  },
  "rc-profissional": {
    aplicaSe: [
      "Exerces profissão regulada por ordem ou entidade reguladora.",
      "Prestas serviços com risco de dano a terceiros.",
    ],
    naoAplicaSe: [
      "A tua atividade não é regulada nem envolve risco relevante para terceiros.",
    ],
    estruturaH2: [
      "Quando o seguro é obrigatório",
      "Profissões reguladas e os respetivos regimes",
      "O que a apólice deve cobrir",
      "Limites de capital e franquias",
      "Reclamações e período de cobertura",
      "Distinção face ao seguro de acidentes de trabalho",
    ],
    oQuePreparar: [
      "Regulamento da ordem ou entidade reguladora aplicável.",
      "Capital mínimo exigido.",
      "Apólice em vigor e respetivo âmbito temporal.",
    ],
    dados: [
    ],
    avisos: [
      "SEM BASE LEGAL NO CATÁLOGO: a obrigatoriedade é definida profissão a profissão nos estatutos das respetivas ordens e em legislação setorial. Não existe norma única. Verificar caso a caso e acrescentar as fontes ao catálogo antes de escrever.",
      "Cada profissão tem regime próprio — não publicar lista fechada sem confirmar profissão a profissão junto da respetiva ordem.",
    ],
  },
  "subsidio-doenca-independentes": {
    aplicaSe: [
      "Trabalhas por conta própria e adoeceste.",
      "Queres saber com que rede podes contar.",
    ],
    naoAplicaSe: [
      "És trabalhador por conta de outrem — as regras e os prazos são outros.",
    ],
    estruturaH2: [
      "Prazo de garantia: quantos meses de descontos",
      "Período de espera antes do primeiro pagamento",
      "Como se calcula a remuneração de referência",
      "Percentagens por duração da baixa",
      "Limite máximo de dias",
      "Como se requer",
      "Porque baixar a base de incidência sai caro aqui",
    ],
    oQuePreparar: [
      "Certificado de incapacidade temporária.",
      "Situação contributiva regularizada.",
      "Base de incidência dos últimos meses.",
      "Requerimento na Segurança Social Direta.",
    ],
    dados: [
      { label: "Prazo de garantia", valor: "6 meses de registo de remunerações", nota: "confirmar na regulamentação em vigor", porConfirmar: true },
      { label: "Período de espera", valor: "10 dias para trabalhadores independentes", nota: "confirmar na regulamentação em vigor", porConfirmar: true },
    ],
    avisos: [
      "O período de espera difere entre independentes e trabalhadores por conta de outrem — confirmar no Código Contributivo e na regulamentação antes de publicar números.",
    ],
  },
  "parentalidade-independentes": {
    aplicaSe: [
      "Trabalhas por conta própria e vais ser mãe ou pai.",
      "Estás a planear e queres perceber o impacto.",
    ],
    naoAplicaSe: [
      "És trabalhador por conta de outrem — vê o guia da licença parental.",
    ],
    estruturaH2: [
      "Prazo de garantia",
      "As modalidades de licença e as percentagens",
      "Remuneração de referência: de onde sai",
      "Partilha entre os progenitores",
      "Como se requer e prazos",
      "O efeito de ter baixado a base de incidência",
      "Situação contributiva regularizada como condição",
    ],
    oQuePreparar: [
      "Comprovativos clínicos.",
      "Decisão sobre a modalidade e a partilha.",
      "Base de incidência dos meses de referência.",
      "Requerimento na Segurança Social Direta.",
    ],
    dados: [
      { label: "Condição", valor: "situação contributiva regularizada", nota: "", porConfirmar: false },
    ],
    avisos: [
      "Confirmar prazo de garantia e período de referência na regulamentação do Código Contributivo.",
    ],
  },
  "desemprego-independentes": {
    aplicaSe: [
      "Cessaste ou vais cessar atividade sem ser por tua vontade.",
      "Dependias economicamente de um cliente que terminou o contrato.",
    ],
    naoAplicaSe: [
      "Cessaste a atividade por opção própria.",
    ],
    estruturaH2: [
      "Quem está abrangido",
      "Prazo de garantia",
      "O que conta como cessação involuntária",
      "Economicamente dependentes: o regime próprio",
      "Cálculo e duração",
      "Como se requer",
      "Acumulação com nova atividade",
    ],
    oQuePreparar: [
      "Declaração de cessação de atividade.",
      "Prova documental da involuntariedade.",
      "Histórico de faturação por cliente.",
      "Situação contributiva regularizada.",
    ],
    dados: [
    ],
    avisos: [
      "Distinguir independentes em geral de economicamente dependentes — os regimes de proteção não são iguais.",
    ],
  },
  "isencao-contribuicoes-ss": {
    aplicaSe: [
      "Abriste atividade recentemente.",
      "Acumulas recibos verdes com um emprego.",
      "És pensionista com atividade independente.",
    ],
    naoAplicaSe: [
      "Estás em atividade há vários anos, sem acumulação nem pensão.",
    ],
    estruturaH2: [
      "Isenção no primeiro ano de atividade",
      "Acumulação com trabalho dependente",
      "Pensionistas",
      "O limiar de rendimento anual",
      "O que a isenção custa em proteção social",
      "Quando a isenção cessa",
    ],
    oQuePreparar: [
      "Data de início de atividade.",
      "Rendimento anual estimado.",
      "Comprovativo do vínculo de trabalho dependente, se aplicável.",
      "Consulta do enquadramento na Segurança Social Direta.",
    ],
    dados: [
      { label: "Isenção no início de atividade", valor: "12 meses", nota: "automática", porConfirmar: false },
      { label: "Taxa contributiva quando há obrigação", valor: "21,4%", nota: "", porConfirmar: false },
    ],
    avisos: [
      "O limiar de rendimento anual e as condições de acumulação são indexados ao IAS — confirmar no Código Contributivo em vigor.",
    ],
  },
  "entidade-contratante": {
    aplicaSe: [
      "Tens um cliente que representa a maior parte da tua faturação.",
      "És empresa e contratas prestadores de serviços de forma continuada.",
    ],
    naoAplicaSe: [
      "Tens a faturação distribuída por vários clientes.",
    ],
    estruturaH2: [
      "O que é dependência económica",
      "As duas percentagens: 7% e 10%",
      "O limiar de rendimento que ativa a obrigação",
      "Como a Segurança Social apura",
      "O que a empresa recebe e quando",
      "A relação com o risco de falsos recibos verdes",
    ],
    oQuePreparar: [
      "Distribuição da faturação anual por cliente.",
      "Notificações recebidas da Segurança Social.",
      "Contratos de prestação de serviços.",
    ],
    dados: [
      { label: "Dependência económica superior a 50% e até 80%", valor: "7%", nota: "", porConfirmar: false },
      { label: "Dependência económica superior a 80%", valor: "10%", nota: "", porConfirmar: false },
      { label: "Limiar de ativação", valor: "rendimento anual superior a 6 × IAS = 3 222,78 € (2026)", nota: "", porConfirmar: false },
    ],
    avisos: [
    ],
  },
  "e-fatura": {
    aplicaSe: [
      "Queres maximizar as deduções à coleta.",
      "Tens faturas pendentes de classificação.",
    ],
    naoAplicaSe: [
      "Não pedes fatura com NIF.",
    ],
    estruturaH2: [
      "O que o e-Fatura faz e o que não faz",
      "Categorias de despesa e o que muda entre elas",
      "Faturas pendentes: porque aparecem",
      "O calendário anual de validação",
      "Depois do prazo: o que ainda se pode declarar manualmente",
      "Despesas de atividade vs. despesas pessoais",
      "Faturas em falta: como reclamar",
    ],
    oQuePreparar: [
      "Acesso ao Portal das Finanças com senha ativa.",
      "Lista de faturas pendentes por classificar.",
      "Separação entre despesas pessoais e de atividade.",
      "Faturas em falta a reclamar ao comerciante.",
    ],
    dados: [
      { label: "Validação de faturas do ano anterior", valor: "até início de março", nota: "confirmar data exata do ano em causa", porConfirmar: true },
      { label: "Consulta e reclamação das deduções apuradas", valor: "segunda quinzena de março", nota: "confirmar data exata do ano em causa", porConfirmar: true },
    ],
    avisos: [
      "As datas exatas mudam todos os anos e podem ser prorrogadas por despacho — gerar a partir de tabela anual, nunca fixar no texto.",
    ],
  },
  "irs-automatico": {
    aplicaSe: [
      "Recebeste uma proposta de IRS automático.",
      "Tens rendimentos simples mas deduções fora do e-Fatura.",
    ],
    naoAplicaSe: [
      "Tens rendimentos que excluem o regime automático — a declaração é obrigatoriamente manual.",
    ],
    estruturaH2: [
      "Quem é abrangido",
      "O que a proposta já inclui",
      "O que a proposta não sabe",
      "Tributação conjunta ou separada na proposta",
      "Casos em que recusar compensa",
      "Como recusar e declarar manualmente",
      "O que acontece se não fizeres nada",
    ],
    oQuePreparar: [
      "Proposta de liquidação apresentada pela AT.",
      "Deduções que sabes existirem e não constam.",
      "Simulação nas duas hipóteses.",
      "Decisão sobre tributação conjunta.",
    ],
    dados: [
      { label: "Prazo de entrega da Modelo 3", valor: "1 de abril a 30 de junho", nota: "", porConfirmar: false },
    ],
    avisos: [
      "O universo abrangido pelo IRS automático tem sido alargado — confirmar as condições no art. 58.º-A CIRS em vigor (a página .aspx desse artigo não foi verificada neste levantamento).",
    ],
  },
  "reclamar-deducoes": {
    aplicaSe: [
      "As deduções apuradas não batem certo com as tuas faturas.",
      "Uma despesa foi classificada na categoria errada.",
    ],
    naoAplicaSe: [
      "Concordas com os valores apurados.",
    ],
    estruturaH2: [
      "Onde se consultam as deduções apuradas",
      "O prazo de reclamação",
      "Como se reclama",
      "O que fazer se o prazo passou",
      "Despesas que se declaram sempre manualmente",
      "Efeito na liquidação",
    ],
    oQuePreparar: [
      "Lista das deduções apuradas pela AT.",
      "Faturas que sustentam a divergência.",
      "Reclamação submetida dentro do prazo.",
    ],
    dados: [
    ],
    avisos: [
    ],
  },
  "portal-das-financas": {
    aplicaSe: [
      "Mudaste de morada.",
      "Perdeste a senha de acesso.",
      "Aderiste às notificações eletrónicas e não sabes as implicações.",
    ],
    naoAplicaSe: [
      "Não tens NIF português.",
    ],
    estruturaH2: [
      "Recuperar ou pedir nova senha",
      "Alterar o domicílio fiscal e o prazo legal",
      "Notificações eletrónicas: a adesão e os seus efeitos",
      "A contagem de prazos nas notificações eletrónicas",
      "Autorizar um contabilista",
      "Consultar a situação fiscal",
    ],
    oQuePreparar: [
      "NIF e dados de identificação.",
      "Comprovativo da nova morada.",
      "Contacto de e-mail e telemóvel atualizados.",
    ],
    dados: [
    ],
    avisos: [
      "Explicar com precisão a regra de presunção de notificação eletrónica — é o ponto de maior impacto prático.",
    ],
  },
  "situacao-regularizada": {
    aplicaSe: [
      "Vais candidatar-te a um apoio ou concurso.",
      "Um cliente pediu-te a certidão.",
    ],
    naoAplicaSe: [
      "Não precisas de comprovar a situação perante terceiros.",
    ],
    estruturaH2: [
      "As duas certidões: fisco e Segurança Social",
      "Como se obtêm",
      "O que impede a emissão",
      "Dívidas em plano de prestações",
      "Dívidas com execução suspensa",
      "Autorizar consulta por terceiros",
      "Prazos de validade",
    ],
    oQuePreparar: [
      "Acesso ao Portal das Finanças e à Segurança Social Direta.",
      "Verificação de dívidas pendentes.",
      "Plano de prestações em cumprimento, se aplicável.",
    ],
    dados: [
    ],
    avisos: [
    ],
  },
};
