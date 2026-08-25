// ═══════════════════════════════════════════════════════════════════════
//  PROBLEMAS — o que dói a alguém, e porquê
//  ---------------------------------------------------------------------
//  Esta é a camada que separa este motor de um catálogo. Aqui não há
//  negócios: há PROBLEMAS económicos, com quem os tem, o que os provoca, e
//  que capacidades os conseguem atacar. O negócio nasce depois, no
//  gerador, da combinação problema × modelo × entrega × zona — e por isso
//  uma combinação que ninguém escreveu pode aparecer.
//
//  ── AS REGRAS DE ESCRITA ───────────────────────────────────────────
//   · `enunciado` descreve o problema do ponto de vista de quem o tem.
//     «Falta um serviço de X» NÃO é um problema — é uma solução disfarçada.
//   · `procuraObservavel: false` é uma resposta frequente e legítima. Diz
//     que nenhuma fonte pública portuguesa mede isto, e é o que impede o
//     motor de prometer evidência que nunca vai ter.
//   · `regioes` é onde o PROBLEMA existe, nunca onde temos dados.
//   · `testeDeFalsificacao` tem de poder falhar mesmo. Um teste que
//     ninguém reprova não testa nada.
// ═══════════════════════════════════════════════════════════════════════
import type { Problema } from "../tipos";

const TODO_O_PAIS = ["portugal"] as const;

/**
 * A densidade não decide este problema.
 *
 * É a resposta normal e é uma afirmação, não uma omissão: restringir sem
 * razão diria que o problema é específico de um tipo de território, e
 * isso teria de ser sustentado.
 */
const TODOS_OS_TERRITORIOS = ["urbano", "suburbano", "rural"] as const;

