// ═══════════════════════════════════════════════════════════════════════
//  CATÁLOGO DE HIPÓTESES — o gargalo real do motor de descoberta
//  ---------------------------------------------------------------------
//  A auditoria mediu o que a ferramenta conseguia responder e o número é
//  desconfortável: 25 920 combinações de perfil produziam 29 ordenações
//  distintas e 7 conjuntos de top-3. Não era a fórmula — era o catálogo.
//  Cinco hipóteses que declaravam UM só valor em `structures` e UM só em
//  `regions` não podem separar seis perguntas: duas delas não alteravam
//  absolutamente nada, em nenhum perfil, e uma das cinco competências
//  oferecidas de então não existia em template nenhum.
//
//  ── AS REGRAS DE ADMISSÃO, QUE SÃO TESTADAS ────────────────────────
//   1. Nenhuma hipótese pode ter assinatura de fit igual a outra. Duas
//      hipóteses indistinguíveis são a mesma com dois nomes — e a segunda
//      perde sempre o desempate, para sempre, para toda a gente.
//   2. Cada uma discorda da mais próxima em pelo menos DOIS eixos.
//   3. `regions` diz onde o MODELO faz sentido — nunca onde temos dados.
//      Restringir uma hipótese a uma zona só é legítimo quando o negócio
//      depende mesmo de lá estar (uma quinta de vinho, uma ilha).
//   4. `structures` restringe-se a `empresa` só quando a atividade o exige
//      de facto — pessoal contratado, licenciamento, seguro de terceiros.
//   5. `evidenceNote` é OBRIGATÓRIO e diz a verdade sobre o que existe: as
//      hipóteses sem ingestão pública ativa dizem-no à cara, e o gate
//      mantém-nas em «ideia por investigar» em vez de as promover.
//
//  ── O QUE ESTE FICHEIRO NÃO É ──────────────────────────────────────
//  Não é uma lista de ideias com nota, ranking ou faturação estimada. O
//  relatório das 72 oportunidades deu a GRAMÁTICA — problema, cliente,
//  modelo de receita, requisitos, primeiros clientes, teste de
//  falsificação — e nenhum dos seus números, porque eram premissas
//  editoriais sem proveniência. Aqui não há um único valor de mercado:
//  esses só entram pelo caminho das observações, com fonte e data.
// ═══════════════════════════════════════════════════════════════════════

import type { CenarioInicial } from "@/lib/pricing";
import type { MarketRegion } from "./geografia";

type DeliveryPreference = "local" | "remoto" | "hibrido";
type CapitalBand = "ate-500" | "500-3000" | "mais-3000";
type Recurrence = "pontual" | "recorrente";
type Strength = "comercial" | "digital" | "operacoes" | "cuidado" | "tecnico";
type Structure = "recibos-verdes" | "empresa";

/** Os ícones que o catálogo pode usar. Nomes reais de `ui/Icons.tsx`. */
export type OpportunityIconName =
  | "Home"
  | "Plane"
  | "Leaf"
  | "Laptop"
  | "FileSign"
  | "Search"
  | "ShoppingBag"
  | "Handshake"
  | "Heart"
  | "Star"
  | "PawPrint"
  | "BookOpen"
  | "Move"
  | "Smartphone"
  | "Building"
  | "Gauge"
  | "Wrench"
  | "Plug"
  | "Settings"
  | "PenLine"
  | "Cloud"
  | "Globe"
  | "MapPin"
  | "ChefHat";

export type OpportunitySector =
  | "turismo"
  | "empresas"
  | "pessoas"
  | "casa"
  | "tecnico"
  | "digital"
  | "territorio"
  | "alimentar";

export const OPPORTUNITY_SECTORS: readonly { id: OpportunitySector; label: string }[] =
  Object.freeze([
    { id: "turismo", label: "Turismo e alojamento" },
    { id: "empresas", label: "Micro e pequenas empresas" },
    { id: "pessoas", label: "Pessoas e famílias" },
    { id: "casa", label: "Casa e património" },
    { id: "tecnico", label: "Técnico e manutenção" },
    { id: "digital", label: "Digital e conteúdo" },
    { id: "territorio", label: "Território e proximidade" },
    { id: "alimentar", label: "Alimentar e produção" },
  ] as const);

const SECTOR_LABEL = new Map(OPPORTUNITY_SECTORS.map((item) => [item.id, item.label]));

export function opportunitySectorLabel(id: OpportunitySector): string {
  return SECTOR_LABEL.get(id) ?? id;
}

export interface OpportunityTemplate {
  id: string;
  title: string;
  /** Uma linha, para o cartão da lista. Não repete o título. */
  promise: string;
  customer: string;
  problem: string;
  sector: OpportunitySector;
  icon: OpportunityIconName;
  delivery: readonly DeliveryPreference[];
  /**
   * Onde o MODELO faz sentido — nunca onde temos dados.
   *
   * Confundir as duas coisas foi um erro real: o piloto turístico esteve
   * limitado a duas NUTS II só porque o manifesto começou por mapear duas,
   * e quem escolhia outra zona era penalizado na compatibilidade por uma
   * limitação nossa. `portugal` significa «investigável em qualquer zona»;
   * a diferença entre regiões passa a vir do valor observado, não daqui.
   */
  regions: readonly MarketRegion[];
  capital: CapitalBand;
  recurrence: Recurrence;
  strengths: readonly Strength[];
  structures: readonly Structure[];
  pricingScenario: CenarioInicial;
  revenueModel: string;
  firstCustomerPath: readonly string[];
  criticalRequirements: readonly string[];
  falsificationTest: string;
  /**
   * O que existe hoje em matéria de evidência — e o que não existe.
   *
   * Uma hipótese sem série ligada entra na mesma, e diz porquê. Foi essa a
   * condição para o catálogo crescer sem o produto começar a prometer
   * dados que não tem: o estado do gate continua a ser «ideia por
   * investigar», e nenhuma rota comercial abre por cima disso.
   */
  evidenceNote: string;
  evidencePlan: readonly {
    source: string;
    purpose: string;
    url: string;
    status: "live" | "planned" | "license-review";
  }[];
}

/**
 * Quando o catálogo foi revisto por uma pessoa.
 *
 * NÃO é a data dos números: essa é o `checkedAt` de cada piloto, por fonte
 * e por execução. São duas datas diferentes e a interface tem de as
 * distinguir — juntá-las numa só faria a revisão editorial passar por
 * atualização de dados.
 */
export const OPPORTUNITY_CATALOGUE_REVIEWED_AT = "2026-08-22";

/** Fonte de validação local, comum a todas as hipóteses do catálogo. */
const VALIDACAO_LOCAL = {
  source: "Validação no teu mercado",
  purpose:
    "Entrevistas, orçamentos aceites e um piloto pago no teu microterritório. É a única prova de disposição a pagar que existe — nenhuma fonte pública a substitui.",
  url: "https://www.recibocerto.pt/ferramentas/descobrir-negocio",
  status: "planned",
} as const;

