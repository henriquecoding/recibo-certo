// ═══════════════════════════════════════════════════════════════════════
//  REGULAÇÃO — o que se sabe, e o que não se afirma
//  ---------------------------------------------------------------------
//  `obrigatorio: null` é a resposta mais frequente e a mais honesta:
//  depende da forma concreta da atividade, e o motor não é advogado. O
//  que ele pode fazer — e faz — é NOMEAR o requisito e apontar a entidade
//  que decide, para a pessoa ir confirmar antes de investir.
//
//  Afirmar «precisas de licença X» sem fonte seria inventar legislação, o
//  que a regra anti-alucinação proíbe explicitamente.
// ═══════════════════════════════════════════════════════════════════════
import type { Regulacao } from "../tipos";

const ePortugal = (caminho: string) => `https://eportugal.gov.pt/${caminho}`;

export const REGULACOES: readonly Regulacao[] = Object.freeze([
  {
    id: "rnaat",
    rotulo: "Registo de Agente de Animação Turística",
    exigencia:
      "Organizar atividades turísticas para terceiros exige registo no RNAAT junto do Turismo de Portugal, com seguro próprio.",
    obrigatorio: null,
    severidade: 2,
    proveniencia: { origem: "observado", fonte: "Turismo de Portugal — Registo Nacional de Turismo", url: "https://rnt.turismodeportugal.pt/", limitacao: "A obrigatoriedade depende do formato concreto da atividade. Confirmar antes de vender." },
  },
  {
    id: "haccp",
    rotulo: "Segurança alimentar e HACCP",
    exigencia:
      "Produzir, transformar ou servir alimentos exige espaço licenciado e sistema de autocontrolo HACCP implementado.",
    obrigatorio: true,
    severidade: 3,
    proveniencia: { origem: "observado", fonte: "ASAE — segurança alimentar", url: "https://www.asae.gov.pt/", limitacao: "As exigências concretas variam com o tipo de operação e o município." },
  },
  {
    id: "rotulagem",
    rotulo: "Rotulagem de géneros alimentícios",
    exigencia:
      "O rótulo tem de identificar ingredientes, alergénios, lote e durabilidade mínima.",
    obrigatorio: true,
    severidade: 2,
    proveniencia: { origem: "observado", fonte: "ASAE — rotulagem", url: "https://www.asae.gov.pt/", limitacao: "Regras específicas por categoria de produto." },
  },
  {
    id: "registo-criminal-menores",
    rotulo: "Registo criminal para trabalho com menores",
    exigencia:
      "Quem trabalha com crianças tem de apresentar registo criminal para esse fim, e a entidade tem de o exigir a toda a equipa.",
    obrigatorio: true,
    severidade: 3,
    proveniencia: { origem: "observado", fonte: "Lei n.º 113/2009 — proteção de menores", url: ePortugal("cidadaos"), limitacao: "Consultar o regime aplicável ao tipo de atividade concreto." },
  },
  {
    id: "licenca-espaco-menores",
    rotulo: "Licenciamento de espaço para atividades com crianças",
    exigencia:
      "Espaços que recebem crianças fora do horário escolar têm regras próprias de licenciamento, rácios e segurança.",
    obrigatorio: null,
    severidade: 3,
    proveniencia: { origem: "observado", fonte: "Segurança Social — respostas sociais", url: "https://www.seg-social.pt/", limitacao: "O regime depende da natureza da resposta e do município." },
  },
  {
    id: "alvara-construcao",
    rotulo: "Alvará ou título de construção",
    exigencia:
      "Executar obra para terceiros exige habilitação do IMPIC compatível com a categoria e o valor do trabalho.",
    obrigatorio: null,
    severidade: 3,
    proveniencia: { origem: "observado", fonte: "IMPIC — alvarás de construção", url: "https://www.impic.pt/", limitacao: "Coordenar não é executar; a fronteira decide se é exigível." },
  },
  {
    id: "habilitacao-eletrica",
    rotulo: "Habilitação para instalações elétricas",
    exigencia:
      "Intervenções em instalações elétricas exigem técnico habilitado e responsabilidade técnica declarada.",
    obrigatorio: true,
    severidade: 3,
    proveniencia: { origem: "observado", fonte: "DGEG — instalações elétricas", url: "https://www.dgeg.gov.pt/", limitacao: "O tipo de habilitação varia com a potência e o tipo de instalação." },
  },
  {
    id: "certificacao-energetica",
    rotulo: "Perito qualificado para certificação energética",
    exigencia:
      "Emitir certificados energéticos exige perito qualificado reconhecido pela ADENE. Um diagnóstico não certificado não é um certificado.",
    obrigatorio: true,
    severidade: 2,
    proveniencia: { origem: "observado", fonte: "ADENE — Sistema de Certificação Energética", url: "https://www.adene.pt/", limitacao: "Diagnóstico e certificação são serviços distintos." },
  },
  {
    id: "transporte-mercadorias",
    rotulo: "Acesso à atividade de transporte de mercadorias",
    exigencia:
      "Transportar mercadorias por conta de outrem acima de certos limites de peso exige licença comunitária e capacidade profissional.",
    obrigatorio: null,
    severidade: 2,
    proveniencia: { origem: "observado", fonte: "IMT — transporte rodoviário de mercadorias", url: "https://www.imt-ip.pt/", limitacao: "Abaixo do limiar de peso o regime é diferente. Confirmar o veículo concreto." },
  },
  {
    id: "transporte-passageiros",
    rotulo: "Transporte de passageiros",
    exigencia:
      "Transportar pessoas mediante remuneração é atividade licenciada e não se resolve com um seguro alargado.",
    obrigatorio: true,
    severidade: 3,
    proveniencia: { origem: "observado", fonte: "IMT — transporte de passageiros", url: "https://www.imt-ip.pt/", limitacao: "Existem regimes distintos por tipo de serviço." },
  },
  {
    id: "rgpd-subcontratante",
    rotulo: "Contrato de subcontratante RGPD",
    exigencia:
      "Tratar dados pessoais de clientes de outra empresa exige contrato de subcontratação e regras de acesso escritas.",
    obrigatorio: true,
    severidade: 1,
    proveniencia: { origem: "observado", fonte: "CNPD — Regulamento Geral de Proteção de Dados", url: "https://www.cnpd.pt/", limitacao: "O conteúdo mínimo do contrato depende do tratamento." },
  },
  {
    id: "seguro-responsabilidade",
    rotulo: "Seguro de responsabilidade civil",
    exigencia:
      "Trabalhar em casa ou instalações de terceiros sem cobertura de danos é assumir o risco com o património pessoal.",
    obrigatorio: null,
    severidade: 1,
    proveniencia: { origem: "estimativa", fonte: "Prática corrente do setor segurador", limitacao: "Obrigatório em algumas atividades reguladas; prudente em quase todas." },
  },
  {
    id: "acidentes-trabalho",
    rotulo: "Seguro de acidentes de trabalho",
    exigencia:
      "Com pessoal ao serviço, o seguro de acidentes de trabalho é obrigatório — e a atividade independente tem regime próprio.",
    obrigatorio: true,
    severidade: 2,
    proveniencia: { origem: "observado", fonte: "ASF — Autoridade de Supervisão de Seguros e Fundos de Pensões", url: "https://www.asf.com.pt/", limitacao: "O regime difere entre trabalhador independente e entidade empregadora." },
  },
  {
    id: "cedencia-trabalhadores",
    rotulo: "Cedência de trabalhadores e trabalho temporário",
    exigencia:
      "Ceder pessoal a outra empresa tem regras próprias e, no caso do trabalho temporário, licenciamento.",
    obrigatorio: true,
    severidade: 3,
    proveniencia: { origem: "observado", fonte: "ACT — Autoridade para as Condições do Trabalho", url: "https://www.act.gov.pt/", limitacao: "Prestação de serviços e cedência são figuras distintas; a fronteira é fiscalizada." },
  },
  {
    id: "siac",
    rotulo: "Identificação e registo de animais de companhia",
    exigencia:
      "Animais de companhia têm registo obrigatório no SIAC, e quem os acompanha tem de o verificar.",
    obrigatorio: true,
    severidade: 1,
    proveniencia: { origem: "observado", fonte: "SIAC — Sistema de Informação de Animais de Companhia", url: "https://siac.vet/", limitacao: "A responsabilidade do registo é do detentor." },
  },
  {
    id: "comercio-eletronico",
    rotulo: "Informação pré-contratual e direito de livre resolução",
    exigencia:
      "A venda à distância exige informação pré-contratual completa e prazo de livre resolução para o consumidor.",
    obrigatorio: true,
    severidade: 1,
    proveniencia: { origem: "observado", fonte: "DGC — Direção-Geral do Consumidor", url: "https://www.consumidor.gov.pt/", limitacao: "O prazo e as exceções dependem do tipo de bem ou serviço." },
  },
  {
    id: "titulo-exercicio-fisico",
    rotulo: "Título Profissional de Técnico de Exercício Físico",
    exigencia:
      "Orientar exercício físico em instalações de fitness exige título profissional válido, emitido pelo IPDJ. A lei declara nulo o contrato celebrado sem ele, e o título caduca ao fim de cinco anos.",
    // `null` e não `true`: a Lei n.º 39/2012 tem por âmbito as instalações
    // desportivas que prestam serviços de manutenção da condição física.
    // Treinar alguém ao ar livre ou em casa cai numa zona que depende do
    // formato concreto — e afirmar «obrigatório sempre» seria tão errado
    // como omitir a exigência.
    obrigatorio: null,
    severidade: 3,
    proveniencia: {
      origem: "observado",
      fonte: "IPDJ — Título Profissional de Técnico de Exercício Físico (Lei n.º 39/2012, de 28 de agosto)",
      url: "https://ipdj.gov.pt/tecnico-de-exercicio-fisico",
      limitacao:
        "O âmbito da lei são as instalações desportivas de fitness. Para treino fora delas, confirmar a aplicabilidade antes de vender.",
    },
  },
] as const);

export const REGULACAO_POR_ID = new Map(REGULACOES.map((item) => [item.id, item]));