export const PROBLEMAS: readonly Problema[] = Object.freeze([
  // ── TURISMO ───────────────────────────────────────────────────────
  {
    id: "picos-operacionais-alojamento",
    enunciado:
      "Quem gere alojamento turístico tem picos de trabalho que não justificam contratar ninguém a tempo inteiro.",
    porqueDoi:
      "Um check-in às onze da noite e uma máquina avariada ao domingo custam a quem não tem equipa — em tempo, em avaliações e em reservas perdidas.",
    setor: "turismo",
    clientes: [
      "Alojamentos independentes",
      "Pequenos gestores com poucas unidades",
    ],
    publicos: ["turistas", "empresas"],
    baseDeClientes: { tipo: "empresas", cae: ["55"] },
    mercado: "b2b",
    gatilhos: ["turismo", "sazonalidade", "escassez-de-tempo"],
    capacidades: [
      "limpar-e-repor",
      "operar-no-local",
      "receber-e-guiar",
      "rota-recolha-entrega",
    ],
    modelos: ["avenca", "hora", "lote-recorrente", "equipa-operacional"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: TODOS_OS_TERRITORIOS,
    ocorrenciasForaDeHoras: true,
    procuraFimDeSemana: true,
    sinais: ["tourism-occupancy", "tourism-new-companies"],
    regulacoes: ["seguro-responsabilidade", "rgpd-subcontratante"],
    recorrenciaNatural: "recorrente",
    sazonalidade: 2,
    riscosProprios: ["sazonalidade", "dependencia-clientes"],
    comoValidar: [
      "Escolher uma microzona alcançável em 20–30 minutos e listar os alojamentos que lá estão.",
      "Entrevistar dez operadores sobre ocorrências e horários reais, não sobre o serviço.",
      "Vender um piloto pago de 30 dias com limites explícitos.",
    ],
    testeDeFalsificacao:
      "Parar se dez operadores não relatarem ocorrências repetidas, ou se nenhum aceitar um piloto pago dentro do preço sustentável.",
    procuraObservavel: true,
  },
  {
    id: "visitante-sem-programa",
    enunciado:
      "Quem visita já escolheu a cidade e não sabe o que fazer além do que está no guia.",
    porqueDoi:
      "A oferta genérica é abundante e indistinta; o que é específico de um bairro, de um ofício ou de uma estação depende de alguém local o organizar.",
    setor: "turismo",
    clientes: [
      "Visitantes independentes",
      "Alojamentos que querem recomendar algo próprio",
    ],
    publicos: ["turistas"],
    baseDeClientes: {
      tipo: "nao-contavel",
      porque:
        "Quem paga é o visitante, e um visitante não é residente nem empresa. Nenhuma fonte pública o conta por concelho — as dormidas contam noites, não compradores de um passeio.",
    },
    mercado: "b2c",
    gatilhos: ["turismo", "sazonalidade"],
    capacidades: ["receber-e-guiar", "produzir-conteudo"],
    capacidadesEssenciais: ["receber-e-guiar"],
    modelos: ["hora", "venda-direta", "produto-digital"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: ["urbano", "rural"],
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: true,
    sinais: ["tourism-occupancy"],
    regulacoes: ["rnaat", "seguro-responsabilidade"],
    recorrenciaNatural: "pontual",
    sazonalidade: 3,
    riscosProprios: ["sazonalidade", "regulatorio", "concorrencia"],
    comoValidar: [
      "Escrever o roteiro que só tu podes dar e cronometrá-lo a sério.",
      "Fazer três sessões pagas com desconhecidos, não com amigos.",
      "Levar a versão corrigida a cinco alojamentos e medir quantos encaminham.",
    ],
    testeDeFalsificacao:
      "Parar se, depois de três sessões pagas, ninguém recomendar espontaneamente e a taxa de reserva por alojamento contactado não cobrir o preço sustentável.",
    procuraObservavel: true,
  },
  {
    id: "produtor-sem-lado-comercial",
    enunciado:
      "Quem produz não tem tempo para responder a pedidos, organizar visitas e manter a loja.",
    porqueDoi:
      "É no lado comercial que a margem do enoturismo e da venda direta se perde — e é a parte que quem trabalha na produção não consegue fazer ao mesmo tempo.",
    setor: "turismo",
    clientes: [
      "Pequenos produtores com prova aberta ao público",
      "Quintas com venda direta",
    ],
    publicos: ["turistas", "empresas"],
    baseDeClientes: {
      tipo: "empresas",
      cae: ["01", "11"],
      ressalva:
        "A divisão 01 é a agricultura inteira e a 11 são todas as bebidas; só uma fração tem prova aberta ao público.",
    },
    mercado: "b2b",
    gatilhos: ["turismo", "escassez-de-tempo"],
    capacidades: [
      "organizar-processos",
      "receber-e-guiar",
      "produzir-conteudo",
      "vender-para-empresas",
    ],
    capacidadesEssenciais: [
      "organizar-processos",
      "receber-e-guiar",
      "vender-para-empresas",
    ],
    modelos: ["avenca", "loja-online", "projeto"],
    naturezas: ["servico"],
    regioes: ["norte", "centro", "alentejo"],
    territoriosIntensos: ["suburbano", "rural"],
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: true,
    sinais: ["tourism-occupancy"],
    regulacoes: ["seguro-responsabilidade"],
    recorrenciaNatural: "recorrente",
    sazonalidade: 2,
    riscosProprios: ["sazonalidade", "dependencia-clientes"],
    comoValidar: [
      "Visitar dez produtores em época baixa, quando há tempo para conversar.",
      "Medir quantos pedidos ficam sem resposta numa semana real.",
      "Vender um mês pago a tratar só das reservas, antes de propor mais.",
    ],
    testeDeFalsificacao:
      "Rejeitar se os pedidos sem resposta forem residuais, ou se os produtores preferirem fechar a prova ao público a pagar por quem a organize.",
    procuraObservavel: false,
  },

  // ── EMPRESAS ──────────────────────────────────────────────────────
  {
    id: "processos-dispersos-micro",
    enunciado:
      "Microempresas têm pedidos, propostas e cobranças espalhados por WhatsApp, email e folhas de cálculo.",
    porqueDoi:
      "Perde-se tempo a procurar o que já foi decidido, e perdem-se vendas que ficaram por responder. As ferramentas existem; falta quem traduza o processo.",
    setor: "empresas",
    clientes: ["Micro e pequenas empresas", "Profissionais com equipa pequena"],
    publicos: ["empresas"],
    baseDeClientes: {
      tipo: "empresas",
      cae: ["TOT"],
      ressalva:
        "É o total de empresas do concelho: inclui as que já têm processos arrumados.",
    },
    mercado: "b2b",
    gatilhos: ["digitalizacao", "crescimento", "escassez-de-tempo"],
    capacidades: [
      "montar-ferramentas-digitais",
      "organizar-processos",
      "vender-para-empresas",
    ],
    capacidadesEssenciais: [
      "montar-ferramentas-digitais",
      "organizar-processos",
    ],
    modelos: ["projeto", "avenca"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: TODOS_OS_TERRITORIOS,
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: [
      "digital-intensity-micro",
      "digital-intensity-small",
      "sme-new-sole-traders",
      "sme-new-companies",
    ],
    regulacoes: ["rgpd-subcontratante"],
    recorrenciaNatural: "recorrente",
    sazonalidade: 0,
    riscosProprios: ["procura", "concorrencia"],
    comoValidar: [
      "Escolher um único setor e um processo caro e repetitivo.",
      "Mapear o processo de cinco empresas sem propor software nenhum.",
      "Vender uma implementação curta com métrica antes e depois.",
    ],
    testeDeFalsificacao:
      "Rejeitar se o processo não consumir tempo mensurável, ou se cinco decisores não pagarem sequer pelo diagnóstico.",
    procuraObservavel: true,
  },
  {
    id: "equipa-comercial-sem-lista",
    enunciado:
      "Equipas comerciais pequenas gastam metade da semana a procurar com quem falar em vez de falar.",
    porqueDoi:
      "Comprar bases de contactos é barato e quase sempre inutilizável; construir a lista certa é lento e ninguém tem tempo para o fazer bem.",
    setor: "empresas",
    clientes: [
      "Equipas comerciais de duas a dez pessoas",
      "Consultores independentes",
    ],
    publicos: ["empresas"],
    baseDeClientes: {
      tipo: "empresas",
      cae: ["TOT"],
      ressalva:
        "É o total de empresas do concelho, e só uma parte tem equipa comercial própria.",
    },
    mercado: "b2b",
    gatilhos: ["crescimento", "escassez-de-tempo"],
    capacidades: [
      "tratar-dados",
      "organizar-processos",
      "vender-para-empresas",
    ],
    capacidadesEssenciais: ["tratar-dados", "vender-para-empresas"],
    modelos: ["avenca", "lote-recorrente"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: ["urbano", "suburbano"],
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: ["sme-new-companies"],
    regulacoes: ["rgpd-subcontratante"],
    recorrenciaNatural: "recorrente",
    sazonalidade: 0,
    riscosProprios: ["regulatorio", "concorrencia"],
    comoValidar: [
      "Escolher um setor onde saibas distinguir uma empresa elegível de uma parecida.",
      "Entregar um lote pequeno pago a três equipas e medir a taxa de resposta que produz.",
      "Fixar o critério por escrito antes de vender o segundo lote.",
    ],
    testeDeFalsificacao:
      "Parar se os lotes não melhorarem a taxa de resposta face ao que a equipa fazia sozinha, ou se o cliente só aceitar pagar por volume.",
    procuraObservavel: false,
  },
  {
    id: "comercio-local-sem-canal",
    enunciado:
      "Comércio local tem clientes fiéis na rua e nenhuma presença que aguente uma encomenda.",
    porqueDoi:
      "Abrir a loja online é o passo fácil. O que falha é a operação — stock desatualizado, envios sem regra e fotografias que não vendem.",
    setor: "comercio",
    clientes: [
      "Lojas de rua",
      "Produtores com venda direta",
      "Mercados municipais",
    ],
    publicos: ["empresas", "familias"],
    baseDeClientes: { tipo: "empresas", cae: ["47"] },
    mercado: "b2b",
    gatilhos: ["digitalizacao", "crescimento"],
    // Fotografia e marketing atacam este problema por vias diferentes e
    // ambas reais: sem imagem que venda não há loja online que converta,
    // e sem quem ponha o negócio a aparecer não há quem chegue à loja.
    capacidades: [
      "montar-ferramentas-digitais",
      "produzir-conteudo",
      "organizar-processos",
      "atender-balcao",
      "registar-em-imagem",
      "atrair-clientes",
    ],
    capacidadesEssenciais: [
      "montar-ferramentas-digitais",
      "produzir-conteudo",
      "atender-balcao",
      "registar-em-imagem",
      "atrair-clientes",
    ],
    modelos: ["loja-online", "projeto", "avenca"],
    naturezas: ["servico", "comercio"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: TODOS_OS_TERRITORIOS,
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: ["digital-intensity-micro", "sme-new-sole-traders"],
    regulacoes: ["comercio-eletronico", "rgpd-subcontratante"],
    recorrenciaNatural: "recorrente",
    sazonalidade: 1,
    riscosProprios: ["procura", "dependencia-clientes"],
    comoValidar: [
      "Escolher uma rua ou um mercado e falar com dez lojistas sobre o que já tentaram.",
      "Montar uma loja completa para um deles, paga, com prazo curto e catálogo limitado.",
      "Medir encomendas em oito semanas antes de vender a segunda.",
    ],
    testeDeFalsificacao:
      "Abandonar se, ao fim de oito semanas, as encomendas não cobrirem a avença — ou se o lojista deixar de atualizar o stock.",
    procuraObservavel: true,
  },
  {
    id: "reforco-imprevisivel-hotelaria",
    enunciado:
      "Restauração e hotelaria precisam de reforço previsível ao fim de semana e o informal falha quando é preciso.",
    porqueDoi:
      "Quem falta não é substituído, e o cliente fica a descoberto num sábado — que é precisamente o dia que paga a semana.",
    setor: "empresas",
    clientes: ["Hotéis e restaurantes", "Organizadores de eventos"],
    publicos: ["empresas", "turistas"],
    baseDeClientes: { tipo: "empresas", cae: ["55", "56"] },
    mercado: "b2b",
    gatilhos: ["sazonalidade", "escassez-de-pessoas"],
    capacidades: ["gerir-operacao", "atender-balcao", "limpar-e-repor"],
    capacidadesEssenciais: ["gerir-operacao"],
    modelos: ["equipa-operacional", "contrato-anual"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: ["urbano", "suburbano"],
    ocorrenciasForaDeHoras: true,
    procuraFimDeSemana: true,
    sinais: ["tourism-occupancy"],
    regulacoes: ["cedencia-trabalhadores", "acidentes-trabalho", "haccp"],
    recorrenciaNatural: "contratos",
    sazonalidade: 3,
    riscosProprios: ["financeiro", "operacional", "sazonalidade"],
    comoValidar: [
      "Fechar dois clientes âncora com necessidade previsível antes de recrutar quem quer que seja.",
      "Formar um núcleo pequeno e cobrir quatro fins de semana seguidos sem falhar um.",
      "Só depois vender ao terceiro cliente.",
    ],
    testeDeFalsificacao:
      "Parar se a margem por hora não sobreviver ao custo real do trabalho, ou se a taxa de faltas obrigar a manter mais gente parada do que a operar.",
    procuraObservavel: true,
  },
  {
    id: "pme-fora-dos-concursos",
    enunciado:
      "Pequenas empresas capazes de entregar não têm rotina para acompanhar concursos públicos.",
    porqueDoi:
      "A informação é pública, mas a triagem e a preparação documental consomem dias — e falha-se por processo, não por incapacidade.",
    setor: "publico",
    clientes: [
      "Pequenas empresas com capacidade de entrega",
      "Prestadores de serviços a autarquias",
    ],
    publicos: ["empresas", "setor-publico"],
    baseDeClientes: {
      tipo: "empresas",
      cae: ["TOT"],
      ressalva:
        "É o total de empresas do concelho; só uma fração tem capacidade de entrega para concursos públicos.",
    },
    mercado: "b2g",
    gatilhos: ["compra-publica", "obrigacao-legal"],
    capacidades: ["tratar-requisitos-formais", "organizar-processos"],
    capacidadesEssenciais: ["tratar-requisitos-formais"],
    modelos: ["avenca", "projeto"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: TODOS_OS_TERRITORIOS,
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: [
      "tender-open-procedures",
      "tender-service-contracts",
      "tender-small-employers",
      "tender-new-companies",
    ],
    regulacoes: ["rgpd-subcontratante"],
    recorrenciaNatural: "recorrente",
    sazonalidade: 1,
    riscosProprios: ["regulatorio", "dependencia-clientes"],
    comoValidar: [
      "Escolher dois códigos CPV e uma região.",
      "Medir quantos avisos realmente elegíveis surgem em 30 dias.",
      "Vender uma triagem paga antes de automatizar o radar.",
    ],
    testeDeFalsificacao:
      "Rejeitar o nicho se não houver procedimentos elegíveis recorrentes, ou se as empresas não valorizarem a poupança de tempo acima do preço sustentável.",
    procuraObservavel: true,
  },
  {
    id: "sistemas-a-mudar-sem-dados",
    enunciado:
      "Empresas que mudam de software descobrem que ninguém quer assumir os dados antigos.",
    porqueDoi:
      "O fornecedor novo migra o que consegue, o antigo já não responde, e o que se perde no meio só aparece meses depois.",
    setor: "digital",
    clientes: [
      "Empresas em mudança de sistema",
      "Fornecedores de software sem equipa de migração",
    ],
    publicos: ["empresas"],
    baseDeClientes: {
      tipo: "empresas",
      cae: ["TOT"],
      ressalva:
        "É o total de empresas do concelho, e só as que mudam de sistema num dado ano têm o problema.",
    },
    mercado: "b2b",
    gatilhos: ["digitalizacao"],
    capacidades: ["tratar-dados", "construir-software"],
    capacidadesEssenciais: ["tratar-dados", "construir-software"],
    modelos: ["projeto"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: TODOS_OS_TERRITORIOS,
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: ["digital-intensity-small"],
    regulacoes: ["rgpd-subcontratante"],
    recorrenciaNatural: "pontual",
    sazonalidade: 0,
    riscosProprios: ["procura", "volatilidade"],
    comoValidar: [
      "Especializar-se num par de sistemas concreto, não em «migração de dados».",
      "Fazer duas migrações com relatório de exceções e mostrar o que ficou de fora.",
      "Cobrar o levantamento sempre, mesmo quando a migração não avança.",
    ],
    testeDeFalsificacao:
      "Rejeitar se os clientes esperarem que a migração venha incluída no software novo, ou se o levantamento pago não for aceite em três propostas seguidas.",
    procuraObservavel: true,
  },

  // ── PESSOAS E FAMÍLIAS ────────────────────────────────────────────
  {
    id: "barreira-digital-idosos",
    enunciado:
      "Serviços essenciais passaram a ser digitais e há quem não consiga usá-los sozinho.",
    porqueDoi:
      "A disponibilidade não elimina a barreira de uso, de confiança e de segurança — e quem fica de fora perde acesso a marcações, apoios e dinheiro.",
    setor: "pessoas",
    clientes: ["Famílias que apoiam pessoas com baixa confiança digital"],
    publicos: ["idosos", "familias"],
    baseDeClientes: { tipo: "residentes" },
    mercado: "b2c",
    gatilhos: ["envelhecimento", "digitalizacao"],
    capacidades: [
      "acompanhar-pessoas",
      "ensinar-e-treinar",
      "instalar-configurar",
    ],
    capacidadesEssenciais: ["acompanhar-pessoas", "ensinar-e-treinar"],
    modelos: ["hora", "avenca"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: TODOS_OS_TERRITORIOS,
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: [
      "digital-skills-senior",
      "digital-skills-total",
      "senior-ageing-index",
    ],
    regulacoes: ["seguro-responsabilidade"],
    recorrenciaNatural: "recorrente",
    sazonalidade: 0,
    riscosProprios: ["procura", "operacional"],
    comoValidar: [
      "Entrevistar familiares pagadores, não presumir que o utilizador final compra.",
      "Definir tarefas permitidas e proibidas antes do primeiro serviço.",
      "Testar três sessões pagas com acompanhamento e checklist de segurança.",
    ],
    testeDeFalsificacao:
      "Parar se as famílias não aceitarem pagar pelo acompanhamento, ou se a responsabilidade necessária exceder o seguro e o âmbito do serviço.",
    procuraObservavel: true,
  },
  {
    id: "horas-entre-escola-e-trabalho",
    enunciado:
      "As horas entre o fim das aulas e o fim do trabalho são o problema logístico mais caro de uma família.",
    porqueDoi:
      "Não há resposta suficiente fora dos grandes centros, e a alternativa é alguém deixar de trabalhar ou pagar a quem estiver disponível.",
    setor: "educacao",
    clientes: ["Famílias com horários incompatíveis com o da escola"],
    publicos: ["criancas", "familias"],
    baseDeClientes: { tipo: "residentes" },
    mercado: "b2c",
    gatilhos: ["escassez-de-tempo"],
    capacidades: ["acompanhar-pessoas", "ensinar-e-treinar", "gerir-operacao"],
    capacidadesEssenciais: ["acompanhar-pessoas"],
    modelos: ["espaco-proprio", "avenca"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: ["urbano", "suburbano"],
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: [],
    regulacoes: [
      "licenca-espaco-menores",
      "registo-criminal-menores",
      "acidentes-trabalho",
    ],
    recorrenciaNatural: "recorrente",
    sazonalidade: 2,
    riscosProprios: ["regulatorio", "financeiro", "sazonalidade"],
    comoValidar: [
      "Falar com a direção de duas escolas e perceber a saída real, não a do horário.",
      "Reunir uma lista de espera assinada antes de arrendar o que quer que seja.",
      "Abrir com um grupo pequeno e um programa que caiba nas pessoas que tens.",
    ],
    testeDeFalsificacao:
      "Não avançar se a lista de espera assinada não cobrir o ponto de equilíbrio do primeiro trimestre — procura declarada em conversa não paga renda.",
    procuraObservavel: false,
  },
  {
    id: "animal-sozinho-o-dia-todo",
    enunciado:
      "Quem trabalha fora todo o dia tem um animal que não pode esperar por ninguém.",
    porqueDoi:
      "O serviço existe por aplicação, mas quem tem um animal ansioso quer a mesma pessoa, à mesma hora — não a próxima disponível.",
    setor: "pessoas",
    clientes: ["Trabalhadores com horário fixo e animal em casa"],
    publicos: ["animais", "familias"],
    baseDeClientes: { tipo: "residentes" },
    mercado: "b2c",
    gatilhos: ["escassez-de-tempo"],
    capacidades: ["cuidar-animais", "rota-recolha-entrega"],
    capacidadesEssenciais: ["cuidar-animais"],
    modelos: ["avenca", "hora"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: ["urbano", "suburbano"],
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: [],
    regulacoes: ["siac", "seguro-responsabilidade"],
    recorrenciaNatural: "recorrente",
    sazonalidade: 1,
    riscosProprios: ["operacional", "concorrencia"],
    comoValidar: [
      "Desenhar uma rota a pé que caiba numa hora e só depois procurar clientes dentro dela.",
      "Fechar quatro clientes na mesma rua antes de aceitar o quinto noutro sítio.",
      "Medir uma semana real, com chuva e com atrasos, antes de anunciar disponibilidade.",
    ],
    testeDeFalsificacao:
      "Parar se a rota não conseguir densidade para o preço sustentável — quatro clientes espalhados por uma cidade é um passatempo caro.",
    procuraObservavel: false,
  },
  {
    id: "lingua-para-o-trabalho",
    enunciado:
      "Adultos precisam de falar uma língua para o trabalho e desistiram de cursos que não cabem no horário.",
    porqueDoi:
      "Quem precisa de falar não precisa de mais um curso: precisa de prática frequente com correção, e isso é caro de organizar sozinho.",
    setor: "educacao",
    clientes: [
      "Profissionais que usam línguas no trabalho",
      "Empresas com equipas internacionais",
    ],
    publicos: ["profissionais", "empresas"],
    baseDeClientes: { tipo: "residentes" },
    mercado: "b2c",
    gatilhos: ["crescimento", "escassez-de-tempo"],
    capacidades: ["ensinar-e-treinar"],
    capacidadesEssenciais: ["ensinar-e-treinar"],
    modelos: ["hora", "produto-digital", "avenca"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: TODOS_OS_TERRITORIOS,
    ocorrenciasForaDeHoras: true,
    procuraFimDeSemana: false,
    sinais: [],
    regulacoes: [],
    recorrenciaNatural: "recorrente",
    sazonalidade: 1,
    riscosProprios: ["volatilidade", "concorrencia"],
    comoValidar: [
      "Escolher uma situação concreta — reuniões, entrevistas, atendimento — em vez de «inglês».",
      "Dar seis sessões pagas e medir quantos compram o segundo pack.",
      "Só subir o preço depois de a taxa de renovação se manter dois meses.",
    ],
    testeDeFalsificacao:
      "Rejeitar se menos de metade renovar o pack, ou se a agenda só encher a preços que não cobrem as horas de preparação.",
    procuraObservavel: false,
  },
  {
    id: "distancia-aos-servicos",
    enunciado:
      "Em territórios de baixa densidade, uma tarefa simples consome um dia inteiro por causa da distância.",
    porqueDoi:
      "Quem podia ajudar já não vive lá, e quem vive não tem transporte. A família que está longe paga para resolver, se houver quem resolva.",
    setor: "pessoas",
    clientes: [
      "Famílias com pessoas idosas a viver longe",
      "Juntas de freguesia e farmácias que conhecem os casos",
    ],
    publicos: ["idosos", "familias"],
    baseDeClientes: { tipo: "residentes" },
    mercado: "b2c",
    gatilhos: ["envelhecimento", "escassez-de-pessoas"],
    capacidades: [
      "transportar-pessoas",
      "acompanhar-pessoas",
      "operar-no-local",
    ],
    capacidadesEssenciais: ["transportar-pessoas"],
    modelos: ["avenca", "lote-recorrente"],
    naturezas: ["servico"],
    regioes: ["alentejo", "centro", "norte"],
    territoriosIntensos: ["rural"],
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: ["senior-ageing-index", "home-ageing-index"],
    regulacoes: ["seguro-responsabilidade", "transporte-passageiros"],
    recorrenciaNatural: "recorrente",
    sazonalidade: 0,
    riscosProprios: ["operacional", "regulatorio"],
    comoValidar: [
      "Desenhar uma rota que passe por três freguesias no mesmo dia e testá-la vazia.",
      "Falar com juntas de freguesia e farmácias — sabem quem precisa antes de qualquer anúncio.",
      "Vender à família que vive longe, não à pessoa que fica.",
    ],
    testeDeFalsificacao:
      "Rejeitar se a rota não conseguir densidade para cobrir combustível e tempo, ou se as famílias esperarem que isto seja apoio social gratuito.",
    procuraObservavel: true,
  },

  // ── CASA E PATRIMÓNIO ─────────────────────────────────────────────
  {
    id: "transicao-de-casa",
    enunciado:
      "Uma mudança, uma herança ou uma redução de casa concentra dezenas de tarefas em poucas semanas.",
    porqueDoi:
      "O cliente não precisa de mais um prestador isolado: precisa de quem coordene todos e responda por prazos.",
    setor: "casa",
    clientes: ["Famílias sem tempo local para coordenar prestadores"],
    publicos: ["familias", "idosos"],
    baseDeClientes: { tipo: "residentes" },
    mercado: "b2c",
    gatilhos: ["evento-de-vida", "envelhecimento"],
    capacidades: [
      "coordenar-fornecedores",
      "operar-no-local",
      "transporte-carga",
    ],
    capacidadesEssenciais: ["coordenar-fornecedores"],
    modelos: ["projeto", "intermediacao"],
    naturezas: ["servico", "intermediacao"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: TODOS_OS_TERRITORIOS,
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: ["home-transactions", "home-ageing-index"],
    regulacoes: ["seguro-responsabilidade"],
    recorrenciaNatural: "pontual",
    sazonalidade: 1,
    riscosProprios: ["volatilidade", "dependencia-clientes"],
    comoValidar: [
      "Escolher uma transição concreta e uma área geográfica curta.",
      "Entrevistar profissionais que já recebem pedidos desorganizados.",
      "Vender um diagnóstico antes de assumir toda a coordenação.",
    ],
    testeDeFalsificacao:
      "Parar se o cliente preferir contratar diretamente, ou se o custo de aquisição exceder a margem do projeto em três testes seguidos.",
    procuraObservavel: true,
  },
  {
    id: "orcamentos-de-obra-incomparaveis",
    enunciado:
      "Quem quer remodelar recebe três orçamentos incomparáveis e escolhe pelo preço.",
    porqueDoi:
      "A diferença aparece a meio da obra, quando já não há como voltar atrás — e ninguém quer passar seis meses a perseguir empreiteiros.",
    setor: "casa",
    clientes: ["Proprietários a remodelar", "Condomínios com obra a decidir"],
    publicos: ["familias"],
    baseDeClientes: { tipo: "residentes" },
    mercado: "b2c",
    gatilhos: ["evento-de-vida", "manutencao"],
    capacidades: ["coordenar-fornecedores", "executar-obra"],
    capacidadesEssenciais: ["coordenar-fornecedores", "executar-obra"],
    modelos: ["intermediacao", "projeto"],
    naturezas: ["intermediacao", "servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: TODOS_OS_TERRITORIOS,
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: ["home-transactions"],
    regulacoes: ["alvara-construcao", "seguro-responsabilidade"],
    recorrenciaNatural: "pontual",
    sazonalidade: 1,
    riscosProprios: ["regulatorio", "operacional", "volatilidade"],
    comoValidar: [
      "Construir a lista de empreiteiros ANTES do primeiro cliente — é o ativo, e demora meses.",
      "Coordenar uma obra pequena a fee reduzido e documentar tudo o que correu mal.",
      "Só vender a segunda depois de a primeira ter acabado, não a meio.",
    ],
    testeDeFalsificacao:
      "Parar se o fee de coordenação não sobreviver à negociação em três propostas seguidas, ou se os empreiteiros começarem a contornar-te depois do primeiro contacto.",
    procuraObservavel: true,
  },
  {
    id: "casa-cara-de-aquecer",
    enunciado:
      "Faturas altas e nenhuma informação sobre por que ordem compensa mudar alguma coisa.",
    porqueDoi:
      "As medidas são conhecidas; a ordem por que compensam não é. Sem números, a decisão adia-se mais um inverno.",
    setor: "casa",
    clientes: [
      "Proprietários com faturas altas",
      "Condomínios a adiar decisões",
    ],
    publicos: ["familias"],
    baseDeClientes: { tipo: "residentes" },
    mercado: "b2c",
    gatilhos: ["manutencao", "obrigacao-legal"],
    capacidades: [
      "instalar-configurar",
      "organizar-processos",
      "tratar-requisitos-formais",
    ],
    capacidadesEssenciais: ["instalar-configurar", "tratar-requisitos-formais"],
    modelos: ["projeto", "avenca"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: TODOS_OS_TERRITORIOS,
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: [],
    regulacoes: ["certificacao-energetica", "seguro-responsabilidade"],
    recorrenciaNatural: "pontual",
    sazonalidade: 2,
    riscosProprios: ["regulatorio", "procura"],
    comoValidar: [
      "Fazer cinco diagnósticos pagos a preço de custo e comparar o previsto com a fatura seis meses depois.",
      "Publicar o método, nunca os resultados de clientes.",
      "Procurar condomínios só depois de o relatório aguentar contestação técnica.",
    ],
    testeDeFalsificacao:
      "Rejeitar se a poupança prevista não se confirmar nas faturas de cinco casos, ou se o cliente só pagar quando o diagnóstico vem oferecido por quem instala.",
    procuraObservavel: false,
  },
  {
    id: "espacos-por-preparar-entre-usos",
    enunciado:
      "Espaços que mudam de ocupante têm de ficar prontos entre duas utilizações, em horas.",
    porqueDoi:
      "Uma limpeza atrasada custa uma reserva ou um arrendamento — e quem gere vários espaços não consegue estar em todos.",
    setor: "casa",
    clientes: [
      "Gestores de alojamento",
      "Escritórios partilhados",
      "Senhorios com vários imóveis",
    ],
    publicos: ["empresas", "turistas"],
    baseDeClientes: {
      tipo: "empresas",
      cae: ["55", "68"],
      ressalva:
        "A divisão 68 são as atividades imobiliárias inteiras, muito para além de quem gere espaços que mudam de ocupante.",
    },
    mercado: "b2b",
    gatilhos: ["turismo", "escassez-de-tempo", "manutencao"],
    capacidades: ["limpar-e-repor", "rota-recolha-entrega"],
    capacidadesEssenciais: ["limpar-e-repor"],
    modelos: ["lote-recorrente", "avenca", "equipa-operacional"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: ["urbano", "suburbano"],
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: true,
    sinais: ["tourism-occupancy"],
    regulacoes: ["seguro-responsabilidade", "acidentes-trabalho"],
    recorrenciaNatural: "recorrente",
    sazonalidade: 2,
    riscosProprios: ["sazonalidade", "concorrencia", "dependencia-clientes"],
    comoValidar: [
      "Cronometrar dez preparações reais antes de dar qualquer preço.",
      "Fechar três clientes na mesma zona para a rota fazer sentido.",
      "Medir quantas vezes o prazo falha num mês cheio.",
    ],
    testeDeFalsificacao:
      "Parar se o preço que o mercado aceita não cobrir o tempo real cronometrado, ou se a rota exigir mais deslocação do que trabalho.",
    procuraObservavel: true,
  },

  // ── TÉCNICO ───────────────────────────────────────────────────────
  {
    id: "equipamento-fora-de-garantia",
    enunciado:
      "Equipamento avaria fora de garantia e não há ninguém de confiança para o ver.",
    porqueDoi:
      "O orçamento chega tarde e quase iguala o preço de novo. Quem decide não tem informação para decidir, e deita fora o que dava para reparar.",
    setor: "tecnico",
    clientes: [
      "Pessoas com equipamento fora de garantia",
      "Microempresas sem contrato de assistência",
    ],
    publicos: ["familias", "empresas"],
    baseDeClientes: { tipo: "residentes" },
    mercado: "b2c",
    gatilhos: ["manutencao"],
    capacidades: ["reparar-equipamento"],
    capacidadesEssenciais: ["reparar-equipamento"],
    modelos: ["projeto", "hora"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: TODOS_OS_TERRITORIOS,
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: [],
    regulacoes: ["rgpd-subcontratante", "seguro-responsabilidade"],
    recorrenciaNatural: "pontual",
    sazonalidade: 0,
    riscosProprios: ["procura", "operacional"],
    comoValidar: [
      "Escolher duas famílias de equipamento e recusar tudo o resto durante três meses.",
      "Medir o tempo real por reparação, incluindo o que se perde à espera de peças.",
      "Fixar o diagnóstico pago desde o primeiro dia — é o que filtra quem nunca ia reparar.",
    ],
    testeDeFalsificacao:
      "Parar se o rácio entre orçamentos dados e reparações aceites não cobrir o tempo de diagnóstico, ou se a espera por peças tornar o prazo impossível.",
    procuraObservavel: false,
  },
  {
    id: "equipamento-comprado-por-configurar",
    enunciado: "Equipamento chega numa caixa e a instalação é presumida.",
    porqueDoi:
      "Quem não é técnico paga em horas e desiste a meio — e fica com metade do que comprou por usar.",
    setor: "tecnico",
    clientes: ["Famílias", "Pequenos escritórios"],
    publicos: ["familias", "empresas"],
    baseDeClientes: { tipo: "residentes" },
    mercado: "b2c",
    gatilhos: ["digitalizacao", "manutencao"],
    capacidades: ["instalar-configurar", "ensinar-e-treinar"],
    capacidadesEssenciais: ["instalar-configurar"],
    modelos: ["projeto", "hora"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: TODOS_OS_TERRITORIOS,
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: ["digital-skills-total"],
    regulacoes: ["habilitacao-eletrica", "seguro-responsabilidade"],
    recorrenciaNatural: "pontual",
    sazonalidade: 1,
    riscosProprios: ["operacional", "concorrencia"],
    comoValidar: [
      "Escolher dois tipos de instalação e cronometrar cada um em casa de desconhecidos.",
      "Fixar preço fechado — orçamento por hora afasta quem tem medo do valor final.",
      "Medir quantas revisitas gratuitas o preço aguenta antes de deixar de haver margem.",
    ],
    testeDeFalsificacao:
      "Abandonar se o tempo real por instalação exceder sistematicamente o orçamentado, ou se as revisitas consumirem a margem em três trabalhos seguidos.",
    procuraObservavel: true,
  },
  {
    id: "manutencao-so-quando-para",
    enunciado:
      "Pequenas unidades de produção só têm manutenção quando alguma coisa pára.",
    porqueDoi:
      "O custo real não é a reparação — é o dia de produção perdido, e esse não aparece em fatura nenhuma.",
    setor: "tecnico",
    clientes: [
      "Oficinas",
      "Panificadoras",
      "Pequenas fábricas",
      "Unidades agroalimentares",
    ],
    publicos: ["empresas"],
    baseDeClientes: {
      tipo: "nao-contavel",
      porque:
        "Os clientes são pequenas unidades de produção, espalhadas por vinte e quatro divisões da indústria transformadora. Contar só algumas daria uma base parcial com ar de total, e contar todas apanharia fábricas que têm manutenção própria.",
    },
    mercado: "b2b",
    gatilhos: ["manutencao", "escassez-de-pessoas"],
    capacidades: ["reparar-equipamento", "intervencao-eletrica"],
    capacidadesEssenciais: ["reparar-equipamento", "intervencao-eletrica"],
    modelos: ["contrato-anual", "avenca"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: ["suburbano", "rural"],
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: ["tender-small-employers"],
    regulacoes: [
      "seguro-responsabilidade",
      "habilitacao-eletrica",
      "acidentes-trabalho",
    ],
    recorrenciaNatural: "contratos",
    sazonalidade: 0,
    riscosProprios: ["operacional", "dependencia-clientes"],
    comoValidar: [
      "Escolher UM tipo de equipamento e conhecê-lo melhor do que o fabricante local.",
      "Oferecer um levantamento pago a cinco unidades e mostrar-lhes o custo de uma paragem.",
      "Vender a primeira avença com âmbito curto e prazo de resposta escrito.",
    ],
    testeDeFalsificacao:
      "Parar se as unidades preferirem continuar a pagar reparações urgentes, ou se o prazo de resposta contratado exigir uma disponibilidade que o preço não paga.",
    procuraObservavel: true,
  },
  {
    id: "carregamento-eletrico-por-resolver",
    enunciado: "Comprou-se o carro elétrico antes de resolver onde carregá-lo.",
    porqueDoi:
      "A instalação parece um ponto de tomada e é um projeto elétrico: potência contratada, quadro, proteções e, num condomínio, uma deliberação.",
    setor: "tecnico",
    clientes: ["Condomínios", "Frotas pequenas", "Proprietários com garagem"],
    publicos: ["familias", "empresas"],
    baseDeClientes: { tipo: "residentes" },
    mercado: "b2c",
    gatilhos: ["obrigacao-legal", "manutencao"],
    capacidades: ["intervencao-eletrica", "coordenar-fornecedores"],
    capacidadesEssenciais: ["intervencao-eletrica"],
    modelos: ["projeto", "contrato-anual"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: ["urbano", "suburbano"],
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: [],
    regulacoes: ["habilitacao-eletrica", "seguro-responsabilidade"],
    recorrenciaNatural: "pontual",
    sazonalidade: 0,
    riscosProprios: ["regulatorio", "financeiro"],
    comoValidar: [
      "Fechar a parceria com quem certifica antes de vender a primeira instalação.",
      "Fazer três instalações em contextos diferentes e medir o que correu mal em cada.",
      "Vender manutenção só depois de saberes o que avaria.",
    ],
    testeDeFalsificacao:
      "Rejeitar se o ciclo de decisão do condomínio exceder o que a tesouraria aguenta, ou se a manutenção não for contratada por metade dos clientes instalados.",
    procuraObservavel: false,
  },

  // ── DIGITAL ───────────────────────────────────────────────────────
  {
    id: "conhecimento-sem-rotina-de-publicacao",
    enunciado:
      "Profissionais com conhecimento a sério não conseguem manter uma rotina de publicação.",
    porqueDoi:
      "Publicar sem sistema esgota. O que falta não é ideia — é calendário, reaproveitamento e alguém a manter o ritmo.",
    setor: "digital",
    clientes: [
      "Profissionais com público próprio",
      "Pequenas marcas com conhecimento técnico",
    ],
    publicos: ["profissionais", "empresas"],
    baseDeClientes: { tipo: "residentes" },
    mercado: "b2b",
    gatilhos: ["digitalizacao", "crescimento"],
    capacidades: [
      "produzir-conteudo",
      "escrever-para-vender",
      "organizar-processos",
    ],
    capacidadesEssenciais: ["produzir-conteudo", "escrever-para-vender"],
    modelos: ["avenca", "produto-digital"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: TODOS_OS_TERRITORIOS,
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: [],
    regulacoes: [],
    recorrenciaNatural: "recorrente",
    sazonalidade: 0,
    riscosProprios: ["procura", "concorrencia", "dependencia-clientes"],
    comoValidar: [
      "Escolher um nicho onde saibas distinguir uma peça boa de uma peça bonita.",
      "Manter três meses de publicação para UM cliente pago antes de aceitar o segundo.",
      "Medir a lista de contactos que a operação construiu, não o alcance das publicações.",
    ],
    testeDeFalsificacao:
      "Abandonar se, ao fim de três meses, a operação não produzir contactos diretos que o cliente consiga usar — alcance sem lista não é resultado.",
    procuraObservavel: false,
  },
  {
    id: "quem-ensina-sem-produto",
    enunciado:
      "Quem já ensina ao vivo não consegue transformar isso em algo que se venda sem estar presente.",
    porqueDoi:
      "A agenda é o teto do rendimento, e produzir formação a sério exige competências de produção que quem ensina raramente tem.",
    setor: "educacao",
    clientes: ["Formadores", "Profissionais com formação interna já feita"],
    publicos: ["profissionais", "empresas"],
    baseDeClientes: {
      tipo: "nao-contavel",
      porque:
        "Quem já ensina ao vivo raramente está registado como empresa de educação. A divisão 85 contaria escolas e centros de formação, não formadores independentes — que são exatamente estes clientes.",
    },
    mercado: "b2b",
    gatilhos: ["digitalizacao", "crescimento"],
    capacidades: [
      "produzir-conteudo",
      "ensinar-e-treinar",
      "construir-software",
    ],
    capacidadesEssenciais: ["produzir-conteudo", "ensinar-e-treinar"],
    modelos: ["produto-digital", "projeto"],
    naturezas: ["produto", "servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: TODOS_OS_TERRITORIOS,
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: [],
    regulacoes: [],
    recorrenciaNatural: "recorrente",
    sazonalidade: 1,
    riscosProprios: ["procura", "concorrencia"],
    comoValidar: [
      "Vender o programa antes de o produzir, com data marcada e turma mínima.",
      "Produzir só o primeiro módulo e medir quantos chegam ao fim.",
      "Só automatizar depois de a versão ao vivo ter esgotado duas vezes.",
    ],
    testeDeFalsificacao:
      "Parar se a pré-venda não atingir a turma mínima, ou se menos de metade dos inscritos chegar ao fim do primeiro módulo.",
    procuraObservavel: false,
  },

  // ── LOGÍSTICA ─────────────────────────────────────────────────────
  {
    id: "entregas-locais-b2b-sem-solucao",
    enunciado:
      "Negócios locais precisam de entregar no mesmo dia e as transportadoras não servem esse volume.",
    porqueDoi:
      "Um lote pequeno e urgente entre duas ruas não cabe no modelo de ninguém — e o cliente do cliente é quem espera.",
    setor: "logistica",
    clientes: [
      "Lojas com clientes empresariais",
      "Oficinas à espera de peças",
      "Laboratórios e clínicas",
    ],
    publicos: ["empresas"],
    baseDeClientes: { tipo: "empresas", cae: ["47", "56"] },
    mercado: "b2b",
    gatilhos: ["escassez-de-tempo", "crescimento"],
    capacidades: ["rota-recolha-entrega", "transporte-carga"],
    capacidadesEssenciais: ["rota-recolha-entrega", "transporte-carga"],
    modelos: ["avenca", "lote-recorrente", "contrato-anual"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: ["urbano", "suburbano"],
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: ["sme-new-companies", "tender-small-employers"],
    regulacoes: ["transporte-mercadorias", "seguro-responsabilidade"],
    recorrenciaNatural: "recorrente",
    sazonalidade: 1,
    riscosProprios: ["operacional", "dependencia-clientes", "concorrencia"],
    comoValidar: [
      "Escolher um corredor entre duas zonas e contar quantos pedidos existem por dia.",
      "Fazer uma semana de rota real, sem cobrar, e registar tempos e falhas.",
      "Vender uma avença a dois clientes do mesmo corredor antes de comprar seja o que for.",
    ],
    testeDeFalsificacao:
      "Parar se a rota não juntar clientes suficientes no mesmo corredor para cobrir combustível, tempo e desgaste do veículo.",
    procuraObservavel: true,
  },
  {
    id: "mudancas-pequenas-mal-servidas",
    enunciado:
      "Mudanças pequenas ficam entre a carrinha alugada e a empresa de mudanças cara demais.",
    porqueDoi:
      "Quem muda de casa uma vez na vida não tem como avaliar quem contrata, e a alternativa é pedir favores a amigos com carrinha.",
    setor: "logistica",
    clientes: [
      "Quem muda de casa ou de escritório pequeno",
      "Estudantes e arrendatários",
    ],
    publicos: ["familias"],
    baseDeClientes: { tipo: "residentes" },
    mercado: "b2c",
    gatilhos: ["evento-de-vida"],
    capacidades: ["transporte-carga", "operar-no-local"],
    capacidadesEssenciais: ["transporte-carga"],
    modelos: ["projeto", "venda-direta"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: ["urbano", "suburbano"],
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: ["home-transactions"],
    regulacoes: ["transporte-mercadorias", "seguro-responsabilidade"],
    recorrenciaNatural: "pontual",
    sazonalidade: 2,
    riscosProprios: ["sazonalidade", "volatilidade", "operacional"],
    comoValidar: [
      "Fazer cinco mudanças a preço de custo e cronometrar tudo, incluindo escadas.",
      "Fixar preço por tipo de casa em vez de por hora.",
      "Medir quantos pedidos chegam por semana antes de contar com isto como receita.",
    ],
    testeDeFalsificacao:
      "Rejeitar se o preço que o mercado aceita não cobrir combustível, seguro, desgaste e as horas reais com escadas incluídas.",
    procuraObservavel: true,
  },

  // ── ALIMENTAR E CAMPO ─────────────────────────────────────────────
  {
    id: "prateleira-local-sem-produto-com-origem",
    enunciado:
      "Mercearias e cafés querem produto com origem e não conseguem comprá-lo em pequena quantidade.",
    porqueDoi:
      "Produzir é a parte que se domina. O que trava é o licenciamento, a rotulagem e o escoamento — e é aí que a maioria pára.",
    setor: "alimentar",
    clientes: [
      "Mercearias de bairro",
      "Cafés e restaurantes pequenos",
      "Mercados locais",
    ],
    publicos: ["empresas"],
    baseDeClientes: { tipo: "empresas", cae: ["47", "56"] },
    mercado: "b2b",
    gatilhos: ["crescimento", "turismo"],
    capacidades: [
      "produzir-alimentos",
      "vender-para-empresas",
      "rota-recolha-entrega",
    ],
    capacidadesEssenciais: ["produzir-alimentos"],
    modelos: ["producao-propria", "lote-recorrente"],
    naturezas: ["producao"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: TODOS_OS_TERRITORIOS,
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: [],
    regulacoes: ["haccp", "rotulagem", "seguro-responsabilidade"],
    recorrenciaNatural: "recorrente",
    sazonalidade: 1,
    riscosProprios: ["regulatorio", "financeiro", "operacional"],
    comoValidar: [
      "Fechar dois pontos de escoamento por escrito antes de licenciar o que quer que seja.",
      "Produzir em cozinha licenciada alugada até o volume justificar a própria.",
      "Calcular o preço com a perda real de produção, não com a receita ideal.",
    ],
    testeDeFalsificacao:
      "Não avançar se os dois pontos de escoamento não confirmarem quantidade e preço por escrito — uma prateleira prometida em conversa não paga uma cozinha.",
    procuraObservavel: false,
  },
  {
    id: "terreno-por-manter",
    enunciado:
      "Há terreno a precisar de manutenção e quem o tem já não vive perto.",
    porqueDoi:
      "Limpeza obrigatória, água, cercas e acessos não esperam por quem só lá vai no verão — e a coima chega na mesma.",
    setor: "campo",
    clientes: [
      "Proprietários ausentes",
      "Herdeiros com terreno",
      "Câmaras com faixas de gestão",
    ],
    publicos: ["familias", "setor-publico"],
    baseDeClientes: { tipo: "residentes" },
    mercado: "b2c",
    gatilhos: ["obrigacao-legal", "manutencao", "envelhecimento"],
    // `tratar-espacos-verdes` entra aqui porque é literalmente isto: o
    // terreno por manter é o trabalho de quem trata de espaços verdes.
    // Antes só lá chegava quem declarasse agricultura — e a agricultura
    // era, medida, a única competência necessária que não gerava
    // hipótese nenhuma sozinha.
    capacidades: [
      "trabalhar-terreno",
      "transporte-carga",
      "tratar-espacos-verdes",
    ],
    // Manter jardins É a resposta a este problema, tanto como trabalhar
    // o terreno — e as essenciais são um OU. Sem estar aqui, quem
    // declarasse só jardinagem não chegava a este problema de todo.
    capacidadesEssenciais: ["trabalhar-terreno", "tratar-espacos-verdes"],
    modelos: ["contrato-anual", "projeto", "avenca"],
    naturezas: ["servico"],
    regioes: ["alentejo", "centro", "norte", "algarve"],
    territoriosIntensos: ["suburbano", "rural"],
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: ["home-ageing-index"],
    regulacoes: ["seguro-responsabilidade", "acidentes-trabalho"],
    recorrenciaNatural: "contratos",
    sazonalidade: 3,
    riscosProprios: ["sazonalidade", "operacional"],
    comoValidar: [
      "Escolher uma freguesia e contar quantas parcelas estão visivelmente por limpar.",
      "Propor contrato anual a dez proprietários ausentes, não trabalho avulso.",
      "Medir o tempo real por hectare antes de dar preço a alguém.",
    ],
    testeDeFalsificacao:
      "Parar se os proprietários só contratarem quando recebem aviso da câmara — a procura passa a ser um pico anual, e um pico não sustenta um negócio.",
    procuraObservavel: false,
  },

  // ── TRÊS PROBLEMAS PARA AS CAPACIDADES QUE NÃO TINHAM ONDE ENTRAR ───
  //  As outras três capacidades novas encaixaram em problemas que já
  //  existiam. Estas não: não havia no grafo nada que descrevesse quem
  //  precisa delas. Escrever o problema é o trabalho — a capacidade sem
  //  problema não é alcançável, e o grafo recusa-a no build.
  {
    id: "imagem-sem-saida-de-casa",
    enunciado:
      "Quem já não sai de casa com facilidade deixa de tratar do cabelo e das unhas.",
    porqueDoi:
      "Não é vaidade: é a última rotina que dá a alguém a sensação de continuar a ser quem era. As famílias sabem-no e não têm a quem pedir — os salões não se deslocam e as poucas pessoas que o fazem trabalham de boca em boca.",
    setor: "pessoas",
    clientes: [
      "Pessoas com mobilidade reduzida",
      "Famílias de quem vive só",
      "Lares e residências pequenas",
    ],
    baseDeClientes: { tipo: "residentes" },
    publicos: ["idosos", "familias"],
    mercado: "b2c",
    gatilhos: ["envelhecimento", "escassez-de-tempo"],
    capacidades: [
      "cuidar-da-imagem",
      "acompanhar-pessoas",
      "rota-recolha-entrega",
    ],
    capacidadesEssenciais: ["cuidar-da-imagem"],
    modelos: ["hora", "avenca"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: TODOS_OS_TERRITORIOS,
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    // O índice de envelhecimento mede quem tem o problema, não o
    // problema. É contexto forte e não é medição — daí
    // `procuraObservavel: false` logo abaixo, e o motor não pontua
    // procura a partir disto.
    sinais: ["senior-ageing-index"],
    regulacoes: ["seguro-responsabilidade"],
    recorrenciaNatural: "recorrente",
    sazonalidade: 0,
    riscosProprios: ["dependencia-clientes"],
    comoValidar: [
      "Falar com dez famílias que já pagam ajuda ao domicílio e perguntar quem trata do cabelo hoje.",
      "Propor uma volta fixa de um dia por semana e ver quantas marcações se repetem ao segundo mês.",
      "Perguntar a três lares pequenos quanto pagam hoje a quem lá vai, e com que frequência.",
    ],
    testeDeFalsificacao:
      "Rejeitar se as famílias já resolverem isto dentro de casa sem custo, ou se o preço que aceitam pagar não cobrir a deslocação entre duas casas na mesma manhã.",
    procuraObservavel: false,
  },
  {
    id: "corpo-parado-sem-acompanhamento",
    enunciado:
      "Adultos que passaram anos parados não começam a mexer-se sozinhos, e o ginásio não os retém.",
    porqueDoi:
      "Quem chega sem hábito desiste nas primeiras semanas, e volta a pagar mensalidade no ano seguinte para desistir outra vez. O que falta não é equipamento: é alguém que ajuste a carga a um corpo que dói.",
    setor: "pessoas",
    clientes: [
      "Adultos sedentários",
      "Pessoas em recuperação de lesão orientada por médico",
      "Grupos pequenos de vizinhos",
    ],
    baseDeClientes: { tipo: "residentes" },
    publicos: ["familias", "idosos"],
    mercado: "b2c",
    gatilhos: ["envelhecimento", "escassez-de-tempo"],
    capacidades: ["orientar-treino", "acompanhar-pessoas", "ensinar-e-treinar"],
    capacidadesEssenciais: ["orientar-treino"],
    modelos: ["hora", "avenca", "contrato-anual"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: TODOS_OS_TERRITORIOS,
    ocorrenciasForaDeHoras: true,
    procuraFimDeSemana: true,
    sinais: [],
    // A barreira que decide se isto é um negócio de semanas ou de meses.
    regulacoes: ["titulo-exercicio-fisico", "seguro-responsabilidade"],
    recorrenciaNatural: "recorrente",
    sazonalidade: 1,
    riscosProprios: ["dependencia-clientes", "volatilidade"],
    comoValidar: [
      "Encontrar dez pessoas que se inscreveram num ginásio no último ano e já não vão, e perguntar em que semana pararam.",
      "Correr quatro sessões pagas com três pessoas e medir quantas aparecem à quinta.",
      "Confirmar no IPDJ se o formato que queres vender exige título profissional antes de aceitares o primeiro cliente.",
    ],
    testeDeFalsificacao:
      "Rejeitar se as pessoas que pararam disserem que o problema era o preço e não o acompanhamento, ou se menos de metade voltar à quinta sessão.",
    procuraObservavel: false,
  },
  {
    id: "roupa-que-se-deita-fora",
    enunciado:
      "Roupa boa é deitada fora por causa de um fecho, uma bainha ou dois centímetros a mais.",
    porqueDoi:
      "A peça custou dinheiro e continua boa; o arranjo custaria uma fração e não há onde o fazer sem atravessar a cidade. As costureiras de bairro fecharam e as marcas só arranjam o que venderam.",
    setor: "casa",
    clientes: [
      "Famílias",
      "Pessoas que compram em segunda mão",
      "Lojas de roupa sem serviço de arranjos",
    ],
    baseDeClientes: { tipo: "residentes" },
    publicos: ["familias", "idosos"],
    mercado: "b2c",
    gatilhos: ["escassez-de-tempo"],
    capacidades: ["arranjar-texteis", "rota-recolha-entrega"],
    capacidadesEssenciais: ["arranjar-texteis"],
    modelos: ["hora", "loja-online"],
    naturezas: ["servico"],
    regioes: TODO_O_PAIS,
    territoriosIntensos: TODOS_OS_TERRITORIOS,
    ocorrenciasForaDeHoras: false,
    procuraFimDeSemana: false,
    sinais: [],
    regulacoes: ["seguro-responsabilidade"],
    recorrenciaNatural: "pontual",
    sazonalidade: 1,
    riscosProprios: ["volatilidade"],
    comoValidar: [
      "Perguntar a vinte pessoas quantas peças têm em casa à espera de arranjo, e há quanto tempo.",
      "Recolher e devolver dez peças reais numa semana, cobrando, e medir o tempo por peça.",
      "Falar com três lojas de roupa do concelho sobre encaminharem arranjos, e a que preço.",
    ],
    testeDeFalsificacao:
      "Rejeitar se o tempo médio por peça não deixar margem ao preço que as pessoas aceitam, ou se a maioria disser que prefere comprar nova a arranjar.",
    procuraObservavel: false,
  },
] as const);

export const PROBLEMA_POR_ID = new Map(
  PROBLEMAS.map((item) => [item.id, item]),
);

/**
 * As divisões da CAE que a base de clientes dos problemas usa.
 *
 * Existe pela mesma razão que `DIVISOES_USADAS` na ontologia: é o que a
 * ingestão tem de ir buscar. Derivada, nunca escrita — uma lista
 * duplicada diverge no dia em que alguém acrescenta um problema, e o
 * sintoma seria uma hipótese sem denominador.
 */
export const DIVISOES_DE_CLIENTES: readonly string[] = Object.freeze(
  [
    ...new Set(
      PROBLEMAS.flatMap((problema) =>
        problema.baseDeClientes.tipo === "empresas"
          ? problema.baseDeClientes.cae
          : [],
      ),
    ),
  ].sort(),
);