export const OPPORTUNITY_TEMPLATES: readonly OpportunityTemplate[] = Object.freeze([
  // ═══════════════════════════════════════════════════════════════════
  //  TURISMO E ALOJAMENTO
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "tourism-guest-operations",
    title: "Operações locais para alojamento turístico",
    promise:
      "Check-ins, apoio multilingue, reposições e coordenação de ocorrências para pequenos operadores.",
    customer: "Alojamentos independentes e pequenos gestores sem equipa própria permanente.",
    problem:
      "A ocupação cria picos operacionais que não justificam contratar uma equipa a tempo inteiro.",
    sector: "turismo",
    icon: "Home",
    delivery: ["local", "hibrido"],
    regions: ["portugal"],
    capital: "ate-500",
    recurrence: "recorrente",
    strengths: ["operacoes", "comercial"],
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "servico",
    revenueModel: "Avença por unidade de alojamento + preço por intervenção fora do pacote.",
    firstCustomerPath: [
      "Escolher uma microzona alcançável em 20–30 minutos.",
      "Entrevistar dez operadores sobre ocorrências e horários reais.",
      "Vender um piloto pago de 30 dias com limites explícitos.",
    ],
    criticalRequirements: [
      "Disponibilidade e raio de deslocação",
      "Seguro adequado",
      "Proteção de dados e acesso a imóveis",
    ],
    falsificationTest:
      "Abandonar ou redesenhar se dez operadores não relatarem ocorrências repetidas ou se nenhum aceitar um piloto pago dentro do preço sustentável.",
    evidenceNote:
      "Tem ingestão pública ativa: ocupação-quarto do INE e demografia das empresas, duas operações estatísticas independentes.",
    evidencePlan: [
      {
        source: "INE — ocupação-quarto",
        purpose: "Observar intensidade e geografia da atividade turística.",
        url: "https://dados.gov.pt/datasets/taxa-de-ocupacao-quarto-nos-estabelecimentos-de-alojamento-turistico",
        status: "live",
      },
      {
        source: "INE — Demografia das empresas (0014098)",
        purpose:
          "Contar sociedades constituídas por ano na zona. É uma operação estatística diferente do inquérito à hotelaria, por isso triangula a sério.",
        url: "https://www.ine.pt/xurl/indx/0014098/PT",
        status: "live",
      },
      VALIDACAO_LOCAL,
    ],
  },
  {
    id: "local-experience-host",
    title: "Experiências locais para quem visita",
    promise:
      "Passeios, roteiros e atividades com curadoria de quem conhece o sítio por dentro.",
    customer:
      "Visitantes que já escolheram a cidade e procuram o que não está no guia — e alojamentos que querem recomendar algo próprio.",
    problem:
      "A oferta genérica de circuitos é abundante; a que é específica de um bairro, de um ofício ou de uma estação depende de alguém local a organizá-la.",
    sector: "turismo",
    icon: "Plane",
    delivery: ["local", "hibrido"],
    regions: ["portugal"],
    // Um roteiro a pé arranca com registo, seguro e pouco mais. O que
    // custa é o tempo de o desenhar, e isso não é capital.
    capital: "ate-500",
    recurrence: "pontual",
    strengths: ["comercial", "cuidado"],
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "servico",
    revenueModel:
      "Preço por pessoa com mínimo de grupo + comissão negociada com alojamentos que encaminham. Plataformas cobram comissão: entra no preço, nunca depois dele.",
    firstCustomerPath: [
      "Escrever o roteiro que só tu podes dar e cronometrá-lo a sério.",
      "Fazer três sessões pagas a preço de custo com desconhecidos, não com amigos.",
      "Levar a versão corrigida a cinco alojamentos e medir quantos encaminham.",
    ],
    criticalRequirements: [
      "Registo de Agente de Animação Turística (RNAAT) quando a atividade o exige",
      "Seguro de responsabilidade civil e de acidentes pessoais dos participantes",
      "Limites de grupo, plano de mau tempo e cancelamentos por escrito",
    ],
    falsificationTest:
      "Parar se, depois de três sessões pagas, ninguém recomendar espontaneamente e a taxa de reserva por alojamento contactado ficar abaixo do que o preço sustentável exige.",
    evidenceNote:
      "Sem série própria ligada. A ocupação-quarto do INE mede a intensidade turística da zona, mas não a procura por experiências — e é preciso dizê-lo em vez de usar uma pela outra.",
    evidencePlan: [
      {
        source: "INE — ocupação-quarto",
        purpose:
          "Dimensionar a presença de visitantes na zona. Mede dormidas, não interesse por atividades: serve de contexto, nunca de procura.",
        url: "https://dados.gov.pt/datasets/taxa-de-ocupacao-quarto-nos-estabelecimentos-de-alojamento-turistico",
        status: "planned",
      },
      {
        source: "Registo Nacional de Agentes de Animação Turística",
        purpose:
          "Contar operadores já registados por zona — o primeiro sinal de OFERTA do motor, e o termo que falta para se poder falar em lacuna.",
        url: "https://rnt.turismodeportugal.pt/",
        status: "planned",
      },
      VALIDACAO_LOCAL,
    ],
  },
  {
    id: "wine-estate-operations",
    title: "Apoio operacional a quintas e enoturismo",
    promise:
      "Reservas, receção de visitantes, loja e conteúdo para produtores que vivem da vinha, não da agenda.",
    customer:
      "Pequenos produtores com prova aberta ao público e sem ninguém dedicado ao lado comercial.",
    problem:
      "Quem produz não tem tempo para responder a pedidos, organizar visitas e manter a loja — e é aí que a margem do enoturismo se perde.",
    sector: "turismo",
    icon: "Leaf",
    delivery: ["local", "hibrido"],
    regions: ["norte", "centro", "alentejo"],
    capital: "500-3000",
    recurrence: "recorrente",
    strengths: ["operacoes", "comercial", "digital"],
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "servico",
    revenueModel:
      "Avença mensal por produtor + percentagem acordada sobre visitas e vendas diretas atribuíveis.",
    firstCustomerPath: [
      "Visitar dez quintas em época baixa, quando há tempo para conversar.",
      "Medir quantos pedidos ficam sem resposta numa semana real.",
      "Vender um mês pago a tratar só das reservas, antes de propor mais.",
    ],
    criticalRequirements: [
      "Regras de rotulagem e venda de bebidas alcoólicas",
      "Acordo escrito sobre quem fatura a visita e a garrafa",
      "Seguro e responsabilidade em provas com público",
    ],
    falsificationTest:
      "Rejeitar se os pedidos sem resposta forem residuais, ou se os produtores preferirem fechar a prova ao público a pagar por quem a organize.",
    evidenceNote:
      "Sem série própria ligada. Existem estatísticas de produção e de turismo por região, mas nenhuma mede quantos produtores abrem prova ao público — que é o universo de clientes desta hipótese.",
    evidencePlan: [
      {
        source: "INE — ocupação-quarto",
        purpose:
          "Contexto de fluxo turístico nas regiões vitivinícolas. Não distingue quem visita quintas de quem não visita.",
        url: "https://dados.gov.pt/datasets/taxa-de-ocupacao-quarto-nos-estabelecimentos-de-alojamento-turistico",
        status: "planned",
      },
      {
        source: "Comissões vitivinícolas regionais",
        purpose:
          "Contagem de produtores certificados por região. Publicação irregular e sem licença de reutilização declarada: entra como candidata, não como fonte.",
        url: "https://www.ivv.gov.pt/",
        status: "license-review",
      },
      VALIDACAO_LOCAL,
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  MICRO E PEQUENAS EMPRESAS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "sme-digital-operations",
    title: "Instalação de operações digitais para microempresas",
    promise:
      "Organizar pedidos, CRM leve, propostas, cobranças e automações simples sem vender uma transformação abstrata.",
    customer:
      "Micro e pequenas empresas com processos dispersos por WhatsApp, email e folhas de cálculo.",
    problem:
      "Ferramentas existem, mas a adoção falha quando ninguém traduz o processo e acompanha a equipa.",
    sector: "empresas",
    icon: "Laptop",
    delivery: ["remoto", "hibrido"],
    regions: ["portugal"],
    capital: "ate-500",
    recurrence: "recorrente",
    strengths: ["digital", "operacoes", "comercial"],
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "projeto",
    revenueModel: "Diagnóstico pago + implementação por projeto + manutenção mensal opcional.",
    firstCustomerPath: [
      "Escolher um único setor e um processo caro e repetitivo.",
      "Mapear o processo de cinco empresas sem propor software.",
      "Vender uma implementação curta com métrica antes/depois.",
    ],
    criticalRequirements: [
      "RGPD e acessos mínimos",
      "Capacidade de suporte",
      "Âmbito técnico e responsabilidade contratual",
    ],
    falsificationTest:
      "Rejeitar a hipótese se o processo não consumir tempo mensurável ou se cinco decisores não pagarem sequer pelo diagnóstico.",
    evidenceNote:
      "Tem ingestão pública ativa: intensidade digital das empresas (Eurostat) e nascimentos de empresas por forma jurídica (INE) — duas operações independentes.",
    evidencePlan: [
      {
        source: "Eurostat — Digital Intensity Index (isoc_e_dii)",
        purpose:
          "Comparar microempresas com pequenas empresas na mesma medida. A distância entre classes é o défice a investigar, não a compra de consultoria.",
        url: "https://ec.europa.eu/eurostat/databrowser/view/isoc_e_dii/default/table?lang=en",
        status: "live",
      },
      {
        source: "INE — Demografia das empresas (0014098)",
        purpose:
          "Contar empresas individuais e sociedades nascidas por ano na zona: é o momento em que um negócio monta processos do zero.",
        url: "https://www.ine.pt/xurl/indx/0014098/PT",
        status: "live",
      },
      {
        source: "INE — utilização de TIC nas empresas",
        purpose: "Confirmar o contexto português e a adoção recente de IA.",
        url: "https://www.ine.pt/xportal/xmain?DESTAQUESdest_boui=707461582&DESTAQUESmodo=2&xpgid=ine_destaques&xpid=INE",
        status: "license-review",
      },
    ],
  },
  {
    id: "public-tender-support",
    title: "Radar e preparação operacional de concursos para pequenas empresas",
    promise:
      "Filtrar oportunidades públicas, organizar requisitos e prazos e preparar um dossier — sem substituir apoio jurídico.",
    customer: "Pequenas empresas capazes de entregar, mas sem rotina para acompanhar procedimentos.",
    problem:
      "A informação é pública, porém a triagem e a preparação documental consomem tempo e falham por processo.",
    sector: "empresas",
    icon: "FileSign",
    // Ler peças, cruzar prazos e montar dossiers é trabalho de secretária,
    // não de deslocação. Declarar «híbrido» só porque sim tornava esta
    // hipótese indistinguível da instalação de operações digitais — que
    // essa, sim, exige ir ao cliente ver o processo a funcionar.
    delivery: ["remoto"],
    regions: ["portugal"],
    capital: "ate-500",
    recurrence: "recorrente",
    // A competência que este trabalho exige mesmo é atenção a requisitos
    // formais e prazos. «Comercial» estava aqui por inércia: quem vende uma
    // avença de monitorização não vende como quem vende serviços.
    strengths: ["operacoes", "digital"],
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "servico",
    revenueModel:
      "Avença de monitorização + fee fixo por dossier; nunca comissão que crie conflito sem revisão jurídica.",
    firstCustomerPath: [
      "Escolher dois códigos CPV e uma região.",
      "Medir quantos avisos realmente elegíveis surgem em 30 dias.",
      "Vender uma triagem paga antes de automatizar o radar.",
    ],
    criticalRequirements: [
      "Limite entre apoio administrativo e jurídico",
      "Confidencialidade",
      "Rastreio de prazos e versões",
    ],
    falsificationTest:
      "Rejeitar o nicho se não houver procedimentos elegíveis recorrentes ou se as empresas não valorizarem a poupança de tempo acima do preço sustentável.",
    evidenceNote:
      "É a hipótese com mais lastro do catálogo: três operações estatísticas independentes, incluindo o único sinal transacional que não vem de inquérito — os contratos do Portal BASE, lidos de um ficheiro anual por um trabalho agendado.",
    evidencePlan: [
      {
        source: "INE — Sistema de contas integradas das empresas (0014044)",
        purpose: "Dimensionar o universo de empresas pequenas capazes de entregar, por zona.",
        url: "https://www.ine.pt/xurl/indx/0014044/PT",
        status: "live",
      },
      {
        source: "Portal BASE (IMPIC), via dados.gov.pt",
        purpose:
          "Contar contratos celebrados e procedimentos abertos à concorrência, por zona e por ano — nunca o valor anunciado como receita provável. A leitura é feita por um job agendado sobre o ficheiro anual do portal; a aplicação serve o instantâneo commitado, com a data da extração à vista.",
        url: "https://dados.gov.pt/pt/datasets/contratos-publicos-portal-base-impic-contratos-de-2012-a-2026/",
        status: "live",
      },
      {
        source: "TED — Tenders Electronic Daily",
        purpose:
          "Acrescentar os avisos acima dos limiares europeus e a classificação por CPV, que o ficheiro anual do BASE não traz num formato utilizável. Enquanto não estiver ligado, a contagem por setor não existe e o cartão não a mostra.",
        url: "https://ted.europa.eu/",
        status: "planned",
      },
    ],
  },
  {
    id: "b2b-lead-research",
    title: "Pesquisa e qualificação de contactos para equipas comerciais",
    promise:
      "Listas de empresas realmente elegíveis, com o critério escrito e a fonte de cada contacto.",
    customer:
      "Pequenas equipas comerciais e consultores que perdem metade da semana a procurar em vez de vender.",
    problem:
      "Comprar bases de contactos é barato e ilegal de usar mal; construir a lista certa é lento e ninguém tem tempo.",
    sector: "empresas",
    icon: "Search",
    delivery: ["remoto"],
    regions: ["portugal"],
    // As ferramentas que separam isto de copiar uma lista — verificação de
    // contactos, enriquecimento, um CRM decente — são todas pagas, e são o
    // que torna o trabalho defensável. Entram no capital, não na margem.
    capital: "500-3000",
    recurrence: "recorrente",
    strengths: ["comercial", "digital"],
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "servico",
    revenueModel:
      "Avença por lote mensal de contactos qualificados, com critério acordado. Nunca preço por contacto: paga-se o julgamento, não a linha.",
    firstCustomerPath: [
      "Escolher um setor onde saibas distinguir uma empresa elegível de uma parecida.",
      "Entregar um lote pequeno pago a três equipas e medir a taxa de resposta que ele produz.",
      "Fixar o critério por escrito antes de vender o segundo lote.",
    ],
    criticalRequirements: [
      "RGPD: base legal para tratar dados de contacto profissional e registo do interesse legítimo",
      "Nunca extrair dados de plataformas cujos termos o proíbem",
      "Critério de elegibilidade escrito e auditável pelo cliente",
    ],
    falsificationTest:
      "Parar se os lotes entregues não melhorarem a taxa de resposta face ao que a equipa fazia sozinha, ou se o cliente só aceitar pagar por volume.",
    evidenceNote:
      "Sem série própria ligada. A demografia das empresas dimensiona o universo por zona, mas não diz quantas equipas comerciais existem nem quanto tempo perdem — e não vamos usar uma coisa pela outra.",
    evidencePlan: [
      {
        source: "INE — Demografia das empresas (0014098)",
        purpose:
          "Dimensionar quantas empresas existem por zona e forma jurídica. É o universo, não a procura.",
        url: "https://www.ine.pt/xurl/indx/0014098/PT",
        status: "planned",
      },
      VALIDACAO_LOCAL,
    ],
  },
  {
    id: "retail-online-launch",
    title: "Montar e operar a loja online de um negócio local",
    promise:
      "Catálogo, fotografia, meios de pagamento, envios e as rotinas semanais que mantêm a loja viva.",
    customer:
      "Comércio local com clientes fiéis na rua e nenhuma presença que aguente uma encomenda.",
    problem:
      "Abrir a loja é o passo fácil. O que falha é a operação: stock desatualizado, envios sem regra e fotografias que não vendem.",
    sector: "empresas",
    icon: "ShoppingBag",
    // Vai-se à loja fotografar o stock e conhecer quem atende; o resto
    // faz-se de longe. Sem a parte presencial, isto era um subconjunto
    // das operações digitais para microempresas — e nunca chegaria a
    // primeiro para ninguém, em perfil nenhum.
    delivery: ["local", "hibrido"],
    regions: ["portugal"],
    capital: "500-3000",
    recurrence: "recorrente",
    // Primeiro vender, depois a ferramenta: uma loja online de comércio
    // local vive de quem já compra na rua, não da tecnologia.
    strengths: ["comercial", "digital", "operacoes"],
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "loja_online",
    revenueModel:
      "Montagem por projeto + avença de operação semanal. A percentagem sobre vendas só depois de haver histórico que a justifique.",
    firstCustomerPath: [
      "Escolher uma rua ou um mercado e falar com dez lojistas sobre o que já tentaram.",
      "Montar uma loja completa para um deles, paga, com prazo curto e catálogo limitado.",
      "Medir encomendas em oito semanas antes de vender a segunda.",
    ],
    criticalRequirements: [
      "Informação pré-contratual, direito de livre resolução e política de devoluções",
      "Meios de pagamento e comissões declaradas no preço",
      "Quem responde ao cliente quando a encomenda corre mal",
    ],
    falsificationTest:
      "Abandonar se, ao fim de oito semanas, as encomendas online não cobrirem a avença — ou se o lojista deixar de atualizar o stock e a loja passar a prometer o que não tem.",
    evidenceNote:
      "Sem série própria ligada. A intensidade digital das empresas (Eurostat) é contexto nacional e mede adoção de ferramentas, não intenção de vender online — a distância entre as duas coisas é precisamente o risco desta hipótese.",
    evidencePlan: [
      {
        source: "Eurostat — Digital Intensity Index (isoc_e_dii)",
        purpose:
          "Contexto nacional da adoção digital por classe de dimensão. Não é procura por lojas online, e não pode ser lido como tal.",
        url: "https://ec.europa.eu/eurostat/databrowser/view/isoc_e_dii/default/table?lang=en",
        status: "planned",
      },
      {
        source: "INE — Comércio eletrónico das empresas",
        purpose:
          "Percentagem de empresas que vendem em linha, por classe de dimensão. Por confirmar o indicador exato e a licença do recurso.",
        url: "https://www.ine.pt/xportal/xmain?xpid=INE&xpgid=ine_base_dados",
        status: "license-review",
      },
      VALIDACAO_LOCAL,
    ],
  },
  {
    id: "hospitality-staffing-team",
    title: "Equipa de reforço para hotelaria e eventos",
    promise:
      "Pessoas formadas e disponíveis para os picos — com escala, substituições e responsabilidade a sério.",
    customer:
      "Hotéis, restaurantes e organizadores de eventos que precisam de reforço previsível em fins de semana e época alta.",
    problem:
      "O reforço informal falha exatamente quando é preciso: quem falta não é substituído e o cliente fica a descoberto num sábado.",
    sector: "empresas",
    icon: "Handshake",
    delivery: ["local"],
    regions: ["portugal"],
    capital: "mais-3000",
    recurrence: "recorrente",
    // Escala e substituições primeiro; e logo a seguir as pessoas, que é
    // o que faz alguém voltar ao turno seguinte. «Comercial» não entra:
    // a carteira é pequena e repete-se — o difícil não é vender, é ter
    // quem apareça no sábado.
    strengths: ["operacoes", "cuidado"],
    // Isto não se faz a recibos verdes: há pessoal contratado, escalas e
    // responsabilidade por terceiros. A estrutura não é uma preferência,
    // é uma condição de existência.
    structures: ["empresa"],
    pricingScenario: "servico_hora",
    revenueModel:
      "Preço por hora de reforço com mínimo de turno, e margem que tem de cobrir o custo real do trabalho — encargos, formação, deslocação e as horas não faturadas.",
    firstCustomerPath: [
      "Fechar dois clientes âncora com necessidade previsível antes de recrutar quem quer que seja.",
      "Formar um núcleo pequeno e cobrir quatro fins de semana seguidos sem falhar um.",
      "Só depois vender ao terceiro cliente.",
    ],
    criticalRequirements: [
      "Enquadramento laboral correto do pessoal — cedência ocasional e trabalho temporário têm regras próprias e licenciamento",
      "Seguro de acidentes de trabalho e responsabilidade civil",
      "Formação em higiene e segurança alimentar quando há manuseamento de alimentos",
    ],
    falsificationTest:
      "Parar se a margem por hora não sobreviver ao custo real do trabalho, ou se a taxa de faltas obrigar a manter mais gente parada do que a operar.",
    evidenceNote:
      "Sem série própria ligada. É a hipótese do catálogo com maior distância entre o que as fontes públicas medem e o que decide o negócio: a ocupação turística explica o pico, mas o que determina a viabilidade é o custo do trabalho, e isso não está publicado por zona.",
    evidencePlan: [
      {
        source: "INE — ocupação-quarto",
        purpose:
          "Dimensionar a sazonalidade da zona — o pico que cria a necessidade. Não mede quem contrata reforço externo.",
        url: "https://dados.gov.pt/datasets/taxa-de-ocupacao-quarto-nos-estabelecimentos-de-alojamento-turistico",
        status: "planned",
      },
      {
        source: "IEFP — ofertas de emprego por região e atividade",
        purpose:
          "Sinal de escassez de execução no setor. Pode ser um contra-sinal: muitas ofertas por preencher indicam falta de pessoas, não procura de serviço.",
        url: "https://www.iefp.pt/estatisticas",
        status: "license-review",
      },
      VALIDACAO_LOCAL,
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  PESSOAS E FAMÍLIAS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "senior-digital-concierge",
    title: "Acompanhamento digital presencial para seniores e famílias",
    promise:
      "Ajuda acompanhada em serviços digitais, segurança básica e organização — sem guardar credenciais.",
    customer:
      "Famílias que apoiam pessoas com baixa confiança digital e querem uma presença local de confiança.",
    problem:
      "A disponibilidade de serviços digitais não elimina barreiras de uso, confiança e segurança.",
    sector: "pessoas",
    icon: "Heart",
    // Presencial, e o título di-lo. Declarar «híbrido» tornava esta
    // hipótese indistinguível das operações de alojamento em todos os
    // eixos menos um — e o acompanhamento que se vende aqui é
    // precisamente o de estar ao lado da pessoa.
    delivery: ["local"],
    regions: ["portugal"],
    capital: "ate-500",
    recurrence: "recorrente",
    strengths: ["cuidado", "operacoes"],
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "servico_hora",
    revenueModel:
      "Sessão avulsa, pack familiar ou acompanhamento mensal com limites de responsabilidade.",
    firstCustomerPath: [
      "Entrevistar familiares pagadores, não presumir que o utilizador final compra.",
      "Definir tarefas permitidas e proibidas antes do primeiro serviço.",
      "Testar três sessões pagas com acompanhamento e checklist de segurança.",
    ],
    criticalRequirements: [
      "Nunca custodiar passwords ou códigos",
      "Seguro e limites de atuação",
      "Protocolo contra fraude e abuso",
    ],
    falsificationTest:
      "Parar se as famílias não aceitarem pagar pelo acompanhamento ou se a responsabilidade necessária exceder o seguro e o âmbito do serviço.",
    evidenceNote:
      "Tem ingestão ativa, e é honesta sobre o que lhe falta: as três séries são estruturais — competências digitais e envelhecimento. Não há um único sinal público de PROCURA para isto em Portugal, e o cartão diz-o em vez de arranjar um substituto.",
    evidencePlan: [
      {
        source: "Eurostat — competências digitais (isoc_sk_dskl_i21)",
        purpose:
          "Medir o défice dos 65–74 anos contra a população total. Um défice é barreira de uso, não procura paga — quem paga costuma ser a família.",
        url: "https://ec.europa.eu/eurostat/databrowser/view/isoc_sk_dskl_i21/default/table?lang=en",
        status: "live",
      },
      {
        source: "INE — Índice de envelhecimento (0012909)",
        purpose:
          "Dimensionar quantas pessoas na zona podem precisar de acompanhamento. Estimativas anuais da população: operação distinta do inquérito europeu às famílias.",
        url: "https://www.ine.pt/xurl/indx/0012909/PT",
        status: "live",
      },
    ],
  },
  {
    id: "child-activities-programme",
    title: "Programa de atividades para crianças fora do horário escolar",
    promise:
      "Tardes com programa, transporte combinado e comunicação com quem paga — que são os pais.",
    customer:
      "Famílias com horários que não fecham entre o fim das aulas e o fim do trabalho.",
    problem:
      "As horas entre as 15h30 e as 19h são o problema logístico mais caro de uma família, e a oferta é escassa fora dos grandes centros.",
    sector: "pessoas",
    icon: "Star",
    delivery: ["local"],
    regions: ["portugal"],
    capital: "500-3000",
    recurrence: "recorrente",
    // Nenhum pai deixa um filho por causa da logística: o que se compra é
    // a confiança. Os horários e os rácios são o que a torna possível, e
    // convencer quem paga vem a seguir.
    strengths: ["cuidado", "operacoes", "comercial"],
    // Espaço licenciado, pessoal com registo criminal validado e seguro de
    // menores: nenhuma destas obrigações se cumpre em nome individual sem
    // assumir risco pessoal desproporcionado.
    structures: ["empresa"],
    pricingScenario: "servico",
    revenueModel:
      "Mensalidade por criança com escalões de frequência + inscrição anual que cobre material e seguro.",
    firstCustomerPath: [
      "Falar com a direção de duas escolas e perceber a saída real, não a do horário.",
      "Reunir uma lista de espera assinada antes de arrendar o que quer que seja.",
      "Abrir com um grupo pequeno e um programa que caiba nas pessoas que tens.",
    ],
    criticalRequirements: [
      "Licenciamento do espaço e do serviço junto da entidade competente",
      "Registo criminal para trabalho com menores, de toda a equipa",
      "Seguro de acidentes pessoais e rácios de acompanhamento por idade",
    ],
    falsificationTest:
      "Não avançar se a lista de espera assinada não cobrir o ponto de equilíbrio do primeiro trimestre — a procura declarada em conversa não paga renda.",
    evidenceNote:
      "Sem série própria ligada. A população residente por escalão etário existe por zona e dimensiona o universo; não diz nada sobre horários das famílias nem sobre disposição a pagar, que é o que decide.",
    evidencePlan: [
      {
        source: "INE — Estimativas anuais da população residente",
        purpose:
          "Dimensionar a população em idade escolar por zona. É universo, não procura.",
        url: "https://www.ine.pt/xportal/xmain?xpid=INE&xpgid=ine_base_dados",
        status: "planned",
      },
      {
        source: "DGEEC — alunos matriculados por concelho",
        purpose:
          "Contagem administrativa de alunos por nível de ensino e concelho. Licença de reutilização por confirmar.",
        url: "https://www.dgeec.medu.pt/",
        status: "license-review",
      },
      VALIDACAO_LOCAL,
    ],
  },
  {
    id: "petcare-route",
    title: "Rota de passeios e cuidados a animais de companhia",
    promise:
      "A mesma pessoa, à mesma hora, todos os dias — com relatório e chave devolvida.",
    customer:
      "Quem trabalha fora todo o dia e tem um animal que não pode esperar por ninguém.",
    problem:
      "O serviço existe por aplicação, mas quem tem um animal ansioso quer a mesma pessoa, não a próxima disponível.",
    sector: "pessoas",
    icon: "PawPrint",
    delivery: ["local"],
    regions: ["portugal"],
    capital: "ate-500",
    recurrence: "recorrente",
    // Quem tem um animal ansioso escolhe a pessoa, não o serviço: o
    // cuidado é o que se compra. A rota decide a margem e a rua decide o
    // volume, por essa ordem.
    strengths: ["cuidado", "operacoes", "comercial"],
    // Uma rota é uma pessoa. Montar sociedade para isto é custo fixo
    // antes de haver receita.
    structures: ["recibos-verdes"],
    pricingScenario: "servico",
    revenueModel:
      "Pack semanal por animal, com preço por rota e não por deslocação isolada. A densidade da rota é o que decide a margem.",
    firstCustomerPath: [
      "Desenhar uma rota a pé que caiba numa hora e só depois procurar clientes dentro dela.",
      "Fechar quatro clientes na mesma rua ou quarteirão antes de aceitar o quinto noutro sítio.",
      "Medir uma semana real, com chuva e com atrasos, antes de anunciar disponibilidade.",
    ],
    criticalRequirements: [
      "Seguro de responsabilidade civil por danos a terceiros e ao animal",
      "Protocolo de chaves, acesso à casa e emergência veterinária",
      "Regras de identificação e registo obrigatório dos animais que acompanha",
    ],
    falsificationTest:
      "Parar se a rota não conseguir densidade suficiente para o preço sustentável — quatro clientes espalhados por uma cidade é um passatempo caro, não um negócio.",
    evidenceNote:
      "Sem série própria ligada. O SIAC regista animais de companhia por concelho, o que seria um bom sinal de universo, mas os dados publicados não estão num formato reutilizável com licença clara — e sem isso não entram.",
    evidencePlan: [
      {
        source: "SIAC — Sistema de Informação de Animais de Companhia",
        purpose:
          "Contar animais registados por zona. Formato de publicação e licença de reutilização por confirmar antes de qualquer uso.",
        url: "https://siac.vet/",
        status: "license-review",
      },
      VALIDACAO_LOCAL,
    ],
  },
  {
    id: "language-tutoring-remote",
    title: "Explicações e treino de línguas à distância",
    promise:
      "Sessões curtas e regulares, com objetivo declarado e progresso que se vê.",
    customer:
      "Adultos que precisam da língua para o trabalho e desistiram de cursos longos que não cabem no horário.",
    problem:
      "Quem precisa de falar não precisa de mais um curso: precisa de prática frequente com correção — e isso é caro de organizar sozinho.",
    sector: "pessoas",
    icon: "BookOpen",
    delivery: ["remoto"],
    regions: ["portugal"],
    capital: "ate-500",
    recurrence: "recorrente",
    strengths: ["comercial", "cuidado"],
    // Uma pessoa a dar aulas é uma pessoa a dar aulas. Montar sociedade
    // antes de haver agenda cheia é custo fixo à espera de receita.
    structures: ["recibos-verdes"],
    pricingScenario: "servico_hora",
    revenueModel:
      "Pack de sessões com validade, não aula avulsa. A validade é o que protege a agenda de quem ensina.",
    firstCustomerPath: [
      "Escolher uma situação concreta — reuniões, entrevistas, atendimento — em vez de «inglês».",
      "Dar seis sessões pagas e medir quantos compram o segundo pack.",
      "Só subir o preço depois de a taxa de renovação se manter dois meses.",
    ],
    criticalRequirements: [
      "Regras de cancelamento e validade dos packs por escrito",
      "Enquadramento correto da atividade de formação para efeitos de IVA",
      "Capacidade real de agenda antes de vender packs longos",
    ],
    falsificationTest:
      "Rejeitar se menos de metade renovar o pack, ou se a agenda só encher a preços que não cobrem as horas de preparação.",
    evidenceNote:
      "Sem série própria ligada, e provavelmente não terá: procura por explicações não é medida por estatística oficial em Portugal. O valor da ferramenta aqui é dizer isso, não arranjar um substituto que pareça um número.",
    evidencePlan: [VALIDACAO_LOCAL],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  CASA E PATRIMÓNIO
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "home-transition-operations",
    title: "Coordenação de transições de casa",
    promise:
      "Inventário, pedidos de orçamento, calendarização e acompanhamento de mudanças, heranças ou redução de casa.",
    customer: "Famílias sem tempo local para coordenar múltiplos prestadores e decisões.",
    problem:
      "Uma transição rara concentra dezenas de tarefas, mas o cliente não precisa de mais um prestador isolado.",
    sector: "casa",
    icon: "Move",
    delivery: ["local", "hibrido"],
    regions: ["portugal"],
    capital: "500-3000",
    recurrence: "pontual",
    strengths: ["operacoes", "cuidado", "comercial"],
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "projeto",
    revenueModel:
      "Diagnóstico e plano pagos + coordenação por projeto; fornecedores faturam diretamente ao cliente.",
    firstCustomerPath: [
      "Escolher uma transição concreta e uma área geográfica curta.",
      "Entrevistar profissionais que já recebem pedidos desorganizados.",
      "Vender um diagnóstico, antes de assumir toda a coordenação.",
    ],
    criticalRequirements: [
      "Seguro e responsabilidade",
      "Independência na escolha de fornecedores",
      "Regras para bens, chaves e dados pessoais",
    ],
    falsificationTest:
      "Parar se o cliente preferir contratar diretamente ou se o custo de aquisição exceder a margem do projeto em três testes consecutivos.",
    evidenceNote:
      "Tem ingestão ativa: transações de alojamentos por famílias e índice de envelhecimento, duas operações independentes do INE.",
    evidencePlan: [
      {
        source: "INE — Transações de alojamentos familiares (0012787)",
        purpose:
          "Contar casas transacionadas por famílias, por zona e por ano. É o evento que cria a transição — e o sinal mais próximo de procura que existe publicado.",
        url: "https://www.ine.pt/xurl/indx/0012787/PT",
        status: "live",
      },
      {
        source: "INE — Índice de envelhecimento (0012909)",
        purpose:
          "Contexto das transições ligadas a herança e a redução de casa, sem inferir intenção de contratar.",
        url: "https://www.ine.pt/xurl/indx/0012909/PT",
        status: "live",
      },
    ],
  },
  {
    id: "home-tech-install",
    title: "Instalação e configuração de tecnologia doméstica",
    promise:
      "Rede, televisão, câmaras e assistentes a funcionar mesmo — e explicados a quem fica a usá-los.",
    customer:
      "Famílias e pequenos escritórios que compraram equipamento e ficaram com metade dele por configurar.",
    problem:
      "O equipamento chega numa caixa e a instalação é presumida. Quem não é técnico paga em horas e desiste a meio.",
    sector: "casa",
    icon: "Smartphone",
    delivery: ["local"],
    regions: ["portugal"],
    capital: "500-3000",
    recurrence: "pontual",
    strengths: ["tecnico", "cuidado"],
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "servico",
    revenueModel:
      "Preço fechado por tipo de instalação, com deslocação incluída no raio declarado e revisita paga.",
    firstCustomerPath: [
      "Escolher dois tipos de instalação e cronometrar cada um em casa de desconhecidos.",
      "Fixar preço fechado — orçamento por hora afasta exatamente quem tem medo do valor final.",
      "Medir quantas revisitas gratuitas o preço aguenta antes de deixar de haver margem.",
    ],
    criticalRequirements: [
      "Limite claro entre configuração e intervenção elétrica, que exige habilitação própria",
      "Nunca ficar com credenciais do cliente depois da instalação",
      "Garantia declarada por escrito sobre o que foi instalado",
    ],
    falsificationTest:
      "Abandonar se o tempo real por instalação exceder sistematicamente o orçamentado, ou se as revisitas gratuitas consumirem a margem em três trabalhos seguidos.",
    evidenceNote:
      "Sem série própria ligada. As competências digitais das famílias (Eurostat) descrevem a barreira, mas são nacionais e bienais: servem de contexto, nunca de sinal da tua zona.",
    evidencePlan: [
      {
        source: "Eurostat — competências digitais (isoc_sk_dskl_i21)",
        purpose:
          "Contexto nacional da barreira de uso. Não desce a NUTS II e não mede quem paga por instalação.",
        url: "https://ec.europa.eu/eurostat/databrowser/view/isoc_sk_dskl_i21/default/table?lang=en",
        status: "planned",
      },
      VALIDACAO_LOCAL,
    ],
  },
  {
    id: "small-works-coordination",
    title: "Coordenação de pequenas obras e remodelações",
    promise:
      "Um interlocutor só, orçamentos comparáveis e uma obra que acaba na data que foi dita.",
    customer:
      "Proprietários que querem remodelar sem passar seis meses a perseguir empreiteiros.",
    problem:
      "O cliente recebe três orçamentos incomparáveis, escolhe pelo preço e descobre a diferença a meio da obra.",
    sector: "casa",
    icon: "Building",
    delivery: ["local"],
    regions: ["portugal"],
    capital: "mais-3000",
    recurrence: "pontual",
    // Organizar a obra é o trabalho. Logo a seguir vem defender o fee de
    // coordenação, que é a parte onde isto morre — e só depois segurar o
    // cliente durante os meses em que a casa está aberta.
    strengths: ["operacoes", "comercial", "cuidado"],
    // Há responsabilidade sobre trabalho de terceiros em casa alheia, e
    // seguros que não se contratam em nome individual em condições
    // aceitáveis. A estrutura é uma condição, não um gosto.
    structures: ["empresa"],
    pricingScenario: "projeto",
    revenueModel:
      "Fee de coordenação sobre o valor da obra, declarado ao cliente, com os empreiteiros a faturar diretamente. Nunca comissão escondida no orçamento deles.",
    firstCustomerPath: [
      "Construir a lista de empreiteiros ANTES do primeiro cliente — é o ativo, e demora meses.",
      "Coordenar uma obra pequena a fee reduzido e documentar tudo o que correu mal.",
      "Só vender a segunda depois de a primeira ter acabado, não a meio.",
    ],
    criticalRequirements: [
      "Independência declarada face aos empreiteiros e ausência de comissão oculta",
      "Seguro de responsabilidade civil e delimitação do que é coordenação e não execução",
      "Licenciamento e comunicação prévia à câmara quando a obra o exige",
    ],
    falsificationTest:
      "Parar se o fee de coordenação não sobreviver à negociação em três propostas seguidas, ou se os empreiteiros começarem a contornar-te depois do primeiro contacto.",
    evidenceNote:
      "Sem série própria ligada. As obras licenciadas por concelho são publicadas pelo INE e seriam um sinal transacional legítimo, mas os pequenos trabalhos — que são o negócio — não passam por licenciamento e não aparecem em lado nenhum.",
    evidencePlan: [
      {
        source: "INE — Obras licenciadas e concluídas",
        purpose:
          "Contar obras licenciadas por zona. Mede a construção com licença; a remodelação interior, que é a maioria destes trabalhos, não entra.",
        url: "https://www.ine.pt/xportal/xmain?xpid=INE&xpgid=ine_base_dados",
        status: "planned",
      },
      {
        source: "INE — Transações de alojamentos familiares (0012787)",
        purpose:
          "Uma casa que muda de mãos é o momento mais provável de uma remodelação. É proximidade, não procura.",
        url: "https://www.ine.pt/xurl/indx/0012787/PT",
        status: "planned",
      },
      VALIDACAO_LOCAL,
    ],
  },
  {
    id: "energy-efficiency-check",
    title: "Diagnóstico de eficiência energética e candidatura a apoios",
    promise:
      "Onde a casa perde dinheiro, o que compensa mudar e que apoios existem à data de hoje.",
    customer:
      "Proprietários com faturas altas e condomínios que adiam decisões por falta de números.",
    problem:
      "As medidas são conhecidas e a ordem por que compensam fazê-las não é. Sem números, a decisão adia-se mais um inverno.",
    sector: "casa",
    icon: "Gauge",
    delivery: ["local", "hibrido"],
    regions: ["portugal"],
    // Câmara térmica, medição de infiltrações e software de simulação. Um
    // diagnóstico que se limite a olhar para a fatura não aguenta
    // contestação técnica, e é isso que aqui se vende.
    capital: "mais-3000",
    recurrence: "pontual",
    strengths: ["tecnico", "operacoes", "digital"],
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "projeto",
    revenueModel:
      "Diagnóstico pago com relatório e prioridades + acompanhamento de candidatura como serviço à parte. Nunca comissão de quem vende o equipamento.",
    firstCustomerPath: [
      "Fazer cinco diagnósticos pagos a preço de custo e comparar o previsto com a fatura seis meses depois.",
      "Publicar o método, não os resultados de clientes.",
      "Procurar condomínios só depois de o relatório aguentar contestação técnica.",
    ],
    criticalRequirements: [
      "Certificação exigida quando o trabalho é certificação energética (perito qualificado ADENE)",
      "Independência face a instaladores e fornecedores de equipamento",
      "Apoios com data e fonte: um programa fechado não é um argumento de venda",
    ],
    falsificationTest:
      "Rejeitar se a poupança prevista não se confirmar nas faturas de cinco casos, ou se o cliente só pagar quando o diagnóstico vem oferecido por quem instala.",
    evidenceNote:
      "Sem série própria ligada. Existem estatísticas de consumo de energia por região e certificados energéticos emitidos, mas nenhuma mede quem paga por um diagnóstico independente — que é a pergunta que decide.",
    evidencePlan: [
      {
        source: "DGEG — consumo de energia por município",
        purpose:
          "Contexto de consumo por zona. Não distingue habitação eficiente de habitação cara de aquecer.",
        url: "https://www.dgeg.gov.pt/",
        status: "license-review",
      },
      {
        source: "ADENE — certificados energéticos emitidos",
        purpose:
          "Contagem administrativa de certificados por zona e classe. Formato e licença por confirmar.",
        url: "https://www.adene.pt/",
        status: "license-review",
      },
      VALIDACAO_LOCAL,
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  TÉCNICO E MANUTENÇÃO
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "device-repair-bench",
    title: "Reparação de equipamento e recuperação de dados",
    promise:
      "Diagnóstico honesto, prazo dito à cabeça e a decisão de reparar ou não devolvida ao cliente.",
    customer:
      "Pessoas e microempresas com equipamento fora de garantia e ninguém de confiança para o ver.",
    problem:
      "Reparar deixou de ser óbvio: o orçamento chega tarde, quase iguala o preço de novo, e quem decide não tem informação para decidir.",
    sector: "tecnico",
    icon: "Wrench",
    delivery: ["local"],
    regions: ["portugal"],
    // Bancada, equipamento de diagnóstico, estação de soldadura e stock
    // mínimo de peças. Abaixo disto não se dá prazo a ninguém.
    capital: "mais-3000",
    recurrence: "pontual",
    strengths: ["tecnico", "operacoes"],
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "servico",
    revenueModel:
      "Diagnóstico pago que é abatido na reparação + preço por tipo de intervenção. A peça é custo direto, com margem declarada.",
    firstCustomerPath: [
      "Escolher duas famílias de equipamento e recusar tudo o resto durante três meses.",
      "Medir o tempo real por reparação, incluindo o que se perde à espera de peças.",
      "Fixar o diagnóstico pago desde o primeiro dia — é o que filtra quem nunca ia reparar.",
    ],
    criticalRequirements: [
      "Direito à reparação e regras de garantia sobre a intervenção",
      "Tratamento de dados pessoais do equipamento e destruição segura quando pedida",
      "Encaminhamento de resíduos de equipamento elétrico e eletrónico",
    ],
    falsificationTest:
      "Parar se o rácio entre orçamentos dados e reparações aceites não cobrir o tempo de diagnóstico, ou se a espera por peças tornar o prazo impossível de cumprir.",
    evidenceNote:
      "Sem série própria ligada. Não há em Portugal estatística pública de reparações; existe recolha de resíduos de equipamento eletrónico, que mede o oposto — o que se deitou fora em vez do que se reparou.",
    evidencePlan: [
      {
        source: "APA — resíduos de equipamentos elétricos e eletrónicos",
        purpose:
          "Contexto do volume de equipamento em fim de vida por região. Mede descarte, não reparação: é quase o inverso do sinal que faria falta.",
        url: "https://apambiente.pt/",
        status: "license-review",
      },
      VALIDACAO_LOCAL,
    ],
  },
  {
    id: "ev-charging-install",
    title: "Instalação e manutenção de carregamento elétrico",
    promise:
      "Do quadro ao carregador, com certificação, ligação à rede e o que fazer quando avaria.",
    customer:
      "Condomínios, frotas pequenas e proprietários que compraram o carro antes de resolver onde o carregam.",
    problem:
      "A instalação parece um ponto de tomada e é um projeto elétrico: potência contratada, quadro, proteções e, num condomínio, uma deliberação.",
    sector: "tecnico",
    icon: "Plug",
    // A instalação é presencial; a potência contratada, a deliberação do
    // condomínio e a papelada com o operador de rede não são — e ocupam
    // mais dias do que a obra.
    delivery: ["local", "hibrido"],
    regions: ["portugal"],
    capital: "mais-3000",
    recurrence: "pontual",
    strengths: ["tecnico", "operacoes", "comercial"],
    // Instalação elétrica com certificação e responsabilidade técnica.
    // Não é uma preferência de estrutura: é o que a atividade exige.
    structures: ["empresa"],
    pricingScenario: "projeto",
    revenueModel:
      "Projeto fechado por instalação + contrato de manutenção anual. A manutenção é o que transforma isto num negócio e não numa sequência de obras.",
    firstCustomerPath: [
      "Fechar a parceria com quem certifica antes de vender a primeira instalação.",
      "Fazer três instalações em contextos diferentes — moradia, condomínio, frota — e medir o que correu mal em cada.",
      "Vender manutenção só depois de saberes o que avaria.",
    ],
    criticalRequirements: [
      "Habilitação e certificação de instalador elétrico e responsabilidade técnica",
      "Regras de instalação em condomínio e deliberação de assembleia",
      "Seguro de responsabilidade civil compatível com trabalho em instalações elétricas",
    ],
    falsificationTest:
      "Rejeitar se o ciclo de decisão do condomínio exceder o que a tesouraria aguenta, ou se a manutenção não for contratada por metade dos clientes instalados.",
    evidenceNote:
      "Sem série própria ligada. Há contagens públicas de pontos de carregamento e de veículos elétricos por região — seriam um bom par procura/oferta — mas nenhuma está publicada com licença de reutilização confirmada.",
    evidencePlan: [
      {
        source: "MOBI.E — pontos de carregamento por concelho",
        purpose:
          "Contagem de pontos existentes por zona: seria o primeiro sinal de OFERTA do motor. Licença de reutilização por confirmar.",
        url: "https://www.mobie.pt/",
        status: "license-review",
      },
      {
        source: "ACAP / IMT — veículos ligeiros elétricos por distrito",
        purpose:
          "Parque de veículos elétricos por zona: o lado da procura. Publicação e licença por confirmar.",
        url: "https://www.imt-ip.pt/",
        status: "license-review",
      },
      VALIDACAO_LOCAL,
    ],
  },
  {
    id: "industrial-maintenance-relief",
    title: "Manutenção preventiva para pequenas unidades de produção",
    promise:
      "Plano de manutenção, peças críticas em stock e intervenção antes da paragem, não depois.",
    customer:
      "Oficinas, panificadoras, pequenas fábricas e unidades agroalimentares sem manutenção própria.",
    problem:
      "A manutenção só existe quando algo pára. O custo real não é a reparação — é o dia de produção perdido.",
    sector: "tecnico",
    icon: "Settings",
    delivery: ["local"],
    regions: ["portugal"],
    capital: "mais-3000",
    recurrence: "recorrente",
    // Uma avença de manutenção preventiva não se compra: vende-se, contra
    // o hábito de só chamar alguém quando já parou. A parte comercial é
    // metade do trabalho, e é a que costuma faltar a quem é bom técnico.
    strengths: ["tecnico", "operacoes", "comercial"],
    // Um técnico habilitado sozinho faz isto a recibos verdes, e muitos
    // fazem. A sociedade entra quando há segunda pessoa e turnos, não por
    // causa do equipamento.
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "servico",
    revenueModel:
      "Avença anual por unidade com visitas programadas + intervenção urgente a preço declarado. A urgência não pode ser o modelo de receita.",
    firstCustomerPath: [
      "Escolher UM tipo de equipamento e conhecê-lo melhor do que o fabricante local.",
      "Oferecer um levantamento pago a cinco unidades e mostrar-lhes o custo de uma paragem.",
      "Vender a primeira avença com âmbito curto e prazo de resposta escrito.",
    ],
    criticalRequirements: [
      "Habilitações e certificações do equipamento em que se intervém",
      "Seguro de responsabilidade civil e de danos ao equipamento",
      "Regras de segurança e trabalho em instalações de terceiros",
    ],
    falsificationTest:
      "Parar se as unidades preferirem continuar a pagar reparações urgentes, ou se o prazo de resposta contratado obrigar a uma disponibilidade que o preço não paga.",
    evidenceNote:
      "Sem série própria ligada. O número de unidades industriais por zona e setor existe no INE por CAE, e é o sinal certo — mas a série por CAE ainda não está ligada ao motor, e sem ela o cartão não mostra contagem nenhuma.",
    evidencePlan: [
      {
        source: "INE — Empresas por localização geográfica e atividade económica",
        purpose:
          "Contar unidades do setor na zona: o universo de clientes possíveis. Indicador exato e licença por confirmar antes de ligar.",
        url: "https://www.ine.pt/xportal/xmain?xpid=INE&xpgid=ine_base_dados",
        status: "planned",
      },
      {
        source: "INE — Sistema de contas integradas das empresas (0014044)",
        purpose:
          "Dimensionar pessoal ao serviço em pequenas unidades por zona. Já ligado a outra hipótese; falta o corte por atividade que esta pede.",
        url: "https://www.ine.pt/xurl/indx/0014044/PT",
        status: "planned",
      },
      VALIDACAO_LOCAL,
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  DIGITAL E CONTEÚDO
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "niche-content-operations",
    title: "Operação de conteúdo para um nicho profissional",
    promise:
      "Publicação regular, biblioteca reutilizável e um público que se pode contactar sem depender de plataformas.",
    customer:
      "Profissionais e pequenas marcas com conhecimento a sério e nenhuma rotina de publicação.",
    problem:
      "Publicar sem sistema esgota. O que falta não é ideia: é calendário, reaproveitamento e alguém a manter o ritmo.",
    sector: "digital",
    icon: "PenLine",
    delivery: ["remoto"],
    regions: ["portugal"],
    capital: "500-3000",
    recurrence: "recorrente",
    strengths: ["comercial", "digital", "operacoes"],
    structures: ["recibos-verdes"],
    pricingScenario: "produto_digital",
    revenueModel:
      "Avença mensal por cliente com número de peças acordado + licenciamento da biblioteca produzida. O que se vende é a rotina, não a inspiração.",
    firstCustomerPath: [
      "Escolher um nicho onde saibas distinguir uma peça boa de uma peça bonita.",
      "Manter três meses de publicação para UM cliente pago antes de aceitar o segundo.",
      "Medir a lista de contactos que a operação construiu, não o alcance das publicações.",
    ],
    criticalRequirements: [
      "Direitos de imagem e de utilização do conteúdo produzido, por escrito",
      "Identificação de conteúdo comercial e publicidade quando aplicável",
      "Consentimento e base legal da lista de contactos construída",
    ],
    falsificationTest:
      "Abandonar se, ao fim de três meses, a operação não produzir contactos diretos que o cliente consiga usar — alcance sem lista não é resultado.",
    evidenceNote:
      "Sem série própria ligada, e sem candidata credível: não há estatística pública portuguesa que meça procura por operação de conteúdo. A prova tem de vir de clientes que pagam, e o cartão diz isso à cara.",
    evidencePlan: [VALIDACAO_LOCAL],
  },
  {
    id: "data-cleanup-migration",
    title: "Limpeza e migração de dados entre sistemas",
    promise:
      "Dados que chegam ao sistema novo sem duplicados, sem perdas e com o que ficou de fora listado.",
    customer:
      "Empresas a mudar de software que descobriram que ninguém quer assumir os dados antigos.",
    problem:
      "O fornecedor novo migra o que consegue; o antigo já não responde. O que se perde no meio só aparece meses depois.",
    sector: "digital",
    icon: "Cloud",
    delivery: ["remoto"],
    regions: ["portugal"],
    capital: "ate-500",
    recurrence: "pontual",
    strengths: ["tecnico", "digital"],
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "projeto",
    revenueModel:
      "Preço por projeto com levantamento pago à cabeça. O levantamento é obrigatório: orçamentar uma migração sem ver os dados é adivinhar.",
    firstCustomerPath: [
      "Especializar-se num par de sistemas concreto, não em «migração de dados».",
      "Fazer duas migrações com relatório de exceções e mostrar o que ficou de fora.",
      "Cobrar o levantamento sempre, mesmo quando a migração não avança.",
    ],
    criticalRequirements: [
      "Contrato de subcontratante RGPD e regras de acesso a dados de clientes finais",
      "Ambiente de teste e plano de reversão antes de qualquer escrita no sistema novo",
      "Relatório de exceções entregue ao cliente, com o que não migrou e porquê",
    ],
    falsificationTest:
      "Rejeitar se os clientes esperarem que a migração venha incluída no software novo, ou se o levantamento pago não for aceite em três propostas seguidas.",
    evidenceNote:
      "Sem série própria ligada. A adoção de software por classe de dimensão (Eurostat) é contexto nacional e não mede mudanças de sistema — que é o evento que cria este trabalho.",
    evidencePlan: [
      {
        source: "Eurostat — Digital Intensity Index (isoc_e_dii)",
        purpose:
          "Contexto nacional de adoção de ferramentas por classe de dimensão. Não conta migrações nem substituições de sistema.",
        url: "https://ec.europa.eu/eurostat/databrowser/view/isoc_e_dii/default/table?lang=en",
        status: "planned",
      },
      VALIDACAO_LOCAL,
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  TERRITÓRIO E PROXIMIDADE
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "island-remote-backoffice",
    title: "Apoio administrativo remoto a negócios das ilhas",
    promise:
      "Faturação, resposta a clientes, marcações e documentos tratados por quem conhece o contexto insular.",
    customer:
      "Pequenos negócios dos Açores e da Madeira sem escala para um administrativo a tempo inteiro.",
    problem:
      "Um negócio pequeno numa ilha tem o mesmo trabalho administrativo de um do continente e um mercado local muito menor para o repartir.",
    sector: "territorio",
    icon: "Globe",
    // O modelo depende mesmo de estar aqui: horário, contexto fiscal
    // próprio das regiões autónomas e conhecimento de quem é quem numa
    // ilha não são detalhes — são o serviço.
    regions: ["acores", "madeira"],
    delivery: ["remoto"],
    capital: "ate-500",
    recurrence: "recorrente",
    strengths: ["operacoes", "digital", "cuidado"],
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "servico",
    revenueModel:
      "Avença mensal por número de horas com teto declarado + hora extra a preço fixo. O teto é o que impede a avença de se transformar em emprego mal pago.",
    firstCustomerPath: [
      "Escolher um setor com sazonalidade forte, onde o pico administrativo é previsível.",
      "Fechar dois clientes com um mês pago e registar as horas reais, todas.",
      "Rever o teto de horas antes de vender o terceiro.",
    ],
    criticalRequirements: [
      "Taxas de IVA próprias dos Açores e da Madeira, quando aplicáveis",
      "Contrato de subcontratante RGPD para tratar dados dos clientes finais",
      "Teto de horas por avença, por escrito, com o que acontece ao ultrapassá-lo",
    ],
    falsificationTest:
      "Parar se as horas reais excederem o teto em dois meses seguidos sem o cliente aceitar rever o preço — é o sinal de que se está a vender emprego, não serviço.",
    evidenceNote:
      "Sem série própria ligada. As séries do INE por NUTS II cobrem as duas regiões autónomas e dimensionariam o universo de empresas, mas nenhuma mede tempo administrativo — que é o que aqui se vende.",
    evidencePlan: [
      {
        source: "INE — Demografia das empresas (0014098)",
        purpose:
          "Contar empresas nascidas nas duas regiões autónomas. Universo de clientes possíveis, não procura.",
        url: "https://www.ine.pt/xurl/indx/0014098/PT",
        status: "planned",
      },
      VALIDACAO_LOCAL,
    ],
  },
  {
    id: "rural-proximity-services",
    title: "Serviços de proximidade em territórios de baixa densidade",
    promise:
      "Compras, farmácia, tratar de papéis e levar a consultas — com rota fixa e alguém de confiança.",
    customer:
      "Famílias com pessoas idosas a viver longe, e freguesias onde o serviço mais próximo fica a trinta quilómetros.",
    problem:
      "A distância transforma tarefas simples num dia inteiro. Quem podia ajudar já não vive lá — e quem vive não tem transporte.",
    sector: "territorio",
    icon: "MapPin",
    // Só faz sentido onde a densidade é baixa e a distância aos serviços é
    // o problema. Nas áreas metropolitanas isto é outra coisa qualquer.
    regions: ["alentejo", "centro"],
    delivery: ["local"],
    capital: "ate-500",
    recurrence: "recorrente",
    strengths: ["cuidado", "operacoes", "comercial"],
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "servico",
    revenueModel:
      "Avença mensal por pessoa acompanhada, com rota fixa semanal. Quem paga costuma ser família que vive longe, e é a essa que se vende.",
    firstCustomerPath: [
      "Desenhar uma rota que passe por três freguesias no mesmo dia e testá-la vazia.",
      "Falar com juntas de freguesia e farmácias — sabem quem precisa antes de qualquer anúncio.",
      "Vender à família que vive longe, não à pessoa que fica.",
    ],
    criticalRequirements: [
      "Limite claro face a apoio domiciliário licenciado, que tem regras próprias",
      "Seguro de responsabilidade civil e regras para dinheiro e documentos de terceiros",
      "Transporte de passageiros só dentro do que a lei permite a quem não é operador",
    ],
    falsificationTest:
      "Rejeitar se a rota não conseguir densidade para cobrir combustível e tempo, ou se as famílias esperarem que isto seja apoio social gratuito.",
    evidenceNote:
      "Sem série própria ligada. O índice de envelhecimento por NUTS II já é lido pelo motor noutra hipótese e dimensionaria o universo, mas ao nível de NUTS II esconde exatamente o que aqui importa: a diferença entre uma sede de concelho e uma freguesia a trinta quilómetros.",
    evidencePlan: [
      {
        source: "INE — Índice de envelhecimento (0012909)",
        purpose:
          "Dimensionar a população idosa por zona. A NUTS II é grosseira de mais para esta decisão, e é preciso dizê-lo.",
        url: "https://www.ine.pt/xurl/indx/0012909/PT",
        status: "planned",
      },
      {
        source: "INE — Densidade populacional por concelho",
        purpose:
          "Identificar territórios de baixa densidade ao nível que decide a rota. Por ligar.",
        url: "https://www.ine.pt/xportal/xmain?xpid=INE&xpgid=ine_base_dados",
        status: "planned",
      },
      VALIDACAO_LOCAL,
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  ALIMENTAR E PRODUÇÃO
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "local-food-production",
    title: "Produção alimentar de pequena escala em cozinha licenciada",
    promise:
      "Um produto só, feito bem, com rótulo conforme e escoamento acordado antes de produzir.",
    customer:
      "Mercearias, cafés e mercados locais que querem um produto com origem e não conseguem comprá-lo em pequena quantidade.",
    problem:
      "Produzir é a parte que se domina. O que trava é o licenciamento, a rotulagem e o escoamento — e é aí que a maioria pára.",
    sector: "alimentar",
    icon: "ChefHat",
    delivery: ["local", "hibrido"],
    regions: ["portugal"],
    capital: "mais-3000",
    recurrence: "recorrente",
    strengths: ["operacoes", "tecnico", "comercial"],
    // Cozinha licenciada, HACCP e responsabilidade por segurança
    // alimentar. Não há aqui uma versão «a recibos verdes» que seja legal
    // e sustentável ao mesmo tempo.
    structures: ["empresa"],
    pricingScenario: "produto_proprio",
    revenueModel:
      "Preço por unidade a revendedores, com escalões por quantidade. A venda direta ao consumidor é margem melhor e volume pior: as duas coexistem, com preços diferentes.",
    firstCustomerPath: [
      "Fechar dois pontos de escoamento por escrito antes de licenciar o que quer que seja.",
      "Produzir em cozinha licenciada alugada até o volume justificar a própria.",
      "Calcular o preço com a perda real de produção, não com a receita ideal.",
    ],
    criticalRequirements: [
      "Licenciamento do espaço e sistema HACCP implementado",
      "Rotulagem conforme: ingredientes, alergénios, lote e durabilidade",
      "Rastreabilidade e regras de recolha do produto em caso de problema",
    ],
    falsificationTest:
      "Não avançar se os dois pontos de escoamento não confirmarem quantidade e preço por escrito — uma prateleira prometida em conversa não paga uma cozinha.",
    evidenceNote:
      "Sem série própria ligada. Há estatísticas de produção agroalimentar e de consumo, mas nenhuma responde à única pergunta que importa aqui: quantas prateleiras locais estão dispostas a comprar em pequena quantidade.",
    evidencePlan: [
      {
        source: "INE — Empresas por localização geográfica e atividade económica",
        purpose:
          "Contar unidades de comércio alimentar por zona: os pontos de escoamento possíveis. Indicador e licença por confirmar.",
        url: "https://www.ine.pt/xportal/xmain?xpid=INE&xpgid=ine_base_dados",
        status: "planned",
      },
      VALIDACAO_LOCAL,
    ],
  },
] as const);
